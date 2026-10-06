/**
 * FASE 5 · UN MUNDO NO DEPENDE DE UNA LLAMADA ABIERTA (misión «cerrar los gaps de world.generate», 2026-10-05).
 *
 *   petición → trabajo → ejecución asíncrona → estado → final → resultado → material
 *
 * Con el Job Engine de verdad, la reconciliación de verdad, la parada de verdad y la liquidación de verdad, sobre un
 * almacén en memoria, un proveedor de mentira y un Credit Engine de mentira que se porta como el de verdad (idempotente
 * por petición). Sin red, sin Firebase, sin proveedor real. $0.
 *
 *   A · Los relojes: coherentes y escritos (envío ≪ proveedor < trabajo ≤ horizonte), y la puerta que no espera.
 *   B · La operación del proveedor se encuentra: su nombre no lleva «/» (la clave del runtime no las admite).
 *   C · El ciclo: trabajo lento · el proveedor falla o se agota · termina después de que la app se cansara · aviso
 *       tardío · reintento · cancelación (y su carrera con el final bueno) · reconciliación y parada por plazo.
 *   D · El dinero: una reserva, un cobro o una devolución — nunca dos — por avisos repetidos, reconciliaciones,
 *       sondeos o pasadas a la vez.
 *   E · La jurisdicción llega al Core: el ejecutor y la política la usan; el catálogo da por usable lo aprobado en
 *       alguna parte; la modalidad de un mundo es 3D.
 *   F · La puerta: candado de una capacidad, ninguna clave montada, la jurisdicción del servidor, sin proveedores.
 *
 * La puerta de verdad contra Firestore y Storage la recorre `mundo3d.emulator.mjs`.
 *
 *   node functions/test/mundo3d-asincrono.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
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
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const P = lib('runtime/plazos.js');
const { claveDeOperacion, clavesDeOperacionDe, intentoDeLaOperacion } = lib('runtime/proveedor.js');
const { atenderAviso } = lib('runtime/atencion.js');
const { reconciliarUno, reconciliarTrabajos } = lib('runtime/reconciliador.js');
const { decidirReconciliacion } = lib('runtime/reconciliacion.js');
const { pedirParada } = lib('runtime/parada.js');
const { decidirLiquidacion } = lib('runtime/liquidacion.js');
const { barrerLiquidaciones } = lib('runtime/barrendero.js');
const { politicaPorReglas, politicaConJurisdicciones } = lib('runtime/politica.js');
const { crearJobEngine, POLITICA_DE_TRABAJO } = lib('core/job.js');
const { modalidadDe } = lib('core/capability.js');
const { estadoDeMundoDelTrabajo } = lib('core/mundo3d.js');
const { FORMA_DE_ETIQUETA_DE_TRAZA } = lib('core/gateway.js');
const F = lib('engine/providers/fal.js');
const { HUNYUAN_WORLD_IMAGEN_A_MUNDO: HW } = lib('engine/providers/fal-modelos.js');
const { derechosDeImplementacion } = lib('engine/derechos.js');
const runtime = lib('runtime/index.js');

const motor = crearJobEngine();
const T0 = 1_700_000_000_000;
const MIN = 60_000;
const ANA = 'uAna';
const OP = F.nombreDeOperacion(HW.gobierno.providerModelId, 'req-mundo-1');

/* ═══ A · LOS RELOJES ══════════════════════════════════════════════════════ */
console.log('\n── A · Relojes coherentes y escritos ──');
{
  const M = P.PLAZOS_DE_MUNDO;
  check('A1) los relojes del mundo se sostienen (`revisarPlazos` no encuentra ninguna forma de perder dinero o resultados)', iguales(P.revisarPlazos(M), []), JSON.stringify(P.revisarPlazos(M)));
  check('A2) y su orden es el de la regla: envío (30 s) ≪ concesión (1 min) ≪ proveedor (30 min) < trabajo (45 min) ≤ horizonte (24 h); el enlace, 1 h',
    M.envioMs === 30_000 && M.concesionMs === MIN && M.vidaEnElProveedorMs === 30 * MIN && M.vidaDelTrabajoMs === 45 * MIN
    && M.horizonteDeReconciliacionMs === 24 * 60 * MIN && M.vidaDeLaUrlMs === 60 * MIN
    && M.envioMs < M.vidaEnElProveedorMs && M.vidaEnElProveedorMs < M.vidaDelTrabajoMs && M.vidaDelTrabajoMs <= M.horizonteDeReconciliacionMs);
  check('A3) cada capacidad asíncrona con SUS relojes; las demás, los de quien pregunte',
    P.plazosDeLaCapacidad('world.generate') === M && P.plazosDeLaCapacidad('video.generate') === P.PLAZOS_DE_VIDEO && P.plazosDeLaCapacidad('text.generate') === undefined);
  const puerta = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('A4) la llamada de la app solo ENVÍA: 120 s de función, el proveedor acepta y suelta, y el trabajo vive sus 45 min aparte (nada de 900 s esperando)',
    /PLAZO_DE_LA_PUERTA_MS = 120_000/.test(puerta) && /ACEPTA_ASINCRONO = true/.test(puerta)
    && /deadlineAt: Date\.now\(\) \+ PLAZOS_DE_MUNDO\.vidaDelTrabajoMs/.test(puerta) && !/timeoutMs:/.test(puerta) && !/creatorRun|855|900_000/.test(puerta));
  check('A5) UN intento: un fallo del proveedor es final (reintentar sería otra generación y otro coste)',
    /maxAttempts: 1/.test(puerta) && /politicaDe\(PLAZOS_DE_MUNDO/.test(puerta));
}

/* ═══ B · LA OPERACIÓN SE ENCUENTRA ════════════════════════════════════════ */
console.log('\n── B · El nombre de la operación del proveedor ──');
{
  check('B1) sin «/»: el modelo se escribe con «:» y la clave del runtime existe (antes: undefined, y ningún aviso encontraba su trabajo)',
    !OP.includes('/') && OP === 'fal-ai:hunyuan_world:image-to-world::req-mundo-1' && claveDeOperacion('fal', OP) === `fal:${OP}`
    && FORMA_DE_ETIQUETA_DE_TRAZA.test(OP)
    && claveDeOperacion('fal', `${HW.gobierno.providerModelId}::req-mundo-1`) === undefined);
  check('B2) y se lee de vuelta sin ambigüedad (el «:» no es de un id de modelo); un nombre con «/» o forjado no se lee',
    iguales(F.leerOperacion(OP), { modelo: HW.gobierno.providerModelId, requestId: 'req-mundo-1' })
    && F.leerOperacion(`${HW.gobierno.providerModelId}::req-mundo-1`) === undefined && F.leerOperacion('fal-ai:x:../y::r') === undefined
    && F.leerOperacion('fal-ai:hunyuan_world::r::extra') === undefined
    && F.leerOperacion('fal-ai:hunyuan_world:::r') === undefined && F.leerOperacion('fal-ai~hunyuan_world::r') === undefined);
  const aviso = F.leerAvisoDeFal({ request_id: 'req-mundo-1', status: 'IN_PROGRESS' }, HW.gobierno.providerModelId);
  check('B3) un aviso de fal compone el MISMO nombre que se guardó al aceptar', aviso?.operationId === OP);
}

/* ═══ C · EL CICLO ═════════════════════════════════════════════════════════ */
console.log('\n── C · El ciclo de un mundo, con el motor de verdad ──');

const intento = (o = {}) => ({
  attemptId: 'jw#1', number: 1, startedAt: o.startedAt ?? T0, dispatched: true, providerKey: 'k1',
  outcome: o.outcome ?? 'unknown', providerRef: o.providerRef === null ? undefined : { providerId: 'fal', operationId: OP },
});
const trabajo = (o = {}) => ({
  contract: '1.0', jobId: o.jobId ?? 'jw', revision: 1, state: o.state ?? 'waiting', owner: { userId: ANA }, context: { operationId: 'op' },
  capability: o.capability ?? 'world.generate', implementation: { providerId: 'fal', modelId: HW.id, adapterId: 'adapter:fal' },
  input: { modo: 'desde_imagen', descripcion: 'Una plaza medieval' },
  trace: { traceId: 'req-mundo-1', requestId: 'req-mundo-1', userId: ANA, runId: 'run_req-mundo-1', stepId: 'crear' },
  metadata: { creditTransactionId: 'usage_req-mundo-1', creditRequestId: 'req-mundo-1', creditsEstimated: 39, service: 'ai_world' },
  mode: 'sync', policy: P.politicaDe(P.PLAZOS_DE_MUNDO, { ...POLITICA_DE_TRABAJO, retry: { ...POLITICA_DE_TRABAJO.retry, maxAttempts: 1 } }),
  idempotency: { key: 'k', scope: 's', fingerprint: 'f' },
  createdAt: T0, updatedAt: T0, deadlineAt: T0 + 45 * MIN, availableAt: T0,
  attempts: o.attempts ?? [intento(o)], attemptCount: 1, seenEvents: [],
});

/** Un mundo de mentira alrededor del motor de verdad: almacén con CAS, proveedor guionizado, materializador y Credits. */
const mundo = (o = {}) => {
  let reloj = o.ahora ?? T0 + MIN;
  const jobs = new Map((o.jobs ?? [trabajo(o)]).map((j) => [j.jobId, j]));
  const guion = [...(o.guion ?? [])];
  const llamadas = { consultar: 0, cancelar: 0, materializaciones: 0 };
  const materiales = new Map();
  const liquidados = new Set();
  const resolutor = {
    async consultar(ref) {
      llamadas.consultar++;
      const paso = guion.length > 1 ? guion.shift() : guion[0];
      if (!paso) return { conocido: false, motivo: 'no_contesta' };
      if (paso.conocido === false) return paso;
      return { conocido: true, aviso: { providerId: 'fal', operationId: ref.operationId, ...paso } };
    },
    ...(o.sinCancelar ? {} : { async cancelar() { llamadas.cancelar++; return o.respuestaAParar ?? 'pedida'; } }),
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
      /* Como el almacén de verdad: lo ya liquidado no se vuelve a ofrecer. */
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
    materializar: {
      async guardar(p) {
        llamadas.materializaciones++;
        const yaEstaba = materiales.has(p.assetId);
        materiales.set(p.assetId, p);
        return { ok: true, assetId: p.assetId, yaEstaba };
      },
    },
    ahora: () => reloj,
    derechosDe: (job) => derechosDeImplementacion(job.implementation),
    nombreDe: (job) => job.input?.descripcion,
    resolutores: { fal: resolutor },
    plazos: P.PLAZOS_DE_VIDEO,
    plazosDe: (job) => P.plazosDeLaCapacidad(job.capability),
    quietoDesdeMs: 0,
  };
  /* El Credit Engine, de mentira y con su regla: solo una transición desde AUTHORIZED; lo demás contesta lo que hay. */
  const reservas = new Map([['req-mundo-1', 'AUTHORIZED']]);
  const dinero = { cobros: 0, devoluciones: 0 };
  const liquidacion = {
    async liquidar({ reserva }) {
      const estado = reservas.get(reserva.requestId);
      if (estado !== 'AUTHORIZED') return { desenlace: 'ya_estaba', estado };
      reservas.set(reserva.requestId, 'COMPLETED'); dinero.cobros++;
      return { desenlace: 'liquidada', estado: 'COMPLETED' };
    },
    async reembolsar({ reserva }) {
      const estado = reservas.get(reserva.requestId);
      if (estado !== 'AUTHORIZED') return { desenlace: 'ya_estaba', estado };
      reservas.set(reserva.requestId, 'REFUNDED'); dinero.devoluciones++;
      return { desenlace: 'reembolsada', estado: 'REFUNDED' };
    },
  };
  const pasada = async () => {
    await reconciliarTrabajos(deps);
    await barrerLiquidaciones({ trabajos: deps.trabajos, liquidacion, ahora: deps.ahora });
  };
  return {
    deps, jobs, llamadas, materiales, reservas, dinero, pasada,
    job: (id = 'jw') => jobs.get(id),
    avanzar: (ms) => { reloj += ms; },
    paradaDeps: () => ({ motor, almacen: deps.almacen, resolutores: deps.resolutores, ahora: deps.ahora }),
  };
};
const EN_MARCHA = { providerStatus: 'IN_PROGRESS', desenlace: 'en_marcha' };
const TERMINADO = { providerStatus: 'OK', desenlace: 'terminado', recurso: 'https://v3.fal.media/files/m/world.bin' };
const FALLADO = { providerStatus: 'ERROR_422', desenlace: 'fallado', motivo: 'fal respondió 422' };

{
  /* C1 · trabajo LENTO: el proveedor sigue y sigue. Nadie se impacienta y el dinero no se toca. */
  const m = mundo({ guion: [EN_MARCHA] });
  for (let i = 0; i < 5; i++) { await m.pasada(); m.avanzar(5 * MIN); }
  check('C1) trabajo lento: cinco pasadas en 20 minutos preguntan, oyen «en marcha» y NO cierran, NO materializan y NO tocan el dinero',
    m.llamadas.consultar === 5 && m.job().state === 'waiting' && m.llamadas.materializaciones === 0 && m.dinero.cobros === 0 && m.dinero.devoluciones === 0
    && decidirLiquidacion(m.job(), T0 + 21 * MIN).tipo === 'esperar' && estadoDeMundoDelTrabajo(m.job().state) === 'generando',
    JSON.stringify({ c: m.llamadas, s: m.job().state }));
}
{
  /* C2 · el proveedor FALLA (también si su propia app se agota): final, y se devuelve exacto, una vez. */
  const m = mundo({ guion: [FALLADO] });
  await m.pasada(); await m.pasada();
  check('C2) el proveedor falla o se agota: el trabajo queda fallido, sin material, y la reserva se DEVUELVE una sola vez aunque pasen dos barridos',
    m.job().state === 'failed' && m.llamadas.materializaciones === 0 && m.dinero.devoluciones === 1 && m.dinero.cobros === 0 && m.reservas.get('req-mundo-1') === 'REFUNDED'
    && estadoDeMundoDelTrabajo(m.job().state) === 'fallido');
}
{
  /* C3 · termina DESPUÉS de que la app se cansara de esperar: no hay nadie al otro lado y no hace falta. */
  const m = mundo({ guion: [EN_MARCHA, EN_MARCHA, { ...TERMINADO, variantes: [{ kind: 'preview', recurso: 'https://v3.fal.media/files/m/vista.png' }] }] });
  for (let i = 0; i < 3; i++) { await m.pasada(); m.avanzar(5 * MIN); }
  const [material] = [...m.materiales.values()];
  check('C3) termina con la app cerrada: el barrido lo trae a casa —un MUNDO, con los derechos de su modelo, su vista previa y el nombre que le puso la persona— y cobra UNA vez',
    m.job().state === 'completed' && m.llamadas.materializaciones === 1 && material?.kind === 'world'
    && iguales(material.derechos?.jurisdiccionesBloqueadas, ['EU', 'GB', 'KR']) && material.variantes?.[0]?.kind === 'preview' && material.nombre === 'Una plaza medieval'
    && m.dinero.cobros === 1 && m.dinero.devoluciones === 0 && iguales(m.job().result?.outputRefs, [material.assetId]),
    JSON.stringify({ s: m.job().state, mat: material && { kind: material.kind, nombre: material.nombre }, d: m.dinero }));

  /* C4 · el aviso TARDÍO: el webhook del final bueno llega después de la reconciliación, y uno de error, más tarde aún. */
  const tarde = await atenderAviso(m.deps, { providerId: 'fal', operationId: OP, ...TERMINADO });
  const peor = await atenderAviso(m.deps, { providerId: 'fal', operationId: OP, ...FALLADO });
  await m.pasada();
  check('C4) un aviso tardío —el mismo final, o un error que llega después— se contesta «repetido»: ni otro material, ni otro cobro, ni se desentierra el trabajo',
    tarde.estado === 'repetido' && peor.estado === 'repetido' && m.job().state === 'completed' && m.llamadas.materializaciones === 1 && m.dinero.cobros === 1);
}
{
  /* C5 · reintento: UN intento. El motor no vuelve a pedirle al proveedor lo que falló. */
  const m = mundo({ guion: [FALLADO] });
  await m.pasada();
  const otro = motor.despachar(m.job());
  check('C5) reintentar no es otro POST: con un intento, el fallo es final (un intento guardado) y el trabajo ya no se puede despachar',
    m.job().state === 'failed' && m.job().attempts.length === 1 && m.job().policy.retry.maxAttempts === 1 && otro.status !== 'transition');
}
{
  /* C6 · CANCELAR. a) mientras el proveedor la tiene: se PIDE parar, y su final decide. */
  const m = mundo({ guion: [FALLADO] });
  const parada = await pedirParada(m.paradaDeps(), m.job(), { userId: ANA });
  const pedida = m.job().state;
  await m.pasada();
  check('C6) cancelar mientras el proveedor lo tiene: el Job Engine pasa a «cancelando» y se le pide parar al proveedor; su fallo posterior CONSUMA la parada y la reserva se devuelve',
    parada.estado === 'pedida' && parada.proveedor === 'pedida' && pedida === 'cancel_requested' && estadoDeMundoDelTrabajo(pedida) === 'cancelando'
    && m.llamadas.cancelar === 1 && m.job().state === 'cancelled' && m.dinero.devoluciones === 1 && m.dinero.cobros === 0);

  /* b) la carrera: se pidió parar y el mundo llegó antes. Gana el final: existe, es de la persona y se cobra. */
  const r = mundo({ guion: [TERMINADO] });
  await pedirParada(r.paradaDeps(), r.job(), { userId: ANA });
  await r.pasada();
  check('C7) la carrera: pedir parar y que el mundo llegue antes → gana el final (se materializa y se cobra una vez); «cancelar» no tira lo que ya costó',
    r.job().state === 'completed' && r.llamadas.materializaciones === 1 && r.dinero.cobros === 1 && r.dinero.devoluciones === 0);

  /* c) en la cola de Weë (sin nada enviado): la parada es inmediata y real. */
  const q = mundo({ state: 'queued', attempts: [] });
  const enCola = await pedirParada(q.paradaDeps(), q.job(), { userId: ANA });
  await q.pasada();
  check('C8) cancelar algo que aún estaba en la cola de Weë: se cancela en el acto, sin preguntar a ningún proveedor, y se devuelve',
    enCola.estado === 'cancelado' && q.job().state === 'cancelled' && q.llamadas.cancelar === 0 && q.dinero.devoluciones === 1);

  /* d) de otra persona no se puede. */
  const ajena = await pedirParada(m.paradaDeps(), mundo().job(), { userId: 'uOtra' });
  check('C9) y nadie puede parar el mundo de otra persona: el motor lo rechaza como si no existiera', ajena.estado === 'no_se_pudo');
}
{
  /* C10 · LA PARADA POR PLAZO: el proveedor no acepta que le digamos cuánto puede tardar; lo hace cumplir Weë. */
  const m = mundo({ guion: [EN_MARCHA], startedAt: T0 });
  m.avanzar(25 * MIN);
  await reconciliarUno(m.deps, m.job());
  const antes = { estado: m.job().state, cancelar: m.llamadas.cancelar };
  m.avanzar(10 * MIN);
  const visto = await reconciliarUno(m.deps, m.job());
  const tras = { estado: m.job().state, cancelar: m.llamadas.cancelar };
  m.avanzar(5 * MIN);
  await reconciliarUno(m.deps, m.job());
  check('C10) pasados los 30 min concedidos al proveedor y oyendo «en marcha», la reconciliación pide PARAR en nombre de quien lo pidió (antes no); y si sigue, se lo vuelve a pedir',
    antes.estado === 'waiting' && antes.cancelar === 0 && visto.parada === 'pedida' && tras.estado === 'cancel_requested' && tras.cancelar === 1 && m.llamadas.cancelar === 2,
    JSON.stringify({ antes, visto, tras }));
  const v = mundo({ guion: [EN_MARCHA], capability: 'video.generate', startedAt: T0, sinCancelar: true });
  v.avanzar(3 * 60 * MIN);
  const vistoVideo = await reconciliarUno(v.deps, v.job());
  check('C11) y al vídeo no le cambia nada: su proveedor ya vence la tarea él solo, su resolutor no sabe parar, y nadie le pide parada',
    !('parada' in vistoVideo) && v.job().state === 'waiting');
  const viejo = trabajo({ startedAt: T0 });
  check('C12) cada trabajo con SU horizonte: pasadas 25 h, a fal ya no se le pregunta (lo mira una persona); a un vídeo de 25 h, sí',
    decidirReconciliacion(viejo, T0 + 25 * 60 * MIN, P.PLAZOS_DE_MUNDO).tipo === 'rendirse'
    && decidirReconciliacion(trabajo({ startedAt: T0, capability: 'video.generate' }), T0 + 25 * 60 * MIN, P.PLAZOS_DE_VIDEO).tipo === 'preguntar');
}
{
  /* C13 · la reconciliación y el webhook a la vez: dos llegadas del mismo final, un material y un cobro. */
  const m = mundo({ guion: [TERMINADO] });
  await Promise.all([m.pasada(), atenderAviso(m.deps, { providerId: 'fal', operationId: OP, ...TERMINADO })]);
  await m.pasada();
  check('C13) reconciliación y webhook del mismo final a la vez: UN material (identidad calculada) y UN cobro',
    m.job().state === 'completed' && new Set([...m.materiales.keys()]).size === 1 && m.dinero.cobros === 1, JSON.stringify(m.dinero));
}

/* ═══ D · EL DINERO ════════════════════════════════════════════════════════ */
console.log('\n── D · Una reserva, un desenlace ──');
{
  const m = mundo({ guion: [TERMINADO] });
  for (let i = 0; i < 4; i++) await m.pasada();
  check('D1) cuatro barridos sobre un mundo terminado: un cobro (los demás contestan «ya estaba»)', m.dinero.cobros === 1 && m.reservas.get('req-mundo-1') === 'COMPLETED');
  const sinReserva = trabajo({ jobId: 'jx' });
  delete sinReserva.metadata.creditRequestId;
  check('D2) un trabajo sin su reserva no se liquida a ciegas', decidirLiquidacion(sinReserva, T0).tipo === 'nada');
  const puerta = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('D3) la puerta reserva con el Credit Engine de siempre, con huella (un requestId repetido solo vale para ESTE mundo), y no cobra ni devuelve un trabajo vivo',
    /creditEngine\.spendCredits\(/.test(puerta) && /fingerprint: huellaDelMundo\(p\.entrada\)/.test(puerta) && !/completeCredits/.test(puerta)
    && /if \(desenlace\.reembolsoSeguro\)/.test(puerta) && /sinReservaHuerfana\(uid, requestId/.test(puerta));
  check('D4) un requestId repetido: si ya hay trabajo, se cuenta cómo va (ni otra generación ni otro cobro); si se quedó colgado sin trabajo, se devuelve; si no, DUPLICATE',
    /if \(spend\.duplicate\)/.test(puerta) && /duplicate: true/.test(puerta) && /operacionAbandonada\(true/.test(puerta) && /new EngineError\('DUPLICATE_REQUEST'\)/.test(puerta));
}

/* ═══ E · LA JURISDICCIÓN LLEGA AL CORE ════════════════════════════════════ */
console.log('\n── E · Perfil Real → servidor → elegibilidad → política → Router ──');
{
  const regla = { id: 'r-es', source: 'prueba', effect: 'deny', capability: 'world.generate', when: { regions: ['ES'] } };
  const base = politicaPorReglas([regla]);
  const c = { capability: 'world.generate', providerId: 'fal', modelId: HW.id };
  check('E1) la política ve como región la jurisdicción que leyó el SERVIDOR: con ES niega, con US no, con US y ES niega (basta una), y sin ninguna se aplica (falla cerrado)',
    !politicaConJurisdicciones(base, ['ES']).evaluar(c).eligible && politicaConJurisdicciones(base, ['US']).evaluar(c).eligible
    && !politicaConJurisdicciones(base, ['US', 'ES']).evaluar(c).eligible && !politicaConJurisdicciones(base, undefined).evaluar(c).eligible);

  const { crearEjecutorDelMotor } = lib('engine/gateway.js');
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  const gobierno = { ...HW.gobierno, reviewStatus: 'APPROVED', active: 'ACTIVE' };
  const territorial = { ...HW, id: 'prueba/mundo', gobierno, territorio: { bloqueadas: ['EU'], aprobadas: ['US'], resto: 'REVIEW_REQUIRED', fuente: 'prueba' } };
  let corridas = 0;
  const adaptador = { id: 'terra', name: 'terra', modalities: ['3d'], models: [territorial], isConfigured: () => true, supports: () => true, async run() { corridas++; return { accepted: { operationId: 'op1' }, costUSD: 0.3, latencyMs: 1 }; } };
  const ejecutor = (jurisdiccionesDe) => crearEjecutorDelMotor({
    adapters: { terra: adaptador }, config: () => ({ providers: { terra: { enabled: true, priority: 1 } }, routing: {}, settings: DEFAULT_SETTINGS, source: 'test' }),
    aceptaAsincrono: true, ...(jurisdiccionesDe ? { jurisdiccionesDe } : {}),
  });
  const pedir = (e) => e.run({
    capability: 'world.generate', entry: { produces: '3d' }, implementation: { provider: { id: 'terra' }, model: { id: 'prueba/mundo' } },
    input: { modo: 'desde_imagen' }, trace: { traceId: 't', requestId: 'r', userId: ANA, runId: 'run', stepId: 's' }, execution: {},
  });
  const enUS = await pedir(ejecutor(async () => ['US']));
  const enES = await pedir(ejecutor(async () => ['ES']));
  const caida = await pedir(ejecutor(async () => { throw new Error('Firestore no contesta'); }));
  const sinFuente = await pedir(ejecutor());
  check('E2) el ejecutor del Core decide un modelo territorial CON la jurisdicción de la cuenta: US (aprobada) ejecuta; ES (bloqueada), la lectura caída o sin fuente → MODEL_UNAVAILABLE (falla cerrado), sin llamar a nadie más',
    enUS.ok === true && [enES, caida, sinFuente].every((r) => r.ok === false && r.error?.code === 'MODEL_UNAVAILABLE') && corridas === 1,
    JSON.stringify([enUS.ok, enES.error?.code, caida.error?.code, sinFuente.error?.code, corridas]));

  const { datosDelRegistro } = lib('registry/index.js');
  /* Con el proveedor de verdad (su ficha está verificada en documentación): lo único que cambia es el modelo. */
  const estadoDe = (modelo) => datosDelRegistro({ fal: { ...adaptador, id: 'fal', models: [{ ...modelo, provider: 'fal' }] } }, { fal: { enabled: true, priority: 1 } }).models[0].status;
  check('E3) el catálogo del Core da por usable un territorial aprobado en ALGUNA jurisdicción (cada operación lo vuelve a preguntar); el que no lo está en ninguna —Hunyuan hoy— sigue PENDING',
    estadoDe(territorial) === 'READY' && estadoDe(HW) === 'PENDING', `${estadoDe(territorial)} / ${estadoDe(HW)}`);
  check('E4) y un mundo es 3D también para el Core (el libro y los plazos por modalidad): antes, texto', modalidadDe('world.generate') === '3d');
}

/* ═══ F · LA PUERTA ════════════════════════════════════════════════════════ */
console.log('\n── F · La puerta: una capacidad, ninguna clave, la jurisdicción del servidor ──');
{
  const fuente = leer('functions/src/creator/mundo.ts');
  const puerta = sinComentarios(fuente);
  check('F1) el candado: UNA capacidad escrita en el código, la misma puerta de configuración cerrada por defecto, y sin camino síncrono (cerrada → no disponible)',
    /const CAPACIDAD_DEL_CANARY: CapabilityId = 'world\.generate';/.test(puerta) && /decidirRuntime\(await configuracionDeLaPuerta\(getFirestore\(\)\)/.test(puerta)
    && /if \(puerta\.runtime !== 'core'\) throw noDisponible\('no_disponible'\)/.test(puerta) && !/videoEngine|runCapability|engine\.generate\(/.test(puerta));
  check('F2) no monta la clave de ningún proveedor (activar uno es montarla aquí, decisión del dueño) ni nombra a ninguno',
    !/secrets\s*:/.test(puerta) && !/\bfal\b|FAL_|hunyuan|tencent|seedance/i.test(puerta));
  check('F3) la jurisdicción la lee el SERVIDOR de la cuenta (Perfil Real), una vez, y la usan el Router, el ejecutor y la política; nada del cliente la decide',
    /jurisdiccionesDeLaCuenta\(uid\)/.test(puerta) && !/data\.(jurisdic|country|pais|region|locale)/i.test(puerta)
    && /jurisdicciones: p\.jurisdicciones/.test(puerta) && /\.\.\.\(jurisdicciones\?\.length \? \{ jurisdicciones \} : \{\}\)/.test(puerta));
  check('F4) la elegibilidad y el precio, ANTES del cupo y de los Credits: un «no disponible» no mueve nada',
    puerta.indexOf('await prepararElMundo(uid, data.peticion)') < puerta.indexOf('limiter.reserve(') && puerta.indexOf('limiter.reserve(') < puerta.indexOf('creditEngine.spendCredits('));
  check('F5) la Function existe y se exporta (desplegarla es del dueño); el estado y la cancelación solo ven trabajos de la cuenta que pregunta',
    /export \{ generateWorld \} from '\.\/creator\/mundo';/.test(leer('functions/src/index.ts'))
    && /const job = await trabajoDelMedioDeWee\(getFirestore\(\), uid, requestId\);/.test(puerta)
    && /pedirParada\(paradaDeWee\(\{ db: getFirestore\(\) \}\), job, \{ userId: uid \}\)/.test(puerta));
  /* Revisión de seguridad (2026-10-06): la clave del medio (cuenta, requestId) la comparten las puertas del conductor. */
  check('F5b) …y solo trabajos de MUNDO: un vídeo del Core con el mismo requestId ni se cuenta ni se para por esta puerta; una reserva de otro servicio, tampoco',
    /return job && job\.capability === CAPACIDAD_DEL_CANARY \? job : null;/.test(puerta) && (puerta.match(/await trabajoDelMundo\(uid, requestId\)/g) || []).length === 4
    && /reserva\.service !== SERVICIO_DEL_MUNDO/.test(puerta) && /const SERVICIO_DEL_MUNDO = serviceForCapability\(CAPACIDAD_DEL_CANARY, \{\}\);/.test(puerta)
    && !/trabajoDelMedioDeWee\(db, uid, requestId\)/.test(puerta));
  check('F5c) no se pide parar MIENTRAS SE ENVÍA: el Job Engine consumaría la parada al llegar la aceptación (cualquier informe con el trabajo en cancel_requested) y la tarea seguiría viva en el proveedor',
    /if \(sePuedeCancelarElMundo\(estadoDeMundoDelTrabajo\(job\.state\)\) && job\.state !== 'running'\) \{/.test(puerta)
    && /if \(job\.state === 'cancel_requested'\) return consumarCancelacion\(job, at, attempts\);/.test(leer('functions/src/core/job.ts')));
  check('F5d) la foto de la persona, solo del cubo de ESTE proyecto y reescrita como gs://: un host o un cubo ajenos con la ruta «correcta» no hacen que el servidor la busque fuera',
    /const cubo = getStorage\(\)\.bucket\(\)\.name;/.test(puerta) && /if \(!ruta \|\| ruta\.bucket !== cubo \|\| !ruta\.path\.startsWith\(`users\/\$\{uid\}\/`\)\) \{/.test(puerta)
    && /return `gs:\/\/\$\{cubo\}\/\$\{ruta\.path\}`;/.test(puerta) && !/return peticion\.imagen\.url;/.test(puerta));
  /* Revisión de arquitectura (2026-10-06). */
  check('F5e) lo que se cobra es el modelo que se cotizó: la puerta fija la decisión del Router (proveedor y modelo) al crear, sin nombrar a ninguno',
    /ruteo: \{ modelId: p\.modelo, allowedProviders: \[p\.proveedor\] \}/.test(puerta) && /proveedor: elegido\.provider,/.test(puerta) && /modelo: elegido\.model\.id,/.test(puerta));
  check('F5f) el estado solo cuenta un material de MUNDO, y su clase sale del contrato (literal)',
    /material\.kind !== TIPO_DE_MATERIAL_DEL_MUNDO\) return/.test(puerta) && /kind: TIPO_DE_MATERIAL_DEL_MUNDO,/.test(puerta)
    && /export const TIPO_DE_MATERIAL_DEL_MUNDO = 'world' as const satisfies AssetKind;/.test(leer('functions/src/core/mundo3d.ts')));
  const rt = sinComentarios(leer('functions/src/runtime/index.ts'));
  check('F5g) la jurisdicción se lee UNA vez: la cadena del conductor usa la de la operación (la que leyó la puerta), igual que el ejecutor y la política',
    /resolutorPorCadena\(router, cadenaVivaCon\(deps\.jurisdicciones\), politicaConJurisdicciones\(/.test(rt)
    && /\.\.\.\(jurisdicciones\?\.length \? \{ jurisdicciones: \[\.\.\.jurisdicciones\] \} : \{\}\),/.test(rt));
  {
    /* Un adaptador que sabe soltar la llamada (acepta lo asíncrono) tiene que tener quien pregunte por él; y al revés. */
    const dir = path.resolve(AQUI, '../src/engine/providers');
    const asincronos = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && /acceptAsync/.test(fs.readFileSync(path.join(dir, f), 'utf8'))).map((f) => f.replace(/\.ts$/, '')).sort();
    const conResolutor = Object.keys(lib('engine/registry.js').RESOLUTORES_DE_ESTADO).sort();
    check('F5h) cada adaptador asíncrono tiene su resolutor de estado, y no hay resolutor sin adaptador asíncrono (las dos tablas no se separan)',
      iguales(asincronos, conResolutor) && asincronos.length >= 2, `${asincronos.join(',')} vs ${conResolutor.join(',')}`);
  }
  /* Revisión de código (2026-10-06). */
  check('F5i) una operación que no existe se rechaza en la frontera: no se toma por «crear», que es la que cobra',
    /if \(!OPERACIONES\.includes\(op\)\) throw new EngineError\('INVALID_REQUEST', undefined, \{ reason: 'op_desconocida' \}\);/.test(puerta) && !/: 'crear';/.test(puerta));
  check('F5j) una reserva retenida SIN trabajo pasado el plazo de la puerta se devuelve al preguntar (la app nunca repite ese requestId); antes, en cola',
    /if \(operacionAbandonada\(true, autorizadaEn \+ PLAZO_DE_LA_PUERTA_MS, Date\.now\(\)\)\) \{\s*await creditEngine\.refundCredits\(/.test(puerta)
    && /if \(reserva\.status !== 'AUTHORIZED'\) return \{ contract: MUNDO3D_CONTRACT_VERSION, requestId, estado: 'fallido' \};/.test(puerta));
  check('F5k) un reintento con el mismo requestId converge: reserva cerrada sin trabajo = cómo acabó (no «ya en marcha»); y un fallo con el trabajo YA creado se cuenta como va, no como error',
    /if \(spend\.status !== 'AUTHORIZED'\) return \{ \.\.\.\(await estadoDelMundo\(uid, requestId\)\), duplicate: true \};/.test(puerta)
    && /\} catch \(error\) \{\s*if \(await trabajoDelMundo\(uid, requestId\)\) return \{ \.\.\.\(await estadoDelMundo\(uid, requestId\)\), status: 'ACCEPTED', credits: spend\.amount, duplicate: false \};\s*throw error;/.test(puerta));
  check('F6) la reconciliación desplegada conoce a fal por el registro (sin importar el adaptador) y pregunta con los relojes de cada trabajo; sin su clave montada contesta «no configurado» y el trabajo ESPERA',
    /resolutores: deps\.resolutores \?\? RESOLUTORES_DE_ESTADO/.test(sinComentarios(leer('functions/src/runtime/index.ts')))
    && runtime && typeof runtime.paradaDeWee === 'function' && /plazosDe: deps\.plazosDe \?\? \(\(job\) => plazosDeLaCapacidad\(job\.capability\)\)/.test(leer('functions/src/runtime/index.ts')));
  check('F7) esta suite está en la cadena de `npm test`', /mundo3d-asincrono\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
