import { LIMITES_DE_TRANSFORMACION, TransformacionDeImagen, transformacionValida } from '../../core/media/proceso';

/**
 * PLAN DE VARIANTES DE IMAGEN — el optimizador de medios de Weë, versión 1.
 *
 * ── Qué decide ──────────────────────────────────────────────────────────────
 *
 * Para un material de imagen y un uso concreto, si merece existir un derivado y
 * cómo: formato, dimensión máxima (lado largo), calidad y si se conserva el
 * original. Lo que sale son variantes ya en la forma que acepta el contrato de
 * procesamiento (`Transformacion`), y omisiones con su motivo.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *
 * No abre ningún fichero, no llama a ningún procesador, no escribe nada, no cobra
 * y no conoce Credits. Quien ejecuta cada variante es el procesador que ya existe
 * (media/procesador.ts) a través del ejecutor de medios (media/proceso.ts). Este
 * módulo solo dice QUÉ derivado merece existir.
 *
 * ── Formatos ────────────────────────────────────────────────────────────────
 *
 * Solo los que el procesador produce de verdad: WebP, JPEG y PNG, los del
 * contrato. AVIF no existe en el procesador y no se declara.
 *
 * ── Una variante por uso, y por qué no hay más ─────────────────────────────
 *
 * Cada llamada resuelve un único uso. Los usos `perfil` y `vista_previa` producen
 * el mismo tipo de derivado (`thumbnail`), y la ficha del material (`anotarVariante`)
 * admite una variante por tipo: la última sobrescribe a la anterior en la ficha,
 * aunque los bytes de cada una siguen existiendo en piezas distintas.
 */

/** Versión del plan. Si cambia, cambia la identidad de cualquier derivado que se calcule con él. */
export const VERSION_DEL_PLAN_DE_IMAGEN = 1;

/** Los usos que el plan conoce. `original` no produce ningún derivado. */
export const USOS_DE_IMAGEN = Object.freeze(['muro', 'perfil', 'vista_previa', 'visualizacion', 'original'] as const);
export type UsoDeImagen = (typeof USOS_DE_IMAGEN)[number];

/** Los formatos de salida que el procesador soporta: los del contrato, ni uno más. */
export const FORMATOS_DE_IMAGEN = LIMITES_DE_TRANSFORMACION.formatos;
export type FormatoDeImagen = (typeof FORMATOS_DE_IMAGEN)[number];

/** Los MIME de origen que el plan admite. GIF, HEIC, AVIF y SVG quedan fuera en la versión 1. */
export const MIMES_DE_ORIGEN_DE_IMAGEN: readonly string[] = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

/**
 * El destino de cada uso: tipo de derivado del contrato, lado largo máximo y calidad.
 * PROVISIONAL: valores de partida del plan v1, pendientes de validación por el dueño.
 */
export interface DestinoDeImagen {
  readonly tipo: 'thumbnail' | 'preview' | 'transcoded';
  readonly dimensionMaxima: number;
  readonly calidad: number;
}

export const DESTINO_DE_CADA_USO: Readonly<Record<Exclude<UsoDeImagen, 'original'>, DestinoDeImagen>> = Object.freeze({
  muro: { tipo: 'preview', dimensionMaxima: 1080, calidad: 80 },
  perfil: { tipo: 'thumbnail', dimensionMaxima: 512, calidad: 85 },
  vista_previa: { tipo: 'thumbnail', dimensionMaxima: 400, calidad: 75 },
  visualizacion: { tipo: 'transcoded', dimensionMaxima: 2048, calidad: 90 },
});

/** Lo que el plan recibe. Son datos del material, nunca lo que mande un cliente sin validar. */
export interface EntradaDePlanDeImagen {
  /** `image` para una imagen. Cualquier otro tipo queda fuera: no hay procesador de vídeo ni de audio. */
  tipo: string;
  mime: string;
  ancho: number;
  alto: number;
  alfa: boolean;
  bytes: number;
  uso: string;
  /** Una imagen animada perdería la animación al derivarla. Lo aporta quien llama. */
  animado?: boolean;
  /** Preferencia de formato. Por defecto, WebP. */
  formato?: FormatoDeImagen;
}

/** Por qué no sale una variante. Son motivos estables: quien llama los puede leer sin interpretar texto. */
export type MotivoDeOmision =
  /** El uso pide el original tal cual: no hay derivado. */
  | 'original'
  /** El lado largo del origen ya cabe en la dimensión máxima del uso: no hay nada que reducir. */
  | 'cabe_en_destino'
  /** El procesador solo hace imágenes. Vídeo y audio siguen bloqueados por dependencia. */
  | 'tipo_no_soportado'
  /** Un MIME que la versión 1 no deriva (GIF, HEIC, AVIF, SVG…). */
  | 'mime_no_admitido'
  /** Una imagen animada perdería la animación. */
  | 'animado_no_admitido'
  /** Por encima del tope de origen del contrato de procesamiento. */
  | 'origen_demasiado_grande'
  /** Un JPEG no conserva el alfa: no se convierte un origen con transparencia. */
  | 'formato_incompatible_con_alfa'
  /** Un uso que el plan no conoce. */
  | 'uso_desconocido'
  /** Dimensiones, bytes, formato o marcas que no tienen sentido. Falla cerrado. */
  | 'entrada_invalida';

/** Un derivado que merece existir, ya en la forma del contrato de procesamiento. */
export interface VarianteDePlan {
  uso: Exclude<UsoDeImagen, 'original'>;
  tipo: DestinoDeImagen['tipo'];
  formato: FormatoDeImagen;
  dimensionMaxima: number;
  calidad: number;
  conservaAlfa: boolean;
  transformacion: TransformacionDeImagen;
}

export interface OmisionDePlan {
  uso: string;
  motivo: MotivoDeOmision;
}

/** El resultado. El original se conserva siempre: el plan nunca pide sobrescribirlo ni borrarlo. */
export interface PlanDeImagen {
  version: typeof VERSION_DEL_PLAN_DE_IMAGEN;
  conservaOriginal: true;
  variantes: readonly VarianteDePlan[];
  omitidas: readonly OmisionDePlan[];
}

const planDe = (variantes: VarianteDePlan[], omitidas: OmisionDePlan[]): PlanDeImagen => ({
  version: VERSION_DEL_PLAN_DE_IMAGEN,
  conservaOriginal: true,
  variantes: Object.freeze(variantes),
  omitidas: Object.freeze(omitidas),
});

const sinVariante = (uso: string, motivo: MotivoDeOmision): PlanDeImagen => planDe([], [{ uso, motivo }]);

const esUsoConocido = (uso: unknown): uso is UsoDeImagen =>
  typeof uso === 'string' && (USOS_DE_IMAGEN as readonly string[]).includes(uso);

const esEnteroPositivo = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const esEnteroNoNegativo = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/** La entrada tiene la forma que el plan necesita. Cualquier duda cuenta como inválida. */
const entradaValida = (e: EntradaDePlanDeImagen): boolean =>
  typeof e.mime === 'string'
  && typeof e.alfa === 'boolean'
  && (e.animado === undefined || typeof e.animado === 'boolean')
  && esEnteroPositivo(e.ancho)
  && esEnteroPositivo(e.alto)
  && esEnteroNoNegativo(e.bytes)
  && (e.formato === undefined || (FORMATOS_DE_IMAGEN as readonly string[]).includes(e.formato));

/**
 * ¿QUÉ DERIVADOS MERECE TENER ESTE MATERIAL PARA ESTE USO?
 *
 * Pura y determinista: la misma entrada produce siempre la misma salida. Las
 * comprobaciones van de lo más fundamental a lo más concreto, y el primer motivo
 * que aparece es el que se devuelve.
 */
export const planificarVariantesDeImagen = (entrada: EntradaDePlanDeImagen): PlanDeImagen => {
  if (!entrada || typeof entrada !== 'object') return sinVariante('', 'entrada_invalida');
  const uso = entrada.uso;
  if (!esUsoConocido(uso)) return sinVariante(String(uso), 'uso_desconocido');
  if (uso === 'original') return sinVariante(uso, 'original');
  if (entrada.tipo !== 'image') return sinVariante(uso, 'tipo_no_soportado');
  if (!entradaValida(entrada)) return sinVariante(uso, 'entrada_invalida');
  if (!(MIMES_DE_ORIGEN_DE_IMAGEN as readonly string[]).includes(entrada.mime)) return sinVariante(uso, 'mime_no_admitido');
  if (entrada.animado === true) return sinVariante(uso, 'animado_no_admitido');
  if (entrada.bytes > LIMITES_DE_TRANSFORMACION.maxBytesDeOrigen) return sinVariante(uso, 'origen_demasiado_grande');

  const destino = DESTINO_DE_CADA_USO[uso];
  if (Math.max(entrada.ancho, entrada.alto) <= destino.dimensionMaxima) return sinVariante(uso, 'cabe_en_destino');

  const formato: FormatoDeImagen = entrada.formato ?? 'webp';
  if (entrada.alfa && formato === 'jpeg') return sinVariante(uso, 'formato_incompatible_con_alfa');

  /* El lado largo es la dimensión máxima: la caja es cuadrada y `dentro` no amplía. */
  const transformacion: TransformacionDeImagen = {
    tipo: destino.tipo,
    ancho: destino.dimensionMaxima,
    alto: destino.dimensionMaxima,
    ajuste: 'dentro',
    formato,
    calidad: destino.calidad,
  };
  /* El contrato es la última palabra: si la forma no es válida, no se pide nada. */
  if (!transformacionValida(transformacion)) return sinVariante(uso, 'entrada_invalida');

  return planDe([{
    uso,
    tipo: destino.tipo,
    formato,
    dimensionMaxima: destino.dimensionMaxima,
    calidad: destino.calidad,
    conservaAlfa: entrada.alfa,
    transformacion,
  }], []);
};
