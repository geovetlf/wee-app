/*
 * WEE CONTENT — LA COMPOSICIÓN, EJECUTADA (fase 11).
 *
 * El Core dice qué es un material; esto comprueba lo que lo guarda y lo borra
 * de verdad: `functions/src/content/index.ts`, sobre una Firestore y un
 * Storage de mentira. Cuatro cosas que antes no existían:
 *
 *   · de una URL se saca la REFERENCIA, no al revés: proveedor, contenedor y
 *     clave; el token y las transformaciones se quedan fuera;
 *   · crear la ficha no sube ni copia nada: referencia lo que ya está;
 *   · retirar comprueba que es tuyo, marca la ficha y borra el objeto — en ese
 *     orden—, y con Cloudinary deja dicho que el objeto sigue ahí;
 *   · el callable no dice ni que exista lo que no es tuyo.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Firestore y Storage de mentira ─────────────────────────────────────── */
const firestore = require('firebase-admin/firestore');
const docs = new Map();
const ref = (p) => ({
  id: p.split('/').pop(),
  get: async () => ({ exists: docs.has(p), data: () => docs.get(p) }),
  set: async (d, opts) => { docs.set(p, opts?.merge ? { ...(docs.get(p) || {}), ...d } : { ...d }); },
});
const baseFalsa = { collection: (c) => ({
  doc: (id) => ref(`${c}/${id}`),
  where: (campo, _op, valor) => {
    const coincidencias = () => [...docs.entries()]
      .filter(([p, d]) => p.startsWith(`${c}/`) && campo.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d) === valor)
      .map(([p, d]) => ({ id: p.slice(c.length + 1), data: () => d }));
    const instantanea = async () => { const lista = coincidencias(); return { docs: lista, empty: lista.length === 0 }; };
    return { get: instantanea, limit: () => ({ get: instantanea }) };
  },
}) };
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

const http = lib('engine/http.js');
const objetos = new Map(); // objectKey → { contentType, size }
const borrados = [];
const noBorrables = new Set(); // claves cuyo borrado falla: la prueba de la marca pendiente lo usa
const noExistentes = new Set(); // claves cuya comprobación de existencia falla: la prueba de la revisión posterior lo usa
const storageBucketReal = http.storageBucket;
http.storageBucket = () => ({
  name: 'get-wee.firebasestorage.app',
  file: (key) => ({
    getMetadata: async () => {
      if (!objetos.has(key)) throw new Error('No such object');
      return [objetos.get(key)];
    },
    exists: async () => {
      if (noExistentes.has(key)) throw new Error('el almacén no responde a la comprobación de existencia');
      return [objetos.has(key)];
    },
    delete: async () => {
      if (noBorrables.has(key)) throw new Error('el almacén no permite borrar este objeto');
      borrados.push(key); objetos.delete(key);
    },
  }),
});

const content = lib('content/index.js');

const BUCKET = 'get-wee.firebasestorage.app';
const CLAVE = 'users/uAna/ai-generations/1700000000000-image-1.png';
const URL_WEE = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(CLAVE)}?alt=media&token=abc-123`;
const URL_CLOUD = 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1699999999/posts/uAna/foto.jpg';
const URL_CLOUD_TRANSFORMADA = 'https://res.cloudinary.com/dnrj1guvs/video/upload/c_limit,h_720,q_auto,f_mp4/videos/clip.mp4';

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · De la URL a la referencia, y la URL se queda fuera ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const r = content.referenciaDesdeUrlDeWee(URL_WEE);
  check('1) una URL del Storage de Weë da proveedor, contenedor y clave',
    r && r.provider === 'wee' && r.bucket === BUCKET && r.objectKey === CLAVE);
  check('2) y el token NO forma parte de la referencia',
    r && !JSON.stringify(r).includes('abc-123'), 'el token es de la entrega, no de la identidad');
  check('3) gs:// también vale', content.referenciaDesdeUrlDeWee(`gs://${BUCKET}/${CLAVE}`)?.objectKey === CLAVE);

  const c = content.referenciaDesdeUrlDeCloudinary(URL_CLOUD);
  check('4) una URL de Cloudinary da su public_id como clave y la versión aparte',
    c && c.provider === 'cloudinary' && c.bucket === 'dnrj1guvs/image' && c.objectKey === 'posts/uAna/foto.jpg' && c.version === 'v1699999999');
  const t = content.referenciaDesdeUrlDeCloudinary(URL_CLOUD_TRANSFORMADA);
  check('5) y las transformaciones de entrega se descartan: no son parte del archivo',
    t && t.objectKey === 'videos/clip.mp4' && t.bucket === 'dnrj1guvs/video' && t.version === undefined,
    'c_limit,h_720 es cómo se sirve, no qué es');
  check('6) la URL de entrega de Cloudinary se reconstruye desde la referencia',
    content.urlDeEntregaDeCloudinary(c) === URL_CLOUD
    && content.urlDeEntregaDeCloudinary(t) === 'https://res.cloudinary.com/dnrj1guvs/video/upload/videos/clip.mp4');
  check('7) una URL ajena no es de ningún almacén',
    content.referenciaDesdeUrl('https://example.com/foto.jpg') === null
    && content.referenciaDesdeUrl('https://res.cloudinary.com/otro') === null);
  check('8) el Core no conoce estos nombres; los conoce solo la composición',
    /cloudinary/.test(require('node:fs').readFileSync(path.resolve(here, '../src/content/index.ts'), 'utf8'))
    && !/cloudinary/i.test(require('node:fs').readFileSync(path.resolve(here, '../src/core/content/asset.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Crear la ficha: referenciar lo que ya está, con dueño y procedencia ──');
// ════════════════════════════════════════════════════════════════════════════
let creado;
{
  objetos.set(CLAVE, { contentType: 'image/png', size: '345678' });
  creado = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uAna', url: URL_WEE, kind: 'image', name: 'Un logo',
    provenance: { createdAt: 5, generationId: 'gen_1', jobId: 'job_1', stepId: 'logo', requestId: 'job_1:logo', capability: 'image.generate', provider: 'p' },
  });
  check('9) se crea la ficha, lista, con su referencia y sin copiar nada',
    creado && /^asset_[a-f0-9]{32}$/.test(creado.assetId) && creado.status === 'ready'
    && creado.storageRef.objectKey === CLAVE && borrados.length === 0);
  check('10) el dueño es la CUENTA que se le dio, y la procedencia entera viaja',
    creado.ownerAccountId === 'uAna' && creado.provenance.generationId === 'gen_1'
    && creado.provenance.jobId === 'job_1' && creado.provenance.stepId === 'logo');
  check('11) tamaño y tipo salen de la metadata del objeto, no se inventan',
    creado.bytes === 345678 && creado.mimeType === 'image/png' && creado.kind === 'image');
  check('12) la URL de entrega va APARTE, etiquetada como capacidad al portador',
    creado.delivery.url === URL_WEE && creado.delivery.kind === 'bearer_token');
  check('13) y la ficha está guardada donde se lee', docs.has(`assets/${creado.assetId}`));
  check('14) sin `undefined` dentro: Firestore no lo admite',
    !Object.values(docs.get(`assets/${creado.assetId}`)).includes(undefined));

  check('15) un objeto que no se puede leer no se convierte en material',
    (await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: URL_WEE.replace('image-1', 'no-existe'), kind: 'image', provenance: { createdAt: 1 } })) === null);
  check('16) ni una URL de un proveedor de prueba o ajeno',
    (await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: 'https://mock.local/x.png', kind: 'image', provenance: { createdAt: 1 } })) === null);

  const cloud = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: URL_CLOUD, kind: 'image', provenance: { createdAt: 1 } });
  check('17) un archivo que ya está en Cloudinary también tiene ficha, con entrega pública',
    cloud && cloud.storageRef.provider === 'cloudinary' && cloud.delivery.kind === 'public');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Retirar: es tuyo, se marca, se borra — en ese orden ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('18) otra cuenta no puede retirarlo, y no se le dice ni que existe',
    (await content.retirarMaterial('uBeto', creado.assetId)).status === 'no_es_tuyo'
    && (await content.retirarMaterial('uAna', 'asset_' + 'f'.repeat(32))).status === 'no_existe');
  check('19) y el objeto sigue intacto tras el intento ajeno', objetos.has(CLAVE) && borrados.length === 0);

  const r = await content.retirarMaterial('uAna', creado.assetId);
  check('20) la dueña sí: la ficha queda retirada y el objeto se borra',
    r.status === 'retirado' && r.objetosBorrados === 1 && borrados[0] === CLAVE && !objetos.has(CLAVE));
  const ficha = docs.get(`assets/${creado.assetId}`);
  check('21) la ficha se queda —dueño, procedencia, referencia— y la entrega desaparece',
    ficha.status === 'deleted' && typeof ficha.deletedAt === 'number' && ficha.ownerAccountId === 'uAna'
    && ficha.provenance.jobId === 'job_1' && ficha.storageRef.objectKey === CLAVE && ficha.delivery === undefined);
  check('22) retirar dos veces es un no-op que se distingue',
    (await content.retirarMaterial('uAna', creado.assetId)).status === 'ya_retirado');

  /* 23 · Cloudinary: se retira la ficha, y se dice que el objeto sigue ahí. */
  const cloudId = [...docs.keys()].find((k) => k.startsWith('assets/') && docs.get(k).storageRef?.provider === 'cloudinary').split('/')[1];
  const rc = await content.retirarMaterial('uAna', cloudId);
  check('23) con Cloudinary la ficha se retira y queda anotado que el objeto no se pudo borrar',
    rc.status === 'retirado' && rc.pendientes === 1 && rc.objetosBorrados === 0
    && docs.get(`assets/${cloudId}`).pendingPhysicalDeletion === true,
    'borrar allí exige su API de administración con secreto, que Weë no tiene');

    /* 24 · Una variante viva de otra ficha de la cuenta protege su objeto aunque otra ficha lo tenga como archivo (E-1). */
    const ORIGEN_24 = 'users/uAna/ai-generations/original-24.png';
    const VARIANTE_24 = 'users/uAna/ai-generations/variante-24.png';
    for (const k of [ORIGEN_24, VARIANTE_24]) objetos.set(k, { contentType: 'image/png', size: 10 });
    const urlDe24 = (k) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(k)}?alt=media&token=abc-123`;
    const duena24 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDe24(ORIGEN_24), kind: 'image', provenance: { createdAt: 1 } });
    await content.anotarVariante('uAna', duena24.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: VARIANTE_24 }, mimeType: 'image/png' });
    const porArchivo24 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDe24(VARIANTE_24), kind: 'image', provenance: { createdAt: 2 } });
    const r24 = await content.retirarMaterial('uAna', porArchivo24.assetId);
    check('24 una variante viva de otra ficha de la cuenta no se borra al retirar la ficha que la tiene como archivo',
      r24.status === 'retirado' && objetos.has(VARIANTE_24) && !borrados.includes(VARIANTE_24), `objeto presente: ${objetos.has(VARIANTE_24)}`);

    /* 25 · Otro proveedor con la misma clave no es el mismo objeto: no bloquea el borrado (identidad del Core).
       La ficha de Cloudinary copia bucket y objectKey de la de Weë: lo único que cambia es el proveedor. */
    const CLAVE_25 = 'users/uAna/ai-generations/clave-25.png';
    objetos.set(CLAVE_25, { contentType: 'image/png', size: 10 });
    const fichaWee25 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDe24(CLAVE_25), kind: 'image', provenance: { createdAt: 3 } });
    const refWee25 = docs.get(`assets/${fichaWee25.assetId}`).storageRef;
    docs.set('assets/cloud-25', { assetId: 'cloud-25', ownerAccountId: 'uBeto', kind: 'image', status: 'ready', storageRef: { ...refWee25, provider: 'cloudinary' }, provenance: { createdAt: 3 } });
    const refCloud25 = docs.get('assets/cloud-25').storageRef;

    const r25 = await content.retirarMaterial('uAna', fichaWee25.assetId);
    check('25 una ficha de otro proveedor con la misma clave no bloquea el borrado del objeto de Weë (solo cambia el proveedor)',
      refWee25.provider === 'wee' && refCloud25.provider === 'cloudinary' && refCloud25.bucket === refWee25.bucket
      && refCloud25.objectKey === refWee25.objectKey && r25.status === 'retirado' && !objetos.has(CLAVE_25) && borrados.includes(CLAVE_25),
      `objeto presente: ${objetos.has(CLAVE_25)}`);

    /* 26 · Una ficha que pierde uno de sus dos objetos sigue pendiente mientras el otro siga en el almacén. */
    const K26 = 'users/uAna/ai-generations/k26.png';
    const L26 = 'users/uAna/ai-generations/l26.png';
    objetos.set(K26, { contentType: 'image/png', size: 10 });
    objetos.set(L26, { contentType: 'image/png', size: 10 });
    noBorrables.add(L26);
    const x26 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDe24(K26), kind: 'image', provenance: { createdAt: 4 } });
    const y26 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDe24(K26), kind: 'image', provenance: { createdAt: 5 } });
    await content.anotarVariante('uAna', x26.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: L26 }, mimeType: 'image/png' });
    const rx26 = await content.retirarMaterial('uAna', x26.assetId);
    const ry26 = await content.retirarMaterial('uAna', y26.assetId);
    check('26 la ficha que pierde uno de sus dos objetos sigue pendiente mientras el otro siga en el almacén',
      rx26.pendientes === 2 && ry26.status === 'retirado' && objetos.has(L26) && docs.get(`assets/${x26.assetId}`).pendingPhysicalDeletion === true,
      `pendientes al retirar: ${rx26.pendientes}, marca final: ${docs.get(`assets/${x26.assetId}`).pendingPhysicalDeletion}`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · El callable, ejecutado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  objetos.set('users/uCaro/ai-generations/2-weel.mp4', { contentType: 'video/mp4', size: '99' });
  const video = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uCaro', url: `gs://${BUCKET}/users/uCaro/ai-generations/2-weel.mp4`, kind: 'video', provenance: { createdAt: 1 },
  });
  check('24) un vídeo también es material, con su tipo por el mime', video && video.kind === 'video');

  const correr = (uid, assetId) => content.deleteAsset.run({ auth: uid ? { uid } : null, data: { assetId } });
  let e1 = null; try { await correr(null, video.assetId); } catch (e) { e1 = e; }
  check('25) sin sesión no se borra nada', e1?.code === 'unauthenticated' && objetos.has('users/uCaro/ai-generations/2-weel.mp4'));
  let e2 = null; try { await correr('uAna', video.assetId); } catch (e) { e2 = e; }
  check('26) de un material ajeno no se dice ni que exista', e2?.code === 'not-found');
  const ok = await correr('uCaro', video.assetId);
  check('27) su dueña lo retira, objeto incluido',
    ok.status === 'deleted' && ok.already === false && !objetos.has('users/uCaro/ai-generations/2-weel.mp4'));
  check('28) y otra vez es `already`', (await correr('uCaro', video.assetId)).already === true);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Borrado y revisión posterior: fallos por separado (H-6) y la limpieza de la marca (H-8) ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const urlDeE = (k) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(k)}?alt=media&token=abc-123`;

  /* H-8 · La limpieza. x e y usan el mismo objeto. Al retirar x queda pendiente, porque y lo usa. Al retirar y, que es la
     última ficha viva, el objeto se borra y la revisión quita la marca de x. Sin esa revisión, x seguiría marcada. */
  const K8 = 'users/uAna/ai-generations/k8.png';
  objetos.set(K8, { contentType: 'image/png', size: 10 });
  const x8 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDeE(K8), kind: 'image', provenance: { createdAt: 6 } });
  const y8 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDeE(K8), kind: 'image', provenance: { createdAt: 7 } });
  await content.retirarMaterial('uAna', x8.assetId);
  check('H-8 · precondición: mientras y usa el objeto, x queda pendiente y el objeto sigue',
    docs.get(`assets/${x8.assetId}`).pendingPhysicalDeletion === true && objetos.has(K8));
  const ry8 = await content.retirarMaterial('uAna', y8.assetId);
  check('H-8 · la última ficha que lo usa borra el objeto y quita la marca de la ficha retirada que lo tenía pendiente',
    ry8.status === 'retirado' && ry8.objetosBorrados === 1 && ry8.pendientes === 0 && !objetos.has(K8)
    && docs.get(`assets/${x8.assetId}`).pendingPhysicalDeletion === false,
    `marca de x: ${docs.get(`assets/${x8.assetId}`).pendingPhysicalDeletion}`);
  check('H-8 · y su propia marca queda limpia tras su retirada',
    docs.get(`assets/${y8.assetId}`).pendingPhysicalDeletion === false);

  /* H-6a · FALLO DE BORRADO. El objeto no se puede borrar: sigue en el almacén, no cuenta como borrado y la ficha queda pendiente. */
  const K6 = 'users/uAna/ai-generations/k6.png';
  objetos.set(K6, { contentType: 'image/png', size: 10 });
  const x6 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDeE(K6), kind: 'image', provenance: { createdAt: 8 } });
  const y6 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDeE(K6), kind: 'image', provenance: { createdAt: 9 } });
  await content.retirarMaterial('uAna', x6.assetId);
  noBorrables.add(K6);
  const ry6 = await content.retirarMaterial('uAna', y6.assetId);
  noBorrables.delete(K6);
  check('H-6a · FALLO DE BORRADO: el objeto sigue, no cuenta como borrado y la ficha queda pendiente',
    ry6.status === 'retirado' && ry6.objetosBorrados === 0 && ry6.pendientes === 1 && objetos.has(K6)
    && docs.get(`assets/${y6.assetId}`).pendingPhysicalDeletion === true,
    `objetosBorrados: ${ry6.objetosBorrados}, pendientes: ${ry6.pendientes}`);

  /* H-6b · FALLO DE REVISIÓN POSTERIOR. El borrado va bien y falla la revisión de la marca de x. El objeto ya no está, así que
     y NO se marca como pendiente por ese fallo. x conserva su marca porque la revisión no llegó a quitarla: es el residuo
     documentado (D1), y también prueba que el fallo sucedió de verdad. */
  const K7 = 'users/uAna/ai-generations/k7.png';
  objetos.set(K7, { contentType: 'image/png', size: 10 });
  const x7 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDeE(K7), kind: 'image', provenance: { createdAt: 10 } });
  const y7 = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlDeE(K7), kind: 'image', provenance: { createdAt: 11 } });
  await content.retirarMaterial('uAna', x7.assetId);
  noExistentes.add(K7);
  const ry7 = await content.retirarMaterial('uAna', y7.assetId);
  noExistentes.delete(K7);
  check('H-6b · FALLO DE REVISIÓN POSTERIOR: el borrado cuenta como hecho y y NO queda pendiente por el fallo de la revisión',
    ry7.status === 'retirado' && ry7.objetosBorrados === 1 && ry7.pendientes === 0 && !objetos.has(K7)
    && docs.get(`assets/${y7.assetId}`).pendingPhysicalDeletion === false,
    `objetosBorrados: ${ry7.objetosBorrados}, pendientes: ${ry7.pendientes}`);
  check('H-6b · prueba de que el fallo llegó a la revisión: x conserva la marca que ya tenía (residuo D1)',
    docs.get(`assets/${x7.assetId}`).pendingPhysicalDeletion === true);
}

http.storageBucket = storageBucketReal;
firestore.getFirestore = getFirestoreReal;

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
