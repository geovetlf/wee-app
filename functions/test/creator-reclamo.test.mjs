/*
 * UN TRABAJO DE WEË AI SE ARRANCA UNA SOLA VEZ — auditoría H0, escenario #9.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Dos llamadas a `creatorRun` con el mismo trabajo leían las dos `planned`,
 * consumían cupo dos veces, reservaban dos veces (el Credit Engine solo cobraba
 * una; `holdCredits` tiraba el `duplicate`) y ejecutaban el plan dos veces: la
 * persona pagaba una vez y Weë pagaba dos al proveedor.
 *
 * Aquí se EJECUTA el `creatorRun` compilado con una Firestore de mentira cuyas
 * transacciones se serializan (como garantiza Firestore) y se cuenta cuántas
 * veces se toca el cupo, el dinero y la liquidación. También se vigila la
 * pantalla: el trabajo no pasa a `running` hasta que la reserva está hecha, así
 * que un «no te alcanzan los Credits» no hace parpadear la vista de progreso.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../', p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Firestore de mentira, con transacciones serializadas ───────────────── */
const firestore = require('firebase-admin/firestore');
const docs = new Map();
const escrituras = [];
const aplicar = (p, d) => {
  docs.set(p, { ...(docs.get(p) || {}), ...d });
  escrituras.push({ path: p, ...d });
};
const ref = (p) => ({
  id: p.split('/').pop(),
  path: p,
  collection: (sub) => ({ doc: (id) => ref(`${p}/${sub}/${id || 'auto'}`) }),
  get: async () => ({ exists: docs.has(p), id: p.split('/').pop(), data: () => docs.get(p) }),
  set: async (d) => aplicar(p, d),
  update: async (d) => aplicar(p, d),
});
let cola = Promise.resolve();
/* Lo que pasa justo antes de la PRÓXIMA transacción (una vez): sirve para cambiar el trabajo entre la primera lectura y el reclamo. */
let antesDeLaTransaccion = null;
const baseFalsa = {
  collection: (c) => ({ doc: (id) => ref(`${c}/${id || 'nuevo'}`) }),
  runTransaction: (fn) => {
    if (antesDeLaTransaccion) { const h = antesDeLaTransaccion; antesDeLaTransaccion = null; h(); }
    const turno = cola.then(() => fn({
      get: async (r) => r.get(),
      update: (r, d) => aplicar(r.path, d),
      set: (r, d) => aplicar(r.path, d),
    }));
    cola = turno.catch(() => {});
    return turno;
  },
};
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

/* ── Lo que rodea al callable: cupo, reserva, liquidación ───────────────── */
const creatorMod = lib('creator/index.js');
const creditosMod = lib('creator/credits.js');
const limitesMod = lib('engine/limits.js');
const configMod = lib('engine/config.js');
const originales = {
  hold: creditosMod.holdCredits, settle: creditosMod.settleCredits, modo: creditosMod.pricingMode,
  reserve: limitesMod.limiter.reserve, config: configMod.loadConfig,
};

let eventos = [];
let respuestaDeReserva = () => ({ duplicate: false, status: 'AUTHORIZED', amount: 12 });
configMod.loadConfig = async () => ({ settings: { limits: {} } });
limitesMod.limiter.reserve = async () => { eventos.push('cupo'); };
const importesReservados = [];
creditosMod.holdCredits = async (userId, jobId, plan, importe) => {
  importesReservados.push(importe);
  eventos.push('reserva');
  /* Lo que el Credit Engine hace con el mismo requestId: la segunda vez contesta duplicate. */
  await new Promise((r) => setTimeout(r, 5));
  return respuestaDeReserva(jobId);
};
creditosMod.settleCredits = async (userId, jobId, held, used) => { eventos.push(`liquida:${held}:${used}`); };
creditosMod.pricingMode = async () => 'simulated';

const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
const correr = (jobId) => creatorMod.creatorRun.run({ auth: { uid: UID }, data: { jobId } });
const trabajo = (extra = {}) => ({
  userId: UID, experienceId: 'design', status: 'planned', creditsEstimated: 12, plan: { steps: [] }, steps: [], results: [],
  progressText: 'Este es el plan.', ...extra,
});
const reiniciar = (id, extra) => { docs.set(`creatorJobs/${id}`, trabajo(extra)); eventos = []; escrituras.length = 0; };
const resultado = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const esDuplicado = (r) => !r.ok && /already-exists/.test(String(r.e?.code)) && /en marcha/.test(String(r.e?.message));

/* ── A. La carrera: dos llamadas a la vez ───────────────────────────────── */
reiniciar('carrera');
const [r1, r2] = await Promise.all([resultado(correr('carrera')), resultado(correr('carrera'))]);
const ganadas = [r1, r2].filter((r) => r.ok && r.v.status === 'done').length;
check('1) dos llamadas a la vez: solo UNA ejecuta el trabajo', ganadas === 1, JSON.stringify([r1.ok, r2.ok]));
check('2) la otra contesta «ya está en marcha» (el mensaje de siempre)', [r1, r2].filter(esDuplicado).length === 1);
check('3) el cupo se toca UNA vez y se reserva UNA vez',
  eventos.filter((e) => e === 'cupo').length === 1 && eventos.filter((e) => e === 'reserva').length === 1, eventos.join(','));
check('4) y se liquida UNA vez, por lo estimado', eventos.filter((e) => e.startsWith('liquida')).join(',') === 'liquida:12:12');
check('5) el trabajo termina `done`', docs.get('creatorJobs/carrera').status === 'done');
check('6) se reclama ANTES de tocar el cupo (el orden importa: cupo y dinero van detrás del reclamo)',
  escrituras.findIndex((w) => w.runId) >= 0 && eventos[0] === 'cupo');

/* ── B. Sin Credits: el reclamo se suelta y la pantalla no parpadea ─────── */
reiniciar('sinCredits');
/* Lo que lanza el `holdCredits` real (toHttpsError de INSUFFICIENT_CREDITS). */
const { HttpsError } = require('firebase-functions/v2/https');
respuestaDeReserva = () => { throw new HttpsError('failed-precondition', 'No tienes suficientes Credits', { code: 'INSUFFICIENT_CREDITS', required: 12, available: 3 }); };
const rb = await resultado(correr('sinCredits'));
const doc = docs.get('creatorJobs/sinCredits');
check('7) si la reserva falla, el error llega a la persona como antes', !rb.ok && /suficientes Credits/.test(String(rb.e?.message)));
check('8) el trabajo sigue `planned` y con su texto, y suelta el reclamo',
  doc.status === 'planned' && doc.progressText === 'Este es el plan.' && doc.runId === null, JSON.stringify({ s: doc.status, r: doc.runId }));
check('9) y NUNCA se escribió `running`: la vista de progreso no se asoma', !escrituras.some((w) => w.status === 'running'));
respuestaDeReserva = () => ({ duplicate: false, status: 'AUTHORIZED', amount: 12 });
const rb2 = await resultado(correr('sinCredits'));
check('10) con Credits, el mismo trabajo se puede arrancar después', rb2.ok && rb2.v.status === 'done');

/* ── C. Una reserva que ya existía ──────────────────────────────────────── */
reiniciar('reservaPrevia');
respuestaDeReserva = () => ({ duplicate: true, status: 'AUTHORIZED', amount: 12 });
const rc = await resultado(correr('reservaPrevia'));
check('11) AUTHORIZED de un intento que no llegó a ejecutar: este intento la usa y la liquida (no se queda colgada)',
  rc.ok && eventos.filter((e) => e.startsWith('liquida')).join(',') === 'liquida:12:12');
reiniciar('yaCobrado');
respuestaDeReserva = () => ({ duplicate: true, status: 'COMPLETED', amount: 12 });
const rd = await resultado(correr('yaCobrado'));
check('12) ya COBRADA: no se ejecuta otra vez (sería entregar gratis); duplicado, y el trabajo vuelve a `planned`',
  esDuplicado(rd) && !eventos.some((e) => e.startsWith('liquida')) && docs.get('creatorJobs/yaCobrado').status === 'planned'
  && docs.get('creatorJobs/yaCobrado').runId === null);
reiniciar('otroImporte');
respuestaDeReserva = () => ({ duplicate: true, status: 'AUTHORIZED', amount: 99 });
const re = await resultado(correr('otroImporte'));
check('13) AUTHORIZED pero por otro importe: no se usa', esDuplicado(re) && !eventos.some((e) => e.startsWith('liquida')));
respuestaDeReserva = () => ({ duplicate: false, status: 'AUTHORIZED', amount: 12 });

/* ── D. Reclamos de otros ───────────────────────────────────────────────── */
reiniciar('reclamado', { runId: 'otra-llamada', claimedAt: Date.now() - 5_000 });
const rf = await resultado(correr('reclamado'));
check('14) un reclamo reciente de otra llamada: duplicado, sin tocar cupo ni dinero', esDuplicado(rf) && eventos.length === 0, eventos.join(','));
reiniciar('huerfano', { runId: 'proceso-muerto', claimedAt: Date.now() - 120_000 });
const rg = await resultado(correr('huerfano'));
check('15) uno de hace dos minutos sin pasar a `running` es de un proceso muerto: se retoma', rg.ok && rg.v.status === 'done');

/* ── D2. El presupuesto cambió entre la primera lectura y el reclamo ─────── */
reiniciar('cambiado');
importesReservados.length = 0;
antesDeLaTransaccion = () => {
  /* La persona eligió «Alta calidad» (creatorQuote) y tocó «Crear» antes de que la primera lectura caducara. */
  docs.set('creatorJobs/cambiado', { ...docs.get('creatorJobs/cambiado'), creditsEstimated: 20, quality: 'high' });
};
const rc2 = await resultado(correr('cambiado'));
check('16) si el presupuesto cambió justo antes del reclamo, se reserva el VIGENTE (20), no el leído antes (12)',
  rc2.ok && importesReservados.join(',') === '20', importesReservados.join(','));
check('17) …y se liquida por ese mismo importe', eventos.filter((e) => e.startsWith('liquida')).join(',') === 'liquida:20:20', eventos.join(','));

/* ── E. El texto: holdCredits ya no tira la respuesta del Credit Engine ─── */
const fuente = leer('functions/src/creator/credits.ts');
check('18) holdCredits devuelve el `duplicate` del Credit Engine en vez de tirarlo',
  /Promise<ReservaDeTrabajo>/.test(fuente) && /return \{ duplicate: reserva\.duplicate, status: reserva\.status, amount: reserva\.amount \}/.test(fuente));

/* ── Limpieza ───────────────────────────────────────────────────────────── */
Object.assign(creditosMod, { holdCredits: originales.hold, settleCredits: originales.settle, pricingMode: originales.modo });
limitesMod.limiter.reserve = originales.reserve;
configMod.loadConfig = originales.config;
firestore.getFirestore = getFirestoreReal;

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
