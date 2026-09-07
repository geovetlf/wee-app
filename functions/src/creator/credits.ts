import { HttpsError } from 'firebase-functions/v2/https';
import { Plan } from './types';
import { creditEngine } from '../credits/creditEngine';
import { CreditService, getCreditCost, loadCostOverrides, serviceForCapability } from '../credits/creditCosts';
import { CreditError, toHttpsError } from '../credits/creditValidation';
import { engine } from '../engine';

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

export interface PlanEstimate {
  total: number;
  /** Servicio del catálogo que domina el trabajo (el paso más caro); se registra en el historial. */
  service: CreditService;
  steps: { stepId: string; capability: string; service: CreditService; credits: number }[];
}

export async function estimatePlan(plan: Plan, userId = 'anonymous'): Promise<PlanEstimate> {
  await loadCostOverrides();
  const steps: PlanEstimate['steps'] = [];
  for (const step of plan.steps) {
    const input = step.input || {};
    const service = serviceForCapability(step.capability, input);
    let credits = getCreditCost(service);
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
  const dominant = steps.reduce<PlanEstimate['steps'][number] | null>((best, s) => (!best || s.credits > best.credits ? s : best), null);
  return { total: steps.reduce((sum, s) => sum + s.credits, 0), service: dominant?.service ?? 'ai_text', steps };
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
