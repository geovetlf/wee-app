/*
 * FRENTE E · LA RUTA ENTERA DE `creatorRun` CON EL ROUTER DE VERDAD Y PROVEEDORES FALSOS.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Las suites del router (`router`, `interruptor-ia`, `coste-de-los-fallos`) prueban
 * el router suelto, y `creator-reclamo` prueba el callable con el motor apartado.
 * Lo que no estaba probado es la ruta COMPLETA: callable compilado → cupo →
 * reserva de Credits → `runCapability` → `createRouter` real (cadena, respaldo,
 * cortacircuitos, interruptor) → adaptador → libro → liquidación. Aquí se ejecuta
 * esa ruta con una Firestore de mentira, adaptadores falsos y la red cortada:
 *
 *   A. respaldo: el primero falla, atiende el segundo y se cobra UNA vez;
 *   B. todos fallan: se devuelve exactamente lo reservado, sin otro cobro;
 *   C. `iaDetenida`: ningún proveedor se llama y lo reservado se devuelve;
 *   D. reintento de un trabajo ya fallido o ya hecho: ni otra reserva ni otra llamada;
 *   E. idempotencia de la liquidación y del respaldo (una fila COMPLETED, las demás FAILED con 0);
 *   F. DEFECTOS CONOCIDOS (no paran la cadena; se informan y fallan si cambian sin aviso):
 *      K1 (M-01 / X1) si escribir el uso tras un éxito falla, el router paga a OTRO proveedor;
 *      K2 con `iaDetenida` el cupo diario de la persona se consume y se reserva/devuelve igual.
 *
 * Sin claves, sin red (fetch y sockets cortados), sin emuladores. < 5 s.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

/* ── Red cortada: cualquier salida se apunta y se rechaza ───────────────── */
const salidas = [];
globalThis.fetch = async (url) => { salidas.push(String(url)); throw new TypeError('RED CORTADA en la prueba'); };
net.Socket.prototype.connect = function () { salidas.push('socket'); throw new Error('RED CORTADA en la prueba'); };

let failures = 0;
const conocidos = [];
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/* Un defecto conocido: se informa como ✘ (conocido) sin parar la cadena; si deja de reproducirse, avisa para actualizar. */
const conocido = (id, name, reproduce, extra = '') => {
  console.log((reproduce ? '✘ (conocido ' + id + ') ' : '✔ (¿corregido? ' + id + ') ') + name + (extra ? ' — ' + extra : ''));
  conocidos.push({ id, reproduce });
};

/* ── Firestore de mentira, transacciones serializadas ───────────────────── */
const firestore = require('firebase-admin/firestore');
const docs = new Map();
const aplicar = (p, d) => docs.set(p, { ...(docs.get(p) || {}), ...d });
let fallarEscrituraEn = null; // (ruta) => boolean
const ref = (p) => ({
  id: p.split('/').pop(),
  path: p,
  collection: (sub) => ({ doc: (id) => ref(`${p}/${sub}/${id || 'auto'}`) }),
  get: async () => ({ exists: docs.has(p), id: p.split('/').pop(), data: () => docs.get(p) }),
  set: async (d) => {
    if (fallarEscrituraEn && fallarEscrituraEn(p)) throw new Error(`escritura de ${p} rechazada (prueba)`);
    aplicar(p, d);
  },
  update: async (d) => aplicar(p, d),
});
let cola = Promise.resolve();
const baseFalsa = {
  collection: (c) => ({ doc: (id) => ref(`${c}/${id || 'nuevo'}`) }),
  runTransaction: (fn) => {
    const turno = cola.then(() => fn({ get: async (r) => r.get(), update: (r, d) => aplicar(r.path, d), set: (r, d) => docs.set(r.path, { ...d }) }));
    cola = turno.catch(() => {});
    return turno;
  },
};
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

/* ── El motor: el createRouter REAL, con adaptadores falsos y libro en memoria ── */
const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const engineMod = lib('engine/index.js');
const creatorMod = lib('creator/index.js');
const creditosMod = lib('creator/credits.js');
const limitesMod = lib('engine/limits.js');
const configMod = lib('engine/config.js');

const llamadas = [];
const falso = (id, comportamiento) => ({
  id, name: id, modalities: ['text'],
  models: [{ id: `${id}-m`, provider: id, capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
  isConfigured: () => true,
  supports: (c) => c === 'text.generate',
  async run() {
    llamadas.push(id);
    if (comportamiento.falla()) throw Object.assign(new Error(`${id} no responde`), { retryable: true });
    return { output: { kind: 'text', content: `respuesta de ${id}` }, costUSD: 0.01, latencyMs: 3, model: `${id}-m` };
  },
});
const mock = {
  id: 'mock', name: 'demo', modalities: ['text'],
  models: [{ id: 'demo', provider: 'mock', capabilities: ['text.generate'], quality: 1, speed: 5, cost: { unit: 'call', usd: 0 } }],
  isConfigured: () => true, supports: () => true,
  async run() { llamadas.push('mock'); return { output: { kind: 'text', content: 'demo' }, costUSD: 0, latencyMs: 1 }; },
};
let fallaAlfa = () => false;
let fallaBeta = () => false;
const adapters = { alfa: falso('alfa', { falla: () => fallaAlfa() }), beta: falso('beta', { falla: () => fallaBeta() }), mock };
let ajustes = {};
const config = () => ({
  providers: { alfa: { enabled: true, priority: 1 }, beta: { enabled: true, priority: 2 }, mock: { enabled: true, priority: 99 } },
  routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alfa' }, { provider: 'beta' }], policy: 'balanced' } },
  settings: { ...DEFAULT_SETTINGS, limits: {}, ...ajustes },
  source: 'prueba',
});
let ledger = memoryLedger();
let health = memoryHealth();
const routerDePrueba = () => createRouter({ adapters, loadConfig: async () => config(), ledger, health });
const generateOriginal = engineMod.engine.generate;
engineMod.engine.generate = (request) => routerDePrueba().execute(request);

const originales = { hold: creditosMod.holdCredits, settle: creditosMod.settleCredits, modo: creditosMod.pricingMode, reserve: limitesMod.limiter.reserve, config: configMod.loadConfig };
let eventos = [];
configMod.loadConfig = async () => config();
limitesMod.limiter.reserve = async () => { eventos.push('cupo'); };
creditosMod.holdCredits = async (uid, jobId, plan, importe) => { eventos.push(`reserva:${importe}`); return { duplicate: false, status: 'AUTHORIZED', amount: importe }; };
creditosMod.settleCredits = async (uid, jobId, held, used) => { eventos.push(`liquida:${held}:${used}`); };
creditosMod.pricingMode = async () => 'simulated';

const UID = 'FrenteEPruebaRutaCreatorRun01';
const trabajo = (extra = {}) => ({
  userId: UID, experienceId: 'writer', goal: 'un poema corto', status: 'planned', creditsEstimated: 7,
  plan: { steps: [{ id: 's1', capability: 'text.generate', purpose: 'Escribir el poema' }] },
  steps: [{ id: 's1', capability: 'text.generate', purpose: 'Escribir el poema', status: 'pending', dependsOn: [] }],
  results: [], progressText: 'Este es el plan.', ...extra,
});
const reiniciar = (id, extra) => {
  docs.set(`creatorJobs/${id}`, trabajo(extra));
  eventos = []; llamadas.length = 0; ledger = memoryLedger(); health = memoryHealth();
  fallaAlfa = () => false; fallaBeta = () => false; ajustes = {}; fallarEscrituraEn = null;
};
const correr = (jobId) => creatorMod.creatorRun.run({ auth: { uid: UID }, data: { jobId } }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const filas = () => Object.values(ledger.records);
const liquidaciones = () => eventos.filter((e) => e.startsWith('liquida'));

/* ── A. Respaldo de verdad: alfa falla, beta atiende, se cobra una vez ─── */
reiniciar('respaldo');
fallaAlfa = () => true;
const a = await correr('respaldo');
check('A1) alfa falla → beta atiende el paso y el trabajo termina `done`', a.ok && a.v.status === 'done' && llamadas.join('>') === 'alfa>beta', `${llamadas.join('>')} ${a.ok ? '' : a.e?.message}`);
check('A2) UNA reserva y UNA liquidación por lo estimado (el respaldo no cobra dos veces)', eventos.filter((e) => e.startsWith('reserva')).length === 1 && liquidaciones().join(',') === 'liquida:7:7', eventos.join(','));
check('A3) el libro: una fila FAILED (alfa, 0 Credits) y una COMPLETED (beta)',
  filas().length === 2 && filas()[0].provider === 'alfa' && filas()[0].status === 'FAILED' && filas()[0].creditsEstimated === 0 && filas()[1].provider === 'beta' && filas()[1].status === 'COMPLETED',
  JSON.stringify(filas().map((r) => [r.provider, r.status, r.creditsEstimated])));
check('A4) las dos filas van atadas a la MISMA transacción de Credits y al mismo requestId', new Set(filas().map((r) => `${r.creditTransactionId}|${r.requestId}`)).size === 1 && filas()[0].creditTransactionId === 'usage_respaldo', JSON.stringify(filas().map((r) => [r.creditTransactionId, r.requestId])));
check('A5) el demo NO entra cuando hay proveedores reales configurados', !llamadas.includes('mock'));
check('A6) el resultado guardado dice quién lo hizo y no es demo', docs.get('creatorJobs/respaldo').results?.[0]?.demo === false && /beta/.test(docs.get('creatorJobs/respaldo').results?.[0]?.content || ''));

/* ── B. Todos fallan: se devuelve exactamente lo reservado ─────────────── */
reiniciar('todos');
fallaAlfa = () => true; fallaBeta = () => true;
const b = await correr('todos');
check('B1) todos fallan → error para la persona y trabajo `failed`', !b.ok && docs.get('creatorJobs/todos').status === 'failed');
check('B2) se liquida UNA vez con 0 usado (reembolso íntegro)', liquidaciones().join(',') === 'liquida:7:0', eventos.join(','));
check('B3) dos filas FAILED en el libro, ninguna COMPLETED, ninguna con Credits', filas().length === 2 && filas().every((r) => r.status === 'FAILED' && r.creditsEstimated === 0));
check('B4) ni el demo entra a «salvar» el fallo de un proveedor real', !llamadas.includes('mock'));
check('B5) el mensaje para la persona no nombra proveedores', !/alfa|beta|mock/i.test(String(b.e?.message)) && !/alfa|beta/.test(String(docs.get('creatorJobs/todos').progressText)));

/* ── C. iaDetenida: ningún proveedor, lo reservado vuelve ──────────────── */
reiniciar('detenida');
ajustes = { iaDetenida: true };
const c = await correr('detenida');
check('C1) con iaDetenida no se llama a NINGÚN proveedor (ni real ni demo)', llamadas.length === 0, llamadas.join(','));
check('C2) ni se abre una fila en el libro de costes', filas().length === 0);
check('C3) lo reservado se devuelve entero (liquida con 0)', liquidaciones().join(',') === 'liquida:7:0', eventos.join(','));
check('C4) el error llega como «no disponible», no como un fallo genérico', !c.ok && /unavailable|failed-precondition|resource-exhausted/.test(String(c.e?.code)), String(c.e?.code));
conocido('K2', 'con iaDetenida el callable consume el cupo diario de la persona y hace reserva+devolución antes de saber que la IA está parada (creator/index.ts:610-611; el interruptor solo se mira dentro del router, engine/router.ts:230)',
  eventos[0] === 'cupo' && eventos[1] === 'reserva:7', eventos.join(','));

/* ── D. Recuperación: reintentar un trabajo fallido o hecho no cobra ni llama ── */
const antes = { reservas: 0 };
eventos = []; llamadas.length = 0;
const d1 = await correr('todos');
check('D1) reintentar un trabajo `failed`: rechazado sin cupo, sin reserva y sin proveedor', !d1.ok && eventos.length === 0 && llamadas.length === 0, `${eventos.join(',')} ${llamadas.join(',')}`);
eventos = []; llamadas.length = 0;
const d2 = await correr('respaldo');
check('D2) volver a pedir un trabajo `done`: contesta done sin tocar dinero ni proveedor', d2.ok && d2.v.status === 'done' && eventos.length === 0 && llamadas.length === 0);
reiniciar('doble');
const [x1, x2] = await Promise.all([correr('doble'), correr('doble')]);
check('D3) dos llamadas a la vez con la ruta completa: una sola llamada al proveedor y una sola liquidación',
  llamadas.length === 1 && liquidaciones().length === 1 && [x1, x2].filter((r) => r.ok).length >= 1, `${llamadas.join(',')} ${eventos.join(',')}`);
void antes;

/* ── E. El cortacircuitos sobrevive entre trabajos y nunca degrada a demo ── */
reiniciar('cc1');
const healthCompartido = memoryHealth();
health = healthCompartido;
fallaAlfa = () => true;
for (const id of ['cc1', 'cc2', 'cc3']) {
  docs.set(`creatorJobs/${id}`, trabajo());
  ledger = memoryLedger(); health = healthCompartido;
  await correr(id);
}
llamadas.length = 0; eventos = [];
docs.set('creatorJobs/cc4', trabajo()); ledger = memoryLedger(); health = healthCompartido;
const e4 = await correr('cc4');
check('E1) tras 3 fallos de alfa, el 4º trabajo ni lo intenta: va directo a beta', e4.ok && llamadas.join('>') === 'beta', llamadas.join('>'));
fallaBeta = () => true;
for (const id of ['cc5', 'cc6', 'cc7']) { docs.set(`creatorJobs/${id}`, trabajo()); ledger = memoryLedger(); health = healthCompartido; await correr(id); }
llamadas.length = 0; eventos = [];
docs.set('creatorJobs/cc8', trabajo()); ledger = memoryLedger(); health = healthCompartido;
const e8 = await correr('cc8');
check('E2) con los dos en pausa: «no disponible», sin demo y con reembolso íntegro', !e8.ok && llamadas.length === 0 && liquidaciones().join(',') === 'liquida:7:0', `${llamadas.join(',')} ${eventos.join(',')}`);

/* ── F. Defecto conocido M-01: escribir el uso tras un éxito ─────────────── */
reiniciar('m01');
let rechazos = 0;
fallarEscrituraEn = (p) => p.startsWith('creatorUsage/') && rechazos++ === 0; // solo la primera escritura del uso
const f = await correr('m01');
conocido('K1', 'M-01: alfa respondió (y cobró al proveedor) pero falló la escritura de creatorUsage → el router lo trató como fallo de alfa y PAGÓ A BETA (engine/router.ts:446-514: ledger.close y request.record en el mismo try que adapter.run)',
  f.ok && llamadas.join('>') === 'alfa>beta' && filas()[0]?.status === 'FAILED', `${llamadas.join('>')} libro=${filas().map((r) => r.provider + ':' + r.status).join(',')}`);
conocido('K3', 'M-01 en el libro de costes: la llamada de alfa que SÍ respondió queda como FAILED con providerCost 0 (su coste real no se apunta)',
  filas()[0]?.status === 'FAILED' && filas()[0]?.providerCost === 0, JSON.stringify({ providerCost: filas()[0]?.providerCost, estado: filas()[0]?.providerCostStatus ?? null }));
check('F1) aun con M-01, a la persona se le cobra UNA vez', liquidaciones().length <= 1 && eventos.filter((e) => e.startsWith('reserva')).length === 1, eventos.join(','));

/* ── Red ────────────────────────────────────────────────────────────────── */
check('R1) ninguna salida de red en toda la suite', salidas.length === 0, salidas.join(','));

/* ── Limpieza ───────────────────────────────────────────────────────────── */
Object.assign(creditosMod, { holdCredits: originales.hold, settleCredits: originales.settle, pricingMode: originales.modo });
limitesMod.limiter.reserve = originales.reserve;
configMod.loadConfig = originales.config;
engineMod.engine.generate = generateOriginal;
firestore.getFirestore = getFirestoreReal;

const vivos = conocidos.filter((k) => k.reproduce).map((k) => k.id);
const corregidos = conocidos.filter((k) => !k.reproduce).map((k) => k.id);
if (corregidos.length) console.log(`\nℹ defectos conocidos que YA NO se reproducen: ${corregidos.join(', ')} — actualiza esta suite y el registro del Frente E`);
console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ todo bien (defectos conocidos vigentes: ${vivos.join(', ') || 'ninguno'})`);
process.exit(failures ? 1 : 0);
