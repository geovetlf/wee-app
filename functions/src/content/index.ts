import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomUUID } from 'crypto';
import {
  Asset,
  AssetKind,
  AssetVariant,
  CONTENT_CORE_CONTRACT_VERSION,
  DerechosDelMaterial,
  FORMA_DE_ID_DE_MATERIAL,
  Provenance,
  StorageRef,
  RAIZ_DE_CUENTAS,
  claveEsDeLaCuenta,
  esStorageRef,
  flagAbiertaPara,
  materialEsDeLaCuenta,
  materialValido,
  puedePasarA,
  retirar,
} from '../core';
import { parseStorageUrl, storageBucket } from '../engine/http';
import { sanitizeForLog } from '../engine/sanitize';
import {
  DepsDelIndice,
  HechosDelObjeto,
  anotarVarianteConIndice,
  consumidoresDeProduccion,
  crearFichaConIndice,
  esDelCuboDeWee,
  hechosDeMetadata,
  huellaDelIndice,
  leerFlagDelAlmacen,
  operacionesDeProduccion,
  puertoDelStorageDeWee,
  retirarConIndice,
} from './indice';

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

/**
 * H5/H2 · QUÉ ENTRA EN EL ÍNDICE: lo que Weë puede borrar desde aquí, y solo
 * dentro de la cuenta. Del Storage de Weë, la carpeta `users/<cuenta>/`
 * (`esDeLaCuenta`); de Media Cloud, la de `accounts/<cuenta>/`
 * (`claveEsDeLaCuenta`). Ninguna de las dos se relaja: se usan tal cual.
 */
export const entraEnElIndice = (ref: StorageRef, cuenta: string): boolean =>
  (ref.provider === PROVEEDOR_WEE && esDeLaCuenta(ref, cuenta)) || claveEsDeLaCuenta(ref.objectKey, cuenta);

/**
 * LAS DEPENDENCIAS DE PRODUCCIÓN DEL ÍNDICE. Consumidores y operaciones
 * contestan «no se sabe» (D-G): con la flag abierta, una retirada saca el
 * material de la biblioteca y CONSERVA sus objetos, con el motivo anotado.
 */
export const depsDelIndice = (): DepsDelIndice => ({
  db: db(),
  huella: huellaDelIndice,
  indexable: entraEnElIndice,
  almacenes: { [PROVEEDOR_WEE]: puertoDelStorageDeWee(PROVEEDOR_WEE) },
  consumidores: consumidoresDeProduccion,
  operaciones: operacionesDeProduccion,
  ahora,
  sortear: () => randomUUID().replace(/-/g, ''),
});

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

export const tipoPorMime = (mime: string | undefined, porDefecto: AssetKind): AssetKind => {
  /*
   * Un mundo o un objeto 3D viajan en archivos de cualquier tipo —un PNG de panorama, una malla Draco o PLY en
   * application/octet-stream—: manda lo que se declaró. Sin esto, un mundo se guardaba como imagen o como documento.
   */
  if (porDefecto === 'world' || porDefecto === 'model3d') return porDefecto;
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
  /**
   * La creación de la que es VERSIÓN, si lo es (DEC-03). Lo fija `crearVersionDeMaterial` (`content/versiones.ts`), que comprueba que es de la
   * misma cuenta, está lista y es de la misma clase. Nunca lo envía el cliente.
   */
  previousVersionId?: string;
  /** La licencia ajena que lo acompaña (del gobierno del modelo que lo generó). */
  derechos?: DerechosDelMaterial;
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
 * LA FICHA DE UN ARCHIVO QUE YA ESTÁ, CONSTRUIDA Y VALIDADA — sin escribir nada.
 *
 * La comparten la creación desde URL y la versión con el índice (DEC-03 · H2):
 * una versión nace con EXACTAMENTE la misma ficha que habría creado
 * `crearMaterialDesdeUrl`, aunque se escriba en otra transacción. `null` si la
 * identidad calculada viene mal formada o la ficha no cumple el contrato.
 */
export const construirFichaDesdeUrl = (
  datos: NuevoMaterialDesdeUrl,
  ref: StorageRef,
  mimeType: string | undefined,
  bytes: number | undefined,
): AssetDoc | null => {
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
    derechos: datos.derechos,
    createdAt: at,
    updatedAt: at,
    delivery,
    /* La relación de versión, si la hay: explícita, la fija solo crearVersionDeMaterial (content/versiones.ts). */
    ...(datos.previousVersionId !== undefined ? { previousVersionId: datos.previousVersionId } : {}),
  };
  const doc = limpiar(bruto);
  if (!materialValido(doc)) {
    console.error('Content: el material construido no cumple el contrato', assetId);
    return null;
  }
  return doc;
};

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
  let hechos: HechosDelObjeto | undefined;
  if (ref.provider === PROVEEDOR_WEE) {
    try {
      const [meta] = await storageBucket().file(ref.objectKey).getMetadata();
      mimeType = mimeType ?? (typeof meta.contentType === 'string' ? meta.contentType : undefined);
      bytes = typeof meta.size === 'string' ? Number(meta.size) : typeof meta.size === 'number' ? meta.size : undefined;
      hechos = hechosDeMetadata(meta as Record<string, unknown>);
    } catch (error) {
      /* Sin metadata no hay material: un objeto que no se puede leer no está listo. */
      console.warn('Content: no se pudo leer la metadata del objeto', ref.objectKey, error);
      return null;
    }
  }

  const doc = construirFichaDesdeUrl(datos, ref, mimeType, bytes);
  if (!doc) return null;
  const assetId = doc.assetId;

  /*
   * H5/H2 · CON LA FLAG ABIERTA PARA ESTA CUENTA, la ficha nace con su fila del
   * índice y el registro de su objeto, en una transacción. Se pregunta DESPUÉS
   * de ver el objeto: así ninguna referencia a un objeto nacido con la flag ya
   * abierta sale por el camino de siempre (es lo que sostiene la cobertura de
   * nacimiento). Con la flag cerrada, nada de esto existe: lo de siempre.
   */
  if (ref.provider === PROVEEDOR_WEE && flagAbiertaPara((await leerFlagDelAlmacen(db())).config, datos.ownerAccountId)) {
    try {
      const r = await crearFichaConIndice(depsDelIndice(), doc, { soloSiNoExiste: datos.assetId !== undefined, hechos });
      if (r.status === 'creada' || r.status === 'ya_estaba') return r.status === 'creada' ? doc : r.doc;
      if (r.status === 'rechazada') console.warn('Content: el índice no admite una ficha nueva sobre ese objeto', assetId, r.motivo);
      return null;
    } catch (error) {
      console.error('Content: no se pudo crear la ficha con su índice', assetId, sanitizeForLog(error, 300));
      return null;
    }
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

  /*
   * H5/H2 · Con la flag abierta, la ficha nace con su fila del índice: la clave
   * queda reclamada por este material desde antes de que lleguen los bytes. El
   * registro del objeto no se crea aquí: nace al confirmarse la subida. Un error
   * que no es «ya existía» se lanza igual que en el camino de siempre.
   */
  if (entraEnElIndice(ref, datos.ownerAccountId) && flagAbiertaPara((await leerFlagDelAlmacen(db())).config, datos.ownerAccountId)) {
    const r = await crearFichaConIndice(depsDelIndice(), doc, { soloSiNoExiste: true, sinRegistro: true });
    if (r.status === 'creada') return { status: 'creado', material: doc };
    if (r.status === 'ya_estaba') return { status: 'ya_estaba', material: r.doc };
    if (r.status === 'ajena') return { status: 'no_es_tuyo' };
    console.warn('Content: el índice no admite una subida sobre esa clave', datos.assetId, r.motivo);
    return { status: 'invalido' };
  }

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

/** La forma del id que escribe el servidor. Lo que no la tiene no se busca: ni se lee ni se marca. */
const esIdDeFicha = (assetId: unknown): assetId is string => typeof assetId === 'string' && /^asset_[a-f0-9]{32}$/.test(assetId);

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
 *
 * H2 · LA LECTURA Y LA ESCRITURA, EN LA MISMA TRANSACCIÓN. Leída fuera, una
 * retirada que llegaba entre la lectura y la escritura se quedaba debajo: el
 * material ya retirado volvía a `failed`. Dentro, si alguien escribe la ficha
 * entre medias, la transacción se repite con lo que hay, y un material retirado
 * no puede pasar a `failed` (`puedePasarA`): contesta `estado_incompatible`.
 */
export const marcarMaterialFallido = async (
  accountId: string,
  assetId: string,
  motivo: string,
): Promise<ResultadoDeMaterialFallido> => {
  if (!esIdDeFicha(assetId)) return { status: 'no_encontrado' };
  const fichaQueFalla = assets().doc(assetId);
  return db().runTransaction(async (tx): Promise<ResultadoDeMaterialFallido> => {
    const leida = await tx.get(fichaQueFalla);
    if (!leida.exists) return { status: 'no_encontrado' };
    const doc = leida.data() as AssetDoc;
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
    tx.update(fichaQueFalla, cambios);
    return { status: 'fallido', material: { ...doc, ...cambios } as AssetDoc };
  });
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
 *
 * H2 · Como `marcarMaterialFallido`: se lee y se escribe en la misma
 * transacción, así que un material retirado entre medias no vuelve a `ready`
 * (la transacción se repite, lo ve `deleted` y contesta `estado_incompatible`).
 */
export const marcarMaterialSubido = async (
  accountId: string,
  assetId: string,
  medido: { bytes?: number; mimeType?: string },
): Promise<ResultadoDeSubidaConfirmada> => {
  if (!esIdDeFicha(assetId)) return { status: 'no_encontrado' };
  const fichaQueSube = assets().doc(assetId);
  return db().runTransaction(async (tx): Promise<ResultadoDeSubidaConfirmada> => {
    const vista = await tx.get(fichaQueSube);
    if (!vista.exists) return { status: 'no_encontrado' };
    const doc = vista.data() as AssetDoc;
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
    tx.update(fichaQueSube, cambios);
    return { status: 'listo', material: { ...doc, ...cambios } as AssetDoc };
  });
};

/** La ficha, o nada. Nunca lanza por un id que no existe. */
export const leerMaterial = async (assetId: string): Promise<AssetDoc | null> => {
  if (!esIdDeFicha(assetId)) return null;
  const snap = await assets().doc(assetId).get();
  return snap.exists ? (snap.data() as AssetDoc) : null;
};

/* ── Retirar ───────────────────────────────────────────────────────────────── */

export type ResultadoDeRetirada =
  | { status: 'retirado'; asset: AssetDoc; objetosBorrados: number; pendientes: number }
  | { status: 'ya_retirado'; objetosBorrados?: number; pendientes?: number }
  | { status: 'no_es_tuyo' }
  | { status: 'no_existe' };

/**
 * ¿OTRA FICHA VIVA USA ESTE OBJETO? (E-1). Dos fichas pueden apuntar al mismo objeto (una versión y su original, o dos
 * creaciones con la misma clave): retirar una no puede borrarlo mientras la otra siga viva. Se mira en las fichas de la
 * cuenta (archivo y variantes), leídas UNA vez por operación, y en las fichas de cualquier cuenta que tengan la misma clave.
 *
 * «Mismo objeto» es la regla 4 del Core (`mismoObjeto`, en core/content/linaje.ts): mismo proveedor, contenedor y clave.
 * Se copia aquí porque ese módulo no está conectado a ningún camino de producción.
 * Conectarlo es una decisión del dueño; entonces esta copia se sustituye por la del Core.
 */

/** Las fichas tal como las lee el servidor: el identificador es el id del documento, que escribe el servidor. */
const fichaDelDocumento = (d: { id: string; data: () => unknown }): AssetDoc => ({ ...(d.data() as AssetDoc), assetId: d.id });

/** Las referencias de una ficha: su archivo y los de sus variantes (lo que `retirar` borraría). */
const objetosDeLaFicha = (f: Pick<AssetDoc, 'storageRef' | 'variants'>): StorageRef[] =>
  [f.storageRef, ...(f.variants ?? []).map((v) => v.storageRef)].filter((r): r is StorageRef => esStorageRef(r));

/** Mismo objeto: mismo proveedor, contenedor y clave (la regla 4 del Core; ver la nota de arriba). */
const mismoObjeto = (a: StorageRef, b: StorageRef): boolean =>
  a.provider === b.provider && (a.bucket ?? '') === (b.bucket ?? '') && a.objectKey === b.objectKey;

/** Las fichas de una cuenta, leídas UNA vez por operación (no una por objeto). */
export const fichasDeLaCuenta = async (owner: string): Promise<AssetDoc[]> =>
  (await assets().where('ownerAccountId', '==', owner).get()).docs.map(fichaDelDocumento);

/** ¿Comparte `ref` objeto con alguna ficha viva de `fichas`? */
const compartenObjeto = (ref: StorageRef, fichas: readonly AssetDoc[]): boolean =>
  fichas.some((f) => f.status !== 'deleted' && objetosDeLaFicha(f).some((r) => mismoObjeto(r, ref)));

/** Otra ficha viva usa `ref`: de la cuenta (como archivo o como variante) o de cualquier cuenta (como archivo, por clave). */
export const fichaVivaUsaElObjeto = async (fichas: readonly AssetDoc[], assetId: string, ref: StorageRef): Promise<boolean> => {
  const deOtrasCuentas = (await assets().where('storageRef.objectKey', '==', ref.objectKey).get()).docs.map(fichaDelDocumento);
  return compartenObjeto(ref, [...fichas, ...deOtrasCuentas].filter((f) => f.assetId !== assetId));
};


/**
 * RETIRAR UN MATERIAL. La única forma de borrar lo generado.
 *
 * El orden importa y es a propósito: primero se marca la ficha como retirada y DESPUÉS se mira y se borra el objeto. La
 * ficha lleva `pendingPhysicalDeletion` desde el primer paso si hay algo que borrar, así que si el proceso muere entre
 * medias queda una ficha `deleted` con esa marca. La marca dice que algo puede seguir en el almacén. NO es una retirada
 * recuperable: no hay ninguna operación que la complete, la reintente o restaure la ficha. La muestra la copia de «Mis
 * creaciones» y la cuenta el inventario de medios, pero ninguna operación borra un objeto por verla: completar esa
 * retirada es una decisión pendiente (D1). Al revés quedaría un objeto borrado con una ficha `ready`, que es una mentira.
 *
 * E-1: un objeto que otra ficha viva todavía usa NO se borra. Queda pendiente y se borra con la última ficha que lo use.
 * Como cada retirada marca su ficha ANTES de mirar, dos retiradas simultáneas no pueden dejar el objeto sin borrar: la que
 * mira en segundo lugar ve a la otra ya retirada.
 *
 * La propiedad se comprueba contra la CUENTA del Principal, leída de la ficha. Un `assetId` que llega de fuera no prueba
 * nada por sí mismo.
 *
 * H5/H2 · Con `aiSettings/almacenActivos` abierta para la cuenta (CERRADA por defecto), la retirada va por el índice y el
 * cerrojo (`retirarConIndice`, en `content/indice.ts`): T1 retira la ficha y apaga sus filas, T2 reclama, el almacén borra
 * con la generación registrada y T3 cierra con la concesión propia. Cerrada, la ficha se retira igual, pero NO se borra
 * ningún objeto: lo libre queda pendiente (la regla de seguridad exige la prueba de índice completo para borrar).
 */
export const retirarMaterial = async (accountId: string, assetId: string): Promise<ResultadoDeRetirada> => {
  if (flagAbiertaPara((await leerFlagDelAlmacen(db())).config, accountId)) {
    const r = await retirarConIndice(depsDelIndice(), accountId, assetId);
    return r.status === 'retirado'
      ? { status: 'retirado', asset: r.asset, objetosBorrados: r.objetosBorrados, pendientes: r.pendientes }
      : r;
  }
  const doc = await leerMaterial(assetId);
  if (!doc) return { status: 'no_existe' };
  if (!materialEsDeLaCuenta(doc, accountId)) return { status: 'no_es_tuyo' };

  const decision = retirar(doc, ahora());
  if (!decision) return { status: 'ya_retirado' };

  /*
   * Solo se borra físicamente lo que es de Weë, vive bajo la propia cuenta Y está en el cubo configurado. El borrado va
   * por CLAVE en el cubo de Weë (`storageBucket()`), así que una ficha que diga otro cubo no puede autorizarlo: su clave
   * podría coincidir con la de un objeto nuestro que no es el suyo. Una referencia que no cumpla las tres cosas se retira
   * de la ficha pero queda anotada como pendiente: antes que borrar el objeto equivocado, no borrar.
   */
  const paraBorrar = decision.borrar.filter((r) => r.provider === PROVEEDOR_WEE && esDeLaCuenta(r, doc.ownerAccountId) && esDelCuboDeWee(r));
  let pendientes = decision.borrar.length - paraBorrar.length;

  /* 1) La ficha queda retirada antes de mirar quién más usa el objeto, y marcada si hay algo que borrar. */
  const hayQueBorrar = decision.borrar.length > 0;
  const retirado: AssetDoc = limpiar({ ...doc, ...decision.asset, delivery: undefined, pendingPhysicalDeletion: hayQueBorrar ? true : undefined });
  await assets().doc(assetId).set(retirado);

  /* 2) Lo que otra ficha viva usa no se borra: queda pendiente y se borra con la última. Las fichas de la cuenta se leen una vez. */
  const fichas = await fichasDeLaCuenta(doc.ownerAccountId);
  const libres: StorageRef[] = [];
  for (const r of paraBorrar) {
    if (await fichaVivaUsaElObjeto(fichas, assetId, r)) pendientes++;
    else libres.push(r);
  }

  /*
   * 3) Lo libre se borra, en dos pasos que fallan por separado.
   *    A) El borrado: si falla, el objeto sigue ahí y la ficha queda pendiente.
   *    B) La revisión de la marca de las demás fichas de la cuenta que lo tenían: si falla DESPUÉS de un borrado bueno, el
   *       objeto ya no está, así que esta ficha no se marca como pendiente por ese fallo. Se registra y no se reintenta
   *       (D1): las demás fichas de ese objeto pueden conservar una marca que ya no corresponde.
   */
  /*
   * Con la bandera CERRADA no hay índice que pruebe que el objeto está completo ni que ningún otro uso queda: el borrado
   * físico exige esa prueba (regla de seguridad de la línea de activos). Por eso aquí NO se borra nada: lo libre queda
   * pendiente, el objeto se queda en Storage y la marca espera a la reconciliación cuando la bandera esté abierta.
   * Antes, esta rama borraba con la única comprobación de las fichas de la propia cuenta (CRÍTICO C-1, revisión A).
   */
  const objetosBorrados = 0;
  if (libres.length > 0) {
    pendientes += libres.length;
    await assets().doc(assetId).set({ pendingPhysicalDeletion: true }, { merge: true });
  }

  /* 4) Si no queda nada pendiente, la ficha lo dice: se baja la marca que puso el paso 1. */
  if (hayQueBorrar && pendientes === 0) await assets().doc(assetId).set({ pendingPhysicalDeletion: false }, { merge: true });
  const final: AssetDoc = limpiar({ ...retirado, pendingPhysicalDeletion: pendientes > 0 ? true : undefined });
  return { status: 'retirado', asset: final, objetosBorrados, pendientes };
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
  /* Un reintento que reanuda un borrado a medias dice si todavía queda algo; sin reanudación, la respuesta de siempre. */
  if (r.status === 'ya_retirado') {
    return { assetId, status: 'deleted', already: true, ...(r.pendientes !== undefined ? { pendingPhysicalDeletion: r.pendientes > 0 } : {}) };
  }
  return { assetId, status: 'deleted', already: false, pendingPhysicalDeletion: r.pendientes > 0 };
});

/* ── Variantes: la costura, sin procesado todavía ──────────────────────────── */

/**
 * Anotar una variante que ya existe en un almacén. NO la genera: generarla es
 * una tarea del Job Engine (`media.thumbnail`), que la Fase 11 deja preparada
 * y no ejecuta. Esto es solo cómo se escribe cuando exista.
 *
 * H5/H2 · EN UNA TRANSACCIÓN, con o sin flag. Leer la ficha, calcular las
 * variantes y escribirlas iba en tres pasos sueltos: dos anotaciones a la vez
 * leían el mismo array y la segunda borraba la primera (experimento A4). Ahora
 * la lectura y la escritura van juntas y, si alguien escribe entre medias, la
 * transacción se repite con lo que hay. La semántica no cambia: una variante
 * por tipo, y nada sobre un material ajeno o retirado.
 *
 * Con la flag abierta para la cuenta, además, la variante nueva tiene su fila
 * del índice y la sustituida deja la suya apagada (`anotarVarianteConIndice`).
 */
export const anotarVariante = async (accountId: string, assetId: string, variante: AssetVariant): Promise<boolean> => {
  if (typeof assetId !== 'string' || !/^asset_[a-f0-9]{32}$/.test(assetId)) return false;
  if (esStorageRef(variante?.storageRef) && entraEnElIndice(variante.storageRef, accountId)
    && flagAbiertaPara((await leerFlagDelAlmacen(db())).config, accountId)) {
    const deps = depsDelIndice();
    const puerto = deps.almacenes[variante.storageRef.provider];
    const visto = puerto ? await puerto.mirar(variante.storageRef) : undefined;
    const hechos: HechosDelObjeto | undefined = visto?.ok
      ? { existe: true, ...(visto.objeto.generacion ? { generacion: visto.objeto.generacion } : {}), ...(visto.objeto.creadoEn !== undefined ? { creadoEn: visto.objeto.creadoEn } : {}) }
      : visto && !visto.ok && visto.motivo === 'no_existe' ? { existe: false } : undefined;
    return anotarVarianteConIndice(deps, accountId, assetId, variante, hechos);
  }
  const ref = assets().doc(assetId);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const doc = snap.exists ? (snap.data() as AssetDoc) : null;
    if (!doc || !materialEsDeLaCuenta(doc, accountId) || doc.status === 'deleted') return false;
    if (!esStorageRef(variante.storageRef)) return false;
    const variants = [...(doc.variants ?? []).filter((v) => v.kind !== variante.kind), variante];
    tx.set(ref, { variants, updatedAt: ahora() }, { merge: true });
    return true;
  });
};

/**
 * LAS VARIANTES QUE DIO EL PROVEEDOR, sobre el material de su resultado (la vista previa de un mundo). Solo archivos
 * que ya están en la carpeta de la cuenta en el Storage de Weë —los guardó el adaptador—; una dirección de fuera no se
 * anota. Devuelve cuántas quedaron. No inventa ninguna: lo que el proveedor no dio, no está.
 */
export const anotarVariantesDelResultado = async (
  accountId: string,
  assetId: string,
  variantes: readonly { kind: AssetVariant['kind']; url: string; mimeType?: string; bytes?: number }[] | undefined,
): Promise<number> => {
  let anotadas = 0;
  for (const v of variantes ?? []) {
    const storageRef = referenciaDesdeUrlDeWee(v.url);
    if (!storageRef || !esDeLaCuenta(storageRef, accountId)) {
      console.warn('Content: una variante fuera de la carpeta de la cuenta no se anota', assetId, v.kind);
      continue;
    }
    const ok = await anotarVariante(accountId, assetId, {
      kind: v.kind, storageRef,
      ...(v.mimeType ? { mimeType: v.mimeType } : {}),
      ...(Number.isSafeInteger(v.bytes) ? { bytes: v.bytes } : {}),
    });
    if (ok) anotadas++;
  }
  return anotadas;
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
