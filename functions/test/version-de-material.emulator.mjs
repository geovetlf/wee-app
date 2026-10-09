/*
 * GUARDAR COMO VERSIÓN Y RETIRADA COMPARTIDA, CONTRA EL EMULADOR REAL (DEC-03 · E-1).
 *
 * Lo que solo el emulador prueba: que `create()` es atómico (de dos llegadas, una crea y la otra encuentra la ficha),
 * que las consultas ven lo que existe en ese instante y que el Storage devuelve la metadata de verdad.
 *
 *   A · Carrera: llamadas simultáneas sobre el mismo archivo. Nunca dos fichas vivas.
 *   B · Idempotencia y conflicto en serie.
 *   C · Retirada: una versión retirada no se reutiliza, aunque el objeto siga ahí.
 *   D · Rechazos: otra cuenta, otra clase, no lista, fuera del almacén, rutas raras, otro cubo.
 *   E · Relación de versión: no autorreferencia y solo la escribe el servidor (reglas incluidas).
 *   F · E-1: retirar una ficha no borra un objeto que otra ficha viva todavía usa.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore,storage,auth --project demo-wee "node functions/test/version-de-material.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
process.env.STORAGE_BUCKET = BUCKET;

const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET);

const content = lib('content/index.js');
const versiones = lib('content/versiones.js');

const ANA = 'uAna';
const BETO = 'uBeto';
const RUN = Date.now().toString(36);
const TOKEN = `tok-${RUN}`;
const K = (cuenta, nombre) => `users/${cuenta}/uploads/${RUN}-${nombre}`;
const urlDe = (clave) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(clave)}?alt=media&token=${TOKEN}`;
const DERECHOS = {
  revision: 'REVIEW_REQUIRED', usoComercial: 'RESTRICTED', atribucion: true,
  licencias: [{ nombre: 'Licencia del modelo', url: 'https://example.com/licencia' }], jurisdiccionesBloqueadas: ['ES'],
};

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  const ok = Boolean(cond);
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const subir = (clave, contentType, texto = 'x') => bucket.file(clave).save(Buffer.from(texto), { metadata: { contentType }, resumable: false });
const existe = async (clave) => (await bucket.file(clave).exists())[0];
const docDe = async (id) => {
  const s = await db.collection('assets').doc(id).get();
  return s.exists ? s.data() : null;
};
const vivasSobre = async (clave) => (await db.collection('assets').where('storageRef.objectKey', '==', clave).get())
  .docs.filter((d) => d.data().status !== 'deleted').map((d) => d.id);
const crear = (cuenta, anterior, clave) => versiones.crearVersionDeMaterial(cuenta, { anteriorId: anterior, url: urlDe(clave) });
const crearAnterior = async (cuenta, clave) => {
  await subir(clave, 'image/png');
  const m = await content.crearMaterialDesdeUrl({
    ownerAccountId: cuenta, url: urlDe(clave), kind: 'image', mimeType: 'image/png',
    provenance: { createdAt: 1 }, name: 'Retrato', derechos: DERECHOS,
  });
  return m.assetId;
};

const anteriorA = await crearAnterior(ANA, K(ANA, 'anterior-a.png'));
const anteriorB = await crearAnterior(ANA, K(ANA, 'anterior-b.png'));

/* ── A · Carrera real ───────────────────────────────────────────────────────────────────────────────────────────── */
{
  const rondas = 20;
  let dobles = 0;
  let noUniformes = 0;
  for (let i = 0; i < rondas; i++) {
    const clave = K(ANA, `a1-${i}.png`);
    await subir(clave, 'image/png');
    const [r1, r2] = await Promise.all([crear(ANA, anteriorA, clave), crear(ANA, anteriorA, clave)]);
    const vivas = await vivasSobre(clave);
    if (vivas.length > 1) dobles++;
    if (r1.status !== 'creada' || r2.status !== 'creada' || vivas.length !== 1) noUniformes++;
  }
  check(`A1 ${rondas} pares de llamadas simultáneas (misma anterior, mismo archivo): nunca dos fichas vivas`, dobles === 0, `rondas con dos fichas vivas: ${dobles}`);
  check(`A1b … y en cada ronda las dos responden creada con una sola ficha`, noUniformes === 0, `rondas no uniformes: ${noUniformes}`);
}
{
  const rondas = 10;
  let dobles = 0;
  let noUniformes = 0;
  for (let i = 0; i < rondas; i++) {
    const clave = K(ANA, `a2-${i}.png`);
    await subir(clave, 'image/png');
    const rs = await Promise.all(Array.from({ length: 5 }, () => crear(ANA, anteriorA, clave)));
    const vivas = await vivasSobre(clave);
    if (vivas.length > 1) dobles++;
    if (rs.some((r) => r.status !== 'creada') || vivas.length !== 1) noUniformes++;
  }
  check(`A2 ${rondas} rondas de cinco llamadas a la vez: una sola ficha viva y todas creada`, dobles === 0 && noUniformes === 0, `dobles: ${dobles}, no uniformes: ${noUniformes}`);
}
{
  const rondas = 10;
  let dobles = 0;
  let mal = 0;
  for (let i = 0; i < rondas; i++) {
    const clave = K(ANA, `a3-${i}.png`);
    await subir(clave, 'image/png');
    const [r1, r2] = await Promise.all([crear(ANA, anteriorA, clave), crear(ANA, anteriorB, clave)]);
    const estados = [r1.status, r2.status].sort().join(',');
    const vivas = await vivasSobre(clave);
    if (vivas.length > 1) dobles++;
    if (estados !== 'archivo_en_uso,creada' || vivas.length !== 1) mal++;
  }
  check(`A3 ${rondas} rondas con dos anteriores distintas sobre el mismo archivo: una creada y la otra archivo_en_uso`, dobles === 0 && mal === 0, `dobles: ${dobles}, mal: ${mal}`);
}

/* ── B · Idempotencia y conflicto en serie ─────────────────────────────────────────────────────────────────────── */
const claveB = K(ANA, 'b-repite.png');
await subir(claveB, 'image/png');
const primera = await crear(ANA, anteriorA, claveB);
const segunda = await crear(ANA, anteriorA, claveB);
check('B1 la misma llamada repetida tras el éxito: creada, la MISMA ficha y ninguna nueva',
  primera.status === 'creada' && segunda.status === 'creada' && primera.asset.assetId === segunda.asset.assetId
  && (await vivasSobre(claveB)).length === 1, `${primera.status} / ${segunda.status}`);
{
  const otra = await crear(ANA, anteriorB, claveB);
  const existente = await docDe(primera.asset.assetId);
  check('B2 mismo archivo con otra anterior: archivo_en_uso, y la ficha sigue apuntando a la primera anterior',
    otra.status === 'archivo_en_uso' && existente.previousVersionId === anteriorA && (await vivasSobre(claveB)).length === 1);
}

/* ── C · Retirada: una versión retirada no se reutiliza ────────────────────────────────────────────────────────── */
{
  const clave = K(ANA, 'c1.png');
  await subir(clave, 'image/png');
  const v = await crear(ANA, anteriorA, clave);
  await content.retirarMaterial(ANA, v.asset.assetId);
  const sigueAhi = await existe(clave);
  const otro = await crear(ANA, anteriorA, clave);
  check('C1 versión retirada, objeto borrado: no se puede versionar otra vez ese archivo (archivo_en_uso, sin resucitarla)',
    sigueAhi === false && otro.status === 'archivo_en_uso' && (await vivasSobre(clave)).length === 0,
    `objeto presente: ${sigueAhi}, nuevo intento: ${otro.status}`);
}
{
  const clave = K(ANA, 'c2.png');
  await subir(clave, 'image/png');
  const v = await crear(ANA, anteriorA, clave);
  const b = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } });
  const retirada = await content.retirarMaterial(ANA, v.asset.assetId);
  const conservado = await existe(clave);
  /* Estado construido: B queda retirada sin borrar el objeto; ninguna ficha viva, objeto presente. */
  await db.collection('assets').doc(b.assetId).set({ status: 'deleted' }, { merge: true });
  const otro = await crear(ANA, anteriorA, clave);
  check('C2 versión retirada con el objeto aún presente y sin fichas vivas: archivo_en_uso, y la retirada se queda como estaba',
    conservado === true && retirada.pendientes > 0 && otro.status === 'archivo_en_uso'
    && (await docDe(v.asset.assetId)).status === 'deleted' && (await vivasSobre(clave)).length === 0,
    `conservado: ${conservado}, pendientes: ${retirada.pendientes}, nuevo intento: ${otro.status}`);
}

/* ── D · Rechazos ──────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const clave = `users/${BETO}/uploads/${RUN}-d1.png`;
  await subir(clave, 'image/png');
  check('D1 archivo del almacén de otra cuenta → archivo_ajeno', (await crear(ANA, anteriorA, clave)).status === 'archivo_ajeno');
}
{
  const clave = K(ANA, 'd2.mp4');
  await subir(clave, 'video/mp4');
  check('D2 archivo de otra clase (vídeo para una imagen) → clase_distinta', (await crear(ANA, anteriorA, clave)).status === 'clase_distinta');
}
{
  const anteriorNoLista = await crearAnterior(ANA, K(ANA, 'd3-anterior.png'));
  await db.collection('assets').doc(anteriorNoLista).set({ status: 'uploading' }, { merge: true });
  const clave = K(ANA, 'd3.png');
  await subir(clave, 'image/png');
  check('D3 anterior que no está lista → no_lista', (await crear(ANA, anteriorNoLista, clave)).status === 'no_lista');
}
check('D4 archivo todavía no subido al almacén → archivo_ajeno',
  (await crear(ANA, anteriorA, K(ANA, 'd4-no-subido.png'))).status === 'archivo_ajeno');
{
  const clave = `public/${RUN}-d5.png`;
  await subir(clave, 'image/png');
  check('D5 archivo fuera de la carpeta de la cuenta → archivo_ajeno', (await crear(ANA, anteriorA, clave)).status === 'archivo_ajeno');
}
check('D6 dirección de Cloudinary → archivo_ajeno',
  (await versiones.crearVersionDeMaterial(ANA, { anteriorId: anteriorA, url: 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1699999999/posts/uAna/foto.jpg' })).status === 'archivo_ajeno');
{
  const clave = K(ANA, 'd7.png');
  await subir(clave, 'image/png');
  const otroCubo = `https://firebasestorage.googleapis.com/v0/b/otro-cubo.appspot.com/o/${encodeURIComponent(clave)}?alt=media&token=${TOKEN}`;
  check('D7 la misma clave en OTRO cubo → archivo_ajeno (esa dirección no es de Weë)',
    (await versiones.crearVersionDeMaterial(ANA, { anteriorId: anteriorA, url: otroCubo })).status === 'archivo_ajeno');
}
{
  const clave = `users/${ANA}/../${BETO}/${RUN}-d8.png`;
  await subir(clave, 'image/png');
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(clave)}?alt=media&token=${TOKEN}`;
  check('D8 ruta con «..» que sale de la carpeta de la cuenta → archivo_ajeno',
    (await versiones.crearVersionDeMaterial(ANA, { anteriorId: anteriorA, url })).status === 'archivo_ajeno');
}
{
  const anteriorDeBeto = await crearAnterior(BETO, `users/${BETO}/uploads/${RUN}-d9.png`);
  const clave = K(ANA, 'd9.png');
  await subir(clave, 'image/png');
  check('D9 anterior de otra cuenta → no_existe (no se dice que exista)', (await crear(ANA, anteriorDeBeto, clave)).status === 'no_existe');
}

/* ── E · Relación de versión ───────────────────────────────────────────────────────────────────────────────────── */
{
  const clave = K(ANA, 'e1.png');
  await subir(clave, 'image/png');
  const id = `asset_${'e'.repeat(32)}`;
  const e1 = await content.crearMaterialDesdeUrl({
    ownerAccountId: ANA, assetId: id, url: urlDe(clave), kind: 'image', mimeType: 'image/png',
    provenance: { createdAt: 1 }, previousVersionId: id,
  });
  check('E1 una ficha no puede ser versión de sí misma → no se crea', e1 === null && (await docDe(id)) === null);
}
{
  const clave = K(ANA, 'e2.png');
  await subir(clave, 'image/png');
  const v = await crear(ANA, anteriorA, clave);
  check('E2 la versión apunta a la anterior elegida, y nunca a sí misma',
    v.status === 'creada' && v.asset.previousVersionId === anteriorA && v.asset.previousVersionId !== v.asset.assetId);
}
{
  const clave = K(ANA, 'e3.png');
  await subir(clave, 'image/png');
  const respuesta = await versiones.guardarComoVersion.run({ auth: { uid: ANA }, data: { anteriorId: anteriorA, url: urlDe(clave), previousVersionId: anteriorB } });
  const guardada = await docDe(respuesta.assetId);
  check('E3 el cliente no puede fijar la relación: el callable guarda la anterior del servidor, no la que envió',
    respuesta.previousVersionId === anteriorA && guardada.previousVersionId === anteriorA);
}
{
  /* Reglas de seguridad reales: un cliente no escribe en `assets`, ni anónimo ni como dueño. */
  const requireRaiz = createRequire(path.resolve(here, '../../package.json'));
  const { initializeApp } = requireRaiz('firebase/app');
  const { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc } = requireRaiz('firebase/firestore');
  const { getAuth, connectAuthEmulator, signInWithCustomToken, signOut } = requireRaiz('firebase/auth');
  const [hostF, puertoF] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  const app = initializeApp({ projectId: PROY, apiKey: 'clave-de-emulador', authDomain: 'localhost' }, 'cliente-de-reglas');
  const cdb = getFirestore(app);
  connectFirestoreEmulator(cdb, hostF, Number(puertoF));
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`, { disableWarnings: true });
  const codigo = async (p) => { try { await p; return 'ok'; } catch (error) { return error.code || String(error); } };
  const nuevoId = `asset_${'d'.repeat(32)}`;
  const anonimo = await codigo(setDoc(doc(cdb, 'assets', nuevoId), { ownerAccountId: ANA, previousVersionId: anteriorA }));
  await signInWithCustomToken(auth, await admin.auth().createCustomToken(ANA));
  const comoDueno = await codigo(updateDoc(doc(cdb, 'assets', anteriorA), { previousVersionId: anteriorB }));
  const crearComoDueno = await codigo(setDoc(doc(cdb, 'assets', nuevoId), { ownerAccountId: ANA, previousVersionId: anteriorA }));
  await signOut(auth);
  check('E4 las reglas no dejan escribir fichas a ningún cliente, anónimo ni dueño (la relación solo la escribe el servidor)',
    anonimo === 'permission-denied' && comoDueno === 'permission-denied' && crearComoDueno === 'permission-denied',
    `anónimo: ${anonimo}, dueño al actualizar: ${comoDueno}, dueño al crear: ${crearComoDueno}`);
}

/* ── F · E-1: retirar no borra un objeto que otra ficha viva usa ───────────────────────────────────────────────── */
{
  const clave = K(ANA, 'f1.png');
  await subir(clave, 'image/png');
  const fA = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } });
  const fB = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 2 } });
  const r = await content.retirarMaterial(ANA, fA.assetId);
  const bSigue = await docDe(fB.assetId);
  check('F1 dos fichas sobre el mismo objeto: retirar una conserva el objeto y la otra sigue válida',
    r.status === 'retirado' && (await existe(clave)) === true && bSigue.status === 'ready'
    && (await docDe(fA.assetId)).pendingPhysicalDeletion === true,
    `objeto presente: ${await existe(clave)}, estado de B: ${bSigue.status}`);
}
{
  const clave = K(ANA, 'f2.png');
  await subir(clave, 'image/png');
  const unica = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } });
  const r = await content.retirarMaterial(ANA, unica.assetId);
  check('F2 una sola ficha: retirarla borra el objeto', r.status === 'retirado' && (await existe(clave)) === false, `objetos borrados: ${r.objetosBorrados}`);
}
{
  const clave = K(ANA, 'f3.png');
  await subir(clave, 'image/png');
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const m = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: i + 1 } });
    ids.push(m.assetId);
  }
  await content.retirarMaterial(ANA, ids[0]);
  const trasPrimera = await existe(clave);
  await content.retirarMaterial(ANA, ids[1]);
  const trasSegunda = await existe(clave);
  await content.retirarMaterial(ANA, ids[2]);
  const trasTercera = await existe(clave);
  const primeraSigueMarcada = (await docDe(ids[0])).pendingPhysicalDeletion === true;
  check('F3 tres fichas sobre el mismo objeto: el objeto sobrevive mientras quede una viva y se borra con la última',
    trasPrimera === true && trasSegunda === true && trasTercera === false, `tras 1.ª: ${trasPrimera}, tras 2.ª: ${trasSegunda}, tras 3.ª: ${trasTercera}`);
  check('F4 al borrarse el objeto, las retiradas anteriores dejan de figurar como pendientes',
    primeraSigueMarcada === false && (await docDe(ids[1])).pendingPhysicalDeletion !== true, `pendiente en la 1.ª: ${primeraSigueMarcada}`);
}

{
  /* F5 · Una variante viva de otra ficha de la cuenta protege su objeto (E-1, variantes): retirar la ficha que lo tiene como archivo no lo borra. */
  const original = K(ANA, 'f5-original.png');
  const miniatura = K(ANA, 'f5-miniatura.png');
  await subir(original, 'image/png');
  await subir(miniatura, 'image/png');
  const duena = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(original), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } });
  const anotada = await content.anotarVariante(ANA, duena.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: miniatura }, mimeType: 'image/png' });
  const porArchivo = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(miniatura), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 2 } });
  const r = await content.retirarMaterial(ANA, porArchivo.assetId);
  check('F5 la variante viva de otra ficha no se borra al retirar la ficha que la tiene como archivo',
    anotada === true && r.status === 'retirado' && (await existe(miniatura)) === true, `anotada: ${anotada}, objeto presente: ${await existe(miniatura)}`);
  const versionSobreVariante = await versiones.crearVersionDeMaterial(ANA, { anteriorId: duena.assetId, url: urlDe(miniatura) });
  check('F5b una versión no puede tomar como archivo la variante viva de otra ficha de la cuenta',
    versionSobreVariante.status === 'archivo_en_uso', versionSobreVariante.status);
}
{
  /* F6 · Al borrarse el objeto, la marca pendiente de una ficha de OTRA cuenta no se toca (propiedad). */
  const clave = K(ANA, 'f6.png');
  await subir(clave, 'image/png');
  const unica = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } });
  const ajena = `asset_${'e'.repeat(32)}`;
  await db.collection('assets').doc(ajena).set({ assetId: ajena, ownerAccountId: BETO, status: 'deleted', pendingPhysicalDeletion: true, storageRef: { provider: 'wee', bucket: BUCKET, objectKey: clave } });
  const r = await content.retirarMaterial(ANA, unica.assetId);
  check('F6 al borrarse el objeto, la marca pendiente de otra cuenta no se toca',
    r.status === 'retirado' && (await existe(clave)) === false && (await docDe(ajena)).pendingPhysicalDeletion === true, `objeto presente: ${await existe(clave)}`);
}
{
  /* F7 · Retirar la última ficha de un objeto no la deja pendiente: la marca del paso 1 se baja al borrarse el objeto. */
  const clave = K(ANA, 'f7.png');
  await subir(clave, 'image/png');
  const unica = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: urlDe(clave), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 } });
  const r = await content.retirarMaterial(ANA, unica.assetId);
  check('F7 retirar la última ficha de un objeto no la deja pendiente',
    r.status === 'retirado' && r.pendientes === 0 && (await docDe(unica.assetId)).pendingPhysicalDeletion !== true, `pendientes: ${r.pendientes}`);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
