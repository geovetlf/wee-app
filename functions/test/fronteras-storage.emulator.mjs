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

/* Subida multipart, tal como la hace `uploadBytes` del SDK. */
const subir = async (uid, nombre, contentType = 'image/jpeg') => {
  const limite = 'wee-frontera';
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({ name: nombre, contentType })}\r\n--${limite}\r\nContent-Type: ${contentType}\r\n\r\n`),
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

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nStorage: lo generado es de su dueño y la foto única solo la ven los participantes');
process.exit(failures ? 1 : 0);
