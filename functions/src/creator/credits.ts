import { HttpsError } from 'firebase-functions/v2/https';
import { Plan } from './types';
import { creditEngine } from '../credits/creditEngine';
import { CreditService, getCreditCost, loadCostOverrides, serviceForCapability } from '../credits/creditCosts';
import { CreditError, toHttpsError } from '../credits/creditValidation';
import { engine } from '../engine';
import { chooseSeedanceModel, videoRequestFromStep } from '../engine/video';
import { priceImage, priceOperation, priceVideo } from '../credits/aiPricing';
import { providerReady } from '../engine/image';
import { firestoreLedger } from '../engine/ledger';
import { usageTransactionId } from '../credits/creditTransactions';
import { isEditCapability } from '../engine/imageModels';

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
/**
 * MODO DE PRECIO EFECTIVO — una sola fuente de verdad.
 *
 * Sale de la configuración del engine, que es la que ya usa la fórmula de precio
 * (`creditsOf` en aiPricing). Antes esto leía la variable de entorno por su cuenta:
 * un administrador podía poner `real` en aiSettings/global y quedaba el sistema a
 * medias —precio calculado sobre el coste, pero cotización y cobro razonando como
 * si siguiera en simulado—. Ahora las tres cosas leen lo mismo.
 *
 * La variable de entorno no desaparece: sigue siendo el valor por defecto en
 * DEFAULT_SETTINGS cuando no hay nada guardado en Firestore.
 */
export const pricingMode = async (): Promise<'simulated' | 'real'> => (await engine.settings()).pricingMode;

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
/** Tamaño real de la foto que se va a editar, cuando Weë ya lo conoce. */
export interface InputImageSize {
  width: number;
  height: number;
}

export async function estimatePlan(plan: Plan, userId = 'anonymous', quality?: QualityChoice, inputSize?: InputImageSize): Promise<PlanEstimate> {
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
      const referencias = Array.isArray(input.referenceImages)
        ? input.referenceImages.length
        : input.imageUrl || isEditCapability(step.capability)
          ? 1
          : 0;
      const price = priceImage(
        {
          capability: step.capability,
          count: input.count === undefined ? undefined : Number(input.count),
          quality: input.quality as string | undefined,
          resolution: input.resolution as string | undefined,
          kind: input.kind as string | undefined,
          /*
           * Al cotizar, el paso del plan todavía no lleva la foto: esa se le añade
           * al ejecutar, desde el trabajo. Pero una edición SIEMPRE lleva al menos
           * una imagen de entrada por definición, y quien cobra por megapíxel la
           * factura. Contarla aquí es lo que evita cotizar por debajo del coste.
           */
          references: referencias,
          // Solo cuando la operación lleva de verdad una imagen de entrada: una
          // creación desde cero no tiene referencia y no debe pagar por ella.
          // El tamaño real solo le importa a quien cobra por megapíxel; los demás
          // modelos lo ignoran y siguen cobrando por imagen.
          referenceSizes: inputSize && referencias > 0 ? [inputSize] : undefined,
          // Al crear desde cero la proporción la pide la operación; al editar se
          // ignora, porque manda la de la foto.
          aspectRatio: input.aspectRatio as string | undefined,
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
        // Un valor de cero es un dato, no una ausencia: "sin descuento" es 0 y
        // "una imagen" es 1. Convertirlos en undefined rompía la reserva.
        count: Number(price.detail.count) || 1,
        volumeDiscount: Number(price.detail.volumeDiscount) || 0,
      });
      continue;
    }

    // Resto de capacidades con coste de proveedor: mismo suelo que imagen y video
    const settings = await engine.settings();
    if (settings.pricingMode !== 'real') {
      const price = priceOperation(step.capability, input, service, settings);
      steps.push({ stepId: step.id, capability: step.capability, service, credits: price.credits });
      continue;
    }

    if (settings.pricingMode === 'real') {
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
    /*
     * Aquí se conoce el desenlace, así que aquí se liquida el libro. Es el único
     * punto que puede afirmar cuánto se cobró de verdad: un trabajo que ejecutó
     * pasos con éxito y falló al final se reembolsa entero, y ninguna de sus
     * filas debe quedar diciendo que cobró algo.
     */
    let capturado = 0;
    if (used > 0) {
      capturado = Math.min(held, used);
      await creditEngine.completeCredits({ userId, requestId: jobId, finalAmount: capturado });
    } else {
      await creditEngine.refundCredits({ userId, requestId: jobId, reason: `${description} · no se pudo terminar`, source: 'weë-creator' });
    }
    await firestoreLedger
      .settle({ creditTransactionId: usageTransactionId(jobId), finalAmount: capturado })
      .catch((error) => console.error(`Libro: no se pudo liquidar el trabajo ${jobId}:`, error));
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(`Credit Engine: no se pudo ajustar el trabajo ${jobId}:`, error);
  }
}
