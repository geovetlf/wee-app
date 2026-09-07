import { getFirestore } from 'firebase-admin/firestore';
import { CapabilityId } from '../creator/types';

/**
 * Catálogo de costos en Credits (docs/CREDITS.md §6).
 * ÚNICO lugar donde se definen los precios. El frontend nunca los conoce por su
 * cuenta: los consulta al Credit Engine (getCreditCost). Se pueden sobreescribir
 * sin desplegar desde Firestore: creditCosts/{servicio} { credits: number }.
 */
export const CREDIT_COSTS = {
  ai_image: 10,
  ai_image_enhance: 8,
  ai_video: 50,
  ai_video_advanced: 100,
  ai_video_edit: 20,
  ai_audio: 20,
  ai_music: 30,
  ai_text: 2,
  ai_book: 100,
  wee_avatar: 50,
} as const;

export type CreditService = keyof typeof CREDIT_COSTS;
export const CREDIT_SERVICES = Object.keys(CREDIT_COSTS) as CreditService[];

/** Nombre que ve la persona por cada servicio (historial, avisos). */
export const SERVICE_LABEL: Record<CreditService, string> = {
  ai_image: 'Generación de imagen',
  ai_image_enhance: 'Edición de imagen',
  ai_video: 'Generación de video',
  ai_video_advanced: 'Video de alta calidad',
  ai_video_edit: 'Montaje de video',
  ai_audio: 'Generación de voz',
  ai_music: 'Generación de música',
  ai_text: 'Generación de texto',
  ai_book: 'Creación de libro',
  wee_avatar: 'Avatar Weë',
};

/** Credits de bienvenida al abrir la cuenta (0 para desactivar). Configurable con CREDITS_WELCOME. */
export const WELCOME_CREDITS = (() => {
  const raw = process.env.CREDITS_WELCOME;
  if (raw === undefined || raw === '') return 240;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();

/**
 * Paquetes de Credits (compras). Los precios en USD son los de la tienda; los
 * pagos reales llegan por Apple / Google / Stripe (functions/src/payments) y
 * SIEMPRE se validan en el servidor antes de otorgar.
 */
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  productId: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'basic', name: 'Básico', credits: 40, priceUsd: 4.99, productId: 'zone.wee.credits.basic' },
  { id: 'plus', name: 'Plus', credits: 90, priceUsd: 9.99, productId: 'zone.wee.credits.plus' },
  { id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9, productId: 'zone.wee.credits.blackpro' },
];

export const getPackage = (id: string): CreditPackage | undefined => CREDIT_PACKAGES.find((p) => p.id === id || p.productId === id);

/** Qué servicio del catálogo cobra cada capacidad del WEË AI ENGINE. */
export function serviceForCapability(capability: CapabilityId, input: Record<string, unknown> = {}): CreditService {
  switch (capability) {
    case 'image.generate':
    case 'image.reference':
      return 'ai_image';
    case 'image.edit':
    case 'image.background_remove':
    case 'image.upscale':
    case 'image.object_remove':
    case 'image.identity_edit':
    case 'image.space_restyle':
      return 'ai_image_enhance';
    case 'video.generate':
    case 'video.image_to_video':
      return input.quality === 'max' ? 'ai_video_advanced' : 'ai_video';
    case 'video.compose':
    case 'video.montage':
    case 'video.vertical':
      return 'ai_video_edit';
    case 'voice.tts':
      return 'ai_audio';
    case 'music.generate':
    case 'audio.sfx':
      return 'ai_music';
    case 'doc.render':
      return input.kind === 'book' ? 'ai_book' : 'ai_text';
    default:
      return 'ai_text';
  }
}

// ── Sobreescrituras desde Firestore (administración), con caché ──
const CACHE_MS = 60_000;
let overrides: { at: number; values: Partial<Record<CreditService, number>> } | null = null;

export async function loadCostOverrides(force = false): Promise<Partial<Record<CreditService, number>>> {
  if (!force && overrides && Date.now() - overrides.at < CACHE_MS) return overrides.values;
  const values: Partial<Record<CreditService, number>> = {};
  try {
    const snap = await getFirestore().collection('creditCosts').get();
    snap.forEach((doc) => {
      const credits = Number(doc.data()?.credits);
      if ((CREDIT_SERVICES as string[]).includes(doc.id) && Number.isFinite(credits) && credits >= 0) values[doc.id as CreditService] = Math.floor(credits);
    });
  } catch (error) {
    console.warn('Credit Engine: no se pudieron leer los costos de Firestore, se usa el catálogo:', error);
  }
  overrides = { at: Date.now(), values };
  return values;
}

export const invalidateCostOverrides = (): void => {
  overrides = null;
};

/** Costo vigente de un servicio (catálogo + sobreescritura cargada). Síncrono para el router. */
export function getCreditCost(service: CreditService): number {
  const override = overrides?.values[service];
  return override !== undefined ? override : CREDIT_COSTS[service];
}

export const isCreditService = (value: unknown): value is CreditService => typeof value === 'string' && (CREDIT_SERVICES as string[]).includes(value);

export function allCreditCosts(): Record<CreditService, number> {
  const out = {} as Record<CreditService, number>;
  for (const service of CREDIT_SERVICES) out[service] = getCreditCost(service);
  return out;
}
