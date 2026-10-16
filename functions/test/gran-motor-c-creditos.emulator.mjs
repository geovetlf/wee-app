/**
 * GRAN MOTOR · PAQUETE C — LA CONCURRENCIA DEL DINERO CONTRA FIRESTORE DE VERDAD (emulador).
 *
 * `gran-motor-c-creditos.test.mjs` prueba las reglas con un almacén en memoria. Aquí lo
 * que cambia es el almacén: las transacciones REALES de Firestore (el emulador), con sus
 * lecturas optimistas y sus reintentos cuando dos transacciones tocan el mismo documento.
 * El Credit Engine y la liquidación del Core Runtime son los de producción (lib/); lo único
 * de mentira es el libro de generaciones (no se mide aquí) y la red está cortada.
 *
 *   firebase emulators:exec --only firestore --project demo-wee-filmmaker "node functions/test/gran-motor-c-creditos.emulator.mjs"
 *
 * Solo proyectos demo-*; nunca toca ningún dato real.
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
const { creditEngine: motor } = lib('credits/creditEngine.js');
const { liquidacionDeWee } = lib('runtime/index.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const codeOf = (p) => p.then(() => 'ok', (e) => e?.code ?? `ERR:${e?.message}`);
const marca = Date.now().toString(36);
const persona = async (nombre, saldo) => {
  const uid = `gmc${nombre}${marca}`.slice(0, 40);
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: nombre });
  await motor.ensureAccount(uid);
  const actual = (await motor.getBalance(uid)).balance;
  if (saldo > actual) await motor.grantCredits({ userId: uid, amount: saldo - actual, requestId: `regalo_${uid}`, reason: 'saldo de prueba', source: 'test' });
  return uid;
};
const saldoDe = async (uid) => (await motor.getBalance(uid)).balance;
const tx = async (id) => (await db.collection('creditTransactions').doc(id).get()).data();
const delUsuario = async (uid) => (await db.collection('creditTransactions').where('userId', '==', uid).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const gasta = (uid, id, amount = 10) => motor.spendCredits({ userId: uid, service: 'ai_image', requestId: id, amount, source: 'test' });
const espejoDe = async (uid) => (await db.collection('users').doc(`doc_${uid}`).get()).data()?.creditsBalance;
const cuentaDe = async (uid) => (await db.collection('creditAccounts').doc(uid).get()).data()?.creditsBalance;
/* Todo lo que ocurre en una cuenta cuadra: saldo = lo que dicen sus asientos, y cuenta y espejo coinciden. */
const cuadra = async (uid) => {
  const asientos = await delUsuario(uid);
  const suma = asientos.reduce((s, t) => s + (t.amount || 0), 0);
  const saldo = await cuentaDe(uid);
  return saldo === suma && saldo === await espejoDe(uid) && saldo >= 0;
};

console.log('\n── A · el mismo requestId, a la vez, contra transacciones reales ──');
{
  const u = await persona('A', 240);
  const r = await Promise.all(Array.from({ length: 8 }, () => gasta(u, `job_a_${marca}`, 25)));
  check('A1 ocho llamadas simultáneas con el mismo requestId: exactamente una cobra', r.filter((x) => !x.duplicate).length === 1);
  check('A1 saldo 215, un solo asiento de uso, todo cuadra', (await saldoDe(u)) === 215 && (await delUsuario(u)).filter((t) => t.type === 'usage').length === 1 && await cuadra(u));
}

console.log('\n── B · saldo insuficiente concurrente ──');
{
  const u = await persona('B', 240);
  const r = await Promise.all(['bb_1', 'bb_2', 'bb_3', 'bb_4', 'bb_5', 'bb_6'].map((id) => codeOf(gasta(u, `${id}_${marca}`, 100))));
  check('B1 con 240 y seis gastos de 100 pasan exactamente dos', r.filter((x) => x === 'ok').length === 2 && r.filter((x) => x === 'INSUFFICIENT_CREDITS').length === 4, r.join(','));
  check('B1 saldo 5 y todo cuadra', (await saldoDe(u)) === 40 && await cuadra(u));
}

console.log('\n── C · completar contra reembolsar ──');
for (let ronda = 0; ronda < 6; ronda++) {
  const u = await persona(`C${ronda}`, 240); const id = `job_c_${ronda}_${marca}`;
  await gasta(u, id, 30);
  const completar = () => codeOf(motor.completeCredits({ userId: u, requestId: id, finalAmount: 12 }));
  const reembolsar = () => codeOf(motor.refundCredits({ userId: u, requestId: id, reason: 'falló' }));
  const r = ronda % 2 ? await Promise.all([completar(), reembolsar()]) : (await Promise.all([reembolsar(), completar()])).reverse();
  const est = (await tx(`usage_${id}`)).status; const s = await saldoDe(u);
  check(`C${ronda} gana uno solo (${est}) y el saldo es el de ese desenlace`, (est === 'COMPLETED' && s === 228 && r[1] === 'NOT_REFUNDABLE') || (est === 'REFUNDED' && s === 240), `${est} saldo ${s} ${r}`);
  check(`C${ronda} todo cuadra`, await cuadra(u));
}
{
  const u = await persona('C2', 240); const id = `job_c2_${marca}`; await gasta(u, id, 40);
  const r = await Promise.all([1, 2, 3, 4, 5].map(() => motor.refundCredits({ userId: u, requestId: id, reason: 'x' })));
  check('C2 cinco reembolsos simultáneos devuelven una sola vez', r.filter((x) => !x.duplicate).length === 1 && (await saldoDe(u)) === 240 && await cuadra(u));
  const u2 = await persona('C3', 240); const id2 = `job_c3_${marca}`; await gasta(u2, id2, 40);
  const c = await Promise.all([1, 2, 3, 4].map(() => motor.completeCredits({ userId: u2, requestId: id2, finalAmount: 25 })));
  check('C3 cuatro cierres simultáneos con ajuste devuelven la diferencia una sola vez', c.filter((x) => x.refunded === 15).length === 1 && (await saldoDe(u2)) === 215 && await cuadra(u2));
}

console.log('\n── D · la liquidación del Core Runtime sobre la misma reserva ──');
{
  const filas = [];
  const puerto = liquidacionDeWee({ credits: motor, ledger: { settle: async (p) => { filas.push(p); return {}; }, closeAccepted: async () => ({}) }, cupo: { liberar: async () => {} } });
  const reserva = (id) => ({ requestId: id, transactionId: `usage_${id}`, importe: 30 });
  const u = await persona('D', 240); const id = `job_d_${marca}`; await gasta(u, id, 30);
  const r = await Promise.all([
    puerto.liquidar({ userId: u, reserva: reserva(id), importe: 30, jobId: 'j' }),
    puerto.reembolsar({ userId: u, reserva: reserva(id), motivo: 'fallo_definitivo', jobId: 'j' }),
    puerto.liquidar({ userId: u, reserva: reserva(id), importe: 30, jobId: 'j' }),
    puerto.reembolsar({ userId: u, reserva: reserva(id), motivo: 'fallo_definitivo', jobId: 'j' }),
  ]);
  const est = (await tx(`usage_${id}`)).status; const s = await saldoDe(u);
  check('D1 liquidar y reembolsar x2 a la vez: gana un desenlace y el dinero se mueve una vez', (est === 'COMPLETED' && s === 210) || (est === 'REFUNDED' && s === 240), `${est} saldo ${s}`);
  check('D1 ninguna de las cuatro cuenta como fallo', r.every((x) => x.desenlace !== 'fallo'), JSON.stringify(r.map((x) => x.desenlace)));
  check('D1 el libro nunca recibe un cobro distinto de lo que quedó cobrado', filas.every((f) => f.finalAmount === (est === 'COMPLETED' ? 30 : 0)));
  check('D1 todo cuadra', await cuadra(u));
}

console.log('\n── E · cierre tardío tras reembolso y reuso del requestId ──');
{
  const u = await persona('E', 240); const id = `job_e_${marca}`; await gasta(u, id, 30);
  await motor.refundCredits({ userId: u, requestId: id, reason: 'barrido' });
  const tarde = await motor.completeCredits({ userId: u, requestId: id, finalAmount: 30 });
  check('E1 un cierre tardío tras el reembolso no cobra', tarde.status === 'REFUNDED' && (await saldoDe(u)) === 240);
  check('E2 el requestId reembolsado no se reutiliza', (await codeOf(gasta(u, id, 30))) === 'ALREADY_REFUNDED' && (await saldoDe(u)) === 240 && await cuadra(u));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
