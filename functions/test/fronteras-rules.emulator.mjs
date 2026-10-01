/*
 * LAS FRONTERAS DE AUTORIZACIÓN, EJECUTADAS (fase 10).
 *
 * Cuatro agujeros que la revisión encontró y que NO se pueden comprobar
 * leyendo el archivo de reglas: hay que intentar la escritura y ver si pasa.
 *
 *   A · Notificaciones firmadas por otra persona. Una notificación no se queda
 *       en la base de datos: dispara un push de verdad cuyo título sale de
 *       `senderName` tal cual llega.
 *   B · Contadores de documentos ajenos escritos a dedo. `followers: 9999999`
 *       en el perfil de quien sea, `agreementCount: 0` en la publicación de
 *       quien sea.
 *   C · Dos votos de la misma persona en la misma publicación, uno por cada
 *       cara. En producción hay ocho votos con identidad Weë.
 *   D · Weë Business y crear comunidad desde el Perfil Weë, que las reglas
 *       DENEGABAN porque el cliente escribía la cara y la regla exige la cuenta.
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

const pedir = async (metodo, ruta, { uid, body } = {}) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${uid ? sesion(uid) : 'owner'}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
};

/* Valores de Firestore REST, a mano: aquí no hay SDK. */
const v = (x) => {
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
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
  const n = (senderId) => ({ recipientId: BETO, senderId, senderName: 'Weë Soporte', type: 'message', read: false });

  await esperar('1) Ana avisa a Beto con SU cuenta', 'PERMITE', 'PATCH', '/notifications/n1', { uid: ANA, body: doc(n(ANA)) });
  await esperar('2) y con su Perfil Weë, que también es suyo', 'PERMITE', 'PATCH', '/notifications/n2', { uid: ANA, body: doc(n(WEE_ANA)) });

  /* 3 · EL AGUJERO. Ana no puede hacerle llegar a Beto un aviso firmado por otro. */
  await esperar('3) pero NO firmando como Beto', 'DENIEGA', 'PATCH', '/notifications/n3', { uid: ANA, body: doc(n(BETO)) });
  await esperar('4) ni como una identidad inventada', 'DENIEGA', 'PATCH', '/notifications/n4', { uid: ANA, body: doc(n('hidi_cualquiera')) });
  await esperar('5) ni sin decir quién es', 'DENIEGA', 'PATCH', '/notifications/n5', {
    uid: ANA, body: doc({ recipientId: BETO, senderName: 'Weë', type: 'message', read: false }),
  });
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
