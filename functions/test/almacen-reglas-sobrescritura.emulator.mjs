/*
 * LA POLÍTICA DE STORAGE CONTRA LA SOBRESCRITURA, EJECUTADA (línea A2 · activos-politicas).
 *
 * `storage.rules` dice que un cliente NUNCA sobrescribe, cambia ni borra un objeto: cada subida de la app crea un
 * nombre nuevo (marca de tiempo + azar) y la regla lo exige con `resource == null`. Esta suite lo intenta con el
 * emulador de Storage de verdad, por HTTP y sin SDK de cliente (como `fronteras-storage.emulator.mjs`):
 *
 *   A · cada ruta que escribe la app CREA un nombre nuevo, y eso sigue permitido;
 *   B · la dueña NO sobrescribe lo que ya existe, y el contenido queda intacto;
 *   C · la dueña NO borra, y el objeto sigue ahí;
 *   D · la dueña NO cambia los metadatos (PATCH);
 *   E · otra persona no sobrescribe, no borra ni lee las rutas privadas (las legacy de imágenes siguen con lectura pública);
 *   F · sin sesión, ni sobrescribe, ni borra, ni lee las rutas privadas;
 *   G · el SERVIDOR (Admin SDK) sí puede sobrescribir y borrar: esta política no le afecta;
 *   H · lo que solo escribe el servidor (`ai-generations`, `avatar-replacement`, `ai-avatar`) no admite escritura de la app;
 *   I · las fuentes del cliente crean nombres nuevos, y solo tres ficheros escriben en Storage.
 *
 * Reglas bajo prueba: `storage.rules` de esta raíz. La suite las CARGA en el emulador antes de empezar
 * (`PUT /internal/setRules`) y comprueba que el emulador las acepta. Con `WEE_STORAGE_RULES_FILE=<ruta>` prueba
 * OTRO fichero: así se hacen las mutaciones (una copia de las reglas con un cambio), que tienen que hacer FALLAR la
 * suite. Sin esa variable no cambia nada.
 *
 * No está en `npm test` a propósito: necesita los emuladores de Storage y Firestore, y Java 21. Se lanza con el
 * corredor de emuladores (proyecto demo-*):
 *
 *   JAVA21_HOME=C:/Users/Geovet/AppData/Local/wee-tools/jdk-21.0.12.1+1 node functions/test/_emuladores.mjs --solo almacen-reglas-sobrescritura
 *
 * o directamente, desde la raíz del proyecto (los dos emuladores a la vez, porque la regla de `weetalk` lee Firestore):
 *
 *   firebase emulators:exec --only storage,firestore --project demo-wee \
 *     "node functions/test/almacen-reglas-sobrescritura.emulator.mjs"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const objetos = `http://${storageHost}/v0/b/${BUCKET}/o`;
const documentos = `http://${firestoreHost}/v1/projects/${PROY}/databases/(default)/documents`;

/* ── Las reglas bajo prueba: se cargan en el emulador y se comprueba que las acepta ───────────────────────── */
const RUTA_REGLAS = process.env.WEE_STORAGE_RULES_FILE
  ? path.resolve(process.env.WEE_STORAGE_RULES_FILE)
  : path.join(RAIZ, 'storage.rules');
const CONTENIDO_REGLAS = fs.readFileSync(RUTA_REGLAS, 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const cargarReglas = async () => {
  const res = await fetch(`http://${storageHost}/internal/setRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'storage.rules', content: CONTENIDO_REGLAS }] } }),
  });
  return res.status;
};

/* ── Sesiones: el emulador acepta un JWT sin firmar (`alg: none`), como en las otras suites de Storage ───── */
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
/* `Bearer owner` es el administrador del emulador: pasa por encima de las reglas (lo usa el servidor en las pruebas). */
const auth = (uid) => (uid === 'owner' ? 'Bearer owner' : uid ? `Firebase ${sesion(uid)}` : null);
const cabeceras = (uid, extra = {}) => ({ ...(auth(uid) ? { Authorization: auth(uid) } : {}), ...extra });

const azar = () => Math.random().toString(36).slice(2, 8);

/* ── Operaciones HTTP. Todas devuelven el código de estado ─────────────────────────────────────────────── */
/* Subida multipart, como `uploadBytes` del SDK. Si el nombre ya existe, es un intento de SOBRESCRIBIR. */
const subir = async (uid, nombre, { contentType = 'image/jpeg', cuerpo = 'contenido-de-prueba' } = {}) => {
  const limite = 'wee-almacen';
  const parteJson = JSON.stringify({ name: nombre, contentType });
  const bytes = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${parteJson}\r\n--${limite}\r\nContent-Type: ${contentType}\r\n\r\n`),
    Buffer.from(cuerpo),
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  const res = await fetch(`${objetos}?name=${encodeURIComponent(nombre)}`, {
    method: 'POST',
    headers: cabeceras(uid, { 'X-Goog-Upload-Protocol': 'multipart', 'Content-Type': `multipart/related; boundary=${limite}` }),
    body: bytes,
  });
  return res.status;
};
const borrar = async (uid, nombre) =>
  (await fetch(`${objetos}/${encodeURIComponent(nombre)}`, { method: 'DELETE', headers: cabeceras(uid) })).status;
/* Cambiar los metadatos de un objeto (PATCH), como `updateMetadata` del SDK. */
const cambiarMetadatos = async (uid, nombre) =>
  (await fetch(`${objetos}/${encodeURIComponent(nombre)}`, {
    method: 'PATCH',
    headers: cabeceras(uid, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ metadata: { intrusa: 'si' } }),
  })).status;
/* Leer el contenido (`getBytes` del SDK). Devuelve el código y, si se pudo, el texto. */
const leer = async (uid, nombre) => {
  const res = await fetch(`${objetos}/${encodeURIComponent(nombre)}?alt=media`, { headers: cabeceras(uid) });
  return { status: res.status, texto: res.status < 400 ? Buffer.from(await res.arrayBuffer()).toString() : null };
};
const leerStatus = async (uid, nombre) => (await leer(uid, nombre)).status;

/* Sembrar Firestore como administrador (la regla de WeeTalk pregunta por los participantes). */
const v = (x) => (Array.isArray(x) ? { arrayValue: { values: x.map(v) } } : { stringValue: String(x) });
const sembrar = async (ruta, datos) => {
  const res = await fetch(documentos + ruta, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(datos).map(([k, x]) => [k, v(x)])) }),
  });
  return res.status;
};

const esperar = async (nombre, esperado, promesa) => {
  const status = await promesa;
  const permitido = status < 400;
  check(nombre, permitido === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};
/* Comprueba que el objeto sigue teniendo exactamente el texto esperado (leído como dueño o como administrador). */
const contenidoEs = async (nombre, uid, esperado, nombreCheck) => {
  const { status, texto } = await leer(uid, nombre);
  check(nombreCheck, status < 400 && texto === esperado, `HTTP ${status} · ${texto === null ? 'sin contenido' : `«${texto}»`}`);
};

/* ── Las rutas que escribe la app, con el nombre que le da cada subida ─────────────────────────────────── */
const nombreComoLoHaceLaApp = (r) => `${r.carpeta}/${r.prefijo || ''}${Date.now()}-${azar()}.${r.ext}`;
const RUTAS = [
  { id: 'creator-inputs', carpeta: 'users/uAna/creator-inputs', ext: 'jpg', privada: true, participante: null },
  { id: 'brain-attachments', carpeta: 'users/uAna/brain-attachments', ext: 'png', privada: true, participante: null },
  { id: 'weetalk', carpeta: 'users/uAna/weetalk/c1', ext: 'jpg', privada: true, participante: 'uBea' },
  { id: 'face-swap', carpeta: 'users/uAna/face-swap', prefijo: 'source_', ext: 'jpg', privada: true, participante: null },
  { id: 'images/posts (legacy)', carpeta: 'images/posts/uAna', ext: 'jpg', privada: false, participante: null },
  { id: 'images/profile (legacy)', carpeta: 'images/profile/uAna', ext: 'jpg', privada: false, participante: null },
];

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const cargado = await cargarReglas();
console.log(`\nReglas bajo prueba: ${RUTA_REGLAS}`);
check('las reglas se cargan en el emulador (el emulador las acepta)', cargado === 200, `HTTP ${cargado}`);
if (cargado !== 200) {
  console.log('\nSin reglas válidas no hay nada que probar.');
  process.exitCode = 1;
  process.exit(1);
}

console.log('\n── Preparación ──');
check('conversación c1 sembrada (uAna y uBea participan)', (await sembrar('/conversations/c1', { participants: ['uAna', 'uBea'] })) < 400);

for (const r of RUTAS) {
  console.log(`\n── ${r.id} ──`);
  const existente = nombreComoLoHaceLaApp(r);
  const esperadoOriginal = `ORIGINAL-${r.id}`;
  check(`sembrado por el servidor: ${existente}`, (await subir('owner', existente, { cuerpo: esperadoOriginal })) < 400);

  await esperar('A · la app crea su foto con un nombre nuevo', 'PERMITE', subir('uAna', nombreComoLoHaceLaApp(r)));
  await esperar('B · la dueña NO sobrescribe la que ya existe', 'DENIEGA', subir('uAna', existente, { cuerpo: 'INTRUSA' }));
  await contenidoEs(existente, 'uAna', esperadoOriginal, 'B · y el contenido sigue siendo el original');
  await esperar('C · la dueña NO la borra', 'DENIEGA', borrar('uAna', existente));
  await contenidoEs(existente, 'owner', esperadoOriginal, 'C · y sigue ahí, con su contenido');
  await esperar('D · la dueña NO cambia sus metadatos', 'DENIEGA', cambiarMetadatos('uAna', existente));
  await esperar('E · otra persona NO la sobrescribe', 'DENIEGA', subir('uCarlos', existente, { cuerpo: 'AJENA' }));
  await esperar('E · otra persona NO la borra', 'DENIEGA', borrar('uCarlos', existente));
  if (r.privada) {
    await esperar('E · otra persona NO la lee', 'DENIEGA', leerStatus('uCarlos', existente));
    await esperar('F · sin sesión NO la lee', 'DENIEGA', leerStatus(null, existente));
  } else {
    await esperar('E · la lectura pública de la ruta legacy NO cambia (las publicaciones antiguas la enlazan)', 'PERMITE', leerStatus('uCarlos', existente));
    await esperar('F · sin sesión, la lectura pública sigue', 'PERMITE', leerStatus(null, existente));
  }
  await esperar('F · sin sesión NO la sobrescribe', 'DENIEGA', subir(null, existente, { cuerpo: 'SIN_SESION' }));
  await esperar('F · sin sesión NO la borra', 'DENIEGA', borrar(null, existente));
  if (r.participante) {
    await esperar(`E · la participante de la conversación (${r.participante}) sí la lee: la lectura no cambia`, 'PERMITE', leerStatus(r.participante, existente));
  }
}

console.log('\n── A · Subidas legítimas: tipo de imagen y tamaño siguen mandando ──');
{
  const carpeta = 'users/uAna/creator-inputs';
  await esperar('A) una foto de verdad (imagen) se crea', 'PERMITE', subir('uAna', `${carpeta}/${Date.now()}-${azar()}.jpg`));
  await esperar('A) un PDF en la misma ruta NO se crea (el tipo sigue validándose)', 'DENIEGA', subir('uAna', `${carpeta}/${Date.now()}-${azar()}.pdf`, { contentType: 'application/pdf' }));
}

console.log('\n── H · Lo que solo escribe el servidor no lo escribe la app ──');
{
  const GENERADA = 'users/uAna/ai-generations/1700000000000-gen1.png';
  const AVATAR = 'users/uAna/avatar-replacement/result_1700000000000.png';
  const PUBLICO = 'users/uAna/ai-avatar/retrato.png';
  check('resultados sembrados por el servidor (generados, avatar y retrato)',
    (await subir('owner', GENERADA, { contentType: 'image/png', cuerpo: 'GENERADA' })) < 400
    && (await subir('owner', AVATAR, { contentType: 'image/png', cuerpo: 'AVATAR' })) < 400
    && (await subir('owner', PUBLICO, { contentType: 'image/png', cuerpo: 'RETRATO' })) < 400);
  await esperar('H1) la dueña NO crea un resultado nuevo en ai-generations', 'DENIEGA', subir('uAna', `users/uAna/ai-generations/colada-${azar()}.png`, { contentType: 'image/png' }));
  await esperar('H2) la dueña NO sobrescribe el resultado que existe', 'DENIEGA', subir('uAna', GENERADA, { contentType: 'image/png', cuerpo: 'INTRUSA' }));
  await esperar('H3) la dueña NO lo borra', 'DENIEGA', borrar('uAna', GENERADA));
  await contenidoEs(GENERADA, 'uAna', 'GENERADA', 'H4) y lo sigue leyendo como dueña, con su contenido');
  await esperar('H5) la dueña NO crea nada en avatar-replacement', 'DENIEGA', subir('uAna', `users/uAna/avatar-replacement/colada-${azar()}.png`, { contentType: 'image/png' }));
  await esperar('H6) la dueña NO sobrescribe el avatar que existe', 'DENIEGA', subir('uAna', AVATAR, { contentType: 'image/png', cuerpo: 'INTRUSA' }));
  await esperar('H7) la dueña sigue leyendo su avatar', 'PERMITE', leerStatus('uAna', AVATAR));
  await esperar('H8) el retrato público (ai-avatar) sigue abierto sin sesión', 'PERMITE', leerStatus(null, PUBLICO));
  await esperar('H9) y nadie lo escribe desde la app', 'DENIEGA', subir('uAna', `users/uAna/ai-avatar/colada-${azar()}.png`, { contentType: 'image/png' }));
}

console.log('\n── G · El servidor (Admin SDK) no pasa por estas reglas ──');
{
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
  const bucket = admin.storage().bucket();
  const comoServidor = async (fn) => { try { await fn(); return 200; } catch { return 500; } };

  /* El servidor sobrescribe una foto que la app creó (lo que hace cualquier reescritura legítima del backend). */
  const creada = nombreComoLoHaceLaApp(RUTAS[0]);
  await subir('uAna', creada, { cuerpo: 'LA-APP' });
  await esperar('G1) el servidor SOBRESCRIBE un objeto de la app', 'PERMITE',
    comoServidor(() => bucket.file(creada).save(Buffer.from('SERVIDOR'), { resumable: false, metadata: { contentType: 'image/jpeg' } })));
  await contenidoEs(creada, 'owner', 'SERVIDOR', 'G1) y el contenido es el que escribió el servidor');

  /* El servidor borra la foto única de WeeTalk, como hace `burnViewOnce` al quemarla. */
  const quemada = `users/uAna/weetalk/c1/${Date.now()}-${azar()}.jpg`;
  await subir('uAna', quemada, { cuerpo: 'VER-UNA-VEZ' });
  await esperar('G2) el servidor BORRA la foto única de WeeTalk', 'PERMITE', comoServidor(() => bucket.file(quemada).delete()));
  const tras = await leerStatus('owner', quemada);
  check('G2) y ya no existe', tras === 404, `HTTP ${tras}`);

  await admin.app().delete();
}

console.log('\n── I · Las fuentes del cliente crean nombres nuevos y solo tres ficheros escriben en Storage ──');
{
  const leerFuente = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const TRIADA = /\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.slice\(2, 8\)\}/;
  check('I1) creatorUploads.ts (creator-inputs y brain-attachments): marca de tiempo y azar',
    TRIADA.test(leerFuente('services/creatorUploads.ts')));
  check('I2) storageService.ts (la foto única de WeeTalk): marca de tiempo y azar',
    TRIADA.test(leerFuente('services/storageService.ts')));
  const fuenteSwap = leerFuente('services/avatarGenerationService.ts');
  check('I3) avatarGenerationService.ts (face-swap): marca de tiempo y azar',
    /source_\$\{timestamp\}-\$\{azar\}\.jpg/.test(fuenteSwap) && /const azar = Math\.random\(\)\.toString\(36\)\.slice\(2, 8\)/.test(fuenteSwap));

  const RAIZ_CLIENTE = ['services', 'screens', 'components', 'hooks', 'utils', 'contexts', 'navigation'];
  const ficheros = RAIZ_CLIENTE.flatMap((dir) => {
    const abs = path.join(RAIZ, dir);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs, { recursive: true })
      .filter((f) => /\.(ts|tsx)$/.test(String(f)))
      .map((f) => path.posix.join(dir, String(f).split(path.sep).join('/')));
  });
  const escriben = ficheros.filter((f) => /\buploadBytes(Resumable)?\(|\buploadString\(/.test(leerFuente(f))).sort();
  const esperadoEscriben = ['services/avatarGenerationService.ts', 'services/creatorUploads.ts', 'services/storageService.ts'];
  check('I4) solo esos tres ficheros del cliente escriben en Storage (ninguna otra subida directa)',
    JSON.stringify(escriben) === JSON.stringify(esperadoEscriben), JSON.stringify(escriben));
}

console.log(failures
  ? `\n${failures} comprobación(es) fallaron`
  : '\nAlmacén: ninguna subida de la app sobrescribe, cambia ni borra; el servidor sí puede, y las rutas legítimas siguen abiertas');
/*
 * Sin `process.exit()` a secas: con el Admin SDK todavía cerrando conexiones, salir de golpe en Windows rompe libuv
 * (`UV_HANDLE_CLOSING`) y la suite saldría en rojo con todo en verde. Se deja que el bucle termine solo; si algo lo
 * sujetara, se sale igualmente a los 10 s con el mismo código.
 */
process.exitCode = failures ? 1 : 0;
setTimeout(() => process.exit(process.exitCode), 10_000).unref();
