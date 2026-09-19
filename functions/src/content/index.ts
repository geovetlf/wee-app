import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomUUID } from 'crypto';
import {
  Asset,
  AssetKind,
  AssetVariant,
  CONTENT_CORE_CONTRACT_VERSION,
  Provenance,
  StorageRef,
  esStorageRef,
  materialEsDeLaCuenta,
  materialValido,
  retirar,
} from '../core';
import { parseStorageUrl, storageBucket } from '../engine/http';

/**
 * WEE CONTENT — LA COMPOSICIÓN DEL MATERIAL.
 *
 * ── Qué es esto y qué no ────────────────────────────────────────────────────
 *
 * El Core (`core/content/`) dice qué es un material, de quién es y cómo se
 * retira, y no sabe guardar nada. Esto es lo que lo guarda: la colección
 * `assets` de Firestore para la ficha, y el Storage de Weë para los bytes.
 * Aquí SÍ aparecen los nombres de los almacenes, porque es el único sitio
 * donde pueden aparecer.
 *
 * ── La referencia y la URL, separadas de verdad ─────────────────────────────
 *
 * En la ficha se guarda `storageRef` —proveedor, contenedor, clave— que es la
 * identidad del archivo. La URL de entrega se guarda APARTE, en `delivery`, y
 * está etiquetada como lo que es: una caché que se puede regenerar. Si mañana
 * la entrega cambia de dominio, se firma o pasa por un CDN, se reescribe
 * `delivery` y la ficha no se entera.
 *
 * ── Dos proveedores, un solo contrato ───────────────────────────────────────
 *
 *   `wee`         el Storage de Weë. Se escribe, se lee y se BORRA desde aquí
 *                 con el Admin SDK.
 *   `cloudinary`  donde viven hoy las nueve URLs de producción. Se sabe
 *                 reconocer y describir; NO se sabe borrar, porque borrar en
 *                 Cloudinary exige su API de administración con secreto, y ese
 *                 secreto no existe en Weë. Retirar un material de Cloudinary
 *                 retira la ficha y deja anotado que el objeto sigue ahí.
 *
 * ── Lo que arregla de lo que había ──────────────────────────────────────────
 *
 *   · lo generado tiene id, dueño y procedencia (antes: una URL en un array);
 *   · lo generado se puede borrar por su dueño (antes: `write: false` y nadie);
 *   · el archivo se guarda una vez y se referencia (antes: se re-subía).
 */

export const PROVEEDOR_WEE = 'wee';
export const PROVEEDOR_CLOUDINARY = 'cloudinary';

/**
 * Una clave del Storage de Weë es de una cuenta si vive bajo `users/<cuenta>/`.
 * Prefijo entero, nunca «contiene»: `users/uAnaX/` no es de `uAna`. Es la
 * frontera que separa una referencia de fiar de una URL que llegó de fuera.
 */
export const esDeLaCuenta = (ref: StorageRef, accountId: unknown): boolean =>
  ref.provider === PROVEEDOR_WEE
  && typeof accountId === 'string' && accountId.length > 0 && !/[\/\s]/.test(accountId)
  && ref.objectKey.startsWith(`users/${accountId}/`);

const db = () => getFirestore();
const assets = () => db().collection('assets');
const ahora = () => Date.now();

/* ── Del mundo a la referencia ─────────────────────────────────────────────── */

/**
 * De una URL del Storage de Weë —con token, del emulador o `gs://`— a la
 * referencia. El bucket viene en la URL; la clave es la ruta. El token NO
 * forma parte de la referencia: es de la entrega.
 */
export const referenciaDesdeUrlDeWee = (url: string): StorageRef | null => {
  const parsed = parseStorageUrl(url);
  if (!parsed) return null;
  const ref = { provider: PROVEEDOR_WEE, bucket: parsed.bucket, objectKey: parsed.path };
  return esStorageRef(ref) ? ref : null;
};

/**
 * De una URL de Cloudinary a la referencia. La clave es el `public_id` con su
 * carpeta y extensión; la versión, el `v123…` de la ruta, que Cloudinary usa
 * para invalidar caché. Las transformaciones (`c_fill,w_400`) NO son parte de
 * la clave: son una variante de entrega y se descartan.
 *
 *   https://res.cloudinary.com/<cloud>/image/upload/v1699/posts/uid/abc.jpg
 *   https://res.cloudinary.com/<cloud>/video/upload/c_limit,h_720/videos/x.mp4
 */
export const referenciaDesdeUrlDeCloudinary = (url: string): StorageRef | null => {
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(.+)$/);
  if (!m) return null;
  const [, cloud, tipo, resto] = m;
  const partes = resto.split('/').filter(Boolean);
  /* Quita transformaciones (llevan coma o son `x_y` de un solo segmento antes de la versión) y la versión. */
  let version: string | undefined;
  const clave: string[] = [];
  for (const p of partes) {
    if (/^v\d+$/.test(p) && clave.length === 0) { version = p; continue; }
    if (clave.length === 0 && /^[a-z]{1,3}_[^/]+(,[a-z]{1,3}_[^/]+)*$/.test(p)) continue;
    clave.push(p);
  }
  const ref: StorageRef = { provider: PROVEEDOR_CLOUDINARY, bucket: `${cloud}/${tipo}`, objectKey: clave.join('/'), ...(version ? { version } : {}) };
  return esStorageRef(ref) ? ref : null;
};

/** Cualquiera de las dos, o ninguna. */
export const referenciaDesdeUrl = (url: string): StorageRef | null =>
  referenciaDesdeUrlDeWee(url) ?? referenciaDesdeUrlDeCloudinary(url);

/**
 * La URL de entrega de una referencia de Cloudinary se reconstruye entera: es
 * pública por diseño de ese proveedor. La de Weë NO se puede reconstruir sin
 * el token, y por eso se guarda en `delivery` al crear el material.
 */
export const urlDeEntregaDeCloudinary = (ref: StorageRef): string | null => {
  if (ref.provider !== PROVEEDOR_CLOUDINARY || !ref.bucket) return null;
  const [cloud, tipo] = ref.bucket.split('/');
  if (!cloud || !tipo) return null;
  return `https://res.cloudinary.com/${cloud}/${tipo}/upload/${ref.version ? ref.version + '/' : ''}${ref.objectKey}`;
};

/* ── La ficha guardada ─────────────────────────────────────────────────────── */

/**
 * Lo que se guarda: el material del Core más la entrega, que es caché.
 *
 * `delivery.url` es una URL con token de descarga. El token es una capacidad
 * al portador —quien lo tenga, lee— y no caduca: es como funciona el Storage
 * de Firebase. Lo que impide que sea público es que la ficha solo la lee su
 * dueño (`firestore.rules`) y el objeto solo lo lee su dueño (`storage.rules`).
 * Una entrega con caducidad de verdad exige URLs firmadas, que necesitan un
 * permiso de IAM que hoy no está concedido: queda como costura, y se dice.
 */
export interface AssetDoc extends Asset {
  delivery?: { url: string; kind: 'bearer_token' | 'public' };
  /** Solo cuando se retiró y el objeto NO se pudo borrar: el proveedor no lo permite desde aquí. */
  pendingPhysicalDeletion?: boolean;
}

/* Firestore no admite `undefined`: se quitan las claves vacías antes de escribir. El tipo no cambia. */
const limpiar = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined)) as T;

const tipoPorMime = (mime: string | undefined, porDefecto: AssetKind): AssetKind => {
  if (!mime) return porDefecto;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'model/gltf-binary' || mime === 'model/gltf+json' || mime === 'model/obj') return 'model3d';
  if (mime.startsWith('text/')) return 'text';
  if (mime === 'application/pdf' || mime.startsWith('application/')) return 'document';
  return porDefecto;
};

export interface NuevoMaterialDesdeUrl {
  /** La cuenta. Del Principal autenticado; nunca del cliente. */
  ownerAccountId: string;
  url: string;
  kind: AssetKind;
  provenance: Provenance;
  name?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  createdByEntityId?: string;
  createdByEntityType?: Asset['createdByEntityType'];
  /** Libre y acotado: la experiencia de la que salió, y poco más. Nunca contenido ni credenciales. */
  metadata?: Asset['metadata'];
}

/**
 * CREAR LA FICHA DE UN ARCHIVO QUE YA ESTÁ EN UN ALMACÉN.
 *
 * Es lo que le faltaba a cada resultado de IA: el archivo ya existía en
 * `users/{uid}/ai-generations/…`; lo que no existía era su identidad. Aquí no
 * se sube nada ni se copia nada — se REFERENCIA lo que hay y se le da dueño.
 *
 * Para el Storage de Weë se lee la metadata del objeto (tamaño, tipo) con una
 * sola llamada; para Cloudinary se guarda lo que la URL dice y nada más.
 *
 * Devuelve `null` si la URL no es de ningún almacén conocido: un resultado de
 * un proveedor de prueba, o una URL ajena, no se convierte en material.
 */
export const crearMaterialDesdeUrl = async (datos: NuevoMaterialDesdeUrl): Promise<AssetDoc | null> => {
  const ref = referenciaDesdeUrl(datos.url);
  if (!ref) return null;

  /*
   * UNA FICHA `wee` SOLO PUEDE APUNTAR DENTRO DE SU PROPIA CUENTA. La clave del
   * objeto se convierte más tarde en autoridad para borrar (`retirarMaterial`),
   * así que nunca se acepta una referencia al Storage de Weë fuera de
   * `users/<ownerAccountId>/`: no se crea la ficha. Hoy todas las URLs de este
   * camino las produce el motor bajo ese prefijo; esto garantiza que siga así
   * venga la URL de donde venga.
   */
  if (ref.provider === PROVEEDOR_WEE && !esDeLaCuenta(ref, datos.ownerAccountId)) {
    console.warn('Content: referencia fuera del namespace de la cuenta; no se crea la ficha', ref.objectKey);
    return null;
  }

  let mimeType = datos.mimeType;
  let bytes: number | undefined;
  if (ref.provider === PROVEEDOR_WEE) {
    try {
      const [meta] = await storageBucket().file(ref.objectKey).getMetadata();
      mimeType = mimeType ?? (typeof meta.contentType === 'string' ? meta.contentType : undefined);
      bytes = typeof meta.size === 'string' ? Number(meta.size) : typeof meta.size === 'number' ? meta.size : undefined;
    } catch (error) {
      /* Sin metadata no hay material: un objeto que no se puede leer no está listo. */
      console.warn('Content: no se pudo leer la metadata del objeto', ref.objectKey, error);
      return null;
    }
  }

  const at = ahora();
  const assetId = `asset_${randomUUID().replace(/-/g, '')}`;
  const delivery: AssetDoc['delivery'] = { url: datos.url, kind: ref.provider === PROVEEDOR_CLOUDINARY ? 'public' : 'bearer_token' };
  const bruto: AssetDoc = {
    contract: CONTENT_CORE_CONTRACT_VERSION,
    assetId,
    ownerAccountId: datos.ownerAccountId,
    createdByEntityId: datos.createdByEntityId,
    createdByEntityType: datos.createdByEntityType,
    kind: tipoPorMime(mimeType, datos.kind),
    status: 'ready',
    storageRef: ref,
    mimeType,
    bytes: Number.isSafeInteger(bytes) ? bytes : undefined,
    width: datos.width,
    height: datos.height,
    durationSec: datos.durationSec,
    provenance: limpiar({ ...datos.provenance }),
    name: datos.name,
    metadata: datos.metadata,
    createdAt: at,
    updatedAt: at,
    delivery,
  };
  const doc = limpiar(bruto);
  if (!materialValido(doc)) {
    console.error('Content: el material construido no cumple el contrato', assetId);
    return null;
  }
  await assets().doc(assetId).set(doc);
  return doc;
};

/** La ficha, o nada. Nunca lanza por un id que no existe. */
export const leerMaterial = async (assetId: string): Promise<AssetDoc | null> => {
  if (typeof assetId !== 'string' || !/^asset_[a-f0-9]{32}$/.test(assetId)) return null;
  const snap = await assets().doc(assetId).get();
  return snap.exists ? (snap.data() as AssetDoc) : null;
};

/* ── Retirar ───────────────────────────────────────────────────────────────── */

export type ResultadoDeRetirada =
  | { status: 'retirado'; asset: AssetDoc; objetosBorrados: number; pendientes: number }
  | { status: 'ya_retirado' }
  | { status: 'no_es_tuyo' }
  | { status: 'no_existe' };

/**
 * RETIRAR UN MATERIAL. La única forma de borrar lo generado, y por fin existe.
 *
 * El orden importa y es a propósito: primero se marca la ficha como retirada
 * y DESPUÉS se borran los objetos. Si el proceso muere entre medias, queda una
 * ficha `deleted` con `pendingPhysicalDeletion`, que es recuperable; al revés
 * quedaría un objeto borrado con una ficha `ready`, que es una mentira.
 *
 * La propiedad se comprueba contra la CUENTA del Principal, leída de la
 * ficha. Un `assetId` que llega de fuera no prueba nada por sí mismo.
 */
export const retirarMaterial = async (accountId: string, assetId: string): Promise<ResultadoDeRetirada> => {
  const doc = await leerMaterial(assetId);
  if (!doc) return { status: 'no_existe' };
  if (!materialEsDeLaCuenta(doc, accountId)) return { status: 'no_es_tuyo' };

  const decision = retirar(doc, ahora());
  if (!decision) return { status: 'ya_retirado' };

  /*
   * Solo se borra físicamente lo que es de Weë Y vive bajo la propia cuenta. Una
   * referencia que no cumpla las dos cosas se retira de la ficha pero queda
   * anotada como pendiente: antes que borrar el objeto equivocado, no borrar.
   */
  const paraBorrar = decision.borrar.filter((r) => r.provider === PROVEEDOR_WEE && esDeLaCuenta(r, doc.ownerAccountId));
  const pendientes = decision.borrar.length - paraBorrar.length;

  const retirado: AssetDoc = limpiar({
    ...doc,
    ...decision.asset,
    delivery: undefined,
    ...(pendientes > 0 ? { pendingPhysicalDeletion: true } : {}),
  });
  await assets().doc(assetId).set(retirado);

  let objetosBorrados = 0;
  for (const r of paraBorrar) {
    try {
      await storageBucket().file(r.objectKey).delete({ ignoreNotFound: true });
      objetosBorrados++;
    } catch (error) {
      console.error('Content: no se pudo borrar el objeto', r.objectKey, error);
      await assets().doc(assetId).set({ pendingPhysicalDeletion: true }, { merge: true });
    }
  }
  return { status: 'retirado', asset: retirado, objetosBorrados, pendientes };
};

/**
 * El callable. Lo único que trae el cliente es QUÉ; QUIÉN lo pone la sesión.
 */
export const deleteAsset = onCall({ region: 'us-central1', timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const assetId = String((request.data || {}).assetId || '');
  const r = await retirarMaterial(request.auth.uid, assetId);
  if (r.status === 'no_existe' || r.status === 'no_es_tuyo') {
    /* De un material ajeno no se dice ni que exista: la misma regla que el Job Engine. */
    throw new HttpsError('not-found', 'No encontramos esa creación.');
  }
  if (r.status === 'ya_retirado') return { assetId, status: 'deleted', already: true };
  return { assetId, status: 'deleted', already: false, pendingPhysicalDeletion: r.pendientes > 0 };
});

/* ── Variantes: la costura, sin procesado todavía ──────────────────────────── */

/**
 * Anotar una variante que ya existe en un almacén. NO la genera: generarla es
 * una tarea del Job Engine (`media.thumbnail`), que la Fase 11 deja preparada
 * y no ejecuta. Esto es solo cómo se escribe cuando exista.
 */
export const anotarVariante = async (accountId: string, assetId: string, variante: AssetVariant): Promise<boolean> => {
  const doc = await leerMaterial(assetId);
  if (!doc || !materialEsDeLaCuenta(doc, accountId) || doc.status === 'deleted') return false;
  if (!esStorageRef(variante.storageRef)) return false;
  const variants = [...(doc.variants ?? []).filter((v) => v.kind !== variante.kind), variante];
  await assets().doc(assetId).set({ variants, updatedAt: ahora() }, { merge: true });
  return true;
};

/** Para las pruebas y el inventario: la marca de tiempo de Firestore, en milisegundos. */
export const milisegundos = (v: unknown): number | undefined =>
  v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : undefined;
