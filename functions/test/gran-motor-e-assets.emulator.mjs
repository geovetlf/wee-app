/**
 * GRAN MOTOR · PAQUETE E — LAS RUTAS DE ACTIVOS DEL STORAGE, CONTRA EL EMULADOR.
 *
 * `fronteras-storage.emulator.mjs` cubre `ai-generations`, `avatar-replacement` y WeeTalk. Esto completa el resto de
 * las carpetas de la cuenta (`creator-inputs`, `brain-attachments`, `face-swap`, `ai-avatar`), con la pregunta del
 * paquete: ¿puede una cuenta leer, listar, escribir o borrar lo de otra?
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only storage,firestore --project demo-wee-filmmaker \
 *     "node functions/test/gran-motor-e-assets.emulator.mjs"
 */
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
const objetos = `http://${storageHost}/v0/b/${BUCKET}/o`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};
const auth = (uid) => (uid === 'owner' ? 'Bearer owner' : uid ? `Firebase ${sesion(uid)}` : null);

const subir = async (uid, nombre, contentType = 'image/jpeg') => {
  const limite = 'wee-frontera';
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({ name: nombre, contentType })}\r\n--${limite}\r\nContent-Type: ${contentType}\r\n\r\n`),
    Buffer.from('no-es-una-foto-de-verdad'),
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  const res = await fetch(`${objetos}?name=${encodeURIComponent(nombre)}`, {
    method: 'POST',
    headers: { ...(auth(uid) ? { Authorization: auth(uid) } : {}), 'X-Goog-Upload-Protocol': 'multipart', 'Content-Type': `multipart/related; boundary=${limite}` },
    body: cuerpo,
  });
  return res.status;
};
const leer = async (uid, nombre) => (await fetch(`${objetos}/${encodeURIComponent(nombre)}?alt=media`, { headers: auth(uid) ? { Authorization: auth(uid) } : {} })).status;
const borrar = async (uid, nombre) => (await fetch(`${objetos}/${encodeURIComponent(nombre)}`, { method: 'DELETE', headers: auth(uid) ? { Authorization: auth(uid) } : {} })).status;
const listar = async (uid, prefijo) => (await fetch(`${objetos}?prefix=${encodeURIComponent(prefijo)}&delimiter=${encodeURIComponent('/')}`, { headers: auth(uid) ? { Authorization: auth(uid) } : {} })).status;

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const esperar = async (nombre, esperado, promesa) => {
  const status = await promesa;
  check(nombre, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

const CARPETAS = ['creator-inputs', 'brain-attachments', 'face-swap'];
for (const c of CARPETAS) {
  const objeto = `users/uAna/${c}/foto.jpg`;
  console.log(`\n── ${c}: es de su dueña ──`);
  await esperar(`${c}-1) la dueña la sube`, 'PERMITE', subir('uAna', objeto));
  await esperar(`${c}-2) la dueña la lee`, 'PERMITE', leer('uAna', objeto));
  await esperar(`${c}-3) otra cuenta NO la lee`, 'DENIEGA', leer('uBea', objeto));
  await esperar(`${c}-4) sin sesión, tampoco`, 'DENIEGA', leer(null, objeto));
  await esperar(`${c}-5) otra cuenta NO escribe en la carpeta de uAna`, 'DENIEGA', subir('uBea', `users/uAna/${c}/intrusa.jpg`));
  await esperar(`${c}-6) lo que no es imagen no sube, ni a la propia carpeta`, 'DENIEGA', subir('uAna', `users/uAna/${c}/doc.pdf`, 'application/pdf'));
  await esperar(`${c}-7) otra cuenta NO lista la carpeta`, 'DENIEGA', listar('uBea', `users/uAna/${c}/`));
  await esperar(`${c}-8) otra cuenta NO la borra`, 'DENIEGA', borrar('uBea', objeto));
  /* Hallazgo E-9 (documentado, no es una fuga): la propia dueña tampoco puede borrarla desde el cliente. */
  const propio = await borrar('uAna', objeto);
  console.log(`   · borrado por su dueña desde el cliente: HTTP ${propio} (informativo; ver docs/GRAN-MOTOR-E-ASSETS.md E-9)`);
}

console.log('\n── ai-generations / ai-avatar / avatar-replacement ──');
const GEN = 'users/uAna/ai-generations/resultado.png';
check('G0) sembrado como servidor', (await subir('owner', GEN, 'image/png')) < 400);
await esperar('G1) otra cuenta NO lee lo generado por uAna', 'DENIEGA', leer('uBea', GEN));
await esperar('G2) otra cuenta NO lista ai-generations de uAna', 'DENIEGA', listar('uBea', 'users/uAna/ai-generations/'));
await esperar('G3) otra cuenta NO borra lo generado', 'DENIEGA', borrar('uBea', GEN));
await esperar('G4) ni la propia dueña borra desde el cliente: se pide a deleteAsset', 'DENIEGA', borrar('uAna', GEN));
const AV = 'users/uAna/ai-avatar/avatar.png';
check('G5) avatar sembrado como servidor', (await subir('owner', AV, 'image/png')) < 400);
await esperar('G6) el avatar es de lectura pública por diseño', 'PERMITE', leer(null, AV));
await esperar('G7) pero nadie lo escribe ni lo borra desde el cliente', 'DENIEGA', subir('uAna', 'users/uAna/ai-avatar/otro.png', 'image/png'));
await esperar('G8) ruta inventada fuera de las declaradas: denegada', 'DENIEGA', subir('uAna', 'users/uAna/inventada/x.png', 'image/png'));
await esperar('G9) ruta raíz inventada: denegada', 'DENIEGA', subir('uAna', 'otra-cosa/x.png', 'image/png'));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo en verde');
process.exit(failures ? 1 : 0);
