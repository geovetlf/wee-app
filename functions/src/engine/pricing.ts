import { CapabilityId } from '../creator/types';
import { EngineSettings, ModelSpec, RoutingPrefs, modalityOf } from './types';
import { getCreditCost, serviceForCapability } from '../credits/creditCosts';

/**
 * De coste a Credits.
 * - Modo "simulated" (mientras se construye Weë Creator): el catálogo del
 *   Credit Engine (functions/src/credits/creditCosts.ts, sobreescribible desde
 *   creditCosts/{servicio} en Firestore). Son valores de prueba, no costes reales.
 * - Modo "real": Credits = USD medido/estimado × creditsPerUsd × (1 + margen).
 *   Los precios de lista de los modelos son orientativos hasta verificarlos.
 */
const DEFAULT_SECONDS: Partial<Record<CapabilityId, number>> = {
  'video.generate': 8,
  'video.image_to_video': 8,
  'music.generate': 30,
  'audio.sfx': 5,
};

/** USD estimado de una llamada con este modelo, según la unidad de cobro. */
export function estimateUsd(model: ModelSpec, capability: CapabilityId, input: Record<string, unknown>, prefs: RoutingPrefs): number {
  const cost = model.cost;
  switch (cost.unit) {
    case 'second': {
      const wanted = Number(prefs.durationSec ?? input.durationSec ?? DEFAULT_SECONDS[capability] ?? 8);
      const seconds = model.maxDurationSec ? Math.min(model.maxDurationSec, wanted) : wanted;
      return seconds * cost.usd;
    }
    case 'minute': {
      const wanted = Number(prefs.durationSec ?? input.durationSec ?? DEFAULT_SECONDS[capability] ?? 30);
      return (wanted / 60) * cost.usd;
    }
    case 'image':
      return Math.max(1, Math.min(4, Number(input.count ?? 1))) * cost.usd;
    case 'kchar': {
      const text = String(input.text ?? input.prompt ?? input.content ?? '');
      return (Math.max(text.length, 200) / 1000) * cost.usd;
    }
    case 'mtoken': {
      const prompt = String(input.prompt ?? input.purpose ?? '') + String(input.system ?? '');
      const inputTokens = Math.max(400, Math.round(prompt.length / 4) + 300);
      const outputTokens = Number(input.maxOutputTokens ?? 800);
      return (inputTokens * cost.usd + outputTokens * (cost.usdOutput ?? cost.usd)) / 1_000_000;
    }
    case 'call':
    default:
      return cost.usd;
  }
}

export function usdToCredits(usd: number, settings: EngineSettings): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd * settings.creditsPerUsd * (1 + settings.margin)));
}

/** Credits que se cobran por una generación (lo que ve la persona). */
export function creditsFor(capability: CapabilityId, usd: number, settings: EngineSettings, demo: boolean, input: Record<string, unknown> = {}): number {
  if (settings.pricingMode === 'simulated') return getCreditCost(serviceForCapability(capability, input));
  if (demo) return 0;
  return usdToCredits(usd, settings);
}

/** Estimación previa (antes de crear) para un paso de un plan. */
export function estimateStepCredits(capability: CapabilityId, estimatedUsd: number, settings: EngineSettings, input: Record<string, unknown> = {}): number {
  return creditsFor(capability, estimatedUsd, settings, false, input);
}

export const isCheap = (capability: CapabilityId): boolean => modalityOf(capability) === 'text' || modalityOf(capability) === 'vision';
