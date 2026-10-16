/*
 * GRAN MOTOR · PAQUETE E — ACTIVOS (Asset / Content Core y materialización).
 *
 * En memoria: ni Firestore, ni Storage, ni red. Cada defecto que se corrigió en este paquete tiene aquí su
 * comprobación, escrita ANTES del cambio (falló) y que ahora pasa; el resto fija lo que ya estaba bien para que
 * no se pierda.
 *
 *   A · Propiedad y autorización (retirar, leer, referencias fuera de la cuenta).
 *   B · Integridad: el borrado lógico no deja el contenido; el cubo de la ficha es el de Weë.
 *   C · Materialización: destinos permitidos, tipo de contenido, tamaño, errores, idempotencia.
 *   D · Entrega y URLs (L-7 del paquete C): qué URL viaja a los asientos.
 *   E · Reglas (análisis estático de storage.rules y firestore.rules).
 *   F · Limpieza: nada programado toca los activos; qué temporales quedan.
 *
 * Usa el compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Firestore y Storage de mentira ─────────────────────────────────────── */
const firestore = require('firebase-admin/firestore');
const docs = new Map();
const ALREADY = Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
const ref = (p) => ({
  id: p.split('/').pop(),
  get: async () => ({ exists: docs.has(p), data: () => docs.get(p) }),
  set: async (d, opts) => { docs.set(p, opts?.merge ? { ...(docs.get(p) || {}), ...d } : { ...d }); },
  create: async (d) => { if (docs.has(p)) throw ALREADY; docs.set(p, { ...d }); },
  update: async (d) => { docs.set(p, { ...(docs.get(p) || {}), ...d }); },
});
firestore.getFirestore = () => ({ collection: (c) => ({ doc: (id) => ref(`${c}/${id}`) }) });

const http = lib('engine/http.js');
const BUCKET = 'get-wee.firebasestorage.app';
const objetos = new Map(); // key → { contentType, size, metadata }
const borrados = [];
const guardados = [];
http.storageBucket = () => ({
  name: BUCKET,
  getFiles: async ({ prefix }) => [[...objetos.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({
    name,
    getMetadata: async () => [objetos.get(name)],
  }))],
  file: (key) => ({
    getMetadata: async () => {
      if (!objetos.has(key)) throw new Error('No such object');
      return [objetos.get(key)];
    },
    delete: async () => { borrados.push(key); objetos.delete(key); },
    save: async (bytes, opts) => {
      if (objetos.has(key)) throw Object.assign(new Error('precondition'), { code: 412 });
      guardados.push(key);
      objetos.set(key, { contentType: opts.metadata.contentType, size: String(bytes.length), metadata: opts.metadata.metadata });
    },
  }),
});

let descargas = [];
let respuestaDeRed = () => ({ buffer: Buffer.from('bytes'), contentType: 'video/mp4' });
http.fetchBytes = async (url) => { descargas.push(url); return respuestaDeRed(url); };

const content = lib('content/index.js');
const { materializadorDeWee } = lib('content/materializador.js');
const { identidadDelMaterial } = lib('runtime/materializacion.js');

const ID = (s) => 'asset_' + s.repeat(32).slice(0, 32);
const prov = (at = 1) => ({ createdAt: at, jobId: 'job_1' });
const peticion = (o = {}) => ({
  assetId: ID('a'), userId: 'uAna', kind: 'video', recurso: 'https://cdn.example-provider.com/v/1.mp4?sig=abc',
  provenance: prov(), ...o,
});

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Propiedad y autorización ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const clave = 'users/uAna/ai-generations/a.png';
  objetos.set(clave, { contentType: 'image/png', size: '10' });
  const m = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uAna', assetId: ID('1'),
    url: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(clave)}?alt=media&token=t`,
    kind: 'image', provenance: prov(),
  });
  check('A1) la ficha nace con la cuenta que se le dio', m && m.ownerAccountId === 'uAna');
  check('A2) otra cuenta no retira ni se entera: no_es_tuyo y el objeto sigue', (await content.retirarMaterial('uBeto', ID('1'))).status === 'no_es_tuyo' && objetos.has(clave));
  check('A3) otra cuenta no lee el texto de un material', (await content.leerTextoDelMaterial('uBeto', ID('1'))) === null);

  /* Una ficha de Ana que apunta a la carpeta de Beto: retirar NO borra el objeto de Beto. */
  const ajena = 'users/uBeto/ai-generations/b.png';
  objetos.set(ajena, { contentType: 'image/png', size: '10' });
  docs.set(`assets/${ID('2')}`, {
    contract: '1.0', assetId: ID('2'), ownerAccountId: 'uAna', kind: 'image', status: 'ready', createdAt: 1, updatedAt: 1,
    storageRef: { provider: 'wee', bucket: BUCKET, objectKey: ajena },
  });
  const r = await content.retirarMaterial('uAna', ID('2'));
  check('A4) una ficha que apunta a la carpeta de OTRA cuenta no borra su objeto (queda pendiente)',
    r.status === 'retirado' && r.objetosBorrados === 0 && r.pendientes === 1 && objetos.has(ajena));

  const sin = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uAna', assetId: ID('3'),
    url: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(ajena)}?alt=media&token=t`,
    kind: 'image', provenance: prov(),
  });
  check('A5) no se crea una ficha de Ana sobre un objeto de la carpeta de Beto', sin === null);

  /* Misma identidad, otra cuenta: no se le devuelve la ficha ajena. */
  const colision = await content.crearMaterialDeTexto({ assetId: ID('4'), ownerAccountId: 'uAna', contenido: 'hola', provenance: prov() });
  const robo = await content.crearMaterialDeTexto({ assetId: ID('4'), ownerAccountId: 'uBeto', contenido: 'otro', provenance: prov() });
  check('A6) misma identidad pedida por otra cuenta: no se le entrega la ficha de Ana', colision && robo === null);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Integridad del borrado lógico y del cubo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  await content.crearMaterialDeTexto({ assetId: ID('5'), ownerAccountId: 'uAna', contenido: 'GUION PRIVADO DE ANA', provenance: prov() });
  const antes = await content.leerTextoDelMaterial('uAna', ID('5'));
  const r = await content.retirarMaterial('uAna', ID('5'));
  const guardada = docs.get(`assets/${ID('5')}`);
  check('B1) el texto se lee mientras está listo', antes === 'GUION PRIVADO DE ANA');
  check('B2) retirar un texto lo deja `deleted` y repetir es un no-op', r.status === 'retirado' && guardada.status === 'deleted' && (await content.retirarMaterial('uAna', ID('5'))).status === 'ya_retirado');
  check('B3) y el CONTENIDO desaparece del documento (antes quedaba entero, legible por su dueño)', !('contenido' in guardada) && !JSON.stringify(guardada).includes('GUION PRIVADO'));
  check('B4) un texto retirado ya no se lee', (await content.leerTextoDelMaterial('uAna', ID('5'))) === null);

  const clave = 'users/uAna/ai-generations/c.png';
  objetos.set(clave, { contentType: 'image/png', size: '10' });
  const deOtroCubo = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uAna', assetId: ID('6'), url: `gs://otro-cubo-ajeno/${clave}`, kind: 'image', provenance: prov(),
  });
  check('B5) una dirección de OTRO cubo no se convierte en ficha de Weë (antes se guardaba con el cubo ajeno)', deOtroCubo === null);
  const delNuestro = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uAna', assetId: ID('7'), url: `gs://${BUCKET}/${clave}`, kind: 'image', provenance: prov(),
  });
  check('B6) CONTROL: la del cubo de Weë sí', delNuestro && delNuestro.storageRef.bucket === BUCKET);

  /* Idempotencia del registro. */
  const otra = await content.crearMaterialDesdeUrl({
    ownerAccountId: 'uAna', assetId: ID('7'), url: `gs://${BUCKET}/${clave}`, kind: 'image', provenance: prov(99),
  });
  check('B7) registrar dos veces el mismo activo deja UNA ficha, con la fecha de la primera', otra && otra.provenance.createdAt === 1);

  /* Ciclo de vida: transiciones. */
  check('B8) un material retirado no vuelve a ready ni se le anotan variantes',
    (await content.marcarMaterialSubido('uAna', ID('5'), {})).status === 'estado_incompatible'
    && (await content.anotarVariante('uAna', ID('5'), { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: 'users/uAna/x.png' } })) === false);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Materialización: destino, tipo, tamaño, errores, idempotencia ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const reiniciar = () => { descargas = []; guardados.length = 0; respuestaDeRed = () => ({ buffer: Buffer.from('bytes'), contentType: 'video/mp4' }); };
  const peligrosas = [
    'http://cdn.example-provider.com/v/1.mp4',
    'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token',
    'https://169.254.169.254/x',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://127.0.0.1/x.mp4',
    'https://localhost/x.mp4',
    'https://10.0.0.5/x.mp4',
    'https://192.168.1.1/x.mp4',
    'https://172.16.0.9/x.mp4',
    'https://[::1]/x.mp4',
    'https://[fd00::1]/x.mp4',
    'https://usuario:clave@cdn.example-provider.com/x.mp4',
    'file:///etc/passwd',
    'gs://get-wee.firebasestorage.app/users/uBeto/ai-generations/x.mp4',
    'no es una url',
  ];
  for (const [i, u] of peligrosas.entries()) {
    reiniciar();
    const r = await materializadorDeWee.guardar(peticion({ assetId: ID((i + 0xe0).toString(16)), recurso: u }));
    check(`C${i + 1}) destino no permitido «${u.slice(0, 48)}»: se rechaza y no sale a la red`, !r.ok && r.motivo === 'rechazado' && descargas.length === 0 && guardados.length === 0, JSON.stringify(r));
  }
  reiniciar();
  const bien = await materializadorDeWee.guardar(peticion({ assetId: ID('b') }));
  check('C16) CONTROL: un https de un CDN normal se descarga y se guarda en la carpeta de la cuenta',
    bien.ok && bien.yaEstaba === false && descargas.length === 1 && guardados.length === 1 && guardados[0].startsWith('users/uAna/ai-generations/'));
  const ficha = docs.get(`assets/${ID('b')}`);
  check('C17) la ficha no guarda el enlace del proveedor y apunta al cubo de Weë', ficha && !JSON.stringify(ficha).includes('example-provider') && ficha.storageRef.bucket === BUCKET);

  reiniciar();
  respuestaDeRed = () => ({ buffer: Buffer.from('<html>login</html>'), contentType: 'text/html; charset=utf-8' });
  const html = await materializadorDeWee.guardar(peticion({ assetId: ID('c') }));
  check('C18) un vídeo que llega como text/html no se guarda como activo (antes: ficha de texto sobre un HTML ajeno)', !html.ok && html.motivo === 'rechazado' && guardados.length === 0 && !docs.has(`assets/${ID('c')}`), JSON.stringify(html));
  respuestaDeRed = () => ({ buffer: Buffer.from('{"error":"x"}'), contentType: 'application/json' });
  const json = await materializadorDeWee.guardar(peticion({ assetId: ID('d'), kind: 'image' }));
  check('C19) una imagen que llega como application/json tampoco', !json.ok && json.motivo === 'rechazado' && guardados.length === 0);
  respuestaDeRed = () => ({ buffer: Buffer.from('glb-bytes'), contentType: 'application/octet-stream' });
  const glb = await materializadorDeWee.guardar(peticion({ assetId: ID('e'), kind: 'model3d' }));
  check('C20) CONTROL: un 3D como octet-stream (lo normal) sí', glb.ok);
  respuestaDeRed = () => ({ buffer: Buffer.from('mp4'), contentType: 'binary/octet-stream' });
  const bin = await materializadorDeWee.guardar(peticion({ assetId: ID('f') }));
  check('C21) CONTROL: un vídeo como binary/octet-stream sí', bin.ok);

  reiniciar();
  respuestaDeRed = () => ({ buffer: { length: 512 * 1024 * 1024 + 1 }, contentType: 'video/mp4' });
  const grande = await materializadorDeWee.guardar(peticion({ assetId: ID('9') }));
  check('C22) más de 512 MB se rechaza sin guardar', !grande.ok && grande.motivo === 'rechazado' && guardados.length === 0);
  respuestaDeRed = () => ({ buffer: Buffer.alloc(0), contentType: 'video/mp4' });
  const vacio = await materializadorDeWee.guardar(peticion({ assetId: ID('8') }));
  check('C23) un cuerpo vacío se rechaza', !vacio.ok && vacio.motivo === 'rechazado');

  const { ProviderError } = http;
  for (const [status, esperado] of [[403, 'caducado'], [404, 'caducado'], [410, 'caducado'], [500, 'no_se_pudo_traer'], [undefined, 'no_se_pudo_traer']]) {
    respuestaDeRed = () => { throw new ProviderError('x', 'materializacion', status); };
    const r = await materializadorDeWee.guardar(peticion({ assetId: ID('ab') }));
    check(`C24) fallo de descarga ${status ?? 'de red'} → ${esperado}, sin ficha`, !r.ok && r.motivo === esperado && !docs.has(`assets/${ID('ab')}`));
  }

  /* Idempotencia: la segunda llegada no descarga ni duplica. */
  reiniciar();
  const id = identidadDelMaterial('job_x', 'att_1');
  const p1 = peticion({ assetId: id });
  const a = await materializadorDeWee.guardar(p1);
  const antes = descargas.length;
  const b = await materializadorDeWee.guardar(p1);
  check('C25) llegar dos veces: una ficha, un objeto, una descarga; la segunda dice yaEstaba', a.ok && b.ok && b.yaEstaba === true && descargas.length === antes && guardados.length === 1);

  /* Objeto guardado sin ficha (el proceso murió entre medias): se adopta sin volver a descargar. */
  reiniciar();
  const id2 = identidadDelMaterial('job_y', 'att_1');
  const claveHuerfana = `users/uAna/ai-generations/${id2}.mp4`;
  objetos.set(claveHuerfana, { contentType: 'video/mp4', size: '5', metadata: { firebaseStorageDownloadTokens: 'tok-1', weeMaterial: id2 } });
  const adoptado = await materializadorDeWee.guardar(peticion({ assetId: id2 }));
  check('C26) un objeto propio sin ficha se adopta: sin descarga y con una ficha', adoptado.ok && descargas.length === 0 && docs.has(`assets/${id2}`));

  /* La ficha de otra cuenta con la misma identidad no se acepta. */
  const robado = await materializadorDeWee.guardar(peticion({ assetId: ID('1'), userId: 'uBeto' }));
  check('C27) una identidad que ya es de otra cuenta se rechaza', !robado.ok && robado.motivo === 'rechazado');

  /* Variantes con destino peligroso: el material queda y la variante no se baja. */
  reiniciar();
  const conv = await materializadorDeWee.guardar(peticion({ assetId: ID('cd'), kind: 'world', recurso: 'https://cdn.example-provider.com/w.spz', variantes: [{ kind: 'preview', recurso: 'http://169.254.169.254/x.png' }] }));
  check('C28) una variante hacia un destino interno no se descarga (el material sí queda)', conv.ok === true && !descargas.some((u) => u.includes('169.254')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Entrega y URLs (L-7 del paquete C) ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));
  const SEED = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
  const AVATAR = sinComentarios(leer('functions/src/vertexAI.ts'));
  check('D1) la URL del vídeo que viaja al asiento sale de `persistRemoteFile`: Storage de Weë, nunca la firmada del proveedor',
    /persistRemoteFile\(ctx\.userId, remote, 'seedance'/.test(SEED) && /output\.url/.test(VIDEO));
  check('D2) la del avatar es la de descarga del Storage de Weë (`uploadImageToStorage` → `downloadUrlFor`)', /return downloadUrlFor\(bucket\.name, storagePath, downloadToken\)/.test(AVATAR));
  check('D3) una URL firmada de proveedor NO es de ningún almacén conocido, así que nunca se convierte en ficha',
    content.referenciaDesdeUrl('https://ark-content-generation.byteplus.com/v/1.mp4?X-Tos-Signature=abc&X-Tos-Expires=86400') === null);
  check('D4) el enlace del proveedor no se escribe en la ficha ni en el trabajo (materializador)',
    !/delivery:\s*\{\s*url:\s*peticion\.recurso/.test(sinComentarios(leer('functions/src/content/materializador.ts'))));
  check('D5) la entrega de Weë es un token al portador y está etiquetada como tal',
    (docs.get(`assets/${ID('b')}`) ?? {}).delivery?.kind === 'bearer_token');
}

/* Los bloques `match` de un archivo de reglas, con su cuerpo entero (los anidados incluidos). */
const bloquesDe = (src) => {
  const salida = [];
  const re = /match\s+(\/\S+)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let prof = 1; let i = re.lastIndex;
    while (i < src.length && prof > 0) { if (src[i] === '{') prof++; else if (src[i] === '}') prof--; i++; }
    salida.push({ ruta: m[1], cuerpo: src.slice(re.lastIndex, i - 1) });
  }
  return salida;
};

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Reglas (análisis estático) ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ST = leer('storage.rules').replace(/^\s*\/\/.*$/gm, ' ');
  const bloques = bloquesDe(ST).filter((b) => b.ruta !== '/b/{bucket}/o');
  const rutas = bloques.map((b) => b.ruta);
  check('E1) storage.rules no tiene comodín: lo no declarado se deniega', !/\{[a-zA-Z]+=\*\*\}/.test(ST));
  const PUBLICAS = new Set(['/images/posts/{userId}/{fileName}', '/images/profile/{userId}/{fileName}', '/users/{userId}/ai-avatar/{fileName}']);
  const lecturaLibre = bloques.filter((b) => /allow read: if true/.test(b.cuerpo)).map((b) => b.ruta);
  check('E2) solo son de lectura libre las tres rutas públicas por diseño', lecturaLibre.length === PUBLICAS.size && lecturaLibre.every((r) => PUBLICAS.has(r)), lecturaLibre.join(' · '));
  const deUsuario = bloques.filter((b) => b.ruta.startsWith('/users/{userId}/'));
  const escrituraMala = deUsuario.filter((b) => /allow write: if (?!false)/.test(b.cuerpo) && !/request\.auth\.uid == userId/.test(b.cuerpo));
  check('E3) toda escritura de cliente bajo users/{userId}/ exige ser esa cuenta', escrituraMala.length === 0, escrituraMala.map((b) => b.ruta).join(','));
  for (const carpeta of ['ai-generations', 'ai-avatar', 'avatar-replacement']) {
    const b = bloques.find((x) => x.ruta === `/users/{userId}/${carpeta}/{fileName}`);
    check(`E4) ${carpeta}: lo escribe solo el servidor`, b && /allow write: if false/.test(b.cuerpo));
  }
  for (const carpeta of ['ai-generations', 'avatar-replacement', 'creator-inputs', 'brain-attachments', 'face-swap']) {
    const b = bloques.find((x) => x.ruta === `/users/{userId}/${carpeta}/{fileName}`);
    check(`E5) ${carpeta}: la lee solo su dueña`, b && /allow read: if request\.auth != null && request\.auth\.uid == userId/.test(b.cuerpo));
  }
  check('E6) toda escritura de cliente limita tipo y tamaño (menos las que son `false`)',
    deUsuario.concat(bloques.filter((b) => b.ruta.startsWith('/images/'))).filter((b) => /allow write: if request/.test(b.cuerpo)).every((b) => /request\.resource\.size/.test(b.cuerpo) && /contentType\.matches/.test(b.cuerpo)));
  check('E7) hay 9 rutas declaradas (si cambia, esta revisión debe repetirse)', rutas.length === 9, String(rutas.length));

  const FS = leer('firestore.rules').replace(/^\s*\/\/.*$/gm, ' ');
  const cerradas = ['assets', 'elements', 'projectItems'];
  for (const col of cerradas) {
    const m = bloquesDe(FS).filter((b) => b.ruta.startsWith(`/${col}/{`)).map((b) => [0, b.cuerpo])[0] ?? null;
    check(`E8) ${col}: lectura solo del dueño por ownerAccountId, y ninguna escritura de cliente`,
      !!m && /allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid/.test(m[1]) && /allow create, update, delete: if false/.test(m[1]));
  }
  const mo = bloquesDe(FS).filter((b) => b.ruta.startsWith('/mediaObjects/{')).map((b) => [0, b.cuerpo])[0] ?? null;
  check('E9) mediaObjects: ni lectura ni escritura de cliente', !!mo && /allow read, write: if false/.test(mo[1]));
  const cj = bloquesDe(FS).filter((b) => b.ruta === '/creatorJobs/{jobId}').map((b) => [0, b.cuerpo])[0] ?? null;
  check('E10) creatorJobs: el cliente solo mueve projectId/updatedAt, no crea ni borra', !!cj && /allow create, delete: if false/.test(cj[1]) && /hasOnly\(\['projectId', 'updatedAt'\]\)/.test(cj[1]));
  const cp = bloquesDe(FS).filter((b) => b.ruta === '/creatorProjects/{projectId}').map((b) => [0, b.cuerpo])[0] ?? null;
  check('E11) creatorProjects: no se puede cambiar de dueño', !!cp && /request\.resource\.data\.userId == resource\.data\.userId/.test(cp[1]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Limpieza: nada programado borra activos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const SRC = path.resolve(here, '../src');
  const recorrer = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? recorrer(path.join(d, e.name)) : [path.join(d, e.name)]);
  const ts = recorrer(SRC).filter((f) => f.endsWith('.ts'));
  const programados = ts.filter((f) => /\bonSchedule\s*\(/.test(sinComentarios(fs.readFileSync(f, 'utf8'))));
  const nombres = programados.map((f) => path.relative(SRC, f).replace(/\\/g, '/')).sort();
  check('F1) las únicas Functions programadas son la liquidación (si aparece otra, hay que revisar si toca activos)',
    JSON.stringify(nombres) === JSON.stringify(['settlement/programado.ts']), nombres.join(','));
  const tocanActivos = programados.filter((f) => /collection\('assets'\)|ai-generations|\.delete\(\)/.test(sinComentarios(fs.readFileSync(f, 'utf8'))));
  check('F2) y ninguna de las dos toca `assets`, `ai-generations` ni borra', tocanActivos.length === 0, tocanActivos.join(','));
  const borradoresFisicos = ts.filter((f) => /\.file\([^)]*\)\.delete\(|\.deleteFiles\(/.test(sinComentarios(fs.readFileSync(f, 'utf8')))).map((f) => path.relative(SRC, f).replace(/\\/g, '/')).sort();
  check('F3) quién puede borrar un objeto del Storage: solo retirar (content), la vista única (WeeTalk) y el barrido de Media Cloud (que pide permiso al Core)',
    borradoresFisicos.every((f) => ['content/index.ts', 'social/weetalk.ts'].includes(f) || f.startsWith('media/')), borradoresFisicos.join(','));
}

console.log(failures ? `\n✘ ${failures} comprobaciones fallaron de ${n}` : `\n✔ ${n} comprobaciones, 0 fallos`);
process.exit(failures ? 1 : 0);
