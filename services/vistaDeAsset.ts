/**
 * LO QUE SE VE DE UN MATERIAL — el espejo de cliente de `core/content/vista.ts`.
 *
 * ── Por qué esto es un espejo y no un import ────────────────────────────────
 *
 * El Core vive en `functions/src/core`, y `metro.config.js` **bloquea
 * `functions/` del bundle de la app** a propósito: tiene su propio
 * `node_modules` y no forma parte de lo que se empaqueta. Así que el cliente no
 * puede importar `vistaDeMaterial`, por mucho que sea exactamente la función
 * que necesita.
 *
 * La respuesta no es copiar y rezar. Es copiar y **demostrarlo**: hay una
 * prueba —`functions/test/vista-espejo.test.mjs`— que carga las DOS
 * implementaciones, les pasa los mismos materiales y exige que devuelvan lo
 * mismo. Si una cambia y la otra no, se rompe. El contrato es uno; lo que hay
 * dos es ejecuciones de él, y eso está vigilado.
 *
 * Es el mismo trato que ya tenía `AssetDoc`, que siempre fue «espejo de
 * functions/src/content»; la diferencia es que ahora el espejo se comprueba.
 *
 * ── Qué hace, y qué no ──────────────────────────────────────────────────────
 *
 * Decide QUÉ enseñar de un material: su estado para una persona, de dónde
 * salió, cuál de sus objetos sirve para una rejilla y cuál para descargarlo.
 *
 * No construye ninguna dirección. Una `StorageRef` no se convierte en URL en el
 * cliente —eso es de la capa de entrega, que es quien sabe de proveedores y de
 * caducidades— y por eso aquí no aparece el nombre de ningún almacén.
 *
 * Y no trae ni una frase: los textos y su i18n son de quien pinta.
 */

/* ── El material, tal y como el servidor lo guarda ──────────────────────────── */

export type AssetKind = 'text' | 'image' | 'video' | 'audio' | 'document' | 'model3d';
export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
export type VariantKind = 'thumbnail' | 'poster' | 'preview' | 'transcoded';

export interface StorageRef {
  provider: string;
  bucket?: string;
  objectKey: string;
  version?: string;
}

export interface AssetProvenance {
  createdAt: number;
  generationId?: string;
  jobId?: string;
  stepId?: string;
  requestId?: string;
  capability?: string;
  provider?: string;
  model?: string;
  sourceAssetIds?: string[];
}

export interface AssetVariant {
  kind: VariantKind;
  storageRef: StorageRef;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

/** Lo que el servidor guarda en `assets/{assetId}`. Espejo de `functions/src/content` — se lee, no se escribe. */
export interface AssetDoc {
  assetId: string;
  ownerAccountId: string;
  kind: AssetKind;
  status: AssetStatus;
  storageRef?: StorageRef;
  content?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  name?: string;
  tags?: string[];
  variants?: AssetVariant[];
  provenance: AssetProvenance;
  previousVersionId?: string;
  /** Libre y acotado: de qué experiencia salió, y poco más. */
  metadata?: Record<string, string | number | boolean>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  /** La URL de entrega. Caché, no identidad: puede cambiar sin que el material cambie. */
  delivery?: { url: string; kind: 'bearer_token' | 'public' };
  pendingPhysicalDeletion?: boolean;
}

/* ── El estado, dicho para una persona ──────────────────────────────────────── */

export type EstadoVisible = 'llegando' | 'preparando' | 'disponible' | 'no_se_pudo' | 'retirado';

export const ESTADOS_VISIBLES: EstadoVisible[] = ['llegando', 'preparando', 'disponible', 'no_se_pudo', 'retirado'];

const VISIBLE_DE: Record<AssetStatus, EstadoVisible> = {
  uploading: 'llegando',
  processing: 'preparando',
  ready: 'disponible',
  failed: 'no_se_pudo',
  deleted: 'retirado',
};

export const estadoVisible = (status: AssetStatus): EstadoVisible => VISIBLE_DE[status] ?? 'no_se_pudo';

/** Al dueño se le enseña todo menos lo retirado. Ocultar lo que no está listo parece que se perdió. */
export const seListaAlDueno = (status: AssetStatus): boolean => status !== 'deleted';

/** Los estados que una consulta pide. Se deriva, para que añadir uno al Core no obligue a tocar la consulta. */
export const ESTADOS_QUE_SE_LISTAN: AssetStatus[] =
  (['uploading', 'processing', 'ready', 'failed', 'deleted'] as AssetStatus[]).filter(seListaAlDueno);

/* ── De dónde salió ─────────────────────────────────────────────────────────── */

export type OrigenDeMaterial = 'subido' | 'generado' | 'derivado';

export const origenDe = (a: AssetDoc | undefined): OrigenDeMaterial => {
  const p = a?.provenance;
  if (p?.sourceAssetIds && p.sourceAssetIds.length > 0) return 'derivado';
  if (p?.capability) return 'generado';
  return 'subido';
};

/* ── Lo que se puede contar de cómo se hizo ─────────────────────────────────── */

/**
 * La procedencia, depurada. El proveedor, el modelo, el coste y los
 * identificadores de operación se quedan fuera: no son de quien usa Weë, y son
 * exactamente lo que no debe bajar al cliente.
 *
 * Es un objeto NUEVO, no un recorte: añadir un campo a la procedencia no lo
 * filtra.
 */
export interface GeneracionVisible {
  hechoConWee: true;
  capacidad?: string;
  partioDe?: string[];
  creadoEn: number;
}

export const generacionVisible = (p: AssetProvenance | undefined): GeneracionVisible | undefined => {
  if (!p || !p.capability) return undefined;
  const partioDe = p.sourceAssetIds && p.sourceAssetIds.length > 0 ? p.sourceAssetIds : undefined;
  return {
    hechoConWee: true,
    capacidad: p.capability,
    ...(partioDe ? { partioDe } : {}),
    creadoEn: p.createdAt,
  };
};

/* ── Qué objeto se enseña ───────────────────────────────────────────────────── */

export type ProposicionDeUso = 'miniatura' | 'vista' | 'original';

const PREFERENCIA: Record<ProposicionDeUso, VariantKind[]> = {
  miniatura: ['thumbnail', 'poster', 'preview'],
  vista: ['preview', 'transcoded', 'poster'],
  original: [],
};

export interface Representacion {
  ref: StorageRef;
  esElOriginal: boolean;
  variante?: VariantKind;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

const deVariante = (v: AssetVariant): Representacion => ({
  ref: v.storageRef,
  esElOriginal: false,
  variante: v.kind,
  ...(v.mimeType ? { mimeType: v.mimeType } : {}),
  ...(v.bytes !== undefined ? { bytes: v.bytes } : {}),
  ...(v.width !== undefined ? { width: v.width } : {}),
  ...(v.height !== undefined ? { height: v.height } : {}),
  ...(v.durationSec !== undefined ? { durationSec: v.durationSec } : {}),
});

const delOriginal = (a: AssetDoc): Representacion | undefined => a.storageRef ? {
  ref: a.storageRef,
  esElOriginal: true,
  ...(a.mimeType ? { mimeType: a.mimeType } : {}),
  ...(a.bytes !== undefined ? { bytes: a.bytes } : {}),
  ...(a.width !== undefined ? { width: a.width } : {}),
  ...(a.height !== undefined ? { height: a.height } : {}),
  ...(a.durationSec !== undefined ? { durationSec: a.durationSec } : {}),
} : undefined;

/**
 * El mejor objeto para lo que se quiere hacer, o nada si todavía no hay ninguno.
 *
 * Para `original` se devuelve el original o NADA, jamás un derivado: dar una
 * miniatura a quien pidió el archivo sería mentirle.
 */
export const representacionPara = (a: AssetDoc | undefined, para: ProposicionDeUso): Representacion | undefined => {
  if (!a || a.status === 'deleted') return undefined;
  if (para === 'original') return delOriginal(a);
  for (const kind of PREFERENCIA[para] ?? []) {
    const v = (a.variants ?? []).find((x) => x.kind === kind);
    if (v) return deVariante(v);
  }
  return delOriginal(a);
};

/* ── Cómo se llega a los bytes ──────────────────────────────────────────────── */

export type ModoDeEntrega = 'ninguna' | 'firmada' | 'directa';

export const modoDeEntrega = (a: AssetDoc | undefined): ModoDeEntrega => {
  if (!a || a.status === 'deleted') return 'ninguna';
  if (!a.storageRef) {
    if (a.kind === 'text' && typeof a.content === 'string') return 'directa';
    return a.delivery?.url ? 'directa' : 'ninguna';
  }
  return a.delivery?.url ? 'directa' : 'firmada';
};

/* ── El material entero, como lo ve una interfaz ────────────────────────────── */

/**
 * Lo que una pantalla necesita saber de un material, y nada más.
 *
 * Fíjate en lo que no está: `storageRef` del material, proveedor, contenedor,
 * clave de objeto, coste, modelo e identificadores de operación. El día que se
 * cambie de proveedor, nada de esto cambia — que es la prueba de que la
 * abstracción es real.
 */
export interface VistaDeMaterial {
  assetId: string;
  tipo: AssetKind;
  estado: EstadoVisible;
  origen: OrigenDeMaterial;
  nombre?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  tags?: string[];
  miniatura?: Representacion;
  vista?: Representacion;
  original?: Representacion;
  entrega: ModoDeEntrega;
  generacion?: GeneracionVisible;
  vieneDe?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const vistaDeAsset = (a: AssetDoc): VistaDeMaterial => {
  const miniatura = representacionPara(a, 'miniatura');
  const vista = representacionPara(a, 'vista');
  const original = representacionPara(a, 'original');
  const generacion = generacionVisible(a.provenance);
  return {
    assetId: a.assetId,
    tipo: a.kind,
    estado: estadoVisible(a.status),
    origen: origenDe(a),
    ...(a.name ? { nombre: a.name } : {}),
    ...(a.mimeType ? { mimeType: a.mimeType } : {}),
    ...(a.bytes !== undefined ? { bytes: a.bytes } : {}),
    ...(a.width !== undefined ? { width: a.width } : {}),
    ...(a.height !== undefined ? { height: a.height } : {}),
    ...(a.durationSec !== undefined ? { durationSec: a.durationSec } : {}),
    ...(a.tags && a.tags.length > 0 ? { tags: a.tags } : {}),
    ...(miniatura ? { miniatura } : {}),
    ...(vista ? { vista } : {}),
    ...(original ? { original } : {}),
    entrega: modoDeEntrega(a),
    ...(generacion ? { generacion } : {}),
    ...(a.previousVersionId ? { vieneDe: a.previousVersionId } : {}),
    creadoEn: a.createdAt,
    actualizadoEn: a.updatedAt,
  };
};

/* ── Los textos, que son de quien pinta ─────────────────────────────────────── */

/**
 * DE UN ESTADO A SU CLAVE DE TRADUCCIÓN. Un mapa explícito, no una concatenación.
 *
 * Antes la clave se fabricaba pegando trozos del estado interno —
 * `creaciones.status${Capitalize(status)}`— en DOS sitios distintos. Eso ataba
 * la interfaz a los nombres del Core: renombrar `failed` dejaba la pantalla
 * buscando una clave que no existe, y sin que nada fallara al compilar.
 *
 * Con un mapa, el compilador exige que los cinco estados tengan su clave y que
 * la clave exista en el diccionario. Un estado nuevo no compila hasta que
 * alguien decide cómo se dice.
 */
export const CLAVE_DE_ESTADO: Record<EstadoVisible, string> = {
  llegando: 'creaciones.statusUploading',
  preparando: 'creaciones.statusProcessing',
  disponible: 'creaciones.statusReady',
  no_se_pudo: 'creaciones.statusFailed',
  retirado: 'creaciones.statusDeleted',
};

/** Lo mismo para el tipo, que se pegaba igual y se rompía igual. */
export const CLAVE_DE_TIPO: Record<AssetKind, string> = {
  text: 'creaciones.kindText',
  image: 'creaciones.kindImage',
  video: 'creaciones.kindVideo',
  audio: 'creaciones.kindAudio',
  document: 'creaciones.kindDocument',
  model3d: 'creaciones.kindModel3d',
};
