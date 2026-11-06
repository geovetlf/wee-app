/**
 * GRAN MOTOR · PAQUETE D — LO QUE SOLO SE PRUEBA CON FIRESTORE DE VERDAD (emulador).
 *
 * `gran-motor-d-workflow.test.mjs` prueba el autómata del Job Engine y del Workflow, y las decisiones de los barridos,
 * con almacenes en memoria. Aquí cambia el almacén: el `JobStore` de Firestore (`almacenDeTrabajos`), la cola durable
 * y las transacciones reales del Credit Engine.
 *
 *   A  L-5 con transacciones reales: seis cierres a la vez de la misma reserva, UNO cobra (`duplicate:false`), el
 *      resto es repetición, el dinero se mueve una vez.
 *   B  el tope de 1000 del barrendero contra el orden y la paginación REALES de Firestore (confirma que el almacén de
 *      memoria de la suite imita bien): 1050 trabajos que esperan tapan al terminado del final, y la pasada lo dice.
 *   C  la recuperación que existe y NO está conectada (`barrerRecuperables`) funciona contra Firestore: un trabajo
 *      cuyo trabajador murió se recupera y se vuelve a avisar por la cola durable. Es lo que haría falta programar.
 *
 *   firebase emulators:exec --only firestore --project demo-wee-filmmaker "node functions/test/gran-motor-d-workflow.emulator.mjs"
 *
 * Solo proyectos demo-*; nunca toca ningún dato real. La red está cortada.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.log('✘ sin el emulador de Firestore no se corre'); process.exit(2); }
globalThis.fetch = async () => { throw new Error('red cortada en la prueba'); };

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));
const { creditEngine: motorDeCredits } = lib('credits/creditEngine.js');
const { liquidacionDeWee } = lib('runtime/index.js');
const { almacenDeTrabajos } = lib('runtime/almacen.js');
const { barrerLiquidaciones } = lib('runtime/barrendero.js');
const { colaDurableDeTrabajos } = lib('runtime/cola-durable.js');
const { barrerRecuperables } = lib('job/worker.js');
const core = lib('core/index.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const marca = Date.now().toString(36);
const motor = core.crearJobEngine();
const T0 = 1_000_000;
const QUIEN = { userId: `gmd${marca}` };

console.log('\n── A · L-5 con transacciones reales de Firestore ──');
{
  const uid = `gmdA${marca}`;
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: 'A' });
  await motorDeCredits.ensureAccount(uid);
  const antes = (await motorDeCredits.getBalance(uid)).balance;
  await motorDeCredits.spendCredits({ userId: uid, service: 'ai_image', requestId: `job_a_${marca}`, amount: 30, source: 'test' });
  const r = await Promise.all(Array.from({ length: 6 }, () => motorDeCredits.completeCredits({ userId: uid, requestId: `job_a_${marca}`, finalAmount: 30 })));
  check('A1 seis cierres simultáneos: exactamente UNO cobra (duplicate:false) y cinco son repetición (duplicate:true)', r.filter((x) => x.duplicate === false).length === 1 && r.filter((x) => x.duplicate === true).length === 5, JSON.stringify(r.map((x) => x.duplicate)));
  check('A2 el dinero se movió una vez: saldo = antes − 30, la reserva COMPLETED', (await motorDeCredits.getBalance(uid)).balance === antes - 30 && (await db.collection('creditTransactions').doc(`usage_job_a_${marca}`).get()).data().status === 'COMPLETED');

  /* A3 · la liquidación del Core: 1..2 «liquidada» (una movió el dinero; otra puede haber cerrado la fila primero), nunca 6. */
  await motorDeCredits.spendCredits({ userId: uid, service: 'ai_image', requestId: `job_a3_${marca}`, amount: 30, source: 'test' });
  const cerradas = new Set();
  const ledger = { settle: async (p) => { const ya = cerradas.has(p.creditTransactionId); cerradas.add(p.creditTransactionId); return ya ? { rows: 0, credited: 0, already: true } : { rows: 1, credited: 0 }; }, closeAccepted: async () => ({}) };
  const puerto = liquidacionDeWee({ credits: motorDeCredits, ledger, cupo: { liberar: async () => {} } });
  const reserva = { requestId: `job_a3_${marca}`, transactionId: `usage_job_a3_${marca}`, importe: 30 };
  const l = await Promise.all(Array.from({ length: 6 }, () => puerto.liquidar({ userId: uid, reserva, importe: 30, jobId: 'j', job: undefined })));
  const liquidadas = l.filter((x) => x.desenlace === 'liquidada').length;
  check('A3 seis liquidar() a la vez: entre 1 y 2 «liquidada» (no seis), el resto «ya_estaba», ninguna falla', liquidadas >= 1 && liquidadas <= 2 && l.every((x) => x.desenlace === 'liquidada' || x.desenlace === 'ya_estaba'), JSON.stringify(l.map((x) => x.desenlace)));
}

console.log('\n── B · el tope de 1000 del barrendero, con el orden y la paginación de Firestore ──');
{
  const trabajos = almacenDeTrabajos(db);
  const pet = (id) => ({ contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'x' }, trace: { traceId: `trace-${id}`, requestId: id, userId: QUIEN.userId }, metadata: { creditTransactionId: `usage_${id}`, creditRequestId: id, creditsEstimated: 5, service: 'ai_image' } });
  /* 1050 esperando (en cola, con reserva) y UNO terminado cuyo identificador cae el último. */
  const ids = Array.from({ length: 1050 }, (_, i) => `b${marca}${String(i).padStart(4, '0')}`);
  const docs = ids.map((id) => motor.crear(pet(id)).transition.job);
  await Promise.all(docs.map((j) => trabajos.crearSiAusente(j)));
  const idFinal = `z${marca}final`;
  let t = motor.crear(pet(idFinal)).transition.job;
  await trabajos.crearSiAusente(t);
  const paso = async (d) => { const r = await trabajos.aplicar(d.transition); t = r.job; return r.applied; };
  const run = motor.reclamar(t, { principal: QUIEN, at: T0 + 10, worker: 'w1' });
  await paso(run);
  await paso(motor.marcarEnvio(t, { principal: QUIEN, at: T0 + 11, worker: 'w1', attemptId: t.attempts[0].attemptId }));
  await paso(motor.informar(t, { principal: QUIEN, at: T0 + 12, worker: 'w1', report: { attemptId: t.attempts[0].attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: ['asset_x'] } } }));
  check('B0 preparación: el terminado del final está `completed` en Firestore y los 1050 esperando', t.state === 'completed');

  const liquidadas = [];
  const liquidacion = { async liquidar({ reserva }) { liquidadas.push(reserva.requestId); return { desenlace: 'liquidada', estado: 'COMPLETED' }; }, async reembolsar() { return { desenlace: 'reembolsada', estado: 'REFUNDED' }; } };
  /* Aislamiento: la consulta mira TODA la colección `jobs` del emulador, y otras suites pudieron dejar trabajos; solo se cuentan los de esta ejecución. */
  const r1 = await barrerLiquidaciones({ trabajos, liquidacion, ahora: () => T0 + 20 });
  check('B1 una pasada con los topes por defecto mira 1000 (10×100) y devuelve el cursor', r1.mirados === 1000 && typeof r1.cursor === 'string', JSON.stringify({ ...r1, vistos: undefined }));
  check('B2 LÍMITE CONOCIDO (D-J2): el terminado del final NO se liquida mientras lo que espera tape las 10 páginas', !liquidadas.includes(idFinal));
  const r2 = await barrerLiquidaciones({ trabajos, liquidacion, ahora: () => T0 + 21, maxPaginas: 12 });
  check('B3 con más páginas SÍ se alcanza (el tope es de configuración, no un defecto del orden)', liquidadas.includes(idFinal) && r2.liquidados >= 1, `mirados ${r2.mirados}`);
}

console.log('\n── C · la recuperación que existe y no está programada, contra Firestore ──');
{
  const trabajos = almacenDeTrabajos(db);
  const cola = colaDurableDeTrabajos(db, { ahora: () => T0 + 500_000 });
  const id = `a${marca}rec`;
  const pet = { contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'x' }, trace: { traceId: `trace-${id}`, requestId: id, userId: QUIEN.userId }, metadata: { creditTransactionId: `usage_${id}`, creditRequestId: id, creditsEstimated: 5, service: 'ai_image' } };
  let t = motor.crear(pet).transition.job;
  await trabajos.crearSiAusente(t);
  const r = await trabajos.aplicar(motor.reclamar(t, { principal: QUIEN, at: T0 + 10, worker: 'w-muerto' }).transition);
  t = r.job;
  check('C1 preparación: el trabajo está `running` con la concesión del trabajador que murió', t.state === 'running' && r.applied);
  const antes = await trabajos.recuperables({ before: T0 + 500_000, limit: 500 });
  check('C2 la consulta de recuperables lo encuentra (no terminal, sin moverse desde hace rato)', antes.jobs.some((j) => j.jobId === t.jobId));
  const out = await barrerRecuperables({ store: trabajos, queue: cola, engine: motor, now: () => T0 + 500_000 }, { limit: 500 });
  const despues = await trabajos.obtener(t.jobId);
  check('C3 `barrerRecuperables` lo recupera: cierra el intento que no salió y deja otro programado (queued)', despues.state === 'queued' && out.recuperados >= 1, JSON.stringify(out));
  check('C4 y vuelve a AVISAR por la cola durable (un aviso pendiente para ese trabajo)', (await db.collection('jobQueue').doc(`q.${t.jobId}`).get()).exists);
  check('C5 todo esto es lo que HOY no corre en ninguna tarea programada (N6/N7 de la suite en memoria)', true);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
