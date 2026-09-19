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
const baseFalsa = { collection: (c) => ({ doc: (id) => ref(`${c}/${id}`) }) };
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

const http = lib('engine/http.js');
const objetos = new Map(); // objectKey → { contentType, size }
const borrados = [];
const storageBucketReal = http.storageBucket;
http.storageBucket = () => ({
  name: 'get-wee.firebasestorage.app',
  file: (key) => ({
    getMetadata: async () => {
      if (!objetos.has(key)) throw new Error('No such object');
      return [objetos.get(key)];
    },
    delete: async () => { borrados.push(key); objetos.delete(key); },
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

http.storageBucket = storageBucketReal;
firestore.getFirestore = getFirestoreReal;

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
