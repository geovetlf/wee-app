/*
 * GUARDAR COMO VERSIÓN — LA BASE (DEC-03).
 *
 * Qué vigila, y por qué:
 *  · la relación de versión es EXPLÍCITA: `previousVersionId` la fija el servidor con la creación que se eligió, y solo
 *    si ambas son de la cuenta, la anterior está lista, son de la misma clase y el archivo no lo usa otra ficha viva;
 *  · no se deriva nada: ni procedencia (`sourceAssetIds`), ni IA, ni fechas ni nombres para deducir el parentesco;
 *  · la versión hereda el NOMBRE y los DERECHOS de la anterior: las restricciones, también las territoriales, viajan
 *    con el material, y una versión sin ellas las perdería;
 *  · el archivo nuevo es del propio almacén y nunca se comparte: retirar una ficha borra su objeto;
 *  · el callable: sesión obligatoria, la cuenta sale de la sesión y el cliente no puede fijar la relación.
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

/* ── Firestore de mentira, con las consultas que usa la versión ─────────────── */
const firestore = require('firebase-admin/firestore');
const docs = new Map(); // "assets/<id>" → documento, en orden de llegada
const copia = (v) => structuredClone(v);
const campoDe = (obj, campo) => campo.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const refDoc = (p) => ({
  get: async () => ({ exists: docs.has(p), data: () => (docs.has(p) ? copia(docs.get(p)) : undefined) }),
  create: async (d) => {
    if (docs.has(p)) throw Object.assign(new Error('ya existe'), { code: 6 });
    docs.set(p, copia(d));
  },
  set: async (d, opts) => {
    docs.set(p, opts?.merge ? { ...(docs.get(p) || {}), ...copia(d) } : copia(d));
  },
  update: async (d) => {
    if (!docs.has(p)) throw Object.assign(new Error('no existe'), { code: 5 });
    docs.set(p, { ...docs.get(p), ...copia(d) });
  },
});
const coleccion = (c) => ({
  doc: (id) => refDoc(`${c}/${id}`),
  where: (campo, _op, valor) => {
    const consulta = (tope) => async () => {
      const todas = [...docs.entries()]
        .filter(([p, d]) => p.startsWith(c + '/') && campoDe(d, campo) === valor)
        .map(([p, d]) => ({ id: p.slice(c.length + 1), data: () => copia(d) }));
      const lista = tope ? todas.slice(0, tope) : todas;
      return { docs: lista, empty: lista.length === 0 };
    };
    return { get: consulta(), limit: (n) => ({ get: consulta(n) }) };
  },
});
firestore.getFirestore = () => ({ collection: coleccion });

/* ── Storage de mentira ────────────────────────────────────────────────────── */
const http = lib('engine/http.js');
const BUCKET = 'get-wee.firebasestorage.app';
process.env.STORAGE_BUCKET = BUCKET;
const objetos = new Map(); // objectKey → metadata
const borrados = [];
http.storageBucket = () => ({
  name: BUCKET,
  file: (key) => ({
    getMetadata: async () => {
      if (!objetos.has(key)) throw new Error('No such object');
      return [{ ...objetos.get(key) }];
    },
    delete: async () => { borrados.push(key); objetos.delete(key); },
  }),
});
const subido = (clave, contentType, size = 10) => objetos.set(clave, contentType ? { contentType, size } : { size });

const content = lib('content/index.js');
const versiones = lib('content/versiones.js');
const urlWee = (clave) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(clave)}?alt=media&token=abc-123`;
const URL_CLOUD = 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1699999999/posts/uAna/foto.jpg';
const idHex = (n) => 'asset_' + n.toString(16).padStart(32, '0');

/* ── Fichas de partida, creadas por la propia función de creación ─────────── */
const ANTERIOR = idHex(0x1); // de Ana, lista, con nombre y derechos
const DE_BETO = idHex(0x2);
const EN_USO = idHex(0x3); // una ficha viva que ya usa un archivo
const RETIRADA = idHex(0x4);
const CLAVE_ANTERIOR = 'users/uAna/ai-generations/ant.png';
const CLAVE_DE_BETO = 'users/uBeto/x.png';
const CLAVE_EN_USO = 'users/uAna/uploads/en-uso.png';
const CLAVE_RETIRADA = 'users/uAna/uploads/retirada.png';
const CLAVE_V1 = 'users/uAna/uploads/v1-nueva.png';
const DERECHOS = {
  revision: 'REVIEW_REQUIRED',
  usoComercial: 'RESTRICTED',
  atribucion: true,
  licencias: [{ nombre: 'Licencia del modelo', url: 'https://example.com/licencia' }],
  jurisdiccionesBloqueadas: ['ES'],
};
const crear = (datos) => content.crearMaterialDesdeUrl({ provenance: { createdAt: 1 }, kind: 'image', ...datos });

subido(CLAVE_ANTERIOR, 'image/png');
subido(CLAVE_DE_BETO, 'image/png');
subido(CLAVE_EN_USO, 'image/png');
subido(CLAVE_RETIRADA, 'image/png');
const anterior = await crear({ ownerAccountId: 'uAna', assetId: ANTERIOR, url: urlWee(CLAVE_ANTERIOR), mimeType: 'image/png', name: 'Retrato', derechos: DERECHOS });
const deBeto = await crear({ ownerAccountId: 'uBeto', assetId: DE_BETO, url: urlWee(CLAVE_DE_BETO), mimeType: 'image/png' });
const enUso = await crear({ ownerAccountId: 'uAna', assetId: EN_USO, url: urlWee(CLAVE_EN_USO), mimeType: 'image/png' });
const retiradaDoc = await crear({ ownerAccountId: 'uAna', assetId: RETIRADA, url: urlWee(CLAVE_RETIRADA), mimeType: 'image/png' });
docs.set(`assets/${RETIRADA}`, { ...docs.get(`assets/${RETIRADA}`), status: 'deleted' });
check('fixture: la creación de Ana es válida, lista, con nombre y con derechos',
  anterior?.status === 'ready' && anterior?.name === 'Retrato' && JSON.stringify(anterior?.derechos) === JSON.stringify(DERECHOS));
check('fixture: las demás fichas de partida existen', !!deBeto && !!enUso && !!retiradaDoc);
if (!anterior || !deBeto || !enUso || !retiradaDoc) { console.log('✘ no hay fichas de partida: se para'); process.exit(1); }

const antesDeLaVersion = JSON.stringify(docs.get(`assets/${ANTERIOR}`));
const dame = (anteriorId, url) => versiones.crearVersionDeMaterial('uAna', { anteriorId, url });

/* ── A · La versión: relación explícita, lo que hereda y lo que no ─────────── */
subido(CLAVE_V1, 'image/png', 40);
const v1 = await dame(ANTERIOR, urlWee(CLAVE_V1));
const nueva = v1.status === 'creada' ? docs.get(`assets/${v1.asset.assetId}`) : undefined;
check('V1 un archivo propio, de la misma clase, con la creación lista: se crea la versión', v1.status === 'creada', v1.status);
check('V2 la relación es explícita: previousVersionId es la creación elegida', nueva?.previousVersionId === ANTERIOR);
check('V3 la versión está lista, es de la cuenta y es de la misma clase', nueva?.status === 'ready' && nueva?.ownerAccountId === 'uAna' && nueva?.kind === 'image');
check('V4 no hay derivación: la procedencia solo dice cuándo se creó', Object.keys(nueva?.provenance ?? {}).join() === 'createdAt', JSON.stringify(nueva?.provenance));
check('V5 hereda el nombre de la anterior', nueva?.name === 'Retrato');
check('V6 hereda los derechos, también la restricción territorial', JSON.stringify(nueva?.derechos) === JSON.stringify(DERECHOS));
check('V7 el archivo nuevo es el suyo, dentro de la carpeta de la cuenta', nueva?.storageRef?.provider === 'wee' && nueva?.storageRef?.objectKey === CLAVE_V1);
check('V8 la creación anterior no cambia: la relación nace en la nueva', JSON.stringify(docs.get(`assets/${ANTERIOR}`)) === antesDeLaVersion);

/* ── B · Lo que no se puede versionar, y el motivo que se dice ─────────────── */
check('V9 una creación ajena se trata como si no existiera', (await dame(DE_BETO, urlWee(CLAVE_V1))).status === 'no_existe');
check('V10 una creación que no existe: no existe', (await dame(idHex(0xabc), urlWee(CLAVE_V1))).status === 'no_existe');
check('V11 un identificador mal formado: no existe, sin lanzar', (await dame('no-es-un-id', urlWee(CLAVE_V1))).status === 'no_existe');
check('V12 una creación retirada no está lista para tener versiones', (await dame(RETIRADA, urlWee(CLAVE_V1))).status === 'no_lista');
check('V13 un archivo del almacén de otra cuenta no se acepta', (await dame(ANTERIOR, urlWee(CLAVE_DE_BETO))).status === 'archivo_ajeno');
check('V14 un archivo de fuera del almacén de Weë no se acepta', (await dame(ANTERIOR, URL_CLOUD)).status === 'archivo_ajeno');
check('V15 un archivo que no existe en el almacén no se acepta', (await dame(ANTERIOR, urlWee('users/uAna/uploads/no-existe.png'))).status === 'archivo_ajeno');
check('V16 un archivo que ya usa otra ficha viva no se comparte', (await dame(ANTERIOR, urlWee(CLAVE_EN_USO))).status === 'archivo_en_uso');

/* ── C · El tope de la consulta no puede esconder una ficha viva ───────────── */
const CLAVE_TOPE = 'users/uAna/uploads/tope.png';
subido(CLAVE_TOPE, 'image/png');
for (let i = 0; i < 6; i++) {
  docs.set(`assets/${idHex(0x100 + i)}`, { ownerAccountId: 'uAna', kind: 'image', status: 'deleted', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: CLAVE_TOPE } });
}
docs.set(`assets/${idHex(0x200)}`, { ownerAccountId: 'uAna', kind: 'image', status: 'ready', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: CLAVE_TOPE } });
check('V17 seis fichas retiradas con la misma clave no esconden la viva: archivo en uso', (await dame(ANTERIOR, urlWee(CLAVE_TOPE))).status === 'archivo_en_uso');
const CLAVE_SOLO_RETIRADA = 'users/uAna/uploads/solo-retirada.png';
subido(CLAVE_SOLO_RETIRADA, 'image/png');
docs.set(`assets/${idHex(0x300)}`, { ownerAccountId: 'uAna', kind: 'image', status: 'deleted', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: CLAVE_SOLO_RETIRADA } });
check('V18 un archivo que solo usó una ficha ya retirada sí se puede usar', (await dame(ANTERIOR, urlWee(CLAVE_SOLO_RETIRADA))).status === 'creada');

/* ── D · La clase: el mismo tipo sí, otro no ───────────────────────────────── */
subido('users/uAna/uploads/clip.mp4', 'video/mp4', 60);
check('V19 de otra clase (un vídeo para una imagen): no es una versión', (await dame(ANTERIOR, urlWee('users/uAna/uploads/clip.mp4'))).status === 'clase_distinta');
subido('users/uAna/uploads/sin-tipo.bin', null, 70);
check('V20 sin tipo declarado no se puede comprobar la clase: no se crea', (await dame(ANTERIOR, urlWee('users/uAna/uploads/sin-tipo.bin'))).status === 'clase_distinta');
subido('users/uAna/uploads/foto.jpg', 'image/jpeg', 80);
const jpg = await dame(ANTERIOR, urlWee('users/uAna/uploads/foto.jpg'));
check('V21 otro formato de la misma clase sí es versión', jpg.status === 'creada' && jpg.asset.kind === 'image', jpg.status);

/* ── E · La creación normal no cambia ──────────────────────────────────────── */
subido('users/uAna/uploads/normal.png', 'image/png', 90);
const normal = await content.crearMaterialDesdeUrl({ ownerAccountId: 'uAna', url: urlWee('users/uAna/uploads/normal.png'), kind: 'image', provenance: { createdAt: 1 }, mimeType: 'image/png' });
check('V22 la creación normal no lleva relación de versión', !!normal && !('previousVersionId' in docs.get(`assets/${normal.assetId}`)));

/* ── F · El callable: la sesión manda, y el cliente no fija la relación ─────── */
const llamar = (sesion, datos) => versiones.guardarComoVersion.run({ ...(sesion ? { auth: sesion } : {}), data: datos });
const codigo = async (promesa) => { try { await promesa; return 'ok'; } catch (error) { return error.code || String(error); } };
check('V23 sin sesión: unauthenticated', (await codigo(llamar(null, { anteriorId: ANTERIOR, url: urlWee(CLAVE_V1) }))) === 'unauthenticated');
check('V24 faltan la creación o el archivo: invalid-argument', (await codigo(llamar({ uid: 'uAna' }, { anteriorId: ANTERIOR }))) === 'invalid-argument');
check('V25 una creación ajena: not-found, sin decir que existe', (await codigo(llamar({ uid: 'uAna' }, { anteriorId: DE_BETO, url: urlWee(CLAVE_V1) }))) === 'not-found');
check('V26 una creación retirada: failed-precondition', (await codigo(llamar({ uid: 'uAna' }, { anteriorId: RETIRADA, url: urlWee(CLAVE_V1) }))) === 'failed-precondition');
check('V27 un archivo de fuera: invalid-argument', (await codigo(llamar({ uid: 'uAna' }, { anteriorId: ANTERIOR, url: URL_CLOUD }))) === 'invalid-argument');
const CLAVE_CALL = 'users/uAna/uploads/llamada.png';
subido(CLAVE_CALL, 'image/png', 95);
const llamada = await llamar({ uid: 'uAna' }, { anteriorId: ANTERIOR, url: urlWee(CLAVE_CALL), previousVersionId: DE_BETO }).catch((e) => e);
check('V28 con sesión propia: la relación es la del servidor, no la que envió el cliente',
  !!llamada?.assetId && llamada.previousVersionId === ANTERIOR && docs.get(`assets/${llamada.assetId}`)?.previousVersionId === ANTERIOR,
  JSON.stringify(llamada));

/* ── G · Después: retirar la anterior no toca el archivo de la versión ─────── */
const resultadoRetirada = await content.retirarMaterial('uAna', ANTERIOR);
check('V29 retirar la creación anterior la retira', resultadoRetirada.status === 'retirado', resultadoRetirada.status);
check('V30 borra solo el archivo de la anterior: el de la versión sigue en el almacén',
  borrados.includes(CLAVE_ANTERIOR) && !borrados.includes(CLAVE_V1) && objetos.has(CLAVE_V1));
const versionTrasRetirar = docs.get(`assets/${v1.asset.assetId}`);
check('V31 la versión sigue lista y conserva la relación como historia',
  versionTrasRetirar?.status === 'ready' && versionTrasRetirar?.previousVersionId === ANTERIOR);

/* ── H · Una versión 3D no es un archivo de otra clase ───────────────────── */
const CLAVE_MODELO_3D = 'users/uAna/uploads/modelo-3d.glb';
const CLAVE_IMAGEN_3D = 'users/uAna/uploads/imagen-3d.png';
const CLAVE_GLB_3D = 'users/uAna/uploads/nueva-3d.glb';
subido(CLAVE_MODELO_3D, 'model/gltf-binary');
subido(CLAVE_IMAGEN_3D, 'image/png');
subido(CLAVE_GLB_3D, 'model/gltf-binary');
const modelo3d = await crear({ ownerAccountId: 'uAna', url: urlWee(CLAVE_MODELO_3D), kind: 'model3d', mimeType: 'model/gltf-binary', name: 'Modelo', derechos: DERECHOS });
const porImagen3d = await dame(modelo3d.assetId, urlWee(CLAVE_IMAGEN_3D));
const porGlb3d = await dame(modelo3d.assetId, urlWee(CLAVE_GLB_3D));
check('V32 una imagen no es versión de un modelo 3D; otro modelo 3D sí lo es',
  porImagen3d.status === 'clase_distinta' && porGlb3d.status === 'creada', `${porImagen3d.status} / ${porGlb3d.status}`);

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
