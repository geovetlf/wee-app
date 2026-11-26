/*
 * F0 · ALTER EGOS MÚLTIPLES — ¿ACEPTA FIRESTORE LAS CONSULTAS DE LISTA?
 * (plan: wee-trabajo/_multi-alter-ego-2026-11-23/PLAN.md §2.3, §3.1 y fase F0)
 *
 * Con varios alter egos por cuenta, las reglas dejan de saber las caras de una cuenta por composición
 * (`uid` + `hidi_<uid>`): la lista sale de `accounts/{cuenta}.identidadesWee`, que escribe SOLO el servidor.
 * Firestore evalúa una consulta contra todo lo que PODRÍA devolver: si la regla no lo puede demostrar con
 * el filtro de la consulta, deniega la lista entera. Esto lo ejecuta de verdad, con reglas mínimas propias
 * (NO las de producción: eso es la fase F3), y prueba las dos formas posibles de escribirlas:
 *
 *   A · `hasAny(misIdentidades())`              — la forma limpia.
 *   B · desenrollada hasta el techo (10 caras)  — el plan B si A no se pudiera demostrar.
 *
 * Fuera de `npm test` a propósito (necesita emulador y Java). Desde la raíz:
 *   firebase emulators:exec --only firestore --project demo-alter-egos \
 *     "node functions/test/alter-egos-spike.emulator.mjs"
 * o contra un emulador ya encendido, con OTRO proyecto demo (las reglas se cargan por proyecto):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-alter-egos node functions/test/alter-egos-spike.emulator.mjs
 */
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const COMUN = `
  function heredada(uid) { return 'hidi_' + uid; }
  function extra() {
    let ref = /databases/$(database)/documents/accounts/$(request.auth.uid);
    return exists(ref) ? get(ref).data.get('identidadesWee', []) : [];
  }
  function misIdentidades() { return [request.auth.uid, heredada(request.auth.uid)].concat(extra()); }
  function esMia(id) { return id == request.auth.uid || id == heredada(request.auth.uid) || id in extra(); }
  match /accounts/{cuenta} { allow read: if request.auth != null && request.auth.uid == cuenta; allow write: if false; }
`;

const REGLAS_A = `rules_version = '2';
service cloud.firestore { match /databases/{database}/documents {
  ${COMUN}
  match /conversations/{id} { allow read: if request.auth != null && resource.data.participants.hasAny(misIdentidades()); }
  match /econtacts/{id} { allow read: if request.auth != null && resource.data.users.hasAny(misIdentidades()); }
  match /notifications/{id} { allow read: if request.auth != null && esMia(resource.data.recipientId); }
  match /characterAutonomy/{perfilId} { allow read: if request.auth != null && esMia(perfilId); }
}}`;

// Plan B: sin hasAny; cada posición de la lista, hasta el techo de 10 caras extra.
const desenrollada = (campo) => {
  const partes = [`request.auth.uid in resource.data.${campo}`, `heredada(request.auth.uid) in resource.data.${campo}`];
  for (let i = 0; i < 10; i++) partes.push(`(extra().size() > ${i} && extra()[${i}] in resource.data.${campo})`);
  return partes.join(' || ');
};
const REGLAS_B = `rules_version = '2';
service cloud.firestore { match /databases/{database}/documents {
  ${COMUN}
  match /conversations/{id} { allow read: if request.auth != null && (${desenrollada('participants')}); }
  match /econtacts/{id} { allow read: if request.auth != null && (${desenrollada('users')}); }
  match /notifications/{id} { allow read: if request.auth != null && esMia(resource.data.recipientId); }
  match /characterAutonomy/{perfilId} { allow read: if request.auth != null && esMia(perfilId); }
}}`;

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  if (res.status !== 200) throw new Error(`reglas no cargadas: ${res.status} ${await res.text()}`);
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid,
    iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};

const valor = (v) => Array.isArray(v)
  ? { arrayValue: { values: v.map(valor) } }
  : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) };
const sembrar = async (ruta, campos) => {
  const fields = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, valor(v)]));
  const res = await fetch(`${base}/${ruta}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (res.status !== 200) throw new Error(`siembra ${ruta}: ${res.status}`);
};

const consulta = async (uid, coleccion, where) => {
  const res = await fetch(`${base}:runQuery`, {
    method: 'POST', headers: { Authorization: `Bearer ${sesion(uid)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coleccion }], ...(where ? { where } : {}) } }),
  });
  const texto = await res.text();
  let filas = 0;
  try { filas = (JSON.parse(texto) || []).filter((x) => x.document).length; } catch { /* error */ }
  return { permitido: res.status < 400, filas };
};
const leer = async (uid, ruta) => (await fetch(`${base}/${ruta}`, { headers: { Authorization: `Bearer ${sesion(uid)}` } })).status < 400;

const contiene = (campo, v) => ({ fieldFilter: { field: { fieldPath: campo }, op: 'ARRAY_CONTAINS', value: valor(v) } });
const igual = (campo, v) => ({ fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: valor(v) } });
const enLista = (campo, vs) => ({ fieldFilter: { field: { fieldPath: campo }, op: 'IN', value: valor(vs) } });

// ─── Mundo: la cuenta A tiene su Real, su cara heredada y DOS alter egos opacos; B es otra persona ───
const A = 'cuentaA', B = 'cuentaB';
const JAY = 'ent_jayreeds000000000000000001', LINA = 'ent_linashade00000000000000002', AJENO = 'ent_ajeno0000000000000000000003';

async function sembrarMundo() {
  await sembrar(`accounts/${A}`, { identidadesWee: [`hidi_${A}`, JAY, LINA] });
  await sembrar(`accounts/${B}`, { identidadesWee: [AJENO] });
  await sembrar('conversations/c1', { participants: [JAY, AJENO] });
  await sembrar('conversations/c2', { participants: [LINA, B] });
  await sembrar('conversations/c3', { participants: [JAY, LINA] }); // dos caras de la MISMA cuenta (decisión del dueño)
  await sembrar('conversations/c4', { participants: [AJENO, B] });
  await sembrar('econtacts/e1', { users: [JAY, AJENO] });
  await sembrar('notifications/n1', { recipientId: JAY });
  await sembrar('notifications/n2', { recipientId: LINA });
  await sembrar('notifications/n3', { recipientId: `hidi_${A}` });
  await sembrar('notifications/n4', { recipientId: AJENO });
  await sembrar(`characterAutonomy/${LINA}`, { activo: true });
}

let fallos = 0;
const comprobar = (nombre, ok) => { console.log(`${ok ? '✔' : '✘'} ${nombre}`); if (!ok) fallos++; };

async function bateria(etiqueta) {
  console.log(`\n── ${etiqueta}`);
  let r = await consulta(A, 'conversations', contiene('participants', JAY));
  comprobar('A lista las conversaciones de Jay (array-contains ent_)', r.permitido && r.filas === 2);
  r = await consulta(A, 'conversations', contiene('participants', LINA));
  comprobar('A lista las de Lina, incluida la de Jay↔Lina', r.permitido && r.filas === 2);
  r = await consulta(A, 'conversations', contiene('participants', AJENO));
  comprobar('A NO puede listar por la cara de otra cuenta', !r.permitido);
  r = await consulta(B, 'conversations', contiene('participants', JAY));
  comprobar('B NO puede listar por un alter ego de A', !r.permitido);
  r = await consulta(A, 'conversations', null);
  comprobar('Sin filtro: denegado', !r.permitido);
  r = await consulta(A, 'econtacts', contiene('users', JAY));
  comprobar('ẄContacts de Jay: permitido', r.permitido && r.filas === 1);
  r = await consulta(A, 'notifications', enLista('recipientId', [A, `hidi_${A}`, JAY, LINA]));
  comprobar('Campanita de toda la cuenta: recipientId in [4 caras]', r.permitido && r.filas === 3);
  r = await consulta(A, 'notifications', igual('recipientId', LINA));
  comprobar('Avisos de una cara: recipientId == ent_', r.permitido && r.filas === 1);
  r = await consulta(A, 'notifications', enLista('recipientId', [JAY, AJENO]));
  comprobar('Colar una cara ajena en el in: denegado', !r.permitido);
  comprobar('get de characterAutonomy del alter ego propio', await leer(A, `characterAutonomy/${LINA}`));
  comprobar('get de characterAutonomy ajeno: denegado', !(await leer(B, `characterAutonomy/${LINA}`)));
  comprobar('Una cuenta sin documento accounts conserva lo heredado', (await consulta('cuentaC', 'notifications', igual('recipientId', 'hidi_cuentaC'))).permitido);
}

await sembrarMundo();
await cargarReglas(REGLAS_A);
await bateria('Forma A · hasAny(misIdentidades())');
await cargarReglas(REGLAS_B);
await bateria('Forma B · desenrollada hasta 10');

console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : '\n✔ F0: Firestore acepta las consultas de lista con la lista de caras leída de accounts');
process.exit(fallos ? 1 : 0);
