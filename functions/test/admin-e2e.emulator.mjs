/**
 * DE PUNTA A PUNTA, CON TOKENS REALES DEL EMULADOR DE AUTH CONTRA EL EMULADOR DE FUNCTIONS: la verificación real del `onCall`,
 * la relectura en Auth, el libro real y las compras cerradas. Sin archivos personales ni datos reales: las cuentas y sus
 * contraseñas se crean aquí, al azar, y mueren con el emulador.
 *
 *   firebase emulators:exec --only auth,firestore,functions --project demo-wee "node functions/test/admin-e2e.emulator.mjs"
 *
 *   A · Sin sesión, sesión normal y cada rol, contra las callables de verdad.
 *   B · Dinero: el owner da Credits, queda constancia, el mismo `requestId` no paga dos veces.
 *   C · Revocación: el MISMO token deja de valer sin renovarse.
 *   D · Compras cerradas: ningún proveedor ni paquete antiguo mueve el saldo ni escribe en el libro.
 */
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const mod = (p) => require(path.resolve(here, '../node_modules', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const hub = process.env.FIREBASE_EMULATOR_HUB;
if (!hub) { console.log('✘ sin emuladores no se corre: falta FIREBASE_EMULATOR_HUB'); process.exit(1); }
const emuladores = await (await fetch(`http://${hub}/emulators`)).json();
const donde = (e) => `${e.host === '0.0.0.0' || e.host === '::' ? '127.0.0.1' : e.host}:${e.port}`;
const AUTH = `http://${donde(emuladores.auth)}/identitytoolkit.googleapis.com/v1`;
const FN = `http://${donde(emuladores.functions)}/${PROY}/us-central1`;

const { initializeApp } = mod('firebase-admin/lib/app/index.js');
const { getAuth } = mod('firebase-admin/lib/auth/index.js');
const { getFirestore } = mod('firebase-admin/lib/firestore/index.js');
initializeApp({ projectId: PROY });
const auth = getAuth();
const db = getFirestore();

const post = async (u, b, h = {}) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) })).json();
const llamar = async (fn, data, token) => {
  const j = await post(`${FN}/${fn}`, { data }, token ? { authorization: `Bearer ${token}` } : {});
  return j.error ? { error: j.error.status } : { ok: j.result };
};
const sufijo = randomBytes(3).toString('hex');
const crear = async (nombre, claims) => {
  const email = `${nombre}-${sufijo}@demo-wee.local`;
  const password = randomBytes(12).toString('base64url');
  const u = await auth.createUser({ email, password, emailVerified: true });
  if (claims) await auth.setCustomUserClaims(u.uid, claims);
  const r = await post(`${AUTH}/accounts:signInWithPassword?key=x`, { email, password, returnSecureToken: true });
  return { uid: u.uid, token: r.idToken };
};

const owner = await crear('owner', { admin: true, weeRole: 'owner' });
const soporte = await crear('soporte', { admin: true, weeRole: 'support' });
const finanzas = await crear('finanzas', { admin: true, weeRole: 'finance' });
const operaciones = await crear('operaciones', { admin: true, weeRole: 'operations' });
const legado = await crear('legado', { admin: true });
const normal = await crear('normal');

console.log('\n── A · Quién puede ──');
{
  const dar = { userId: normal.uid, amount: 1, requestId: `e2e_d_${sufijo}` };
  check('A1) sin sesión: unauthenticated', (await llamar('grantCredits', dar)).error === 'UNAUTHENTICATED');
  check('A2) sesión normal: denegado', (await llamar('grantCredits', dar, normal.token)).error === 'PERMISSION_DENIED');
  check('A3) soporte con admin:true no da Credits', (await llamar('grantCredits', dar, soporte.token)).error === 'PERMISSION_DENIED');
  check('A4) soporte no cambia el motor', (await llamar('engineAdmin', { action: 'setSettings', iaDetenida: true }, soporte.token)).error === 'PERMISSION_DENIED');
  check('A5) soporte busca cuentas', (await llamar('accountsAdmin', { action: 'buscar', uid: normal.uid }, soporte.token)).ok?.encontrada === true);
  check('A6) finanzas lee estadísticas', !!(await llamar('creditsAdmin', { action: 'stats' }, finanzas.token)).ok);
  check('A7) finanzas no ve el motor', (await llamar('engineAdmin', { action: 'status' }, finanzas.token)).error === 'PERMISSION_DENIED');
  const estado = await llamar('engineAdmin', { action: 'status' }, operaciones.token);
  check('A8) operaciones ve el estado del motor sin márgenes', !!estado.ok && !/margin|creditsPerUsd/i.test(JSON.stringify(estado.ok)));
  const entero = await llamar('engineAdmin', { action: 'status' }, owner.token);
  check('A9) el owner lo ve entero', /margin/.test(JSON.stringify(entero.ok)));
  check('A10) el legado conserva lo antiguo', !!(await llamar('engineAdmin', { action: 'status' }, legado.token)).ok);
  check('A11) y no gana opsAdmin', (await llamar('opsAdmin', { action: 'trabajos' }, legado.token)).error === 'PERMISSION_DENIED');
  check('A12) quienSoy dice el rol vigente', (await llamar('opsAdmin', { action: 'quienSoy' }, soporte.token)).ok?.rol === 'support');
}

console.log('\n── B · Dinero, con rastro ──');
await db.collection('users').doc(normal.uid).set({ uid: normal.uid, profileType: 'real' });
const inicial = await llamar('getCreditsBalance', {}, normal.token);
const saldoInicial = inicial.ok?.balance;
{
  const requestId = `e2e_${sufijo}`;
  const dio = await llamar('grantCredits', { userId: normal.uid, amount: 5, reason: 'prueba', requestId }, owner.token);
  check('B1) el owner da Credits', dio.ok?.balanceAfter === saldoInicial + 5, JSON.stringify(dio).slice(0, 120));
  const reg = (await db.collection('adminAudit').where('metadatos.requestId', '==', requestId).get()).docs.map((d) => d.data());
  check('B2) intento y ok, con actor y rol; el cierre dice qué transacción', reg.map((e) => e.resultado).sort().join() === 'intento,ok' && reg[0].actorUid === owner.uid && reg[0].actorRol === 'owner' && reg.find((e) => e.resultado === 'ok').metadatos.resultadoTransaccion === `grant_${requestId}`);
  const otra = await llamar('grantCredits', { userId: normal.uid, amount: 5, requestId }, owner.token);
  check('B3) el mismo requestId no paga dos veces, y el cierre lo dice', otra.ok?.duplicate === true && (await llamar('getCreditsBalance', {}, normal.token)).ok?.balance === saldoInicial + 5);
  const colada = await llamar('grantCredits', { userId: [normal.uid], amount: [1000], requestId: `e2e_a_${sufijo}` }, owner.token);
  check('B4) con arrays no se mueve nada', colada.error === 'INVALID_ARGUMENT' && (await llamar('getCreditsBalance', {}, normal.token)).ok?.balance === saldoInicial + 5, colada.error);
}

console.log('\n── C · El mismo token deja de valer ──');
{
  await auth.setCustomUserClaims(owner.uid, { admin: true, weeRole: 'support' });
  check('C1) rol rebajado: rechazado sin renovar el token', (await llamar('grantCredits', { userId: normal.uid, amount: 1, requestId: `e2e_c_${sufijo}` }, owner.token)).error === 'PERMISSION_DENIED');
  await auth.setCustomUserClaims(owner.uid, { admin: true, weeRole: 'owner' });
  check('C2) rol devuelto: vuelve a valer, sin caché', (await llamar('opsAdmin', { action: 'quienSoy' }, owner.token)).ok?.rol === 'owner');
  await auth.updateUser(owner.uid, { disabled: true });
  const deshabilitada = await llamar('opsAdmin', { action: 'quienSoy' }, owner.token);
  check('C3) cuenta deshabilitada: fuera', !!deshabilitada.error, deshabilitada.error);
  await auth.updateUser(owner.uid, { disabled: false });
  await new Promise((r) => setTimeout(r, 1100));
  await auth.revokeRefreshTokens(owner.uid);
  check('C4) sesiones revocadas: token ya emitido rechazado', (await llamar('opsAdmin', { action: 'quienSoy' }, owner.token)).error === 'UNAUTHENTICATED');
}

console.log('\n── D · Compras cerradas ──');
{
  const movimientos = async () => (await db.collection('creditTransactions').where('userId', '==', normal.uid).get()).size;
  const antes = await movimientos();
  const saldo = (await llamar('getCreditsBalance', {}, normal.token)).ok?.balance;
  const respuestas = [];
  for (const provider of ['test', 'apple', 'google', 'stripe']) {
    for (const packageId of [undefined, 'basic', 'blackpro', 'zone.wee.credits.blackpro']) {
      respuestas.push((await llamar('validatePurchase', { provider, packageId, payload: { receipt: 'x' } }, normal.token)).error);
    }
    respuestas.push((await llamar('restorePurchase', { provider, payload: { receipt: 'x' } }, normal.token)).error);
  }
  check(`D1) las ${respuestas.length} compras y restauraciones responden UNIMPLEMENTED`, respuestas.every((e) => e === 'UNIMPLEMENTED'), [...new Set(respuestas)].join());
  check('D2) el saldo no cambia', (await llamar('getCreditsBalance', {}, normal.token)).ok?.balance === saldo);
  check('D3) y el libro no tiene ni un movimiento más', (await movimientos()) === antes);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
/* Sin process.exit: en Windows, cortar con conexiones de fetch abiertas aborta el proceso (libuv) con todo en verde. */
process.exitCode = failures ? 1 : 0;
await db.terminate();
