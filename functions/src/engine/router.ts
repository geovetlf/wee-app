import { presupuestoDeIntento } from '../core';
import { CapabilityId } from '../creator/types';
import { EngineConfig } from './config';
import { Ledger } from './ledger';
import { creditsFor, estimateUsd } from './pricing';
import { recordRealSuccess } from './verification';
import { sanitizeForLog } from './sanitize';
import { NotConfiguredError, ProviderError } from './http';
import { classifyError, costeTrasUnFallo, EngineError, motivoDeNoDisponible, noDisponible, tareaEnElProveedor } from './errors';
import { camposAjustables, ContextoDeElegibilidad, elegibilidadDeLaCapacidad, elegibleEnAlgunaJurisdiccion, modeloElegible, textoDeElegibilidad } from './elegibilidad';
import { providerCallsToday, providerUsdToday, usdToday } from './limits';
import {
  CausaDeDescarte,
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
const applyOverrides = (model: ModelSpec, config?: ProviderConfig, contexto?: ContextoDeElegibilidad): (ModelSpec & { enabled: boolean }) => {
  const override = config?.models?.[model.id];
  /*
   * Elegible = lo que diga `modeloElegible` para ESTA operación (la misma regla que el gateway del Core y el
   * registro). Los ajustes cambian calidad, velocidad, coste y duración; nunca quién es el modelo ni su gobierno.
   */
  return { ...model, ...camposAjustables(override), cost: override?.cost || model.cost, enabled: modeloElegible(model, override, contexto).elegible } as ModelSpec & { enabled: boolean };
};

/**
 * El mejor modelo del proveedor para la capacidad, SOLO entre los elegibles para la operación: la calidad, el coste
 * y el modelo fijado ordenan lo que la política dejó pasar, nunca lo amplían.
 */
export function pickModel(adapter: ProviderAdapter, capability: CapabilityId, quality: QualityTier, policy: RoutingPolicy, config?: ProviderConfig, modelId?: string, contexto?: ContextoDeElegibilidad): ModelSpec | null {
  const models = adapter.models.filter((m) => m.capabilities.includes(capability)).map((m) => applyOverrides(m, config, contexto)).filter((m) => m.enabled);
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
  /**
   * De dónde sale la jurisdicción de la operación cuando la petición no la trae: la fuente de la cuenta, que compone
   * `engine/index.ts` (`jurisdiccionesDeLaCuenta`). Solo se consulta si algún modelo de la cadena tiene reglas
   * territoriales; si falla o no sabe, la regla común falla cerrado.
   */
  jurisdiccionesDe?: (userId: string) => Promise<readonly string[] | undefined>;
}

interface InternalCandidate extends RouteCandidate {
  durationOk: boolean;
  meetsQuality: boolean;
}

/** `costeTrasUnFallo` (H0 #22) vive en `engine/errors.ts`, con la clasificación de errores; se reexporta aquí para quien la importe del router. */
export { costeTrasUnFallo };

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
    /*
     * La política de la operación: la pone el servidor —la petición, o la fuente de la cuenta— y la leen solo las
     * reglas territoriales de cada modelo. La cuenta solo se consulta si algún modelo de la cadena las tiene: el
     * tráfico de siempre no hace ni una lectura más. Si la consulta falla, no hay jurisdicción y se falla cerrado.
     */
    const territorial = links.some((l) => (deps.adapters[l.provider]?.models ?? []).some((m) => !!m.territorio && m.capabilities.includes(capability)));
    const jurisdicciones = request.jurisdicciones?.length
      ? request.jurisdicciones
      : territorial && deps.jurisdiccionesDe
        ? await deps.jurisdiccionesDe(request.userId).catch((error) => {
          console.warn(`WEË AI ENGINE: no se pudo leer la jurisdicción de la cuenta para ${capability}; se falla cerrado: ${sanitizeForLog(error instanceof Error ? error.message : String(error), 200)}`);
          return undefined;
        })
        : undefined;
    const contexto: ContextoDeElegibilidad = { jurisdicciones };
    /*
     * EL INTERRUPTOR (H0 #19). Detenida, no hay candidatos —tampoco el demo, que
     * antes era lo que entraba al «apagar» todos los proveedores, y se cobraba—:
     * `execute` contesta NOT_AVAILABLE antes de abrir el libro.
     */
    if (settings.iaDetenida === true) {
      return { capability, quality, policy, candidates: [], skipped: [{ provider: '*', reason: 'ia_detenida', causa: 'pasajera' }], realProviderAvailable: false };
    }
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
    /*
     * EL TOPE DE GASTO DIARIO (FASE 8). Alcanzado, no hay candidatos: ni otro
     * proveedor ni el demo. `execute` contesta NOT_AVAILABLE antes de abrir el
     * libro y quien llamó reembolsa su reserva. Sin tope configurado, nada cambia.
     */
    const tope = settings.maxUsdPerDay;
    if (typeof tope === 'number' && tope > 0 && usdToday(usage) >= tope) {
      return { capability, quality, policy, candidates: [], skipped: [{ provider: '*', reason: 'presupuesto_diario_agotado', causa: 'pasajera' }], realProviderAvailable };
    }

    links.forEach((link, index) => {
      const skip = (reason: string, causa: CausaDeDescarte, estado?: RouteDecision['skipped'][number]['estado'], modelo?: string, enOtraJurisdiccion?: boolean): void => {
        skipped.push({
          provider: link.provider, model: modelo ?? link.model, reason, causa,
          ...(estado ? { estado } : {}), ...(enOtraJurisdiccion !== undefined ? { enOtraJurisdiccion } : {}),
        });
      };
      const adapter = deps.adapters[link.provider];
      if (!adapter) return skip('no existe', 'configuracion');
      const providerConfig = config.providers[link.provider] || { enabled: true, priority: 50 };
      if (!providerConfig.enabled) return skip('desactivado por administración', 'configuracion');
      if (excluded.has(link.provider)) return skip('excluido en esta petición', 'peticion');
      if (prefs.allowedProviders && !prefs.allowedProviders.includes(link.provider)) return skip('fuera de la familia de modelos permitida', 'peticion');
      if (!adapter.isConfigured()) return skip('sin clave configurada', 'configuracion');
      if (!adapter.supports(capability)) return skip('no atiende esta capacidad', 'configuracion');
      if (deps.health.isOpen(link.provider)) return skip('en pausa por fallos recientes', 'pasajera');
      const maxCalls = providerConfig.limits?.maxCallsPerDay;
      if (maxCalls && maxCalls > 0 && providerCallsToday(usage, link.provider) >= maxCalls) return skip('límite diario del proveedor alcanzado', 'pasajera');
      /* Declarado desde siempre en ProviderConfig y nunca aplicado hasta ahora (inventario FASE 13). */
      const maxUsd = providerConfig.limits?.maxUsdPerDay;
      if (maxUsd && maxUsd > 0 && providerUsdToday(usage, link.provider) >= maxUsd) return skip('presupuesto diario del proveedor alcanzado', 'pasajera');
      if (link.minQuality && QUALITY_RANK[quality] < QUALITY_RANK[link.minQuality]) return skip('reservado para tareas de más calidad', 'peticion');
      if (link.maxQuality && QUALITY_RANK[quality] > QUALITY_RANK[link.maxQuality]) return skip('no alcanza la calidad que pide la tarea', 'peticion');
      const model = pickModel(adapter, capability, quality, policy, providerConfig, link.model || prefs.modelId, contexto);
      if (!model) {
        /* Por qué: el escalón de elegibilidad del modelo fijado o, sin fijar, el del primero que cubre la capacidad. */
        const fijado = link.model || prefs.modelId;
        const suyo = fijado ? adapter.models.find((m) => m.id === fijado && m.capabilities.includes(capability)) : undefined;
        const porQue = fijado
          ? (suyo ? modeloElegible(suyo, providerConfig.models?.[suyo.id], contexto) : undefined)
          : elegibilidadDeLaCapacidad(adapter.models, capability, providerConfig.models, contexto);
        const deSiempre = prefs.modelId ? `sin el modelo ${prefs.modelId} disponible` : 'sin modelo disponible para esta capacidad';
        if (porQue && !porQue.elegible) {
          /* ¿Sería elegible en otra jurisdicción? Es lo que separa «no en tu región» de «no, en ninguna parte». */
          const territorial = porQue.estado === 'JURISDICTION_UNKNOWN' || porQue.estado === 'BLOCKED_FOR_JURISDICTION' || porQue.estado === 'REVIEW_REQUIRED';
          const modeloDelPorQue = adapter.models.find((m) => m.id === (suyo?.id ?? porQue.modelo));
          const enOtra = territorial && !!modeloDelPorQue?.territorio
            ? elegibleEnAlgunaJurisdiccion(modeloDelPorQue, providerConfig.models?.[modeloDelPorQue.id])
            : undefined;
          return skip(porQue.estado === 'APPROVED' ? deSiempre : textoDeElegibilidad(porQue), 'elegibilidad', porQue.estado, suyo?.id ?? porQue.modelo, enOtra);
        }
        return skip(deSiempre, prefs.modelId ? 'peticion' : 'configuracion');
      }
      const estimatedUsd = estimateUsd(model, capability, input, prefs);
      const estimatedCredits = creditsFor(capability, estimatedUsd, settings, adapter.id === 'mock', input);
      if (prefs.maxCredits !== undefined && estimatedCredits > prefs.maxCredits) return skip(`supera el tope de ${prefs.maxCredits} Credits`, 'peticion');
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
      const model = pickModel(mock, capability, quality, policy, config.providers.mock, undefined, contexto);
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
      ...(jurisdicciones?.length ? { jurisdicciones: [...jurisdicciones] } : {}),
    };
  };

  const execute = async (request: EngineRequest): Promise<EngineResult> => {
    const config = await deps.loadConfig();
    const { settings } = config;
    const decision = await route(request, config);
    const { capability, input } = request;
    const modality = modalityOf(capability);
    /* La decisión de elegibilidad, al libro (auditoría): solo cuando hay algo que auditar. */
    const descartes = decision.skipped.flatMap((s) => (s.estado ? [{ provider: s.provider, ...(s.model ? { model: s.model } : {}), estado: s.estado }] : []));
    const elegibilidad = decision.jurisdicciones?.length || descartes.length
      ? { jurisdicciones: decision.jurisdicciones?.length ? [...decision.jurisdicciones] : null, descartes }
      : undefined;
    const ctx = {
      userId: request.userId,
      jobId: request.jobId,
      stepId: request.stepId,
      experienceId: request.experienceId,
      goal: request.goal,
      requestId: request.requestId,
      service: request.service,
      creditTransactionId: request.creditTransactionId,
      attribution: request.attribution,
      evalRunId: request.evalRunId,
    };
    const prefs: RoutingPrefs = request.prefs || {};
    /*
     * EL PLAZO SE RESTA, NO SE COPIA.
     *
     * `timeoutsMs[modality]` dice cuánto puede tardar el PROVEEDOR. Lo que hace
     * falta saber es cuánto tiempo QUEDA, y son dos cosas distintas: este bucle
     * prueba varios candidatos en cadena y cada paso del plan vuelve a entrar
     * aquí, así que el plazo de la tabla se aplicaba entero una y otra vez sin
     * que nadie descontara lo ya gastado. Con `deadlineAt` se descuenta.
     *
     * La regla es la del Job Engine (`presupuestoDeIntento`, Fase 8), que es la
     * canónica: lo más corto entre lo que puede tardar un intento y lo que
     * queda. Quien no traiga plazo se comporta como siempre.
     */
    const porModalidad = settings.timeoutsMs[modality] ?? 120_000;
    const timeoutMs = request.deadlineAt === undefined
      ? porModalidad
      : presupuestoDeIntento(request.deadlineAt, now(), porModalidad);
    if (timeoutMs <= 0) {
      throw new EngineError(
        'TIMEOUT',
        'Esto se quedó sin tiempo antes de empezar. No te cobré.',
        { capability, reason: 'sin_presupuesto' },
      );
    }

    if (!decision.candidates.length) {
      const why = decision.skipped.map((s) => `${s.provider}: ${s.reason}`).join('; ');
      console.warn(`WEË AI ENGINE: ningún proveedor disponible para ${capability} (${why})`);
      /*
       * SIN CANDIDATOS es un estado explícito con su MOTIVO PÚBLICO, no un «inténtalo más tarde» que se arregla solo:
       * «más tarde» solo si lo que falta es pasajero; si no, en tu región, falta tu país, con estas opciones o, sin
       * más, no disponible. Los escalones y los proveedores se quedan en el registro de arriba; a la app no viajan.
       */
      throw noDisponible(motivoDeNoDisponible(decision.skipped));
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
        ...(elegibilidad ? { elegibilidad } : {}),
      });
      const start = now();
      /* El proveedor ya tiene la tarea: si después falla, pudo costar dinero (ver costeTrasUnFallo). */
      let despachado = false;
      const onStatus = async (status: 'PROCESSING', meta: Record<string, unknown>) => {
        if (tareaEnElProveedor(meta)) despachado = true;
        await deps.ledger.progress(generationId, {
          status,
          providerTaskId: typeof meta.providerTaskId === 'string' ? meta.providerTaskId : undefined,
          estimatedTokens: typeof meta.estimatedTokens === 'number' ? meta.estimatedTokens : undefined,
          estimatedUsd: typeof meta.estimatedUsd === 'number' ? meta.estimatedUsd : undefined,
          resolution: typeof meta.resolution === 'string' ? meta.resolution : undefined,
        });
      };
      try {
        const salida = await withTimeout(adapter.run({ capability, model: candidate.model, input, ctx, prefs, timeoutMs, onStatus }), timeoutMs, candidate.provider);
        /*
         * ESTE CAMINO NO SABE ESPERAR.
         *
         * El camino de siempre no lleva Job Engine detrás: si un adaptador
         * devolviera aquí una tarea a medias, no habría dónde guardarla ni quién
         * preguntara por ella después, y el trabajo se perdería en silencio
         * después de haberse pagado. No puede pasar —nunca se pide
         * `acceptAsync` desde aquí—, así que si pasa es un fallo del adaptador,
         * y se trata como tal en vez de fingir un resultado.
         */
        if (salida.accepted) throw new EngineError('PROVIDER_ERROR', undefined, { provider: candidate.provider, reason: 'accepted_sin_soporte' });
        const result = salida;
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
        const coste = costeTrasUnFallo(error, despachado);
        await deps.ledger.close(generationId, {
          status: 'FAILED',
          providerCost: 0,
          ...(coste === 'desconocido' ? { providerCostStatus: 'desconocido' as const, providerCostEstimated: candidate.estimatedUsd } : {}),
          creditsEstimated: 0,
          durationMs: now() - start,
          error: sanitizeForLog(message, 300),
        });
        const countsAsFailure = !(error instanceof NotConfiguredError) && (!(error instanceof ProviderError) || error.retryable);
        if (countsAsFailure) deps.health.failure(candidate.provider, settings);
        /* Saneado como el libro de arriba: el mensaje de un proveedor puede traer la cabecera que se le envió (cierre 2026-10-01, server/sanitize). */
        console.warn(`WEË AI ENGINE: ${candidate.provider}/${candidate.model.id} falló en ${capability} (intento ${attempt}): ${sanitizeForLog(message, 300)}`);
      }
    }
    throw classifyError(lastError);
  };

  return { route, execute };
}
