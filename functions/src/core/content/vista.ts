import { Asset, AssetStatus, AssetVariant, Provenance, StorageRef, VariantKind } from './asset';

/**
 * WEE CONTENT CORE — LO QUE UNA PERSONA VE DE UN MATERIAL.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * `asset.ts` describe el material como es POR DENTRO: su estado técnico, su
 * referencia al almacén, su procedencia completa, sus derivados. Eso está bien
 * y no se toca. El problema es lo que pasaba cuando alguien quería ENSEÑARLO.
 *
 * Hoy, en producción, cada cliente se lo inventa. `services/assetsService.ts`
 * decide por su cuenta qué estados son visibles, busca la miniatura recorriendo
 * `variants` a mano —con un `find` que devuelve lo mismo en las dos ramas, un
 * error que nadie ve— y `RejillaDeCreaciones` construye su clave de traducción
 * pegando trozos del estado interno: `creaciones.status${Capitalize(status)}`.
 * Eso significa que renombrar un estado del Core rompe la interfaz en silencio,
 * y que el segundo cliente que aparezca volverá a escribir las mismas reglas,
 * distintas.
 *
 * Esto es esa lógica, escrita UNA vez y en el sitio que le toca. Son funciones
 * puras sobre un material ya leído: no guardan nada, no consultan nada, no
 * añaden un campo a ningún documento y no obligan a migrar una sola ficha.
 *
 * ── La frase que lo resume ──────────────────────────────────────────────────
 *
 * El backend decide QUÉ es verdad; la interfaz decide CÓMO se dice. Aquí está
 * la frontera: estados semánticos y estables que una interfaz mapea a sus
 * textos, en lugar de textos de interfaz metidos en el backend.
 *
 * ── Y lo que NO hace ────────────────────────────────────────────────────────
 *
 * No entrega bytes, no firma URLs, no sabe de proveedores y no decide qué se
 * puede hacer con un material. Eso es de MC-2, del adaptador y de la puerta de
 * cuentas respectivamente, y ya existen.
 */

/* ── El estado, dicho para una persona ──────────────────────────────────────── */

/**
 * EL ESTADO VISIBLE. Cinco, y cubren los cinco internos sin ser los mismos.
 *
 *   llegando      los bytes están subiendo
 *   preparando    ya están; se hacen sus derivados
 *   disponible    se puede usar
 *   no_se_pudo    no llegó a estar
 *   retirado      su dueño lo quitó
 *
 * Hoy la correspondencia es uno a uno, y aun así merece existir: el día que el
 * Core distinga `uploading` de `uploading_resumable`, o añada `archived`, la
 * interfaz no se entera. Son dos vocabularios que cambian por razones
 * distintas, y esa es exactamente la razón de separarlos.
 *
 * Una interfaz mapea esto a sus textos —«Subiendo», «Preparando…», «Listo»,
 * «No se pudo procesar»— y a su i18n. Aquí no hay ni una frase: un estado que
 * se llamara «Listo» sería un texto de interfaz dentro del Core.
 */
export type EstadoVisible = 'llegando' | 'preparando' | 'disponible' | 'no_se_pudo' | 'retirado';

export const ESTADOS_VISIBLES: readonly EstadoVisible[] = Object.freeze([
  'llegando', 'preparando', 'disponible', 'no_se_pudo', 'retirado',
] as const);

const VISIBLE_DE: Readonly<Record<AssetStatus, EstadoVisible>> = Object.freeze({
  uploading: 'llegando',
  processing: 'preparando',
  ready: 'disponible',
  failed: 'no_se_pudo',
  deleted: 'retirado',
});

export const estadoVisible = (status: AssetStatus): EstadoVisible => VISIBLE_DE[status] ?? 'no_se_pudo';

/**
 * ¿Se le enseña a su dueño en una lista? Un material retirado, no. Los demás
 * sí: quien subió algo quiere ver que está subiendo, y quien vio fallar algo
 * quiere saber que falló. Ocultar lo que no está listo es lo que hace que una
 * galería parezca que perdió cosas.
 */
export const seListaAlDueno = (status: AssetStatus): boolean => status !== 'deleted';

/* ── De dónde salió ─────────────────────────────────────────────────────────── */

/**
 * EL ORIGEN, DEDUCIDO. No es un campo nuevo: se lee de lo que ya se guarda.
 *
 *   subido      lo trajo una persona
 *   generado    lo hizo una capacidad de Weë
 *   derivado    salió de otro material de la cuenta
 *
 * Se deduce a propósito, en vez de guardarse. Un campo más sería un campo que
 * puede contradecir a la procedencia, y que habría que rellenar hacia atrás en
 * todo lo que ya existe. La procedencia ya lo sabe: si hubo una capacidad, lo
 * generó Weë; si hubo material de partida, es un derivado; si no hay ninguna de
 * las dos cosas, lo subió alguien.
 *
 * El orden importa. Un derivado generado por IA es las dos cosas, y lo que una
 * persona necesita saber primero es que salió de otra cosa suya.
 */
export type OrigenDeMaterial = 'subido' | 'generado' | 'derivado';

export const origenDe = (a: Asset | undefined): OrigenDeMaterial => {
  const p = a?.provenance;
  if (p?.sourceAssetIds && p.sourceAssetIds.length > 0) return 'derivado';
  if (p?.capability) return 'generado';
  return 'subido';
};

/* ── Lo que se puede contar de cómo se hizo ─────────────────────────────────── */

/**
 * LA PROCEDENCIA, DEPURADA PARA CONTARLA.
 *
 * `Provenance` lleva dentro el proveedor, el identificador del modelo, el coste
 * real y una media docena de identificadores de operación. Nada de eso es de
 * quien usa Weë: el proveedor y el modelo son infraestructura que cambia sin
 * avisar, el coste es del libro y los identificadores son para investigar un
 * problema, no para leerlos.
 *
 * Lo que sí es suyo: que lo hizo Weë, qué clase de cosa se pidió, cuándo, y de
 * qué partió. Con eso una interfaz dice «Creado con Weë» y enseña el material
 * del que salió.
 *
 * Esto **es** la frontera del punto de seguridad: lo que pasa por aquí puede
 * llegar a un cliente; lo que no, no. Que sea un objeto nuevo y no un recorte
 * del original es deliberado — añadir un campo a `Provenance` no lo filtra.
 */
export interface GeneracionVisible {
  /** Lo hizo Weë, no lo trajo nadie de fuera. */
  hechoConWee: true;
  /** Qué clase de operación fue. Vocabulario de Weë, no de ningún proveedor. */
  capacidad?: string;
  /** De qué material salió. Identidades de Weë, que la interfaz puede resolver. */
  partioDe?: readonly string[];
  creadoEn: number;
}

export const generacionVisible = (p: Provenance | undefined): GeneracionVisible | undefined => {
  if (!p || !p.capability) return undefined;
  const partioDe = p.sourceAssetIds && p.sourceAssetIds.length > 0 ? p.sourceAssetIds : undefined;
  return {
    hechoConWee: true,
    capacidad: p.capability,
    ...(partioDe ? { partioDe } : {}),
    creadoEn: p.createdAt,
  };
};

/* ── Qué se enseña de él ────────────────────────────────────────────────────── */

/**
 * PARA QUÉ SE QUIERE EL ARCHIVO. Tres, y no hacen falta más.
 *
 *   miniatura   una rejilla, un listado, un adjunto pequeño
 *   vista       verlo sin descargarlo
 *   original    trabajar con él o guardárselo
 *
 * Una interfaz que pinta mil materiales **no puede** bajarse mil originales.
 * Esa es la razón de que esto exista y de que la miniatura sea lo primero.
 */
export type ProposicionDeUso = 'miniatura' | 'vista' | 'original';

/**
 * Qué derivado sirve para cada cosa, en orden de preferencia. Un póster vale de
 * miniatura de un vídeo; una vista previa vale de vista y, si no hay otra, de
 * miniatura. La versión transcodificada es una vista mejor que el original
 * cuando existe, porque para eso se hizo.
 */
const PREFERENCIA: Readonly<Record<ProposicionDeUso, readonly VariantKind[]>> = Object.freeze({
  miniatura: Object.freeze(['thumbnail', 'poster', 'preview'] as VariantKind[]),
  vista: Object.freeze(['preview', 'transcoded', 'poster'] as VariantKind[]),
  original: Object.freeze([] as VariantKind[]),
});

/**
 * QUÉ OBJETO SE ENSEÑA. Una referencia de almacén, no una URL.
 *
 * Aquí no se firma nada ni se construye ninguna dirección: eso es de MC-2, que
 * es quien sabe de proveedores y de caducidades. Esto solo contesta a «¿cuál de
 * los objetos de este material es el que quiero?», que es una decisión del
 * material y no del almacén.
 *
 * `esElOriginal` importa: una interfaz que ofrece «descargar» debe saber si lo
 * que va a dar es el archivo de verdad o un apaño.
 */
export interface Representacion {
  ref: StorageRef;
  esElOriginal: boolean;
  /** El derivado elegido, cuando no es el original. */
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

const delOriginal = (a: Asset): Representacion | undefined => a.storageRef ? {
  ref: a.storageRef,
  esElOriginal: true,
  ...(a.mimeType ? { mimeType: a.mimeType } : {}),
  ...(a.bytes !== undefined ? { bytes: a.bytes } : {}),
  ...(a.width !== undefined ? { width: a.width } : {}),
  ...(a.height !== undefined ? { height: a.height } : {}),
  ...(a.durationSec !== undefined ? { durationSec: a.durationSec } : {}),
} : undefined;

/**
 * El mejor objeto para lo que se quiere hacer, o nada si todavía no hay
 * ninguno. Un material retirado no ofrece ninguno: su ficha se queda, sus
 * objetos no.
 *
 * Para `original` se devuelve el original o nada — jamás un derivado: dar una
 * miniatura a quien pidió el archivo sería mentirle.
 */
export const representacionPara = (a: Asset | undefined, para: ProposicionDeUso): Representacion | undefined => {
  if (!a || a.status === 'deleted') return undefined;
  if (para === 'original') return delOriginal(a);
  for (const kind of PREFERENCIA[para] ?? []) {
    const v = (a.variants ?? []).find((x) => x.kind === kind);
    if (v) return deVariante(v);
  }
  return delOriginal(a);
};

/* ── Cómo se consigue ───────────────────────────────────────────────────────── */

/**
 * CÓMO SE LLEGA A LOS BYTES. Sin decir por dónde.
 *
 *   ninguna   todavía no hay objeto, o ya no lo hay
 *   firmada   hay que pedir una llave temporal (MC-2)
 *   directa   el material trae una dirección utilizable
 *
 * Existe porque hoy conviven dos caminos: lo de la Fase 11 guarda una dirección
 * con capacidad dentro de la propia ficha, y lo de MC-2/MC-3 no guarda ninguna
 * y firma cada vez. Un cliente que compruebe «¿tiene `delivery`?» está atado al
 * primero y se romperá con el segundo.
 *
 * Nótese lo que NO devuelve: una URL. Quién la da es la capa de entrega, y
 * pedirla es una operación con permiso, no un campo de lectura.
 */
export type ModoDeEntrega = 'ninguna' | 'firmada' | 'directa';

export const modoDeEntrega = (a: Asset | undefined, traeDireccionPropia = false): ModoDeEntrega => {
  if (!a || a.status === 'deleted') return 'ninguna';
  if (!a.storageRef) return a.kind === 'text' && typeof a.content === 'string' ? 'directa' : 'ninguna';
  return traeDireccionPropia ? 'directa' : 'firmada';
};

/* ── El material entero, como lo vería una interfaz ─────────────────────────── */

/**
 * LO QUE UNA INTERFAZ NECESITA SABER DE UN MATERIAL, Y NADA MÁS.
 *
 * Una proyección, no un documento: se calcula de un material ya leído y no se
 * guarda en ninguna parte. Fíjate en lo que no está: `storageRef`, `provider`,
 * `bucket`, `objectKey`, el coste, el modelo, los identificadores de trabajo.
 * Nada de eso es de quien mira sus cosas, y el día que se cambie de proveedor
 * nada de esto cambia — que es la prueba de que la abstracción es real.
 *
 * `nombre` puede faltar, y eso es correcto: quien pinta decide qué poner
 * entonces, porque un nombre por defecto es una frase, y las frases son de la
 * interfaz.
 */
export interface VistaDeMaterial {
  assetId: string;
  tipo: Asset['kind'];
  estado: EstadoVisible;
  origen: OrigenDeMaterial;
  nombre?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  tags?: readonly string[];
  /** Qué objeto enseñar para cada cosa. Referencias, no direcciones. */
  miniatura?: Representacion;
  vista?: Representacion;
  original?: Representacion;
  entrega: ModoDeEntrega;
  generacion?: GeneracionVisible;
  /** La versión anterior, cuando esto es una mejora de algo suyo. */
  vieneDe?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const vistaDeMaterial = (a: Asset, traeDireccionPropia = false): VistaDeMaterial => {
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
    entrega: modoDeEntrega(a, traeDireccionPropia),
    ...(generacion ? { generacion } : {}),
    ...(a.previousVersionId ? { vieneDe: a.previousVersionId } : {}),
    creadoEn: a.createdAt,
    actualizadoEn: a.updatedAt,
  };
};
