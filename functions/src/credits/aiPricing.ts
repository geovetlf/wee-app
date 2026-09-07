import { CapabilityId } from '../creator/types';
import { EngineSettings } from '../engine/types';

import { ImageSize, chooseImageModel, imageModelOf, isEditCapability, usdFor, volumeFactor } from '../engine/imageModels';
import { SEEDANCE_MODEL_IDS, SeedanceResolution, clampDuration, resolveResolution, seedanceCostUsd, specOf } from '../engine/providers/seedance';
import { CreditService, getCreditCost } from './creditCosts';

/**
 * PRECIOS DE IA — punto único (docs/CREDITS.md).
 *
 * Ninguna sección de Weë (Beauty, Photo, Studio…) fija precios: todas preguntan
 * aquí. Este módulo traduce
 *
 *   proveedor → modelo → operación → coste oficial en USD → Credits
 *
 * usando exclusivamente las tarifas publicadas por cada proveedor y los ajustes
 * del Credit Engine (creditsPerUsd y margen en aiSettings/global, y el catálogo
 * de creditCosts.ts sobreescribible en creditCosts/{servicio}).
 *
 * Se puede cambiar el precio de cualquier operación sin tocar código:
 *   - creditCosts/{servicio}.credits  → precio fijo de ese servicio
 *   - aiSettings/global.margin        → margen sobre el coste real
 *   - aiSettings/global.pricingMode   → 'simulated' (catálogo) | 'real' (coste medido)
 */

export interface OperationPrice {
  /** Servicio del catálogo con el que se cobra y se registra. */
  service: CreditService;
  /** Credits que se cobran a la persona. */
  credits: number;
  /** Coste oficial estimado del proveedor, en USD. */
  usd: number;
  provider: string;
  model: string;
  /** Detalle para el registro (aiGenerations) y para el panel de administración. */
  detail: Record<string, unknown>;
}

/** USD → Credits, con el margen del motor. Redondea siempre hacia arriba. */
export function usdToCredits(usd: number, settings: Pick<EngineSettings, 'creditsPerUsd' | 'margin'>): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd * settings.creditsPerUsd * (1 + settings.margin)));
}

/**
 * Credits de una operación.
 *  - Modo real: coste oficial × Credits por dólar × (1 + margen).
 *  - Modo prueba: el precio del catálogo (configurable en creditCosts/{servicio}).
 *
 * En los dos casos se aplica un suelo: **nunca se cobra menos de lo que cuesta la
 * API**. Un precio fijo por tramo no puede cubrir todas las duraciones (una historia
 * de 20 s cuesta el triple que un clip de 5 s), así que el coste sin margen manda
 * cuando el catálogo se queda corto. Para vender más barato se baja el margen o
 * los Credits por dólar en aiSettings/global, no el suelo.
 */
const creditsOf = (service: CreditService, usd: number, settings: Pick<EngineSettings, 'pricingMode' | 'creditsPerUsd' | 'margin'>): number => {
  const withMargin = usdToCredits(usd, settings);
  if (settings.pricingMode === 'real') return withMargin;
  const atCost = usd > 0 ? Math.ceil(usd * settings.creditsPerUsd) : 0;
  return Math.max(getCreditCost(service), atCost);
};

// ──────── COSTE DE PROVEEDOR DE CUALQUIER OPERACIÓN (texto, voz, búsqueda, audio) ────────

/**
 * Tarifas oficiales del modelo MÁS CARO que puede atender cada nivel. Se usa el
 * más caro a propósito: el precio que ve la persona tiene que ser un techo, no
 * un promedio, porque después de confirmar no se le puede cobrar más.
 *
 * Texto (USD por millón de tokens, entrada / salida):
 *   standard → Gemini 2.5 Flash-Lite   0.10 / 0.40
 *   high     → Gemini 3.8 Flash        0.75 / 3.75
 *   max      → Claude Sonnet 5         2.00 / 10.00
 */
export const TEXT_RATES: Record<'standard' | 'high' | 'max', { input: number; output: number }> = {
  standard: { input: 0.1, output: 0.4 },
  high: { input: 0.75, output: 3.75 },
  max: { input: 2, output: 10 },
};

/** USD por 1 000 caracteres de voz: ElevenLabs v3 y Multilingual v2, los más caros de la cadena. */
export const VOICE_USD_PER_KCHAR = 0.1;
/** USD por consulta de búsqueda con fuentes, pasado el cupo mensual gratuito de Google. */
export const SEARCH_USD_PER_QUERY = 0.014;
/** Tokens que consume cada entrada, según la documentación oficial de Gemini. */
export const TOKENS = { perImage: 1300, perDocumentPage: 258, perAudioSecond: 32 };
/** Cuando no se conoce el tamaño del adjunto se asume este, y el motor rechaza lo que lo supere. */
export const ASSUMED = { documentPages: 60, audioSeconds: 600 };
/** Salida máxima por defecto de los adaptadores de texto: el techo del coste de salida. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 1200;

const chars = (value: unknown): number => (typeof value === 'string' ? value.length : 0);

/**
 * Tokens de entrada de una petición de texto, contando TODO lo que se envía:
 * prompt, instrucciones, historial de la conversación, fotos, documentos y audio.
 * Ignorar el historial y los adjuntos era la causa de que el precio mostrado
 * pudiera quedarse por debajo del coste real.
 */
export function estimateInputTokens(input: Record<string, unknown>): number {
  let text = chars(input.prompt) + chars(input.purpose) + chars(input.system) + chars(input.brief) + chars(input.text) + chars(input.content);
  if (Array.isArray(input.history)) {
    for (const turn of input.history) text += chars((turn as any)?.text);
  }
  if (Array.isArray(input.previous)) {
    for (const p of input.previous) text += chars(p);
  }
  let tokens = Math.max(400, Math.round(text / 4) + 300);

  const images = (input.imageUrl ? 1 : 0) + (Array.isArray(input.imageUrls) ? input.imageUrls.length : 0) + (Array.isArray(input.referenceImages) ? input.referenceImages.length : 0);
  tokens += images * TOKENS.perImage;
  if (input.documentUrl) tokens += Number(input.documentPages ?? ASSUMED.documentPages) * TOKENS.perDocumentPage;
  if (input.audioUrl) tokens += Number(input.audioSeconds ?? ASSUMED.audioSeconds) * TOKENS.perAudioSecond;
  return tokens;
}

export type Tier = 'standard' | 'high' | 'max';

const tierOf = (input: Record<string, unknown>): Tier => {
  const q = String(input.quality ?? '');
  return q === 'max' ? 'max' : q === 'high' ? 'high' : 'standard';
};

/**
 * Coste oficial estimado de una operación que NO es de imagen ni de video.
 * Siempre por arriba: modelo más caro del nivel y salida al máximo permitido.
 */
export function estimateProviderUsd(capability: CapabilityId, input: Record<string, unknown> = {}): number {
  const tier = tierOf(input);
  if (capability === 'voice.tts') {
    const text = Math.max(chars(input.text) || chars(input.prompt) || chars(input.content), 200);
    return (text / 1000) * VOICE_USD_PER_KCHAR;
  }
  if (capability === 'audio.transcribe') {
    const seconds = Number(input.audioSeconds ?? ASSUMED.audioSeconds);
    const rate = TEXT_RATES[tier];
    return (seconds * TOKENS.perAudioSecond * rate.input + DEFAULT_MAX_OUTPUT_TOKENS * rate.output) / 1_000_000;
  }
  const rate = TEXT_RATES[tier];
  const inputTokens = estimateInputTokens(input);
  const outputTokens = Number(input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS);
  const usd = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return capability === 'text.search' ? usd + SEARCH_USD_PER_QUERY : usd;
}

/**
 * Precio de cualquier operación con coste de proveedor que no sea imagen ni video.
 * Aplica el mismo suelo: nunca por debajo del coste oficial estimado.
 */
export function priceOperation(capability: CapabilityId, input: Record<string, unknown>, service: CreditService, settings: EngineSettings): OperationPrice {
  const usd = estimateProviderUsd(capability, input);
  return {
    service,
    credits: creditsOf(service, usd, settings),
    usd,
    provider: 'router',
    model: 'según la cadena',
    detail: { tier: tierOf(input), estimatedInputTokens: estimateInputTokens(input), maxOutputTokens: Number(input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS) },
  };
}

// ──────────────────────────── VIDEO (Seedance, ByteDance) ────────────────────────────

export interface VideoPriceInput {
  /** Id oficial del modelo de la familia Seedance ya elegido por el Weë Video Engine. */
  modelId: string;
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  /** Segundos de video de entrada (encarece la generación y cambia la tarifa). */
  inputVideoSec?: number;
}

/**
 * Tramo de precio del video. Sigue a la familia Seedance: cada modelo tiene su
 * tarifa oficial, así que cada uno tiene su propio servicio de Credits.
 */
export function videoServiceFor(modelId: string, resolution: SeedanceResolution): CreditService {
  if (modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_5) return resolution === '1080p' ? 'ai_video_max' : 'ai_video_advanced';
  if (modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_0) return resolution === '1080p' || resolution === '4k' ? 'ai_video_max' : 'ai_video_hd';
  return resolution === '480p' ? 'ai_video_draft' : 'ai_video';
}

/** Coste oficial y Credits de una generación de video, antes de llamar al proveedor. */
export function priceVideo(input: VideoPriceInput, settings: EngineSettings): OperationPrice {
  const modelId = SEEDANCE_MODEL_IDS[input.modelId as keyof typeof SEEDANCE_MODEL_IDS] || input.modelId;
  const spec = specOf(modelId);
  const resolution = resolveResolution(modelId, input.resolution, input.quality);
  const durationSec = clampDuration(modelId, input.durationSec ?? 5);
  const { usd, tokens, ratePerMillion } = seedanceCostUsd({
    modelId,
    resolution,
    durationSec,
    ratio: input.aspectRatio,
    inputVideoSec: input.inputVideoSec,
  });
  const service = videoServiceFor(modelId, resolution);
  return {
    service,
    credits: creditsOf(service, usd, settings),
    usd,
    provider: 'seedance',
    model: modelId,
    detail: { family: spec.key, resolution, durationSec, estimatedTokens: tokens, usdPerMillionTokens: ratePerMillion, inputVideoSec: input.inputVideoSec ?? 0 },
  };
}

// ──────────────────────────── IMAGEN (Gemini y compañía) ────────────────────────────

/** Operaciones que necesitan el modelo de máxima precisión: conservar la identidad. */
export const PRO_IMAGE_KINDS = new Set(['restore', 'retouch', 'look', 'identity']);

export const needsProImage = (capability: CapabilityId, input: Record<string, unknown> = {}): boolean =>
  capability === 'image.identity_edit' ||
  PRO_IMAGE_KINDS.has(String(input.kind ?? '')) ||
  String(input.quality ?? '') === 'max';

export interface ImagePriceInput {
  capability: CapabilityId;
  /** Modelo ya elegido (si la persona seleccionó una opción concreta). */
  modelId?: string;
  count?: number;
  quality?: string;
  resolution?: string;
  kind?: string;
  references?: number;
  /** Proveedores con clave configurada, para no ofrecer lo que no se puede servir. */
  available?: (provider: string) => boolean;
}

/** Servicio de Credits de una operación de imagen, según el nivel del modelo elegido. */
export function imageServiceFor(capability: CapabilityId, input: Record<string, unknown> = {}, tier?: string): CreditService {
  // Probarse ropa tiene su propio precio: BFL cobra por megapíxel y devuelve el coste real
  if (capability === 'image.try_on') return 'ai_tryon';
  const level = tier || (needsProImage(capability, input) ? 'max' : undefined);
  if (level === 'max') return 'ai_image_pro';
  if (level === 'standard') return isEditCapability(capability) ? 'ai_image_enhance_lite' : 'ai_image_lite';
  return isEditCapability(capability) ? 'ai_image_enhance' : 'ai_image';
}

/**
 * Coste oficial y Credits de una operación de imagen.
 *
 * Elige el modelo más barato capaz de hacer la tarea (engine/imageModels.ts),
 * salvo que se pase uno concreto porque la persona eligió una opción superior.
 * El precio depende siempre de tres cosas: modelo, resolución y cantidad.
 */
export function priceImage(input: ImagePriceInput, settings: EngineSettings): OperationPrice {
  const count = Math.max(1, Math.min(8, Number(input.count ?? 1)));
  const need = { capability: input.capability, kind: input.kind, quality: input.quality, resolution: input.resolution, references: input.references };
  const chosen = input.modelId && imageModelOf(input.modelId)
    ? { model: imageModelOf(input.modelId)!, size: (input.resolution as ImageSize) || '1K', tier: imageModelOf(input.modelId)!.tier, reason: 'lo eligió la persona' }
    : chooseImageModel(need, input.available);
  const edit = isEditCapability(input.capability);
  const usdPerImage = usdFor(chosen.model, chosen.size, edit);
  const discount = volumeFactor(count);
  const usd = count * usdPerImage * discount;
  const service = imageServiceFor(input.capability, { kind: input.kind, quality: input.quality }, chosen.tier);
  return {
    service,
    credits: creditsOf(service, usd, settings),
    usd,
    provider: chosen.model.provider,
    model: chosen.model.modelId,
    detail: {
      tier: chosen.tier,
      label: chosen.model.label,
      imageSize: chosen.size,
      count,
      usdPerImage,
      volumeDiscount: discount < 1 ? Math.round((1 - discount) * 100) : 0,
      reason: chosen.reason,
      edit,
    },
  };
}
