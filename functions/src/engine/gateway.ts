import {
  AdapterExecutor,
  CanonicalResponse,
  CapabilityId,
  DESDE_ENGINE,
  BrainAttachment,
  ContinuityRequirements,
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
import { classifyError, costeTrasUnFallo, tareaEnElProveedor } from './errors';
import { NotConfiguredError, ProviderError } from './http';
import { ADAPTERS, DEFAULT_ROUTING } from './registry';
import { sanitizeForLog } from './sanitize';
import { cubreLoExigido, traducirContinuidad, materialDeLaEntrada } from './continuidad';
import { camposAjustables, modeloElegible } from './elegibilidad';
import {
  MaterialDeUnPasoAnterior, ResolucionDeReferencias, materialEnLaEntrada, upstreamEnLaEntrada,
} from './referencias';
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
  /**
   * LAS JURISDICCIONES DE LA OPERACIÓN, leídas en el servidor (`engine/jurisdiccion.ts`). Solo se preguntan para un
   * modelo con reglas territoriales; sin esto, ese modelo no es elegible (falla cerrado). Nunca del cliente.
   */
  jurisdiccionesDe?: (userId: string) => Promise<readonly string[] | undefined>;
  /**
   * DE UN ANCLAJE AL MATERIAL AUTORIZADO. C8, y entra por aquí a propósito.
   *
   * Resolverlo cuesta lecturas de Firestore, y este archivo no sabe de
   * Firestore —la configuración ya le entra por `loadConfig` por el mismo
   * motivo—. Ausente significa que no se materializa nada, que es exactamente
   * el comportamiento que había antes de C8.
   */
  referencias?: (accountId: string, requisitos: ContinuityRequirements) => Promise<ResolucionDeReferencias>;
  /**
   * DE UN ADJUNTO A MATERIAL AUTORIZADO. C11.4, y por la misma costura.
   *
   * Separado del de arriba porque son dos preguntas distintas: uno resuelve
   * «lo de Luna, versión 4» y este «la foto que subió». Pasan por la MISMA
   * puerta de Media Cloud; lo que cambia es cuánto hay que resolver antes.
   */
  recursos?: (accountId: string, adjuntos: readonly BrainAttachment[]) => Promise<ResolucionDeReferencias>;
  /**
   * LO QUE PRODUJERON LOS PASOS ANTERIORES. G8, y por la misma costura.
   *
   * Tercera pregunta distinta con la misma respuesta: quién autoriza. Un
   * anclaje de continuidad, un adjunto y el resultado de otro paso son tres
   * cosas, y las tres pasan por una puerta que comprueba de quién son.
   */
  upstream?: (
    accountId: string,
    pasos: readonly { stepId: string; capability: string; produces?: string; outputRefs: readonly string[] }[],
  ) => Promise<{ materiales: readonly MaterialDeUnPasoAnterior[]; fallos: readonly { reason: string }[] }>;
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

/**
 * Los mismos ajustes de administración que aplica el router a un modelo: coste, calidad, duración y apagado, con la
 * misma regla de elegibilidad Y las jurisdicciones de la operación cuando el modelo tiene reglas territoriales: las lee
 * el servidor de la fuente autorizada (`jurisdiccionesDe`, el país del Perfil Real). Sin ellas —o si la lectura
 * falla—, un modelo territorial no es elegible por esta puerta: falla cerrado.
 */
const conAjustesDeAdministracion = (model: ModelSpec, config?: ProviderConfig, jurisdicciones?: readonly string[]): ModelSpec & { enabled: boolean } => {
  const override = config?.models?.[model.id];
  const elegible = modeloElegible(model, override, jurisdicciones?.length ? { jurisdicciones } : undefined).elegible;
  return { ...model, ...camposAjustables(override), cost: override?.cost || model.cost, enabled: elegible } as ModelSpec & { enabled: boolean };
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
      /* El interruptor de la IA (H0 #19): como si todos los proveedores estuvieran desactivados, antes de despachar. */
      if (config.settings.iaDetenida === true) return rechazo('PROVIDER_UNAVAILABLE', 'provider_disabled', { iaDetenida: true });
      const providerConfig = config.providers[adapter.id];
      if (providerConfig?.enabled === false) return rechazo('PROVIDER_UNAVAILABLE', 'provider_disabled');
      /* Las jurisdicciones, solo si el modelo tiene reglas territoriales; un fallo al leerlas falla cerrado. */
      const jurisdicciones = spec.territorio && deps.jurisdiccionesDe
        ? await deps.jurisdiccionesDe(trace.userId).catch((error) => {
          console.warn(`WEË AI GATEWAY: no se pudo leer la jurisdicción de la cuenta para ${capability}; se falla cerrado: ${sanitizeForLog(error, 200)}`);
          return undefined;
        })
        : undefined;
      const modelo = conAjustesDeAdministracion(spec, providerConfig, jurisdicciones);
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
      /* El proveedor ya tiene la tarea (dijo su nombre): un fallo de aquí en adelante pudo costar dinero (H0 #22). */
      let despachado = false;
      const onStatus = async (_status: 'PROCESSING', meta: Record<string, unknown>) => {
        if (tareaEnElProveedor(meta)) despachado = true;
        if (!hooks?.onProgress) return;
        try {
          await hooks.onProgress({ stage: 'processing', at: now(), providerMeta: sanearMeta(meta).valor as Record<string, unknown> });
        } catch (error) {
          ganchoFallo = true;
          console.warn(`WEË AI GATEWAY: el gancho onProgress falló (${trace.requestId}): ${sanitizeForLog(error, 300)}`);
        }
      };

      /*
       * ── C8 · EL MATERIAL DE LA CONTINUIDAD, ANTES DE LLAMAR A NADIE ────────
       *
       * Aquí y no más abajo, porque este es el último sitio donde todavía no se
       * ha gastado nada. Un anclaje que no da material o un requisito que no
       * cabe en el mecanismo tienen que parar la ejecución ANTES del proveedor:
       * después ya se está pagando, y rechazar entonces cuesta dinero real por
       * algo que se sabía de antemano.
       *
       * Y no lo decide el adaptador. Un adaptador traduce; si además decidiera
       * qué generaciones pueden ocurrir, la política de continuidad acabaría
       * repartida en once archivos y distinta en cada uno.
       */
      let entrada = input as Record<string, unknown>;
      /*
       * ── G8 · LO QUE ESCRIBIÓ EL PASO ANTERIOR ─────────────────────────────
       *
       * Primero de todo, porque sin ello este paso no es el que se planificó:
       * si B depende de A, ejecutar B sin lo que A escribió es generar otra
       * cosa — y cobrarla. Una referencia que no se puede resolver para la
       * ejecución aquí, antes de llamar a nadie.
       *
       * Llega RESUELTO: con el texto dentro o con la llave puesta. El adaptador
       * no tiene que saber que existían identificadores de material.
       */
      if (req.upstream?.length && deps.upstream) {
        const anterior = await deps.upstream(trace.userId, req.upstream);
        if (anterior.fallos.length > 0) {
          return rechazo('INVALID_REQUEST', 'invalid_request', {
            upstream: 'pre_execution_rejected',
            unresolved: anterior.fallos.map((f) => f.reason),
          });
        }
        entrada = upstreamEnLaEntrada(anterior.materiales, entrada);
      }
      /*
       * ── C11.4 · LO QUE LA PERSONA ADJUNTÓ ─────────────────────────────────
       *
       * Antes que la continuidad porque es material de la tarea: la foto que
       * hay que restaurar. Y falla cerrado igual que todo lo demás: un adjunto
       * que no se puede entregar —de otra cuenta, retirado, sin ficha— para la
       * ejecución aquí, sin llamar a nadie.
       */
      if (req.references?.length && deps.recursos) {
        const resueltos = await deps.recursos(trace.userId, req.references);
        if (resueltos.fallos.length > 0) {
          return rechazo('INVALID_REQUEST', 'invalid_request', {
            resources: 'pre_execution_rejected',
            unresolved: resueltos.fallos.map((f) => f.reason),
          });
        }
        entrada = materialEnLaEntrada(resueltos.materiales, entrada);
      }
      const requisitosDeContinuidad = execution.hints?.continuity;
      if (requisitosDeContinuidad && deps.referencias) {
        /*
         * La cuenta es la de la traza, y no se acepta de nadie más: `trace.userId`
         * lo puso el servidor al autenticar. Un `accountId` que llegue en el
         * cuerpo de una petición no prueba absolutamente nada.
         */
        const resolucion = await deps.referencias(trace.userId, requisitosDeContinuidad);
        /*
         * UN SOLO ANCLAJE QUE FALLE PARA LA EJECUCIÓN. No se ejecuta «con lo que
         * haya»: los anclajes solo existen cuando hay algo que CONSERVAR, así
         * que cada uno sostiene un requisito, y resolver tres de cuatro es
         * generar algo que no puede cumplir lo que se pidió —pareciendo que sí—.
         */
        if (resolucion.fallos.length > 0) {
          return rechazo('INVALID_REQUEST', 'invalid_request', {
            continuity: 'pre_execution_rejected',
            unresolved: resolucion.fallos.map((f) => f.reason),
          });
        }
        entrada = materialEnLaEntrada(resolucion.materiales, entrada);
      }

      /*
       * ── C7 · Y AHORA, ¿CABE? ──────────────────────────────────────────────
       *
       * El mecanismo lo declara el adaptador —nunca se le supone—, y la
       * traducción es la misma función que él usará por dentro. Si algo de lo
       * exigido no se sostiene, se para aquí. Un adaptador sin `continuidad` es
       * uno que no tiene mecanismo: entonces lo exigido no se puede sostener y
       * se rechaza igual, en vez de ejecutarse como si nada se hubiera pedido.
       */
      if (requisitosDeContinuidad) {
        const traduccion = traducirContinuidad(
          requisitosDeContinuidad,
          adapter.continuidad?.(capability as CapabilityId, modelo.id)
            ?? { referenciasDeImagen: 0, referenciasDeVideo: 0, controlesDedicados: [] },
          materialDeLaEntrada(entrada),
        );
        if (!cubreLoExigido(traduccion)) {
          return rechazo('INVALID_REQUEST', 'invalid_request', {
            continuity: 'pre_execution_rejected',
            uncovered: traduccion?.noCubiertos.length ?? 0,
            reasons: [...new Set((traduccion?.aspects ?? []).filter((x) => x.support === 'unsupported').map((x) => x.reason))],
          });
        }
      }

      const inicio = now();
      try {
        const result = await conTiempoLimite(
          adapter.run({
            capability: capability as CapabilityId,
            model: modelo,
            input: entrada,
            ctx,
            prefs,
            timeoutMs,
            onStatus,
            /*
             * Y los requisitos ENTEROS, no los dos escalares que `prefs`
             * recorta. Quien sepa traducirlos los traducirá; quien no, los
             * ignora y se comporta exactamente como antes.
             */
            ...(execution.hints ? { hints: execution.hints } : {}),
            /*
             * EXPLÍCITO Y SIEMPRE PRESENTE. Antes iba en un spread condicional:
             * el adaptador recibía la propiedad o no la recibía, y «no
             * recibirla» era indistinguible de «se perdió por el camino» —que
             * es justo lo que pasó—. Ahora siempre llega un booleano, así que
             * si un día vuelve a valer `false` cuando debería valer `true`, se
             * ve en el sitio donde se decide y no tres capas más abajo.
             */
            acceptAsync: deps.aceptaAsincrono === true,
          }),
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
        /*
         * ¿PUDO COBRAR EL PROVEEDOR? (H0 #22) Se decide AQUÍ, el único sitio que tiene el error ORIGINAL, con la regla
         * de siempre (`costeTrasUnFallo`), y viaja en el error (`details.costeDelFallo`): quien cierre la fila del libro
         * lo lee, no lo reconstruye a partir del diagnóstico (RUNTIME §25c).
         *
         * PRIMERO, y con lo único que no puede fallar (`instanceof`). Registrar o normalizar un valor raro —uno que ni
         * siquiera se deja convertir en texto— podría lanzar, y entonces el fallo saldría del ejecutor sin anotar y el
         * conductor lo contaría como una avería previa (cero) aunque el proveedor ya tuviera la tarea. Por eso lo demás
         * va en su propio try, y su respaldo devuelve el error del adaptador ya anotado.
         */
        const costeDelFallo = costeTrasUnFallo(error, despachado);
        try {
          console.warn(`WEË AI GATEWAY: ${adapter.id}/${modelo.id} falló en ${capability} (${trace.requestId}): ${sanitizeForLog(error, 300)}`);
          const normalizado = normalizarErrorDelMotor(error, adapter.id);
          return { ok: false, error: { ...normalizado, details: { ...(normalizado.details ?? {}), costeDelFallo } } };
        } catch {
          return { ok: false, error: errorDelCore('PROVIDER_ERROR', `adapter:${adapter.id}`, { details: { reason: 'provider_error', costeDelFallo } }) };
        }
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
  /** C8. Se declara AQUÍ por la misma lección de arriba: nada viaja por un spread. */
  referencias?: EjecutorDeps['referencias'];
  /** Las jurisdicciones de la operación, para el ejecutor. Declarado AQUÍ por la misma lección. */
  jurisdiccionesDe?: EjecutorDeps['jurisdiccionesDe'];
  /** C11.4, por la misma razón. */
  recursos?: EjecutorDeps['recursos'];
  /** G8, por la misma razón. */
  upstream?: EjecutorDeps['upstream'];
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
      /* EXPLÍCITO. Un spread aquí es exactamente por donde se perdió la primera vez. */
      aceptaAsincrono: deps.aceptaAsincrono === true,
      referencias: deps.referencias,
      jurisdiccionesDe: deps.jurisdiccionesDe,
      recursos: deps.recursos,
      upstream: deps.upstream,
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
  if (!instancia) {
    instancia = crearGatewayDelMotor({
      adapters: ADAPTERS,
      loadConfig,
      tracer: trazaDeConsola,
      /*
       * C8. SE CARGA AL USARSE, y esto no es pereza: es la regla de este
       * archivo. Resolver una referencia necesita Firestore, los elementos y
       * Media Cloud enteros, y traer ese mundo con un import de arriba metería
       * medio Weë en el grafo del Gateway —que lleva desde el primer día sin
       * importar Firestore, y por eso se puede probar sin él—. Mientras nadie
       * pida continuidad, nada de esto se carga siquiera.
       */
      referencias: async (accountId, requisitos) => {
        const { referenciasDeContinuidadDeWee } = await import('./referencias-de-wee');
        return referenciasDeContinuidadDeWee(accountId, requisitos);
      },
      recursos: async (accountId, adjuntos) => {
        const { recursosAdjuntosDeWee } = await import('./referencias-de-wee');
        return recursosAdjuntosDeWee(accountId, adjuntos);
      },
      upstream: async (accountId, pasos) => {
        const { upstreamDeWee } = await import('./referencias-de-wee');
        return upstreamDeWee(accountId, pasos);
      },
    });
  }
  return instancia;
};
