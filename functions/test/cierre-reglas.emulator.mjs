/*
 * CIERRE DE WEË CORE (post-auditoría 2026-10-01) — LAS REGLAS, EJECUTADAS EN EL EMULADOR.
 *
 *   A · trust/resena-por-persona — una reseña por persona: `businesses/{b}/reviews/{uid}`. La nueva va en el id de
 *       quien la escribe; la segunda de la misma persona ACTUALIZA la suya; nadie escribe en el id de otro; las
 *       antiguas con id automático se siguen leyendo y borrando, pero no se crean más así.
 *   B · follows — el id es el par `{followerId}_{followingId}`, el seguidor es una de las dos caras de quien escribe
 *       (la real o `hidi_<uid>`), nadie se sigue a sí mismo y el documento lleva solo los dos ids y la fecha.
 *
 * No está en `npm test`: necesita el emulador y Java. Desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/cierre-reglas.emulator.mjs firestore.rules"
 *
 * SABOTAJE: con las reglas de antes como argumento, los casos nuevos fallan.
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
/* `uid` normal; sin uid, el servidor (sin reglas); `null`, sin sesión. */
const pedir = async (metodo, ruta, { uid, body, anonimo } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (!anonimo) headers.Authorization = `Bearer ${uid ? sesion(uid) : 'owner'}`;
  const res = await fetch(base + ruta, { method: metodo, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  return res.status;
};
const v = (x) => {
  if (typeof x === 'string') return { stringValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  return { nullValue: null };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });
const sembrar = (ruta, datos) => pedir('PATCH', ruta, { body: doc(datos) });

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const esperar = async (nombre, esperado, metodo, ruta, opts) => {
  const status = await pedir(metodo, ruta, opts);
  check(nombre, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

const reglas = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');
const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (carga.status !== 200) { console.error('✘ las reglas no compilaron:', carga.status, await carga.text()); process.exit(1); }
await fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
console.log('reglas cargadas en el emulador\n');

const ANA = 'ana000000000000000000000001';
const BETO = 'beto00000000000000000000002';
const CARLA = 'carla00000000000000000003';
const WEE_ANA = `hidi_${ANA}`;

// ═══════════════════════════════════════════════════════════════════════════
console.log('── A · Una reseña por persona ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  await sembrar('/businesses/bCafe', { ownerId: ANA, name: 'Café', status: 'active', verified: false, featured: false, followersCount: 0, auraScore: 0, reviewCount: 0 });
  /* Una reseña antigua, con id automático, escrita antes de esta regla. */
  await sembrar('/businesses/bCafe/reviews/autoViejo1', { userId: CARLA, userName: 'Carla', rating: 3, text: 'Antes', businessId: 'bCafe', createdAt: new Date() });
  const resena = (userId, extra = {}) => ({ userId, userName: 'Beto', rating: 4, text: 'Muy buen café', businessId: 'bCafe', createdAt: new Date(), ...extra });

  await esperar('1) una reseña NUEVA con id automático ya no se crea', 'DENIEGA', 'PATCH', '/businesses/bCafe/reviews/r1', { uid: BETO, body: doc(resena(BETO)) });
  await esperar('2) ni en el id de OTRA persona, aunque firme con el suyo', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${CARLA}`, { uid: BETO, body: doc(resena(BETO)) });
  await esperar('3) ni en el id de otra persona firmando como ella', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${CARLA}`, { uid: BETO, body: doc(resena(CARLA)) });
  await esperar('4) CONTROL: Beto reseña en SU id, como createReview', 'PERMITE', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO)) });
  await esperar('5) su segunda reseña ACTUALIZA la suya (no se suma otra)', 'PERMITE', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO, { rating: 2, text: 'He cambiado de idea' })) });
  await esperar('6) …pero al actualizar se siguen exigiendo las estrellas de 1 a 5', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO, { rating: 6 })) });
  await esperar('7) …y que sea de este negocio', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO, { businessId: 'otro' })) });
  await esperar('8) …y no pasársela a otra persona', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(CARLA)) });
  await esperar('9) nadie actualiza la reseña de Beto', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: CARLA, body: doc(resena(CARLA)) });
  await esperar('10) la dueña no reseña su negocio ni en su id', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${ANA}`, { uid: ANA, body: doc(resena(ANA)) });
  await esperar('11) la reseña antigua (id automático) se sigue leyendo', 'PERMITE', 'GET', '/businesses/bCafe/reviews/autoViejo1', { anonimo: true });
  await esperar('12) …y la lista entera también (el recálculo de la media lee todas)', 'PERMITE', 'GET', '/businesses/bCafe/reviews', { uid: BETO });
  await esperar('13) …pero su autora ya no la edita (no está en su id)', 'DENIEGA', 'PATCH', '/businesses/bCafe/reviews/autoViejo1', { uid: CARLA, body: doc(resena(CARLA, { businessId: 'bCafe' })) });
  await esperar('14) CONTROL: …y sí la borra, como siempre', 'PERMITE', 'DELETE', '/businesses/bCafe/reviews/autoViejo1', { uid: CARLA });
  await esperar('15) CONTROL: Beto borra la suya', 'PERMITE', 'DELETE', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO });
  await esperar('16) sin sesión no se reseña', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { anonimo: true, body: doc(resena(BETO)) });
  /* Segunda auditoría de cierre: ni fecha del futuro (para quedarse arriba) ni campos de más. */
  const manana = new Date(Date.now() + 24 * 3600 * 1000);
  await esperar('16b) una reseña con fecha de mañana no se crea', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO, { createdAt: manana })) });
  await esperar('16c) ni con campos de más (un «verified», un contador…)', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO, { verified: true })) });
  await esperar('16d) CONTROL: con la fecha de ahora y sus campos, sí', 'PERMITE', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO)) });
  await esperar('16e) y al actualizarla tampoco se le pone fecha de mañana', 'DENIEGA', 'PATCH', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO, body: doc(resena(BETO, { createdAt: manana })) });
  await esperar('16f) CONTROL: Beto la vuelve a borrar', 'PERMITE', 'DELETE', `/businesses/bCafe/reviews/${BETO}`, { uid: BETO });
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── B · follows, atada ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const seguir = (followerId, followingId, extra = {}) => ({ followerId, followingId, createdAt: new Date(), ...extra });
  await esperar('17) CONTROL: Ana sigue a Beto con su cara real, en el id del par', 'PERMITE', 'PATCH', `/follows/${ANA}_${BETO}`, { uid: ANA, body: doc(seguir(ANA, BETO)) });
  await esperar('18) CONTROL: y con su Perfil Weë', 'PERMITE', 'PATCH', `/follows/${WEE_ANA}_${BETO}`, { uid: ANA, body: doc(seguir(WEE_ANA, BETO)) });
  await esperar('19) un follow con un id cualquiera ya no se crea', 'DENIEGA', 'PATCH', '/follows/f1', { uid: ANA, body: doc(seguir(ANA, CARLA)) });
  await esperar('20) ni con el id de otro par', 'DENIEGA', 'PATCH', `/follows/${BETO}_${CARLA}`, { uid: ANA, body: doc(seguir(ANA, CARLA)) });
  await esperar('21) ni en nombre de otra persona', 'DENIEGA', 'PATCH', `/follows/${BETO}_${CARLA}`, { uid: ANA, body: doc(seguir(BETO, CARLA)) });
  await esperar('22) ni con la cara Weë de otra persona', 'DENIEGA', 'PATCH', `/follows/hidi_${BETO}_${CARLA}`, { uid: ANA, body: doc(seguir(`hidi_${BETO}`, CARLA)) });
  await esperar('23) nadie se sigue a sí mismo', 'DENIEGA', 'PATCH', `/follows/${ANA}_${ANA}`, { uid: ANA, body: doc(seguir(ANA, ANA)) });
  await esperar('23b) ni su cara real sigue a su Perfil Weë', 'DENIEGA', 'PATCH', `/follows/${ANA}_${WEE_ANA}`, { uid: ANA, body: doc(seguir(ANA, WEE_ANA)) });
  await esperar('23c) ni su Perfil Weë a su cara real', 'DENIEGA', 'PATCH', `/follows/${WEE_ANA}_${ANA}`, { uid: ANA, body: doc(seguir(WEE_ANA, ANA)) });
  await esperar('24) ni con campos de más (un contador, un nombre…)', 'DENIEGA', 'PATCH', `/follows/${ANA}_${CARLA}`, { uid: ANA, body: doc(seguir(ANA, CARLA, { followers: 9999 })) });
  await esperar('25) ni sin a quién seguir', 'DENIEGA', 'PATCH', `/follows/${ANA}_`, { uid: ANA, body: doc(seguir(ANA, '')) });
  await esperar('26) un follow no se reescribe', 'DENIEGA', 'PATCH', `/follows/${ANA}_${BETO}`, { uid: ANA, body: doc(seguir(ANA, BETO)) });
  await esperar('27) sin sesión no se sigue', 'DENIEGA', 'PATCH', `/follows/${ANA}_${CARLA}`, { anonimo: true, body: doc(seguir(ANA, CARLA)) });
  await esperar('31) CONTROL: leer sigue abierto', 'PERMITE', 'GET', `/follows/${ANA}_${BETO}`, { anonimo: true });
  await esperar('28) nadie borra el follow de otra persona', 'DENIEGA', 'DELETE', `/follows/${ANA}_${BETO}`, { uid: BETO });
  await esperar('29) CONTROL: Ana deja de seguir (sus dos caras)', 'PERMITE', 'DELETE', `/follows/${ANA}_${BETO}`, { uid: ANA });
  await esperar('30) CONTROL: …también la de su Perfil Weë', 'PERMITE', 'DELETE', `/follows/${WEE_ANA}_${BETO}`, { uid: ANA });
}

await fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
