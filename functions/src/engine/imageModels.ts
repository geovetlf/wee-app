import { CapabilityId } from '../creator/types';
import { canServe, gridFor } from './resolutionPolicy';

/**
 * ESCALERA DE MODELOS DE IMAGEN — qué modelo es el más barato que sirve.
 *
 * Módulo puro (no depende del router ni del Credit Engine) para que lo puedan
 * usar tanto el motor como el cálculo de precios sin importarse en círculo.
 *
 * Regla de producto: para una imagen sencilla, un post o un borrador se usa el
 * modelo más económico que dé un resultado adecuado. Los modelos caros se
 * reservan para lo que de verdad los necesita: texto dentro de la imagen,
 * conservar el rostro de una persona, identidad de marca o máxima resolución.
 *
 * Precios de lista oficiales verificados el 2026-09-07:
 *   docs.bfl.ai/quick_start/pricing · ai.google.dev/gemini-api/docs/pricing
 *   docs.byteplus.com/en/docs/ModelArk/1544106
 */

export type ImageTier = 'standard' | 'high' | 'max';
export type ImageSize = '512px' | '1K' | '2K' | '4K';

/**
 * Un megapíxel son 1024x1024 = 1 048 576 píxeles, NO un millón. Es la
 * definición oficial de Black Forest Labs (bfl.ai/pricing) y de ella depende
 * todo el cálculo: usar un millón daría de menos en cada operación.
 */
export const MP_PIXELS = 1_048_576;

/**
 * Megapíxeles facturables de una imagen. BFL redondea SIEMPRE hacia arriba y
 * por separado para cada referencia y para la salida, así que nunca es menos
 * de 1: "Resolution is rounded up to the next MP, separately for each
 * reference image and the generated output."
 */
export const mpOf = (width: number, height: number): number => Math.max(1, Math.ceil((width * height) / MP_PIXELS));

/**
 * Tarifa por megapíxel. Algunos proveedores no cobran por imagen sino por
 * píxeles procesados, y en una edición suman los de la imagen de entrada a los
 * de la salida. Un modelo que no declare esto se sigue cobrando con la tabla
 * `usd`/`usdEdit` de siempre.
 */
export interface MegapixelPricing {
  /** USD del primer megapíxel. */
  firstMp: number;
  /** USD de cada megapíxel a partir del segundo. */
  extraMp: number;
  /** Si las imágenes de entrada también se facturan (BFL: sí, en edición). */
  chargesInput: boolean;
  /** Tope de megapíxeles de salida que impone el proveedor. */
  maxOutputMp: number;
}

/**
 * Lo que se sabe del tamaño real de una operación al calcular su precio.
 *
 * LÍMITE CONOCIDO (se resuelve en la FASE 2C): hoy Weë no guarda las
 * dimensiones de la foto que sube la persona, así que `referenceSizes` llega
 * vacío en producción y cada referencia se cuenta como 1 MP. Eso NO es una
 * suposición: es la COTA INFERIOR exacta, porque BFL cobra como mínimo 1 MP
 * por referencia. Una foto de entrada mayor de 1 MP costará más de lo
 * estimado, y esa diferencia la absorbe Weë hasta la FASE 2C.
 */
export interface MpUsage {
  /** Dimensiones reales de la salida, cuando se conocen. */
  output?: { width: number; height: number };
  /** O directamente sus megapíxeles. */
  outputMp?: number;
  /** Cuántas imágenes de entrada lleva la operación. */
  references?: number;
  /** Dimensiones de cada referencia, cuando se conocen. */
  referenceSizes?: { width: number; height: number }[];
}

export const IMAGE_SIZE_ORDER: ImageSize[] = ['512px', '1K', '2K', '4K'];

export interface ImageModelSpec {
  provider: string;
  modelId: string;
  /** Nombre que ve la persona. Nunca se muestra el id del modelo. */
  label: string;
  tier: ImageTier;
  sizes: ImageSize[];
  /** USD por imagen y resolución. Si falta una, se usa la más cercana hacia abajo. */
  usd: Partial<Record<ImageSize, number>>;
  /** USD por imagen cuando la operación es una edición (algunos proveedores cobran más). */
  usdEdit?: Partial<Record<ImageSize, number>>;
  /**
   * Tarifa por megapíxel. Cuando está presente MANDA sobre `usd` y `usdEdit`,
   * que quedan solo como referencia del precio nominal a 1:1.
   */
  pricePerMp?: MegapixelPricing;
  canEdit: boolean;
  /** Escribe texto legible dentro de la imagen (logos, afiches, portadas). */
  rendersText: boolean;
  /** Conserva el rostro y los rasgos de una persona real. */
  keepsIdentity: boolean;
  maxReferences: number;
}

/** De más barato a más caro dentro de cada nivel. */
export const IMAGE_MODELS: ImageModelSpec[] = [
  {
    provider: 'flux',
    modelId: 'flux-2-klein-9b',
    label: 'Estándar',
    tier: 'standard',
    sizes: ['512px', '1K'],
    // Nominal a 1:1. El precio real lo calcula pricePerMp.
    usd: { '512px': 0.015, '1K': 0.015 },
    // bfl.ai/pricing, calculadora oficial: 1 MP $0.015 · 2 MP $0.017 · 4 MP $0.021.
    pricePerMp: { firstMp: 0.015, extraMp: 0.002, chargesInput: true, maxOutputMp: 4 },
    canEdit: true,
    rendersText: false,
    keepsIdentity: false,
    maxReferences: 4,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-3.1-flash-lite-image',
    label: 'Estándar',
    tier: 'standard',
    sizes: ['1K'],
    usd: { '1K': 0.0336 },
    canEdit: false,
    rendersText: false,
    keepsIdentity: false,
    maxReferences: 10,
  },
  {
    provider: 'seedream',
    modelId: 'seedream-4-0-250828',
    label: 'Estándar',
    tier: 'standard',
    // Su mínimo oficial son 921 600 píxeles, la cuarta parte del que exige el 5.0
    // lite, así que este sí puede entregar 1K y no obliga a subir a 2K.
    sizes: ['1K', '2K', '4K'],
    // Tarifa plana: la tabla oficial no parte el precio por resolución en este
    // modelo (solo el 5.0 pro tiene tramos). La imagen de entrada no se cobra.
    usd: { '1K': 0.03, '2K': 0.03, '4K': 0.03 },
    canEdit: true,
    rendersText: false,
    keepsIdentity: false,
    // La documentación admite hasta 14, igual que el 5.0 lite. Se declara el mismo
    // número que su hermano para no mover de sitio las tareas con referencias.
    maxReferences: 4,
  },
  {
    provider: 'seedream',
    modelId: 'seedream-5-0-lite-260128',
    label: 'Estándar',
    tier: 'standard',
    // Este modelo empieza en 2K: su mínimo oficial son 3 686 400 píxeles, así que 1K
    // no existe para él. Entregar 2K al precio del nivel estándar es intencional.
    sizes: ['2K'],
    usd: { '2K': 0.035 },
    canEdit: true,
    rendersText: false,
    keepsIdentity: false,
    maxReferences: 4,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-3.1-flash-image',
    label: 'Alta calidad',
    tier: 'high',
    sizes: ['512px', '1K', '2K', '4K'],
    usd: { '512px': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
    canEdit: true,
    rendersText: true,
    keepsIdentity: false,
    maxReferences: 14,
  },
  {
    provider: 'flux',
    modelId: 'flux-2-pro',
    label: 'Alta calidad',
    tier: 'high',
    sizes: ['1K', '2K'],
    // Nominales a 1:1. El precio real lo calcula pricePerMp.
    usd: { '1K': 0.03, '2K': 0.03 },
    usdEdit: { '1K': 0.045, '2K': 0.045 },
    // bfl.ai/pricing: 1 MP $0.030 · 2 MP $0.045 · 4 MP $0.075 · 5 MP $0.090.
    pricePerMp: { firstMp: 0.03, extraMp: 0.015, chargesInput: true, maxOutputMp: 4 },
    canEdit: true,
    rendersText: false,
    keepsIdentity: false,
    maxReferences: 8,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-3-pro-image',
    label: 'Máxima calidad',
    tier: 'max',
    sizes: ['1K', '2K', '4K'],
    usd: { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
    canEdit: true,
    rendersText: true,
    keepsIdentity: true,
    maxReferences: 6,
  },
];

export const imageModelOf = (modelId: string): ImageModelSpec | undefined => IMAGE_MODELS.find((m) => m.modelId === modelId);

/** Piezas donde el texto dentro de la imagen es parte del resultado. */
const TEXT_KINDS = new Set(['logo', 'poster', 'cover', 'business', 'campaign', 'identity']);
/** Piezas donde la persona debe reconocerse a sí misma. */
const IDENTITY_KINDS = new Set(['look', 'retouch', 'restore', 'identity']);

const EDIT_CAPS: CapabilityId[] = ['image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.upscale'];

export const isEditCapability = (capability: CapabilityId): boolean => EDIT_CAPS.includes(capability);

export interface ImageNeed {
  capability: CapabilityId;
  kind?: string;
  quality?: string;
  resolution?: string;
  references?: number;
  /**
   * La resolución la fijó el motor porque el modelo elegido no puede bajar de ahí,
   * no la pidió la persona. Cuando es así NO sube el nivel comercial: Seedream 5.0
   * lite empieza en 2K por diseño del proveedor y sigue siendo un modelo estándar.
   * Una resolución que sí pide la sección (o la persona) sigue subiendo el nivel.
   */
  resolutionFromEngine?: boolean;
}

/** Qué exige de verdad la tarea. De esto depende el modelo, no del gusto de cada sección. */
export function imageRequirements(need: ImageNeed): { text: boolean; identity: boolean; edit: boolean; size: ImageSize; tier: ImageTier; reason: string } {
  const kind = String(need.kind ?? '');
  const identity = need.capability === 'image.identity_edit' || IDENTITY_KINDS.has(kind);
  const text = TEXT_KINDS.has(kind);
  const edit = isEditCapability(need.capability);
  const asked = String(need.resolution ?? '') as ImageSize;
  const size: ImageSize = IMAGE_SIZE_ORDER.includes(asked) ? asked : need.quality === 'max' ? '2K' : '1K';

  let tier: ImageTier = 'standard';
  let reason = 'tarea sencilla: el modelo más económico da un resultado adecuado';
  if (need.quality === 'standard') {
    tier = 'standard';
    reason = 'se pidió calidad estándar';
  } else if (identity) {
    tier = 'max';
    reason = 'hay que conservar el rostro de la persona';
  } else if (need.quality === 'max') {
    tier = 'max';
    reason = 'se pidió la máxima calidad';
  } else if (text) {
    tier = 'high';
    reason = 'la imagen lleva texto legible dentro';
  } else if (need.quality === 'high') {
    tier = 'high';
    reason = 'se pidió alta calidad';
  } else if ((size === '2K' || size === '4K') && !need.resolutionFromEngine) {
    tier = 'high';
    reason = 'se pidió más resolución';
  }
  return { text, identity, edit, size, tier, reason };
}

export interface ImageChoice {
  model: ImageModelSpec;
  size: ImageSize;
  tier: ImageTier;
  reason: string;
}

/**
 * El modelo más barato del nivel que cumple lo que la tarea necesita.
 * `available` limita a los proveedores que tienen clave configurada; si no se
 * pasa, se consideran todos (para estimar precios antes de generar).
 */
/**
 * ¿Este modelo alcanza de verdad la calidad que se pide?
 *
 * La autoridad es la Weë Resolution Policy, no la etiqueta de tamaño de la
 * ficha. Un modelo sin rejilla declarada todavía no se descarta: se le sigue
 * dando el trato de siempre para no romper a nadie mientras se completan.
 */
const alcanzaLaCalidad = (model: ImageModelSpec, quality: ImageTier): boolean => {
  const grid = gridFor(model.modelId);
  return grid ? canServe(quality, grid) : true;
};

export function chooseImageModel(need: ImageNeed, available?: (provider: string) => boolean): ImageChoice {
  const req = imageRequirements(need);
  const order: ImageTier[] = req.tier === 'standard' ? ['standard', 'high', 'max'] : req.tier === 'high' ? ['high', 'max'] : ['max'];

  for (const tier of order) {
    const candidates = IMAGE_MODELS.filter((m) => m.tier === tier)
      .filter((m) => (available ? available(m.provider) : true))
      .filter((m) => (req.edit ? m.canEdit : true))
      .filter((m) => (req.text ? m.rendersText : true))
      .filter((m) => (req.identity ? m.keepsIdentity : true))
      .filter((m) => (need.references ? m.maxReferences >= need.references : true))
      /*
       * SIN DEGRADACIÓN SILENCIOSA. Un modelo que no llega a la calidad pedida
       * deja de ser candidato aquí mismo, en vez de elegirse y servirse luego a
       * menor resolución. Antes bastaba con ser el más barato del nivel: si no
       * tenía el tamaño pedido se cogía igual y nearestSize() lo bajaba en
       * silencio, así que quien pedía alta calidad podía recibir la estándar sin
       * enterarse. Ahora se sigue buscando en el nivel siguiente.
       */
      .filter((m) => alcanzaLaCalidad(m, tier))
      // Se ordena con el coste REAL de esta operación: para quien cobra por
      // megapíxel, editar cuesta más que crear porque suma la imagen de entrada.
      .sort((a, b) => usdFor(a, req.size, req.edit, { references: need.references }) - usdFor(b, req.size, req.edit, { references: need.references }));
    const fits = candidates.find((m) => m.sizes.includes(req.size)) || candidates[0];
    if (fits) {
      const size = fits.sizes.includes(req.size) ? req.size : nearestSize(fits, req.size);
      return { model: fits, size, tier, reason: tier === req.tier ? req.reason : `${req.reason} (sin proveedor en el nivel pedido)` };
    }
  }
  // Ningún proveedor con clave: se estima con la escalera ideal, para que el precio
  // que ve la persona sea el de producción y no el del último recurso.
  if (available) return chooseImageModel(need);
  const fallback = IMAGE_MODELS[IMAGE_MODELS.length - 1];
  return { model: fallback, size: nearestSize(fallback, req.size), tier: 'max', reason: req.reason };
}

/**
 * SIGUE EN USO, y a propósito, pero YA NO PUEDE DEGRADAR NADA.
 *
 * Las dimensiones reales las decide engine/resolutionPolicy.ts. Lo único que
 * devuelve esta función es la ETIQUETA con la que se busca la tarifa de los
 * modelos que cobran por imagen y no por megapíxel (Seedream y Gemini): su
 * precio vive en `usd[size]`. Quitarla rompería el precio de cinco modelos.
 *
 * Su antiguo defecto —bajar de tamaño en silencio cuando el modelo no alcanzaba
 * lo pedido— ya no puede darse: a esta función solo llegan modelos que han
 * pasado el filtro alcanzaLaCalidad(), es decir, que la política confirma que
 * SÍ pueden servir la calidad solicitada. La etiqueta que elija es entonces la
 * clave de precio de un modelo capaz, no una rebaja encubierta.
 */
const nearestSize = (model: ImageModelSpec, wanted: ImageSize): ImageSize => {
  if (model.sizes.includes(wanted)) return wanted;
  const target = IMAGE_SIZE_ORDER.indexOf(wanted);
  for (let i = target; i >= 0; i--) if (model.sizes.includes(IMAGE_SIZE_ORDER[i])) return IMAGE_SIZE_ORDER[i];
  return model.sizes[0];
};

/**
 * Megapíxeles de salida de cada nivel a 1:1. Hoy TODA imagen de Weë sale a 1:1:
 * ningún paso de imagen fija `aspectRatio` (solo los de vídeo lo hacen), así que
 * esto no es una suposición sino lo que realmente se envía. Cuando Weë ofrezca
 * proporciones habrá que pasar las dimensiones reales por `MpUsage.output`,
 * porque un 16:9 a 1K son 1,27 MP y redondean a 2.
 */
const NOMINAL_MP: Record<ImageSize, number> = { '512px': 1, '1K': 1, '2K': 4, '4K': 16 };

/** Precio por megapíxel, con la regla oficial de BFL para las referencias. */
const usdPerMp = (spec: MegapixelPricing, size: ImageSize, edit: boolean, usage?: MpUsage): number => {
  const pedido = usage?.output ? mpOf(usage.output.width, usage.output.height) : usage?.outputMp ?? NOMINAL_MP[size] ?? 1;
  const output = Math.min(pedido, spec.maxOutputMp);

  // Cuántas imágenes de entrada tiene de verdad la operación. Una edición lleva
  // siempre al menos la foto que se está editando; una creación desde cero, ninguna,
  // y entonces no se factura ninguna entrada por muchas medidas que lleguen.
  const refs = Math.max(usage?.references ?? 0, edit ? 1 : 0);
  let input = 0;
  if (spec.chargesInput && refs > 0) {
    const sizes = usage?.referenceSizes;
    if (sizes && sizes.length) {
      // Una sola referencia se cobra a su resolución real (con tope); varias,
      // exactamente 1 MP cada una, porque el proveedor las reduce a 1 MP.
      input = sizes.length === 1 ? Math.min(mpOf(sizes[0].width, sizes[0].height), spec.maxOutputMp) : sizes.length;
    } else {
      // Sin dimensiones conocidas: cada referencia cuesta al menos 1 MP.
      input = refs;
    }
  }

  const billable = Math.max(1, output + input);
  return spec.firstMp + (billable - 1) * spec.extraMp;
};

/** USD por imagen de ese modelo, en esa resolución y según sea creación o edición. */
export function usdFor(model: ImageModelSpec, size: ImageSize, edit = false, usage?: MpUsage): number {
  // Los modelos que cobran por píxeles procesados no tienen tarifa por imagen.
  if (model.pricePerMp) return usdPerMp(model.pricePerMp, size, edit, usage);
  const table = (edit && model.usdEdit) || model.usd;
  if (table[size] !== undefined) return table[size] as number;
  const target = IMAGE_SIZE_ORDER.indexOf(size);
  for (let i = target; i >= 0; i--) {
    const s = IMAGE_SIZE_ORDER[i];
    if (table[s] !== undefined) return table[s] as number;
  }
  return Object.values(table)[0] ?? 0.067;
}

/**
 * Descuento por volumen. Generar varias imágenes de golpe ahorra trabajo de
 * orquestación, así que se traslada una parte a la persona. Nunca cambia el
 * hecho de que se paga por cada imagen.
 */
export function volumeFactor(count: number): number {
  if (count >= 5) return 0.9;
  if (count >= 3) return 0.95;
  return 1;
}

/** Opciones que se le pueden ofrecer a la persona para una misma tarea. */
export function imageOptionsFor(need: ImageNeed, available?: (provider: string) => boolean): ImageChoice[] {
  const seen = new Set<ImageTier>();
  const out: ImageChoice[] = [];
  for (const tier of ['standard', 'high', 'max'] as ImageTier[]) {
    const choice = chooseImageModel({ ...need, quality: tier }, available);
    if (choice.tier === tier && !seen.has(tier)) {
      seen.add(tier);
      out.push(choice);
    }
  }
  return out;
}
