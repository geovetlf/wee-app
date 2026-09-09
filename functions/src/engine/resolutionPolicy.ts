/**
 * WEË RESOLUTION POLICY — una sola fuente de verdad para decidir el tamaño de una
 * imagen.
 *
 *   necesidad de la persona → política → rejilla del modelo → dimensiones finales
 *
 * REGLA FUNDAMENTAL, en una edición: la PROPORCIÓN de la imagen es la invariante
 * y la RESOLUCIÓN es la variable. Nunca se deforma, nunca se recorta y nunca se
 * convierte un 16:9 en 1:1 para alcanzar un número de píxeles. Si la proporción
 * de origen no cabe en la rejilla del modelo, la política dice que no puede en
 * vez de entregar algo distinto de lo que se pidió.
 *
 * Weë define la NECESIDAD; el modelo define CÓMO puede cumplirla. Por eso las
 * etiquetas del proveedor ("1K", "2K") no aparecen aquí: no significan lo mismo
 * en cada modelo, y confundirlas con la calidad de Weë fue el origen de varios
 * fallos de precio. Un "1K" en 16:9 son 1,27 megapíxeles, no uno.
 *
 * Este módulo es DELIBERADAMENTE AISLADO: no conoce precios, ni Credits, ni
 * proveedores, ni claves, ni Firestore, y no elige modelo. Solo responde a una
 * pregunta: «para esta necesidad y este modelo, ¿qué dimensiones salen?».
 */

/** Un megapíxel son 1024x1024 píxeles. */
export const MP_PIXELS = 1_048_576;

export type ImageQuality = 'standard' | 'high' | 'max';

/**
 * Lo que la persona necesita, no los píxeles que pide.
 *
 *   standard — compartir en Weë, redes y web: se ve bien en pantalla.
 *   high     — publicar, imprimir en pequeño, material de marketing: aguanta un recorte.
 *   max      — lo mejor que ese modelo puede dar para esa tarea.
 *
 * `max` no es un número: es el techo del modelo elegido. Fijarlo en una cifra
 * dejaría fuera del nivel máximo a modelos que topan antes (FLUX no pasa de 4 MP)
 * aunque sean lo mejor disponible para esa tarea.
 */
export const QUALITY_TARGET_MP: Record<Exclude<ImageQuality, 'max'>, number> = {
  standard: 1,
  high: 3,
};

/**
 * Para llamarse "máxima calidad" un modelo tiene que alcanzar al menos el
 * objetivo de calidad alta. Un modelo que tope por debajo no es el máximo de
 * nada: es insuficiente, y que lo diga es justo lo que evita degradar en
 * silencio la calidad que pidió la persona.
 */
const MAX_REQUIRES_MP = QUALITY_TARGET_MP.high;

/** Desviación máxima de la proporción para considerarla conservada: 0,5 %. */
const ASPECT_TOLERANCE = 0.005;

// ─────────────────────────── Rejilla de cada modelo ───────────────────────────

/**
 * Rejilla CONTINUA: el proveedor acepta cualquier medida dentro de unos límites,
 * normalmente en múltiplos de 16. Es el caso de FLUX y de Seedream.
 */
export interface ContinuousGrid {
  kind: 'continuous';
  minPixels: number;
  maxPixels: number;
  /** Mínimo por lado que exige el proveedor. */
  minSide: number;
  /** Las medidas se envían en múltiplos de este valor. */
  step: number;
  /** Proporción admitida, como ancho/alto. */
  minRatio: number;
  maxRatio: number;
}

/**
 * Rejilla DISCRETA: el proveedor solo acepta unas medidas concretas. Es el caso
 * de Gemini, que recibe un nivel y una proporción, no dimensiones libres.
 */
export interface DiscreteGrid {
  kind: 'discrete';
  sizes: { width: number; height: number }[];
  /** Qué queda sin documentar, para no inventar lo que no se ha verificado. */
  note?: string;
}

export type ModelGrid = ContinuousGrid | DiscreteGrid;

/**
 * Capacidades verificadas de cada modelo. Los límites salen de la documentación
 * oficial de cada proveedor, comprobada en septiembre de 2026:
 *   docs.bfl.ai y bfl.ai/pricing · docs.byteplus.com/en/docs/ModelArk/1541523
 *   ai.google.dev/gemini-api/docs/pricing
 *
 * Cada modelo trae SUS límites. No hay ninguno heredado ni compartido: el mínimo
 * de Seedream 5.0 lite (3 686 400) está casi pegado al máximo de FLUX (4 194 304),
 * así que tratarlos como una sola familia daría medidas inválidas en los dos.
 */
export const MODEL_GRIDS: Record<string, ModelGrid> = {
  // FLUX.2: mínimo 64 px por lado, máximo 4 MP de salida, sin límite de proporción declarado
  'flux-2-klein-9b': { kind: 'continuous', minPixels: 64 * 64, maxPixels: 4 * MP_PIXELS, minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 },
  'flux-2-pro': { kind: 'continuous', minPixels: 64 * 64, maxPixels: 4 * MP_PIXELS, minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 },

  // Seedream: el mínimo y el máximo son de píxeles TOTALES, y la proporción va aparte
  'seedream-4-0-250828': { kind: 'continuous', minPixels: 921_600, maxPixels: 16_777_216, minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 },
  'seedream-4-5-251128': { kind: 'continuous', minPixels: 3_686_400, maxPixels: 16_777_216, minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 },
  'seedream-5-0-lite-260128': { kind: 'continuous', minPixels: 3_686_400, maxPixels: 16_777_216, minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 },

  /*
   * Gemini recibe un nivel de resolución, no dimensiones libres. Solo se declaran
   * las medidas cuadradas que su documentación de precios enumera de forma
   * explícita (1K, 2K y 4K). Sus otras proporciones existen, pero sus píxeles
   * exactos NO están verificados: declararlos sería inventarlos, y la política
   * prefiere responder que no puede antes que enviar una medida supuesta.
   */
  'gemini-3.1-flash-lite-image': { kind: 'discrete', sizes: [{ width: 1024, height: 1024 }], note: 'Solo 1K documentado; otras proporciones sin verificar.' },
  'gemini-3.1-flash-image': {
    kind: 'discrete',
    sizes: [{ width: 1024, height: 1024 }, { width: 2048, height: 2048 }, { width: 4096, height: 4096 }],
    note: 'Proporciones distintas de 1:1 sin verificar en la documentación oficial.',
  },
  'gemini-3-pro-image': {
    kind: 'discrete',
    sizes: [{ width: 1024, height: 1024 }, { width: 2048, height: 2048 }, { width: 4096, height: 4096 }],
    note: 'Proporciones distintas de 1:1 sin verificar en la documentación oficial.',
  },
};

export const gridFor = (modelId: string): ModelGrid | undefined => MODEL_GRIDS[modelId];

// ─────────────────────────────── Proporciones ────────────────────────────────

/** Las proporciones con nombre que Weë ofrece. Una entrada cualquiera no tiene por qué usarlas. */
export const ASPECT_LABELS: Record<string, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '3:2': 3 / 2,
};

/**
 * Proporción de una imagen, como número. Se guarda el valor REAL, no una
 * categoría: una foto de 4032x3024 es exactamente 4:3, pero una de 4000x3000
 * recortada a mano puede no serlo, y forzarla a la etiqueta más cercana la
 * deformaría. El número exacto es la única representación que no miente.
 */
export const aspectOf = (width: number, height: number): number => width / height;

/** Nombre de la proporción si coincide con una de las de Weë; si no, undefined. */
export const aspectLabelOf = (ratio: number): string | undefined =>
  Object.keys(ASPECT_LABELS).find((label) => Math.abs(ASPECT_LABELS[label] - ratio) <= ASPECT_TOLERANCE);

/**
 * La etiqueta más cercana, para los proveedores que solo entienden etiquetas.
 *
 * La política resuelve medidas exactas —1168x880 conserva un 4:3 de origen—,
 * pero esa proporción no cae dentro de la tolerancia de `aspectLabelOf`, que es
 * estricta a propósito. Quien pide por etiqueta (Gemini, Seedream) se quedaba
 * entonces sin ninguna y caía al cuadrado, que es el peor de los redondeos
 * posibles: 1168x880 está a un 0,5 % de 4:3 y a un 33 % de 1:1 (fase 2E-60).
 *
 * Fuera del margen no devuelve nada: antes ninguna etiqueta que una que mienta.
 */
export const nearestAspectLabel = (ratio: number, tolerance = 0.03): string | undefined => {
  if (!Number.isFinite(ratio) || ratio <= 0) return undefined;
  let best: string | undefined;
  let bestError = Infinity;
  for (const [label, value] of Object.entries(ASPECT_LABELS)) {
    const error = Math.abs(value - ratio) / ratio;
    if (error < bestError) {
      bestError = error;
      best = label;
    }
  }
  return bestError <= tolerance ? best : undefined;
};

/** Acepta tanto "16:9" como el número, para que quien llame use lo que tenga. */
const ratioOf = (aspect: string | number | undefined): number | undefined => {
  if (typeof aspect === 'number') return Number.isFinite(aspect) && aspect > 0 ? aspect : undefined;
  if (typeof aspect === 'string') {
    if (ASPECT_LABELS[aspect]) return ASPECT_LABELS[aspect];
    const [w, h] = aspect.split(':').map(Number);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h;
  }
  return undefined;
};

// ──────────────────────────────── La decisión ────────────────────────────────

export interface ResolutionRequest {
  quality: ImageQuality;
  /** Rejilla del modelo que se está evaluando. */
  grid: ModelGrid;
  /** Solo para poder auditar el plan por sí mismo. */
  modelId?: string;
  /** EDICIÓN: dimensiones reales de la imagen de entrada. */
  input?: { width: number; height: number };
  /** GENERACIÓN: proporción pedida ("16:9" o el número). Por defecto 1:1. */
  aspect?: string | number;
  /**
   * Solo se pone a false cuando la operación cambia la composición a propósito.
   * Con una imagen de entrada, por defecto es true: no se deforma.
   */
  preserveAspectRatio?: boolean;
}

export interface ResolutionPlan {
  width: number;
  height: number;
  /** Píxeles totales. El redondeo a megapíxeles es regla de facturación de cada proveedor, no de esta política. */
  pixels: number;
  quality: ImageQuality;
  /** Lo que Weë pedía antes de ajustarlo a la rejilla. */
  targetPixels: number;
  /** Proporción real de la salida y la de origen, para poder comprobar que se conservó. */
  aspect: number;
  sourceAspect: number;
  /** La proporción de origen se conservó dentro de la tolerancia. */
  aspectExact: boolean;
  /** El modelo no puede bajar del objetivo y entrega de más. No es un nivel comercial mayor. */
  aboveTarget: boolean;
  modelId?: string;
  reason: string;
}

/** Píxeles objetivo de una necesidad en un modelo concreto. */
export function targetPixelsFor(quality: ImageQuality, grid: ModelGrid): number {
  if (quality === 'max') return maxPixelsOf(grid);
  return QUALITY_TARGET_MP[quality] * MP_PIXELS;
}

const maxPixelsOf = (grid: ModelGrid): number =>
  grid.kind === 'continuous' ? grid.maxPixels : Math.max(...grid.sizes.map((s) => s.width * s.height));

/**
 * ¿Este modelo puede cubrir esta necesidad?
 *
 * NO hay tolerancia: si no llega al objetivo, es insuficiente y se dice. Que otro
 * modelo pueda cumplirlo es decisión de la capa de selección, no de aquí. Un
 * modelo que se queda corto y entrega menos en silencio es exactamente lo que
 * esta política existe para impedir.
 *
 * Quedarse por ENCIMA del objetivo no es insuficiencia: un modelo que no puede
 * bajar de 4 MP sigue sirviendo una necesidad estándar, entregando de más.
 */
export function canServe(quality: ImageQuality, grid: ModelGrid): boolean {
  const techo = maxPixelsOf(grid);
  if (quality === 'max') return techo >= MAX_REQUIRES_MP * MP_PIXELS;
  return techo >= QUALITY_TARGET_MP[quality] * MP_PIXELS;
}

/** Candidatas de una rejilla continua: se recorre el lado alto en pasos del proveedor. */
const continuousCandidates = (grid: ContinuousGrid, ratio: number, target: number): { width: number; height: number }[] => {
  const out: { width: number; height: number }[] = [];
  const maxSide = Math.floor(Math.sqrt(grid.maxPixels * Math.max(ratio, 1 / ratio)));
  for (let height = grid.minSide; height <= maxSide; height += grid.step) {
    const width = Math.round((ratio * height) / grid.step) * grid.step;
    if (width < grid.minSide) continue;
    const pixels = width * height;
    if (pixels < grid.minPixels || pixels > grid.maxPixels) continue;
    const r = width / height;
    if (r < grid.minRatio || r > grid.maxRatio) continue;
    out.push({ width, height });
  }
  return out;
};

/**
 * Dimensiones que este modelo entregaría para esta necesidad, o null si no puede
 * cumplirla sin deformar. Función pura y determinista: las mismas entradas dan
 * siempre la misma salida.
 */
export function resolveDimensions(request: ResolutionRequest): ResolutionPlan | null {
  const { quality, grid, input } = request;
  const conservar = request.preserveAspectRatio ?? true;

  // De dónde sale la proporción: de la imagen si hay que conservarla, y si no de
  // la que pida la operación. Sin nada de eso, cuadrada.
  const desdeEntrada = input && input.width > 0 && input.height > 0 ? aspectOf(input.width, input.height) : undefined;
  const pedida = ratioOf(request.aspect);
  const sourceAspect = (conservar ? desdeEntrada ?? pedida : pedida ?? desdeEntrada) ?? 1;

  if (!canServe(quality, grid)) return null;

  const target = targetPixelsFor(quality, grid);

  const candidatas = grid.kind === 'continuous' ? continuousCandidates(grid, sourceAspect, target) : grid.sizes.filter((s) => s.width > 0 && s.height > 0);
  if (!candidatas.length) return null;

  /*
   * Se elige en dos escalones y en este orden, que es el que expresa la regla:
   *   1) la proporción más fiel a la de origen — la invariante;
   *   2) entre las que la conservan, la más cercana al objetivo de píxeles.
   * Con el desempate por medidas mayores el resultado es determinista aunque dos
   * candidatas queden a la misma distancia.
   */
  const puntuada = candidatas
    .map((c) => ({ ...c, pixels: c.width * c.height, error: Math.abs(c.width / c.height - sourceAspect) / sourceAspect }))
    .sort((a, b) => {
      const exactaA = a.error <= ASPECT_TOLERANCE ? 0 : 1;
      const exactaB = b.error <= ASPECT_TOLERANCE ? 0 : 1;
      if (exactaA !== exactaB) return exactaA - exactaB;
      if (exactaA === 1 && Math.abs(a.error - b.error) > 1e-9) return a.error - b.error;
      const distA = Math.abs(a.pixels - target);
      const distB = Math.abs(b.pixels - target);
      if (distA !== distB) return distA - distB;
      return b.pixels - a.pixels;
    });

  const elegida = puntuada[0];
  const aspectExact = elegida.error <= ASPECT_TOLERANCE;

  // Una rejilla discreta que no tiene la proporción de origen no se fuerza: se
  // dice que no puede. Deformar para llegar a un número nunca es la respuesta.
  if (!aspectExact && conservar && (desdeEntrada !== undefined || grid.kind === 'discrete')) return null;

  /*
   * "Entrega de más" significa que el modelo NO PUEDE bajar del objetivo, no que
   * la medida elegida se pase por unos píxeles de redondeo. Es el caso de
   * Seedream 5.0 lite, cuyo mínimo son 3,5 MP: sirve una necesidad estándar
   * entregando de más, y eso no lo convierte en un nivel comercial superior.
   */
  const suelo = grid.kind === 'continuous' ? grid.minPixels : Math.min(...grid.sizes.map((s) => s.width * s.height));
  const aboveTarget = suelo > target;
  const etiqueta = aspectLabelOf(sourceAspect);
  const reason = aboveTarget
    ? `el modelo no puede bajar del objetivo y entrega ${elegida.pixels} px`
    : `la medida más cercana al objetivo conservando ${etiqueta ?? sourceAspect.toFixed(4)}`;

  return {
    width: elegida.width,
    height: elegida.height,
    pixels: elegida.pixels,
    quality,
    targetPixels: target,
    aspect: elegida.width / elegida.height,
    sourceAspect,
    aspectExact,
    aboveTarget,
    modelId: request.modelId,
    reason,
  };
}

/** Atajo para cuando solo se tiene el id del modelo. */
export function resolveForModel(modelId: string, request: Omit<ResolutionRequest, 'grid' | 'modelId'>): ResolutionPlan | null {
  const grid = gridFor(modelId);
  if (!grid) return null;
  return resolveDimensions({ ...request, grid, modelId });
}
