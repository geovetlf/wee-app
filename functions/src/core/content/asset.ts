import { CapabilityId } from '../capability';
import { CONTENT_CORE_CONTRACT_VERSION } from '../contracts';
import { ActualCost } from '../cost';
import { OwnedByAccount } from '../identity';

/**
 * WEE CONTENT CORE — EL MATERIAL.
 *
 * ── El problema, medido en producción ───────────────────────────────────────
 *
 * Un archivo en Weë no tiene identidad. Es una cadena de texto —una URL— dentro
 * de otro documento: `creatorJobs.results[].url`, `posts.imageUrls[]`,
 * `comments.imageUrl`. Con eso:
 *
 *   · no se puede listar «todas mis imágenes»: hay que abrir cada trabajo;
 *   · no se puede reutilizar: publicar un resultado lo DESCARGA y lo vuelve a
 *     subir a otro sitio, y el original queda huérfano para siempre;
 *   · no se puede borrar: la regla de Storage dice `write: false` y ninguna
 *     función lo hace por la persona;
 *   · no tiene dueño escrito: la carpeta es de la cuenta y el documento que lo
 *     usa dice la cara activa, y las dos cosas no coinciden;
 *   · y es público por defecto: lo que la persona SUBE está protegido y lo que
 *     Weë GENERA con ello es de lectura libre.
 *
 * Esto es la forma que arregla las cinco cosas a la vez. Con id propio, con
 * dueño delante, con el archivo referenciado y no pegado, y con un ciclo de
 * vida que incluye borrarse.
 *
 * ── Tres cosas que se parecen y no son lo mismo ─────────────────────────────
 *
 *   MATERIAL (esto)    un archivo: bytes en un almacén, con id, dueño y estado.
 *   CONTENIDO          una pieza que se puede publicar: texto + materiales.
 *   PUBLICACIÓN        el acto de poner un contenido en un sitio, con una cara.
 *
 * Un material puede existir sin contenido —lo que se generó y no se usó— y un
 * contenido sin publicación —un borrador—. Y el MISMO material puede estar en
 * dos contenidos y en dos proyectos sin que existan dos archivos. Esa es la
 * frase que resume el módulo: los bytes se guardan UNA vez.
 *
 * ── De quién es: la cuenta, y esto no se repite bastante ────────────────────
 *
 * `ownerAccountId`. Quién lo creó y desde qué cara es atribución, y cambiar la
 * cara no lo mueve de dueño. Ver `identity.ts`, que lo dice entero.
 */

/* ── Qué es ─────────────────────────────────────────────────────────────── */

/**
 * De qué clase es un material. Es el vocabulario que Weë Brain ya usa para los
 * adjuntos, y por eso vive aquí y se importa desde allí.
 *
 * Deliberadamente corto: un PDF es un `document` con su `mimeType`; una voz es
 * `audio`; una miniatura NO es un material, es una VARIANTE de uno. Añadir un
 * tipo aquí es un cambio menor del contrato, y hay una prueba que lo vigila.
 */
export type AssetKind = 'text' | 'image' | 'video' | 'audio' | 'document' | 'model3d' | 'world';

/*
 * 'world' (2026-10-05): un mundo 3D explorable. Es un material más —con dueño, procedencia y ciclo de vida— cuyo
 * objeto es el archivo del mundo y cuyas variantes son su vista previa. Aditivo: la versión del contrato NO sube,
 * porque `esAsset` compara la versión por igualdad y los materiales ya guardados llevan la actual.
 */
export const TIPOS_DE_MATERIAL: readonly AssetKind[] = Object.freeze([
  'text', 'image', 'video', 'audio', 'document', 'model3d', 'world',
] as const);

export const esTipoDeMaterial = (v: unknown): v is AssetKind =>
  typeof v === 'string' && (TIPOS_DE_MATERIAL as readonly string[]).includes(v);

/* ── Dónde vive ─────────────────────────────────────────────────────────── */

/**
 * LA REFERENCIA AL ALMACÉN. Esto es la identidad del archivo; la URL no lo es.
 *
 * Una URL de entrega cambia: caduca, se firma, cambia de dominio, pasa por un
 * CDN. Si la URL fuera la identidad, cada uno de esos cambios rompería todo lo
 * que la usa. Lo que no cambia es DÓNDE está el objeto: en qué proveedor, en
 * qué contenedor y con qué clave. Eso se guarda; la URL se calcula.
 *
 * `provider` es texto opaco a propósito: el Core no conoce ningún proveedor de
 * almacenamiento y no va a conocerlo. Quien resuelva una referencia a una URL
 * es un adaptador de fuera, uno por proveedor, y ese es el único sitio donde
 * un nombre de proveedor puede aparecer.
 */
export interface StorageRef {
  provider: string;
  bucket?: string;
  objectKey: string;
  /** Cuando el almacén versiona objetos. Opcional: la mayoría no lo hace. */
  version?: string;
}

export const FORMA_DE_PROVEEDOR_DE_ALMACEN = /^[a-z][a-z0-9_-]{1,31}$/;

export const esStorageRef = (v: unknown): v is StorageRef => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  if (typeof r.provider !== 'string' || !FORMA_DE_PROVEEDOR_DE_ALMACEN.test(r.provider)) return false;
  if (typeof r.objectKey !== 'string' || !r.objectKey || r.objectKey.length > 1024) return false;
  if (r.objectKey.includes('..') || r.objectKey.startsWith('/')) return false;
  if (r.bucket !== undefined && (typeof r.bucket !== 'string' || !r.bucket)) return false;
  if (r.version !== undefined && (typeof r.version !== 'string' || !r.version)) return false;
  return true;
};

/**
 * Dos referencias son el mismo objeto si apuntan al mismo sitio. Escrito una
 * vez para que la comparación no dependa de en qué orden alguien escribió las
 * claves ni de si puso el bucket por defecto o no.
 */
export const mismaReferencia = (a: StorageRef, b: StorageRef): boolean =>
  a.provider === b.provider && (a.bucket ?? '') === (b.bucket ?? '')
  && a.objectKey === b.objectKey && (a.version ?? '') === (b.version ?? '');

/* ── Sus derivados ──────────────────────────────────────────────────────── */

/**
 * UNA VARIANTE: un derivado del mismo material. La miniatura de una imagen, el
 * póster de un vídeo, la versión transcodificada.
 *
 * No es otro material: no tiene dueño propio ni id propio, y se borra con el
 * original. Lo que hoy se hace transformando la URL de Cloudinary al vuelo
 * —`c_fill,w_400`— y que por eso no existe para nada que viva en otro almacén,
 * aquí es un objeto más con su propia referencia.
 */
export type VariantKind = 'thumbnail' | 'poster' | 'preview' | 'transcoded';

export interface AssetVariant {
  kind: VariantKind;
  storageRef: StorageRef;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

/* ── De dónde salió ─────────────────────────────────────────────────────── */

/**
 * LA PROCEDENCIA. Lo que hoy no se guarda en ninguna parte.
 *
 * Hay CONTABILIDAD —`aiGenerations` sabe quién, con qué y cuánto costó cada
 * llamada— pero no hay LINAJE: nadie sabe de qué material salió qué material,
 * y el puente entre la fila contable y el archivo vive solo dentro del trabajo
 * y desaparece al publicar.
 *
 * Esto es ese puente, escrito en el material. Con `jobId`, `stepId` y
 * `generationId` se vuelve de un archivo a la operación que lo produjo, al
 * trabajo que la ejecutó y al asiento que la cobró. Con `sourceAssetIds` se
 * vuelve al material del que partió. Ninguno de los dos existía.
 *
 * Y lo que NO va aquí: el coste real, que es del libro (`ActualCost` es la
 * cifra que ya devolvió el Gateway, copiada como dato de procedencia, no un
 * segundo libro), ni los Credits, que son del Financial Core.
 */
export interface Provenance {
  /* La operación de IA, cuando la hubo. Todo opcional: un archivo subido a mano no tiene nada de esto. */
  generationId?: string;
  jobId?: string;
  runId?: string;
  stepId?: string;
  requestId?: string;
  operationId?: string;
  traceId?: string;
  capability?: CapabilityId;
  provider?: string;
  model?: string;
  cost?: ActualCost;
  /** Material del que partió este material. Es lo que convierte una carpeta en una historia. */
  sourceAssetIds?: readonly string[];
  createdAt: number;
}

/* ── Sus derechos, cuando los impone una licencia ajena ─────────────────── */

/**
 * LOS DERECHOS DEL MATERIAL cuando los impone un tercero: la licencia del modelo que lo generó y los términos de quien
 * lo sirvió. Se copian del GOBIERNO del modelo (`ModelSpec.gobierno`) en el momento de generarlo —lo que valía
 * entonces—, y viajan con el material para que cualquier experiencia que lo reutilice sepa qué puede hacer con él.
 * Opcional y aditivo (2026-10-05): un material sin esto es uno sin licencia ajena declarada.
 */
export interface DerechosDelMaterial {
  revision: 'APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED_GLOBAL';
  usoComercial: 'ALLOWED' | 'RESTRICTED' | 'UNCLEAR' | 'NOT_ALLOWED';
  atribucion: boolean | 'UNKNOWN';
  licencias: readonly { nombre: string; url: string }[];
  /**
   * Dónde la licencia NO deja usarlo ni MOSTRARLO (ISO 3166-1 alfa-2, o un grupo como «EU»), copiado de las reglas
   * territoriales del modelo. Viaja con el material porque la restricción no acaba al generarlo: quien lo enseñe o lo
   * reutilice tiene que poder saberlo. Ausente = sin restricción territorial declarada.
   */
  jurisdiccionesBloqueadas?: readonly string[];
}

export const derechosValidos = (d: unknown): d is DerechosDelMaterial => {
  if (!d || typeof d !== 'object') return false;
  const x = d as Record<string, unknown>;
  return ['APPROVED', 'REVIEW_REQUIRED', 'BLOCKED_GLOBAL'].includes(x.revision as string)
    && ['ALLOWED', 'RESTRICTED', 'UNCLEAR', 'NOT_ALLOWED'].includes(x.usoComercial as string)
    && (typeof x.atribucion === 'boolean' || x.atribucion === 'UNKNOWN')
    && Array.isArray(x.licencias) && x.licencias.length <= 10
    && x.licencias.every((l) => !!l && typeof l === 'object' && typeof (l as { nombre?: unknown }).nombre === 'string'
      && typeof (l as { url?: unknown }).url === 'string' && /^https:\/\//.test((l as { url: string }).url))
    && (x.jurisdiccionesBloqueadas === undefined || (Array.isArray(x.jurisdiccionesBloqueadas) && x.jurisdiccionesBloqueadas.length <= 64
      && x.jurisdiccionesBloqueadas.every((j) => typeof j === 'string' && /^[A-Z]{2}$/.test(j))));
};

/* ── Su ciclo de vida ───────────────────────────────────────────────────── */

/**
 * EL ESTADO DEL MATERIAL. Del archivo, no de su publicación.
 *
 *   uploading    los bytes están llegando; todavía no hay objeto completo
 *   processing   el objeto está; se están haciendo sus derivados
 *   ready        se puede usar
 *   failed       no llegó a estar: subida o procesado que no terminó
 *   deleted      su dueño lo retiró; la ficha se queda, el objeto no
 *
 * Fíjate en lo que NO hay: `published`. Publicar es de la PUBLICACIÓN, y un
 * material `ready` puede estar en cero publicaciones o en diez. Mezclar los
 * dos ciclos es como se acaba con un archivo que «no se puede borrar porque
 * está publicado» cuando lo que había que retirar era la publicación.
 */
export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';

export const ESTADOS_DE_MATERIAL: readonly AssetStatus[] = Object.freeze([
  'uploading', 'processing', 'ready', 'failed', 'deleted',
] as const);

export const ESTADOS_FINALES_DE_MATERIAL: readonly AssetStatus[] = Object.freeze(['deleted'] as const);

/**
 * Qué puede seguir a qué. `deleted` no lleva a nada: un borrado no se deshace
 * volviendo el estado atrás, porque el objeto ya no está.
 */
export const TRANSICIONES_DE_MATERIAL: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = Object.freeze({
  uploading: Object.freeze(['processing', 'ready', 'failed', 'deleted'] as AssetStatus[]),
  processing: Object.freeze(['ready', 'failed', 'deleted'] as AssetStatus[]),
  ready: Object.freeze(['processing', 'deleted'] as AssetStatus[]),
  failed: Object.freeze(['deleted'] as AssetStatus[]),
  deleted: Object.freeze([] as AssetStatus[]),
});

export const puedePasarA = (de: AssetStatus, a: AssetStatus): boolean =>
  (TRANSICIONES_DE_MATERIAL[de] ?? []).includes(a);

/* ── El material entero ─────────────────────────────────────────────────── */

/**
 * UN MATERIAL.
 *
 * Plano a propósito. La primera versión de este contrato anidaba `versions[]`
 * dentro del material, y eso obligaba a leer el documento entero para saber
 * cuál era la buena y hacía imposible consultar por ancho, tipo o estado. Aquí
 * las propiedades del archivo van arriba, y una versión nueva es OTRO material
 * que apunta a su anterior por `previousVersionId` y lleva a su origen en
 * `provenance.sourceAssetIds`. «Mejora esto» sigue sin destruir lo anterior;
 * solo que ahora cada versión se puede listar, publicar y borrar por separado.
 *
 * `storageRef` es opcional por una sola razón: un material de texto puede
 * vivir en `content` sin objeto en ningún almacén. Para todo lo demás, sin
 * referencia no hay material.
 */
export interface Asset extends OwnedByAccount {
  contract: typeof CONTENT_CORE_CONTRACT_VERSION;
  assetId: string;
  kind: AssetKind;
  status: AssetStatus;
  /** Dónde están los bytes. La identidad del archivo; la URL se calcula de aquí. */
  storageRef?: StorageRef;
  /** Para texto, el contenido puede ir aquí mismo. Nunca para binarios. */
  content?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  variants?: readonly AssetVariant[];
  provenance: Provenance;
  /** La versión anterior de este mismo material, si es una mejora. */
  previousVersionId?: string;
  name?: string;
  tags?: readonly string[];
  /** Libre y acotado. Lo que un proveedor devolvió y no cabe en ningún campo con nombre. */
  metadata?: Readonly<Record<string, string | number | boolean>>;
  /** La licencia ajena que lo acompaña, si la hay (ver `DerechosDelMaterial`). */
  derechos?: DerechosDelMaterial;
  createdAt: number;
  updatedAt: number;
  /** Solo cuando `status` es `deleted`. Se guarda la ficha; el objeto ya no está. */
  deletedAt?: number;
  /**
   * MC-9 · HASTA CUÁNDO VALE EL PERMISO DE SUBIDA QUE SE CONCEDIÓ.
   *
   * Un material en `uploading` está esperando bytes que escribe otro —el
   * cliente, directamente contra el proveedor—, y si esa escritura no llega
   * nunca, nada lo saca de ahí. Este número es la ÚNICA autoridad para decir
   * que ya no va a llegar: no la antigüedad del material, que no dice nada
   * sobre cuándo se concedió el último permiso.
   *
   * Se guarda aquí y no en un registro aparte porque el permiso no tiene vida
   * propia: existe para que este material se complete, y muere con él. Ausente
   * significa «no se sabe», y no se sabe **protege**.
   */
  uploadExpiresAt?: number;
  /** MC-9 · Por qué un material quedó en `failed`. Un literal del Core, nunca una frase. */
  failedReason?: string;
  failedAt?: number;
}

export const FORMA_DE_ID_DE_MATERIAL = /^[A-Za-z0-9_-]{4,128}$/;
export const FORMA_DE_MIME = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
/** Un objeto de Weë no pasa de esto. Es un tope de contrato; el de producto puede ser menor. */
export const MAXIMO_DE_BYTES_DE_MATERIAL = 2 * 1024 * 1024 * 1024;

/**
 * ¿Está bien formado este material?
 *
 * Incluye lo que da sentido a los estados: un material `ready` que no es texto
 * TIENE que tener referencia al almacén, y uno `deleted` tiene que decir
 * cuándo. Un material que dice estar listo sin bytes detrás es justo la forma
 * de mentira que este contrato existe para impedir.
 */
export const materialValido = (a: Asset | undefined): boolean => {
  if (!a || typeof a !== 'object') return false;
  if (a.contract !== CONTENT_CORE_CONTRACT_VERSION) return false;
  if (typeof a.assetId !== 'string' || !FORMA_DE_ID_DE_MATERIAL.test(a.assetId)) return false;
  if (typeof a.ownerAccountId !== 'string' || !a.ownerAccountId) return false;
  if (!esTipoDeMaterial(a.kind)) return false;
  if (!(ESTADOS_DE_MATERIAL as readonly string[]).includes(a.status)) return false;
  if (a.storageRef !== undefined && !esStorageRef(a.storageRef)) return false;
  if (a.kind !== 'text' && a.status === 'ready' && !a.storageRef) return false;
  if (a.status === 'deleted' && !Number.isFinite(a.deletedAt)) return false;
  if (a.status !== 'deleted' && a.deletedAt !== undefined) return false;
  if (a.mimeType !== undefined && !FORMA_DE_MIME.test(a.mimeType)) return false;
  if (a.bytes !== undefined && (!Number.isSafeInteger(a.bytes) || a.bytes < 0 || a.bytes > MAXIMO_DE_BYTES_DE_MATERIAL)) return false;
  if (a.variants !== undefined && !a.variants.every((v) => esStorageRef(v.storageRef))) return false;
  if (!a.provenance || !Number.isFinite(a.provenance.createdAt)) return false;
  if (a.derechos !== undefined && !derechosValidos(a.derechos)) return false;
  if (a.previousVersionId !== undefined && a.previousVersionId === a.assetId) return false;
  return Number.isFinite(a.createdAt) && Number.isFinite(a.updatedAt);
};

/**
 * ¿Es de esta cuenta?
 *
 * Comprobación estructural, como todas las del Core: sobre datos ya leídos,
 * contra una cuenta que vino de un Principal autenticado. Un `ownerAccountId`
 * que llega de fuera no prueba nada; esta función es lo que se aplica DESPUÉS
 * de haber leído el material de donde se guarde.
 */
export const materialEsDeLaCuenta = (a: Asset | undefined, accountId: string | undefined): boolean =>
  !!a && typeof accountId === 'string' && accountId.length > 0 && a.ownerAccountId === accountId;

/**
 * Retirar un material: la decisión, no el borrado.
 *
 * Devuelve el material como queda —`deleted`, con su fecha— y la lista de
 * referencias al almacén que hay que borrar de verdad: la suya y las de sus
 * variantes. Quien tenga el almacén las borra; esto solo dice cuáles. Y si el
 * material ya estaba retirado, devuelve `undefined`: retirar dos veces no es
 * un error, es un no-op, y hay que poder distinguirlo.
 */
export const retirar = (a: Asset, at: number): { asset: Asset; borrar: readonly StorageRef[] } | undefined => {
  if (a.status === 'deleted') return undefined;
  const borrar: StorageRef[] = [];
  if (a.storageRef) borrar.push(a.storageRef);
  for (const v of a.variants ?? []) borrar.push(v.storageRef);
  return {
    asset: { ...a, status: 'deleted', deletedAt: at, updatedAt: at },
    borrar,
  };
};

/**
 * La cadena de material de la que desciende este.
 *
 * Recorre hacia atrás con un visto para no caerse si alguien cierra un ciclo
 * —que no debería poder pasar, pero la procedencia la escriben varios sitios—.
 */
export const cadenaDeOrigen = (
  assetId: string,
  buscar: (id: string) => Asset | undefined,
  vistos: Set<string> = new Set(),
): readonly string[] => {
  if (vistos.has(assetId)) return [];
  vistos.add(assetId);
  const origenes = buscar(assetId)?.provenance?.sourceAssetIds ?? [];
  return origenes.flatMap((id) => [id, ...cadenaDeOrigen(id, buscar, vistos)]);
};
