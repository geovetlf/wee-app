/*
 * LAS FRONTERAS DEL STORAGE, EJECUTADAS (fase 11).
 *
 * Dos cosas que no se pueden comprobar leyendo `storage.rules`: hay que
 * intentar la lectura y ver si pasa.
 *
 *   A · Lo que Weë genera (`ai-generations`) lo lee SOLO su dueño (C1).
 *       Antes era público para quien adivinara la ruta.
 *   B · La foto única de WeeTalk (`users/{uid}/weetalk/{conversationId}/…`)
 *       la sube su dueño y la leen los PARTICIPANTES de la conversación —una
 *       regla del Storage que pregunta a Firestore— y nadie más (C3).
 *   C · La foto que Weë hace con el selfie y el avatar (`avatar-replacement`)
 *       la leen y la listan solo su dueño; la URL con token que devuelve la
 *       Function sigue abriéndose para quien la tenga (post-auditoría).
 *
 * No está en `npm test` a propósito: necesita los emuladores y Java 21.
 * Se lanza así, desde la raíz del proyecto (los dos emuladores a la vez,
 * porque la regla de Storage lee Firestore):
 *
 *   firebase emulators:exec --only storage,firestore --project demo-wee \
 *     "node functions/test/fronteras-storage.emulator.mjs"
 */
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const objetos = `http://${storageHost}/v0/b/${BUCKET}/o`;
const documentos = `http://${firestoreHost}/v1/projects/${PROY}/databases/(default)/documents`;

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
/* El SDK manda `Authorization: Firebase <token>`; el administrador, `Bearer owner`. */
const auth = (uid) => (uid === 'owner' ? 'Bearer owner' : uid ? `Firebase ${sesion(uid)}` : null);

/* Subida multipart, tal como la hace `uploadBytes` del SDK. `metadata` (opcional) es la del objeto: el servidor guarda
   ahí `firebaseStorageDownloadTokens`, que es lo que hace funcionar una URL de descarga con token. */
const subir = async (uid, nombre, contentType = 'image/jpeg', metadata = undefined) => {
  const limite = 'wee-frontera';
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({ name: nombre, contentType, ...(metadata ? { metadata } : {}) })}\r\n--${limite}\r\nContent-Type: ${contentType}\r\n\r\n`),
    Buffer.from('no-es-una-foto-de-verdad'),
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  const res = await fetch(`${objetos}?name=${encodeURIComponent(nombre)}`, {
    method: 'POST',
    headers: {
      ...(auth(uid) ? { Authorization: auth(uid) } : {}),
      'X-Goog-Upload-Protocol': 'multipart',
      'Content-Type': `multipart/related; boundary=${limite}`,
    },
    body: cuerpo,
  });
  return res.status;
};

const leerObjeto = async (uid, nombre) => {
  const res = await fetch(`${objetos}/${encodeURIComponent(nombre)}?alt=media`, {
    headers: auth(uid) ? { Authorization: auth(uid) } : {},
  });
  return res.status;
};

/* Lo que hace cualquiera que tenga la URL que devuelve la Function (`downloadUrlFor`): sin sesión, con su token. */
const leerConToken = async (nombre, token) => {
  const res = await fetch(`${objetos}/${encodeURIComponent(nombre)}?alt=media&token=${encodeURIComponent(token)}`);
  return res.status;
};

/* Listar una carpeta, como `listAll` del SDK. */
const listarCarpeta = async (uid, prefijo) => {
  const res = await fetch(`${objetos}?prefix=${encodeURIComponent(prefijo)}&delimiter=${encodeURIComponent('/')}`, {
    headers: auth(uid) ? { Authorization: auth(uid) } : {},
  });
  return res.status;
};

/* Sembrar Firestore como administrador. */
const v = (x) => (Array.isArray(x) ? { arrayValue: { values: x.map(v) } } : { stringValue: String(x) });
const sembrar = async (ruta, datos) => {
  const res = await fetch(documentos + ruta, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(datos).map(([k, x]) => [k, v(x)])) }),
  });
  return res.status;
};

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const esperar = async (nombre, esperado, promesa) => {
  const status = await promesa;
  const permitido = status < 400;
  check(nombre, permitido === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

console.log('\n── Preparación ──');
check('conversación c1 sembrada (uAna y uBea)', (await sembrar('/conversations/c1', { participants: ['uAna', 'uBea'] })) < 400);
check('conversación c2 sembrada (uAna y el Perfil Weë de uDan)', (await sembrar('/conversations/c2', { participants: ['uAna', 'hidi_uDan'] })) < 400);
const GENERADA = 'users/uAna/ai-generations/1700000000000-image-1.png';
check('un resultado de Weë AI sembrado como servidor', (await subir('owner', GENERADA, 'image/png')) < 400);

console.log('\n── A · Lo generado es de su dueño (C1) ──');
await esperar('A1) la dueña lee su resultado', 'PERMITE', leerObjeto('uAna', GENERADA));
await esperar('A2) otra persona NO', 'DENIEGA', leerObjeto('uBea', GENERADA));
await esperar('A3) sin sesión, tampoco', 'DENIEGA', leerObjeto(null, GENERADA));
await esperar('A4) y nadie lo escribe desde la app, ni su dueña', 'DENIEGA', subir('uAna', 'users/uAna/ai-generations/colada.png', 'image/png'));

console.log('\n── B · La foto única de WeeTalk (C3) ──');
const FOTO = 'users/uAna/weetalk/c1/1700000000000-abc123.jpg';
await esperar('B1) quien la manda la sube a su ruta', 'PERMITE', subir('uAna', FOTO));
await esperar('B2) quien la recibe (participa en c1) la lee', 'PERMITE', leerObjeto('uBea', FOTO));
await esperar('B3) quien no participa NO la lee', 'DENIEGA', leerObjeto('uCarlos', FOTO));
await esperar('B4) sin sesión, tampoco', 'DENIEGA', leerObjeto(null, FOTO));
await esperar('B5) nadie escribe en la ruta de otra persona', 'DENIEGA', subir('uBea', 'users/uAna/weetalk/c1/intrusa.jpg'));
await esperar('B6) ni algo que no sea una imagen', 'DENIEGA', subir('uAna', 'users/uAna/weetalk/c1/archivo.pdf', 'application/pdf'));
await esperar('B7) una conversación en la que no estás no sirve de ruta', 'DENIEGA', leerObjeto('uBea', 'users/uAna/weetalk/c2/otra.jpg'));
const FOTO2 = 'users/uAna/weetalk/c2/1700000000001-def456.jpg';
await esperar('B8) la foto de c2 sube', 'PERMITE', subir('uAna', FOTO2));
await esperar('B9) y la lee uDan, que participa con su Perfil Weë (hidi_uDan)', 'PERMITE', leerObjeto('uDan', FOTO2));
await esperar('B10) pero no uBea, que participa en c1 y no en c2', 'DENIEGA', leerObjeto('uBea', FOTO2));
await esperar('B11) una conversación que no existe no da acceso a nadie', 'DENIEGA', leerObjeto('uBea', 'users/uAna/weetalk/c-inexistente/x.jpg'));

console.log('\n── C · La foto con tu avatar (avatar-replacement) es tuya, como el selfie del que sale ──');
{
  /*
   * La escribe `avatarReplacement` con `uploadImageToStorage`: guarda el objeto con un `firebaseStorageDownloadTokens`
   * y devuelve la URL de descarga CON ese token, que es la que la app adjunta, enseña y comparte. Esa URL no pasa por
   * las reglas; lo que ya no se puede es leer o listar la ruta con una sesión cualquiera, o sin ninguna.
   */
  const FOTO = 'users/uAna/avatar-replacement/result_1700000000000.png';
  const TOKEN = '6f1c2d4e-0000-4000-8000-a1b2c3d4e5f6';
  check('una foto con avatar sembrada como servidor, con su token de descarga',
    (await subir('owner', FOTO, 'image/png', { firebaseStorageDownloadTokens: TOKEN })) < 400);
  await esperar('C1) la dueña la lee', 'PERMITE', leerObjeto('uAna', FOTO));
  await esperar('C2) otra persona NO, aunque conozca el uid y la ruta', 'DENIEGA', leerObjeto('uBea', FOTO));
  await esperar('C3) sin sesión, tampoco', 'DENIEGA', leerObjeto(null, FOTO));
  await esperar('C4) nadie lista las fotos de otra persona', 'DENIEGA', listarCarpeta('uBea', 'users/uAna/avatar-replacement/'));
  await esperar('C5) ni sin sesión', 'DENIEGA', listarCarpeta(null, 'users/uAna/avatar-replacement/'));
  await esperar('C6) CONTROL: la dueña sí lista las suyas', 'PERMITE', listarCarpeta('uAna', 'users/uAna/avatar-replacement/'));
  await esperar('C7) CONTROL: la URL con token que devuelve la Function la abre cualquiera (lo que la app comparte no se rompe)', 'PERMITE', leerConToken(FOTO, TOKEN));
  await esperar('C8) pero con un token inventado, no', 'DENIEGA', leerConToken(FOTO, '00000000-0000-4000-8000-000000000000'));
  await esperar('C9) y nadie la escribe desde la app, ni su dueña', 'DENIEGA', subir('uAna', 'users/uAna/avatar-replacement/colada.png', 'image/png'));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nStorage: lo generado es de su dueño y la foto única solo la ven los participantes');
process.exit(failures ? 1 : 0);
