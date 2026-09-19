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
 *
 * ── DÓNDE SE BUSCA, Y POR QUÉ ESTABA MAL ───────────────────────────────────
 *
 * Esto leía `users/<identidad>`, es decir, daba por hecho que el id del
 * documento ERA el uid. En producción no lo es en ningún caso: los documentos
 * de `users` se crearon con `addDoc`, así que tienen id automático y el uid
 * vive en un CAMPO. Por eso todas las identidades Weë salían «sin cuenta
 * legible» y sus materiales quedaban marcados como ambiguos: el inventario no
 * miraba donde están los datos.
 *
 * Se busca como busca el resto de Weë —`where('uid','==',…)`, igual que
 * `econtactService`, `creditsService` o `followsService`— y además, por si
 * algún documento sí estuviera nombrado por su uid, se prueba también el id.
 *
 * ── QUIÉN DECIDE ───────────────────────────────────────────────────────────
 *
 * La decisión NO se toma aquí: la toma `cuentaDeIdentidad`, el mismo resolutor
 * que usan ËContact y las encuestas en el servidor. Exige que el documento
 * exista, que su `uid` sea esa identidad, que el tipo sea el que toca y que el
 * prefijo y `linkedAccountId` cuenten la misma historia. Un segundo criterio
 * de identidad en un script sería justo lo que la Fase 10 prohíbe.
 *
 * `users` no tiene unicidad garantizada (se creó con leer-y-entonces-crear sin
 * transacción), así que una identidad puede tener VARIOS documentos. Se miran
 * todos: si dicen lo mismo, hay cuenta; si se contradicen, es ambiguo y se
 * dice cuál es la contradicción. Nunca se elige uno al azar.
 */
export const econtact = require('./lib/social/econtact.js');

/** Por qué se pudo —o no— poner nombre a la cuenta dueña. Explícito, nunca un null a secas. */
export const MOTIVO = Object.freeze({
  DIRECTA: 'directa',
  PUENTE: 'puente',
  ID_INVALIDO: 'id_invalido',
  SIN_USUARIO: 'sin_documento_de_usuario',
  SIN_PUENTE: 'sin_vinculo_valido',
  CONTRADICTORIO: 'vinculos_contradictorios',
});

const campos = (d) => ({
  documentId: d.id,
  uid: d.get('uid') ?? null,
  profileType: d.get('profileType') ?? null,
  linkedAccountId: d.get('linkedAccountId') ?? null,
});

/** Todos los documentos de `users` que dicen ser esa identidad. Solo lectura. */
const documentosDeIdentidad = async (db, id) => {
  const vistos = new Map();
  const porCampo = await db.collection('users').where('uid', '==', id).get();
  for (const d of porCampo.docs) vistos.set(d.ref.path, d);
  const porId = await db.collection('users').doc(id).get();
  if (porId.exists) vistos.set(porId.ref.path, porId);
  return [...vistos.values()];
};

/* Una identidad se resuelve una vez por ejecución: menos lecturas, mismo resultado. */
const memoria = new Map();

/**
 * De quién es esta identidad, con el motivo delante.
 * → `{ cuenta, motivo, documentos }`. `cuenta` es null salvo que se pueda afirmar.
 */
export const resolverCuenta = async (db, id) => {
  if (!econtact.esIdentidadValida(id)) return { cuenta: null, motivo: MOTIVO.ID_INVALIDO, documentos: [] };
  /*
   * Una identidad real ES su cuenta: el uid de la persona. No se consulta
   * `users` para afirmarlo, igual que antes de este arreglo, para no cambiar
   * de criterio con lo que ya se inventariaba.
   */
  if (econtact.tipoDeIdentidad(id) === 'real') return { cuenta: id, motivo: MOTIVO.DIRECTA, documentos: [] };
  if (memoria.has(id)) return memoria.get(id);

  const docs = await documentosDeIdentidad(db, id);
  const documentos = docs.map((d) => {
    const c = campos(d);
    return { ...c, cuenta: econtact.cuentaDeIdentidad(id, c) };
  });
  const cuentas = [...new Set(documentos.map((d) => d.cuenta).filter(Boolean))];

  let resultado;
  if (docs.length === 0) resultado = { cuenta: null, motivo: MOTIVO.SIN_USUARIO, documentos };
  else if (cuentas.length === 1) resultado = { cuenta: cuentas[0], motivo: MOTIVO.PUENTE, documentos };
  else if (cuentas.length > 1) resultado = { cuenta: null, motivo: MOTIVO.CONTRADICTORIO, documentos };
  else resultado = { cuenta: null, motivo: MOTIVO.SIN_PUENTE, documentos };

  memoria.set(id, resultado);
  return resultado;
};

/** La cuenta, o null. Envoltorio de `resolverCuenta` para quien no necesite el motivo. */
export const cuentaDe = async (db, id) => (await resolverCuenta(db, id)).cuenta;

/** Por qué se pudo —o no— afirmar qué cara firmó. */
export const MOTIVO_DE_CARA = Object.freeze({
  VERIFICADA: 'verificada',
  ID_INVALIDO: 'id_invalido',
  SIN_USUARIO: 'sin_documento_de_usuario',
  SIN_TIPO_VERIFICABLE: 'sin_tipo_verificable',
  CONTRADICTORIO: 'documentos_contradictorios',
});

/* Una cara se resuelve una vez por ejecución, igual que una cuenta. */
const memoriaDeCaras = new Map();

/**
 * QUÉ CARA FIRMÓ, LEÍDO DE LOS DATOS (Fase 11.x-4A).
 *
 * Esto decidía el tipo por el prefijo del identificador —`hidi_` → Perfil Weë,
 * cualquier otra cosa → Perfil Real—, y la migración lo guardaba en la ficha
 * del material junto con el identificador heredado como si fuera un Entity ID.
 * El prefijo no es la identidad: es un dato heredado. Y un identificador de
 * perfil no es un identificador de entidad del Identity Core.
 *
 * Ahora el tipo sale de los CAMPOS del documento de `users` que dice ser esa
 * identidad —`profileType`—, y solo cuenta si el resolutor canónico
 * (`cuentaDeIdentidad`) confirma que ese documento es de verdad esa identidad
 * y de qué cuenta es. Si no hay documento, si ninguno se puede verificar o si
 * se contradicen, NO hay cara: se dice por qué y no se inventa ninguna.
 *
 * → `{ tipo, cuenta, perfilUid, motivo, documentos }`. `tipo` es
 *   'REAL_PROFILE' | 'WEE_PROFILE' | null. Nunca 'PAGE': hoy ninguna Página
 *   firma material, y una Página no se deduce de nada.
 */
export const caraQueFirmo = async (db, id) => {
  const nula = (motivo, documentos = []) => ({ tipo: null, cuenta: null, perfilUid: null, motivo, documentos });
  if (!econtact.esIdentidadValida(id)) return nula(MOTIVO_DE_CARA.ID_INVALIDO);
  if (memoriaDeCaras.has(id)) return memoriaDeCaras.get(id);

  const docs = await documentosDeIdentidad(db, id);
  const documentos = docs.map((d) => {
    const c = campos(d);
    const cuenta = econtact.cuentaDeIdentidad(id, c);
    /* El tipo lo dice el CAMPO, y solo vale si el resolutor confirma el documento. */
    const tipo = !cuenta ? null
      : c.profileType === 'hidi' ? 'WEE_PROFILE'
        : (c.profileType === 'real' || c.profileType === null) ? 'REAL_PROFILE'
          : null;
    return { ...c, cuenta, tipo };
  });
  const verificados = documentos.filter((d) => d.tipo);
  const tipos = [...new Set(verificados.map((d) => d.tipo))];
  const cuentas = [...new Set(verificados.map((d) => d.cuenta))];

  let resultado;
  if (docs.length === 0) resultado = nula(MOTIVO_DE_CARA.SIN_USUARIO, documentos);
  else if (verificados.length === 0) resultado = nula(MOTIVO_DE_CARA.SIN_TIPO_VERIFICABLE, documentos);
  else if (tipos.length > 1 || cuentas.length > 1) resultado = nula(MOTIVO_DE_CARA.CONTRADICTORIO, documentos);
  else resultado = { tipo: tipos[0], cuenta: cuentas[0], perfilUid: id, motivo: MOTIVO_DE_CARA.VERIFICADA, documentos };

  memoriaDeCaras.set(id, resultado);
  return resultado;
};

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
