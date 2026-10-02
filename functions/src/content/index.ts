import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomUUID } from 'crypto';
import {
  Asset,
  AssetKind,
  AssetVariant,
  CONTENT_CORE_CONTRACT_VERSION,
  FORMA_DE_ID_DE_MATERIAL,
  Provenance,
  StorageRef,
  RAIZ_DE_CUENTAS,
  claveEsDeLaCuenta,
  esStorageRef,
  materialEsDeLaCuenta,
  materialValido,
  puedePasarA,
  retirar,
} from '../core';
import { parseStorageUrl, storageBucket } from '../engine/http';
import { sanitizeForLog } from '../engine/sanitize';

/**
 * ¿ESTE FALLO DE `create` DICE QUE EL DOCUMENTO YA EXISTÍA? (cierre post-auditoría 2026-10-01,
 * server/errores-tragados). Solo `ALREADY_EXISTS` —el código 6 de gRPC con el que contesta Firestore,
 * o su nombre—. Antes cualquier error se trataba como «ya existía»: un permiso denegado o una caída de
 * red se leían como un duplicado y se callaban.
 */
export const yaExistia = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
};

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
  /**
   * LA IDENTIDAD, CUANDO QUIEN LLAMA LA CALCULA.
   *
   * Sin esto se sortea una, que es lo correcto cuando cada llamada es un
   * material nuevo. No lo es cuando la misma creación puede llegar dos veces
   * —un aviso de proveedor que se repite, una reconciliación que coincide con
   * él—: ahí hace falta que las dos llegadas pidan el MISMO material, o quedan
   * dos fichas del mismo archivo.
   *
   * Con `assetId` la ficha se crea SOLO SI NO EXISTE, y la segunda llegada
   * recibe la que ya estaba en vez de pisarla.
   */
  assetId?: string;
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
  /* Calculada por quien llama, o sorteada. Si viene mal formada no se inventa otra: no se crea nada. */
  if (datos.assetId !== undefined && !FORMA_DE_ID_DE_MATERIAL.test(datos.assetId)) {
    console.warn('Content: identidad de material mal formada; no se crea la ficha');
    return null;
  }
  const assetId = datos.assetId ?? `asset_${randomUUID().replace(/-/g, '')}`;
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
  /*
   * CON IDENTIDAD CALCULADA, SE CREA SOLO SI NO ESTÁ.
   *
   * `create` falla cuando el documento ya existe, y eso es justo lo que se
   * quiere: la segunda llegada del mismo desenlace no pisa la ficha que dejó la
   * primera —ni su procedencia, ni su fecha—, se la encuentra. Sin identidad
   * calculada el id es único por construcción y `set` es equivalente.
   */
  if (datos.assetId) {
    try {
      await assets().doc(assetId).create(doc);
      return doc;
    } catch (error) {
      /* Solo «ya existía» es «ya existía». Cualquier otro fallo es un fallo: se registra y no se crea nada. */
      if (!yaExistia(error)) {
        console.error('Content: no se pudo crear la ficha del material', assetId, sanitizeForLog(error, 300));
        return null;
      }
      const yaEstaba = await leerMaterial(assetId);
      /* Existe pero es de otra cuenta: no se devuelve. Un identificador no da acceso a nada. */
      return yaEstaba && yaEstaba.ownerAccountId === datos.ownerAccountId ? yaEstaba : null;
    }
  }
  await assets().doc(assetId).set(doc);
  return doc;
};

/* ── Un material cuyos bytes todavía no han llegado ───────────────────────── */

export interface NuevoMaterialParaSubida {
  /** La cuenta. Del Principal autenticado; nunca del cliente. */
  ownerAccountId: string;
  /** La identidad, SIEMPRE calculada por quien llama: es lo que hace idempotente repetir. */
  assetId: string;
  kind: AssetKind;
  /** Dónde VAN a estar los bytes. La deriva el servidor; nunca llega de un cliente. */
  storageRef: StorageRef;
  provenance: Provenance;
  /** Lo que se ESPERA que sea. Todavía no se ha visto un solo byte. */
  mimeType?: string;
  name?: string;
  createdByEntityId?: string;
  createdByEntityType?: Asset['createdByEntityType'];
  metadata?: Asset['metadata'];
}

export type ResultadoDeCreacionParaSubida =
  | { status: 'creado'; material: AssetDoc }
  /* Ya estaba: la misma intención llegó dos veces. No se pisa nada. */
  | { status: 'ya_estaba'; material: AssetDoc }
  | { status: 'invalido' }
  /* Existe, pero no es de esta cuenta. Un identificador no da acceso a nada. */
  | { status: 'no_es_tuyo' };

/**
 * CREAR LA FICHA DE UN MATERIAL **ANTES** DE QUE EXISTAN SUS BYTES.
 *
 * ── Por qué hacía falta otra puerta ─────────────────────────────────────────
 *
 * `crearMaterialDesdeUrl` referencia un archivo que YA está: pide una URL, lee
 * su metadata y nace `ready`. Es exactamente lo que necesita un resultado de
 * IA, y exactamente lo que no sirve para una subida directa, donde el orden es
 * el contrario — primero hay que decirle a alguien dónde escribir, y los bytes
 * llegan después.
 *
 * Esto es esa otra puerta, y es deliberadamente pequeña: el contrato de la Fase
 * 11 ya contemplaba este caso —`uploading` existe, `uploading → ready` está
 * permitido y un material sin bytes es válido—, solo que ningún camino lo
 * producía. Aquí no se inventa ningún estado ni se cambia ninguna regla: se usa
 * la que ya estaba escrita y no se había usado nunca.
 *
 * Nace SIN `delivery`, y eso es correcto en los dos sentidos: todavía no hay
 * nada que entregar, y para un almacén que firma entregas temporales no existe
 * una URL permanente que guardar.
 *
 * ── Idempotente por identidad calculada ─────────────────────────────────────
 *
 * El `assetId` lo calcula quien llama a partir de su propia clave de operación,
 * así que la misma intención que llega dos veces pide el MISMO material y se
 * encuentra el que ya estaba, con su fecha y su procedencia intactas. Es el
 * mismo mecanismo que ya usa la creación desde URL, por la misma razón.
 */
export const crearMaterialParaSubida = async (datos: NuevoMaterialParaSubida): Promise<ResultadoDeCreacionParaSubida> => {
  if (!FORMA_DE_ID_DE_MATERIAL.test(datos.assetId ?? '')) return { status: 'invalido' };
  if (!esStorageRef(datos.storageRef)) return { status: 'invalido' };
  if (typeof datos.ownerAccountId !== 'string' || !datos.ownerAccountId) return { status: 'invalido' };

  /*
   * UNA FICHA NO PUEDE APUNTAR FUERA DE SU CUENTA. Dos reglas, una por mundo:
   * la del Storage de Weë, que ya existía, y la de Media Cloud, cuya clave
   * empieza por la cuenta. Las dos se comprueban por prefijo ENTERO.
   */
  const ref = datos.storageRef;
  if (ref.provider === PROVEEDOR_WEE && !esDeLaCuenta(ref, datos.ownerAccountId)) return { status: 'invalido' };
  if (ref.objectKey.startsWith(`${RAIZ_DE_CUENTAS}/`) && !claveEsDeLaCuenta(ref.objectKey, datos.ownerAccountId)) return { status: 'invalido' };

  const at = ahora();
  const doc = limpiar<AssetDoc>({
    contract: CONTENT_CORE_CONTRACT_VERSION,
    assetId: datos.assetId,
    ownerAccountId: datos.ownerAccountId,
    createdByEntityId: datos.createdByEntityId,
    createdByEntityType: datos.createdByEntityType,
    kind: tipoPorMime(datos.mimeType, datos.kind),
    /* Los bytes vienen de camino. No hay `bytes`, no hay `delivery`, no hay nada que entregar. */
    status: 'uploading',
    storageRef: ref,
    mimeType: datos.mimeType,
    provenance: limpiar({ ...datos.provenance }),
    name: datos.name,
    metadata: datos.metadata,
    createdAt: at,
    updatedAt: at,
  });
  if (!materialValido(doc)) return { status: 'invalido' };

  try {
    await assets().doc(datos.assetId).create(doc);
    return { status: 'creado', material: doc };
  } catch (error) {
    /*
     * Solo «ya existía» se resuelve leyendo la que estaba. Otro fallo (red, permisos, cuota) no es «inválido»
     * ni «ya estaba»: se registra y se lanza, y la subida contesta un error que se puede reintentar.
     */
    if (!yaExistia(error)) {
      console.error('Content: no se pudo crear la ficha para la subida', datos.assetId, sanitizeForLog(error, 300));
      throw error;
    }
    const yaEstaba = await leerMaterial(datos.assetId);
    if (!yaEstaba) return { status: 'invalido' };
    return materialEsDeLaCuenta(yaEstaba, datos.ownerAccountId)
      ? { status: 'ya_estaba', material: yaEstaba }
      : { status: 'no_es_tuyo' };
  }
};

/**
 * MC-9 · ANOTAR HASTA CUÁNDO VALE EL PERMISO QUE SE ACABA DE CONCEDER.
 *
 * Es lo único que un reaper puede usar como autoridad para decir que una subida
 * ya no va a llegar. Sin esto habría que deducirlo de la antigüedad del
 * material, y eso miente: el material se crea UNA vez con `create`, así que
 * pedir un permiso nuevo dos horas después no mueve su fecha, y un reaper que
 * mirara la edad expiraría un permiso que todavía vale.
 *
 * Solo escribe si el material sigue esperando bytes y si la caducidad AVANZA.
 * Un permiso más corto concedido después no puede acortar la vida de uno más
 * largo que ya se entregó y que el proveedor sigue aceptando.
 */
export const anotarPermisoDeSubida = async (
  accountId: string,
  assetId: string,
  expiraEn: number,
): Promise<boolean> => {
  if (!Number.isFinite(expiraEn)) return false;
  const doc = await leerMaterial(assetId);
  if (!doc || !materialEsDeLaCuenta(doc, accountId) || doc.status !== 'uploading') return false;
  const previo = typeof doc.uploadExpiresAt === 'number' ? doc.uploadExpiresAt : 0;
  if (expiraEn <= previo) return false;
  await assets().doc(assetId).update({ uploadExpiresAt: expiraEn, updatedAt: ahora() });
  return true;
};

export type ResultadoDeMaterialFallido =
  | { status: 'fallido'; material: AssetDoc }
  /* Ya estaba fallido: repetir no es un error, es un no-op. Y no se pisa el motivo original. */
  | { status: 'ya_estaba'; material: AssetDoc }
  | { status: 'no_encontrado' }
  | { status: 'no_es_tuyo' }
  | { status: 'estado_incompatible'; actual: AssetDoc['status'] };

/**
 * MC-9 · CERRAR UN MATERIAL QUE NUNCA RECIBIÓ SUS BYTES.
 *
 * `uploading → failed` estaba declarada en `TRANSICIONES_DE_MATERIAL` desde la
 * Fase 11 y **no la producía nadie**: por eso un material que esperaba bytes se
 * quedaba esperando para siempre, y se le enseñaba a su dueño como «llegando»
 * indefinidamente. Esto es el productor que faltaba, y no un estado nuevo.
 *
 * **No borra la identidad.** La ficha se queda entera —su id, su dueño, su
 * procedencia— con el motivo y la fecha escritos al lado. Un material fallido
 * sigue explicando qué se intentó; borrarlo dejaría un hueco sin explicación.
 */
export const marcarMaterialFallido = async (
  accountId: string,
  assetId: string,
  motivo: string,
): Promise<ResultadoDeMaterialFallido> => {
  const doc = await leerMaterial(assetId);
  if (!doc) return { status: 'no_encontrado' };
  if (!materialEsDeLaCuenta(doc, accountId)) return { status: 'no_es_tuyo' };
  if (doc.status === 'failed') return { status: 'ya_estaba', material: doc };
  if (!puedePasarA(doc.status, 'failed')) return { status: 'estado_incompatible', actual: doc.status };

  const at = ahora();
  const cambios = limpiar<Partial<AssetDoc>>({
    status: 'failed',
    failedReason: typeof motivo === 'string' && motivo.length > 0 && motivo.length <= 64 ? motivo : 'desconocido',
    failedAt: at,
    updatedAt: at,
  });
  await assets().doc(assetId).update(cambios);
  return { status: 'fallido', material: { ...doc, ...cambios } as AssetDoc };
};

export type ResultadoDeSubidaConfirmada =
  | { status: 'listo'; material: AssetDoc }
  /* Ya estaba listo: confirmar dos veces no es un error, es un no-op. */
  | { status: 'ya_estaba_listo'; material: AssetDoc }
  | { status: 'no_encontrado' }
  | { status: 'no_es_tuyo' }
  /* No estaba en subida: no se fuerza una transición que el contrato no permite. */
  | { status: 'estado_incompatible'; actual: Asset['status'] };

/**
 * LOS BYTES YA ESTÁN: DE `uploading` A `ready`.
 *
 * La transición la autoriza el contrato de la Fase 11 (`puedePasarA`), no esta
 * función: aquí solo se comprueba de quién es el material y se anota lo que se
 * ha MEDIDO del objeto —su tamaño y su tipo reales—, que hasta ahora solo era
 * lo que alguien dijo que iba a subir.
 *
 * Confirmar dos veces deja el material igual y lo dice; no se vuelve a escribir
 * la fecha ni se pisa nada.
 */
export const marcarMaterialSubido = async (
  accountId: string,
  assetId: string,
  medido: { bytes?: number; mimeType?: string },
): Promise<ResultadoDeSubidaConfirmada> => {
  const doc = await leerMaterial(assetId);
  if (!doc) return { status: 'no_encontrado' };
  if (!materialEsDeLaCuenta(doc, accountId)) return { status: 'no_es_tuyo' };
  if (doc.status === 'ready') return { status: 'ya_estaba_listo', material: doc };
  if (!puedePasarA(doc.status, 'ready')) return { status: 'estado_incompatible', actual: doc.status };

  const at = ahora();
  const cambios = limpiar<Partial<AssetDoc>>({
    status: 'ready',
    bytes: Number.isSafeInteger(medido.bytes) ? medido.bytes : undefined,
    mimeType: medido.mimeType ?? doc.mimeType,
    updatedAt: at,
  });
  await assets().doc(assetId).update(cambios);
  return { status: 'listo', material: { ...doc, ...cambios } as AssetDoc };
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

/* ── El texto también es material ─────────────────────────────────────────── */

export interface NuevoMaterialDeTexto {
  /** Calculada por quien llama. La misma llegada pide el mismo material. */
  assetId: string;
  /** La cuenta. Del trabajo guardado; nunca del cliente ni de un proveedor. */
  ownerAccountId: string;
  /** El resultado, entero. Aquí no hay enlace que caduque. */
  contenido: string;
  provenance: Provenance;
  name?: string;
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * GUARDAR UN RESULTADO DE TEXTO COMO MATERIAL. Sin almacén y sin inventar nada.
 *
 * ── Por qué no hay `storageRef` ─────────────────────────────────────────────
 *
 * Porque el contrato de la Fase 11 ya dice que un material de texto no lo
 * necesita: `materialValido` exige referencia de almacén a todo MENOS al texto,
 * y `AssetKind` lo incluye desde el primer día. Lo que faltaba no era el
 * contrato: era que alguien lo usara.
 *
 * Subir el texto a un objeto habría costado una escritura en el almacén, una
 * firma y una descarga cada vez que el paso siguiente quisiera leerlo — por una
 * respuesta que ya estaba en memoria.
 *
 * ── Se crea SOLO SI NO EXISTE ───────────────────────────────────────────────
 *
 * Misma disciplina que el resto: `create` en vez de `set`. Dos llegadas del
 * mismo intento —un reintento que corre a la vez, una reconciliación— dejan UN
 * material, y la segunda recibe el que ya estaba en lugar de pisarlo.
 */
export const crearMaterialDeTexto = async (datos: NuevoMaterialDeTexto): Promise<AssetDoc | null> => {
  if (!FORMA_DE_ID_DE_MATERIAL.test(datos.assetId)) {
    console.warn('Content: identidad de material mal formada; no se crea la ficha de texto');
    return null;
  }
  if (typeof datos.contenido !== 'string' || !datos.contenido.length) return null;
  const at = Date.now();
  const bruto: AssetDoc = {
    contract: CONTENT_CORE_CONTRACT_VERSION,
    assetId: datos.assetId,
    ownerAccountId: datos.ownerAccountId,
    kind: 'text',
    status: 'ready',
    mimeType: 'text/plain',
    bytes: Buffer.byteLength(datos.contenido, 'utf8'),
    provenance: limpiar({ ...datos.provenance }),
    name: datos.name,
    metadata: datos.metadata,
    createdAt: at,
    updatedAt: at,
  };
  const doc = limpiar(bruto);
  if (!materialValido(doc)) {
    console.error('Content: el material de texto construido no cumple el contrato', datos.assetId);
    return null;
  }
  const ref = assets().doc(datos.assetId);
  try {
    await ref.create({ ...doc, contenido: datos.contenido });
    return doc;
  } catch (error) {
    if (!yaExistia(error)) {
      console.error('Content: no se pudo crear el material de texto', datos.assetId, sanitizeForLog(error, 300));
      return null;
    }
    /* Ya estaba: otra llegada se adelantó. Su ficha es la buena. */
    const ya = await leerMaterial(datos.assetId);
    return ya && ya.ownerAccountId === datos.ownerAccountId ? ya : null;
  }
};

/**
 * EL CONTENIDO DE UN MATERIAL DE TEXTO, SI ES DE ESTA CUENTA.
 *
 * Hermana de `leerMaterial`, que devuelve la ficha. Esto devuelve lo que un
 * paso escribió, y solo a quien le pertenece: un material de otra cuenta
 * contesta `null`, igual que uno que no existe — distinguirlos permitiría
 * averiguar qué tiene otra cuenta probando identificadores.
 *
 * Un material que no es de texto también contesta `null`: sus bytes no están
 * aquí, están en el almacén, y para eso está la entrega firmada.
 */
export const leerTextoDelMaterial = async (accountId: string, assetId: string): Promise<string | null> => {
  if (typeof accountId !== 'string' || !accountId || !FORMA_DE_ID_DE_MATERIAL.test(assetId)) return null;
  const snap = await assets().doc(assetId).get();
  const d = snap.data();
  if (!d || d.ownerAccountId !== accountId || d.kind !== 'text' || d.status !== 'ready') return null;
  return typeof d.contenido === 'string' ? d.contenido : null;
};
