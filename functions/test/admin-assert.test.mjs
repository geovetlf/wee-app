/**
 * `assertAdmin`, POR SÍ SOLO.
 *
 *   node test/admin-assert.test.mjs        (después de `npm run build`: usa lib/)
 *
 * Debilitar `assertAdmin` no abría ningún acceso, porque la puerta común (`admin/autorizacion.ts`) repite el filtro, y por
 * eso ninguna suite se enteraba: era una capa sin prueba propia. Aquí se prueba sola, sin la puerta:
 *
 *   A · quién pasa;
 *   B · una cuenta normal;
 *   C · sin sesión o sin claims;
 *   D · claims incompletos;
 *   E · claims inválidos o incoherentes, y la lista `WEE_ADMIN_UIDS`;
 *   F · `assertAdmin` e `isAdmin` dicen lo mismo, y el error no cuenta nada;
 *   G · cada uno de los ocho usos corta de verdad, antes de leer Auth o escribir nada;
 *   H · no hay más usos ni otra comprobación de administración escondida.
 *
 * Lo que NO decide `assertAdmin` (el rol, las bajas, la revocación) es de la puerta y está en `admin-seguridad`. Los
 * sabotajes de esta suite están en `_sabotajes-admin.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { administracionDePrueba } from './_admin-de-prueba.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const silenciar = async (fn) => {
  const { warn, error } = console; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { console.warn = warn; console.error = error; }
};

/* Si un sabotaje deja pasar a alguien hasta Firestore, que falle aquí y no salga a ninguna red. */
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:9';
delete process.env.WEE_ADMIN_UIDS;
delete process.env.WEE_ADMIN_SIN_ROL;

const { getApps, initializeApp } = require(path.resolve(here, '../node_modules/firebase-admin/lib/app/index.js'));
if (!getApps().length) initializeApp({ projectId: 'demo-wee' });
const { assertAdmin, isAdmin } = lib('shared/admin.js');
const P = lib('admin/permisos.js');

const MENSAJE = 'Solo administración';
const conLista = (valor, fn) => {
  const antes = process.env.WEE_ADMIN_UIDS;
  process.env.WEE_ADMIN_UIDS = valor;
  try { return fn(); } finally { if (antes === undefined) delete process.env.WEE_ADMIN_UIDS; else process.env.WEE_ADMIN_UIDS = antes; }
};
/** Lo que hace `assertAdmin` con esa sesión: `'pasa'` o el código del error. */
const veredicto = (auth) => {
  try { assertAdmin(auth); return 'pasa'; } catch (e) { return e?.code ?? `lanzó otra cosa: ${e}`; }
};
const uid = 'persona-1';
const sesion = (token) => ({ uid, token });
const NORMAL = { email: 'persona@example.com', email_verified: true, auth_time: 1, firebase: { sign_in_provider: 'password', identities: {} } };

console.log('\n── A · Administración autorizada');
check('A1) claim admin: true', veredicto(sesion({ admin: true })) === 'pasa');
check('A2) claim admin: true entre otros claims', veredicto(sesion({ ...NORMAL, admin: true })) === 'pasa');
check('A3) admin: true con rol owner', veredicto(sesion({ admin: true, weeRole: 'owner' })) === 'pasa');
check('A4) uid en la lista, sin claims', conLista(uid, () => veredicto(sesion({}))) === 'pasa');
check('A5) uid en la lista, sin token', conLista(uid, () => veredicto({ uid })) === 'pasa');
check('A6) la lista admite varios y espacios alrededor', conLista(` otra , ${uid} ,tercera`, () => veredicto(sesion({}))) === 'pasa');
check('A7) devuelve undefined: no es una sesión ni un permiso', assertAdmin(sesion({ admin: true })) === undefined);

console.log('\n── B · Cuenta normal');
check('B1) cuenta normal: permission-denied', veredicto(sesion(NORMAL)) === 'permission-denied');
check('B2) también si hay lista y no está en ella', conLista('otra,tercera', () => veredicto(sesion(NORMAL))) === 'permission-denied');
check('B3) un dominio de correo no da nada', veredicto(sesion({ ...NORMAL, email: 'admin@wee.zone' })) === 'permission-denied');

console.log('\n── C · Sin sesión o sin claims');
check('C1) undefined: unauthenticated', veredicto(undefined) === 'unauthenticated');
check('C2) null: unauthenticated', veredicto(null) === 'unauthenticated');
check('C3) sesión sin token', veredicto({ uid }) === 'permission-denied');
check('C4) token vacío', veredicto(sesion({})) === 'permission-denied');
check('C5) token null', veredicto(sesion(null)) === 'permission-denied');
check('C6) objeto vacío: ni uid ni token', veredicto({}) === 'permission-denied');

console.log('\n── D · Claims incompletos');
for (const [n, token] of [
  ['weeRole: owner sin admin', { weeRole: 'owner' }],
  ['weeRole: admin sin admin', { weeRole: 'admin' }],
  ['isAdmin: true', { isAdmin: true }],
  ['role: admin', { role: 'admin' }],
  ['Admin: true (otra mayúscula)', { Admin: true }],
  ['admins: true', { admins: true }],
  ['claims anidados', { claims: { admin: true } }],
  ['dentro de firebase', { firebase: { admin: true } }],
]) check(`D) ${n}: permission-denied`, veredicto(sesion(token)) === 'permission-denied');
check('D9) user_id o sub de la lista no cuentan: se mira el uid de la sesión', conLista('otra', () => veredicto(sesion({ user_id: 'otra', sub: 'otra' }))) === 'permission-denied');

console.log('\n── E · Claims inválidos o incoherentes');
for (const [n, valor] of [
  ["'true'", 'true'], ["'1'", '1'], ["'yes'", 'yes'], ['1', 1], ['[true]', [true]], ['{ value: true }', { value: true }],
  ['null', null], ['0', 0], ['false', false], ["'false'", 'false'], ["''", ''], ['NaN', NaN], ['new Boolean(true)', new Boolean(true)],
]) check(`E) admin: ${n}: permission-denied`, veredicto(sesion({ admin: valor })) === 'permission-denied');
check('E14) un __proto__ en el JSON del token no da admin', veredicto(sesion(JSON.parse('{"__proto__":{"admin":true}}'))) === 'permission-denied');
check('E15) admin: false con rol owner', veredicto(sesion({ admin: false, weeRole: 'owner' })) === 'permission-denied');
check('E16) la lista no se compara por trozos', conLista('persona-10,xpersona-1,persona', () => veredicto(sesion({}))) === 'permission-denied');
check('E17) la lista distingue mayúsculas', conLista(uid.toUpperCase(), () => veredicto(sesion({}))) === 'permission-denied');
check('E18) un asterisco en la lista no es un comodín', conLista('*', () => veredicto(sesion({}))) === 'permission-denied');
check('E19) lista vacía', conLista('', () => veredicto(sesion({}))) === 'permission-denied');
check('E20) una lista de comas y espacios no admite el uid vacío', conLista(' , ,', () => veredicto({ uid: '', token: {} })) === 'permission-denied');
check('E21) un uid que no es texto no se encuentra en la lista', conLista(uid, () => veredicto({ uid: [uid], token: {} })) === 'permission-denied');
check('E22) la lista se lee en cada llamada: al salir de ella, deja de pasar', conLista(uid, () => veredicto(sesion({}))) === 'pasa' && veredicto(sesion({})) === 'permission-denied');
/* Dos incoherencias que `assertAdmin` deja pasar a propósito: se fijan para que cambiarlas sea una decisión. */
check('E23) INCOHERENTE: en la lista con admin: false pasa; la lista manda sobre el claim', conLista(uid, () => veredicto(sesion({ admin: false }))) === 'pasa');
const inventado = sesion({ admin: true, weeRole: 'inventado' });
check('E24) INCOHERENTE: admin con un rol que no existe pasa aquí, y la puerta lo para', veredicto(inventado) === 'pasa' && P.rolDe(inventado) === null && !P.esLegado(inventado));

console.log('\n── F · Coherencia');
const casos = [undefined, null, {}, { uid }, sesion(null), sesion({}), sesion(NORMAL), sesion({ admin: true }), sesion({ admin: 'true' }), sesion({ weeRole: 'owner' })];
check('F1) pasa si y solo si isAdmin', casos.every((a) => (veredicto(a) === 'pasa') === isAdmin(a)));
check('F2) con la lista, igual', conLista(uid, () => casos.every((a) => (veredicto(a) === 'pasa') === isAdmin(a))));
const error = (auth) => { try { assertAdmin(auth); return null; } catch (e) { return e; } };
const denegado = error(sesion({ ...NORMAL, admin: 'true' }));
check('F3) el rechazo es un HttpsError con su mensaje', denegado?.httpErrorCode?.status === 403 && denegado?.message === MENSAJE);
check('F4) sin sesión, 401', error(undefined)?.httpErrorCode?.status === 401);
check('F5) el error no cuenta ni el uid ni los claims ni la lista', conLista('uid-secreto', () => {
  const t = JSON.stringify({ m: denegado.message, d: denegado.details ?? null, n: error(sesion(NORMAL))?.message });
  return !t.includes(uid) && !t.includes('uid-secreto') && !t.includes('persona@example.com') && !t.includes('weeRole');
}));
check('F6) no modifica la sesión que recibe', (() => { const s = sesion({ admin: true }); const antes = JSON.stringify(s); assertAdmin(s); return JSON.stringify(s) === antes; })());

console.log('\n── G · Los ocho usos cortan de verdad');
const credits = lib('credits/index.js');
const { engineAdmin } = lib('engine/admin.js');
const { moderationAdmin } = lib('moderation/index.js');
const { evalRun, ejecutarEvalRun } = lib('evals/index.js');
const { mediaCanary } = lib('media/canary.js');
const A = administracionDePrueba(lib);
const CALLABLES = [
  ['spendCredits', credits.spendCredits, { service: 'ai_brain', requestId: 'job_abcd1234' }],
  ['grantCredits', credits.grantCredits, { userId: 'bea', amount: 1, requestId: 'r1' }],
  ['refundCredits', credits.refundCredits, { userId: 'bea', requestId: 'r1' }],
  ['creditsAdmin', credits.creditsAdmin, { action: 'stats' }],
  ['engineAdmin', engineAdmin, { action: 'status' }],
  ['mediaCanary', mediaCanary, { accion: 'listar' }],
  ['moderationAdmin', moderationAdmin, { action: 'list' }],
];
const llamar = (fn, auth, data) => silenciar(() => fn.run({ auth, data }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code, message: e?.message })));
const limpiar = () => { A.consultasAuth = 0; A.entradas.length = 0; };
const sinTocarNada = () => A.consultasAuth === 0 && A.entradas.length === 0;

for (const [nombre, fn, data] of CALLABLES) {
  limpiar();
  /* El mensaje es lo que distingue a `assertAdmin` de la puerta, que contesta otro: quitar el uso cambia la respuesta. */
  const normal = await llamar(fn, sesion(NORMAL), data);
  check(`G) ${nombre}: la cuenta normal la para assertAdmin, sin leer Auth ni escribir`, !normal.ok && normal.code === 'permission-denied' && normal.message === MENSAJE && sinTocarNada(), normal.message);
  limpiar();
  const anonima = await llamar(fn, undefined, data);
  check(`G) ${nombre}: sin sesión, unauthenticated, sin leer Auth ni escribir`, !anonima.ok && anonima.code === 'unauthenticated' && sinTocarNada(), anonima.code);
  limpiar();
  const invalida = await llamar(fn, sesion({ admin: 'true', weeRole: 'owner' }), data);
  check(`G) ${nombre}: admin: 'true' con rol owner, igual`, !invalida.ok && invalida.message === MENSAJE && sinTocarNada(), invalida.message);
  limpiar();
  /* CONTROL: sin este, lo anterior también pasaría con una callable que lo rechazara todo. Support no tiene ninguno de estos permisos. */
  A.claims = { admin: true, weeRole: 'support' };
  const control = await llamar(fn, sesion({ admin: true, weeRole: 'support' }), data);
  check(`G) ${nombre}: CONTROL, administración pasa de assertAdmin y llega a la puerta, que relee Auth`, A.consultasAuth === 1 && !control.ok && control.code === 'permission-denied' && control.message !== MENSAJE, control.message);
}

/* `evalRun` va al revés que las demás: la puerta primero y `assertAdmin` dentro, en `ejecutarEvalRun`, que también se exporta. */
limpiar();
const puertaEval = await llamar(evalRun, sesion(NORMAL), {});
check('G) evalRun: la cuenta normal la para la puerta común, antes de leer Auth', !puertaEval.ok && puertaEval.code === 'permission-denied' && puertaEval.message !== MENSAJE && sinTocarNada(), puertaEval.message);
const directo = (auth) => silenciar(() => Promise.race([
  ejecutarEvalRun(auth, {}).then((v) => ({ ok: true, v }), (e) => ({ ok: false, code: e?.code, message: e?.message })),
  new Promise((r) => setTimeout(() => r({ ok: false, code: 'colgada', message: 'llegó a leer el presupuesto' }), 3000)),
]));
const evalNormal = await directo(sesion(NORMAL));
check('G) ejecutarEvalRun: la cuenta normal la para assertAdmin, antes de leer el presupuesto', !evalNormal.ok && evalNormal.code === 'permission-denied' && evalNormal.message === MENSAJE, evalNormal.message);
const evalAnonima = await directo(undefined);
check('G) ejecutarEvalRun: sin sesión, unauthenticated', !evalAnonima.ok && evalAnonima.code === 'unauthenticated', evalAnonima.code);
A.restaurar();

console.log('\n── H · No hay más usos ni otra comprobación');
const SRC = path.resolve(here, '../src');
const fuentes = fs.readdirSync(SRC, { recursive: true }).map((f) => String(f).split(path.sep).join('/')).filter((f) => f.endsWith('.ts'));
const cuenta = (re) => Object.fromEntries(fuentes.map((f) => [f, (fs.readFileSync(path.join(SRC, f), 'utf8').match(re) || []).length]).filter(([, n]) => n > 0));
const igual = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const USOS = { 'credits/index.ts': 4, 'engine/admin.ts': 1, 'evals/index.ts': 1, 'media/canary.ts': 1, 'moderation/index.ts': 1 };
const usos = cuenta(/\bassertAdmin\(/g);
delete usos['shared/admin.ts'];
check('H1) exactamente los ocho usos conocidos; uno nuevo se añade aquí a propósito', igual(usos, USOS), JSON.stringify(usos));
const miradas = cuenta(/\bisAdmin\(/g);
check('H2) isAdmin solo se mira en la guarda y en la puerta', igual(miradas, { 'admin/autorizacion.ts': 2, 'admin/permisos.ts': 2, 'shared/admin.ts': 1 }), JSON.stringify(miradas));
const directos = cuenta(/\btoken\??\.admin\b/g);
check('H3) el claim solo se lee en un sitio', igual(directos, { 'shared/admin.ts': 1 }), JSON.stringify(directos));
const lista = cuenta(/process\.env\.WEE_ADMIN_UIDS/g);
check('H4) la lista solo se lee en un sitio', igual(lista, { 'shared/admin.ts': 1 }), JSON.stringify(lista));

console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : '\nassertAdmin decide bien por sí solo, y cada uso corta antes de tocar nada.');
process.exit(failures ? 1 : 0);
