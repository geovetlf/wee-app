/**
 * M-01 · REPRODUCCIÓN — un fallo de la CONTABILIDAD (Firestore) después de un resultado ya pagado
 * se trata como un fallo del PROVEEDOR.
 *
 * NO está en la cadena de `npm test` a propósito (por eso es `*.repro.mjs` y no `*.test.mjs`): sobre el Router actual
 * (el de `d867774`) está en ROJO, y es lo que demuestra el defecto. Con el parche propuesto en docs/ROUTER-CONTABILIDAD.md
 * (`engine/router.ts` +31 −4, aún sin autorizar porque mueve dos cercas de integridad) sale en VERDE. Cuando el arreglo
 * entre, este archivo pasa a `router-contabilidad.test.mjs` y se añade a `scripts.test` de functions/package.json.
 * Se ejecuta suelto (ligero):
 *
 *     node functions/test/router-contabilidad.repro.mjs
 *
 * Usa el compilado (`functions/lib`), como el resto. Sale con 1 si algo no se cumple.
 *
 * ── El defecto, medido sobre el código ─────────────────────────────────────────────────────────────────────────
 * En `engine/router.ts`, `execute()` mete la llamada al proveedor Y lo que viene después —`ledger.close(COMPLETED)`,
 * `health.success` y `request.record`— en el MISMO `try`. Si Firestore falla DESPUÉS de que el proveedor devolvió un
 * resultado (y lo cobró), el `catch` lo trata como un fallo del proveedor:
 *   · descarta el resultado ya pagado,
 *   · reescribe la fila COMPLETED como FAILED con providerCost 0 (el libro pierde el gasto real),
 *   · le suma un fallo al cortacircuitos de un proveedor SANO,
 *   · y pasa al siguiente candidato, que se paga otra vez —o, sin candidatos, lanza el error—.
 *
 * ── Lo que debería pasar (lo que afirma este archivo) ──────────────────────────────────────────────────────────
 *   1. `execute` DEVUELVE el resultado ya pagado.
 *   2. El proveedor se llamó UNA vez, y no se invoca ningún otro candidato (no se paga dos veces).
 *   3. `health` no cuenta un fallo del proveedor (y sí su éxito: el proveedor sí atendió).
 *   4. La fila del libro NO se reescribe como FAILED.
 *   5. El fallo contable queda VISIBLE y REPARABLE: una línea `console.error` con el registro, quién atendió, el coste
 *      y los Credits del paso, saneada con `sanitizeForLog`. Nada de tragarlo en silencio.
 *
 * ── Lo que NO debe cambiar (comprobaciones K, en verde antes y después) ────────────────────────────────────────
 *   El fallo REAL del proveedor sigue cerrando la fila como FAILED, contando contra su salud y probando el siguiente;
 *   `NotConfiguredError` y un `ProviderError` no reintentable no penalizan; con todos fallando se lanza un error
 *   controlado; y un resultado MALFORMADO del adaptador sigue siendo un fallo del proveedor (no se entrega).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/' + p));

const { createRouter, memoryHealth } = lib('router.js');
const { memoryLedger } = lib('ledger.js');
const { DEFAULT_SETTINGS } = lib('registry.js');
const { NotConfiguredError, ProviderError } = lib('http.js');
const { EngineError } = lib('errors.js');

/** Lo que vale el paso en Credits con el coste del doble (1 USD) en modo real: la misma cuenta de router.test.mjs (#2). */
const CREDITS_DEL_PASO = Math.ceil(1 * 100 * 1.3);

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ═══ Los dobles ═════════════════════════════════════════════════════════════════════════════════════════════ */

/** El error que devuelve Firestore, con su código gRPC delante, como llega de verdad. */
const errorDeFirestore = (texto) => Object.assign(new Error(texto), { code: Number(texto.split(' ')[0]) });

/** Un proveedor que atiende `video.generate` y cuesta 1 USD por llamada; cuenta cuántas veces lo llamaron. */
const proveedor = (id, { falla, sinSalida, avisaDeLaTarea } = {}) => ({
  id,
  name: id,
  modalities: ['video'],
  models: [{ id: `${id}-m`, provider: id, capabilities: ['video.generate'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.1 } }],
  isConfigured: () => true,
  supports: (c) => c === 'video.generate',
  calls: 0,
  async run(req) {
    this.calls++;
    if (avisaDeLaTarea) await req.onStatus('PROCESSING', { providerTaskId: `tarea-${id}` });
    if (falla) throw falla();
    if (sinSalida) return { costUSD: 1, latencyMs: 5, model: req.model.id };
    return { output: { kind: 'video', url: `https://${id}.example/${req.model.id}.mp4` }, costUSD: 1, latencyMs: 5, model: req.model.id };
  },
});

/** La salud real, pero apuntando cada `success` y cada `failure`: lo que se cuenta es lo que se afirma. */
const saludEspiada = () => {
  const base = memoryHealth();
  const llamadas = [];
  return {
    ...base,
    llamadas,
    failure: (p, s) => { llamadas.push(['failure', p]); base.failure(p, s); },
    success: (p) => { llamadas.push(['success', p]); base.success(p); },
  };
};

/**
 * El libro real en memoria, con un fallo de Firestore inyectable en `close`. `decidir({ id, patch, vez })` contesta
 *   false   → cierra bien;
 *   'nada'  → lanza SIN escribir nada (el cierre no llegó a Firestore);
 *   'fila'  → escribe la FILA y lanza (el documento caliente aiUsage/{día} no aceptó el incremento): el reparto de
 *             `close` en dos escrituras sueltas (`Promise.all([fila, uso])`) permite este estado a medias.
 * `vez` es la vez número N que se cierra con ESE estado (1 = la primera COMPLETED, 1 = la primera FAILED…).
 */
const libroQueFalla = (decidir, textoDelFallo = '14 UNAVAILABLE: el cierre no llegó a Firestore') => {
  const base = memoryLedger();
  const cierres = [];
  return {
    records: base.records,
    usage: base.usage,
    cierres,
    open: (r) => base.open(r),
    progress: (id, p) => base.progress(id, p),
    settle: (p) => base.settle(p),
    closeAccepted: (p) => base.closeAccepted(p),
    async close(id, patch) {
      cierres.push({ id, status: patch.status });
      const vez = cierres.filter((c) => c.status === patch.status).length;
      const modo = decidir({ id, patch, vez });
      if (modo === 'nada') throw errorDeFirestore(textoDelFallo);
      if (modo === 'fila') {
        base.records[id] = { ...(base.records[id] || {}), ...patch };
        throw errorDeFirestore('10 ABORTED: demasiada contención en aiUsage/2026-10-11');
      }
      return base.close(id, patch);
    },
  };
};

/** Lo que el router escribe por consola mientras `fn` corre, por nivel. Se restaura SIEMPRE. */
const capturar = async (fn) => {
  const originales = { log: console.log, warn: console.warn, error: console.error };
  const lineas = { log: [], warn: [], error: [] };
  for (const nivel of Object.keys(lineas)) {
    console[nivel] = (...a) => { lineas[nivel].push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(' ')); };
  }
  try { return { valor: await fn(), lineas }; } catch (error) { return { error, lineas }; } finally { Object.assign(console, originales); }
};

/**
 * Un `execute` completo con los dobles de arriba. `fallaCierre` y `fallaRegistro` son los inyectores de fallo de
 * contabilidad; sin ellos, es el camino feliz. Siempre `pricingMode: 'real'` y con transacción de Credits, para que el
 * paso valga algo y se parezca a un cobro real.
 */
const correr = async ({ proveedores, fallaCierre = () => false, fallaRegistro = () => false, textoDelFallo, cierreSincrono = false, registroSincrono = false }) => {
  const adapters = Object.fromEntries(proveedores.map((p) => [p.id, p]));
  const libro = libroQueFalla(fallaCierre, textoDelFallo);
  if (cierreSincrono) {
    /* Un libro que lanza SIN devolver una promesa: no debería existir (la interfaz dice Promise), pero no puede descartar el resultado. */
    const cerrar = libro.close;
    libro.close = (id, patch) => { if (patch.status === 'COMPLETED') throw errorDeFirestore('14 UNAVAILABLE: el cierre lanzó sin promesa'); return cerrar(id, patch); };
  }
  const salud = saludEspiada();
  const cfg = {
    providers: Object.fromEntries(proveedores.map((p, i) => [p.id, { enabled: true, priority: i + 1 }])),
    routing: { 'video.generate': { capability: 'video.generate', chain: proveedores.map((p) => ({ provider: p.id })), policy: 'quality-first' } },
    settings: { ...DEFAULT_SETTINGS, pricingMode: 'real' },
    source: 'test',
  };
  const router = createRouter({ adapters, loadConfig: async () => cfg, ledger: libro, health: salud });
  const registros = [];
  const record = registroSincrono
    ? (entry) => { registros.push(entry); throw errorDeFirestore('10 ABORTED: el registro lanzó sin promesa'); }
    : async (entry) => {
      registros.push(entry);
      if (fallaRegistro(registros.length)) throw errorDeFirestore('10 ABORTED: demasiada contención en creatorUsage/2026-10-11');
    };
  const salida = await capturar(() => router.execute({
    capability: 'video.generate', input: { prompt: 'una persona caminando por Lima de noche' }, userId: 'u1', jobId: 'j1', stepId: 's1',
    requestId: 'j1:s1', creditTransactionId: 'usage_j1', record,
  }));
  return { ...salida, libro, salud, proveedores, registros };
};

/* Utilidades de lectura de lo ocurrido. */
const fallosDeSalud = (r) => r.salud.llamadas.filter(([k]) => k === 'failure').map(([, p]) => p);
const exitosDeSalud = (r) => r.salud.llamadas.filter(([k]) => k === 'success').map(([, p]) => p);
const filas = (r) => Object.values(r.libro.records);
const llamadasA = (r) => r.proveedores.map((p) => `${p.id}=${p.calls}`).join(' ');
const gastoUsd = (r) => r.proveedores.reduce((s, p) => s + p.calls * 1, 0);
const avisoDeContabilidad = (r, paso) => r.lineas.error.find((l) => /^WEË AI ENGINE: /.test(l) && /contabilidad SIN CERRAR/.test(l) && l.includes(`(${paso})`));
const resumen = (r) => (r.error ? `LANZÓ ${r.error.code ?? r.error.name}: ${String(r.error.message).slice(0, 70)}` : `devolvió ${r.valor.provider}`);

/** Lo que se afirma de un escenario en el que el resultado YA pagado debe llegar a quien lo pidió. */
const entregaElResultado = (etiqueta, r, { proveedorQueAtiende, llamadasEsperadas }) => {
  check(`${etiqueta} · \`execute\` DEVUELVE el resultado ya pagado`, !r.error && r.valor?.provider === proveedorQueAtiende && /\.mp4$/.test(r.valor?.output?.url ?? ''), resumen(r));
  check(`${etiqueta} · cada proveedor se llamó lo esperado: no se paga dos veces`, llamadasA(r) === llamadasEsperadas, `${llamadasA(r)} (gasto del proveedor: ${gastoUsd(r)} USD)`);
  check(`${etiqueta} · la salud NO cuenta ningún fallo contra el proveedor`, fallosDeSalud(r).length === 0, `fallos: [${fallosDeSalud(r).join(',')}]`);
  check(`${etiqueta} · y sí cuenta su éxito: el proveedor sí atendió`, exitosDeSalud(r).includes(proveedorQueAtiende), `éxitos: [${exitosDeSalud(r).join(',')}]`);
  /* La métrica `wee_ia_generaciones` (ops/observabilidad/alertas.mjs:57) cuenta las líneas con «WEË AI ENGINE: » y « atendió »: una por generación. */
  const comoGeneracion = [...r.lineas.log, ...r.lineas.warn, ...r.lineas.error].filter((l) => l.includes('WEË AI ENGINE: ') && l.includes(' atendió ')).length;
  check(`${etiqueta} · el registro cuenta UNA generación para la métrica wee_ia_generaciones (el aviso contable no lleva « atendió »)`, comoGeneracion === 1, `${comoGeneracion} línea(s)`);
};

/* ═══ E0 · CONTROL: sin fallos contables, todo como siempre ═════════════════════════════════════════════════ */
console.log('── E0 · Control: sin fallo de contabilidad ──');
{
  const r = await correr({ proveedores: [proveedor('alpha'), proveedor('gamma')] });
  entregaElResultado('E0', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1 gamma=0' });
  check('E0 · la fila queda COMPLETED con el coste real, y el uso se apunta una vez', filas(r).length === 1 && filas(r)[0].status === 'COMPLETED' && filas(r)[0].providerCost === 1 && r.libro.usage.calls === 1 && r.libro.usage.failed === 0 && r.libro.usage.usd === 1,
    JSON.stringify({ filas: filas(r).map((f) => [f.provider, f.status, f.providerCost]), usage: r.libro.usage }));
  check('E0 · no hay ningún aviso de contabilidad sin cerrar', !avisoDeContabilidad(r, 'cierre del libro') && !avisoDeContabilidad(r, 'registro de uso'));
  check('E0 · el uso del trabajo se apuntó una vez', r.registros.length === 1);
}

/* ═══ E1 · un único proveedor elegible; el cierre COMPLETED falla una vez ═══════════════════════════════════ */
console.log('\n── E1 · Un único proveedor; `ledger.close(COMPLETED)` falla UNA vez ──');
{
  const r = await correr({ proveedores: [proveedor('alpha')], fallaCierre: ({ patch, vez }) => patch.status === 'COMPLETED' && vez === 1 && 'nada' });
  entregaElResultado('E1', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1' });
  check('E1 · la fila NO se reescribe como FAILED (un fallo del libro no es un fallo del proveedor)', !filas(r).some((f) => f.status === 'FAILED'), JSON.stringify(filas(r).map((f) => [f.provider, f.status, f.providerCost])));
  check('E1 · no se abre ninguna otra fila: un solo intento', filas(r).length === 1, `${filas(r).length} fila(s)`);
  const aviso = avisoDeContabilidad(r, 'cierre del libro');
  check('E1 · el fallo contable queda VISIBLE: línea de error con el paso, el registro y quién atendió', !!aviso && /registro gen-1\b/.test(aviso) && /alpha\/alpha-m/.test(aviso) && /video\.generate/.test(aviso), aviso ?? 'sin línea de error (solo: ' + r.lineas.warn.map((l) => l.slice(0, 90)).join(' | ') + ')');
  check('E1 · y REPARABLE: trae el coste del proveedor, los Credits del paso y dónde reparar', !!aviso && /providerCost USD 1\b/.test(aviso) && aviso.includes(`${CREDITS_DEL_PASO} Credits del paso`) && /aiGenerations\/gen-1/.test(aviso), aviso ?? '');
  check('E1 · la causa va saneada y presente (nada de tragar el error)', !!aviso && /UNAVAILABLE/.test(aviso));
}

/* ═══ E2 · con candidato alternativo, ¿se paga dos veces? ═══════════════════════════════════════════════════ */
console.log('\n── E2 · Con candidato alternativo; `ledger.close(COMPLETED)` falla UNA vez ──');
{
  const r = await correr({ proveedores: [proveedor('alpha'), proveedor('gamma')], fallaCierre: ({ patch, vez }) => patch.status === 'COMPLETED' && vez === 1 && 'nada' });
  entregaElResultado('E2', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1 gamma=0' });
  check('E2 · no se invoca otro candidato: ninguna fila de gamma', !filas(r).some((f) => f.provider === 'gamma'), JSON.stringify(filas(r).map((f) => [f.provider, f.status])));
  check('E2 · el aviso de contabilidad nombra al proveedor que SÍ atendió, no a un respaldo', /alpha\/alpha-m/.test(avisoDeContabilidad(r, 'cierre del libro') ?? ''));
}

/* ═══ E3 · un único proveedor; falla `request.record` (el uso del trabajo) ══════════════════════════════════ */
console.log('\n── E3 · Un único proveedor; `request.record` falla UNA vez (el cierre del libro ya fue bien) ──');
{
  const r = await correr({ proveedores: [proveedor('alpha')], fallaRegistro: (n) => n === 1 });
  entregaElResultado('E3', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1' });
  check('E3 · la fila que ya estaba COMPLETED NO se pisa con FAILED ni pierde su coste', filas(r).length === 1 && filas(r)[0].status === 'COMPLETED' && filas(r)[0].providerCost === 1, JSON.stringify(filas(r).map((f) => [f.provider, f.status, f.providerCost])));
  check('E3 · el uso del día no se apunta dos veces ni cuenta un fallo que no hubo', r.libro.usage.calls === 1 && r.libro.usage.failed === 0 && r.libro.usage.usd === 1, JSON.stringify(r.libro.usage));
  const aviso = avisoDeContabilidad(r, 'registro de uso');
  check('E3 · VISIBLE y REPARABLE: línea de error del paso «registro de uso» con el registro y quién atendió', !!aviso && /registro gen-1\b/.test(aviso) && /alpha\/alpha-m/.test(aviso) && /providerCost USD 1\b/.test(aviso) && /ABORTED/.test(aviso), aviso ?? 'sin línea de error');
}

/* ═══ E4 · con candidato alternativo; falla `request.record` ═════════════════════════════════════════════════ */
console.log('\n── E4 · Con candidato alternativo; `request.record` falla UNA vez ──');
{
  const r = await correr({ proveedores: [proveedor('alpha'), proveedor('gamma')], fallaRegistro: (n) => n === 1 });
  entregaElResultado('E4', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1 gamma=0' });
  check('E4 · el uso del trabajo se intentó apuntar UNA sola vez (no se repite con otro candidato)', r.registros.length === 1, `${r.registros.length} intento(s)`);
}

/* ═══ E5 · la fila se escribe y el uso del día no (aiUsage/{día}, el documento caliente) ════════════════════ */
console.log('\n── E5 · El cierre escribe la FILA y falla el uso del día (aiUsage/{día}, contención) ──');
{
  const r = await correr({ proveedores: [proveedor('alpha')], fallaCierre: ({ patch, vez }) => patch.status === 'COMPLETED' && vez === 1 && 'fila' });
  entregaElResultado('E5', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1' });
  check('E5 · la fila que SÍ se escribió COMPLETED conserva el coste real (no se pisa con FAILED / providerCost 0)', filas(r).length === 1 && filas(r)[0].status === 'COMPLETED' && filas(r)[0].providerCost === 1, JSON.stringify(filas(r).map((f) => [f.provider, f.status, f.providerCost])));
  check('E5 · el uso del día no cuenta un fallo ni se duplica', r.libro.usage.failed === 0 && r.libro.usage.calls === 0, JSON.stringify(r.libro.usage));
  check('E5 · VISIBLE: el aviso dice que el cierre falló (la fila puede estar escrita y el uso del día no)', !!avisoDeContabilidad(r, 'cierre del libro'));
}

/* ═══ E6 · Firestore no deja escribir NADA después de abrir la fila ═════════════════════════════════════════ */
console.log('\n── E6 · Un único proveedor; TODO cierre falla (COMPLETED y FAILED): Firestore caído tras abrir la fila ──');
{
  const r = await correr({ proveedores: [proveedor('alpha')], fallaCierre: () => 'nada' });
  entregaElResultado('E6', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1' });
  check('E6 · el error que sale NO es el de Firestore en crudo (si algo saliera, sería controlado)', !r.error || r.error instanceof EngineError, r.error ? `${r.error.constructor.name}: ${String(r.error.message).slice(0, 60)}` : 'sin error');
  check('E6 · VISIBLE: el aviso de contabilidad sin cerrar está en el registro', !!avisoDeContabilidad(r, 'cierre del libro'));
}

/* ═══ E7 · el fallo es determinista: varios candidatos, todos pagados y ninguno entregado ═══════════════════ */
console.log('\n── E7 · Tres candidatos; `ledger.close(COMPLETED)` falla SIEMPRE (p. ej. un providerMeta que Firestore no admite) ──');
{
  const r = await correr({ proveedores: [proveedor('alpha'), proveedor('beta'), proveedor('gamma')], fallaCierre: ({ patch }) => patch.status === 'COMPLETED' && 'nada' });
  entregaElResultado('E7', r, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1 beta=0 gamma=0' });
  check('E7 · el gasto del proveedor es UNA generación, no una por candidato', gastoUsd(r) === 1, `${gastoUsd(r)} USD gastados`);
}

/* ═══ E8 · el aviso no filtra credenciales: la causa pasa por `sanitizeForLog` ═══════════════════════════════ */
console.log('\n── E8 · La causa del aviso va saneada (un error de Firestore puede traer una cabecera) ──');
{
  /* Clave FALSA con la forma de una real, construida aquí para que el escáner de secretos no vea una en el texto del archivo. */
  const CLAVE_FALSA = ['sk', 'f'.repeat(24)].join('-');
  const r = await correr({
    proveedores: [proveedor('alpha')],
    fallaCierre: ({ patch, vez }) => patch.status === 'COMPLETED' && vez === 1 && 'nada',
    textoDelFallo: `14 UNAVAILABLE: fallo con Authorization: Bearer abcdef0123456789abcdef y la clave ${CLAVE_FALSA} en la cabecera`,
  });
  const aviso = avisoDeContabilidad(r, 'cierre del libro');
  check('E8 · el aviso existe y NO lleva ni el Bearer ni la clave sk- (se omiten como en el resto de registros)', !!aviso && !/abcdef0123456789abcdef/.test(aviso) && !aviso.includes(CLAVE_FALSA) && /credencial omitida/.test(aviso), aviso ?? 'sin aviso');
  check('E8 · y el resultado se entrega', !r.error && r.valor?.provider === 'alpha', resumen(r));
}

/* ═══ E9 · un libro o un registro que lanzan SIN promesa tampoco descartan el resultado ══════════════════════ */
console.log('\n── E9 · `close` y `record` que lanzan de forma SÍNCRONA (sin devolver una promesa) ──');
{
  const a = await correr({ proveedores: [proveedor('alpha'), proveedor('gamma')], cierreSincrono: true });
  entregaElResultado('E9a (close síncrono)', a, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1 gamma=0' });
  check('E9a · y queda avisado', !!avisoDeContabilidad(a, 'cierre del libro'));
  const b = await correr({ proveedores: [proveedor('alpha'), proveedor('gamma')], registroSincrono: true });
  entregaElResultado('E9b (record síncrono)', b, { proveedorQueAtiende: 'alpha', llamadasEsperadas: 'alpha=1 gamma=0' });
  check('E9b · y queda avisado', !!avisoDeContabilidad(b, 'registro de uso'));
}

/* ═══ K · LO QUE NO DEBE CAMBIAR (verde antes y después) ════════════════════════════════════════════════════ */
console.log('\n── K · Conservado: el fallo REAL del proveedor se comporta como siempre ──');
{
  /* K1 · un ProviderError reintentable: fila FAILED sin coste, un fallo en la salud, y el siguiente candidato atiende. */
  const falla = () => new ProviderError('alpha: 503', 'alpha', 503, true);
  const r = await correr({ proveedores: [proveedor('alpha', { falla }), proveedor('gamma')] });
  const alpha = filas(r).find((f) => f.provider === 'alpha');
  check('K1 · alpha falla → gamma atiende en el 2.º intento', !r.error && r.valor.provider === 'gamma' && r.valor.attempts === 2, resumen(r));
  check('K1 · la fila de alpha queda FAILED, sin coste medido, con el error saneado', alpha?.status === 'FAILED' && alpha.providerCost === 0 && typeof alpha.error === 'string', JSON.stringify(alpha && [alpha.status, alpha.providerCost, alpha.error]));
  check('K1 · la salud cuenta UN fallo de alpha y el éxito de gamma', fallosDeSalud(r).join() === 'alpha' && exitosDeSalud(r).join() === 'gamma', JSON.stringify(r.salud.llamadas));
  check('K1 · la fila de gamma queda COMPLETED con su coste y el uso suma 2 llamadas y 1 fallo', filas(r).find((f) => f.provider === 'gamma')?.status === 'COMPLETED' && r.libro.usage.calls === 2 && r.libro.usage.failed === 1, JSON.stringify(r.libro.usage));
  check('K1 · en este camino NO hay ningún aviso de contabilidad sin cerrar', !avisoDeContabilidad(r, 'cierre del libro') && !avisoDeContabilidad(r, 'registro de uso'));
}
{
  /* K2 · NotConfiguredError: no penaliza al proveedor (no es un fallo suyo), y se prueba el siguiente. */
  const r = await correr({ proveedores: [proveedor('alpha', { falla: () => new NotConfiguredError('alpha', 'ALPHA_API_KEY') }), proveedor('gamma')] });
  check('K2 · NotConfiguredError: gamma atiende y la salud de alpha NO cuenta un fallo', !r.error && r.valor.provider === 'gamma' && fallosDeSalud(r).length === 0, `${resumen(r)} · fallos [${fallosDeSalud(r).join(',')}]`);
}
{
  /* K3 · un ProviderError NO reintentable (p. ej. un 400): tampoco penaliza. */
  const r = await correr({ proveedores: [proveedor('alpha', { falla: () => new ProviderError('alpha: 400', 'alpha', 400, false) }), proveedor('gamma')] });
  check('K3 · ProviderError no reintentable: gamma atiende y la salud de alpha NO cuenta un fallo', !r.error && r.valor.provider === 'gamma' && fallosDeSalud(r).length === 0, `${resumen(r)} · fallos [${fallosDeSalud(r).join(',')}]`);
}
{
  /* K4 · todos fallan: error CONTROLADO de motor, una fila FAILED por intento y un fallo de salud por proveedor. */
  const falla = (id) => () => new ProviderError(`${id}: 503`, id, 503, true);
  const r = await correr({ proveedores: [proveedor('alpha', { falla: falla('alpha') }), proveedor('gamma', { falla: falla('gamma') })] });
  check('K4 · con todos fallando se lanza un EngineError controlado', r.error instanceof EngineError && r.error.code === 'PROVIDER_ERROR', resumen(r));
  check('K4 · dos filas FAILED y un fallo de salud por proveedor', filas(r).length === 2 && filas(r).every((f) => f.status === 'FAILED') && fallosDeSalud(r).join() === 'alpha,gamma', JSON.stringify(filas(r).map((f) => [f.provider, f.status])));
}
{
  /*
   * K5 · un resultado MALFORMADO del adaptador (sin `output`) sigue siendo un fallo del PROVEEDOR: no se entrega, la
   * fila se cierra FAILED, la salud lo cuenta y se prueba el siguiente. Es la comprobación que impide «arreglar» el
   * defecto sacando TODO lo posterior fuera del `try` (o envolviéndolo en un tragaerrores): eso entregaría un resultado
   * roto en vez de caer al siguiente candidato.
   */
  const r = await correr({ proveedores: [proveedor('alpha', { sinSalida: true }), proveedor('gamma')] });
  check('K5 · un resultado sin `output` NO se entrega: gamma atiende', !r.error && r.valor.provider === 'gamma', resumen(r));
  check('K5 · alpha cuenta como fallo del proveedor y su fila queda FAILED', fallosDeSalud(r).join() === 'alpha' && filas(r).find((f) => f.provider === 'alpha')?.status === 'FAILED', JSON.stringify(r.salud.llamadas));
}
{
  /*
   * K6 · si el proveedor falla Y el cierre FAILED también falla, el error sale del bucle como hasta ahora: es el camino
   * del fallo REAL del proveedor, que M-01 no toca (no hay resultado pagado que salvar). Se deja dicho aquí para que un
   * arreglo no lo cambie sin querer; si el dueño quiere endurecerlo, es otra decisión.
   */
  const r = await correr({ proveedores: [proveedor('alpha', { falla: () => new ProviderError('alpha: 503', 'alpha', 503, true) }), proveedor('gamma')], fallaCierre: ({ patch }) => patch.status === 'FAILED' && 'nada' });
  check('K6 · fallo del proveedor + cierre FAILED caído: el bucle se corta con el error de Firestore (conservado, fuera de M-01)', !!r.error && !(r.error instanceof EngineError) && /UNAVAILABLE/.test(r.error.message) && r.proveedores.map((p) => p.calls).join() === '1,0', resumen(r));
}

/* ═══ Adyacente (informativo, NO afecta al resultado): la escritura de progreso dentro del adaptador ═════════ */
console.log('\n── Observación adyacente (fuera de M-01; solo informa, no cuenta como fallo) ──');
{
  /* `ledger.progress` lo llama `onStatus` DENTRO de `adapter.run`; aquí lo hacemos fallar con su propio libro. */
  const base = memoryLedger();
  const libro = { ...base, records: base.records, usage: base.usage, progress: async () => { throw errorDeFirestore('14 UNAVAILABLE: el progreso no llegó a Firestore'); } };
  const salud = saludEspiada();
  const proveedores = [proveedor('alpha', { avisaDeLaTarea: true }), proveedor('gamma', { avisaDeLaTarea: true })];
  const cfg = {
    providers: { alpha: { enabled: true, priority: 1 }, gamma: { enabled: true, priority: 2 } },
    routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }, { provider: 'gamma' }], policy: 'quality-first' } },
    settings: { ...DEFAULT_SETTINGS, pricingMode: 'real' }, source: 'test',
  };
  const router = createRouter({ adapters: { alpha: proveedores[0], gamma: proveedores[1] }, loadConfig: async () => cfg, ledger: libro, health: salud });
  const s = await capturar(() => router.execute({ capability: 'video.generate', input: { prompt: 'x' }, userId: 'u1', jobId: 'j1', stepId: 's1' }));
  console.log(`ℹ \`ledger.progress\` caído DENTRO de adapter.run (la tarea ya está en el proveedor): ${s.error ? 'LANZÓ ' + (s.error.code ?? s.error.message) : 'devolvió ' + s.valor.provider}; ` +
    `llamadas ${proveedores.map((p) => `${p.id}=${p.calls}`).join(' ')}; fallos de salud [${salud.llamadas.filter(([k]) => k === 'failure').map(([, p]) => p).join(',')}]`);
}

/* ═══ Efecto residual del arreglo (informativo): la fila sin cerrar y la liquidación ════════════════════════ */
console.log('\n── Efecto residual con el arreglo: la fila queda sin cerrar y `settle` no la ve como cobrable (solo informa) ──');
{
  const r = await correr({ proveedores: [proveedor('alpha')], fallaCierre: ({ patch, vez }) => patch.status === 'COMPLETED' && vez === 1 && 'nada' });
  if (r.error) {
    console.log(`ℹ sin arreglo no hay nada que liquidar: \`execute\` lanzó (${resumen(r)}) y quien llamó reembolsa la reserva`);
  } else {
    /* La persona recibió el resultado, así que quien llama captura los Credits y liquida el libro con ellos. */
    const s = await r.libro.settle({ creditTransactionId: 'usage_j1', finalAmount: r.valor.credits });
    const fila = filas(r)[0];
    console.log(`ℹ la fila sigue en ${fila.status} (sin cerrar); tras capturar ${r.valor.credits} Credits y liquidar: filas=${s.rows} atribuido=${s.credited} creditsCharged=${fila.creditsCharged} ` +
      `→ el cobro de la persona es correcto, pero ninguna fila lo recoge (y aiUsage.credits no suma) hasta reparar la fila a mano`);
  }
}

console.log(failures ? `\n${failures} comprobación(es) en ROJO` : '\nTodo en verde: el fallo contable ya no descarta el resultado ni penaliza al proveedor');
process.exit(failures ? 1 : 0);
