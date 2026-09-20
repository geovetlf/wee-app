import {
  AdapterExecutor,
  CanonicalResponse,
  CapabilityId,
  DESDE_ENGINE,
  ExecutorOutcome,
  Gateway,
  GatewayReason,
  Registry,
  Tracer,
  WeeError,
  WeeErrorCode,
  crearGateway,
  crearRegistro,
  errorDelCore,
  modalidadDe,
  normalizarUso,
  sanearMeta,
} from '../core';
import { datosDelRegistro } from '../registry';
import { EngineConfig, loadConfig } from './config';
import { classifyError } from './errors';
import { NotConfiguredError, ProviderError } from './http';
import { ADAPTERS, DEFAULT_ROUTING } from './registry';
import { sanitizeForLog } from './sanitize';
import { EngineContext, ModelSpec, ProviderAdapter, ProviderConfig, ProviderResult, RoutingPrefs } from './types';

/**
 * WEË AI GATEWAY — LA COMPOSICIÓN SOBRE EL MOTOR.
 *
 * El Gateway del Core (`core/gateway.ts`) es puro: valida, resuelve contra el
 * registro y normaliza, pero no sabe hablar con ningún adaptador ni de dónde
 * sale el registro. Este archivo es quien lo sabe, y es lo único que sabe:
 *
 *   · `crearEjecutorDelMotor`  — el puerto `AdapterExecutor` sobre los
 *     `ProviderAdapter` de `engine/providers/`: tiempo límite por modalidad,
 *     interruptor de administración, traducción de errores del motor al
 *     vocabulario del Core y de `ProviderResult` a `CanonicalResponse`.
 *   · `crearGatewayDelMotor`   — enchufa registro + ejecutor + traza + reloj.
 *   · `gatewayDeWee`           — la instancia de Weë, sobre `ADAPTERS` y la
 *     configuración viva.
 *
 * ── Lo que NO hace, a propósito ─────────────────────────────────────────────
 *
 * No elige proveedor: ejecuta el que le mandan. No escribe el libro
 * (`aiGenerations`): la persistencia llega con el Router y el Job Engine, que
 * son quienes saben de intentos y de transacciones; hasta entonces cada
 * operación deja UNA línea de registro por el `Tracer`, y NINGUNA ruta de
 * producción pasa por aquí. No sabe de Credits. No importa Firestore: la
 * configuración le entra por `loadConfig`, que es la misma costura que ya usa
 * el router.
 *
 * ── El interruptor de administración ────────────────────────────────────────
 *
 * `aiProviders/{id}.enabled` y `aiProviders/{id}.models[modelId].enabled` son
 * la herramienta básica de incidente: apagar un proveedor que sangra coste sin
 * desplegar nada. Por eso el registro contra el que se resuelve NO es la foto
 * del arranque: se deriva de la configuración viva y se rehace cuando ella
 * cambia (como mucho una vez por minuto, que es lo que dura su caché). Y el
 * ejecutor lo vuelve a comprobar, porque puede componerse con un registro que
 * alguien construyó a mano.
 */

type ConfigDelMotor = Pick<EngineConfig, 'providers' | 'settings'>;

export interface EjecutorDeps {
  adapters: Record<string, ProviderAdapter>;
  /** Configuración viva (o la que sea, en pruebas). Ya viene cacheada. */
  config: () => ConfigDelMotor | Promise<ConfigDelMotor>;
  now?: () => number;
  /**
   * ¿HAY QUIEN RECOJA UNA TAREA A MEDIAS? Cerrado por defecto.
   *
   * Pedirle a un adaptador que acepte y suelte solo es honesto si después
   * alguien va a preguntar por esa tarea: el receptor de avisos y la
   * reconciliación. Mientras eso no esté en marcha, aceptar sería dejar el
   * trabajo esperando un desenlace que no va a llegar —y el dinero reservado
   * con él—, así que esto sigue apagado hasta que se autorice encenderlo.
   */
  aceptaAsincrono?: boolean;
}

/** Tiempo límite TOTAL de la ejecución, agotado. Distinto del de una llamada HTTP dentro del adaptador. */
class TiempoAgotado extends ProviderError {
  constructor(provider: string, ms: number) {
    super(`${provider}: tardó más de ${Math.round(ms / 1000)} s`, provider, undefined, true);
    this.name = 'TiempoAgotado';
  }
}

const conTiempoLimite = <T>(promesa: Promise<T>, ms: number, provider: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TiempoAgotado(provider, ms)), ms);
    promesa.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/**
 * La forma EXACTA con la que `fetchJson`/`fetchBytes` envuelven un
 * `AbortController` vencido: «<proveedor>: This operation was aborted». Anclada
 * entera a propósito: un cuerpo 5xx del proveedor que dijera «task aborted» no
 * es un tiempo agotado, es un fallo suyo, y no puede colarse aquí.
 */
const ABORTADO_POR_TIEMPO = /^[^:]+: (?:This|The) operation was aborted\.?$/i;

const MOTIVO_POR_CODIGO: Partial<Record<WeeErrorCode, GatewayReason>> = {
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limited',
  CONTENT_POLICY: 'input_rejected',
  INVALID_REQUEST: 'invalid_request',
};

/**
 * Del fallo de un adaptador al vocabulario del Core. Es el `ErrorNormalizer`
 * de la Fase 0 aplicado al motor: reutiliza `classifyError` —las expresiones
 * que ya reconocen tiempo agotado y rechazo de contenido— y solo añade lo que
 * el motor no distinguía: credencial rechazada (401/403), cuota (429) y el
 * aborto de transporte que `classifyError` no sabía leer.
 *
 * NUNCA el mensaje crudo: al resultado va el código, el motivo y el estado
 * HTTP. El mensaje, saneado, se queda en el registro del servidor.
 */
export const normalizarErrorDelMotor = (error: unknown, providerId: string): WeeError => {
  const source = `adapter:${providerId}`;
  const con = (code: WeeErrorCode, reason: GatewayReason, extra: Record<string, unknown> = {}, providerCode?: string): WeeError =>
    errorDelCore(code, source, { providerCode, details: { reason, ...extra } });

  if (error instanceof TiempoAgotado) return con('TIMEOUT', 'timeout', { scope: 'execution' });
  if (error instanceof NotConfiguredError) return con('PROVIDER_UNAVAILABLE', 'not_configured');

  if (error instanceof ProviderError) {
    const providerCode = error.status !== undefined ? String(error.status) : undefined;
    const extra = { providerRetryable: error.retryable };
    /* Una credencial rechazada NO es `AUTH_ERROR`: ese código es de la persona
     * (sin sesión) y se le atribuiría a ella. Es el proveedor el que no está. */
    if (error.status === 401 || error.status === 403) return con('PROVIDER_UNAVAILABLE', 'provider_auth_failed', extra, providerCode);
    if (error.status === 429) return con('RATE_LIMIT', 'rate_limited', extra, providerCode);
    if (ABORTADO_POR_TIEMPO.test(error.message)) return con('TIMEOUT', 'timeout', { ...extra, scope: 'http' }, providerCode);
    const clasificado = classifyError(error);
    if (clasificado.code === 'TIMEOUT') return con('TIMEOUT', 'timeout', { ...extra, scope: 'provider' }, providerCode);
    if (clasificado.code === 'INVALID_REQUEST' && clasificado.details.reason === 'input_rejected') {
      return con('CONTENT_POLICY', 'input_rejected', extra, providerCode);
    }
    return con(DESDE_ENGINE[clasificado.code] ?? 'PROVIDER_ERROR', 'provider_error', extra, providerCode);
  }

  const clasificado = classifyError(error);
  /* «No disponible» dicho por un adaptador es SU indisponibilidad, no la de la
   * capacidad: el Gateway ya comprobó que la capacidad existe. */
  if (clasificado.code === 'NOT_AVAILABLE') return con('PROVIDER_UNAVAILABLE', 'not_available');
  if (clasificado.code === 'INVALID_REQUEST' && clasificado.details.reason === 'input_rejected') return con('CONTENT_POLICY', 'input_rejected');
  const code = DESDE_ENGINE[clasificado.code] ?? 'INTERNAL_ERROR';
  const reason = MOTIVO_POR_CODIGO[code] ?? (clasificado.code === 'GENERATION_FAILED' ? 'generation_failed' : 'provider_error');
  return con(code, reason);
};

/** Los mismos ajustes de administración que aplica el router a un modelo: coste, calidad, duración y apagado. */
const conAjustesDeAdministracion = (model: ModelSpec, config?: ProviderConfig): ModelSpec & { enabled: boolean } => {
  const override = config?.models?.[model.id];
  return { ...model, ...(override || {}), cost: override?.cost || model.cost, enabled: override?.enabled !== false } as ModelSpec & { enabled: boolean };
};

/** De lo que devuelve un adaptador a la respuesta canónica de la Fase 0. Sin inventar: `lines` vacías, `usd` el que midió él. */
const aRespuestaCanonica = (result: ProviderResult, providerId: string, modelId: string, latencyMs: number): CanonicalResponse => {
  const model = result.model ?? modelId;
  return {
    kind: result.output.kind,
    content: result.output.content,
    urls: result.output.urls ?? (result.output.url ? [result.output.url] : undefined),
    durationSec: result.output.durationSec,
    sources: result.output.sources,
    actual: {
      provider: { lines: [], usd: result.costUSD, provider: providerId, model },
      latencyMs: Number.isFinite(result.latencyMs) ? result.latencyMs : latencyMs,
    },
    model,
    meta: result.meta,
  };
};

export const crearEjecutorDelMotor = (deps: EjecutorDeps): AdapterExecutor => {
  const now = deps.now ?? (() => Date.now());
  const rechazo = (code: WeeErrorCode, reason: GatewayReason, extra: Record<string, unknown> = {}): ExecutorOutcome =>
    ({ ok: false, error: errorDelCore(code, 'gateway', { details: { reason, ...extra } }) });

  return {
    async run(req) {
      const { capability, entry, implementation: impl, input, trace, execution, hooks } = req;

      /* Deriva entre registro y adaptadores: el registro se construye a partir
       * de ellos, así que esto solo pasa con un registro hecho a mano. */
      const adapter = deps.adapters[impl.provider.id];
      if (!adapter) return rechazo('PROVIDER_UNAVAILABLE', 'adapter_missing');
      const spec = adapter.models.find((m) => m.id === impl.model.id);
      if (!spec) return rechazo('MODEL_UNAVAILABLE', 'unknown_model');
      if (!adapter.supports(capability as CapabilityId)) return rechazo('PROVIDER_UNAVAILABLE', 'adapter_unsupported');

      const config = await deps.config();
      const providerConfig = config.providers[adapter.id];
      if (providerConfig?.enabled === false) return rechazo('PROVIDER_UNAVAILABLE', 'provider_disabled');
      const modelo = conAjustesDeAdministracion(spec, providerConfig);
      if (!modelo.enabled) return rechazo('MODEL_UNAVAILABLE', 'model_disabled');

      /*
       * TIEMPO LÍMITE POR MODALIDAD, nunca uno universal. Para las capacidades
       * que el motor enruta se usa exactamente su modalidad (transcribir audio
       * es voz, leer un documento es visión); para las que solo están en el
       * catálogo, la modalidad de lo que producen es la mejor aproximación que
       * hay. Y el plazo absoluto de quien llama, si viene, manda por encima.
       */
      const modalidad = capability in DEFAULT_ROUTING ? modalidadDe(capability as CapabilityId) : entry.produces;
      let timeoutMs = execution.timeoutMs ?? config.settings.timeoutsMs[modalidad] ?? 120_000;
      if (execution.deadlineAt !== undefined) timeoutMs = Math.min(timeoutMs, execution.deadlineAt - now());
      if (timeoutMs <= 0) return rechazo('TIMEOUT', 'deadline_passed');

      /* El contexto heredado del motor, SIN nada de Credits: ni servicio, ni
       * transacción, ni estimación. El objetivo es contenido y vive en `input`. */
      const ctx: EngineContext = {
        userId: trace.userId,
        jobId: trace.runId,
        stepId: trace.stepId,
        experienceId: trace.workplace,
        goal: typeof input.goal === 'string' ? input.goal : undefined,
        requestId: trace.requestId,
      };
      const prefs: RoutingPrefs = { quality: execution.hints?.quality, durationSec: execution.hints?.durationSec };
      /*
       * EL GANCHO ES OBSERVACIÓN. Los adaptadores lo esperan justo después de
       * que el proveedor acepte la tarea —cuando ya se está pagando—, así que
       * un gancho roto del consumidor no puede tumbar la ejecución ni acabar
       * atribuido al proveedor: se anota, se avisa y la tarea sigue.
       */
      let ganchoFallo = false;
      const onStatus = hooks?.onProgress
        ? async (_status: 'PROCESSING', meta: Record<string, unknown>) => {
            try {
              await hooks.onProgress?.({ stage: 'processing', at: now(), providerMeta: sanearMeta(meta).valor as Record<string, unknown> });
            } catch (error) {
              ganchoFallo = true;
              console.warn(`WEË AI GATEWAY: el gancho onProgress falló (${trace.requestId}): ${sanitizeForLog(error, 300)}`);
            }
          }
        : undefined;

      const inicio = now();
      try {
        const result = await conTiempoLimite(
          adapter.run({ capability: capability as CapabilityId, model: modelo, input: input as Record<string, unknown>, ctx, prefs, timeoutMs, onStatus, ...(deps.aceptaAsincrono ? { acceptAsync: true } : {}) }),
          timeoutMs,
          adapter.id,
        );
        /*
         * EL PROVEEDOR LA COGIÓ. Aquí no hay respuesta que canonizar: hay un
         * nombre con el que volver a preguntar. El uso viaja igual —lo que el
         * proveedor ya dijo del coste no se pierde—, pero no se inventa un
         * resultado vacío para que el tipo encaje.
         */
        if (result.accepted) {
          /*
           * SIN USO. `GatewayUsage` es lo que el proveedor DIJO que consumió, y
           * al aceptar todavía no ha dicho nada: lo que hay es una estimación
           * del adaptador. Mandarla aquí la convertiría en consumo real en el
           * libro, y el consumo real llega con el desenlace. El coste estimado
           * viaja por donde ya viajaba —`meta`, y `onStatus`—, no por aquí.
           *
           * Si el adaptador no dio nombre de operación, se manda vacío a
           * propósito: el Gateway lo rechaza con `accepted_without_operation`,
           * que es exactamente lo que es, en vez de inventarle uno.
           */
          return {
            ok: true,
            accepted: true,
            operation: { providerId: adapter.id, operationId: String(result.accepted.operationId ?? '').trim() },
            warnings: ganchoFallo ? ['progress_hook_failed'] : undefined,
          };
        }
        const response = aRespuestaCanonica(result, adapter.id, modelo.id, now() - inicio);
        return {
          ok: true,
          response,
          usage: result.usage ? normalizarUso(result.usage, response.kind) : undefined,
          warnings: ganchoFallo ? ['progress_hook_failed'] : undefined,
        };
      } catch (error) {
        console.warn(`WEË AI GATEWAY: ${adapter.id}/${modelo.id} falló en ${capability} (${trace.requestId}): ${sanitizeForLog(error, 300)}`);
        return { ok: false, error: normalizarErrorDelMotor(error, adapter.id) };
      }
    },
  };
};

export interface GatewayDelMotorDeps {
  adapters: Record<string, ProviderAdapter>;
  loadConfig: () => Promise<EngineConfig>;
  tracer: Tracer;
  now?: () => number;
  /**
   * SE LE PASA AL EJECUTOR, y por eso tiene que estar declarado AQUÍ.
   *
   * Faltaba, y el canary real lo encontró: quien componía el Gateway lo pasaba
   * con un `...spread`, que es justo la forma que TypeScript NO comprueba por
   * propiedades de más. El tipo lo aceptaba, el compilador callaba, y la opción
   * se caía por el camino sin que nadie se enterara — hasta que el proveedor
   * sondeó ochenta segundos en vez de aceptar y soltar.
   */
  aceptaAsincrono?: boolean;
}

/**
 * Un Gateway completo sobre el motor. El registro se deriva de la
 * configuración viva y se memoriza por identidad del objeto de configuración:
 * `loadConfig` devuelve el mismo objeto mientras dura su caché, así que el
 * registro se rehace como mucho una vez por minuto y nunca por petición.
 */
export const crearGatewayDelMotor = (deps: GatewayDelMotorDeps): Gateway => {
  let ultimo: { config: EngineConfig; registry: Registry } | undefined;
  const registro = async (): Promise<Registry> => {
    const config = await deps.loadConfig();
    if (!ultimo || ultimo.config !== config) {
      ultimo = { config, registry: crearRegistro(datosDelRegistro(deps.adapters, config.providers)) };
    }
    return ultimo.registry;
  };
  return crearGateway({
    registry: registro,
    executor: crearEjecutorDelMotor({
      adapters: deps.adapters,
      config: deps.loadConfig,
      now: deps.now,
      ...(deps.aceptaAsincrono ? { aceptaAsincrono: true } : {}),
    }),
    tracer: deps.tracer,
    now: deps.now ?? (() => Date.now()),
  });
};

/**
 * Una línea por operación. No es el sistema de observabilidad —ese llega
 * después—: es la garantía de que nada que pase por aquí gaste dinero sin
 * dejar, al menos, rastro de qué, quién y cuánto.
 */
export const trazaDeConsola: Tracer = {
  record: (t) => {
    const donde = [t.provider, t.model].filter(Boolean).join('/') || '—';
    const coste = t.providerUsd === undefined ? '' : ` usd=${t.providerUsd.toFixed(4)}`;
    const fallo = t.errorCode ? ` error=${t.errorCode}` : '';
    console.log(`WEË AI GATEWAY: ${t.status} ${t.capability} ${donde} ${t.latencyMs} ms${coste}${fallo} requestId=${t.requestId} traceId=${t.traceId}`);
  },
};

let instancia: Gateway | undefined;

/** El Gateway de Weë: adaptadores reales y configuración viva. Se construye la primera vez que se pide. */
export const gatewayDeWee = (): Gateway => {
  if (!instancia) instancia = crearGatewayDelMotor({ adapters: ADAPTERS, loadConfig, tracer: trazaDeConsola });
  return instancia;
};
