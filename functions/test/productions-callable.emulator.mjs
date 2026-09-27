/**
 * F1-B · LA CALLABLE `productions`, SERVIDA POR EL RUNTIME DE FUNCTIONS.
 *
 * `runtime-map` demuestra que `index.ts` la exporta y la clasifica. Esto demuestra
 * lo otro: que el runtime de Functions —cargando el mismo `functions/lib/index.js`
 * que se desplegaría— la encuentra por su nombre y la atiende con sus guardas.
 * Sin sesión no hay nada, la cuenta sale de la sesión y no de los datos, lo ajeno
 * no existe y el CAS contesta `aborted`. Es lo que F1-C va a llamar.
 *
 * NO está en `npm test` a propósito: necesita los emuladores de Functions y de
 * Firestore (Java 21). Desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only functions,firestore --project demo-wee-filmmaker \
 *     "node functions/test/productions-callable.emulator.mjs"
 *
 * Se NIEGA a correr sin emuladores y contra el proyecto de producción. Con un
 * proyecto `demo-` el CLI no toca ningún servicio real, y `productions` no declara
 * secretos: el emulador no intenta leer ninguno para atenderla. No despliega nada.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const PROY = process.env.GCLOUD_PROJECT || 'demo-wee-filmmaker';
const hub = process.env.FIREBASE_EMULATOR_HUB;
if (!process.env.FIRESTORE_EMULATOR_HOST || !hub) { console.log('✘ sin emuladores no se corre: faltan FIRESTORE_EMULATOR_HOST o FIREBASE_EMULATOR_HUB'); process.exit(1); }
if (PROY === 'get-wee' || !PROY.startsWith('demo-')) { console.log(`✘ solo contra un proyecto de demostración, nunca contra «${PROY}»`); process.exit(1); }

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Dónde está el emulador de Functions: se le pregunta al hub, no se supone ── */
const emuladores = await (await fetch(`http://${hub}/emulators`)).json();
const fn = emuladores.functions;
check('el hub dice que el emulador de Functions está en marcha', !!fn && !!fn.port, JSON.stringify(Object.keys(emuladores)));
const host = fn ? `${fn.host === '0.0.0.0' || fn.host === '::' ? '127.0.0.1' : fn.host}:${fn.port}` : '127.0.0.1:5001';
const URL_DE_LA_CALLABLE = `http://${host}/${PROY}/us-central1/productions`;

/** Una sesión de Firebase Auth sin firmar: en el emulador, las callables no verifican firmas. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const ahora = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: ahora,
    user_id: uid, sub: uid, iat: ahora, exp: ahora + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  })}.`;
};
/** Llamar como lo hace el SDK de cliente: POST con `{ data }`, y la sesión en la cabecera. */
const llamar = async (uid, data) => {
  const res = await fetch(URL_DE_LA_CALLABLE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${sesion(uid)}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const cuerpo = await res.json().catch(() => null);
  return { http: res.status, result: cuerpo?.result, error: cuerpo?.error };
};

const admin = require(path.resolve(RAIZ, 'functions/node_modules/firebase-admin/lib/index.js'));
if (!admin.apps.length) admin.initializeApp({ projectId: PROY });
const db = admin.firestore();

const A = 'cuentaAcallable';
const B = 'cuentaBcallable';
const sufijo = String(Date.now()).padStart(16, '0');
const pid = (k) => `prod${k}${sufijo}`;

/* ═══════════════════════════════════════════════════════════════════════════ */

console.log('\n── La callable, resuelta por el runtime ──');
const sinSesion = await llamar(null, { op: 'list' });
check('sin sesión, el runtime la resuelve y contesta `unauthenticated`: la guarda está en lo que se sirve',
  sinSesion.http === 401 && sinSesion.error?.status === 'UNAUTHENTICATED' && sinSesion.error?.message === 'session_required', `HTTP ${sinSesion.http}`);

const creada = await llamar(A, { op: 'create', productionId: pid(1), title: 'Desde el emulador', aspectRatio: '9:16', ownerAccountId: B, accountId: B });
const raiz = (await db.doc(`productions/${pid(1)}`).get()).data();
check('con sesión, crea: la producción existe en Firestore y es de la cuenta de la SESIÓN, no de la que venía en los datos',
  creada.http === 200 && creada.result?.created === true && creada.result?.productionId === pid(1) && raiz?.ownerAccountId === A && raiz?.status === 'active',
  `HTTP ${creada.http}`);

const leida = await llamar(A, { op: 'get', productionId: pid(1) });
check('la dueña la lee por la callable, con su revisión 0', leida.http === 200 && leida.result?.production?.id === pid(1) && leida.result?.revision === 0);

const ajena = await llamar(B, { op: 'get', productionId: pid(1) });
check('otra cuenta no: `not-found`, igual que si no existiera', ajena.http === 404 && ajena.error?.status === 'NOT_FOUND' && ajena.error?.message === 'production_not_found', `HTTP ${ajena.http}`);

const lote = await llamar(A, { op: 'apply', productionId: pid(1), expectedRevision: 0, operations: [{ op: 'add_scene', scene: { id: 'sc-0001', durationSec: 4 } }] });
check('un lote entra y sube una revisión', lote.http === 200 && lote.result?.revision === 1 && lote.result?.applied === 1);
const tarde = await llamar(A, { op: 'apply', productionId: pid(1), expectedRevision: 0, operations: [{ op: 'change_weather', sceneId: 'sc-0001', weather: 'rain' }] });
check('uno escrito sobre una revisión vieja: `aborted`, con la revisión que hay', tarde.http === 409 && tarde.error?.status === 'ABORTED' && tarde.error?.details?.currentRevision === 1, `HTTP ${tarde.http}`);

const lista = await llamar(A, { op: 'list' });
check('la lista de la cuenta la trae, sin escenas ni planos', lista.http === 200 && Array.isArray(lista.result?.productions)
  && lista.result.productions.some((p) => p.productionId === pid(1) && !('production' in p) && !('scenes' in p)));

const desconocida = await llamar(A, { op: 'borrar_todo' });
check('una operación que no existe es `invalid-argument`, sin frases', desconocida.http === 400 && desconocida.error?.status === 'INVALID_ARGUMENT' && desconocida.error?.message === 'operation_unknown');

console.log('\n── Limpieza ──');
await db.recursiveDelete(db.doc(`productions/${pid(1)}`));
check('lo escrito por esta prueba se borra del emulador', !(await db.doc(`productions/${pid(1)}`).get()).exists);

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ la callable \`productions\`, servida por el runtime del emulador: ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
