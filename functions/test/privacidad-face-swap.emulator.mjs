/*
 * PRIVACIDAD DE FACE SWAP, CONTRA LAS REGLAS REALES DEL EMULADOR (línea P · H-2).
 *
 * Con el SDK de cliente de verdad y dos personas distintas (cada una con su propia sesión anónima de Auth):
 *   E0 · la dueña sube su selfie original a su carpeta;      E1 · la dueña la lee;
 *   E2 · otra persona NO la lee ni le pide una dirección;     E3 · sin sesión NO la lee;
 *   E4 · la dueña NO la sobrescribe ni la borra (create-only, y el contenido queda intacto);
 *   E5 · la creación de entradas de Creator sigue funcionando (subida y dirección de descarga de la dueña);
 *   E6 · RIESGO DEMOSTRADO: quien tiene una dirección con testigo la abre sin sesión (la que daba getDownloadURL);
 *   E7 · REMEDIO: el original se copia sin testigo a un nombre nuevo y se borra el viejo: la dirección vieja deja de abrir;
 *   E8 · el perfil público NO referencia el original tras la retirada (utils/fotoDePerfil.ts, ejecutado tal cual).
 *
 *   JAVA21_HOME=C:/Users/Geovet/AppData/Local/wee-tools/jdk-21.0.12.1+1 node functions/test/_emuladores.mjs --solo privacidad-face-swap
 *
 * o, desde la raíz del proyecto (proyecto demo-*, solo emuladores):
 *   firebase emulators:exec --only storage,firestore,auth --project demo-wee "node functions/test/privacidad-face-swap.emulator.mjs"
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
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
const objetos = `http://${storageHost}/v0/b/${BUCKET}/o`;
const documentos = `http://${firestoreHost}/v1/projects/${PROY}/databases/(default)/documents`;

const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInAnonymously } = require('firebase/auth');
const { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL, getBytes, deleteObject } = require('firebase/storage');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const [hostStorage, puertoStorage] = [storageHost.split(':')[0], Number(storageHost.split(':')[1])];
let contador = 0;
/** Una persona = su propia app y su propia sesión de Auth (dos personas distintas, no dos cambios de sesión). */
const persona = async (nombre) => {
  contador += 1;
  const app = initializeApp({ apiKey: 'demo-key', authDomain: `${PROY}.firebaseapp.com`, projectId: PROY, storageBucket: BUCKET }, `${nombre}-${contador}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const storage = getStorage(app);
  connectStorageEmulator(storage, hostStorage, puertoStorage);
  const uid = (await signInAnonymously(auth)).user.uid;
  return { uid, storage };
};
/** Sin sesión: un cliente de Storage que nunca se ha autenticado. */
const sinSesion = () => {
  contador += 1;
  const app = initializeApp({ apiKey: 'demo-key', authDomain: `${PROY}.firebaseapp.com`, projectId: PROY, storageBucket: BUCKET }, `anonimo-${contador}`);
  const storage = getStorage(app);
  connectStorageEmulator(storage, hostStorage, puertoStorage);
  return { storage };
};

const intentar = async (promesa) => {
  try {
    return { ok: true, v: await promesa };
  } catch (e) {
    return { ok: false, code: e.code || '' };
  }
};
const azar = () => Math.random().toString(36).slice(2, 8);

/* ── Firestore y Storage por HTTP como administrador (para sembrar y para la rotación, igual que las demás suites) ── */
const v = (x) => (Array.isArray(x) ? { arrayValue: { values: x.map(v) } } : { stringValue: String(x) });
const sembrarUsuario = async (uid, campos) => {
  const res = await fetch(`${documentos}/users/${uid}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(campos).map(([k, x]) => [k, v(x)])) }),
  });
  return res.status;
};
const leerUsuario = async (uid) => {
  const res = await fetch(`${documentos}/users/${uid}`, { headers: { Authorization: 'Bearer owner' } });
  return res.status < 400 ? JSON.stringify(await res.json()) : '';
};

console.log('\n── Preparación ──');
const dueña = await persona('dueña');
const ajena = await persona('ajena');
const anonimo = sinSesion();
check('las dos personas tienen uid distinto', dueña.uid !== ajena.uid, `${dueña.uid.slice(0, 6)} / ${ajena.uid.slice(0, 6)}`);

const ORIGINAL = `users/${dueña.uid}/face-swap/source_${Date.now()}-${azar()}.jpg`;
const CONTENIDO = new Uint8Array([9, 8, 7]);

console.log('\n── E · La selfie original (face-swap) ──');
const original = ref(dueña.storage, ORIGINAL);
const subida = await intentar(uploadBytes(original, CONTENIDO, { contentType: 'image/jpeg' }));
check('E0) la dueña sube su selfie original a su carpeta', subida.ok, subida.ok ? '' : subida.code);

const lee = await intentar(getBytes(original));
check('E1) la dueña LEE su selfie original', lee.ok && lee.v.byteLength === 3, lee.ok ? `${lee.v.byteLength} bytes` : lee.code);

const otraLee = await intentar(getBytes(ref(ajena.storage, ORIGINAL)));
check('E2a) otra persona NO la lee (la regla lo deniega: storage/unauthorized)', otraLee.code === 'storage/unauthorized', otraLee.ok ? 'SE LEYÓ' : otraLee.code);
const otraDireccion = await intentar(getDownloadURL(ref(ajena.storage, ORIGINAL)));
check('E2b) otra persona NO consigue una dirección de descarga suya (storage/unauthorized)', otraDireccion.code === 'storage/unauthorized', otraDireccion.ok ? 'SE OBTUVO' : otraDireccion.code);

const sinSesionLee = await intentar(getBytes(ref(anonimo.storage, ORIGINAL)));
check('E3) sin sesión NO la lee (storage/unauthorized)', sinSesionLee.code === 'storage/unauthorized', sinSesionLee.ok ? 'SE LEYÓ' : sinSesionLee.code);

const sobrescribe = await intentar(uploadBytes(original, new Uint8Array([1, 1, 1]), { contentType: 'image/jpeg' }));
check('E4a) la dueña NO sobrescribe su selfie (create-only: storage/unauthorized)', sobrescribe.code === 'storage/unauthorized', sobrescribe.ok ? 'SE SOBRESCRIBIÓ' : sobrescribe.code);
const borra = await intentar(deleteObject(original));
check('E4b) la dueña NO borra su selfie desde la app (storage/unauthorized)', borra.code === 'storage/unauthorized', borra.ok ? 'SE BORRÓ' : borra.code);
const intacto = await intentar(getBytes(original));
check('E4c) y el contenido sigue siendo el original', intacto.ok && intacto.v.byteLength === 3 && new Uint8Array(intacto.v)[0] === 9,
  intacto.ok ? `${intacto.v.byteLength} bytes` : intacto.code);

console.log('\n── E5 · Las subidas legítimas de la dueña siguen funcionando ──');
const entrada = ref(dueña.storage, `users/${dueña.uid}/creator-inputs/e5-${Date.now()}-${azar()}.jpg`);
const entradaSube = await intentar(uploadBytes(entrada, new Uint8Array([4, 5]), { contentType: 'image/jpeg' }));
check('E5a) la dueña sube una entrada de Creator con nombre nuevo', entradaSube.ok, entradaSube.ok ? '' : entradaSube.code);
const entradaUrl = await intentar(getDownloadURL(entrada));
check('E5b) y pide su dirección de descarga (el flujo de creación completo)', entradaUrl.ok && entradaUrl.v.includes('/v0/b/'), entradaUrl.ok ? '' : entradaUrl.code);
const entradaAjena = await intentar(getBytes(ref(ajena.storage, entrada.fullPath)));
check('E5c) otra persona NO lee esa entrada (storage/unauthorized)', entradaAjena.code === 'storage/unauthorized', entradaAjena.ok ? 'SE LEYÓ' : entradaAjena.code);

console.log('\n── E6/E7 · El riesgo del testigo y su remedio ──');
const testigo = await intentar(getDownloadURL(original));
check('E6a) (riesgo) la dueña puede pedir una dirección con testigo de su original — lo que hacía la app antes', testigo.ok, testigo.ok ? '' : testigo.code);
if (testigo.ok) {
  const sinSesionAbre = await fetch(testigo.v);
  const bytes = Buffer.from(await sinSesionAbre.arrayBuffer());
  check('E6b) (riesgo DEMOSTRADO) quien tiene esa dirección la abre SIN sesión y lee el original',
    sinSesionAbre.status === 200 && bytes.length === 3 && bytes[0] === 9, `HTTP ${sinSesionAbre.status}`);

  /*
   * E7 · El remedio para los originales antiguos: el original se COPIA a un nombre nuevo, SIN testigo, se comprueba que
   * el contenido es el mismo, y se BORRA el viejo. La dirección vieja deja de abrir porque su objeto ya no existe.
   * No se usa la rotación del testigo por metadatos: en el emulador, la dirección vieja sigue abriendo tras cambiarlo
   * (esta suite lo midió; ver docs/PRIVACIDAD-FACE-SWAP.md §7). Lo que no se pueda comprobar en Firebase real, se dice.
   */
  const admin = require('firebase-admin');
  const app7 = admin.initializeApp({ projectId: PROY, storageBucket: BUCKET }, `e7-${Date.now()}`);
  const bucket = app7.storage().bucket();
  const NUEVA = ORIGINAL.replace(/\.jpg$/, `-mov-${azar()}.jpg`);
  const contenidoOriginal = (await bucket.file(ORIGINAL).download())[0];
  await bucket.file(NUEVA).save(contenidoOriginal, { resumable: false, metadata: { contentType: 'image/jpeg' } });
  const copiaSinTestigo = (await bucket.file(NUEVA).getMetadata())[0];
  check('E7a) el original se COPIA a un nombre nuevo, sin testigo, y con el mismo contenido',
    contenidoOriginal.length === 3 && !(copiaSinTestigo.metadata || {}).firebaseStorageDownloadTokens, `${contenidoOriginal.length} bytes`);
  await bucket.file(ORIGINAL).delete();
  const viejaTras = await fetch(testigo.v);
  check('E7b) la dirección vieja (con testigo) deja de abrir: el objeto original ya no existe', viejaTras.status >= 400, `HTTP ${viejaTras.status}`);
  const copia = await intentar(getBytes(ref(dueña.storage, NUEVA)));
  check('E7c) la dueña conserva su selfie en el nombre nuevo (lectura de propietario)', copia.ok && copia.v.byteLength === 3, copia.ok ? '' : copia.code);
  await app7.delete();
}

console.log('\n── E8 · El perfil público no referencia el original tras la retirada ──');
{
  /* El perfil TAL COMO lo dejaba el defecto: la selfie con su testigo en tres campos de foto. */
  const legado = { photoURL: testigo.ok ? testigo.v : `https://x/${ORIGINAL}`, photoURLThumbnail: testigo.ok ? testigo.v : `https://x/${ORIGINAL}`, aiAvatarPortraitUrl: testigo.ok ? testigo.v : `https://x/${ORIGINAL}`, avatarType: 'custom', avatarId: 'male' };
  check('E8a) sembrado el perfil legado (con la selfie en sus campos de foto)', (await sembrarUsuario(dueña.uid, legado)) < 400);
  const ts = require('typescript');
  const js = ts.transpileModule(fs.readFileSync(path.join(RAIZ, 'utils/fotoDePerfil.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', js)(modulo, modulo.exports);
  const parche = modulo.exports.retiradaDeOriginal(legado);
  check('E8b) la retirada decide qué quitar del perfil legado', !!parche && parche.avatarType === 'predefined', JSON.stringify(parche));
  check('E8c) se escribe la retirada en el perfil', parche && (await sembrarUsuario(dueña.uid, { ...legado, ...parche })) < 400);
  const publico = await leerUsuario(dueña.uid);
  check('E8d) el perfil público NO referencia la ruta del original ni su testigo',
    publico.length > 0 && !publico.includes('face-swap') && (!testigo.ok || !publico.includes(testigo.v.split('token=')[1])),
    publico.length ? 'sin referencias' : 'no se pudo leer el perfil');
}

console.log(failures
  ? `\n${failures} comprobación(es) fallaron`
  : '\nLa selfie original: solo la lee su dueña, no se sobrescribe ni se borra, y el perfil público no la referencia');
process.exitCode = failures ? 1 : 0;
setTimeout(() => process.exit(process.exitCode), 10_000).unref();
