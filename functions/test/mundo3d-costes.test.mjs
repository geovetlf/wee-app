/**
 * EL COSTE DE UN MUNDO ACEPTADO (misión «cierre final de gobernanza y cost accounting de World 3D», 2026-10-06).
 *
 *   cotizar → reservar → el proveedor ACEPTA → genera → desenlace → libro y uso → liquidación → cobro o devolución
 *
 * El hueco que cerraba RUNTIME §22.5: por el conductor, la fila del libro de un intento ACEPTADO se cerraba al aceptarse
 * como completada y con `providerCost: 0`, y nadie la corregía; ni `providerCost` ni `usdEnRiesgo` veían lo que cuesta
 * un mundo. Ahora la fila queda en curso con el nombre de la tarea del proveedor y la cierra la liquidación, UNA vez,
 * con su tarifa o «en riesgo». Con lo que ya había: el libro de siempre (`aiGenerations`, `aiUsage/{día}`), el Credit
 * Engine de siempre, el limitador de siempre y el barrido de siempre. Ni otro libro, ni otro motor de Credits.
 *
 *   A · Aceptado no es terminado: la fila queda en curso, atada a la tarea; los fallos llevan su coste (H0 #22).
 *   B · Cómo acabó cada intento aceptado, leído del trabajo (pura).
 *   C · El libro cierra lo aceptado UNA vez, con su suma al día en la misma transacción.
 *   D · La liquidación de verdad: cobro, devolución, hueco del día y coste, sin dobles; reglas A–F de la misión.
 *   E · De punta a punta con el motor de trabajos: aceptado → reconciliado → liquidado; avisos tardíos y repetidos.
 *   F · La identidad de la operación: `world.generate#<requestId>`, y un requestId de otra capacidad no pasa.
 *   G · Seguridad: cuentas aisladas, ninguna clave en el cliente, ningún proveedor hacia la app.
 *   H · Lo que sigue apagado: fal, Hunyuan, la clave, la app, los tres canaries.
 *
 * Firestore en memoria (la misma base que `puente-pre-f1d`), el Credit Engine, el libro y el limitador DE VERDAD sobre
 * ella, y un proveedor que no existe. Sin red, sin Firebase, sin proveedor real. $0.
 *
 *   node functions/test/mundo3d-costes.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = async (letra, fn) => {
  try { await fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 4).join(' · ')); }
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cerca = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;
const lanza = async (f) => { try { await f(); return null; } catch (e) { return e; } };

/* ═══ Firestore en memoria: la misma base que puente-pre-f1d (transacciones, incrementos, consultas por igualdad) ═══ */
const fa = require('firebase-admin/firestore');
const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const copia = (v) => (Array.isArray(v) ? v.map(copia) : esPlano(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)])) : v);
const resolver = (valor, previo, profundo) => {
  if (esTipo(valor, 'NumericIncrementTransform')) return (typeof previo === 'number' ? previo : 0) + valor.operand;
  if (esTipo(valor, 'ServerTimestampTransform')) return fa.Timestamp.now();
  if (esTipo(valor, 'DeleteTransform')) return undefined;
  if (Array.isArray(valor)) return valor.map((x) => resolver(x, undefined, true));
  if (profundo && esPlano(valor)) {
    const out = esPlano(previo) ? { ...previo } : {};
    for (const [k, v] of Object.entries(valor)) out[k] = resolver(v, out[k], true);
    return out;
  }
  return copia(valor);
};
const leerCampo = (d, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
const yaExiste = (p) => Object.assign(new Error(`ALREADY_EXISTS: ${p}`), { code: 6 });
class Base {
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; this.transacciones = 0; }
  collection(p) { return new Consulta(this, p); }
  doc(p) { return new Ref(this, p); }
  runTransaction(fn) {
    const correr = async () => {
      this.transacciones++;
      const tx = new Tx(this); const r = await fn(tx); tx.confirmar(); return r;
    };
    const p = this.cola.then(correr, correr);
    this.cola = p.catch(() => {});
    return p;
  }
  batch() {
    const escrituras = [];
    const b = {
      set: (ref, data, opts) => { escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return b; },
      update: (ref, data) => { escrituras.push({ tipo: 'update', ref, data }); return b; },
      delete: (ref) => { escrituras.push({ tipo: 'delete', ref }); return b; },
      commit: async () => { for (const w of escrituras) escribir(this, w); },
    };
    return b;
  }
  leer(p) { return this.docs.has(p) ? copia(this.docs.get(p)) : undefined; }
  de(c) { return [...this.docs.entries()].filter(([p]) => p.startsWith(`${c}/`) && !p.slice(c.length + 1).includes('/')).map(([p, d]) => ({ id: p.slice(c.length + 1), ...d })); }
}
const escribir = (base, w) => {
  const previo = base.docs.get(w.ref.path);
  if (w.tipo === 'delete') { base.docs.delete(w.ref.path); return; }
  if (w.tipo === 'create') { if (previo) throw yaExiste(w.ref.path); base.docs.set(w.ref.path, resolver(w.data, undefined, true)); return; }
  if (w.tipo === 'set') { base.docs.set(w.ref.path, resolver(w.data, w.merge ? (previo || {}) : undefined, true)); return; }
  if (!previo) throw new Error(`update sobre un documento que no existe: ${w.ref.path}`);
  const out = { ...previo };
  for (const [k, v] of Object.entries(w.data)) { const r = resolver(v, out[k], false); if (r === undefined) delete out[k]; else out[k] = r; }
  base.docs.set(w.ref.path, out);
};
const foto = (ref, d) => ({ exists: d !== undefined, id: ref.id, ref, data: () => d, get: (f) => (d === undefined ? undefined : leerCampo(d, f)) });
class Ref {
  constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
  collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
  async get() { return foto(this, this.base.leer(this.path)); }
  async create(data) { escribir(this.base, { tipo: 'create', ref: this, data }); }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null) { Object.assign(this, { base, path: p, filtros, tope }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  where(campo, op, valor) {
    if (op !== '==') throw new Error(`esta base de prueba solo sabe «==»: ${op}`);
    return new Consulta(this.base, this.path, [...this.filtros, [campo, valor]], this.tope);
  }
  limit(tope) { return new Consulta(this.base, this.path, this.filtros, tope); }
  orderBy() { return this; }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, v]) => leerCampo(d, f) === v));
    if (this.tope) filas = filas.slice(0, this.tope);
    const docs = filas.map(([p, d]) => foto(new Ref(this.base, p), copia(d)));
    return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
  }
}
class Tx {
  constructor(base) { this.base = base; this.escrituras = []; }
  get(objetivo) { return objetivo.get(); }
  create(ref, data) { this.escrituras.push({ tipo: 'create', ref, data }); return this; }
  set(ref, data, opts) { this.escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
  update(ref, data) { this.escrituras.push({ tipo: 'update', ref, data }); return this; }
  delete(ref) { this.escrituras.push({ tipo: 'delete', ref }); return this; }
  confirmar() { for (const w of this.escrituras) escribir(this.base, w); }
}
const base = new Base();
fa.getFirestore = () => base;

/* ═══ Las piezas de verdad ═════════════════════════════════════════════════ */
const { firestoreLedger, memoryLedger, cierreDeAceptada } = lib('engine/ledger.js');
const rt = lib('runtime/index.js');
const { desenlacesDeLasAceptadas, decidirLiquidacion, reservaDe } = lib('runtime/liquidacion.js');
const { barrerLiquidaciones } = lib('runtime/barrendero.js');
const { reconciliarTrabajos } = lib('runtime/reconciliador.js');
const { atenderAviso } = lib('runtime/atencion.js');
const { claveDeOperacion, clavesDeOperacionDe, intentoDeLaOperacion } = lib('runtime/proveedor.js');
const P = lib('runtime/plazos.js');
const { crearJobEngine, POLITICA_DE_TRABAJO } = lib('core/job.js');
const { errorDelCore } = lib('core/errors.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { assertRequestId } = lib('credits/creditValidation.js');
const { limiter, DEFAULT_LIMITS } = lib('engine/limits.js');
const { costeTrasUnFallo } = lib('engine/router.js');
const { ProviderError, NotConfiguredError } = lib('engine/http.js');
const { EngineError } = lib('engine/errors.js');
const { ADAPTERS, DEFAULT_SETTINGS } = lib('engine/registry.js');
const { tarifaExacta } = lib('engine/pricing.js');
const core = lib('core/index.js');
const { datosDelRegistro } = lib('registry/index.js');
const { crearEjecutorDelMotor } = lib('engine/gateway.js');
const { HUNYUAN_WORLD_IMAGEN_A_MUNDO: HW } = lib('engine/providers/fal-modelos.js');
const { derechosDeImplementacion } = lib('engine/derechos.js');

const DIA = new Date().toISOString().slice(0, 10);
const T0 = Date.now();
const MIN = 60_000;
const TARIFA = HW.cost.usd;
const PRECIO = 39;
const SALDO = 1000;
const MUNDO = { '3d': 1 };
const operacionDelCupo = (r) => `world.generate#${r}`;
const claveDelCupo = (op) => createHash('sha256').update(op, 'utf8').digest('hex').slice(0, 32);
const tareaDe = (r) => `fal-ai:hunyuan_world:image-to-world:${r}-tarea`;

/* ── Las vistas: lo que hay escrito ── */
const filas = (r) => base.de('aiGenerations').filter((d) => d.creditTransactionId === `usage_${r}`);
const fila = (r) => filas(r)[0];
const transaccion = (r) => base.leer(`creditTransactions/usage_${r}`);
const reembolsos = (r) => base.de('creditTransactions').filter((d) => d.requestId === r && d.type === 'refund');
const saldo = (uid) => base.leer(`users/doc_${uid}`)?.creditsBalance;
const usoDelDia = () => base.leer(`aiUsage/${DIA}`) ?? {};
const delMundo = () => usoDelDia()['world.generate']?.fal ?? {};
const hueco = (uid, r) => base.leer(`aiRateLimits/${uid}_${DIA}`)?.operaciones?.[claveDelCupo(operacionDelCupo(r))];
const huecosDelDia = (uid) => base.leer(`aiRateLimits/${uid}_${DIA}`)?.['3d'] ?? 0;
const dinero = () => JSON.stringify(['creditTransactions', 'aiGenerations', 'aiUsage', 'aiRateLimits'].map((c) => base.de(c)));

const cuenta = async (uid) => {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid, country: 'US' });
  await creditEngine.ensureAccount(uid);
  base.docs.get(`users/doc_${uid}`).creditsBalance = SALDO;
};

/* ── Lo que hace la puerta del mundo al crear: reserva el dinero, ocupa el hueco, y el ejecutor abre la fila ── */
const despacho = (uid, r) => ({
  jobId: `job-${r}`, attemptId: `job-${r}#1`, attempt: 1, stepId: 'crear',
  capability: 'world.generate', implementation: { providerId: 'fal', modelId: HW.id },
  trace: { traceId: r, requestId: `medio:${r}:crear:1`, userId: uid, runId: `medio:${r}`, stepId: 'crear', workplace: 'studio' },
  metadata: { service: 'ai_world', creditsEstimated: PRECIO, estimatedUsd: TARIFA, creditTransactionId: `usage_${r}`, creditRequestId: r,
    quotaOperation: operacionDelCupo(r), quotaDay: DIA },
  input: {},
});
const resultadoBase = (r) => ({ contract: '1.0', requestId: r, traceId: r, idempotencyKey: `k-${r}`, capability: 'world.generate',
  implementation: { providerId: 'fal', modelId: HW.id }, timing: { startedAt: T0, finishedAt: T0 + 900 }, warnings: [] });
const aceptado = (r) => ({ ...resultadoBase(r), status: 'accepted', operation: { providerId: 'fal', operationId: tareaDe(r) } });
const fallido = (r, error) => ({ ...resultadoBase(r), status: 'failed', error });
const reservarYAceptar = async (uid, r, { libro = rt.libroDelMotor(firestoreLedger) } = {}) => {
  await creditEngine.spendCredits({ userId: uid, service: 'ai_world', amount: PRECIO, requestId: r, reason: 'Weë Studio · mundo 3D', source: 'weë-studio',
    fingerprint: createHash('sha256').update(r).digest('hex'), meta: { estimatedUsd: TARIFA, quotaDay: DIA } });
  await limiter.reserve(uid, MUNDO, DEFAULT_LIMITS, operacionDelCupo(r), DIA);
  const d = despacho(uid, r);
  const id = await libro.abrir(d);
  await libro.cerrar(id, { dispatch: d, resultado: aceptado(r), durationMs: 900 });
  return id;
};

/* ── El trabajo guardado, como lo deja el Job Engine ── */
const intento = (r, o = {}) => ({
  attemptId: `job-${r}#1`, number: 1, startedAt: o.startedAt ?? T0, dispatched: o.dispatched ?? true, providerKey: 'k1',
  outcome: o.outcome ?? 'unknown', ...(o.endedAt !== undefined ? { endedAt: o.endedAt } : {}),
  ...(o.sinRef ? {} : { providerRef: { providerId: 'fal', operationId: tareaDe(r) } }),
  ...(o.error ? { error: o.error } : {}), ...(o.usage ? { usage: o.usage } : {}),
});
const trabajo = (uid, r, o = {}) => ({
  contract: '1.0', jobId: `job-${r}`, revision: 1, state: o.state ?? 'waiting', owner: { userId: uid }, context: { operationId: r },
  capability: o.capability ?? 'world.generate', implementation: o.implementation ?? { providerId: 'fal', modelId: HW.id, adapterId: 'adapter:fal' },
  input: { modo: 'desde_imagen', descripcion: 'Una plaza medieval' },
  trace: { traceId: r, requestId: `medio:${r}:crear:1`, userId: uid, runId: `medio:${r}`, stepId: 'crear' },
  metadata: { creditTransactionId: `usage_${r}`, creditRequestId: r, creditsEstimated: PRECIO, service: 'ai_world', quotaOperation: operacionDelCupo(r), quotaDay: DIA,
    /* Lo que escribe la puerta del mundo al cotizar (`tarifaExacta`): un mundo cobra por petición. */
    ...(o.exacta === false ? {} : { estimatedUsdExact: true }) },
  mode: 'sync', policy: P.politicaDe(P.PLAZOS_DE_MUNDO, { ...POLITICA_DE_TRABAJO, retry: { ...POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } }),
  idempotency: { key: 'k', scope: 's', fingerprint: 'f' },
  createdAt: T0, updatedAt: o.updatedAt ?? T0 + 4 * MIN, deadlineAt: T0 + 45 * MIN, availableAt: T0,
  attempts: o.attempts ?? [intento(r, o)], attemptCount: 1, seenEvents: [],
});
const liquidacion = (deps = {}) => rt.liquidacionDeWee(deps);
const reservaDelMundo = (uid, r, o = {}) => reservaDe(trabajo(uid, r, o));

/* ═══ A · ACEPTADO NO ES TERMINADO ════════════════════════════════════════ */
console.log('── A · La fila de un intento aceptado queda EN CURSO, atada a la tarea del proveedor ──');
await seccion('A', async () => {
  const ANA = 'costeAna0001';
  await cuenta(ANA);
  const antesDelUso = JSON.stringify(usoDelDia());
  const id = await reservarYAceptar(ANA, 'costes-a1');
  const f = base.leer(`aiGenerations/${id}`);
  check('A1) al aceptar, la fila NO se cierra: queda en curso (PROCESSING) con el nombre de la tarea del proveedor, sin coste y sin liquidar',
    f.status === 'PROCESSING' && f.providerTaskId === tareaDe('costes-a1') && f.providerCost === 0 && f.creditsCharged === undefined && f.settledAt === undefined && !('completedAt' in f),
    JSON.stringify({ s: f.status, t: f.providerTaskId }));
  check('A2) y no cuenta al día todavía: lo que está en marcha no suma llamadas ni dinero', JSON.stringify(usoDelDia()) === antesDelUso);
  check('A3) atada sin ambigüedad: la transacción de Credits (`usage_<requestId>`), el servicio del mundo, la tarifa cotizada y la ejecución del medio',
    f.creditTransactionId === 'usage_costes-a1' && f.service === 'ai_world' && cerca(f.estimatedUsd, TARIFA) && f.capability === 'world.generate'
    && f.provider === 'fal' && f.model === HW.id && f.jobId === 'medio:costes-a1' && f.modality === '3d');

  /*
   * H0 #22 por el conductor, por el GATEWAY DE VERDAD: un adaptador que falla de cada forma, el ejecutor del motor que
   * decide con el error ORIGINAL (`costeTrasUnFallo`, anotado en `details.costeDelFallo`) y la regla del runtime, que
   * solo lo lee —o, si el fallo es del Gateway sin pasar por el adaptador, decide por el CÓDIGO, nunca por el motivo—.
   */
  const porElGateway = async (run, { config: ajustes = {}, execution } = {}) => {
    const adaptador = {
      id: 'falso', name: 'falso', modalities: ['text'],
      models: [{ id: 'falso-1', provider: 'falso', capabilities: ['text.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: TARIFA } }],
      isConfigured: () => true, supports: (c) => c === 'text.generate', run,
    };
    const adapters = { falso: adaptador };
    const config = { providers: ajustes, settings: DEFAULT_SETTINGS };
    const gateway = core.crearGateway({
      registry: core.crearRegistro(datosDelRegistro(adapters, config.providers)),
      executor: crearEjecutorDelMotor({ adapters, config: () => config, now: () => T0 }),
      tracer: { record() {} }, now: () => T0,
    });
    return gateway.ejecutar({
      contract: core.GATEWAY_CONTRACT_VERSION, capability: 'text.generate', implementation: { providerId: 'falso', modelId: 'falso-1' },
      input: { prompt: 'hola' }, trace: { traceId: 'costes-gw', requestId: 'costes-gw', userId: 'usuario-gw-0001' }, ...(execution ? { execution } : {}),
    });
  };
  const lanza = (e) => async () => { throw e; };
  const trasAceptar = (e) => async (req) => { await req.onStatus?.('PROCESSING', { providerTaskId: 'tarea-aceptada-1' }); throw e; };
  const ERRORES = [
    ['el adaptador sin clave', new NotConfiguredError('falso', 'FALSO_KEY'), false, 'cero'],
    ['el proveedor la rechazó al recibirla (422)', new ProviderError('falso: 422', 'falso', 422, false), false, 'cero'],
    ['límite del proveedor (429)', new ProviderError('falso: 429', 'falso', 429, true), false, 'cero'],
    ['una entrada que el adaptador no manda', new EngineError('INVALID_REQUEST', undefined, { reason: 'needs_image' }), false, 'cero'],
    ['el proveedor falló (502)', new ProviderError('falso: 502', 'falso', 502, true), false, 'desconocido'],
    ['no volvió respuesta (red)', new ProviderError('falso: socket hang up', 'falso', undefined, true), false, 'desconocido'],
    ['moderación del proveedor, sin código HTTP', new ProviderError('falso: sensitive content detected', 'falso'), false, 'desconocido'],
    ['un 404 DESPUÉS de que el proveedor aceptara la tarea', new ProviderError('falso: 404', 'falso', 404, false), true, 'desconocido'],
  ];
  const vistos = [];
  for (const [nombre, error, aceptada, esperado] of ERRORES) {
    const r = await porElGateway(aceptada ? trasAceptar(error) : lanza(error));
    vistos.push({ nombre, error, aceptada, esperado, r, coste: rt.costeDelFalloDelGateway(r) });
  }
  const malA4 = vistos.filter((v) => v.r.status !== 'failed' || v.coste !== v.esperado || v.r.error?.details?.costeDelFallo !== v.esperado);
  check('A4) un FALLO del adaptador: lo decide el ejecutor del motor con el error original y viaja en el error; lo que no llegó o se rechazó al recibirse, cero; el resto —también la moderación sin código y lo que falla tras aceptar—, desconocido',
    malA4.length === 0, JSON.stringify(malA4.map((v) => [v.nombre, v.r.status, v.coste, v.r.error?.details?.costeDelFallo])));
  const raro = await porElGateway(async (req) => { await req.onStatus?.('PROCESSING', { providerTaskId: 'tarea-rara-1' }); throw Object.create(null); });
  const raroAntes = await porElGateway(async () => { throw Object.create(null); });
  check('A4b) y si REGISTRAR o NORMALIZAR el error lanzara (un valor que ni se deja convertir en texto), el fallo sale igual del adaptador y anotado: tras dar nombre a la tarea, desconocido —nunca una «avería previa» a cero—',
    raro.status === 'failed' && raro.error?.source === 'adapter:falso' && raro.error?.details?.costeDelFallo === 'desconocido' && rt.costeDelFalloDelGateway(raro) === 'desconocido'
    && raroAntes.status === 'failed' && raroAntes.error?.source === 'adapter:falso' && rt.costeDelFalloDelGateway(raroAntes) === 'desconocido',
    JSON.stringify([raro.error, raroAntes.error?.details]));
  check('A5) y es LO MISMO que contesta `costeTrasUnFallo` (engine/router.ts) para el mismo error: una sola regla, no dos',
    vistos.every((v) => v.coste === costeTrasUnFallo(v.error, v.aceptada)),
    vistos.map((v) => `${v.nombre}:${v.coste}/${costeTrasUnFallo(v.error, v.aceptada)}`).join(' · '));

  const sinNombre = await porElGateway(async () => ({ accepted: { operationId: '' }, costUSD: TARIFA, latencyMs: 1, model: 'falso-1' }));
  const apagado = await porElGateway(lanza(new Error('no debe llamarse')), { config: { falso: { enabled: false, priority: 1 } } });
  const vencido = await porElGateway(lanza(new Error('no debe llamarse')), { execution: { mode: 'sync', deadlineAt: T0 - 1 } });
  const delGateway = (code, reason) => fallido('x', errorDelCore(code, 'gateway', { details: { reason } }));
  check('A6) los fallos del GATEWAY sin pasar por el adaptador se deciden por su código: un rechazo o una avería previos a ejecutar (proveedor apagado, plazo vencido, petición mala, registro caído, ejecutor roto antes del adaptador), cero; una tarea aceptada sin nombre o una respuesta del proveedor inservible, desconocido',
    apagado.status === 'failed' && rt.costeDelFalloDelGateway(apagado) === 'cero'
    && vencido.status === 'failed' && rt.costeDelFalloDelGateway(vencido) === 'cero'
    && sinNombre.status === 'failed' && sinNombre.error?.details?.reason === 'accepted_without_operation' && rt.costeDelFalloDelGateway(sinNombre) === 'desconocido'
    && rt.costeDelFalloDelGateway(delGateway('PROVIDER_ERROR', 'invalid_provider_response')) === 'desconocido'
    && rt.costeDelFalloDelGateway(delGateway('INTERNAL_ERROR', 'executor_failure')) === 'cero'
    && rt.costeDelFalloDelGateway(delGateway('INTERNAL_ERROR', 'registry_unavailable')) === 'cero'
    && rt.costeDelFalloDelGateway(delGateway('INVALID_REQUEST', 'input_too_large')) === 'cero'
    && rt.costeDelFalloDelGateway(fallido('x', undefined)) === 'desconocido',
    JSON.stringify([apagado.error?.code, vencido.error?.code, sinNombre.error?.details?.reason]));
  check('A7) y la regla del runtime ya no ramifica por el motivo fino (diagnóstico): ni `reason`, ni `not_configured`, ni códigos HTTP; y «despachado» se reconoce en UN sitio (`tareaEnElProveedor`), el mismo para el router y el ejecutor',
    (() => {
      const s = sinComentarios(leer('functions/src/runtime/index.ts'));
      const cuerpo = s.slice(s.indexOf('export const costeDelFalloDelGateway'), s.indexOf('export const libroDelMotor'));
      const motor = ['functions/src/engine/router.ts', 'functions/src/engine/gateway.ts'].map((f) => sinComentarios(leer(f)));
      return cuerpo.length > 100 && !/reason|not_configured|providerCode|\b4\d\d\b/.test(cuerpo) && /costeDelFallo/.test(cuerpo)
        && motor.every((s) => /if \(tareaEnElProveedor\(meta\)\) despachado = true;/.test(s) && !/providerTaskId === 'string' && meta\??\.providerTaskId\)/.test(s));
    })());

  const libro = rt.libroDelMotor(firestoreLedger);
  const usdAntes = delMundo().usd ?? 0; const riesgoAntes = delMundo().usdEnRiesgo ?? 0;
  const r502 = vistos.find((v) => v.nombre === 'el proveedor falló (502)').r;
  const r422 = vistos.find((v) => v.nombre === 'el proveedor la rechazó al recibirla (422)').r;
  const dTimeout = despacho(ANA, 'costes-a6');
  const idTimeout = await libro.abrir(dTimeout);
  await libro.cerrar(idTimeout, { dispatch: dTimeout, resultado: r502, durationMs: 30_000 });
  const dRechazo = despacho(ANA, 'costes-a7');
  const idRechazo = await libro.abrir(dRechazo);
  await libro.cerrar(idRechazo, { dispatch: dRechazo, resultado: r422, durationMs: 200 });
  const t = base.leer(`aiGenerations/${idTimeout}`); const r = base.leer(`aiGenerations/${idRechazo}`);
  check('A8) en el libro: un fallo del proveedor que pudo costar queda FALLIDO con su tarifa «en riesgo» (y el día lo suma); el rechazo al recibirla, fallido y a cero',
    t.status === 'FAILED' && t.providerCost === 0 && t.providerCostStatus === 'desconocido' && cerca(t.providerCostEstimated, TARIFA)
    && r.status === 'FAILED' && r.providerCost === 0 && r.providerCostStatus === undefined
    && cerca(delMundo().usdEnRiesgo - riesgoAntes, TARIFA) && cerca((delMundo().usd ?? 0) - usdAntes, 0),
    JSON.stringify({ t: [t.status, t.providerCostStatus], r: [r.status, r.providerCostStatus], dia: delMundo() }));
});

/* ═══ B · CÓMO ACABÓ CADA INTENTO ACEPTADO ═════════════════════════════════ */
console.log('\n── B · Los desenlaces de lo aceptado, leídos del trabajo ──');
await seccion('B', async () => {
  const U = 'uB';
  const de = (o) => desenlacesDeLasAceptadas(trabajo(U, 'b', o));
  check('B1) salió bien → «salió», con lo que tardó desde que salió hasta que se supo',
    iguales(de({ state: 'completed', outcome: 'succeeded', endedAt: T0 + 3 * MIN }), [{ operationId: tareaDe('b'), desenlace: 'salio', durationMs: 3 * MIN }]));
  check('B2) falló o se agotó → «fallo», con el CÓDIGO del error y nunca su mensaje',
    iguales(de({ state: 'failed', outcome: 'failed', endedAt: T0 + MIN, error: errorDelCore('PROVIDER_ERROR', 'adapter:fal', { details: { providerMessage: 'texto del proveedor' } }) }),
      [{ operationId: tareaDe('b'), desenlace: 'fallo', durationMs: MIN, error: 'PROVIDER_ERROR' }])
    && de({ state: 'timed_out', outcome: 'timed_out', endedAt: T0 + MIN, error: errorDelCore('TIMEOUT', 'adapter:fal') })[0].desenlace === 'fallo');
  check('B3) cancelado → «cancelada», también cuando la parada la consuma el «falló» del proveedor',
    de({ state: 'cancelled', outcome: 'cancelled', endedAt: T0 + MIN })[0].desenlace === 'cancelada'
    && de({ state: 'cancelled', outcome: 'failed', endedAt: T0 + MIN, error: errorDelCore('PROVIDER_ERROR', 'adapter:fal') })[0].desenlace === 'cancelada');
  check('B4) NO están: lo que sigue sin saberse, lo que nunca salió y lo que salió sin nombre del proveedor (eso se reconcilia o ya se cerró)',
    de({ state: 'waiting', outcome: 'unknown' }).length === 0 && de({ state: 'failed', outcome: 'failed', dispatched: false, sinRef: true, error: errorDelCore('INTERNAL_ERROR', 'runtime') }).length === 0
    && de({ state: 'failed', outcome: 'failed', sinRef: true, error: errorDelCore('TIMEOUT', 'adapter:fal') }).length === 0);
  check('B5) el uso que dijo el proveedor viaja, solo si son números', iguales(de({ state: 'completed', outcome: 'succeeded', endedAt: T0 + MIN, usage: { totalTokens: 1200, raw: { x: 1 } } })[0].usage, { totalTokens: 1200 }));
  check('B6) y es pura y congelada: el mismo trabajo, el mismo resultado', Object.isFrozen(de({ state: 'completed', outcome: 'succeeded', endedAt: T0 + MIN }))
    && iguales(de({ state: 'completed', outcome: 'succeeded', endedAt: T0 + MIN }), de({ state: 'completed', outcome: 'succeeded', endedAt: T0 + MIN })));
});

/* ═══ C · EL LIBRO CIERRA LO ACEPTADO UNA VEZ ══════════════════════════════ */
console.log('\n── C · `closeAccepted`: una vez, con su suma al día en la misma transacción ──');
await seccion('C', async () => {
  const BEA = 'costeBea0001';
  await cuenta(BEA);
  await reservarYAceptar(BEA, 'costes-c1');
  const antes = { ...delMundo() };
  const cierre = { providerTaskId: tareaDe('costes-c1'), status: 'COMPLETED', coste: 'exacto', creditsEstimated: PRECIO, durationMs: 3 * MIN };
  const r1 = await firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c1', cierres: [cierre] });
  const f = fila('costes-c1');
  const despues = { ...delMundo() };
  check('C1) cierra la fila en curso: completada, con la TARIFA como coste (por petición: exacta) y la suma al día —una llamada y su dinero—',
    r1.cerradas === 1 && f.status === 'COMPLETED' && cerca(f.providerCost, TARIFA) && f.providerCostStatus === undefined && f.creditsEstimated === PRECIO && !!f.completedAt
    && despues.calls - (antes.calls ?? 0) === 1 && cerca(despues.usd - (antes.usd ?? 0), TARIFA) && (despues.failed ?? 0) === (antes.failed ?? 0),
    JSON.stringify({ f: [f.status, f.providerCost], antes, despues }));
  const foto1 = dinero();
  const r2 = await firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c1', cierres: [cierre] });
  const r3 = await firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c1', cierres: [{ ...cierre, status: 'FAILED', coste: 'desconocido' }] });
  check('C2) una segunda vez —o con otro desenlace— NO hace nada: ni la fila ni el día cambian (no se cuenta dos veces)',
    r2.cerradas === 0 && r3.cerradas === 0 && dinero() === foto1);

  await reservarYAceptar(BEA, 'costes-c2');
  await reservarYAceptar(BEA, 'costes-c3');
  const transaccionesAntes = base.transacciones;
  const [p1, p2] = await Promise.all([
    firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c2', cierres: [{ providerTaskId: tareaDe('costes-c2'), status: 'FAILED', coste: 'desconocido', durationMs: MIN }] }),
    firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c2', cierres: [{ providerTaskId: tareaDe('costes-c2'), status: 'FAILED', coste: 'desconocido', durationMs: MIN }] }),
  ]);
  const c2 = fila('costes-c2');
  check('C3) dos liquidaciones A LA VEZ sobre la misma fila: la cierra una, y su riesgo se suma UNA vez',
    p1.cerradas + p2.cerradas === 1 && c2.status === 'FAILED' && c2.providerCost === 0 && c2.providerCostStatus === 'desconocido' && cerca(c2.providerCostEstimated, TARIFA)
    && base.transacciones - transaccionesAntes >= 1, JSON.stringify([p1, p2]));
  const c3Antes = JSON.stringify(fila('costes-c3'));
  await firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c2', cierres: [{ providerTaskId: tareaDe('costes-c3'), status: 'COMPLETED', coste: 'exacto', durationMs: MIN }] });
  await firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-c3', cierres: [{ providerTaskId: tareaDe('costes-c2'), status: 'COMPLETED', coste: 'exacto', durationMs: MIN }] });
  check('C4) solo la fila de ESA transacción y de ESA tarea: otra transacción o la tarea de otro trabajo no tocan nada',
    JSON.stringify(fila('costes-c3')) === c3Antes && fila('costes-c3').status === 'PROCESSING');
  check('C5) el cierre, puro: exacto → la tarifa; estimado → la tarifa marcada; desconocido → cero y la tarifa «en riesgo»; una tarifa rara cuenta cero',
    iguales(cierreDeAceptada(0.3, { providerTaskId: 't', status: 'COMPLETED', coste: 'exacto', durationMs: 5 }), { status: 'COMPLETED', providerCost: 0.3, durationMs: 5 })
    && iguales(cierreDeAceptada(0.3, { providerTaskId: 't', status: 'COMPLETED', coste: 'estimado', durationMs: 5 }), { status: 'COMPLETED', providerCost: 0.3, providerCostStatus: 'estimado', durationMs: 5 })
    && iguales(cierreDeAceptada(0.3, { providerTaskId: 't', status: 'CANCELLED', coste: 'desconocido', durationMs: -5 }), { status: 'CANCELLED', providerCost: 0, providerCostStatus: 'desconocido', providerCostEstimated: 0.3, durationMs: 0 })
    && [NaN, -1, '0.3', undefined, null].every((x) => cierreDeAceptada(x, { providerTaskId: 't', status: 'COMPLETED', coste: 'exacto', durationMs: 1 }).providerCost === 0));
  const m = memoryLedger();
  const idM = await m.open({ userId: 'u', capability: 'world.generate', modality: '3d', provider: 'fal', model: HW.id, attempt: 1, estimatedUsd: TARIFA, pricingMode: 'simulated', creditTransactionId: 'usage_m' });
  await m.progress(idM, { status: 'PROCESSING', providerTaskId: 't-m' });
  const m1 = await m.closeAccepted({ creditTransactionId: 'usage_m', cierres: [{ providerTaskId: 't-m', status: 'COMPLETED', coste: 'exacto', durationMs: 1 }] });
  const m2 = await m.closeAccepted({ creditTransactionId: 'usage_m', cierres: [{ providerTaskId: 't-m', status: 'COMPLETED', coste: 'exacto', durationMs: 1 }] });
  check('C6) el libro en memoria (el de las pruebas) dice lo mismo: una vez, con su suma', m1.cerradas === 1 && m2.cerradas === 0 && m.usage.calls === 1 && cerca(m.usage.usd, TARIFA));
});

/* ═══ D · LA LIQUIDACIÓN DE VERDAD ═════════════════════════════════════════ */
console.log('\n── D · Dinero, hueco del día y coste: una vez cada uno ──');
await seccion('D', async () => {
  const CIRO = 'costeCiro001';
  await cuenta(CIRO);
  const L = liquidacion();

  /* E · el proveedor empezó y hay coste: un mundo que SALE. */
  await reservarYAceptar(CIRO, 'costes-d1');
  const antes = { ...delMundo() };
  const hecho = trabajo(CIRO, 'costes-d1', { state: 'completed', outcome: 'succeeded', endedAt: T0 + 3 * MIN });
  const r1 = await L.liquidar({ userId: CIRO, reserva: reservaDe(hecho), importe: PRECIO, jobId: hecho.jobId, job: hecho });
  const f1 = fila('costes-d1'); const d1 = delMundo(); const u1 = usoDelDia();
  check('D1) un mundo que SALE: se cobra lo reservado UNA vez, la fila se cierra completada con su tarifa EXACTA y se liquida con los Credits cobrados',
    r1.desenlace === 'liquidada' && transaccion('costes-d1').status === 'COMPLETED' && saldo(CIRO) === SALDO - PRECIO
    && f1.status === 'COMPLETED' && cerca(f1.providerCost, TARIFA) && f1.providerCostStatus === undefined && f1.creditsCharged === PRECIO && !!f1.settledAt && f1.durationMs === 3 * MIN,
    JSON.stringify({ r1, f: [f1.status, f1.providerCost, f1.creditsCharged] }));
  check('D2) y el día lo ve: una llamada, su dinero de proveedor y sus Credits, en el cubo de su capacidad y su proveedor',
    d1.calls - (antes.calls ?? 0) === 1 && cerca(d1.usd - (antes.usd ?? 0), TARIFA) && d1.credits - (antes.credits ?? 0) === PRECIO && (u1.byProvider?.fal?.calls ?? 0) >= 1);
  check('D3) el hueco del día se QUEDA: es uno de los cinco mundos que salen', hueco(CIRO, 'costes-d1') === true && huecosDelDia(CIRO) === 1);
  const foto1 = dinero();
  const r1b = await L.liquidar({ userId: CIRO, reserva: reservaDe(hecho), importe: PRECIO, jobId: hecho.jobId, job: hecho });
  const r1c = await L.reembolsar({ userId: CIRO, reserva: reservaDe(hecho), motivo: 'fallo_definitivo', jobId: hecho.jobId, job: hecho });
  check('D4) liquidar OTRA vez —otra pasada, otro barrendero— o intentar devolverlo después: nada se mueve, ni dinero, ni libro, ni día, ni hueco',
    r1b.desenlace !== 'fallo' && r1c.desenlace === 'ya_estaba' && dinero() === foto1 && reembolsos('costes-d1').length === 0, JSON.stringify([r1b, r1c]));

  /* B · fallo del proveedor DESPUÉS de aceptarlo. */
  await reservarYAceptar(CIRO, 'costes-d2');
  const antes2 = { ...delMundo() };
  const roto = trabajo(CIRO, 'costes-d2', { state: 'failed', outcome: 'failed', endedAt: T0 + 2 * MIN, error: errorDelCore('PROVIDER_ERROR', 'adapter:fal') });
  const r2 = await L.reembolsar({ userId: CIRO, reserva: reservaDe(roto), motivo: decidirLiquidacion(roto, T0).motivo, jobId: roto.jobId, job: roto });
  const f2 = fila('costes-d2'); const d2 = delMundo();
  check('D5) el proveedor la aceptó y FALLÓ: la reserva vuelve exacta, el hueco vuelve, y la fila se cierra fallida con su tarifa «en riesgo» (H0 #22), sin Credits',
    r2.desenlace === 'reembolsada' && transaccion('costes-d2').status === 'REFUNDED' && saldo(CIRO) === SALDO - PRECIO && reembolsos('costes-d2').length === 1
    && hueco(CIRO, 'costes-d2') === 'devuelta' && huecosDelDia(CIRO) === 1
    && f2.status === 'FAILED' && f2.providerCost === 0 && f2.providerCostStatus === 'desconocido' && cerca(f2.providerCostEstimated, TARIFA) && f2.creditsCharged === 0 && f2.error === 'PROVIDER_ERROR'
    && cerca(d2.usdEnRiesgo - (antes2.usdEnRiesgo ?? 0), TARIFA) && d2.failed - (antes2.failed ?? 0) === 1 && cerca(d2.usd - (antes2.usd ?? 0), 0),
    JSON.stringify({ r2, f: [f2.status, f2.providerCostStatus, f2.creditsCharged], h: hueco(CIRO, 'costes-d2') }));
  const foto2 = dinero();
  const r2b = await L.reembolsar({ userId: CIRO, reserva: reservaDe(roto), motivo: 'fallo_definitivo', jobId: roto.jobId, job: roto });
  const r2c = await L.liquidar({ userId: CIRO, reserva: reservaDe(roto), importe: PRECIO, jobId: roto.jobId, job: roto });
  check('D6) devolver otra vez, o cobrar después de devolver: «ya estaba», sin un segundo reembolso, sin otro hueco, sin otra suma al día',
    r2b.desenlace === 'ya_estaba' && r2c.desenlace === 'ya_estaba' && dinero() === foto2 && reembolsos('costes-d2').length === 1, JSON.stringify([r2b, r2c]));

  /* F · la persona cancela con el proveedor ya trabajando: la puerta GASTA el hueco; el dinero vuelve si no termina. */
  await reservarYAceptar(CIRO, 'costes-d3');
  await limiter.consumir(CIRO, operacionDelCupo('costes-d3'), DIA);
  const cancelado = trabajo(CIRO, 'costes-d3', { state: 'cancelled', outcome: 'cancelled', endedAt: T0 + MIN });
  const r3 = await L.reembolsar({ userId: CIRO, reserva: reservaDe(cancelado), motivo: 'fallo_definitivo', jobId: cancelado.jobId, job: cancelado });
  const f3 = fila('costes-d3');
  check('D7) cancelar con el proveedor trabajando: el dinero vuelve (la regla de la parada), el hueco se queda GASTADO, y la fila queda cancelada con su coste «en riesgo»',
    r3.desenlace === 'reembolsada' && transaccion('costes-d3').status === 'REFUNDED' && hueco(CIRO, 'costes-d3') === 'consumida'
    && f3.status === 'CANCELLED' && f3.providerCostStatus === 'desconocido' && cerca(f3.providerCostEstimated, TARIFA) && f3.creditsCharged === 0,
    JSON.stringify({ r3, f: [f3.status, f3.providerCostStatus], h: hueco(CIRO, 'costes-d3') }));

  /* A · error interno ANTES del proveedor: nada salió. */
  const DANI = 'costeDani001';
  await cuenta(DANI);
  await creditEngine.spendCredits({ userId: DANI, service: 'ai_world', amount: PRECIO, requestId: 'costes-d4', source: 'weë-studio', meta: { quotaDay: DIA } });
  await limiter.reserve(DANI, MUNDO, DEFAULT_LIMITS, operacionDelCupo('costes-d4'), DIA);
  const usoAntes4 = JSON.stringify(usoDelDia());
  const interno = trabajo(DANI, 'costes-d4', { state: 'failed', outcome: 'failed', dispatched: false, sinRef: true, error: errorDelCore('INTERNAL_ERROR', 'runtime', { details: { reason: 'context_unavailable' } }) });
  const accion4 = decidirLiquidacion(interno, T0);
  const r4 = await L.reembolsar({ userId: DANI, reserva: reservaDe(interno), motivo: accion4.motivo, jobId: interno.jobId, job: interno });
  check('D8) A · error interno antes del proveedor: «no salió» → la reserva vuelve, el hueco vuelve, y ni el libro ni el día cuentan nada',
    accion4.tipo === 'reembolsar' && accion4.motivo === 'no_salio' && r4.desenlace === 'reembolsada' && saldo(DANI) === SALDO && hueco(DANI, 'costes-d4') === 'devuelta'
    && huecosDelDia(DANI) === 0 && filas('costes-d4').length === 0 && JSON.stringify(usoDelDia()) === usoAntes4);

  /* C · plazo interno ANTES de la aceptación real: el Gateway no llegó a llamar al adaptador. */
  await creditEngine.spendCredits({ userId: DANI, service: 'ai_world', amount: PRECIO, requestId: 'costes-d5', source: 'weë-studio', meta: { quotaDay: DIA } });
  await limiter.reserve(DANI, MUNDO, DEFAULT_LIMITS, operacionDelCupo('costes-d5'), DIA);
  const libro = rt.libroDelMotor(firestoreLedger);
  const d5 = despacho(DANI, 'costes-d5');
  const id5 = await libro.abrir(d5);
  const plazo = errorDelCore('PROVIDER_UNAVAILABLE', 'gateway', { details: { reason: 'deadline_passed' } });
  await libro.cerrar(id5, { dispatch: d5, resultado: fallido('costes-d5', plazo), durationMs: 10 });
  const vencido = trabajo(DANI, 'costes-d5', { state: 'failed', outcome: 'failed', sinRef: true, error: plazo });
  const r5 = await L.reembolsar({ userId: DANI, reserva: reservaDe(vencido), motivo: decidirLiquidacion(vencido, T0).motivo, jobId: vencido.jobId, job: vencido });
  const f5 = base.leer(`aiGenerations/${id5}`);
  check('D9) C · plazo interno antes de que el proveedor la aceptara: se devuelve, el hueco vuelve, y la fila queda fallida a coste CERO (no llegó al adaptador)',
    r5.desenlace === 'reembolsada' && hueco(DANI, 'costes-d5') === 'devuelta' && f5.status === 'FAILED' && f5.providerCost === 0 && f5.providerCostStatus === undefined && f5.creditsCharged === 0);

  /* D · error ambiguo: el POST salió y no volvió nada. Ni cobro ni devolución: se reconcilia. */
  await creditEngine.spendCredits({ userId: DANI, service: 'ai_world', amount: PRECIO, requestId: 'costes-d6', source: 'weë-studio', meta: { quotaDay: DIA } });
  await limiter.reserve(DANI, MUNDO, DEFAULT_LIMITS, operacionDelCupo('costes-d6'), DIA);
  const d6 = despacho(DANI, 'costes-d6');
  const id6 = await libro.abrir(d6);
  await libro.cerrar(id6, { dispatch: d6, resultado: fallido('costes-d6', errorDelCore('TIMEOUT', 'adapter:fal', { details: { reason: 'timeout' } })), durationMs: 30_000 });
  const ambiguo = trabajo(DANI, 'costes-d6', { state: 'waiting', outcome: 'unknown', sinRef: true });
  const f6 = base.leer(`aiGenerations/${id6}`);
  check('D10) D · error ambiguo (el POST salió y no volvió): ni se cobra ni se devuelve —se reconcilia—, el hueco sigue ocupado y su coste va «en riesgo» desde ya',
    decidirLiquidacion(ambiguo, T0 + MIN).tipo === 'reconciliar' && transaccion('costes-d6').status === 'AUTHORIZED' && hueco(DANI, 'costes-d6') === true
    && f6.status === 'FAILED' && f6.providerCostStatus === 'desconocido' && cerca(f6.providerCostEstimated, TARIFA));

  /* Una avería del libro al cerrar lo aceptado: el dinero ya está bien, y la pasada se repite sin dobles. */
  await reservarYAceptar(CIRO, 'costes-d7');
  const hecho7 = trabajo(CIRO, 'costes-d7', { state: 'completed', outcome: 'succeeded', endedAt: T0 + 2 * MIN });
  const saldo7 = saldo(CIRO);
  let averias = 1;
  const libroQueFalla = { ...firestoreLedger, async closeAccepted(p) { if (averias-- > 0) throw new Error('aiGenerations no contesta'); return firestoreLedger.closeAccepted(p); } };
  const conAveria = liquidacion({ ledger: libroQueFalla });
  const r7a = await conAveria.liquidar({ userId: CIRO, reserva: reservaDe(hecho7), importe: PRECIO, jobId: hecho7.jobId, job: hecho7 });
  const tras7a = { tx: transaccion('costes-d7').status, saldo: saldo(CIRO), fila: fila('costes-d7').status, settled: !!fila('costes-d7').settledAt };
  const r7b = await conAveria.liquidar({ userId: CIRO, reserva: reservaDe(hecho7), importe: PRECIO, jobId: hecho7.jobId, job: hecho7 });
  const f7 = fila('costes-d7');
  check('D11) si el libro no puede cerrar lo aceptado, el cobro YA está hecho y la pasada se da por no terminada; la siguiente cierra la fila y la liquida, sin cobrar dos veces',
    r7a.desenlace === 'fallo' && tras7a.tx === 'COMPLETED' && tras7a.saldo === saldo7 && tras7a.fila === 'PROCESSING' && tras7a.settled === false
    && r7b.desenlace === 'liquidada' && saldo(CIRO) === saldo7 && f7.status === 'COMPLETED' && cerca(f7.providerCost, TARIFA) && f7.creditsCharged === PRECIO,
    JSON.stringify({ r7a, tras7a, r7b, f: [f7.status, f7.creditsCharged] }));
  const roto7 = { ...firestoreLedger, async closeAccepted() { throw new Error('aiGenerations no contesta'); } };
  await reservarYAceptar(CIRO, 'costes-d7b');
  const fallo7b = trabajo(CIRO, 'costes-d7b', { state: 'failed', outcome: 'failed', endedAt: T0 + MIN, error: errorDelCore('PROVIDER_ERROR', 'adapter:fal') });
  const r7c = await liquidacion({ ledger: roto7 }).reembolsar({ userId: CIRO, reserva: reservaDe(fallo7b), motivo: 'fallo_definitivo', jobId: fallo7b.jobId, job: fallo7b });
  check('D11b) y si se trata de DEVOLVER, la avería del libro tampoco retiene nada de la persona: el dinero y el hueco ya volvieron, y la pasada se repetirá',
    r7c.desenlace === 'fallo' && transaccion('costes-d7b').status === 'REFUNDED' && hueco(CIRO, 'costes-d7b') === 'devuelta' && fila('costes-d7b').status === 'PROCESSING');

  /* Un modelo que cobra por segundos (un vídeo): terminó bien y no se midió → la estimación, MARCADA. */
  await creditEngine.spendCredits({ userId: CIRO, service: 'ai_world', amount: PRECIO, requestId: 'costes-d8', source: 'weë-studio' });
  const d8 = { ...despacho(CIRO, 'costes-d8'), implementation: { providerId: 'seedance', modelId: ADAPTERS.seedance.models[0].id } };
  const id8 = await libro.abrir(d8);
  await libro.cerrar(id8, { dispatch: d8, resultado: aceptado('costes-d8'), durationMs: 900 });
  const porSegundos = trabajo(CIRO, 'costes-d8', { state: 'completed', outcome: 'succeeded', endedAt: T0 + MIN, implementation: d8.implementation, usage: { totalTokens: 4800 }, exacta: false });
  await L.liquidar({ userId: CIRO, reserva: reservaDe(porSegundos), importe: PRECIO, jobId: porSegundos.jobId, job: porSegundos });
  const f8 = base.leer(`aiGenerations/${id8}`);
  check('D12) un modelo que NO cobra por petición (por segundos): completado con la estimación de su cotización, marcada `estimado`, y con el uso que dijo el proveedor',
    f8.status === 'COMPLETED' && f8.providerCostStatus === 'estimado' && cerca(f8.providerCost, TARIFA) && f8.usage?.totalTokens === 4800);
  const PUERTA = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('D13) si la tarifa ES el coste lo decide quien COTIZA (`tarifaExacta`, por petición) con el modelo que eligió el Router, la puerta del mundo lo guarda con el trabajo y la liquidación lo LEE de ahí: sin preguntar a la configuración del momento',
    tarifaExacta(HW) === true && tarifaExacta(ADAPTERS.seedance.models[0]) === false && tarifaExacta({ cost: { unit: 'mtoken', usd: 1 } }) === false
    && /tarifaExacta: tarifaExacta\(elegido\.model\),/.test(PUERTA) && /\.\.\.\(p\.tarifaExacta \? \{ \[CLAVE_DE_TARIFA_EXACTA\]: true \} : \{\}\),/.test(PUERTA)
    && reservaDe(trabajo(CIRO, 'x')).tarifaExacta === true && reservaDe(trabajo(CIRO, 'y', { exacta: false })).tarifaExacta === undefined
    && (() => {
      const s = sinComentarios(leer('functions/src/runtime/index.ts'));
      const cuerpo = s.slice(s.indexOf('export const liquidacionDeWee'), s.indexOf('export const barridoDeLiquidacionDeWee'));
      return cuerpo.length > 500 && /reserva\.tarifaExacta === true/.test(cuerpo) && !/loadConfig|tarifaPorPeticion|ADAPTERS/.test(cuerpo);
    })());

  /* Cobrar una reserva que la puerta ya había devuelto (el mundo llegó tarde): el coste se anota, los Credits no. */
  await reservarYAceptar(CIRO, 'costes-d9');
  await creditEngine.refundCredits({ userId: CIRO, requestId: 'costes-d9', reason: 'prueba', source: 'weë-studio' });
  const tarde = trabajo(CIRO, 'costes-d9', { state: 'completed', outcome: 'succeeded', endedAt: T0 + MIN });
  const r9 = await L.liquidar({ userId: CIRO, reserva: reservaDe(tarde), importe: PRECIO, jobId: tarde.jobId, job: tarde });
  const f9 = fila('costes-d9');
  check('D14) un mundo que llega cuando su reserva ya estaba devuelta: «ya estaba», la fila lleva su coste (el proveedor trabajó) y CERO Credits cobrados',
    r9.desenlace === 'ya_estaba' && f9.status === 'COMPLETED' && cerca(f9.providerCost, TARIFA) && f9.creditsCharged === 0);
});

/* ═══ E · DE PUNTA A PUNTA CON EL MOTOR DE TRABAJOS ════════════════════════ */
console.log('\n── E · Aceptado → el proveedor contesta → el barrido liquida ──');
await seccion('E', async () => {
  const EVA = 'costeEva0001';
  await cuenta(EVA);
  const motor = crearJobEngine();
  let reloj = T0 + MIN;
  const jobs = new Map();
  const liquidados = new Set();
  const guiones = new Map();
  const materiales = new Map();
  const resolutor = {
    async consultar(ref) {
      const guion = guiones.get(ref.operationId) ?? [];
      const paso = guion.length > 1 ? guion.shift() : guion[0];
      if (!paso) return { conocido: false, motivo: 'no_contesta' };
      return { conocido: true, aviso: { providerId: 'fal', operationId: ref.operationId, ...paso } };
    },
  };
  const deps = {
    trabajos: {
      async porReferenciaDeProveedor(providerId, operationId) {
        const clave = claveDeOperacion(providerId, operationId);
        const encontrados = [...jobs.values()].filter((j) => clave && clavesDeOperacionDe(j).includes(clave));
        if (encontrados.length !== 1) return { ok: false, motivo: encontrados.length ? 'ambigua' : 'no_encontrada' };
        const i = intentoDeLaOperacion(encontrados[0], { providerId, operationId });
        return i ? { ok: true, job: encontrados[0], intento: i } : { ok: false, motivo: 'intento_no_encontrado' };
      },
      async recuperables() { return { jobs: [...jobs.values()] }; },
      async porLiquidar() { return { jobs: [...jobs.values()].filter((j) => !liquidados.has(j.jobId)) }; },
      async marcarLiquidado(jobId) { liquidados.add(jobId); },
    },
    motor,
    almacen: {
      async aplicar(t) {
        const actual = jobs.get(t.jobId);
        if (!actual || actual.revision !== t.expectedRevision) return { applied: false, job: actual };
        jobs.set(t.jobId, t.job);
        return { applied: true, job: t.job };
      },
    },
    materializar: { async guardar(p) { const ya = materiales.has(p.assetId); materiales.set(p.assetId, p); return { ok: true, assetId: p.assetId, yaEstaba: ya }; } },
    ahora: () => reloj,
    derechosDe: (job) => derechosDeImplementacion(job.implementation),
    nombreDe: (job) => job.input?.descripcion,
    resolutores: { fal: resolutor },
    plazos: P.PLAZOS_DE_MUNDO,
    plazosDe: (job) => P.plazosDeLaCapacidad(job.capability),
    quietoDesdeMs: 0,
  };
  const L = liquidacion();
  const pasada = async () => {
    await reconciliarTrabajos(deps);
    return barrerLiquidaciones({ trabajos: deps.trabajos, liquidacion: L, ahora: deps.ahora });
  };
  const EN_MARCHA = { providerStatus: 'IN_PROGRESS', desenlace: 'en_marcha' };
  const TERMINADO = { providerStatus: 'OK', desenlace: 'terminado', recurso: 'https://v3.fal.media/files/m/world.bin' };
  const FALLADO = { providerStatus: 'ERROR_422', desenlace: 'fallado', motivo: 'fal respondió 422' };

  /* Un mundo que sale, con el motor de verdad: dos pasadas «en marcha» y una «terminado». */
  await reservarYAceptar(EVA, 'costes-e1');
  jobs.set('job-costes-e1', trabajo(EVA, 'costes-e1', { state: 'waiting', outcome: 'unknown', updatedAt: T0 + 30_000, endedAt: T0 + 30_000 }));
  guiones.set(tareaDe('costes-e1'), [EN_MARCHA, EN_MARCHA, TERMINADO]);
  const antes = { ...delMundo() };
  await pasada(); reloj += 5 * MIN;
  const enMarcha = { estado: jobs.get('job-costes-e1').state, fila: fila('costes-e1').status, tx: transaccion('costes-e1').status };
  await pasada(); reloj += 5 * MIN;
  const informe = await pasada();
  const f1 = fila('costes-e1'); const d1 = delMundo();
  check('E1) mientras el proveedor trabaja, nada se cierra: el trabajo espera, la fila sigue en curso y la reserva retenida',
    enMarcha.estado === 'waiting' && enMarcha.fila === 'PROCESSING' && enMarcha.tx === 'AUTHORIZED', JSON.stringify(enMarcha));
  check('E2) cuando termina, el barrido lo trae a casa, COBRA una vez y cierra la fila con su tarifa: el coste llega al libro y al día',
    jobs.get('job-costes-e1').state === 'completed' && materiales.size === 1 && transaccion('costes-e1').status === 'COMPLETED' && informe.liquidados === 1
    && f1.status === 'COMPLETED' && cerca(f1.providerCost, TARIFA) && f1.creditsCharged === PRECIO && d1.calls - (antes.calls ?? 0) === 1 && cerca(d1.usd - (antes.usd ?? 0), TARIFA),
    JSON.stringify({ s: jobs.get('job-costes-e1').state, f: [f1.status, f1.providerCost, f1.creditsCharged], informe: { l: informe.liquidados, f: informe.fallos } }));
  const foto = dinero();
  const tarde = await atenderAviso(deps, { providerId: 'fal', operationId: tareaDe('costes-e1'), ...TERMINADO });
  const repetido = await atenderAviso(deps, { providerId: 'fal', operationId: tareaDe('costes-e1'), ...FALLADO });
  liquidados.delete('job-costes-e1');
  await pasada(); await pasada();
  check('E3) un aviso TARDÍO y otro REPETIDO (o contradictorio), y dos pasadas más con el trabajo otra vez a la vista: «repetido», y ni dinero, ni libro, ni día se mueven',
    tarde.estado === 'repetido' && repetido.estado === 'repetido' && dinero() === foto && materiales.size === 1);

  /* El proveedor falla después de aceptarlo. */
  await reservarYAceptar(EVA, 'costes-e2');
  jobs.set('job-costes-e2', trabajo(EVA, 'costes-e2', { state: 'waiting', outcome: 'unknown', updatedAt: T0 + 30_000, endedAt: T0 + 30_000 }));
  guiones.set(tareaDe('costes-e2'), [FALLADO]);
  const antes2 = { ...delMundo() };
  await pasada(); await pasada();
  const f2 = fila('costes-e2');
  check('E4) falla después de aceptarlo: la reserva y el hueco vuelven UNA vez aunque pasen dos barridos, y la fila queda fallida con su coste «en riesgo»',
    jobs.get('job-costes-e2').state === 'failed' && transaccion('costes-e2').status === 'REFUNDED' && reembolsos('costes-e2').length === 1 && hueco(EVA, 'costes-e2') === 'devuelta'
    && f2.status === 'FAILED' && f2.providerCostStatus === 'desconocido' && cerca(delMundo().usdEnRiesgo - (antes2.usdEnRiesgo ?? 0), TARIFA) && f2.creditsCharged === 0);

  /* Un aviso PERDIDO: nadie avisa y el proveedor no contesta. Ni se cierra la fila ni se mueve el dinero. */
  await reservarYAceptar(EVA, 'costes-e3');
  jobs.set('job-costes-e3', trabajo(EVA, 'costes-e3', { state: 'waiting', outcome: 'unknown', updatedAt: T0 + 30_000, endedAt: T0 + 30_000 }));
  await pasada();
  check('E5) aviso perdido y proveedor mudo: el trabajo sigue esperando, la fila en curso, la reserva retenida y el hueco ocupado —no saber no es haber fallado—',
    jobs.get('job-costes-e3').state === 'waiting' && fila('costes-e3').status === 'PROCESSING' && transaccion('costes-e3').status === 'AUTHORIZED' && hueco(EVA, 'costes-e3') === true);
  guiones.set(tareaDe('costes-e3'), [TERMINADO]);
  await pasada();
  check('E6) y cuando la reconciliación por fin oye el final, se liquida como cualquier otro: un cobro, una fila cerrada',
    jobs.get('job-costes-e3').state === 'completed' && transaccion('costes-e3').status === 'COMPLETED' && fila('costes-e3').status === 'COMPLETED' && fila('costes-e3').creditsCharged === PRECIO);
});

/* ═══ F · LA IDENTIDAD DE LA OPERACIÓN ═════════════════════════════════════ */
console.log('\n── F · `world.generate#<requestId>`: un requestId de otra capacidad no pasa ──');
await seccion('F', async () => {
  const FEDE = 'costeFede001';
  await cuenta(FEDE);
  check('F1) un requestId no puede llevar «#»: nadie construye a mano la operación de un mundo, ni la de otra capacidad',
    ['world.generate#abc1', 'video.generate#abc1', 'a#bcd', '#abcd'].every((r) => { try { assertRequestId(r); return false; } catch { return true; } }) && assertRequestId('abcd-1234') === 'abcd-1234');
  /* El vídeo cuenta su hueco con el requestId a secas; el mundo, con su nombre propio: no se pisan. */
  await limiter.reserve(FEDE, { video: 1 }, DEFAULT_LIMITS, 'compartido-1', DIA);
  await limiter.reserve(FEDE, MUNDO, DEFAULT_LIMITS, operacionDelCupo('compartido-1'), DIA);
  const delDia = base.leer(`aiRateLimits/${FEDE}_${DIA}`);
  await limiter.liberar(FEDE, operacionDelCupo('compartido-1'), DIA);
  const trasLiberar = base.leer(`aiRateLimits/${FEDE}_${DIA}`);
  check('F2) el MISMO requestId en un vídeo y en un mundo son dos operaciones del cupo: devolver la del mundo no toca la del vídeo',
    delDia.video === 1 && delDia['3d'] === 1 && trasLiberar.video === 1 && trasLiberar['3d'] === 0
    && trasLiberar.operaciones[claveDelCupo('compartido-1')] === true && trasLiberar.operaciones[claveDelCupo(operacionDelCupo('compartido-1'))] === 'devuelta');
  await creditEngine.spendCredits({ userId: FEDE, service: 'ai_video', amount: 75, requestId: 'compartido-2', source: 'weë-studio' });
  const prestado = await lanza(() => creditEngine.spendCredits({ userId: FEDE, service: 'ai_world', amount: PRECIO, requestId: 'compartido-2', source: 'weë-studio', fingerprint: 'f'.repeat(64) }));
  check('F3) un requestId que ya es de un VÍDEO no reserva un mundo: el Credit Engine lo rechaza (otra operación) sin tocar el saldo',
    prestado?.code === 'INVALID_REQUEST' && prestado?.details?.reason === 'idempotency_conflict' && saldo(FEDE) === SALDO - 75 && transaccion('compartido-2').service === 'ai_video');
  const deTexto = await lanza(() => creditEngine.spendCredits({ userId: FEDE, service: 'ai_world', amount: PRECIO, requestId: 'brain_mensaje-1', source: 'weë-studio' })
    .then(() => creditEngine.spendCredits({ userId: FEDE, service: 'ai_brain', amount: 1, requestId: 'brain_mensaje-1', source: 'weë-brain' })));
  check('F4) y al revés: el de un mundo no paga una respuesta de Weë Brain', deTexto?.code === 'INVALID_REQUEST' && deTexto?.details?.reason === 'idempotency_conflict');
  const reintentos = await Promise.all([1, 2, 3].map(() => creditEngine.spendCredits({ userId: FEDE, service: 'ai_world', amount: PRECIO, requestId: 'costes-f5', source: 'weë-studio', fingerprint: 'a'.repeat(64) })));
  await Promise.all([1, 2, 3].map(() => limiter.reserve(FEDE, MUNDO, DEFAULT_LIMITS, operacionDelCupo('costes-f5'), DIA)));
  check('F5) el mismo requestId tres veces (un doble toque, un reintento): UNA reserva, UNA vez el saldo, UN hueco',
    reintentos.filter((r) => !r.duplicate).length === 1 && base.de('creditTransactions').filter((t) => t.requestId === 'costes-f5' && t.type !== 'refund').length === 1
    && base.leer(`aiRateLimits/${FEDE}_${DIA}`)['3d'] === 1);
  const puerta = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('F6) la puerta del mundo solo reconoce lo suyo: el trabajo, por su capacidad; la reserva, por su servicio y su cuenta; el hueco, por su nombre propio',
    /return job && job\.capability === CAPACIDAD_DEL_CANARY \? job : null;/.test(puerta)
    && /reserva\.userId !== uid \|\| reserva\.service !== SERVICIO_DEL_MUNDO/.test(puerta)
    && /snap\.exists && snap\.data\(\)\?\.userId === uid/.test(puerta)
    && /const operacionDelCupo = \(requestId: string\): string => `\$\{CAPACIDAD_DEL_CANARY\}#\$\{requestId\}`;/.test(puerta));
  check('F7) y la fila del libro, por su transacción y su tarea: un trabajo de otra capacidad con el mismo requestId no cierra la fila de un mundo',
    (await firestoreLedger.closeAccepted({ creditTransactionId: 'usage_costes-f5', cierres: [{ providerTaskId: 'una-tarea-de-video', status: 'COMPLETED', coste: 'exacto', durationMs: 1 }] })).cerradas === 0);
});

/* ═══ G · SEGURIDAD ════════════════════════════════════════════════════════ */
console.log('\n── G · Cuentas aisladas, ninguna clave en el cliente, ningún proveedor hacia la app ──');
await seccion('G', async () => {
  const LIQ = sinComentarios(leer('functions/src/runtime/index.ts'));
  const cuerpo = LIQ.slice(LIQ.indexOf('export const liquidacionDeWee'), LIQ.indexOf('export const barridoDeLiquidacionDeWee'));
  check('G1) la liquidación mueve el dinero y el hueco de la cuenta DUEÑA del trabajo (la que guardó el Job Engine), nunca de otra',
    /deps\.liquidacion\.liquidar\(\{ userId: job\.owner\.userId,/.test(leer('functions/src/runtime/barrendero.ts'))
    && /deps\.liquidacion\.reembolsar\(\{ userId: job\.owner\.userId,/.test(leer('functions/src/runtime/barrendero.ts'))
    && /cupo\.liberar\(userId, hueco\.operacion, hueco\.dia\)/.test(cuerpo));
  check('G2) y el libro solo cierra filas de SU transacción: `closeAccepted` consulta por `creditTransactionId` y comprueba la tarea dentro de la transacción',
    /where\('creditTransactionId', '==', creditTransactionId\)/.test(sinComentarios(leer('functions/src/engine/ledger.ts')))
    && /record\.status !== 'PROCESSING' \|\| record\.providerTaskId !== cierre\.providerTaskId/.test(sinComentarios(leer('functions/src/engine/ledger.ts'))));
  const CLIENTE = ['services', 'screens', 'components', 'hooks', 'utils', 'contexts', 'constants'].flatMap((d) => {
    const raiz = path.join(RAIZ, d);
    const recorrer = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((x) => recorrer(path.join(p, x))) : [p];
    return fs.existsSync(raiz) ? recorrer(raiz).filter((f) => /\.(t|j)sx?$/.test(f)) : [];
  });
  check('G3) ninguna clave de proveedor en el cliente: ni FAL_KEY ni ninguna otra en el código de la app',
    CLIENTE.length > 50 && CLIENTE.every((f) => !/FAL_KEY|ARK_API_KEY|GEMINI_API_KEY|ELEVENLABS_API_KEY|fal\.run|queue\.fal\.run/.test(fs.readFileSync(f, 'utf8'))), `${CLIENTE.length} archivos`);
  const MUNDO_SRC = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('G4) lo que la puerta del mundo contesta no lleva proveedor, modelo, tarea ni coste: el libro es del servidor',
    !/providerTaskId|providerCost|estimatedUsd: p\.usd,\s*\}\s*;|provider:|modelId:/.test(MUNDO_SRC.slice(MUNDO_SRC.indexOf('export const generateWorld')).replace(/ruteo: \{[^}]*\}/g, '').replace(/contabilidad: \{[\s\S]*?\},/g, ''))
    && /match \/aiGenerations\/\{generationId\} \{[\s\S]*?allow write: if false;/.test(leer('firestore.rules')));
});

/* ═══ H · LO QUE SIGUE APAGADO ═════════════════════════════════════════════ */
console.log('\n── H · Nada se activó ──');
await seccion('H', async () => {
  check('H1) Hunyuan World sigue APAGADO y en revisión, sin bloqueo global: restringido por territorio (UE, Reino Unido, Corea del Sur)',
    HW.gobierno.active === 'DISABLED' && HW.gobierno.reviewStatus === 'REVIEW_REQUIRED' && HW.gobierno.reviewStatus !== 'BLOCKED_GLOBAL'
    && iguales([...HW.territorio.bloqueadas].sort(), ['EU', 'GB', 'KR']) && HW.territorio.resto === 'APPROVED');
  const MUNDO_SRC = leer('functions/src/creator/mundo.ts');
  const montan = fs.readdirSync(path.join(RAIZ, 'functions/src')).flatMap((d) => {
    const recorrer = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((x) => recorrer(path.join(p, x))) : [p];
    return recorrer(path.join(RAIZ, 'functions/src', d)).filter((f) => f.endsWith('.ts') && !f.endsWith('secrets.ts') && /FAL_SECRETS|FAL_SECRET_REFS/.test(fs.readFileSync(f, 'utf8')));
  });
  check('H2) la clave de fal sigue DORMIDA: declarada y sin montar en ninguna función; `generateWorld` sin `secrets`',
    /export const generateWorld = onCall\(\{ region: 'us-central1', timeoutSeconds: PLAZO_DE_LA_PUERTA_MS \/ 1000, memory: '512MiB' \}/.test(MUNDO_SRC)
    && montan.length === 0 && /Hoy no la usa ninguna/.test(leer('functions/src/secrets.ts')), montan.join(', '));
  check('H3) la experiencia sigue fuera de la app', /export const MUNDO_3D_EN_LA_APP = false;/.test(leer('constants/studioExperiences.ts')));
  check('H4) tres canaries y ninguno más: text.generate, video.generate y world.generate, cada uno en su archivo',
    ['brain.ts', 'video.ts', 'mundo.ts'].every((f) => /const CAPACIDAD_DEL_CANARY: CapabilityId = '/.test(leer(`functions/src/creator/${f}`)))
    && fs.readdirSync(path.join(RAIZ, 'functions/src')).filter((d) => !d.includes('.')).flatMap((d) => {
      const recorrer = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((x) => recorrer(path.join(p, x))) : [p];
      return recorrer(path.join(RAIZ, 'functions/src', d)).filter((f) => f.endsWith('.ts') && /const CAPACIDAD_DEL_CANARY/.test(fs.readFileSync(f, 'utf8')));
    }).length === 3);
  check('H5) ni una Function nueva: el cierre del coste vive en el barrido que ya está desplegado, no en otra',
    !/closeAccepted|cerrarLoAceptado|desenlacesDeLasAceptadas/.test(leer('functions/src/index.ts')));
  check('H6) esta suite está en la cadena de `npm test`', /mundo3d-costes\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
