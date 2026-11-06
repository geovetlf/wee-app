/*
 * LÍNEA B · INTEGRIDAD FINANCIERA DE WEË AI — 2026-10-14.
 *
 *   node test/linea-b-finanzas.test.mjs        (usa el compilado: `npm run build` antes)
 *
 * Qué vigila, ejecutando el compilado (nada de leer el código con expresiones):
 *
 *  A. B4-03 · Lo demo no se cobra. El proveedor `mock` atiende hoy música,
 *     efectos y documentos, y en modo de precios simulado —el que rige en
 *     producción— valía el precio de catálogo. Ahora:
 *       · `creditsFor(…, demo=true)` = 0 en los dos modos y para toda modalidad;
 *       · `cobroDelTrabajo` descuenta los pasos demo de lo cotizado;
 *       · `creatorRun` de punta a punta: un trabajo todo demo liquida 0, uno mixto
 *         cobra solo lo real;
 *       · el Core: un trabajo completado por `mock` se REEMBOLSA (`resultado_demo`).
 *  B. X2 · El interruptor del vídeo (`aiSettings/global.videoHabilitado`, apagado
 *     por defecto). Con un proveedor real de vídeo configurado y el interruptor
 *     apagado, cada ruta se rechaza ANTES del cupo, de la reserva y del proveedor:
 *       · el router del motor (sin candidato real, sin demo, sin fila en el libro);
 *       · el ejecutor del Core (el conductor) antes de llamar al adaptador;
 *       · `generateVideo` (Studio y Filmmaker);
 *       · `creatorRun` con un paso de vídeo.
 *     Y encendido, todo sigue funcionando (control).
 *  C. X3 · Cierre de `creatorRun`: un reintento NO declara abandonado un trabajo
 *     cuyo proceso aún puede estar liquidando, y el cierre por abandono lo gana
 *     una sola llamada (el dinero se mueve una vez).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Ninguna petición sale de esta máquina: cualquier fetch es un fallo de la prueba. */
const fetchReal = globalThis.fetch;
let salidasALaRed = 0;
globalThis.fetch = async () => { salidasALaRed++; throw new Error('red cortada en la prueba'); };

const { DEFAULT_SETTINGS, ADAPTERS } = lib('engine/registry.js');
const { creditsFor } = lib('engine/pricing.js');
const { cobroDelTrabajo } = lib('creator/cobro.js');

/* ══ A. B4-03 · lo demo no se cobra ════════════════════════════════════════ */
console.log('\n── A · Lo demo no se cobra (B4-03) ──');
{
  const caps = [['music.generate', {}], ['audio.sfx', {}], ['doc.render', {}], ['image.generate', { prompt: 'x' }], ['text.generate', { prompt: 'x' }], ['video.generate', { durationSec: 5 }]];
  for (const modo of ['simulated', 'real']) {
    const s = { ...DEFAULT_SETTINGS, pricingMode: modo };
    const demo = caps.map(([c, i]) => creditsFor(c, 0, s, true, i));
    check(`A1) ${modo}: un resultado demo vale 0 Credits en música, sfx, documentos, imagen, texto y vídeo`, demo.every((n) => n === 0), demo.join(','));
  }
  const s = { ...DEFAULT_SETTINGS, pricingMode: 'simulated' };
  const real = caps.map(([c, i]) => creditsFor(c, 0.01, s, false, i));
  check('A2) CONTROL: el mismo resultado de un proveedor real sí tiene precio (catálogo)', real.every((n) => n > 0), real.join(','));

  check('A3) todo demo: 0', cobroDelTrabajo(30, 'simulated', [{ stepId: 'a', demo: true }, { stepId: 'b', demo: true }], { a: 10, b: 20 }) === 0);
  check('A4) mixto (simulado): lo cotizado menos lo que valían los pasos demo', cobroDelTrabajo(30, 'simulated', [{ stepId: 'a', demo: false }, { stepId: 'b', demo: true }], { a: 10, b: 20 }) === 10);
  check('A5) mixto sin desglose del demo: solo lo real conocido, nunca el demo «por si acaso»',
    cobroDelTrabajo(30, 'simulated', [{ stepId: 'a', demo: false }, { stepId: 'b', demo: true }], { a: 10 }) === 10
    && cobroDelTrabajo(30, 'simulated', [{ stepId: 'a', demo: false }, { stepId: 'b', demo: true }], {}) === 0);
  check('A6) sin demo (simulado): lo cotizado, como siempre', cobroDelTrabajo(30, 'simulated', [{ stepId: 'a' }, { stepId: 'b', demo: false }]) === 30);
  check('A7) real: lo medido, sin el demo, nunca más de lo cotizado',
    cobroDelTrabajo(30, 'real', [{ stepId: 'a', credits: 12 }, { stepId: 'b', demo: true, credits: 99 }]) === 12
    && cobroDelTrabajo(30, 'real', [{ stepId: 'a', credits: 50 }]) === 30);
  check('A8) nunca negativo ni con basura', cobroDelTrabajo(10, 'simulated', [{ stepId: 'a' }, { stepId: 'b', demo: true }], { b: 40 }) === 0
    && cobroDelTrabajo(NaN, 'simulated', [{ stepId: 'a' }]) === 0 && cobroDelTrabajo(-5, 'real', [{ stepId: 'a', credits: 3 }]) === 0);

  /* El Core: un trabajo completado por el demo se devuelve. */
  const { decidirLiquidacion } = lib('runtime/liquidacion.js');
  const { CLAVE_DE_PETICION_DE_CREDITS, CLAVE_DE_TRANSACCION, CLAVE_DE_CREDITS } = lib('runtime/liquidacion.js');
  const meta = { [CLAVE_DE_PETICION_DE_CREDITS ?? 'creditRequestId']: 'r1', [CLAVE_DE_TRANSACCION ?? 'creditTransactionId']: 'usage_r1', [CLAVE_DE_CREDITS ?? 'creditsEstimated']: 7 };
  const base = { jobId: 'j', state: 'completed', attempts: [], metadata: meta };
  const conDemo = decidirLiquidacion({ ...base, implementation: { providerId: 'mock', modelId: 'demo' } }, 0);
  const conReal = decidirLiquidacion({ ...base, implementation: { providerId: 'seedance', modelId: 'x' } }, 0);
  check('A9) Core: completado por `mock` → reembolsar (resultado_demo); por un proveedor real → liquidar lo cotizado',
    conDemo.tipo === 'reembolsar' && conDemo.motivo === 'resultado_demo' && conReal.tipo === 'liquidar' && conReal.importe === 7,
    JSON.stringify([conDemo, conReal]));
}

/* ══ B. X2 · el interruptor del vídeo ══════════════════════════════════════ */
console.log('\n── B · El interruptor del vídeo (X2) ──');
check('B0) por defecto el vídeo está APAGADO', DEFAULT_SETTINGS.videoHabilitado === false);
const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const verificacion = lib('engine/verification.js');
const registrarReal = verificacion.recordRealSuccess;
verificacion.recordRealSuccess = async () => {};
const videoReal = () => ({
  id: 'seedance', name: 'seedance', modalities: ['video'], calls: 0,
  models: [{ id: 'sd-1', provider: 'seedance', capabilities: ['video.generate'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.1 } }],
  isConfigured: () => true, supports: (c) => c === 'video.generate',
  async run() { this.calls++; return { output: { kind: 'video', url: 'https://x/v.mp4' }, costUSD: 0.5, latencyMs: 1 }; },
});
const demoVideo = () => ({ ...videoReal(), id: 'mock', name: 'demo', models: [{ id: 'demo', provider: 'mock', capabilities: ['video.generate'], quality: 1, speed: 5, cost: { unit: 'call', usd: 0 } }], calls: 0, async run() { this.calls++; return { output: { kind: 'video', url: 'demo' }, costUSD: 0, latencyMs: 1 }; } });
const cfgVideo = (settings) => ({
  providers: { seedance: { enabled: true, priority: 1 }, mock: { enabled: true, priority: 99 } },
  routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'seedance' }], policy: 'quality-first' } },
  settings: { ...DEFAULT_SETTINGS, ...settings }, source: 'test',
});
const pedidoVideo = { capability: 'video.generate', input: { prompt: 'un tren', durationSec: 5 }, userId: 'u1', jobId: 'j1', stepId: 's1' };
{
  const sd = videoReal(); const m = demoVideo(); const ledger = memoryLedger();
  const router = createRouter({ adapters: { seedance: sd, mock: m }, loadConfig: async () => cfgVideo({}), ledger, health: memoryHealth(() => 1), now: () => 1 });
  let error = null;
  try { await router.execute(pedidoVideo); } catch (e) { error = e; }
  check('B1) router, apagado: NOT_AVAILABLE, sin llamar a Seedance ni al demo y sin abrir fila en el libro',
    error?.code === 'NOT_AVAILABLE' && sd.calls === 0 && m.calls === 0 && Object.keys(ledger.records).length === 0, `${error?.code} sd=${sd.calls} demo=${m.calls}`);
  const sd2 = videoReal();
  const router2 = createRouter({ adapters: { seedance: sd2, mock: demoVideo() }, loadConfig: async () => cfgVideo({ videoHabilitado: true }), ledger: memoryLedger(), health: memoryHealth(() => 1), now: () => 1 });
  const r = await router2.execute(pedidoVideo);
  check('B2) CONTROL router, encendido: genera con Seedance', r.output.url === 'https://x/v.mp4' && sd2.calls === 1);
}
{
  /* El ejecutor del Core: lo que el conductor usa para despachar. */
  const { crearEjecutorDelMotor } = lib('engine/gateway.js');
  const sd = videoReal();
  const req = { capability: 'video.generate', entry: { produces: 'video' }, implementation: { provider: { id: 'seedance', type: 'matrix' }, model: { id: 'sd-1' } }, input: { prompt: 'x' }, trace: { userId: 'u1', traceId: 't', requestId: 't' }, execution: {}, hooks: {} };
  const apagado = await crearEjecutorDelMotor({ adapters: { seedance: sd }, config: () => cfgVideo({}) }).run(req);
  check('B3) Core (conductor), apagado: rechazo PROVIDER_UNAVAILABLE antes de llamar al adaptador',
    apagado.ok === false && apagado.error?.details?.videoApagado === true && sd.calls === 0, JSON.stringify(apagado.error?.details));
  const encendido = await crearEjecutorDelMotor({ adapters: { seedance: sd }, config: () => cfgVideo({ videoHabilitado: true }) }).run(req).catch((e) => ({ ok: false, error: e }));
  check('B4) CONTROL Core, encendido: ya no lo rechaza el interruptor', !(encendido.ok === false && encendido.error?.details?.videoApagado), JSON.stringify(encendido.error?.details ?? encendido.ok));
}

/* generateVideo y creatorRun: el compilado de verdad, con cupo, dinero y proveedor sustituidos y espiados. */
const configMod = lib('engine/config.js');
const limitesMod = lib('engine/limits.js');
const motor = lib('credits/creditEngine.js').creditEngine;
const videoMod = lib('engine/video.js');
const seedanceConfigurado = ADAPTERS.seedance.isConfigured;
ADAPTERS.seedance.isConfigured = () => true; /* «hay clave»: nunca se usa una de verdad, la red está cortada */
const originales = { config: configMod.loadConfig, reserve: limitesMod.limiter.reserve, spend: motor.spendCredits, ensure: motor.ensureAccount, gen: videoMod.videoEngine.generate };
let espia = { cupo: 0, reservas: 0, generaciones: 0 };
let ajustes = { ...DEFAULT_SETTINGS };
configMod.loadConfig = async () => ({ settings: ajustes, providers: {}, routing: {}, source: 'test' });
limitesMod.limiter.reserve = async () => { espia.cupo++; };
motor.ensureAccount = async () => ({});
motor.spendCredits = async () => { espia.reservas++; return { transactionId: 'usage_x', status: 'AUTHORIZED', amount: 10, duplicate: false }; };
videoMod.videoEngine.generate = async () => { espia.generaciones++; throw new Error('no debería llegar al proveedor'); };
{
  const { generateVideo } = lib('creator/video.js');
  const r = await generateVideo.run({ auth: { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz01' }, data: { requestId: 'studio_req_linea_b_0001', prompt: 'un tren de noche' } })
    .then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  check('B5) generateVideo (Studio), apagado: «no disponible» ANTES del cupo, la reserva y el proveedor',
    !r.ok && r.e?.code === 'failed-precondition' && espia.cupo === 0 && espia.reservas === 0 && espia.generaciones === 0,
    `${r.e?.code} · ${JSON.stringify(espia)}`);
  check('B6) …con el mensaje público, sin proveedor ni interruptor', !/seedance|modelark|videoHabilitado|ark/i.test(String(r.e?.message)), String(r.e?.message));
}

/* ══ creatorRun, con una Firestore de mentira (transacciones serializadas) ══ */
const firestore = require('firebase-admin/firestore');
const docs = new Map();
const ref = (p) => ({
  id: p.split('/').pop(), path: p,
  collection: (sub) => ({ doc: (id) => ref(`${p}/${sub}/${id || 'auto'}`) }),
  get: async () => ({ exists: docs.has(p), id: p.split('/').pop(), data: () => docs.get(p) }),
  set: async (d) => { docs.set(p, { ...d }); },
  update: async (d) => { docs.set(p, { ...(docs.get(p) || {}), ...d }); },
});
let cola = Promise.resolve();
const baseFalsa = {
  collection: (c) => ({ doc: (id) => ref(`${c}/${id || 'nuevo'}`) }),
  runTransaction: (fn) => {
    const turno = cola.then(() => fn({ get: async (r) => r.get(), update: (r, d) => { docs.set(r.path, { ...(docs.get(r.path) || {}), ...d }); }, set: (r, d) => { docs.set(r.path, { ...d }); } }));
    cola = turno.catch(() => {});
    return turno;
  },
};
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;
const creditos = lib('creator/credits.js');
const gatewayMod = lib('gateway/index.js');
const creatorMod = lib('creator/index.js');
const orig2 = { hold: creditos.holdCredits, settle: creditos.settleCredits, modo: creditos.pricingMode, estimar: creditos.estimatePlan, run: gatewayMod.runCapability };
let liquidaciones = [];
creditos.holdCredits = async () => { espia.reservas++; return { duplicate: false, status: 'AUTHORIZED', amount: 30 }; };
creditos.settleCredits = async (u, j, held, used) => { liquidaciones.push(`${held}:${used}`); return true; };
creditos.pricingMode = async () => 'simulated';
creditos.estimatePlan = async () => ({ total: 30, service: 'ai_text', steps: [{ stepId: 'texto', credits: 10 }, { stepId: 'musica', credits: 20 }] });
const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
const correr = (jobId) => creatorMod.creatorRun.run({ auth: { uid: UID }, data: { jobId } }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const trabajo = (steps, extra = {}) => ({ id: 'x', userId: UID, experienceId: 'music', status: 'planned', creditsEstimated: 30, plan: { steps }, steps: steps.map((s) => ({ ...s, status: 'pending' })), results: [], progressText: '', ...extra });
{
  espia = { cupo: 0, reservas: 0, generaciones: 0 };
  docs.set('creatorJobs/conVideo', trabajo([{ id: 'v', capability: 'video.generate', purpose: 'vídeo', input: { prompt: 'x' } }]));
  const r = await correr('conVideo');
  const d = docs.get('creatorJobs/conVideo');
  check('B7) creatorRun con un paso de vídeo, apagado: rechazo ANTES del cupo, la reserva y el proveedor; el trabajo sigue `planned` y sin reclamo',
    !r.ok && r.e?.code === 'failed-precondition' && espia.cupo === 0 && espia.reservas === 0 && espia.generaciones === 0 && d.status === 'planned' && !d.runId,
    `${r.e?.code} · ${JSON.stringify(espia)} · ${d.status}`);
}
{
  /* A, de punta a punta por creatorRun: los pasos los atiende el demo. */
  let respuestas = {};
  gatewayMod.runCapability = async (cap) => ({ output: { kind: 'text', content: 'hola' }, usage: {}, costUSD: 0, latencyMs: 1, provider: respuestas[cap] ?? 'mock', credits: 0, generationId: `g_${cap}`, demo: (respuestas[cap] ?? 'mock') === 'mock', attempts: 1 });
  liquidaciones = [];
  docs.set('creatorJobs/todoDemo', trabajo([{ id: 'texto', capability: 'text.generate', purpose: 'letra' }, { id: 'musica', capability: 'music.generate', purpose: 'canción', dependsOn: ['texto'] }]));
  const r1 = await correr('todoDemo');
  check('A10) creatorRun todo demo (simulado): termina y liquida 0 (se devuelve la reserva entera)',
    r1.ok && liquidaciones.join() === '30:0' && docs.get('creatorJobs/todoDemo').creditsCharged === 0, `${liquidaciones.join()} · ${r1.ok || r1.e?.message}`);
  respuestas = { 'text.generate': 'gemini' };
  liquidaciones = [];
  docs.set('creatorJobs/mixto', trabajo([{ id: 'texto', capability: 'text.generate', purpose: 'letra' }, { id: 'musica', capability: 'music.generate', purpose: 'canción', dependsOn: ['texto'] }]));
  const r2 = await correr('mixto');
  check('A11) creatorRun mixto (texto real + música demo): cobra solo el texto (10 de 30)',
    r2.ok && liquidaciones.join() === '30:10' && docs.get('creatorJobs/mixto').creditsCharged === 10, `${liquidaciones.join()}`);
  respuestas = { 'text.generate': 'gemini', 'music.generate': 'gemini' };
  liquidaciones = [];
  docs.set('creatorJobs/real', trabajo([{ id: 'texto', capability: 'text.generate', purpose: 'letra' }, { id: 'musica', capability: 'music.generate', purpose: 'canción', dependsOn: ['texto'] }]));
  const r3 = await correr('real');
  check('A12) CONTROL: todo real (simulado) cobra lo cotizado, como siempre', r3.ok && liquidaciones.join() === '30:30');
}

/* ══ C. X3 · el cierre de creatorRun ═══════════════════════════════════════ */
console.log('\n── C · El cierre de creatorRun (X3) ──');
{
  const { finDelProcesoDe, cerrarAbandonado, cerrarTrabajo, RESERVA_PARA_LIQUIDAR_MS, MARGEN_DE_RELOJ_MS } = lib('creator/cierre.js');
  const ahora = Date.now();
  liquidaciones = [];
  /* El proceso original pasó su `deadlineAt` hace 10 s: todavía está liquidando (le quedan 35 s de reserva). */
  docs.set('creatorJobs/liquidando', trabajo([], { status: 'running', runId: 'original', deadlineAt: ahora - 10_000 }));
  const r = await correr('liquidando');
  check('C1) un reintento justo después de `deadlineAt` NO lo da por abandonado: «en marcha», sin devolver nada',
    !r.ok && /already-exists/.test(String(r.e?.code)) && liquidaciones.length === 0 && docs.get('creatorJobs/liquidando').status === 'running', `${r.e?.code} ${liquidaciones.join()}`);
  check('C2) el fin del proceso es deadlineAt + reserva para liquidar + margen de reloj', finDelProcesoDe(1000) === 1000 + RESERVA_PARA_LIQUIDAR_MS + MARGEN_DE_RELOJ_MS && finDelProcesoDe(undefined) === undefined);
  /* Pasado el fin del proceso: dos reintentos a la vez → una sola transición y una sola devolución. */
  docs.set('creatorJobs/muerto', trabajo([], { status: 'running', runId: 'original', deadlineAt: ahora - RESERVA_PARA_LIQUIDAR_MS - MARGEN_DE_RELOJ_MS - 1_000 }));
  const [a, b] = await Promise.all([correr('muerto'), correr('muerto')]);
  check('C3) abandonado de verdad, dos reintentos a la vez: los dos contestan TIMEOUT, el trabajo queda `failed` y se devuelve UNA vez',
    !a.ok && !b.ok && liquidaciones.join() === '30:0' && docs.get('creatorJobs/muerto').status === 'failed', `${liquidaciones.join()} ${a.e?.code} ${b.e?.code}`);
  /* El proceso original termina tarde, después de que otro lo cerrara: no liquida. */
  const refMuerto = baseFalsa.collection('creatorJobs').doc('muerto');
  check('C4) el cierre del proceso original llega tarde: pierde la transición y no toca el dinero', (await cerrarTrabajo(refMuerto, 'original', { status: 'done' })) === false && docs.get('creatorJobs/muerto').status === 'failed');
  docs.set('creatorJobs/vivo', trabajo([], { status: 'running', runId: 'yo', deadlineAt: ahora + 60_000 }));
  const refVivo = baseFalsa.collection('creatorJobs').doc('vivo');
  check('C5) un trabajo vivo no se cierra por abandono, y otra llamada (otro runId) tampoco puede cerrarlo',
    (await cerrarAbandonado(refVivo, ahora, { status: 'failed' })) === null && (await cerrarTrabajo(refVivo, 'otro', { status: 'done' })) === false
    && (await cerrarTrabajo(refVivo, 'yo', { status: 'done' })) === true);
}

/* ── Restaurar y cerrar ─────────────────────────────────────────────────── */
firestore.getFirestore = getFirestoreReal;
Object.assign(creditos, { holdCredits: orig2.hold, settleCredits: orig2.settle, pricingMode: orig2.modo, estimatePlan: orig2.estimar });
gatewayMod.runCapability = orig2.run;
configMod.loadConfig = originales.config;
limitesMod.limiter.reserve = originales.reserve;
Object.assign(motor, { spendCredits: originales.spend, ensureAccount: originales.ensure });
videoMod.videoEngine.generate = originales.gen;
ADAPTERS.seedance.isConfigured = seedanceConfigurado;
verificacion.recordRealSuccess = registrarReal;
check('Z) ninguna petición salió a la red', salidasALaRed === 0, String(salidasALaRed));
globalThis.fetch = fetchReal;

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
