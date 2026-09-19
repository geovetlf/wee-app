/*
 * LO QUE COMPARTEN EL INVENTARIO Y LA MIGRACIÓN DE MATERIAL (Fase 11).
 * SOLO LECTURA: funciones puras y lectores. Aquí no se escribe nada.
 *
 * Lo que hay hoy en producción son URLs sueltas dentro de documentos —un post
 * con `imageUrls[]`, un mensaje con `imageUrl`, un perfil con `photoURL`— y
 * objetos en dos almacenes: el Storage de Weë y Cloudinary. El Asset Core
 * (`functions/src/core/content/asset.ts`) dice qué es un material y de quién
 * es; esto reconoce lo que ya existe con los MISMOS lectores que usa el
 * servidor (`functions/lib/content`), para que el inventario y la migración
 * vean exactamente lo que verá Weë después.
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
export const admin = require('firebase-admin');
/* Los mismos lectores que el servidor: de la URL a la referencia, y el contrato del material. */
export const content = require('./lib/content/index.js');
export const core = require('./lib/core/index.js');

export const esUrl = (v) => typeof v === 'string' && /^(https?:\/\/|gs:\/\/)/.test(v);

/** `wee` · `cloudinary` · `otro` (una URL que no es de ningún almacén de Weë). */
export const clasificar = (url) => {
  const ref = content.referenciaDesdeUrl(url);
  return ref ? { proveedor: ref.provider, ref } : { proveedor: 'otro', ref: null };
};

const OPACOS = new Set(['DocumentReference', 'Timestamp', 'GeoPoint', 'FieldValue', 'Buffer']);

/** Recorre un documento y llama a `visitar(campo, url)` por cada URL que encuentra. */
export const recorrer = (valor, visitar, campo = '') => {
  if (esUrl(valor)) { visitar(campo, valor); return; }
  if (Array.isArray(valor)) { valor.forEach((x) => recorrer(x, visitar, `${campo}[]`)); return; }
  if (!valor || typeof valor !== 'object') return;
  if (valor.constructor && OPACOS.has(valor.constructor.name)) return;
  for (const [k, x] of Object.entries(valor)) recorrer(x, visitar, campo ? `${campo}.${k}` : k);
};

/** Dónde puede haber material hoy. Se leen enteras: producción es pequeña. */
export const COLECCIONES = ['posts', 'comments', 'users', 'communities', 'businesses', 'creatorJobs', 'aiGenerations', 'assets', 'creatorProjects', 'brainChats', 'conversations'];
/** Subcolecciones, por grupo. */
export const GRUPOS = ['messages', 'products', 'reviews'];

/** Las rutas del Storage de Weë que existen en `storage.rules`, y qué son. */
export const CARPETAS_DE_STORAGE = {
  'users/*/ai-generations': 'resultados de Weë AI (los escribe el servidor)',
  'users/*/creator-inputs': 'fotos que la persona sube para Weë AI',
  'users/*/brain-attachments': 'adjuntos de Weë Brain',
  'users/*/face-swap': 'selfies para la foto con el avatar',
  'users/*/ai-avatar': 'avatares del Perfil Weë (servidor)',
  'users/*/avatar-replacement': 'fotos con el avatar (servidor)',
  'users/*/weetalk': 'fotos únicas de WeeTalk (Fase 11)',
  'images/posts/*': 'legacy: imágenes de posts (antes de Cloudinary)',
  'images/profile/*': 'legacy: imágenes de perfil (antes de Cloudinary)',
};

export const carpetaDe = (objectKey) => {
  const u = objectKey.match(/^users\/[^/]+\/([^/]+)\//);
  if (u) return `users/*/${u[1]}`;
  const l = objectKey.match(/^(images\/(?:posts|profile))\//);
  if (l) return `${l[1]}/*`;
  return '(fuera de las rutas conocidas)';
};

/** Qué clase de material es, por lo que dice la URL. Solo una pista: el material real lo confirma el objeto. */
export const tipoPorUrl = (url, ref) => {
  if (ref && ref.provider === 'cloudinary') {
    if (/\/video\/upload\//.test(url)) return /\/audio\//.test(url) ? 'audio' : 'video';
    return 'image';
  }
  const ext = ((url.split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'm4a', 'wav', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'].includes(ext)) return 'image';
  if (['glb', 'gltf', 'obj', 'fbx'].includes(ext)) return 'model3d';
  return 'document';
};

/** Un id de material DETERMINISTA por origen: repetir la migración no crea duplicados. */
export const idDeMaterial = (huella) => 'asset_' + createHash('sha256').update(huella).digest('hex').slice(0, 32);

/**
 * La CUENTA detrás de una identidad. El Perfil Weë (`hidi_<uid>`) apunta a su
 * cuenta por `users.linkedAccountId`: se LEE, nunca se deduce quitando el
 * prefijo (regla del proyecto). Sin puente = AMBIGUO, y lo ambiguo no se migra.
 */
export const cuentaDe = async (db, id) => {
  if (typeof id !== 'string' || !id) return null;
  if (!id.startsWith('hidi_')) return id;
  const u = await db.collection('users').doc(id).get();
  const puente = u.exists ? u.get('linkedAccountId') : null;
  return typeof puente === 'string' && puente ? puente : null;
};

/** La cara que firmó: el `EntityType` del Identity Core. */
export const tipoDeEntidad = (id) => (typeof id === 'string' && id.startsWith('hidi_') ? 'WEE_PROFILE' : 'REAL_PROFILE');

export const arg = (n, def) => {
  const i = process.argv.indexOf(n);
  return i === -1 ? def : process.argv[i + 1];
};
export const bandera = (n) => process.argv.includes(n);

export const iniciar = () => {
  const proyecto = arg('--project', 'get-wee');
  const bucket = arg('--bucket', `${proyecto}.firebasestorage.app`);
  admin.initializeApp({ projectId: proyecto, storageBucket: bucket });
  return { proyecto, bucket, db: admin.firestore(), storage: admin.storage().bucket(bucket) };
};
