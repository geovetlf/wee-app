/*
 * LAS FRONTERAS DE AUTORIZACIÓN, EJECUTADAS (fase 10).
 *
 * Cuatro agujeros que la revisión encontró y que NO se pueden comprobar
 * leyendo el archivo de reglas: hay que intentar la escritura y ver si pasa.
 *
 *   A · Notificaciones firmadas por otra persona. Una notificación no se queda
 *       en la base de datos: dispara un push de verdad cuyo título sale de
 *       `senderName` tal cual llega. Y (post-auditoría) con la forma exacta de
 *       las que crea la app —tipos, campos, tamaños, hora, nunca a sí misma—,
 *       y el destinatario después solo la marca como leída.
 *   B · Contadores de documentos ajenos escritos a dedo. `followers: 9999999`
 *       en el perfil de quien sea, `agreementCount: 0` en la publicación de
 *       quien sea.
 *   C · Dos votos de la misma persona en la misma publicación, uno por cada
 *       cara. En producción hay ocho votos con identidad Weë.
 *   D · Weë Business y crear comunidad desde el Perfil Weë, que las reglas
 *       DENEGABAN porque el cliente escribía la cara y la regla exige la cuenta.
 *       Y (post-auditoría) lo que Weë afirma de un negocio —«Verificado»,
 *       Destacados, estado, dueño— no lo escribe su dueño; las reseñas, de 1 a 5
 *       enteros y nunca del dueño a su propio negocio.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java. Se lanza así,
 * desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/fronteras-rules.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return res.status;
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return (
    b64({ alg: 'none', typ: 'JWT' }) + '.' +
    b64({
      iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
      user_id: uid, sub: uid, iat: now, exp: now + 3600,
      firebase: { identities: {}, sign_in_provider: 'custom' },
    }) + '.'
  );
};

const sesionAdmin = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return (
    b64({ alg: 'none', typ: 'JWT' }) + '.' +
    b64({
      iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
      user_id: uid, sub: uid, iat: now, exp: now + 3600, admin: true,
      firebase: { identities: {}, sign_in_provider: 'custom' },
    }) + '.'
  );
};
/* `uid` normal; `{ admin: 'uid' }` para una sesión con el claim admin; sin uid, el servidor (sin reglas). */
const autorizacion = (uid) => (uid && typeof uid === 'object' ? sesionAdmin(uid.admin) : uid ? sesion(uid) : 'owner');

const pedir = async (metodo, ruta, { uid, body } = {}) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${autorizacion(uid)}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
};

/* Valores de Firestore REST, a mano: aquí no hay SDK. Un Date es un Timestamp (`Timestamp.now()` del cliente). */
const v = (x) => {
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { nullValue: null };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });

/* Sembrar como administrador: el servidor no pasa por las reglas. */
const sembrar = async (ruta, datos) => pedir('PATCH', ruta, { body: doc(datos) });
/* Escribir SOLO unos campos, como hace un `update` del cliente. */
const escribir = async (ruta, uid, datos) => {
  const campos = Object.keys(datos).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  return pedir('PATCH', `${ruta}?${campos}`, { uid, body: doc(datos) });
};

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const esperar = async (nombre, esperado, metodo, ruta, opts) => {
  const status = await pedir(metodo, ruta, opts);
  const permitido = status < 400;
  check(nombre, permitido === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

const ANA = 'ana000000000000000000000001';
const BETO = 'beto00000000000000000000002';
const WEE_ANA = `hidi_${ANA}`;

const estado = await cargarReglas(fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8'));
if (estado !== 200) { console.error('✘ las reglas no compilaron:', estado); process.exit(1); }
console.log('reglas cargadas en el emulador\n');

// ═══════════════════════════════════════════════════════════════════════════
console.log('── A · Una notificación se firma con la identidad de quien escribe ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  /*
   * Los avisos con la forma EXACTA que escribe la app (`notificationService.createNotification`: `addDoc` con
   * `read: false` y `createdAt: Timestamp.now()`, sin los campos `undefined`), uno por cada creador que la usa hoy:
   * `useLikes` (like), `useComentarios` (comment) y `econtactService` (econtact_request / econtact_accepted).
   */
  const ahora = () => new Date();
  const avatar = { senderAvatar: 'https://res.cloudinary.com/wee/image/upload/v1/avatars/ana.jpg', senderAvatarType: 'custom' };
  const like = (senderId, extra = {}) => ({
    type: 'like', recipientId: BETO, senderId, senderName: 'Ana', ...avatar,
    postId: 'p1', postContent: 'Mi primer corto hecho con Weë Studio'.substring(0, 100), read: false, createdAt: ahora(), ...extra,
  });
  const n = (senderId) => like(senderId);

  await esperar('1) Ana avisa a Beto con SU cuenta (un like, como useLikes)', 'PERMITE', 'PATCH', '/notifications/n1', { uid: ANA, body: doc(n(ANA)) });
  await esperar('2) y con su Perfil Weë, que también es suyo (un comentario, como useComentarios)', 'PERMITE', 'PATCH', '/notifications/n2', {
    uid: ANA, body: doc(like(WEE_ANA, { type: 'comment', commentId: 'c1', commentContent: 'Qué bueno'.substring(0, 100) })),
  });
  await esperar('2b) una solicitud de ËContact entre caras Weë, con la cuenta de quien recibe (econtactService)', 'PERMITE', 'PATCH', '/notifications/n2b', {
    uid: ANA, body: doc({ type: 'econtact_request', recipientId: `hidi_${BETO}`, senderId: WEE_ANA, senderName: 'Ana Weë', senderAvatarType: 'predefined', senderAvatarId: 'av3', recipientAccountId: BETO, senderProfileType: 'wee', read: false, createdAt: ahora() }),
  });
  await esperar('2c) y la aceptación, desde la cuenta', 'PERMITE', 'PATCH', '/notifications/n2c', {
    uid: ANA, body: doc({ type: 'econtact_accepted', recipientId: BETO, senderId: ANA, senderName: 'Ana', recipientAccountId: BETO, senderProfileType: 'real', read: false, createdAt: ahora() }),
  });
  await esperar('2d) una vista previa de 100 emojis cortada como la corta la app (substring(0, 100)) cabe', 'PERMITE', 'PATCH', '/notifications/n2d', {
    uid: ANA, body: doc(like(ANA, { postContent: '🎬'.repeat(100).substring(0, 100) })),
  });

  /* 3 · EL AGUJERO. Ana no puede hacerle llegar a Beto un aviso firmado por otro. */
  await esperar('3) pero NO firmando como Beto', 'DENIEGA', 'PATCH', '/notifications/n3', { uid: ANA, body: doc(n(BETO)) });
  await esperar('4) ni como una identidad inventada', 'DENIEGA', 'PATCH', '/notifications/n4', { uid: ANA, body: doc(n('hidi_cualquiera')) });
  const { senderId: _sinRemitente, ...sinSenderId } = like(ANA);
  await esperar('5) ni sin decir quién es', 'DENIEGA', 'PATCH', '/notifications/n5', { uid: ANA, body: doc(sinSenderId) });

  /* 5b–5q · EL PUSH A CUALQUIERA. Firmar con su cara no basta: el aviso tiene que ser uno de los que manda la app. */
  const negar = async (id, nombre, cuerpo, uid = ANA) => esperar(nombre, 'DENIEGA', 'PATCH', `/notifications/${id}`, { uid, body: doc(cuerpo) });
  await negar('n5b', '5b) Ana no se avisa a sí misma', like(ANA, { recipientId: ANA }));
  await negar('n5c', '5c) ni a su otra cara (Real → Weë)', like(ANA, { recipientId: WEE_ANA }));
  await negar('n5d', '5d) ni desde su cara Weë a su cuenta', like(WEE_ANA, { recipientId: ANA }));
  await negar('n5e', '5e) un tipo que la app no crea («message», que sí manda push)', like(ANA, { type: 'message' }));
  await negar('n5f', '5f) ni uno histórico («follow»: se lee, ya no se crea)', like(ANA, { type: 'follow' }));
  await negar('n5g', '5g) ni un campo que la app no escribe (un «title» para el push)', like(ANA, { title: 'Soporte Weë: verifica tu cuenta' }));
  await negar('n5h', '5h) ni un aviso que nace leído', like(ANA, { read: true }));
  await negar('n5i', '5i) ni un nombre de 5000 caracteres', like(ANA, { senderName: 'A'.repeat(5000) }));
  await negar('n5j', '5j) ni una vista previa de 5000', like(ANA, { postContent: 'x'.repeat(5000) }));
  await negar('n5k', '5k) ni un comentario de 5000', like(ANA, { type: 'comment', commentId: 'c1', commentContent: 'x'.repeat(5000) }));
  await negar('n5l', '5l) ni una fecha de mañana (para quedarse arriba de la bandeja)', like(ANA, { createdAt: new Date(Date.now() + 24 * 3600 * 1000) }));
  await negar('n5m', '5m) ni una fecha que no es una fecha', like(ANA, { createdAt: '2099-01-01' }));
  const { createdAt: _sinFecha, ...sinFecha } = like(ANA);
  await negar('n5n', '5n) ni sin fecha', sinFecha);
  await negar('n5o', '5o) ni un tipo de perfil inventado', like(ANA, { senderProfileType: 'admin' }));
  await negar('n5p', '5p) ni un destinatario que no es un texto', like(ANA, { recipientId: ['a', 'b'] }));
  await negar('n5q', '5q) ni un avatar de 10 000 caracteres', like(ANA, { senderAvatar: 'https://x/' + 'a'.repeat(10000) }));

  /* 5r–5w · Después, el destinatario solo la marca como leída. Antes podía reescribirla entera. */
  check('5r) CONTROL: Beto marca el aviso como leído (markAsRead)', (await escribir('/notifications/n1', BETO, { read: true })) < 400);
  /* El texto y el tipo antes que el destinatario: si el destinatario cambiara, los dos de después no probarían nada. */
  check('5s) Beto no le cambia el texto', (await escribir('/notifications/n2c', BETO, { postContent: 'otra cosa' })) >= 400);
  check('5t) ni el tipo', (await escribir('/notifications/n2c', BETO, { type: 'comment' })) >= 400);
  check('5u) ni el destinatario (sería mandárselo a otra persona sin pasar por create)',
    (await escribir('/notifications/n2c', BETO, { recipientId: 'carla00000000000000000003' })) >= 400);
  check('5v) ni lo «desmarca» (la app no lo hace)', (await escribir('/notifications/n1', BETO, { read: false })) >= 400);
  check('5w) y quien no lo recibió no lo toca', (await escribir('/notifications/n2c', ANA, { read: true })) >= 400);
  await esperar('5x) CONTROL: Beto lo borra (deleteNotification)', 'PERMITE', 'DELETE', '/notifications/n2d', { uid: BETO });
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── B · Un contador se mueve de uno en uno, o no se mueve ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  await sembrar('/posts/p1', { userId: BETO, content: 'hola', isPrivate: false, agreementCount: 5, disagreementCount: 0, views: 10, likes: 0, comments: 0, shares: 0, reposts: 0 });

  check('6) Ana puede sumar un acuerdo a la publicación de Beto',
    (await escribir('/posts/p1', ANA, { agreementCount: 6 })) < 400);
  check('7) y restarlo',
    (await escribir('/posts/p1', ANA, { agreementCount: 5 })) < 400);

  /* 8 · EL AGUJERO: escribir el número que le dé la gana. */
  check('8) pero NO puede ponerle el número que quiera',
    (await escribir('/posts/p1', ANA, { agreementCount: 9999 })) >= 400);
  check('9) ni vaciárselo de un golpe',
    (await escribir('/posts/p1', ANA, { agreementCount: 0 })) >= 400);
  check('10) ni dejarlo negativo',
    (await escribir('/posts/p1', ANA, { agreementCount: -1 })) >= 400);
  check('11) ni saltar de dos en dos',
    (await escribir('/posts/p1', ANA, { agreementCount: 7 })) >= 400);
  check('12) ni tocar el contenido por la puerta de los contadores',
    (await escribir('/posts/p1', ANA, { content: 'te hackeé' })) >= 400);

  /* 13 · Y el dueño sigue pudiendo editar lo suyo sin restricción de contadores. */
  check('13) CONTROL: Beto sigue mandando en su publicación',
    (await escribir('/posts/p1', BETO, { content: 'lo edito yo' })) < 400);

  /* 14 · El contador de seguidores de un perfil ajeno ya no se toca en absoluto. */
  await sembrar('/users/uBeto', { uid: BETO, displayName: 'Beto', followers: 3, following: 1 });
  check('14) el perfil de Beto ya NO admite que nadie le mueva los seguidores',
    (await escribir('/users/uBeto', ANA, { followers: 4 })) >= 400,
    'la rama existía para follows, que es código muerto');
  check('15) CONTROL: Beto sí puede escribir en el suyo',
    (await escribir('/users/uBeto', BETO, { displayName: 'Beto B.' })) < 400);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── C · Una cuenta, un voto ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  await esperar('16) Ana vota con su cuenta', 'PERMITE', 'PATCH', `/votes/${ANA}_p1`, {
    uid: ANA, body: doc({ postId: 'p1', userId: ANA, type: 'agree' }),
  });

  /* 17 · EL AGUJERO: el segundo voto, con la otra cara. */
  await esperar('17) y NO puede votar otra vez con su Perfil Weë', 'DENIEGA', 'PATCH', `/votes/${WEE_ANA}_p1`, {
    uid: ANA, body: doc({ postId: 'p1', userId: WEE_ANA, type: 'agree' }),
  });
  await esperar('18) ni en un comentario', 'DENIEGA', 'PATCH', `/commentVotes/comment_${WEE_ANA}_c1`, {
    uid: ANA, body: doc({ commentId: 'c1', userId: WEE_ANA, type: 'agree' }),
  });

  /* 19 · Los que YA existen tienen que poder deshacerse: no se estranda a nadie. */
  await sembrar(`/votes/${WEE_ANA}_p9`, { postId: 'p9', userId: WEE_ANA, type: 'agree' });
  await esperar('19) pero un voto antiguo con la cara Weë SÍ se puede retirar', 'PERMITE', 'DELETE', `/votes/${WEE_ANA}_p9`, { uid: ANA });
  await esperar('20) y el de otra persona no', 'DENIEGA', 'DELETE', `/votes/${ANA}_p1`, { uid: BETO });
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── D · Weë Business y comunidades, desde la cuenta ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  /*
   * Esto NO es un agujero: es lo contrario. Las reglas ya exigían la cuenta y
   * el cliente escribía la cara, así que desde el Perfil Weë la operación se
   * DENEGABA y registrar un negocio era imposible. Lo que se arregló está en el
   * cliente; esto comprueba que la frontera correcta sigue siendo la que era.
   */
  await esperar('21) un negocio se registra con la CUENTA', 'PERMITE', 'PATCH', '/businesses/b1', {
    uid: ANA, body: doc({ ownerId: ANA, name: 'Café', status: 'active', followersCount: 0, auraScore: 0, reviewCount: 0 }),
  });
  await esperar('22) y NO con la cara Weë: un negocio es una Página del Account', 'DENIEGA', 'PATCH', '/businesses/b2', {
    uid: ANA, body: doc({ ownerId: WEE_ANA, name: 'Otro', status: 'active' }),
  });
  await esperar('23) seguirlo también es de la cuenta', 'PERMITE', 'PATCH', `/businessFollows/${ANA}_biz_b1`, {
    uid: ANA, body: doc({ userId: ANA, businessId: 'b1' }),
  });

  check('24) y su contador de seguidores se mueve de uno en uno',
    (await escribir('/businesses/b1', BETO, { followersCount: 1 })) < 400);
  check('25) pero nadie le pone 9999 seguidores',
    (await escribir('/businesses/b1', BETO, { followersCount: 9999 })) >= 400);
  check('26) ni una puntuación fuera de rango',
    (await escribir('/businesses/b1', BETO, { auraScore: 99 })) >= 400);

  /*
   * 26a–26u · LO QUE WEË AFIRMA DE UN NEGOCIO («Verificado», Destacados, su estado y su dueño) NO LO ESCRIBE SU DUEÑO.
   * El negocio nace como lo crea `weeBizService.createBusiness`; el dueño lo edita como `updateBusiness`.
   */
  const ahora = new Date();
  const comoLaApp = (extra = {}) => ({
    ownerId: ANA, name: 'Café Weë', description: 'Café de especialidad', categoryId: 'food', subcategory: 'cafetería',
    location: 'Madrid', externalLink: 'cafe.example', logo: 'https://res.cloudinary.com/wee/weebiz-logos/cafe.png', nameLower: 'café weë',
    auraScore: 0, reviewCount: 0, followersCount: 0, verified: false, featured: false, status: 'active', createdAt: ahora, updatedAt: ahora, ...extra,
  });
  await esperar('26a) CONTROL: el negocio, tal como lo crea la app', 'PERMITE', 'PATCH', '/businesses/bApp', { uid: ANA, body: doc(comoLaApp()) });
  await esperar('26b) pero NO nace verificado', 'DENIEGA', 'PATCH', '/businesses/bV', { uid: ANA, body: doc(comoLaApp({ verified: true })) });
  await esperar('26c) ni destacado', 'DENIEGA', 'PATCH', '/businesses/bF', { uid: ANA, body: doc(comoLaApp({ featured: true })) });
  await esperar('26d) ni con una puntuación o unas reseñas que no tiene', 'DENIEGA', 'PATCH', '/businesses/bA', { uid: ANA, body: doc(comoLaApp({ auraScore: 5, reviewCount: 120 })) });
  await esperar('26e) ni con seguidores', 'DENIEGA', 'PATCH', '/businesses/bS', { uid: ANA, body: doc(comoLaApp({ followersCount: 5000 })) });
  await esperar('26f) ni en otro estado que activo', 'DENIEGA', 'PATCH', '/businesses/bP', { uid: ANA, body: doc(comoLaApp({ status: 'pending' })) });

  check('26g) CONTROL: la dueña edita su negocio como updateBusiness',
    (await escribir('/businesses/bApp', ANA, { name: 'Café Weë Centro', nameLower: 'café weë centro', description: 'Nuevo local', logo: 'https://res.cloudinary.com/wee/x.png', updatedAt: new Date() })) < 400);
  check('26h) pero no se pone la insignia «Verificado»', (await escribir('/businesses/bApp', ANA, { verified: true })) >= 400);
  check('26i) ni se mete en Destacados', (await escribir('/businesses/bApp', ANA, { featured: true })) >= 400);
  check('26j) ni se lo regala a otra cuenta (y con él el catálogo)', (await escribir('/businesses/bApp', ANA, { ownerId: BETO })) >= 400);
  check('26k) ni se pone 9999 seguidores por la puerta del dueño', (await escribir('/businesses/bApp', ANA, { followersCount: 9999 })) >= 400);
  await sembrar('/businesses/bSusp', { ownerId: ANA, name: 'Suspendido', status: 'suspended', verified: false, featured: false, followersCount: 0, auraScore: 0, reviewCount: 0 });
  check('26l) ni levanta una suspensión', (await escribir('/businesses/bSusp', ANA, { status: 'active' })) >= 400);
  /* Un negocio antiguo con un dato raro (escrito antes de estas reglas) sigue pudiendo editarse en lo suyo. */
  await sembrar('/businesses/bViejo', { ownerId: ANA, name: 'Antiguo', status: 'active', auraScore: 7, reviewCount: 2.5, followersCount: 3 });
  check('26l2) CONTROL: la dueña de un negocio antiguo con contadores raros sigue editando su nombre', (await escribir('/businesses/bViejo', ANA, { name: 'Antiguo renovado' })) < 400);
  check('26l3) pero mover sus contadores sí exige que queden sanos', (await escribir('/businesses/bViejo', ANA, { followersCount: 4 })) >= 400);
  check('26m) y Beto tampoco verifica el de Ana', (await escribir('/businesses/bApp', BETO, { verified: true })) >= 400);
  check('26n) administración (claim admin) sí verifica', (await escribir('/businesses/bApp', { admin: 'jefa' }, { verified: true })) < 400);
  check('26o) y destaca', (await escribir('/businesses/bApp', { admin: 'jefa' }, { featured: true })) < 400);
  check('26p) CONTROL: con la insignia puesta, la dueña sigue editando su descripción', (await escribir('/businesses/bApp', ANA, { description: 'Abierto los domingos' })) < 400);
  check('26q) pero no se la quita ni se la cambia', (await escribir('/businesses/bApp', ANA, { verified: false })) >= 400);

  /* Reseñas: de 1 a 5 enteros, de quien la escribe, de ESTE negocio, y el dueño no reseña el suyo. */
  const resena = (userId, extra = {}) => ({ userId, userName: 'Beto', userAvatar: 'https://res.cloudinary.com/wee/beto.jpg', rating: 4, text: 'Muy buen café', businessId: 'bApp', createdAt: new Date(), ...extra });
  await esperar('26r) CONTROL: Beto reseña el negocio de Ana, como createReview', 'PERMITE', 'PATCH', '/businesses/bApp/reviews/r1', { uid: BETO, body: doc(resena(BETO)) });
  check('26s) CONTROL: y la media se recalcula desde el cliente (recalculateAura)', (await escribir('/businesses/bApp', BETO, { auraScore: 4, reviewCount: 1 })) < 400);
  await esperar('26t) la dueña NO reseña su propio negocio', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r2', { uid: ANA, body: doc(resena(ANA, { userName: 'Ana', rating: 5 })) });
  await esperar('26u) ni con un 6', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r3', { uid: BETO, body: doc(resena(BETO, { rating: 6 })) });
  await esperar('26v) ni con un 0', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r4', { uid: BETO, body: doc(resena(BETO, { rating: 0 })) });
  await esperar('26w) ni con un 4,5 (las estrellas son enteras)', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r5', { uid: BETO, body: doc(resena(BETO, { rating: 4.5 })) });
  await esperar('26x) ni con un «5» de texto', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r6', { uid: BETO, body: doc(resena(BETO, { rating: '5' })) });
  await esperar('26y) ni sin puntuación', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r7', { uid: BETO, body: doc((({ rating, ...r }) => r)(resena(BETO))) });
  await esperar('26z) ni a nombre de otra persona', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r8', { uid: BETO, body: doc(resena('carla00000000000000000003')) });
  await esperar('26aa) ni diciendo que es de otro negocio', 'DENIEGA', 'PATCH', '/businesses/bApp/reviews/r9', { uid: BETO, body: doc(resena(BETO, { businessId: 'b1' })) });
  await esperar('26ab) ni en un negocio que no existe', 'DENIEGA', 'PATCH', '/businesses/noExiste/reviews/r10', { uid: BETO, body: doc(resena(BETO, { businessId: 'noExiste' })) });
  await esperar('26ac) CONTROL: Beto borra la suya', 'PERMITE', 'DELETE', '/businesses/bApp/reviews/r1', { uid: BETO });

  await esperar('27) una comunidad se crea con la CUENTA como dueña', 'PERMITE', 'PATCH', '/communities/c1', {
    uid: ANA, body: doc({ name: 'Weë Devs', slug: 'devs', createdBy: ANA, moderators: [ANA], memberCount: 0, postCount: 0, status: 'active' }),
  });
  check('28) y sus contadores también se mueven de uno en uno',
    (await escribir('/communities/c1', BETO, { memberCount: 1 })) < 400
    && (await escribir('/communities/c1', BETO, { memberCount: 500 })) >= 400);
  check('29) CONTROL: quien la creó sigue pudiendo editarla',
    (await escribir('/communities/c1', ANA, { name: 'Weë Developers' })) < 400);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo de la cuenta no lo lee nadie más ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  /*
   * El dueño se reconoce por el campo `uid` del perfil padre, no por el id del
   * documento: aquí el perfil se llama como el uid (forma heredada) y sigue
   * valiendo porque la regla mira el campo. Con id automático, ver el bloque H.
   */
  await sembrar(`/users/${ANA}`, { uid: ANA, displayName: 'Ana', profileType: 'real' });
  await sembrar(`/users/${ANA}/private/datos`, { email: 'ana@ejemplo.com', linkedAccountId: WEE_ANA });
  await esperar('30) el subárbol privado lo lee su dueño', 'PERMITE', 'GET', `/users/${ANA}/private/datos`, { uid: ANA });
  await esperar('31) y nadie más', 'DENIEGA', 'GET', `/users/${ANA}/private/datos`, { uid: BETO });
  await esperar('32) y lo que escribe el servidor no lo toca ni su dueño: solo `account`, y solo sus campos', 'DENIEGA', 'PATCH', `/users/${ANA}/private/datos`, {
    uid: ANA, body: doc({ email: 'otro@ejemplo.com' }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── F · El material es de su cuenta, y solo el servidor lo escribe (Fase 11) ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  await sembrar('/assets/asset_a1', { contract: '1.0', assetId: 'asset_a1', ownerAccountId: ANA, kind: 'image', status: 'ready', createdAt: 1, updatedAt: 1 });

  await esperar('33) la dueña lee su material', 'PERMITE', 'GET', '/assets/asset_a1', { uid: ANA });
  await esperar('34) y nadie más', 'DENIEGA', 'GET', '/assets/asset_a1', { uid: BETO });

  /* 35–37 · Ni siquiera la dueña escribe: decir «esto es mío» lo hace el servidor. */
  await esperar('35) la dueña NO puede crear una ficha desde el cliente', 'DENIEGA', 'PATCH', '/assets/asset_a2', {
    uid: ANA, body: doc({ contract: '1.0', assetId: 'asset_a2', ownerAccountId: ANA, kind: 'image', status: 'ready', createdAt: 1, updatedAt: 1 }),
  });
  check('36) ni cambiarle el dueño a la suya',
    (await escribir('/assets/asset_a1', ANA, { ownerAccountId: BETO })) >= 400);
  await esperar('37) ni borrarla a mano: se pide con deleteAsset, que borra el objeto también', 'DENIEGA', 'DELETE', '/assets/asset_a1', { uid: ANA });
  await esperar('38) y Beto no puede hacerse una ficha diciendo que es de Ana', 'DENIEGA', 'PATCH', '/assets/asset_a3', {
    uid: BETO, body: doc({ contract: '1.0', assetId: 'asset_a3', ownerAccountId: ANA, kind: 'image', status: 'ready', createdAt: 1, updatedAt: 1 }),
  });

  /* 39–41 · Un proyecto no se regala por accidente. */
  await sembrar('/creatorProjects/proy1', { userId: ANA, name: 'Mi anuncio', emoji: '📁' });
  check('39) la dueña renombra su proyecto',
    (await escribir('/creatorProjects/proy1', ANA, { name: 'Mi anuncio de verano' })) < 400);
  check('40) pero NO puede cambiarle el dueño',
    (await escribir('/creatorProjects/proy1', ANA, { userId: BETO })) >= 400,
    'antes la regla solo miraba el documento que había, no el que llegaba');
  check('41) y Beto no toca lo que no es suyo',
    (await escribir('/creatorProjects/proy1', BETO, { name: 'mío ahora' })) >= 400);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── H · Lo de la cuenta, fuera del perfil público (cierre de F11) ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  /* El perfil tiene id automático y guarda la cuenta en `uid`, como en producción. */
  await sembrar('/users/perfilAna', { uid: ANA, displayName: 'Ana', profileType: 'real', bio: '' });
  const token = (t) => ({ token: t, platform: 'android' });

  /* 42–46 · El token de push: lo escribe su dueña y no lo lee nadie desde el cliente. */
  await esperar('42) Ana guarda el token de su aparato en pushTokens/{su uid}', 'PERMITE', 'PATCH', `/pushTokens/${ANA}`, { uid: ANA, body: doc(token('ExponentPushToken[ana]')) });
  await esperar('43) Beto no puede leerlo', 'DENIEGA', 'GET', `/pushTokens/${ANA}`, { uid: BETO });
  await esperar('44) ni la propia Ana desde el cliente: lo lee el servidor al enviar', 'DENIEGA', 'GET', `/pushTokens/${ANA}`, { uid: ANA });
  await esperar('45) Beto no puede escribir el de Ana', 'DENIEGA', 'PATCH', `/pushTokens/${ANA}`, { uid: BETO, body: doc(token('ExponentPushToken[beto]')) });
  await esperar('46) y un campo de más no entra', 'DENIEGA', 'PATCH', `/pushTokens/${ANA}`, { uid: ANA, body: doc({ ...token('ExponentPushToken[ana]'), extra: 'x' }) });
  /* 46b–46d · Con el idioma de la app del aparato, para escribir el aviso en él: solo una etiqueta de idioma. */
  await esperar('46b) Ana guarda el idioma de su app con el token', 'PERMITE', 'PATCH', `/pushTokens/${ANA}`, { uid: ANA, body: doc({ ...token('ExponentPushToken[ana]'), locale: 'da-DK' }) });
  await esperar('46c) pero no cualquier texto como idioma', 'DENIEGA', 'PATCH', `/pushTokens/${ANA}`, { uid: ANA, body: doc({ ...token('ExponentPushToken[ana]'), locale: '<script>alert(1)</script>' }) });
  await esperar('46d) ni uno larguísimo', 'DENIEGA', 'PATCH', `/pushTokens/${ANA}`, { uid: ANA, body: doc({ ...token('ExponentPushToken[ana]'), locale: 'da-' + 'x'.repeat(60) }) });

  /* 47–50 · Ningún campo de cuenta vuelve al perfil público, ni por su dueña. */
  check('47) Ana no puede escribir su email en el perfil público', (await escribir('/users/perfilAna', ANA, { email: 'ana@wee.zone' })) >= 400);
  check('48) ni un token de push', (await escribir('/users/perfilAna', ANA, { pushToken: 'ExponentPushToken[ana]' })) >= 400);
  check('49) ni su fecha de nacimiento', (await escribir('/users/perfilAna', ANA, { birthDate: '1990-01-01' })) >= 400);
  check('50) pero su bio sí, que es pública', (await escribir('/users/perfilAna', ANA, { bio: 'Hola' })) < 400);

  /* 51–56 · Lo privado va a private/account: lo escribe y lo lee solo la dueña, y solo esos campos. */
  await esperar('51) Ana guarda nombre real, fecha y género en su documento privado', 'PERMITE', 'PATCH', '/users/perfilAna/private/account', { uid: ANA, body: doc({ realName: 'Ana Pérez', birthDate: '1990-01-01', gender: 'female' }) });
  await esperar('52) y los lee', 'PERMITE', 'GET', '/users/perfilAna/private/account', { uid: ANA });
  await esperar('53) Beto no los lee', 'DENIEGA', 'GET', '/users/perfilAna/private/account', { uid: BETO });
  await esperar('54) ni los escribe', 'DENIEGA', 'PATCH', '/users/perfilAna/private/account', { uid: BETO, body: doc({ realName: 'Beto' }) });
  await esperar('55) un campo fuera de la lista no entra ni siendo la dueña', 'DENIEGA', 'PATCH', '/users/perfilAna/private/account', { uid: ANA, body: doc({ realName: 'Ana', email: 'ana@wee.zone' }) });
  await esperar('56) y otro documento privado no se crea desde el cliente', 'DENIEGA', 'PATCH', '/users/perfilAna/private/otro', { uid: ANA, body: doc({ realName: 'Ana' }) });
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
