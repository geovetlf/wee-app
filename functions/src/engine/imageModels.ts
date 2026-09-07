import { CapabilityId } from '../creator/types';

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
    usd: { '512px': 0.015, '1K': 0.015 },
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
    modelId: 'seedream-5-0-lite-260128',
    label: 'Estándar',
    tier: 'standard',
    sizes: ['1K', '2K'],
    usd: { '1K': 0.035, '2K': 0.035 },
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
    usd: { '1K': 0.03, '2K': 0.03 },
    usdEdit: { '1K': 0.045, '2K': 0.045 },
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
  } else if (size === '2K' || size === '4K') {
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
      .sort((a, b) => usdFor(a, req.size, req.edit) - usdFor(b, req.size, req.edit));
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

const nearestSize = (model: ImageModelSpec, wanted: ImageSize): ImageSize => {
  if (model.sizes.includes(wanted)) return wanted;
  const target = IMAGE_SIZE_ORDER.indexOf(wanted);
  for (let i = target; i >= 0; i--) if (model.sizes.includes(IMAGE_SIZE_ORDER[i])) return IMAGE_SIZE_ORDER[i];
  return model.sizes[0];
};

/** USD por imagen de ese modelo, en esa resolución y según sea creación o edición. */
export function usdFor(model: ImageModelSpec, size: ImageSize, edit = false): number {
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
