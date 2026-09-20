import { Asset, AssetKind, AssetVariant, StorageRef, VariantKind, esStorageRef, materialEsDeLaCuenta } from '../content/asset';
import { Huella } from '../moderation';
import { MediaObject } from './objeto';

/**
 * WEE MEDIA — PROCESAR: DE UN MATERIAL SALE OTRO, Y SE SABE DE CUÁL.
 *
 * ── Qué decide esto ─────────────────────────────────────────────────────────
 *
 * Qué derivado se puede pedir de un material, con qué límites, cómo se llama y
 * dónde va a quedar. No transforma un solo byte: transformar es del procesador,
 * y el procesador vive detrás de un puerto.
 *
 *     Asset (F11)      →  QUÉ es y de quién es       ← Source of Truth
 *     esto             →  ¿qué derivado, y con qué límites?
 *     Job Engine (F8)  →  CUÁNDO y cuántas veces     ← el motor que ya hay
 *     el procesador    →  los bytes nuevos
 *     AssetVariant     →  la relación origen → derivado ← la de F11, no otra
 *
 * ── Lo que NO se inventa aquí ───────────────────────────────────────────────
 *
 * Ni un modelo de variantes —`AssetVariant` y `VariantKind` son de la Fase 11 y
 * se usan tal cual—, ni un motor de trabajos —F8 admite tareas generales desde
 * la Fase 11, y su propio código lo dice: «no hay un segundo motor, hay un
 * segundo tipo de paquete»—, ni una cola, ni un trabajador, ni una política de
 * reintentos. Todo eso existe. Esto solo aporta la petición, el paquete y cómo
 * se lee el resultado.
 *
 * Todo lo de este archivo es PURO: sin red, sin Firestore, sin reloj propio y
 * sin ningún proveedor ni librería concreta dentro.
 */

/* ── 1 · Qué sabe hacer un procesador ──────────────────────────────────────── */

/**
 * LAS CAPACIDADES DE PROCESO. Declaradas todas; implementadas las que haya.
 *
 * Están escritas enteras para que el registro pueda describir lo que vendrá,
 * pero **declarar no es implementar**: un procesador solo anuncia las que sabe
 * hacer de verdad, y el registro contesta que no puede a todo lo demás. Es la
 * misma regla que el almacenamiento, y existe para no prometer nunca una
 * capacidad que no está.
 */
export type CapacidadDeProceso =
  /* Implementadas en MC-4. */
  | 'image.thumbnail'
  | 'image.preview'
  | 'image.variant'
  /* Declaradas; sin implementación todavía. */
  | 'video.poster'
  | 'video.preview'
  | 'video.variant'
  | 'audio.preview'
  | 'audio.variant'
  | 'document.preview';

/** Las que MC-4 implementa de verdad. Lo demás se describe, no se promete. */
export const CAPACIDADES_DE_MC4: readonly CapacidadDeProceso[] = Object.freeze([
  'image.thumbnail', 'image.preview', 'image.variant',
] as const);

/* ── 2 · Qué se puede pedir ────────────────────────────────────────────────── */

/**
 * LOS TOPES. Pequeños a propósito.
 *
 * Un derivado existe para verse rápido o para pesar menos, no para ser otro
 * original. Y el tope de cuántos caben en una petición es lo que impide que
 * alguien pida diez mil miniaturas de una sentada: no hay combinación explosiva
 * posible si el número está acotado desde el principio.
 */
export const LIMITES_DE_TRANSFORMACION = Object.freeze({
  minLado: 16,
  maxLado: 4_096,
  minCalidad: 40,
  maxCalidad: 95,
  /** El instante del que se saca un póster, en segundos. */
  maxSegundo: 36_000,
  /** Cuántos derivados caben en UNA petición. */
  maxPorPeticion: 4,
  /** Lo más grande que se acepta procesar. Más que esto es de otra fase. */
  maxBytesDeOrigen: 64 * 1024 * 1024,
  formatos: Object.freeze(['jpeg', 'webp', 'png'] as const),
  ajustes: Object.freeze(['cover', 'contain', 'dentro'] as const),
});

export type FormatoDeSalida = (typeof LIMITES_DE_TRANSFORMACION.formatos)[number];
export type AjusteDeImagen = (typeof LIMITES_DE_TRANSFORMACION.ajustes)[number];

/** Redimensionar: la miniatura, la previsualización y la versión ligera. */
export interface TransformacionDeImagen {
  tipo: Extract<VariantKind, 'thumbnail' | 'preview' | 'transcoded'>;
  ancho: number;
  alto: number;
  ajuste: AjusteDeImagen;
  formato: FormatoDeSalida;
  calidad: number;
}

/** El fotograma de un vídeo. Declarado; sin procesador que lo haga todavía. */
export interface TransformacionDePoster {
  tipo: Extract<VariantKind, 'poster'>;
  segundo: number;
  ancho: number;
  alto: number;
  formato: FormatoDeSalida;
}

export type Transformacion = TransformacionDeImagen | TransformacionDePoster;

/** Los campos EXACTOS de cada forma. Nada más entra, y por eso no hay anidamiento que abusar. */
const CAMPOS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  imagen: Object.freeze(['tipo', 'ancho', 'alto', 'ajuste', 'formato', 'calidad']),
  poster: Object.freeze(['tipo', 'segundo', 'ancho', 'alto', 'formato']),
});

const enteroEntre = (v: unknown, min: number, max: number): boolean =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * ¿ES ESTO UNA TRANSFORMACIÓN QUE SE PUEDE PEDIR?
 *
 * Estricta a conciencia: el conjunto de claves tiene que ser EXACTAMENTE el
 * esperado. Eso es lo que hace imposible colar un objeto profundo, un campo
 * inventado o una orden disfrazada de parámetro — no hay por dónde, porque lo
 * que no está en la lista hace que la petición entera no valga.
 *
 * Y lo que se acepta son números enteros acotados y palabras de una lista
 * cerrada. Nunca una cadena libre, nunca una ruta, nunca algo que pueda
 * parecerse a un comando.
 */
export const transformacionValida = (t: unknown): t is Transformacion => {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return false;
  const o = t as Record<string, unknown>;
  const { minLado, maxLado, minCalidad, maxCalidad, maxSegundo, formatos, ajustes } = LIMITES_DE_TRANSFORMACION;

  if (typeof o.formato !== 'string' || !(formatos as readonly string[]).includes(o.formato)) return false;
  if (!enteroEntre(o.ancho, minLado, maxLado) || !enteroEntre(o.alto, minLado, maxLado)) return false;

  if (o.tipo === 'poster') {
    if (Object.keys(o).sort().join(',') !== [...CAMPOS.poster].sort().join(',')) return false;
    return enteroEntre(o.segundo, 0, maxSegundo);
  }
  if (o.tipo !== 'thumbnail' && o.tipo !== 'preview' && o.tipo !== 'transcoded') return false;
  if (Object.keys(o).sort().join(',') !== [...CAMPOS.imagen].sort().join(',')) return false;
  if (typeof o.ajuste !== 'string' || !(ajustes as readonly string[]).includes(o.ajuste)) return false;
  return enteroEntre(o.calidad, minCalidad, maxCalidad);
};

/** Cuántas caben, y que ninguna se repita. Una lista con la misma dos veces es una sola. */
export const transformacionesValidas = (v: unknown): v is readonly Transformacion[] =>
  Array.isArray(v) && v.length > 0 && v.length <= LIMITES_DE_TRANSFORMACION.maxPorPeticion
  && v.every(transformacionValida);

/* ── 3 · Qué capacidad hace falta ──────────────────────────────────────────── */

/** De qué familia es un material, para saber a quién pedirle el derivado. */
const FAMILIA: Readonly<Partial<Record<AssetKind, string>>> = Object.freeze({
  image: 'image', video: 'video', audio: 'audio', document: 'document',
});

/**
 * LA CAPACIDAD QUE PIDE ESTA TRANSFORMACIÓN SOBRE ESTE MATERIAL.
 *
 * Sale de las dos cosas a la vez, y tiene que ser así: una previsualización de
 * una imagen y una de un vídeo no las hace el mismo procesador, aunque se
 * llamen igual.
 */
export const capacidadDeProceso = (kind: AssetKind, t: Transformacion): CapacidadDeProceso | undefined => {
  const familia = FAMILIA[kind];
  if (!familia) return undefined;
  if (t.tipo === 'poster') return familia === 'video' ? 'video.poster' : undefined;
  if (t.tipo === 'thumbnail') return familia === 'image' ? 'image.thumbnail' : undefined;
  if (t.tipo === 'preview') return `${familia}.preview` as CapacidadDeProceso;
  return `${familia}.variant` as CapacidadDeProceso;
};

/**
 * EL NOMBRE DE LA TAREA PARA EL JOB ENGINE.
 *
 * `media.thumbnail`, `media.poster`… La forma la exige F8 (`FORMA_DE_TAREA`) y
 * el nombre lo anticipó la Fase 11 en su propio código. No es una capacidad de
 * IA y no puede estar en aquel catálogo: es una tarea general, que es
 * exactamente el segundo tipo de paquete que el motor ya sabe llevar.
 */
export const NOMBRE_DE_TAREA_DE_MEDIOS = (t: Transformacion): string => `media.${t.tipo}`;

/* ── 4 · La identidad del derivado ─────────────────────────────────────────── */

/**
 * LA FORMA CANÓNICA DE UNA TRANSFORMACIÓN. Sin JSON, y por un motivo.
 *
 * `JSON.stringify` depende del orden en que alguien escribió las claves, así
 * que la MISMA transformación escrita de dos maneras daría dos identidades y
 * dos derivados idénticos pagados dos veces. Esto escribe los campos en un
 * orden fijo, y solo los que significan algo: dos peticiones equivalentes dan
 * la misma cadena, carácter a carácter.
 */
export const canonizarTransformacion = (t: Transformacion): string =>
  t.tipo === 'poster'
    ? `poster|${t.ancho}x${t.alto}|${t.formato}|t${t.segundo}`
    : `${t.tipo}|${t.ancho}x${t.alto}|${t.ajuste}|${t.formato}|q${t.calidad}`;

export const FORMA_DE_VARIANTE = /^var_[0-9a-f]{16}$/;

/**
 * LA IDENTIDAD DE UN DERIVADO: su origen y su transformación, y nada más.
 *
 * Determinista, así que pedir dos veces la misma miniatura del mismo material
 * pide LA MISMA, y un reintento del Job Engine converge en vez de dejar
 * `thumbnail_1`, `thumbnail_2` y `thumbnail_3`.
 *
 * ── Por qué el origen basta para fijar la versión ───────────────────────────
 *
 * Porque en Weë una versión nueva de un material es OTRO material —la Fase 11
 * lo enlaza con `previousVersionId`— y porque el objeto de un material es de
 * una sola escritura desde MC-3. Así que el identificador del origen ya dice de
 * qué bytes se partió: una variante no puede convertirse en la de otra versión,
 * porque la otra versión tiene otro identificador y por tanto otra variante.
 */
export const identidadDeVariante = (huella: Huella, sourceAssetId: string, t: Transformacion): string | undefined => {
  if (typeof sourceAssetId !== 'string' || !sourceAssetId || !transformacionValida(t)) return undefined;
  const hex = huella(`variante|${sourceAssetId}|${canonizarTransformacion(t)}`);
  if (typeof hex !== 'string' || !/^[0-9a-f]{16,}$/.test(hex)) return undefined;
  return `var_${hex.slice(0, 16)}`;
};

/**
 * LA PIEZA DONDE VIVEN SUS BYTES. Entra en la clave del objeto de MC-1.
 *
 * `claveDelObjeto(cuenta, material, pieza)` ya admitía una pieza desde MC-1 y
 * su comentario ya decía para qué: `original`, `thumbnail`, `poster`… Esto la
 * rellena, y le pega el resumen de la transformación para que dos miniaturas de
 * tamaños distintos no compartan sitio.
 */
export const piezaDeVariante = (huella: Huella, t: Transformacion): string | undefined => {
  if (!transformacionValida(t)) return undefined;
  const hex = huella(`pieza|${canonizarTransformacion(t)}`);
  if (typeof hex !== 'string' || !/^[0-9a-f]{12,}$/.test(hex)) return undefined;
  return `${t.tipo}_${hex.slice(0, 12)}`;
};

/* ── 5 · El paquete que viaja en el trabajo ────────────────────────────────── */

/**
 * LO QUE EL TRABAJO LLEVA DENTRO. Referencias, nunca bytes.
 *
 * Un paquete de trabajo se guarda, se reintenta y se lee meses después: meter
 * ahí un archivo sería llenar la base de datos de vídeo. Lleva de dónde, a
 * dónde y qué hacer — y quien ejecuta va a buscar los bytes.
 */
export interface PaqueteDeProceso {
  accountId: string;
  sourceAssetId: string;
  variantId: string;
  origen: StorageRef;
  destino: StorageRef;
  transformacion: Transformacion;
}

/**
 * LEER EL PAQUETE DE UN TRABAJO. Desconfiando, porque viene de un documento.
 *
 * Lo que llega aquí estuvo guardado y pudo escribirlo una versión anterior del
 * código. Se comprueba entero o no se ejecuta: un paquete que no se entiende es
 * un trabajo que falla, no un trabajo que improvisa.
 */
export const leerPaqueteDeProceso = (v: unknown): PaqueteDeProceso | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.accountId !== 'string' || !o.accountId) return undefined;
  if (typeof o.sourceAssetId !== 'string' || !o.sourceAssetId) return undefined;
  if (typeof o.variantId !== 'string' || !FORMA_DE_VARIANTE.test(o.variantId)) return undefined;
  if (!esStorageRef(o.origen) || !esStorageRef(o.destino)) return undefined;
  if (!transformacionValida(o.transformacion)) return undefined;
  /*
   * ORIGEN Y DESTINO PUEDEN SER DE PROVEEDORES DISTINTOS, y el contrato no lo
   * impide a propósito. Weë Media Cloud es agnóstico del proveedor: R2 es el
   * primero implementado, no la arquitectura. Estos tres casos tienen que caber
   * sin tocar el Core el día que existan:
   *
   *     R2     → procesador A → R2
   *     R2     → procesador B → Qiniu
   *     Qiniu  → procesador C → Alibaba OSS
   *
   * Almacenar, transformar y entregar son capacidades independientes: un mismo
   * proveedor puede implementar varias, pero ninguna capa del Core puede dar
   * por hecho que son el mismo.
   */
  return {
    accountId: o.accountId,
    sourceAssetId: o.sourceAssetId,
    variantId: o.variantId,
    origen: o.origen as StorageRef,
    destino: o.destino as StorageRef,
    transformacion: o.transformacion,
  };
};

/* ── 6 · La decisión ───────────────────────────────────────────────────────── */

export type MotivoDeProceso = 'no_disponible' | 'peticion_invalida';

export type DetalleDeProceso =
  | 'transformaciones'
  | 'sin_material'
  | 'no_es_tuyo'
  | 'material_no_listo'
  | 'material_sin_objeto'
  | 'sin_ficha'
  | 'ficha_borrada'
  | 'sin_procesador'
  | 'sin_capacidad'
  | 'tipo_no_admitido'
  | 'origen_demasiado_grande';

/** Un derivado aprobado, con todo lo necesario para pedirlo. */
export interface DerivadoAprobado {
  transformacion: Transformacion;
  capacidad: CapacidadDeProceso;
  variantId: string;
  pieza: string;
  tarea: string;
}

export type DecisionDeProceso =
  | { permitida: true; derivados: readonly DerivadoAprobado[] }
  | { permitida: false; motivo: MotivoDeProceso; detalle: DetalleDeProceso };

/** De qué estados se puede derivar algo: de uno que tenga bytes completos. */
export const ESTADOS_PROCESABLES: readonly Asset['status'][] = Object.freeze(['ready', 'processing'] as const);

export interface PeticionDeDecisionDeProceso {
  /** La cuenta YA resuelta en el servidor. Nunca lo que mande un cliente. */
  accountId: string;
  material: Asset | undefined;
  objeto: MediaObject | undefined;
  transformaciones: unknown;
  /** Qué sabe hacer el procesador elegido. */
  capacidadesDelProcesador: readonly CapacidadDeProceso[];
  huella: Huella;
}

/**
 * ¿PUEDE ESTA CUENTA DERIVAR ESTO, Y CÓMO SE VA A LLAMAR CADA DERIVADO?
 *
 * Estructural, sobre datos ya leídos. Primero lo que se puede contestar sin
 * hablar del material —si lo pedido cabe y tiene forma—, y a partir de ahí todo
 * lo que falla contesta lo mismo, como en la entrega y en la subida.
 */
export const decidirProceso = (p: PeticionDeDecisionDeProceso): DecisionDeProceso => {
  if (!transformacionesValidas(p.transformaciones)) {
    return { permitida: false, motivo: 'peticion_invalida', detalle: 'transformaciones' };
  }
  const no = (detalle: DetalleDeProceso): DecisionDeProceso => ({ permitida: false, motivo: 'no_disponible', detalle });

  if (typeof p.accountId !== 'string' || !p.accountId) return no('no_es_tuyo');
  if (!p.material) return no('sin_material');
  if (!materialEsDeLaCuenta(p.material, p.accountId)) return no('no_es_tuyo');
  if (!ESTADOS_PROCESABLES.includes(p.material.status)) return no('material_no_listo');
  if (!p.material.storageRef) return no('material_sin_objeto');
  if (!p.objeto) return no('sin_ficha');
  if (p.objeto.estado !== 'guardado') return no('ficha_borrada');
  if (p.objeto.assetId !== p.material.assetId) return no('sin_ficha');
  if (p.objeto.bytes !== undefined && p.objeto.bytes > LIMITES_DE_TRANSFORMACION.maxBytesDeOrigen) {
    return no('origen_demasiado_grande');
  }
  if (!p.capacidadesDelProcesador?.length) return no('sin_procesador');

  const derivados: DerivadoAprobado[] = [];
  for (const t of p.transformaciones) {
    const capacidad = capacidadDeProceso(p.material.kind, t);
    if (!capacidad) return no('tipo_no_admitido');
    if (!p.capacidadesDelProcesador.includes(capacidad)) return no('sin_capacidad');
    const variantId = identidadDeVariante(p.huella, p.material.assetId, t);
    const pieza = piezaDeVariante(p.huella, t);
    if (!variantId || !pieza) return no('sin_procesador');
    derivados.push({ transformacion: t, capacidad, variantId, pieza, tarea: NOMBRE_DE_TAREA_DE_MEDIOS(t) });
  }
  return { permitida: true, derivados: Object.freeze(derivados) };
};

/* ── 7 · Del resultado a la variante de la Fase 11 ─────────────────────────── */

/**
 * LO QUE SE ANOTA EN EL MATERIAL. La `AssetVariant` de la Fase 11, tal cual.
 *
 * No hay un segundo modelo de variantes: hay el de F11, que ya tenía `kind`,
 * `storageRef`, tipo, tamaño y dimensiones, y que `anotarVariante` sabe escribir
 * reemplazando por `kind`. Esto solo compone.
 */
export const varianteDeResultado = (
  t: Transformacion,
  destino: StorageRef,
  medido: { contentType?: string; bytes?: number; ancho?: number; alto?: number; durationSec?: number },
): AssetVariant | undefined => {
  if (!transformacionValida(t) || !esStorageRef(destino)) return undefined;
  return {
    kind: t.tipo,
    storageRef: destino,
    ...(medido.contentType ? { mimeType: medido.contentType } : {}),
    ...(Number.isSafeInteger(medido.bytes) ? { bytes: medido.bytes } : {}),
    ...(Number.isSafeInteger(medido.ancho) ? { width: medido.ancho } : {}),
    ...(Number.isSafeInteger(medido.alto) ? { height: medido.alto } : {}),
    ...(Number.isFinite(medido.durationSec) ? { durationSec: medido.durationSec } : {}),
  };
};
