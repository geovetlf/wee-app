/*
 * FASE 11.x-4A — LAS FRONTERAS DE IDENTIDAD E INTEGRIDAD, EJECUTADAS.
 *
 * Lo que la auditoría 11.x-3 encontró en las reglas no se comprueba leyendo el
 * archivo: hay que intentar la escritura y ver si pasa.
 *
 *   1 · Perfiles: nadie escribe números ni entidades del Identity Core, ni
 *       nace apuntando a una cara ajena, ni reescribe su identidad.
 *   2 · Publicaciones, comentarios, votos y reposts: la autoría no se edita.
 *   3 · WeeTalk: participantes fijos, remitente de la sesión, mensajes que
 *       solo se marcan o se vacían. Real→Real, Real→Weë, Weë→Real, Weë→Weë.
 *   4 · Comunidades: el creador y los moderadores salen de la sesión.
 *   5 · El inventario Biz encuentra perfiles con id automático.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21. Desde la
 * raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/integridad-11x4a.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return res.status;
};

/* Una sesión de Firebase Auth sin firmar: el emulador no verifica firmas. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid, claims = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' }, ...claims,
  }) + '.';
};

/* Valores de Firestore REST, a mano: aquí no hay SDK. */
const v = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });

const pedir = async (metodo, ruta, { uid, body, claims } = {}) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${uid ? sesion(uid, claims) : 'owner'}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
};
const permite = (status) => status < 400;

/* Sembrar como administrador: el servidor no pasa por las reglas. */
const sembrar = (ruta, datos) => pedir('PATCH', ruta, { body: doc(datos) });
/* Crear: solo si no existe, para que se evalúe la regla `create`. */
const crear = (ruta, uid, datos, claims) => pedir('PATCH', `${ruta}?currentDocument.exists=false`, { uid, body: doc(datos), claims });
/* Actualizar SOLO unos campos, como un `update` del cliente (admite rutas con punto: `lastMessage.read`). */
const escribir = (ruta, uid, datos) => {
  const partes = Object.keys(datos);
  const cuerpo = {};
  for (const clave of partes) {
    const [cabeza, ...resto] = clave.split('.');
    if (!resto.length) cuerpo[cabeza] = datos[clave];
    else cuerpo[cabeza] = { ...(cuerpo[cabeza] || {}), [resto.join('.')]: datos[clave] };
  }
  const mascara = partes.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  return pedir('PATCH', `${ruta}?${mascara}&currentDocument.exists=true`, { uid, body: doc(cuerpo) });
};
const leer = (ruta, uid) => pedir('GET', ruta, { uid });

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/* Las comprobaciones 1–61 llevan su número escrito; desde la 62 se numeran solas. */
let n = 62;
const num = (texto) => `${n++}) ${texto}`;
const espera = async (nombre, esperado, promesa) => {
  const status = await promesa;
  check(nombre, permite(status) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

/* Tres cuentas con uid de la forma de Firebase, y sus caras Weë (dato heredado). */
const A = 'anaAAAAAAAAAAAAAAAAAAAAAAAA1';
const B = 'betoBBBBBBBBBBBBBBBBBBBBBBB2';
const C = 'carlaCCCCCCCCCCCCCCCCCCCCCC3';
const M = 'modeMMMMMMMMMMMMMMMMMMMMMMM4';
const WA = `hidi_${A}`;
const WB = `hidi_${B}`;
const ahora = new Date();

const estado = await cargarReglas(fs.readFileSync(process.argv[2] || path.join(RAIZ, 'firestore.rules'), 'utf8'));
if (estado !== 200) { console.error('✘ las reglas no compilaron:', estado); process.exit(1); }
console.log('reglas cargadas en el emulador\n');

// ═══════════════════════════════════════════════════════════════════════════
console.log('── 1 · Perfiles: la identidad y el Identity Core son del servidor ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const real = (extra = {}) => ({ uid: A, displayName: 'Ana', profileType: 'real', bio: '', ...extra });
  await espera('1) Ana no nace con un número de cuenta escrito por ella', 'DENIEGA', crear(`/users/${A}`, A, real({ accountNumber: '0000001' })));
  await espera('2) ni con un número de billetera', 'DENIEGA', crear(`/users/${A}`, A, real({ walletNumber: '0000001' })));
  await espera('3) ni con una entidad, su tipo o su secuencia', 'DENIEGA', crear(`/users/${A}`, A, real({ entityId: '00000011', entityType: 'REAL_PROFILE', entitySequence: 1 })));
  await espera('4) ni con un dueño', 'DENIEGA', crear(`/users/${A}`, A, real({ ownerAccountId: B })));
  await espera('5) ni apuntando a la cara Weë de OTRA cuenta', 'DENIEGA', crear(`/users/${A}`, A, real({ linkedAccountId: WB })));
  await espera('6) CONTROL: su Perfil Real limpio sí nace', 'PERMITE', crear(`/users/${A}`, A, real()));

  await espera('7) y después no se pone un número de cuenta', 'DENIEGA', escribir(`/users/${A}`, A, { accountNumber: '0000001' }));
  await espera('8) ni de billetera', 'DENIEGA', escribir(`/users/${A}`, A, { walletNumber: '0000001' }));
  await espera('9) ni una entidad', 'DENIEGA', escribir(`/users/${A}`, A, { entityId: '00000011' }));
  await espera('10) ni un dueño', 'DENIEGA', escribir(`/users/${A}`, A, { ownerAccountId: A }));
  await espera('11) ni cambia su uid', 'DENIEGA', escribir(`/users/${A}`, A, { uid: B }));
  await espera('12) ni su tipo', 'DENIEGA', escribir(`/users/${A}`, A, { profileType: 'hidi' }));
  await espera('13) ni apunta su vínculo a la cara de otro', 'DENIEGA', escribir(`/users/${A}`, A, { linkedAccountId: WB }));
  await espera('14) CONTROL: pero sí a la suya', 'PERMITE', escribir(`/users/${A}`, A, { linkedAccountId: WA }));
  await espera('15) CONTROL: y edita su bio', 'PERMITE', escribir(`/users/${A}`, A, { bio: 'Hola' }));

  await espera('16) Beto no crea el perfil de Ana en el sitio de Ana', 'DENIEGA', crear(`/users/${A}x`, B, real()));
  await espera('17) ni un perfil suyo que diga ser Ana', 'DENIEGA', crear(`/users/${B}`, B, real()));
  await espera('18) ni un perfil suyo con id elegido', 'DENIEGA', crear('/users/idElegidoPorBeto', B, { uid: B, displayName: 'Beto', profileType: 'real' }));

  /* La forma de producción: id automático, uid en un campo. */
  await sembrar('/users/autoDeBeto', { uid: B, displayName: 'Beto', profileType: 'real' });
  await espera('19) el dueño de un perfil antiguo no se cambia el uid para colarse delante de otra cuenta', 'DENIEGA', escribir('/users/autoDeBeto', B, { uid: A }));
  await espera('20) CONTROL: y lo sigue editando', 'PERMITE', escribir('/users/autoDeBeto', B, { displayName: 'Beto B.' }));

  const cara = { uid: WA, displayName: 'Cara de Ana', profileType: 'hidi', linkedAccountId: A };
  await espera('21) la cara Weë no nace con un número de cuenta', 'DENIEGA', crear(`/users/${WA}`, A, { ...cara, accountNumber: '0000001' }));
  await espera('22) CONTROL: Ana crea su cara en su identificador', 'PERMITE', crear(`/users/${WA}`, A, cara));
  await espera('23) Beto no crea una cara que declare la cuenta de Ana', 'DENIEGA', crear(`/users/${WB}`, B, { uid: WB, displayName: 'x', profileType: 'hidi', linkedAccountId: A }));
  await espera('24) la cara de Ana no cambia de cuenta', 'DENIEGA', escribir(`/users/${WA}`, A, { linkedAccountId: B }));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2 · Publicaciones, reposts, comentarios y votos: la autoría no se edita ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const post = (userId, extra = {}) => ({ userId, content: 'hola', isPrivate: false, likes: 0, comments: 0, shares: 0, reposts: 0, views: 0, agreementCount: 0, disagreementCount: 0, createdAt: ahora, ...extra });
  await sembrar('/posts/p1', post(A));
  await sembrar('/posts/p2', post(WA));

  await espera('25) Ana edita su publicación', 'PERMITE', escribir('/posts/p1', A, { content: 'editado' }));
  await espera('26) pero no se la regala a Beto', 'DENIEGA', escribir('/posts/p1', A, { userId: B }));
  await espera('27) ni la pasa a su otra cara: la firma no cambia', 'DENIEGA', escribir('/posts/p1', A, { userId: WA }));
  await espera('28) ni mueve su fecha para colarse arriba del muro', 'DENIEGA', escribir('/posts/p1', A, { createdAt: new Date(Date.now() + 86400000) }));
  await espera('29) desde su Perfil Weë edita lo que publicó su Perfil Weë', 'PERMITE', escribir('/posts/p2', A, { content: 'editado' }));
  await espera('30) pero no lo firma con la cuenta', 'DENIEGA', escribir('/posts/p2', A, { userId: A }));
  await espera('31) Beto suma un acuerdo', 'PERMITE', escribir('/posts/p1', B, { agreementCount: 1 }));
  await espera('32) pero no toca el texto', 'DENIEGA', escribir('/posts/p1', B, { content: 'hackeado' }));
  await espera('33) ni el autor', 'DENIEGA', escribir('/posts/p1', B, { userId: B }));

  const repost = (userId, original = 'p1') => ({ userId, content: '', isPrivate: false, isRepost: true, originalPostId: original, likes: 0, comments: 0, shares: 0, reposts: 0, views: 0, hashtags: [], createdAt: ahora });
  await espera('34) Ana repostea desde su Perfil Weë, firmado por la cara', 'PERMITE', crear('/posts/r1', A, repost(WA)));
  await espera('35) Beto repostea desde su Perfil Weë la publicación del Perfil Real de Ana', 'PERMITE', crear('/posts/r2', B, repost(WB)));
  await espera('36) nadie repostea firmando con la cara de otro', 'DENIEGA', crear('/posts/r3', A, repost(WB)));
  await espera('37) ni con la cuenta de otro', 'DENIEGA', crear('/posts/r4', A, repost(B)));
  await espera('38) un repost no cambia de original', 'DENIEGA', escribir('/posts/r1', A, { originalPostId: 'p2' }));
  await espera('39) ni deja de ser repost', 'DENIEGA', escribir('/posts/r1', A, { isRepost: false }));
  await espera('40) ni cambia de firma', 'DENIEGA', escribir('/posts/r1', A, { userId: A }));

  await sembrar('/comments/c1', { postId: 'p1', userId: WA, content: 'hola', likes: 0, agreementCount: 0, disagreementCount: 0, createdAt: ahora });
  await espera('41) Ana edita su comentario', 'PERMITE', escribir('/comments/c1', A, { content: 'editado' }));
  await espera('42) pero no le cambia la firma', 'DENIEGA', escribir('/comments/c1', A, { userId: A }));
  await espera('43) ni lo muda a otra publicación', 'DENIEGA', escribir('/comments/c1', A, { postId: 'p2' }));
  await espera('44) Beto le suma un acuerdo', 'PERMITE', escribir('/comments/c1', B, { agreementCount: 1 }));
  await espera('45) pero no le toca el texto', 'DENIEGA', escribir('/comments/c1', B, { content: 'hackeado' }));
  await espera('46) Beto comenta con su cara Weë en la publicación de la cara Weë de Ana', 'PERMITE', crear('/comments/c2', B, { postId: 'p2', userId: WB, content: 'hola', likes: 0, createdAt: ahora }));
  await espera('47) pero no firmando como Ana', 'DENIEGA', crear('/comments/c3', B, { postId: 'p2', userId: A, content: 'hola', likes: 0, createdAt: ahora }));

  const voto = (userId, postId, type = 'agree') => ({ userId, postId, type, createdAt: ahora });
  await espera(`48) Ana vota en su documento {cuenta}_{publicación}`, 'PERMITE', crear(`/votes/${A}_p1`, A, voto(A, 'p1')));
  await espera('49) no abre otro voto con otro id para la misma publicación', 'DENIEGA', crear('/votes/otroVoto', A, voto(A, 'p1')));
  await espera('50) ni un id que dice otra publicación', 'DENIEGA', crear(`/votes/${A}_p2`, A, voto(A, 'p1')));
  await espera('51) ni un tipo que no existe', 'DENIEGA', crear(`/votes/${A}_p9`, A, voto(A, 'p9', 'love')));
  await espera('52) cambia su voto', 'PERMITE', escribir(`/votes/${A}_p1`, A, { type: 'disagree' }));
  await espera('53) pero no lo muda a otra publicación', 'DENIEGA', escribir(`/votes/${A}_p1`, A, { postId: 'p2' }));
  await espera('54) ni se lo pasa a otra persona', 'DENIEGA', escribir(`/votes/${A}_p1`, A, { userId: B }));
  await espera('55) Beto no toca el voto de Ana', 'DENIEGA', escribir(`/votes/${A}_p1`, B, { type: 'agree' }));
  await espera('56) ni lo borra', 'DENIEGA', pedir('DELETE', `/votes/${A}_p1`, { uid: B }));
  await sembrar(`/votes/${WA}_p7`, voto(WA, 'p7'));
  await espera('57) un voto antiguo con la cara Weë lo sigue cambiando su dueña', 'PERMITE', escribir(`/votes/${WA}_p7`, A, { type: 'disagree' }));
  await espera('58) pero no lo convierte en uno de la cuenta', 'DENIEGA', escribir(`/votes/${WA}_p7`, A, { userId: A }));
  await espera('59) voto de comentario en su documento', 'PERMITE', crear(`/commentVotes/comment_${A}_c1`, A, { userId: A, commentId: 'c1', type: 'agree', createdAt: ahora }));
  await espera('60) y no en otro', 'DENIEGA', crear('/commentVotes/otroVotoDeComentario', A, { userId: A, commentId: 'c1', type: 'agree', createdAt: ahora }));
  await espera('61) ni se muda de comentario', 'DENIEGA', escribir(`/commentVotes/comment_${A}_c1`, A, { commentId: 'c2' }));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3 · WeeTalk: quién habla lo dice la sesión ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const ficha = (ids) => Object.fromEntries(ids.map((id) => [id, { displayName: id.startsWith('hidi_') ? 'Cara' : 'Persona' }]));
  const conversacion = (ids, extra = {}) => ({ participants: ids, participantsData: ficha(ids), createdAt: ahora, updatedAt: ahora, ...extra });
  const mensaje = (conv, senderId, extra = {}) => ({ conversationId: conv, senderId, content: 'hola', timestamp: ahora, read: false, type: 'text', ...extra });

  const combos = [['Real→Real', A, B], ['Real→Weë', A, WB], ['Weë→Real', WA, B], ['Weë→Weë', WA, WB]];
  for (const [nombre, yo, otro] of combos) {
    const conv = `conv_${nombre.replace(/[^A-Za-z]/g, '')}`;
    const pasos = {
      'crea la conversación': await crear(`/conversations/${conv}`, A, conversacion([yo, otro])),
      'escribe': await crear(`/conversations/${conv}/messages/m1`, A, mensaje(conv, yo)),
      'firma el último mensaje': await escribir(`/conversations/${conv}`, A, { lastMessage: { content: 'hola', senderId: yo, read: false, timestamp: ahora }, updatedAt: ahora }),
      'le responden': await crear(`/conversations/${conv}/messages/m2`, B, mensaje(conv, otro)),
      'marcan su mensaje como leído': await escribir(`/conversations/${conv}/messages/m1`, B, { read: true }),
      'marcan el último como leído': await escribir(`/conversations/${conv}`, B, { 'lastMessage.read': true }),
    };
    const fallidos = Object.entries(pasos).filter(([, s]) => !permite(s)).map(([k, s]) => `${k} (HTTP ${s})`);
    check(`${n++}) ${nombre}: se crea, se escribe, se responde y se marca como leído`, fallidos.length === 0, fallidos.join(', ') || 'los seis pasos');
  }

  /* Una conversación Real→Weë para las fronteras. */
  const X = 'conv_fronteras';
  await sembrar(`/conversations/${X}`, conversacion([A, WB]));
  await sembrar(`/conversations/${X}/messages/mx`, mensaje(X, A));
  await espera(`${n++}) una conversación no es de tres`, 'DENIEGA', crear('/conversations/tres', A, conversacion([A, B, C])));
  await espera(`${n++}) ni se crea entre otros dos`, 'DENIEGA', crear('/conversations/ajena', A, conversacion([B, C])));
  await espera(`${n++}) ni con campos de más`, 'DENIEGA', crear('/conversations/extra', A, conversacion([A, B], { admins: [A] })));
  await espera(`${n++}) ni con una ficha de participantes que habla de otros`, 'DENIEGA', crear('/conversations/ficha', A, { participants: [A, B], participantsData: ficha([A, C]), createdAt: ahora, updatedAt: ahora }));
  await espera(`${n++}) nadie añade a un tercero`, 'DENIEGA', escribir(`/conversations/${X}`, A, { participants: [A, WB, C] }));
  await espera(`${n++}) ni saca al otro y se queda con el historial`, 'DENIEGA', escribir(`/conversations/${X}`, A, { participants: [A, C] }));
  await espera(`${n++}) Ana no escribe firmando como la cara de Beto`, 'DENIEGA', crear(`/conversations/${X}/messages/f1`, A, mensaje(X, WB)));
  await espera(`${n++}) ni como la cuenta de Beto`, 'DENIEGA', crear(`/conversations/${X}/messages/f2`, A, mensaje(X, B)));
  await espera(`${n++}) ni con su OTRA cara, que no está en esta conversación`, 'DENIEGA', crear(`/conversations/${X}/messages/f3`, A, mensaje(X, WA)));
  await espera(`${n++}) Beto no reescribe el texto del mensaje de Ana`, 'DENIEGA', escribir(`/conversations/${X}/messages/mx`, B, { content: 'yo no dije eso' }));
  await espera(`${n++}) ni su remitente`, 'DENIEGA', escribir(`/conversations/${X}/messages/mx`, B, { senderId: WB }));
  await espera(`${n++}) CONTROL: Beto lo marca como leído`, 'PERMITE', escribir(`/conversations/${X}/messages/mx`, B, { read: true }));
  await espera(`${n++}) pero no lo desmarca`, 'DENIEGA', escribir(`/conversations/${X}/messages/mx`, B, { read: false }));
  await espera(`${n++}) Ana no firma el último mensaje con la cara de Beto`, 'DENIEGA', escribir(`/conversations/${X}`, A, { lastMessage: { content: 'falso', senderId: WB, read: false, timestamp: ahora } }));
  await espera(`${n++}) Beto no mete a Ana en «viendo el chat»`, 'DENIEGA', escribir(`/conversations/${X}`, B, { activeInChat: [A] }));
  await espera(`${n++}) CONTROL: Ana se mete a sí misma`, 'PERMITE', escribir(`/conversations/${X}`, A, { activeInChat: [A] }));
  await espera(`${n++}) Ana no elige el color de burbuja de Beto`, 'DENIEGA', escribir(`/conversations/${X}`, A, { [`bubbleColors.${WB}`]: '#000000' }));
  await espera(`${n++}) CONTROL: el suyo sí`, 'PERMITE', escribir(`/conversations/${X}`, A, { [`bubbleColors.${A}`]: '#F5B731' }));
  await espera(`${n++}) CONTROL: el tema del chat es de los dos`, 'PERMITE', escribir(`/conversations/${X}`, B, { chatTheme: 'noche' }));
  await espera(`${n++}) una tercera persona no lee la conversación`, 'DENIEGA', leer(`/conversations/${X}`, C));
  await espera(`${n++}) ni escribe en ella`, 'DENIEGA', crear(`/conversations/${X}/messages/f4`, C, mensaje(X, C)));
  await espera(`${n++}) ni la toca`, 'DENIEGA', escribir(`/conversations/${X}`, C, { chatTheme: 'robado' }));

  /* El modo efímero vacía lo efímero; la foto única la quema el servidor. */
  const E = 'conv_efimera';
  await sembrar(`/conversations/${E}`, conversacion([A, B], { ephemeral: true }));
  await sembrar(`/conversations/${E}/messages/e1`, mensaje(E, A, { ephemeral: true, imageUrl: 'https://res.cloudinary.com/x/e1.jpg', type: 'image' }));
  await sembrar(`/conversations/${E}/messages/n1`, mensaje(E, A, { imageUrl: 'https://res.cloudinary.com/x/n1.jpg', type: 'image' }));
  await sembrar(`/conversations/${E}/messages/v1`, mensaje(E, A, { viewOnce: true, viewOnceOpened: false, imageUrl: 'https://firebasestorage.googleapis.com/x/v1.jpg', type: 'image' }));
  const vaciado = { content: '', imageUrl: null, ephemeral: true, deleted: true };
  await espera(`${n++}) el modo efímero vacía un mensaje efímero`, 'PERMITE', escribir(`/conversations/${E}/messages/e1`, B, vaciado));
  await espera(`${n++}) pero no uno normal`, 'DENIEGA', escribir(`/conversations/${E}/messages/n1`, B, vaciado));
  await espera(`${n++}) el aviso del modo efímero no lo firma nadie, y solo si el chat es efímero`, 'PERMITE', escribir(`/conversations/${E}`, B, { lastMessage: { content: 'Modo efímero', senderId: '', read: true, timestamp: ahora } }));
  await espera(`${n++}) en un chat normal no vale`, 'DENIEGA', escribir(`/conversations/${X}`, A, { lastMessage: { content: 'Modo efímero', senderId: '', read: true, timestamp: ahora } }));
  await espera(`${n++}) la foto única no la marca como vista el cliente: la quema el servidor`, 'DENIEGA', escribir(`/conversations/${E}/messages/v1`, B, { viewOnceOpened: true }));
  await espera(`${n++}) ni le quita la dirección`, 'DENIEGA', escribir(`/conversations/${E}/messages/v1`, B, { imageUrl: null }));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4 · Comunidades: quién la creó lo dice la sesión ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  const comunidad = (extra = {}) => ({ name: 'Weë Devs', slug: 'devs', description: '', icon: 'code', rules: [], memberCount: 1, postCount: 0, isOfficial: false, moderators: [A], createdBy: A, status: 'active', createdAt: ahora, updatedAt: ahora, ...extra });
  await espera(num('Ana crea una comunidad a su nombre'), 'PERMITE', crear('/communities/k1', A, comunidad()));
  await espera(num('no a nombre de Beto'), 'DENIEGA', crear('/communities/k2', A, comunidad({ createdBy: B })));
  await espera(num('ni a nombre de su cara: una comunidad es de la cuenta, como un negocio'), 'DENIEGA', crear('/communities/k3', A, comunidad({ createdBy: WA, moderators: [WA] })));
  await espera(num('ni se da moderadores ajenos'), 'DENIEGA', crear('/communities/k4', A, comunidad({ moderators: [A, B] })));
  await espera(num('ni nace sin moderadora'), 'DENIEGA', crear('/communities/k5', A, comunidad({ moderators: [] })));
  await espera(num('ni se proclama oficial'), 'DENIEGA', crear('/communities/k6', A, comunidad({ isOfficial: true })));
  await espera(num('ni nace con 999 miembros'), 'DENIEGA', crear('/communities/k7', A, comunidad({ memberCount: 999 })));
  await espera(num('una sesión con el claim `admin` sí siembra una oficial'), 'PERMITE', crear('/communities/oficial1', M, { name: 'Oficial', slug: 'oficial', isOfficial: true, moderators: [], memberCount: 0, postCount: 0, status: 'active' }, { admin: true }));

  await espera(num('la creadora la renombra'), 'PERMITE', escribir('/communities/k1', A, { name: 'Weë Developers' }));
  await espera(num('pero no se la pasa a otro'), 'DENIEGA', escribir('/communities/k1', A, { createdBy: B }));
  await espera(num('ni la vuelve oficial'), 'DENIEGA', escribir('/communities/k1', A, { isOfficial: true }));
  await espera(num('la creadora nombra moderadores'), 'PERMITE', escribir('/communities/k1', A, { moderators: [A, M] }));
  await espera(num('un moderador edita la comunidad'), 'PERMITE', escribir('/communities/k1', M, { description: 'Para devs' }));
  await espera(num('pero no cambia quién modera'), 'DENIEGA', escribir('/communities/k1', M, { moderators: [M] }));
  await espera(num('cualquiera suma un miembro, de uno en uno'), 'PERMITE', escribir('/communities/k1', B, { memberCount: 2 }));
  await espera(num('pero no la renombra'), 'DENIEGA', escribir('/communities/k1', B, { name: 'Mía' }));
  await espera(num('Ana se une con su cuenta'), 'PERMITE', crear(`/communities/k1/members/${A}`, A, { userId: A, joinedAt: ahora, postCount: 0, reputation: 0 }));
  await espera(num('y con su cara Weë'), 'PERMITE', crear(`/communities/k1/members/${WA}`, A, { userId: WA, joinedAt: ahora, postCount: 0, reputation: 0 }));
  await espera(num('pero no une a Beto'), 'DENIEGA', crear(`/communities/k1/members/${B}`, A, { userId: B, joinedAt: ahora, postCount: 0, reputation: 0 }));
  await sembrar('/communities/k9', { name: 'Otra', slug: 'otra', createdBy: M, moderators: [M], memberCount: 0, postCount: 0, isOfficial: false });
  await espera(num('ni se une diciendo ser otra persona'), 'DENIEGA', crear(`/communities/k9/members/${A}`, A, { userId: B, joinedAt: ahora }));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5 · El inventario Biz encuentra perfiles con id automático ──');
// ═══════════════════════════════════════════════════════════════════════════
{
  /* Como en producción: el id del documento es automático y el uid va en un campo. */
  await sembrar('/users/autoBiz0001', { uid: 'biz_negocio1', profileType: 'biz', displayName: 'Café Ana', businessId: 'b1' });
  await sembrar('/users/autoBiz0002', { uid: 'biz_raro', profileType: 'real', displayName: 'Raro' });
  await sembrar('/users/autoBiz0003', { uid: 'solotipo', profileType: 'biz', displayName: 'Solo tipo' });
  await sembrar('/posts/pBiz', { userId: 'biz_negocio1', content: 'oferta', isPrivate: false });
  await sembrar('/conversations/convBiz', { participants: ['biz_negocio1', A], participantsData: {} });
  await sembrar('/notifications/nBiz', { senderId: 'biz_negocio1', recipientId: A, type: 'like' });

  const salida = path.join(os.tmpdir(), `inventario-biz-${process.pid}.json`);
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts/inventario-biz.mjs'), '--project', PROY, '--json', salida], { env: process.env, encoding: 'utf8' });
  let inventario = null;
  try { inventario = JSON.parse(fs.readFileSync(salida, 'utf8')); } catch { /* se informa abajo */ }
  try { fs.unlinkSync(salida); } catch { /* nada que borrar */ }
  check(num('el inventario corre contra el emulador y termina'), r.status === 0 && !!inventario, (r.stderr || '').slice(0, 200));
  if (inventario) {
    const biz = inventario.identidades.map((i) => `${i.documentId}:${i.uid}`);
    check(num('encuentra el perfil Biz aunque su documento tenga id automático'), biz.length === 1 && biz[0] === 'autoBiz0001:biz_negocio1', JSON.stringify(biz));
    check(num('que una búsqueda por id de documento no habría encontrado'), !inventario.identidades.some((i) => i.documentId.startsWith('biz_')));
    check(num('y reporta aparte lo que solo tiene medio rasgo'), inventario.ambiguos.length === 2, JSON.stringify(inventario.ambiguos.map((a) => a.documentId)));
    check(num('cuenta lo que dejó escrito, con los campos del esquema'),
      inventario.referencias['posts.userId']?.total === 1 && inventario.referencias['conversations.participants']?.total === 1
      && inventario.referencias['notifications.senderId']?.total === 1, JSON.stringify(inventario.referencias));
  }
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
