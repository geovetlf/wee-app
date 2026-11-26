/*
 * F3 · ALTER EGOS MÚLTIPLES — LAS REGLAS DE VERDAD, EJECUTADAS EN EL EMULADOR.
 * (plan: wee-trabajo/_multi-alter-ego-2026-11-23/PLAN.md §2.3, §3.1, fila F3 de §5 y decisiones §5.3)
 *
 * `alter-egos-spike` (F0) demostró con reglas mínimas que Firestore acepta las consultas de lista con la lista de
 * caras leída de `accounts/{cuenta}.identidadesWee`. Esto carga `firestore.rules` ENTERO y comprueba:
 *
 *   · cada cuenta escribe con TODAS sus caras —Real, heredada `hidi_<uid>` y sus alter egos `ent_…`— y con ninguna
 *     ajena: posts, comentarios, perfil, ficha del personaje, pase, ẄContacts, follows, WeeTalk y avisos;
 *   · el cliente no crea `users/ent_…`, no escribe `accounts` ni `entities`, y no se añade a `identidadesWee`;
 *   · lo heredado sigue intacto, también para una cuenta SIN documento `accounts`;
 *   · D6: dos alter egos de la misma cuenta (Jay ↔ Lina) conversan y se siguen.
 *
 * Fuera de `npm test` a propósito (emulador y Java). Desde la raíz:
 *   firebase emulators:exec --only firestore --project demo-alter-egos-rules \
 *     "node functions/test/alter-egos-rules.emulator.mjs firestore.rules"
 * o contra un emulador ya encendido, con un proyecto demo propio (las reglas se cargan por proyecto):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-alter-egos-rules \
 *     node functions/test/alter-egos-rules.emulator.mjs firestore.rules
 *
 * SABOTAJE: con las reglas de antes de F3 como argumento, fallan los casos de los alter egos `ent_`.
 */
import fs from 'node:fs';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};

const valor = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(valor) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, valor(y)])) } };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, valor(x)])) });

/* `uid` = sesión de esa cuenta; sin uid = el servidor (sin reglas). `campos` = updateMask (solo esos campos). */
const pedir = async (metodo, ruta, { uid, body, campos } = {}) => {
  const mascara = campos ? '?' + campos.map((c) => `updateMask.fieldPaths=${encodeURIComponent(c)}`).join('&') : '';
  const res = await fetch(base + (ruta.startsWith('/') ? '' : '/') + ruta + mascara, {
    method: metodo,
    headers: { Authorization: `Bearer ${uid ? sesion(uid) : 'owner'}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
};
const sembrar = async (ruta, datos) => {
  const s = await pedir('PATCH', ruta, { body: doc(datos) });
  if (s !== 200) throw new Error(`siembra ${ruta}: ${s}`);
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
const contiene = (campo, x) => ({ fieldFilter: { field: { fieldPath: campo }, op: 'ARRAY_CONTAINS', value: valor(x) } });
const enLista = (campo, xs) => ({ fieldFilter: { field: { fieldPath: campo }, op: 'IN', value: valor(xs) } });

let fallos = 0;
const check = (nombre, ok, extra = '') => {
  console.log(`${ok ? '✔' : '✘'} ${nombre}${extra ? ' — ' + extra : ''}`);
  if (!ok) fallos++;
};
const esperar = async (nombre, esperado, metodo, ruta, opts) => {
  const status = await pedir(metodo, ruta, opts);
  check(nombre, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

// ─── Reglas ───
const reglas = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');
const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (carga.status !== 200) { console.error('✘ las reglas no compilaron:', carga.status, await carga.text()); process.exit(1); }
await fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
console.log('reglas cargadas en el emulador\n');

// ─── Mundo ───
// Cuenta A: su Real, su cara heredada y DOS alter egos opacos (Jay y Lina). Cuenta B: su Real y un alter ego.
// Cuenta C: heredada pura, SIN documento `accounts` (apps viejas, cuenta sin nacer). D y E: cuentas nuevas.
const A = 'cuentaA00000000000000000001', B = 'cuentaB00000000000000000002', C = 'cuentaC00000000000000000003';
const D = 'cuentaD00000000000000000004', E = 'cuentaE00000000000000000005';
const HA = `hidi_${A}`, HC = `hidi_${C}`, HB = `hidi_${B}`;
const ent = (s) => `ent_${s}${'0'.repeat(26 - s.length)}`;
const JAY = ent('jay'), LINA = ent('shade'), AJENO = ent('zzz'), NUEVO = ent('new');
const ahora = () => new Date();

const perfilWee = (uid, extra = {}) => ({ uid, profileType: 'hidi', displayName: uid.slice(0, 8), ...extra });
await sembrar(`users/${A}`, { uid: A, profileType: 'real', displayName: 'Ana', linkedAccountId: HA });
await sembrar(`users/${HA}`, perfilWee(HA, { linkedAccountId: A }));
await sembrar(`users/${JAY}`, perfilWee(JAY, { entityId: JAY }));
await sembrar(`users/${LINA}`, perfilWee(LINA, { entityId: LINA }));
await sembrar(`users/${B}`, { uid: B, profileType: 'real', displayName: 'Beto' });
await sembrar(`users/${AJENO}`, perfilWee(AJENO, { entityId: AJENO }));
await sembrar(`users/${C}`, { uid: C, profileType: 'real', displayName: 'Carla' });
await sembrar(`users/${HC}`, perfilWee(HC, { linkedAccountId: C }));
await sembrar(`accounts/${A}`, { identidadesWee: [HA, JAY, LINA], weeProfileEntityId: JAY });
await sembrar(`accounts/${B}`, { identidadesWee: [AJENO] });
for (const [id, dueno] of [[JAY, A], [LINA, A], [AJENO, B]]) {
  await sembrar(`entities/${id}`, { entityType: 'WEE_PROFILE', ownerAccountId: dueno, status: 'ACTIVE',
    profileRef: { coleccion: 'users', uid: id } });
}
await sembrar(`characterAutonomy/${LINA}`, { activo: true });
await sembrar(`characterAutonomy/${HC}`, { activo: false });
await sembrar(`users/${LINA}/characterInbox/a1`, { tipo: 'aviso' });
await sembrar('econtacts/e1', { users: [JAY, AJENO], status: 'pending', requestedBy: AJENO, requestedTo: JAY });
await sembrar('notifications/n1', { recipientId: JAY, read: false });
await sembrar('notifications/n2', { recipientId: LINA, read: false });
await sembrar('notifications/n3', { recipientId: HA, read: false });
await sembrar('notifications/n4', { recipientId: AJENO, read: false });
await sembrar('notifications/n5', { recipientId: HC, read: false });

const post = (userId) => doc({ userId, content: 'hola', isPrivate: false });
const comentario = (userId) => doc({ userId, postId: 'pJay', content: 'bien' });

// ═══════════════════════════════════════════════════════════════════════════
console.log('── 1 · Publicaciones y comentarios: cada cuenta con sus caras, nunca con las de otra ──');
// ═══════════════════════════════════════════════════════════════════════════
await esperar('1) A publica como Jay (alter ego)', 'PERMITE', 'PATCH', '/posts/pJay', { uid: A, body: post(JAY) });
await esperar('2) y como Lina', 'PERMITE', 'PATCH', '/posts/pLina', { uid: A, body: post(LINA) });
await esperar('3) heredado: como su cara hidi_', 'PERMITE', 'PATCH', '/posts/pHA', { uid: A, body: post(HA) });
await esperar('4) heredado: como su Real', 'PERMITE', 'PATCH', '/posts/pA', { uid: A, body: post(A) });
await esperar('5) A NO publica como el alter ego de B', 'DENIEGA', 'PATCH', '/posts/pX1', { uid: A, body: post(AJENO) });
await esperar('6) B NO publica como Jay', 'DENIEGA', 'PATCH', '/posts/pX2', { uid: B, body: post(JAY) });
await esperar('7) ni como la cara heredada de A', 'DENIEGA', 'PATCH', '/posts/pX3', { uid: B, body: post(HA) });
await esperar('8) C (sin accounts) publica con su heredada', 'PERMITE', 'PATCH', '/posts/pHC', { uid: C, body: post(HC) });
await esperar('9) y C no publica como Jay', 'DENIEGA', 'PATCH', '/posts/pX4', { uid: C, body: post(JAY) });
await esperar('10) un id ent_ que no está en ninguna lista no vale', 'DENIEGA', 'PATCH', '/posts/pX5', { uid: A, body: post(NUEVO) });
await esperar('11) A edita el texto del post de Jay', 'PERMITE', 'PATCH', '/posts/pJay', { uid: A, body: doc({ content: 'editado' }), campos: ['content'] });
await esperar('12) B NO edita el post de Jay', 'DENIEGA', 'PATCH', '/posts/pJay', { uid: B, body: doc({ content: 'mío' }), campos: ['content'] });
await esperar('13) ni A le cambia el autor de Jay a Lina', 'DENIEGA', 'PATCH', '/posts/pJay', { uid: A, body: doc({ userId: LINA }), campos: ['userId'] });
await esperar('14) B NO borra el post de Lina', 'DENIEGA', 'DELETE', '/posts/pLina', { uid: B });
await esperar('15) A borra el post de Lina', 'PERMITE', 'DELETE', '/posts/pLina', { uid: A });
await esperar('16) A comenta como Jay', 'PERMITE', 'PATCH', '/comments/cJay', { uid: A, body: comentario(JAY) });
await esperar('17) B NO comenta como Jay', 'DENIEGA', 'PATCH', '/comments/cX', { uid: B, body: comentario(JAY) });
await esperar('18) B NO edita el comentario de Jay', 'DENIEGA', 'PATCH', '/comments/cJay', { uid: B, body: doc({ content: 'x' }), campos: ['content'] });
await esperar('19) A lo edita', 'PERMITE', 'PATCH', '/comments/cJay', { uid: A, body: doc({ content: 'mejor' }), campos: ['content'] });
await esperar('20) y lo borra', 'PERMITE', 'DELETE', '/comments/cJay', { uid: A });

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2 · Perfiles: el cliente no fabrica alter egos ni se los apunta ──');
// ═══════════════════════════════════════════════════════════════════════════
await esperar('21) A edita el nombre de Jay', 'PERMITE', 'PATCH', `/users/${JAY}`, { uid: A, body: doc({ displayName: 'Jay Reeds' }), campos: ['displayName'] });
await esperar('22) B NO edita el perfil de Jay', 'DENIEGA', 'PATCH', `/users/${JAY}`, { uid: B, body: doc({ displayName: 'robado' }), campos: ['displayName'] });
await esperar('23) A NO le pone a Jay un vínculo con la cuenta', 'DENIEGA', 'PATCH', `/users/${JAY}`, { uid: A, body: doc({ linkedAccountId: A }), campos: ['linkedAccountId'] });
await esperar('24) ni le cambia el entityId', 'DENIEGA', 'PATCH', `/users/${JAY}`, { uid: A, body: doc({ entityId: LINA }), campos: ['entityId'] });
await esperar('25) heredado: A edita su cara hidi_', 'PERMITE', 'PATCH', `/users/${HA}`, { uid: A, body: doc({ displayName: 'Weë Ana' }), campos: ['displayName'] });
await esperar('26) el cliente NO crea users/ent_…', 'DENIEGA', 'PATCH', `/users/${NUEVO}`, { uid: A, body: doc(perfilWee(NUEVO)) });
await esperar('27) ni con el vínculo a su cuenta', 'DENIEGA', 'PATCH', `/users/${NUEVO}`, { uid: A, body: doc(perfilWee(NUEVO, { linkedAccountId: A })) });
await esperar('28) heredado: D crea su Real', 'PERMITE', 'PATCH', `/users/${D}`, { uid: D, body: doc({ uid: D, profileType: 'real', displayName: 'Dani' }) });
await esperar('29) heredado: y su cara hidi_ (apps viejas)', 'PERMITE', 'PATCH', `/users/hidi_${D}`, { uid: D, body: doc(perfilWee(`hidi_${D}`, { linkedAccountId: D })) });
await esperar('30) A NO se añade una cara a identidadesWee', 'DENIEGA', 'PATCH', `/accounts/${A}`, { uid: A, body: doc({ identidadesWee: [HA, JAY, LINA, AJENO] }), campos: ['identidadesWee'] });
await esperar('31) E NO crea su accounts con la cara de otro', 'DENIEGA', 'PATCH', `/accounts/${E}`, { uid: E, body: doc({ identidadesWee: [JAY] }) });
await esperar('32) ni nadie crea una entidad', 'DENIEGA', 'PATCH', `/entities/${NUEVO}`, { uid: A, body: doc({ entityType: 'WEE_PROFILE', ownerAccountId: A, status: 'ACTIVE' }) });
await esperar('33) ni se queda con la de otro', 'DENIEGA', 'PATCH', `/entities/${AJENO}`, { uid: A, body: doc({ ownerAccountId: A }), campos: ['ownerAccountId'] });
await esperar('34) E sin lista NO edita el perfil de Jay', 'DENIEGA', 'PATCH', `/users/${JAY}`, { uid: E, body: doc({ displayName: 'x' }), campos: ['displayName'] });

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3 · El personaje: ficha, bandeja y pase, por alter ego ──');
// ═══════════════════════════════════════════════════════════════════════════
const ficha = doc({ version: 1, nombre: 'Lina Shade', resumen: '', personalidad: '', trasfondo: '', limites: '',
  ejemploDeVoz: '', saludo: '', rasgos: [], temas: [], idiomas: ['es'], tono: 'misterioso', nivel: 'basico' });
await esperar('35) A escribe la ficha de Lina', 'PERMITE', 'PATCH', `/users/${LINA}/character/ficha`, { uid: A, body: ficha });
await esperar('36) B NO escribe la ficha de Lina', 'DENIEGA', 'PATCH', `/users/${LINA}/character/ficha`, { uid: B, body: ficha });
await esperar('37) A lee la bandeja de Lina', 'PERMITE', 'GET', `/users/${LINA}/characterInbox/a1`, { uid: A });
await esperar('38) B NO la lee', 'DENIEGA', 'GET', `/users/${LINA}/characterInbox/a1`, { uid: B });
await esperar('39) la ficha del Perfil Real NO es de personaje', 'DENIEGA', 'PATCH', `/users/${A}/character/ficha`, { uid: A, body: ficha });
await esperar('40) A lee el pase de Lina', 'PERMITE', 'GET', `/characterAutonomy/${LINA}`, { uid: A });
await esperar('41) B NO lo lee', 'DENIEGA', 'GET', `/characterAutonomy/${LINA}`, { uid: B });
await esperar('42) heredado: C lee el de su cara hidi_', 'PERMITE', 'GET', `/characterAutonomy/${HC}`, { uid: C });
await esperar('43) nadie escribe un pase', 'DENIEGA', 'PATCH', `/characterAutonomy/${JAY}`, { uid: A, body: doc({ activo: true }) });

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4 · ẄContacts y follows (D6: Jay y Lina se siguen) ──');
// ═══════════════════════════════════════════════════════════════════════════
let r = await consulta(A, 'econtacts', contiene('users', JAY));
check('44) A lista los ẄContacts de Jay (users array-contains ent_)', r.permitido && r.filas === 1, JSON.stringify(r));
r = await consulta(B, 'econtacts', contiene('users', JAY));
check('45) B NO lista por Jay', !r.permitido, JSON.stringify(r));
await esperar('46) B lee la relación en la que está su alter ego', 'PERMITE', 'GET', '/econtacts/e1', { uid: B });
await esperar('47) C no la lee', 'DENIEGA', 'GET', '/econtacts/e1', { uid: C });
await esperar('48) el cliente sigue sin crear ẄContacts', 'DENIEGA', 'PATCH', `/econtacts/${JAY}_${LINA}`, { uid: A, body: doc({ users: [JAY, LINA], status: 'accepted' }) });
const seguir = (de, a) => doc({ followerId: de, followingId: a, createdAt: ahora() });
await esperar('49) D6: Jay sigue a Lina', 'PERMITE', 'PATCH', `/follows/${JAY}_${LINA}`, { uid: A, body: seguir(JAY, LINA) });
await esperar('50) D6: Lina sigue a Jay', 'PERMITE', 'PATCH', `/follows/${LINA}_${JAY}`, { uid: A, body: seguir(LINA, JAY) });
await esperar('51) D6: la heredada sigue a Jay', 'PERMITE', 'PATCH', `/follows/${HA}_${JAY}`, { uid: A, body: seguir(HA, JAY) });
await esperar('52) Jay sigue al alter ego de B', 'PERMITE', 'PATCH', `/follows/${JAY}_${AJENO}`, { uid: A, body: seguir(JAY, AJENO) });
await esperar('53) nadie se sigue a sí mismo (mismo id)', 'DENIEGA', 'PATCH', `/follows/${LINA}_${LINA}`, { uid: A, body: seguir(LINA, LINA) });
await esperar('54) A NO sigue en nombre del alter ego de B', 'DENIEGA', 'PATCH', `/follows/${AJENO}_${JAY}`, { uid: A, body: seguir(AJENO, JAY) });
await esperar('55) B NO sigue en nombre de Jay', 'DENIEGA', 'PATCH', `/follows/${JAY}_${B}`, { uid: B, body: seguir(JAY, B) });
await esperar('56) B NO deshace el follow de Jay', 'DENIEGA', 'DELETE', `/follows/${JAY}_${LINA}`, { uid: B });
await esperar('57) A lo deshace', 'PERMITE', 'DELETE', `/follows/${JAY}_${LINA}`, { uid: A });
/* Decisión del dueño (2026-11-23, F4): el Real y sus alter egos no se siguen entre sí, en ninguna dirección. */
await esperar('57b) el Real NO sigue a Jay', 'DENIEGA', 'PATCH', `/follows/${A}_${JAY}`, { uid: A, body: seguir(A, JAY) });
await esperar('57c) Jay NO sigue al Real de su cuenta', 'DENIEGA', 'PATCH', `/follows/${JAY}_${A}`, { uid: A, body: seguir(JAY, A) });
await esperar('57d) ni el Real a su cara heredada', 'DENIEGA', 'PATCH', `/follows/${A}_${HA}`, { uid: A, body: seguir(A, HA) });
await esperar('57e) ni la heredada al Real', 'DENIEGA', 'PATCH', `/follows/${HA}_${A}`, { uid: A, body: seguir(HA, A) });
await esperar('57f) Jay sigue a Lina (D6, sin cambios)', 'PERMITE', 'PATCH', `/follows/${JAY}_${LINA}`, { uid: A, body: seguir(JAY, LINA) });
await esperar('57g) el Real sigue a una persona ajena', 'PERMITE', 'PATCH', `/follows/${A}_${B}`, { uid: A, body: seguir(A, B) });
await esperar('57h) Jay sigue al Real de otra cuenta', 'PERMITE', 'PATCH', `/follows/${JAY}_${B}`, { uid: A, body: seguir(JAY, B) });

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5 · WeeTalk (D6: Jay ↔ Lina conversan) ──');
// ═══════════════════════════════════════════════════════════════════════════
const conversacion = (a, b) => doc({ participants: [a, b], participantsData: { [a]: { n: a }, [b]: { n: b } }, createdAt: ahora(), updatedAt: ahora() });
await esperar('58) D6: A abre una conversación Jay ↔ Lina', 'PERMITE', 'PATCH', '/conversations/cJL', { uid: A, body: conversacion(JAY, LINA) });
await esperar('59) A abre Jay ↔ alter ego de B', 'PERMITE', 'PATCH', '/conversations/cJB', { uid: A, body: conversacion(JAY, AJENO) });
await esperar('60) B abre su alter ego ↔ Lina', 'PERMITE', 'PATCH', '/conversations/cBL', { uid: B, body: conversacion(AJENO, LINA) });
await esperar('61) B NO abre una entre Jay y Lina', 'DENIEGA', 'PATCH', '/conversations/cX', { uid: B, body: conversacion(JAY, LINA) });
await esperar('62) D6: Jay escribe a Lina', 'PERMITE', 'PATCH', '/conversations/cJL/messages/m1', { uid: A, body: doc({ senderId: JAY, content: 'hola Lina' }) });
await esperar('63) D6: y Lina contesta', 'PERMITE', 'PATCH', '/conversations/cJL/messages/m2', { uid: A, body: doc({ senderId: LINA, content: 'hola Jay' }) });
await esperar('64) A NO firma como el alter ego de B', 'DENIEGA', 'PATCH', '/conversations/cJB/messages/m3', { uid: A, body: doc({ senderId: AJENO, content: 'x' }) });
await esperar('65) ni con una cara suya que no participa', 'DENIEGA', 'PATCH', '/conversations/cJB/messages/m4', { uid: A, body: doc({ senderId: LINA, content: 'x' }) });
await esperar('66) B NO escribe en Jay ↔ Lina', 'DENIEGA', 'PATCH', '/conversations/cJL/messages/m5', { uid: B, body: doc({ senderId: AJENO, content: 'x' }) });
await esperar('67) B NO lee Jay ↔ Lina', 'DENIEGA', 'GET', '/conversations/cJL', { uid: B });
await esperar('68) ni sus mensajes', 'DENIEGA', 'GET', '/conversations/cJL/messages/m1', { uid: B });
await esperar('69) B lee la suya con Lina', 'PERMITE', 'GET', '/conversations/cBL', { uid: B });
await esperar('70) A firma el último mensaje como Jay', 'PERMITE', 'PATCH', '/conversations/cJB',
  { uid: A, body: doc({ lastMessage: { senderId: JAY, text: 'hola', read: false }, updatedAt: ahora() }), campos: ['lastMessage', 'updatedAt'] });
await esperar('71) A NO lo firma como el alter ego de B', 'DENIEGA', 'PATCH', '/conversations/cJB',
  { uid: A, body: doc({ lastMessage: { senderId: AJENO, text: 'x', read: false } }), campos: ['lastMessage'] });
await esperar('72) A entra al chat como Jay (presencia propia)', 'PERMITE', 'PATCH', '/conversations/cJB',
  { uid: A, body: doc({ activeInChat: [JAY] }), campos: ['activeInChat'] });
await esperar('73) A NO mete al alter ego de B en la presencia', 'DENIEGA', 'PATCH', '/conversations/cJB',
  { uid: A, body: doc({ activeInChat: [JAY, AJENO] }), campos: ['activeInChat'] });
r = await consulta(A, 'conversations', contiene('participants', JAY));
check('74) A lista las conversaciones de Jay', r.permitido && r.filas === 2, JSON.stringify(r));
r = await consulta(A, 'conversations', contiene('participants', LINA));
check('75) y las de Lina (incluida la de B)', r.permitido && r.filas === 2, JSON.stringify(r));
r = await consulta(B, 'conversations', contiene('participants', JAY));
check('76) B NO lista por Jay', !r.permitido, JSON.stringify(r));
r = await consulta(A, 'conversations', null);
check('77) sin filtro: denegado', !r.permitido, JSON.stringify(r));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6 · Avisos: la campanita de toda la cuenta y nadie firma por otro ──');
// ═══════════════════════════════════════════════════════════════════════════
r = await consulta(A, 'notifications', enLista('recipientId', [A, HA, JAY, LINA]));
check('78) campanita de A: recipientId in [sus 4 caras]', r.permitido && r.filas === 3, JSON.stringify(r));
r = await consulta(A, 'notifications', enLista('recipientId', [JAY, AJENO]));
check('79) colar una cara ajena en el in: denegado', !r.permitido, JSON.stringify(r));
r = await consulta(C, 'notifications', enLista('recipientId', [C, HC]));
check('80) heredado: C (sin accounts) lee los suyos', r.permitido && r.filas === 1, JSON.stringify(r));
await esperar('81) A marca leído un aviso de Lina', 'PERMITE', 'PATCH', '/notifications/n2', { uid: A, body: doc({ read: true }), campos: ['read'] });
await esperar('82) B NO marca uno de Jay', 'DENIEGA', 'PATCH', '/notifications/n1', { uid: B, body: doc({ read: true }), campos: ['read'] });
await esperar('83) B NO borra uno de Jay', 'DENIEGA', 'DELETE', '/notifications/n1', { uid: B });
await esperar('84) A borra uno de Jay', 'PERMITE', 'DELETE', '/notifications/n1', { uid: A });
const aviso = (de, para) => doc({ type: 'like', recipientId: para, senderId: de, senderName: 'x', postId: 'pJay', read: false, createdAt: ahora() });
await esperar('85) Jay avisa al alter ego de B', 'PERMITE', 'POST', '/notifications', { uid: A, body: aviso(JAY, AJENO) });
await esperar('86) A NO avisa firmando como el alter ego de B', 'DENIEGA', 'POST', '/notifications', { uid: A, body: aviso(AJENO, B) });
await esperar('87) ni se avisa a sí misma por otra cara (Jay → Lina)', 'DENIEGA', 'POST', '/notifications', { uid: A, body: aviso(JAY, LINA) });
await esperar('88) heredado: C avisa con su hidi_', 'PERMITE', 'POST', '/notifications', { uid: C, body: aviso(HC, JAY) });
await esperar('89) heredado: B avisa con su Real', 'PERMITE', 'POST', '/notifications', { uid: B, body: aviso(B, HA) });
await esperar('90) y B no firma con una hidi_ que no es la suya', 'DENIEGA', 'POST', '/notifications', { uid: B, body: aviso(HA, HB) });

console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : '\n✔ F3: las reglas dan a cada cuenta todas sus caras, y ninguna ajena');
process.exit(fallos ? 1 : 0);
