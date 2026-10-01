import { CapabilityId } from '../creator/types';
import { GatewayContext, ProviderResult } from './types';
import { engine } from '../engine';

/**
 * AI Gateway (compatibilidad). Desde el WEË AI ENGINE, este módulo solo
 * traduce la llamada de Weë Creator al engine: el router decide proveedor,
 * modelo, calidad, coste y fallback (functions/src/engine, docs/AI-ENGINE.md).
 * Los adaptadores de la fase 0/1 (providers/mock, providers/gemini) siguen
 * aquí y el engine los reutiliza.
 */
export interface GatewayRun extends ProviderResult {
  provider: string;
  /** Credits que cuesta este resultado (precio de prueba o real). */
  credits: number;
  /** Documento aiGenerations del intento que tuvo éxito. */
  generationId: string;
  /** true si lo resolvió el proveedor de prueba. */
  demo: boolean;
  attempts: number;
}

export async function runCapability(
  capability: CapabilityId,
  input: Record<string, unknown>,
  ctx: GatewayContext
): Promise<GatewayRun> {
  const result = await engine.generate({
    capability,
    input,
    userId: ctx.userId,
    jobId: ctx.jobId,
    stepId: ctx.stepId,
    experienceId: ctx.experienceId,
    goal: ctx.goal,
    prefs: ctx.prefs,
    record: ctx.record,
    requestId: ctx.requestId,
    service: ctx.service,
    creditTransactionId: ctx.creditTransactionId,
    deadlineAt: ctx.deadlineAt,
  });
  return {
    output: result.output,
    usage: result.usage,
    costUSD: result.costUSD,
    latencyMs: result.latencyMs,
    provider: result.provider,
    credits: result.credits,
    generationId: result.generationId,
    demo: result.demo,
    attempts: result.attempts,
  };
}
