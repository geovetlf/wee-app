import { HttpsError } from 'firebase-functions/v2/https';
import { Plan } from './types';
import { creditEngine } from '../credits/creditEngine';
import { CreditService, getCreditCost, loadCostOverrides, serviceForCapability } from '../credits/creditCosts';
import { CreditError, toHttpsError } from '../credits/creditValidation';
import { engine } from '../engine';
import { chooseSeedanceModel, videoRequestFromStep } from '../engine/video';
import { priceImage, priceOperation, priceVideo } from '../credits/aiPricing';
import { providerReady } from '../engine/image';

/**
 * Credits de Weë Creator: reservar al empezar, ajustar al terminar.
 * Todo pasa por el Credit Engine (functions/src/credits): un solo movimiento
 * por trabajo (requestId = jobId) que se autoriza antes de crear, se completa
 * al terminar y se reembolsa entero si algo falla.
 *
 * Precios: modo "simulated" (por defecto) usa el catálogo configurable del
 * Credit Engine (creditCosts.ts + creditCosts/{servicio} en Firestore); son
 * valores de prueba mientras no se conozca el coste real de cada API. Modo
 * "real" pide la estimación al AI Router (mejor candidato disponible).
 */
export const pricingMode = (): 'simulated' | 'real' => (process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated');

/** Nivel de calidad que la persona puede elegir antes de crear. */
export type QualityChoice = 'standard' | 'high' | 'max';

/** Lo que se le enseña a la persona de cada paso antes de gastar Credits. */
export interface StepEstimate {
  stepId: string;
  capability: string;
  service: CreditService;
  credits: number;
  /** Nombre del nivel ("Estándar", "Alta calidad"…), nunca el id del modelo. */
  label?: string;
  resolution?: string;
  count?: number;
  durationSec?: number;
  /** Descuento aplicado por generar varias a la vez, en porcentaje. */
  volumeDiscount?: number;
}

export interface PlanEstimate {
  total: number;
  /** Servicio del catálogo que domina el trabajo (el paso más caro); se registra en el historial. */
  service: CreditService;
  steps: StepEstimate[];
  /** Niveles entre los que la persona puede elegir, con su precio total. */
  options?: { quality: QualityChoice; label: string; credits: number }[];
}

/**
 * Presupuesto del plan. Con `quality` se recalcula como si la persona hubiera
 * elegido ese nivel, para poder enseñarle las opciones antes de crear.
 */
export async function estimatePlan(plan: Plan, userId = 'anonymous', quality?: QualityChoice): Promise<PlanEstimate> {
  await loadCostOverrides();
  const steps: PlanEstimate['steps'] = [];
  for (const step of plan.steps) {
    const base = step.input || {};
    // Un nivel elegido por la persona manda sobre el que propuso la plantilla
    const input = quality ? { ...base, quality } : base;
    let service = serviceForCapability(step.capability, input);
    let credits = getCreditCost(service);

    if (step.capability.startsWith('video.')) {
      // El precio del video depende del modelo de Seedance y de la resolución:
      // se calcula con la tarifa oficial de ByteDance (credits/aiPricing.ts).
      const settings = await engine.settings();
      const request = videoRequestFromStep(step.capability, input);
      const price = priceVideo(
        {
          modelId: chooseSeedanceModel(request, settings),
          durationSec: request.durationSec,
          aspectRatio: request.aspectRatio,
          resolution: request.resolution,
          quality: request.quality,
        },
        settings,
      );
      service = price.service;
      credits = price.credits;
      steps.push({
        stepId: step.id,
        capability: step.capability,
        service,
        credits,
        label: String(price.detail.family ?? '') || undefined,
        resolution: String(price.detail.resolution ?? '') || undefined,
        durationSec: Number(price.detail.durationSec) || undefined,
      });
      continue;
    }

    if (step.capability.startsWith('image.')) {
      // Mismo modelo que usará el Weë Image Engine: el más barato que sirve.
      // Tres propuestas cuestan tres veces una y la resolución cambia el precio.
      const settings = await engine.settings();
      const price = priceImage(
        {
          capability: step.capability,
          count: input.count === undefined ? undefined : Number(input.count),
          quality: input.quality as string | undefined,
          resolution: input.resolution as string | undefined,
          kind: input.kind as string | undefined,
          references: Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0,
          available: providerReady,
        },
        settings,
      );
      steps.push({
        stepId: step.id,
        capability: step.capability,
        service: price.service,
        credits: price.credits,
        label: String(price.detail.label ?? '') || undefined,
        resolution: String(price.detail.imageSize ?? '') || undefined,
        count: Number(price.detail.count) || undefined,
        volumeDiscount: Number(price.detail.volumeDiscount) || undefined,
      });
      continue;
    }

    // Resto de capacidades con coste de proveedor: mismo suelo que imagen y video
    if (pricingMode() !== 'real') {
      const settings = await engine.settings();
      const price = priceOperation(step.capability, input, service, settings);
      steps.push({ stepId: step.id, capability: step.capability, service, credits: price.credits });
      continue;
    }

    if (pricingMode() === 'real') {
      const decision = await engine.route({
        capability: step.capability,
        input,
        userId,
        goal: plan.goal,
        experienceId: plan.experience,
        prefs: { quality: (input.quality as any) || 'auto', durationSec: input.durationSec ? Number(input.durationSec) : undefined },
      });
      credits = decision.candidates[0]?.estimatedCredits ?? 0;
    }
    steps.push({ stepId: step.id, capability: step.capability, service, credits });
  }
  const dominant = steps.reduce<StepEstimate | null>((best, s) => (!best || s.credits > best.credits ? s : best), null);
  return { total: steps.reduce((sum, s) => sum + s.credits, 0), service: dominant?.service ?? 'ai_text', steps };
}

/**
 * Presupuesto de cada nivel para el mismo plan. Es lo que se le enseña a la
 * persona: "Estándar 6 · Alta 25 · Máxima 41 Credits". Solo se ofrecen los
 * niveles que cambian el precio.
 */
const QUALITY_LABEL: Record<QualityChoice, string> = { standard: 'Estándar', high: 'Alta calidad', max: 'Máxima calidad' };

export async function planOptions(plan: Plan, userId = 'anonymous'): Promise<PlanEstimate['options']> {
  const levels: QualityChoice[] = ['standard', 'high', 'max'];
  const out: NonNullable<PlanEstimate['options']> = [];
  for (const quality of levels) {
    const estimate = await estimatePlan(plan, userId, quality);
    if (!out.some((o) => o.credits === estimate.total)) out.push({ quality, label: QUALITY_LABEL[quality], credits: estimate.total });
  }
  return out.length > 1 ? out : undefined;
}

export async function estimatePlanCredits(plan: Plan, userId = 'anonymous'): Promise<number> {
  return (await estimatePlan(plan, userId)).total;
}

/** Garantiza la cuenta de Credits (migra la billetera anterior y otorga la bienvenida la primera vez). */
export async function ensureAccount(userId: string): Promise<void> {
  try {
    await creditEngine.ensureAccount(userId);
  } catch (error) {
    // Sin perfil todavía (cuenta recién creada): el trabajo puede seguir; el cobro fallará con un error claro
    if (error instanceof CreditError && error.code === 'ACCOUNT_NOT_FOUND') return;
    throw toHttpsError(error);
  }
}

/** Reserva Credits al empezar un trabajo (AUTHORIZED). Lanza failed-precondition/INSUFFICIENT_CREDITS si no alcanza. */
export async function holdCredits(userId: string, jobId: string, plan: Plan, amount: number, description: string): Promise<void> {
  if (amount <= 0) return;
  try {
    const estimate = await estimatePlan(plan, userId);
    await creditEngine.spendCredits({
      userId,
      service: estimate.service,
      requestId: jobId,
      amount,
      reason: description,
      source: 'weë-creator',
      generationId: jobId,
      meta: { jobId, steps: estimate.steps },
    });
  } catch (error) {
    throw toHttpsError(error);
  }
}

/** Ajusta al terminar: completa cobrando lo usado (devuelve la diferencia) o reembolsa todo si falló. */
export async function settleCredits(userId: string, jobId: string, held: number, used: number, description: string): Promise<void> {
  if (held <= 0) return;
  try {
    if (used > 0) {
      await creditEngine.completeCredits({ userId, requestId: jobId, finalAmount: Math.min(held, used) });
    } else {
      await creditEngine.refundCredits({ userId, requestId: jobId, reason: `${description} · no se pudo terminar`, source: 'weë-creator' });
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(`Credit Engine: no se pudo ajustar el trabajo ${jobId}:`, error);
  }
}
