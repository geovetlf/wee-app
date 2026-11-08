/*
 * PRIVACIDAD DE IDENTIDADES, EJECUTADA EN EL EMULADOR (decisión STRICT del dueño, 2026-11-07).
 *
 * Compone las reglas de la FASE 2 de `users` (ops/despliegue/reglas/users-cierre.fase2.rules) sobre las que se pasan,
 * con el compositor de ops/despliegue/cierre-users.mjs, SIN tocar `firestore.rules`: publicarlas sigue esperando el
 * espejo desplegado, el relleno verificado y el cliente nuevo (ops/permitido.mjs → cierreDeUsers). Siembra `users` y su
 * copia pública con la proyección real (functions/lib/identity/perfilPublico.js) y prueba cada acceso:
 *
 *   A  negativas: anónimo y otra cuenta no leen `users`, ni por documento ni por consulta (uid, linkedAccountId)
 *   B  legítimas: cada cuenta lee sus dos caras; cualquiera lee la copia pública, que no lleva datos de la cuenta
 *   C  enumeración acotada: la copia pública no se lista sin límite ni por encima de 30 (anónimo) / 100 (con sesión), y
 *      nadie la escribe
 *   D  avisos: el aviso nuevo (sin la cuenta de quien recibe) se crea; los de otra persona no se leen
 *   E  (informativo, no cuenta) lo que TODAVÍA revela el vínculo: el identificador `hidi_<cuenta>` en la copia pública
 *
 * No está en `npm test` a propósito: necesita el emulador y Java. Se lanza así, desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/privacidad-identidades.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'password' },
  })}.`;
};
const cabeceras = (quien) => ({ 'Content-Type': 'application/json', ...(quien === null ? {} : { Authorization: `Bearer ${quien === 'owner' ? 'owner' : sesion(quien)}` }) });
const v = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};
const campos = (o) => Object.fromEntries(Object.entries(o).filter(([, y]) => y !== undefined).map(([k, y]) => [k, v(y)]));
const pedir = async (metodo, ruta, quien, cuerpo) => {
  const r = await fetch(`${base}/${ruta}`, { method: metodo, headers: cabeceras(quien), ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}) });
  let datos = null;
  try { datos = await r.json(); } catch { datos = null; }
  return { status: r.status, datos };
};
const consultar = (coleccion, quien, { campo, op = 'EQUAL', valor, limite } = {}) => fetch(`${base}:runQuery`, {
  method: 'POST', headers: cabeceras(quien),
  body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: coleccion }],
    ...(campo ? { where: { fieldFilter: { field: { fieldPath: campo }, op, value: v(valor) } } } : {}),
    ...(limite ? { limit: limite } : {}),
  } }),
}).then((r) => r.status);

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};
const permite = (s) => s < 400;

/* ── Reglas: las que se pasan, con la FASE 2 de `users` compuesta encima (sin tocar el archivo) ───────────────── */
const rutaReglas = process.argv[2] || 'firestore.rules';
const { componerFase2, RUTA_FASE_2, lecturaDeUsersAbierta } = await import(pathToFileURL(path.join(RAIZ, 'ops/despliegue/cierre-users.mjs')).href);
const reglasFase1 = fs.readFileSync(rutaReglas, 'utf8');
const reglas = componerFase2(reglasFase1, fs.readFileSync(path.join(RAIZ, RUTA_FASE_2), 'utf8'));
const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (!carga.ok) { console.error(`✘ el emulador no acepta las reglas compuestas (${carga.status})`); process.exit(2); }
check('las reglas que se prueban son la FASE 2 compuesta (users cerrada), y el archivo pasado sigue en fase 1', !lecturaDeUsersAbierta(reglas) && lecturaDeUsersAbierta(reglasFase1));

/* ── Escenario: dos cuentas con sus dos caras; identificadores únicos por ejecución ─────────────────────────── */
const RUN = Date.now().toString(36);
const ANA = `ana${RUN}`, BETO = `beto${RUN}`;
const { proyectarPerfilPublico } = require(path.join(RAIZ, 'functions/lib/identity/perfilPublico.js'));
const perfiles = {};
for (const cuenta of [ANA, BETO]) {
  perfiles[cuenta] = { uid: cuenta, profileType: 'real', linkedAccountId: `hidi_${cuenta}`, displayName: cuenta, email: `${cuenta}@ejemplo.test`, creditsBalance: 10 };
  perfiles[`hidi_${cuenta}`] = { uid: `hidi_${cuenta}`, profileType: 'hidi', linkedAccountId: cuenta, displayName: `${cuenta}-wee` };
}
for (const [id, datos] of Object.entries(perfiles)) {
  await pedir('PATCH', `users/doc_${id}`, 'owner', { fields: campos(datos) });
  await pedir('PATCH', `publicProfiles/doc_${id}`, 'owner', { fields: campos(proyectarPerfilPublico(datos)) });
}

console.log('\n── A · Negativas: nadie más lee `users` ──');
{
  const anonimoDoc = await pedir('GET', `users/doc_hidi_${ANA}`, null);
  check('anónimo: no lee el documento de la cara Weë (ni su linkedAccountId)', !permite(anonimoDoc.status), String(anonimoDoc.status));
  check('anónimo: no consulta users por uid', !permite(await consultar('users', null, { campo: 'uid', valor: `hidi_${ANA}`, limite: 1 })));
  const ajeno = await pedir('GET', `users/doc_hidi_${ANA}`, BETO);
  check('otra cuenta (Beto): no lee el documento de la cara Weë de Ana', !permite(ajeno.status), String(ajeno.status));
  const ajenoReal = await pedir('GET', `users/doc_${ANA}`, BETO);
  check('otra cuenta (Beto): tampoco el de su cara Real (email, saldo, linkedAccountId)', !permite(ajenoReal.status), String(ajenoReal.status));
  check('otra cuenta: no consulta users por uid ajeno', !permite(await consultar('users', BETO, { campo: 'uid', valor: `hidi_${ANA}`, limite: 1 })));
  check('otra cuenta: no correlaciona por linkedAccountId (¿qué cara tiene la cuenta de Ana?)', !permite(await consultar('users', BETO, { campo: 'linkedAccountId', valor: ANA, limite: 5 })));
  check('otra cuenta: no enumera users', !permite(await consultar('users', BETO, { limite: 10 })));
}

console.log('\n── B · Legítimas: cada cuenta lee lo suyo; cualquiera lee la copia pública, sin datos de la cuenta ──');
{
  const propioWee = await pedir('GET', `users/doc_hidi_${ANA}`, ANA);
  const propioReal = await pedir('GET', `users/doc_${ANA}`, ANA);
  check('Ana lee sus DOS caras (Real y Weë): su app sigue funcionando', permite(propioWee.status) && permite(propioReal.status), `${propioWee.status}/${propioReal.status}`);
  check('Ana consulta users por su propio uid', permite(await consultar('users', ANA, { campo: 'uid', valor: `hidi_${ANA}`, limite: 1 })));
  const publico = await pedir('GET', `publicProfiles/doc_hidi_${ANA}`, null);
  const visibles = Object.keys(publico.datos?.fields || {});
  check('cualquiera (incluso sin sesión) lee la copia pública de un perfil: el muro y las tarjetas siguen funcionando', permite(publico.status) && visibles.includes('displayName'), String(publico.status));
  check('y la copia pública no lleva linkedAccountId, email ni saldo', !['linkedAccountId', 'email', 'creditsBalance'].some((c) => visibles.includes(c)), visibles.join(','));
}

console.log('\n── C · Enumeración acotada de la copia pública ──');
{
  check('sin límite, nadie la lista', !permite(await consultar('publicProfiles', BETO, {})));
  check('anónimo: más de 30 no', !permite(await consultar('publicProfiles', null, { limite: 31 })));
  check('con sesión: más de 100 no', !permite(await consultar('publicProfiles', BETO, { limite: 101 })));
  check('con sesión: hasta 100, sí (el buscador)', permite(await consultar('publicProfiles', BETO, { limite: 100 })));
  const escribir = await pedir('PATCH', `publicProfiles/doc_hidi_${ANA}?updateMask.fieldPaths=displayName`, ANA, { fields: campos({ displayName: 'otra' }) });
  check('nadie la escribe desde el cliente (ni su dueña): la mantiene el servidor', !permite(escribir.status), String(escribir.status));
}

console.log('\n── D · Avisos ──');
{
  const ahora = new Date();
  const aviso = { type: 'econtact_request', senderId: ANA, senderName: 'ana', recipientId: `hidi_${BETO}`, senderProfileType: 'real', read: false, createdAt: ahora };
  const creado = await pedir('POST', `notifications?documentId=n${RUN}`, ANA, { fields: campos(aviso) });
  check('el aviso nuevo de ËContact (sin la cuenta de quien recibe) se crea con normalidad', permite(creado.status), String(creado.status));
  const ajeno = await pedir('GET', `notifications/n${RUN}`, ANA);
  check('y quien lo envía no puede leerlo después (solo su destinatario)', !permite(ajeno.status), String(ajeno.status));
}

console.log('\n── E · Informativo: lo que todavía revela el vínculo (riesgo vigente; migración pendiente de autorización) ──');
{
  const publico = await pedir('GET', `publicProfiles/doc_hidi_${ANA}`, null);
  const uid = publico.datos?.fields?.uid?.stringValue;
  console.log(`ⓘ la copia pública de la cara Weë dice uid = «${uid}»: quitar «hidi_» da la cuenta, que es la cara Real. Cerrarlo exige identificadores opacos.`);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
