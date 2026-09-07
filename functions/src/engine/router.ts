import { CapabilityId } from '../creator/types';
import { EngineConfig } from './config';
import { Ledger } from './ledger';
import { creditsFor, estimateUsd } from './pricing';
import { recordRealSuccess } from './verification';
import { NotConfiguredError, ProviderError } from './http';
import { classifyError, EngineError } from './errors';
import { providerCallsToday } from './limits';
import {
  ChainLink,
  EngineRequest,
  EngineResult,
  EngineSettings,
  ModelSpec,
  ProviderAdapter,
  ProviderConfig,
  QUALITY_MIN_SCORE,
  QUALITY_RANK,
  QualityTier,
  RouteCandidate,
  RouteDecision,
  RoutingPolicy,
  RoutingPrefs,
  inputTypeOf,
  modalityOf,
  outputTypeOf,
} from './types';

/**
 * AI ROUTER: decide qué modelo usar, cuándo, cuánto cuesta, qué calidad da,
 * si está disponible, si falló (fallback) y si hay uno más barato que sirve.
 * Todo lo que decide se puede reconfigurar desde Firestore (ver config.ts).
 */

// ── Salud de proveedores (cortacircuitos) ───────────────────────────────────
export interface HealthStore {
  isOpen(provider: string): boolean;
  failure(provider: string, settings: EngineSettings): void;
  success(provider: string): void;
  reset(provider?: string): void;
  snapshot(): Record<string, { failures: number; openUntil?: number }>;
}

export const memoryHealth = (now: () => number = () => Date.now()): HealthStore => {
  const state: Record<string, { failures: number[]; openUntil?: number }> = {};
  const entry = (provider: string) => (state[provider] = state[provider] || { failures: [] });
  return {
    isOpen: (provider) => {
      const e = state[provider];
      return !!e?.openUntil && e.openUntil > now();
    },
    failure: (provider, settings) => {
      const e = entry(provider);
      const t = now();
      e.failures = e.failures.filter((at) => t - at < settings.circuitBreaker.windowMs);
      e.failures.push(t);
      if (e.failures.length >= settings.circuitBreaker.failures) {
        e.openUntil = t + settings.circuitBreaker.openMs;
        e.failures = [];
        console.warn(`WEË AI ENGINE: ${provider} en pausa ${Math.round(settings.circuitBreaker.openMs / 1000)} s por fallos repetidos`);
      }
    },
    success: (provider) => {
      const e = entry(provider);
      e.failures = [];
      e.openUntil = undefined;
    },
    reset: (provider) => {
      if (provider) delete state[provider];
      else for (const key of Object.keys(state)) delete state[key];
    },
    snapshot: () => Object.fromEntries(Object.entries(state).map(([k, v]) => [k, { failures: v.failures.length, openUntil: v.openUntil }])),
  };
};

// ── Calidad exigida por la tarea ────────────────────────────────────────────
const DEFAULT_QUALITY: Record<string, QualityTier> = { text: 'standard', vision: 'standard', doc: 'standard', image: 'high', video: 'high', voice: 'high', music: 'high' };
const MAX_HINT = /cinematogr|premium|m[aá]xima calidad|4k|profesional|ultra|obra maestra|hiperrealista/i;
const LIGHT_HINT = /r[aá]pido|borrador|boceto|de prueba|simple|sencillo|barato|econ[oó]mico/i;

export function resolveQuality(request: EngineRequest): QualityTier {
  const wanted = request.prefs?.quality;
  if (wanted && wanted !== 'auto') return wanted;
  const explicit = String(request.input.quality ?? '');
  if (explicit === 'max' || explicit === 'high' || explicit === 'standard') return explicit;
  const text = `${request.input.prompt ?? ''} ${request.input.brief ?? ''} ${request.goal ?? ''} ${request.input.style ?? ''}`;
  const modality = modalityOf(request.capability);
  if ((modality === 'video' || modality === 'image') && MAX_HINT.test(text)) return 'max';
  if (LIGHT_HINT.test(text)) return 'standard';
  return DEFAULT_QUALITY[modality] || 'standard';
}

// ── Elección de modelo dentro de un proveedor ──────────────────────────────
const applyOverrides = (model: ModelSpec, config?: ProviderConfig): (ModelSpec & { enabled: boolean }) => {
  const override = config?.models?.[model.id];
  return { ...model, ...(override || {}), cost: override?.cost || model.cost, enabled: override?.enabled !== false } as ModelSpec & { enabled: boolean };
};

export function pickModel(adapter: ProviderAdapter, capability: CapabilityId, quality: QualityTier, policy: RoutingPolicy, config?: ProviderConfig, modelId?: string): ModelSpec | null {
  const models = adapter.models.filter((m) => m.capabilities.includes(capability)).map((m) => applyOverrides(m, config)).filter((m) => m.enabled);
  if (modelId) return models.find((m) => m.id === modelId) || null;
  if (!models.length) return null;
  const meeting = models.filter((m) => m.quality >= QUALITY_MIN_SCORE[quality]);
  const pool = meeting.length ? meeting : models;
  const sorted = [...pool].sort((a, b) =>
    policy === 'quality-first' ? b.quality - a.quality || a.cost.usd - b.cost.usd : a.cost.usd - b.cost.usd || b.quality - a.quality
  );
  return sorted[0];
}

// ── Router ─────────────────────────────────────────────────────────────────
export interface RouterDeps {
  adapters: Record<string, ProviderAdapter>;
  loadConfig: () => Promise<EngineConfig>;
  ledger: Ledger;
  health: HealthStore;
  now?: () => number;
  /** Consumo de hoy (aiUsage/{día}) para aplicar límites diarios por proveedor. */
  usageToday?: () => Promise<Record<string, any> | undefined>;
}

interface InternalCandidate extends RouteCandidate {
  durationOk: boolean;
  meetsQuality: boolean;
}

const withTimeout = <T>(promise: Promise<T>, ms: number, provider: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ProviderError(`${provider}: tardó más de ${Math.round(ms / 1000)} s`, provider)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

export function createRouter(deps: RouterDeps) {
  const now = deps.now || (() => Date.now());

  const linksFor = (capability: CapabilityId, config: EngineConfig): { links: ChainLink[]; policy: RoutingPolicy } => {
    const routing = config.routing[capability];
    if (routing && routing.chain.length) return { links: routing.chain, policy: routing.policy || config.settings.defaultPolicy };
    // Sin cadena configurada: todos los proveedores reales que atienden la capacidad, por prioridad
    const links = Object.values(deps.adapters)
      .filter((a) => a.id !== 'mock' && a.supports(capability))
      .sort((a, b) => (config.providers[a.id]?.priority ?? 50) - (config.providers[b.id]?.priority ?? 50))
      .map((a) => ({ provider: a.id }));
    return { links, policy: routing?.policy || config.settings.defaultPolicy };
  };

  const route = async (request: EngineRequest, preloaded?: EngineConfig): Promise<RouteDecision> => {
    const config = preloaded || (await deps.loadConfig());
    const { settings } = config;
    const { capability, input } = request;
    const prefs: RoutingPrefs = request.prefs || {};
    const quality = resolveQuality(request);
    const { links, policy } = linksFor(capability, config);
    const excluded = new Set(prefs.excludeProviders || []);
    const candidates: InternalCandidate[] = [];
    const skipped: RouteDecision['skipped'] = [];
    const usage = deps.usageToday ? await deps.usageToday().catch(() => undefined) : undefined;

    links.forEach((link, index) => {
      const skip = (reason: string): void => {
        skipped.push({ provider: link.provider, model: link.model, reason });
      };
      const adapter = deps.adapters[link.provider];
      if (!adapter) return skip('no existe');
      const providerConfig = config.providers[link.provider] || { enabled: true, priority: 50 };
      if (!providerConfig.enabled) return skip('desactivado por administración');
      if (excluded.has(link.provider)) return skip('excluido en esta petición');
      if (prefs.allowedProviders && !prefs.allowedProviders.includes(link.provider)) return skip('fuera de la familia de modelos permitida');
      if (!adapter.isConfigured()) return skip('sin clave configurada');
      if (!adapter.supports(capability)) return skip('no atiende esta capacidad');
      if (deps.health.isOpen(link.provider)) return skip('en pausa por fallos recientes');
      const maxCalls = providerConfig.limits?.maxCallsPerDay;
      if (maxCalls && maxCalls > 0 && providerCallsToday(usage, link.provider) >= maxCalls) return skip('límite diario del proveedor alcanzado');
      if (link.minQuality && QUALITY_RANK[quality] < QUALITY_RANK[link.minQuality]) return skip('reservado para tareas de más calidad');
      if (link.maxQuality && QUALITY_RANK[quality] > QUALITY_RANK[link.maxQuality]) return skip('no alcanza la calidad que pide la tarea');
      const model = pickModel(adapter, capability, quality, policy, providerConfig, link.model || prefs.modelId);
      if (!model) return skip(prefs.modelId ? `sin el modelo ${prefs.modelId} disponible` : 'sin modelo disponible para esta capacidad');
      const estimatedUsd = estimateUsd(model, capability, input, prefs);
      const estimatedCredits = creditsFor(capability, estimatedUsd, settings, adapter.id === 'mock', input);
      if (prefs.maxCredits !== undefined && estimatedCredits > prefs.maxCredits) return skip(`supera el tope de ${prefs.maxCredits} Credits`);
      const durationOk = !(prefs.durationSec && model.maxDurationSec && model.maxDurationSec < prefs.durationSec);
      const meetsQuality = model.quality >= QUALITY_MIN_SCORE[quality];
      candidates.push({
        provider: link.provider,
        model,
        priority: index,
        estimatedUsd,
        estimatedCredits,
        durationOk,
        meetsQuality,
        reason: [meetsQuality ? `calidad ${model.quality}/5` : `calidad ${model.quality}/5 (por debajo de lo pedido)`, durationOk ? '' : 'clip más corto que lo pedido', `≈ $${estimatedUsd.toFixed(3)}`].filter(Boolean).join(' · '),
      });
    });

    const byPolicy = (a: InternalCandidate, b: InternalCandidate): number => {
      if (a.durationOk !== b.durationOk) return a.durationOk ? -1 : 1;
      if (a.meetsQuality !== b.meetsQuality) return a.meetsQuality ? -1 : 1;
      if (policy === 'quality-first') return b.model.quality - a.model.quality || a.priority - b.priority;
      if (policy === 'cost-first' || prefs.preferCheaper) return a.estimatedUsd - b.estimatedUsd || a.priority - b.priority;
      return a.priority - b.priority;
    };
    candidates.sort(byPolicy);

    // Último recurso: modo demo (siempre en modo prueba; en modo real solo si nadie más puede).
    // Video: el demo solo entra cuando NO hay ningún candidato real; nunca sustituye a Seedance si este falla.
    const mock = deps.adapters.mock;
    const modality = modalityOf(capability);
    const mockAllowed = modality === 'video' ? candidates.length === 0 : settings.pricingMode === 'simulated' || candidates.length === 0;
    if (mock && settings.allowMockFallback && !candidates.some((c) => c.provider === 'mock') && mockAllowed) {
      const model = pickModel(mock, capability, quality, policy, config.providers.mock);
      if (model) {
        candidates.push({ provider: 'mock', model, priority: 999, estimatedUsd: 0, estimatedCredits: creditsFor(capability, 0, settings, true, input), durationOk: true, meetsQuality: false, reason: 'modo demo (sin IA real)' });
      }
    }

    return {
      capability,
      quality,
      policy,
      candidates: candidates.map(({ durationOk: _d, meetsQuality: _m, ...c }) => c),
      skipped,
    };
  };

  const execute = async (request: EngineRequest): Promise<EngineResult> => {
    const config = await deps.loadConfig();
    const { settings } = config;
    const decision = await route(request, config);
    const { capability, input } = request;
    const modality = modalityOf(capability);
    const ctx = {
      userId: request.userId,
      jobId: request.jobId,
      stepId: request.stepId,
      experienceId: request.experienceId,
      goal: request.goal,
      requestId: request.requestId,
      service: request.service,
      creditTransactionId: request.creditTransactionId,
    };
    const prefs: RoutingPrefs = request.prefs || {};
    const timeoutMs = settings.timeoutsMs[modality] ?? 120_000;

    if (!decision.candidates.length) {
      const why = decision.skipped.map((s) => `${s.provider}: ${s.reason}`).join('; ');
      console.warn(`WEË AI ENGINE: ningún proveedor disponible para ${capability} (${why})`);
      throw new EngineError('NOT_AVAILABLE', 'Ahora mismo no hay un proveedor disponible para esto. Inténtalo más tarde.', { capability });
    }

    let lastError: unknown = null;
    let attempt = 0;
    for (const candidate of decision.candidates) {
      attempt++;
      const adapter = deps.adapters[candidate.provider];
      const generationId = await deps.ledger.open({
        ...ctx,
        capability,
        modality,
        provider: candidate.provider,
        model: candidate.model.id,
        attempt,
        estimatedUsd: candidate.estimatedUsd,
        pricingMode: settings.pricingMode,
        inputType: inputTypeOf(capability, input),
      });
      const start = now();
      const onStatus = async (status: 'PROCESSING', meta: Record<string, unknown>) => {
        await deps.ledger.progress(generationId, {
          status,
          providerTaskId: typeof meta.providerTaskId === 'string' ? meta.providerTaskId : undefined,
          estimatedTokens: typeof meta.estimatedTokens === 'number' ? meta.estimatedTokens : undefined,
          estimatedUsd: typeof meta.estimatedUsd === 'number' ? meta.estimatedUsd : undefined,
          resolution: typeof meta.resolution === 'string' ? meta.resolution : undefined,
        });
      };
      try {
        const result = await withTimeout(adapter.run({ capability, model: candidate.model, input, ctx, prefs, timeoutMs, onStatus }), timeoutMs, candidate.provider);
        const durationMs = now() - start;
        const demo = candidate.provider === 'mock';
        const credits = creditsFor(capability, result.costUSD, settings, demo, input);
        // Una respuesta real es lo único que asciende un proveedor a REAL_API_VERIFIED
        if (!demo) void recordRealSuccess(candidate.provider, result.model || candidate.model.id, capability, generationId);
        await deps.ledger.close(generationId, {
          status: 'COMPLETED',
          providerCost: result.costUSD,
          creditsCharged: credits,
          durationMs,
          usage: result.usage,
          outputType: outputTypeOf(result.output.kind),
          videoDurationSec: result.output.durationSec,
          resolution: typeof result.meta?.resolution === 'string' ? result.meta.resolution : undefined,
          providerTokens: typeof result.meta?.actualTokens === 'number' ? result.meta.actualTokens : undefined,
          providerMeta: result.meta,
        });
        deps.health.success(candidate.provider);
        console.log(`WEË AI ENGINE: ${candidate.provider}/${result.model || candidate.model.id} atendió ${capability} en ${durationMs} ms (${credits} Credits, registro ${generationId}, intento ${attempt})`);
        if (request.record) {
          await request.record({ capability, provider: candidate.provider, costUSD: result.costUSD, latencyMs: result.latencyMs, usage: result.usage || {} });
        }
        return { ...result, provider: candidate.provider, modelId: result.model || candidate.model.id, credits, generationId, attempts: attempt, demo, decision };
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        await deps.ledger.close(generationId, { status: 'FAILED', providerCost: 0, creditsCharged: 0, durationMs: now() - start, error: message.slice(0, 500) });
        const countsAsFailure = !(error instanceof NotConfiguredError) && (!(error instanceof ProviderError) || error.retryable);
        if (countsAsFailure) deps.health.failure(candidate.provider, settings);
        console.warn(`WEË AI ENGINE: ${candidate.provider}/${candidate.model.id} falló en ${capability} (intento ${attempt}): ${message}`);
      }
    }
    throw classifyError(lastError);
  };

  return { route, execute };
}
