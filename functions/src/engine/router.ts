import { CapabilityId } from '../creator/types';
import { EngineConfig } from './config';
import { Ledger } from './ledger';
import { creditsFor, estimateUsd } from './pricing';
import { recordRealSuccess } from './verification';
import { sanitizeForLog } from './sanitize';
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

  const linksFor = (capability: CapabilityId, config: EngineConfig, prefs: RoutingPrefs = {}): { links: ChainLink[]; policy: RoutingPolicy } => {
    const routing = config.routing[capability];
    const policyBase = routing?.policy || config.settings.defaultPolicy;
    /*
     * PEDIR UN PROVEEDOR POR SU NOMBRE NO ES LO MISMO QUE ESPERAR UN RESPALDO.
     *
     * `allowedProviders` ya existía, pero solo servía para RECORTAR la cadena: si
     * el proveedor pedido no estaba en ella, no había manera de llegar a él salvo
     * metiéndolo en la cadena de todos —y entonces se convierte en el respaldo de
     * todos, que es justo lo que no se quiere (Weë Brain pide DeepSeek; Weë Chef
     * no debe acabar ahí porque Gemini se cayera).
     *
     * Así que cuando la petición nombra a sus proveedores, ESOS son la cadena, en
     * el orden en que vienen. No se inventa ninguna elección: se obedece la que
     * ya traía la petición. Quien no nombre a nadie —que es todo el resto de Weë—
     * sigue con la cadena de siempre, sin enterarse.
     */
    if (routing && routing.chain.length) {
      const nombrados = (prefs.allowedProviders || [])
        .filter((provider) => !routing.chain.some((link) => link.provider === provider))
        .map((provider) => ({ provider }));
      /*
       * Se AÑADEN al final, no se sustituye la cadena. Sustituirla dejaba a los
       * demás proveedores fuera sin decir por qué, y el motivo del descarte es
       * medio panel de administración: el filtro de más abajo los aparta uno a uno
       * y cada uno deja dicho que quedó "fuera de la familia de modelos permitida".
       */
      return { links: [...routing.chain, ...nombrados], policy: policyBase };
    }
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
    const { links, policy } = linksFor(capability, config, prefs);
    const excluded = new Set(prefs.excludeProviders || []);
    const candidates: InternalCandidate[] = [];
    const skipped: RouteDecision['skipped'] = [];
    /*
     * ¿Existe algún proveedor REAL con clave y capaz de atender esta capacidad?
     * Se pregunta a TODOS los adaptadores, no solo a los de la cadena. Una cadena
     * incompleta es un fallo de configuración nuestro, y no puede ser la excusa para
     * servir un resultado de muestra: si el proveedor existe y sabe hacerlo, o se
     * sirve de verdad o se falla de verdad. Tampoco cuentan los descartes por
     * preferencia de la petición ni los pasajeros (pausa, cuota, límite, calidad).
     */
    const realProviderAvailable = Object.entries(deps.adapters).some(([id, adapter]) => {
      if (!adapter || id === 'mock') return false;
      const cfg = config.providers[id];
      if (cfg && cfg.enabled === false) return false;
      return adapter.isConfigured() && adapter.supports(capability);
    });
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

    // Último recurso: modo demo. Solo entra cuando NO existe ningún proveedor real
    // configurado capaz de atender esta capacidad. Si existe uno y falla, el motor
    // lanza el error: el llamador reembolsa la reserva de Credits y la persona ve qué
    // pasó, en vez de recibir contenido de muestra creyendo que es un resultado real.
    // Sustituir en silencio una IA real que falla por una respuesta inventada sería
    // engañar a quien paga. Esta regla vale para TODAS las modalidades por igual.
    const mock = deps.adapters.mock;
    const mockAllowed = !realProviderAvailable;
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
      realProviderAvailable,
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
        /*
         * CERRAR NO ES COBRAR.
         *
         * `credits` es lo que esta operación vale según el catálogo. Solo se
         * convierte en cobro cuando la generación va atada a una transacción del
         * Credit Engine. Los pasos internos de Weë no la llevan: por ejemplo la
         * adaptación de idioma, que traduce el prompt antes de mandarlo a un
         * proveedor que solo admite inglés y que no se le cobra a nadie.
         *
         * Escribir ahí el precio teórico inflaba el acumulado de
         * aiUsage/{día}.credits y cualquier informe que lo leyera: una edición de
         * imagen con Seedream dejaba 7 Credits en el libro habiendo cobrado 5.
         * El precio teórico se guarda aparte y creditsCharged queda reservado
         * para lo que de verdad se cobró.
         *
         * Lo que se devuelve al llamador (`credits`, más abajo) NO cambia: de él
         * dependen el resumen del trabajo y el cobro final en modo real.
         */
        // Aquí la transacción sigue AUTORIZADA: todavía puede reembolsarse entera,
        // así que este paso NO puede declarar ningún cobro. Solo deja lo que vale.
        // Quien conoce el desenlace lo escribe después, en ledger.settle().
        // Una respuesta real es lo único que asciende un proveedor a REAL_API_VERIFIED
        if (!demo) void recordRealSuccess(candidate.provider, result.model || candidate.model.id, capability, generationId);
        await deps.ledger.close(generationId, {
          status: 'COMPLETED',
          providerCost: result.costUSD,
          /*
           * Si quien pidió la generación sabe lo que le cuesta a la persona, manda
           * él. Es el caso de Weë Brain, que cobra por bloques de doce y por tanto
           * es el único que sabe si ESTA respuesta vale 0 o 1. Nadie más lo manda,
           * así que para el resto esto es exactamente lo de siempre. Y `credits`
           * —lo que se devuelve al llamador— no se toca: solo cambia lo anotado.
           */
          creditsEstimated: request.creditsEstimated ?? credits,
          durationMs,
          usage: result.usage,
          outputType: outputTypeOf(result.output.kind),
          videoDurationSec: result.output.durationSec,
          resolution: typeof result.meta?.resolution === 'string' ? result.meta.resolution : undefined,
          // Dimensiones: solo si el adaptador dice cuáles usó. El libro no las deduce.
          width: typeof result.meta?.width === 'number' ? result.meta.width : undefined,
          height: typeof result.meta?.height === 'number' ? result.meta.height : undefined,
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
        await deps.ledger.close(generationId, { status: 'FAILED', providerCost: 0, creditsEstimated: 0, durationMs: now() - start, error: sanitizeForLog(message, 300) });
        const countsAsFailure = !(error instanceof NotConfiguredError) && (!(error instanceof ProviderError) || error.retryable);
        if (countsAsFailure) deps.health.failure(candidate.provider, settings);
        console.warn(`WEË AI ENGINE: ${candidate.provider}/${candidate.model.id} falló en ${capability} (intento ${attempt}): ${message}`);
      }
    }
    throw classifyError(lastError);
  };

  return { route, execute };
}
