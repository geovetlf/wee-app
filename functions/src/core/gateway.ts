import { GATEWAY_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { CostLine, CostUnit } from './cost';
import { CreativeParameters, creativosValidos } from './creative';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import { esTipoDeEntidad } from './identity';
import { LanguageContext, LanguageTag, normalizarEtiqueta } from './language';
import { CAMPOS_PROHIBIDOS, OperationTrace, TraceContext, Tracer, trazaLimpia } from './observability';
import { CanonicalResponse } from './provider';
import { CapabilityImplementation, CatalogEntry, CoreCapabilityId, ProviderType, Registry } from './registry';

/**
 * WEE CORE — AI GATEWAY. La frontera de ejecución.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 *     CAPACIDAD → IMPLEMENTACIÓN YA RESUELTA → GATEWAY → ADAPTADOR → PROVEEDOR
 *
 * El Gateway EJECUTA. No decide. Recibe una capacidad y una implementación que
 * alguien con criterio ya eligió —el Router de la Fase 7, mañana; una prueba,
 * hoy—, comprueba contra el registro que esa implementación existe y se puede
 * ejecutar, la ejecuta por su adaptador y devuelve un resultado con forma de
 * Weë: nunca la respuesta cruda de nadie.
 *
 * ── Qué NO es ───────────────────────────────────────────────────────────────
 *
 * No es el Router: no elige proveedor, no ordena candidatos, no hace fallback,
 * no mira precios ni cortacircuitos. Si una petición intenta elegir por su
 * cuenta —`allowedProviders`, `modelId`, `excludeProviders`, `maxCredits`—, se
 * rechaza: elegir es de otra capa, y la frontera es justo el sitio donde esa
 * regla se hace cumplir.
 *
 * No es el Job Engine: `mode: 'async'` está en el contrato para que quepa, y
 * hoy se rechaza con un motivo claro en vez de fingir que existe.
 *
 * No sabe de Credits, ni de Firestore, ni de ningún proveedor. Todo lo que
 * necesita le entra por puertos: el registro, el ejecutor, la traza y el reloj.
 *
 * ── Por qué la orquestación vive en el Core y no solo los tipos ─────────────
 *
 * Porque la validación de la frontera ES el contrato. Si cada composición
 * reimplementara «buscar la implementación, comprobar el adaptador, sanear la
 * respuesta», habría tantas fronteras como composiciones. Aquí hay una, pura,
 * probable con una tabla de casos, y las composiciones solo enchufan puertos.
 *
 * ── Errores: un solo vocabulario ────────────────────────────────────────────
 *
 * El resultado lleva `WeeError` y nada más. Sin una segunda lista de «tipos de
 * fallo»: `WeeErrorCode` ya es el vocabulario único de la Fase 0, y quien
 * necesite decidir llama a `sePuedeReintentarConOtro()` o `esDeLaPeticion()`.
 * El motivo fino va en `details.reason` (`GatewayReason`) y es DIAGNÓSTICO: sirve
 * para leer un registro, no para ramificar código.
 */

/** Referencia ligera a una implementación ya elegida. El Gateway la RE-RESUELVE contra el registro. */
export interface ImplementationRef {
  providerId: string;
  modelId: string;
  /** Si viene, tiene que ser el adaptador registrado para ese proveedor. Si no, es inconsistente. */
  adapterId?: string;
}

/** Ejecución inmediata o encolada. `async` está en el contrato; el Job Engine (Fase 8) lo implementará. */
export type ExecutionMode = 'sync' | 'async';

/**
 * LO QUE SE QUIERE DEL RESULTADO. Nunca quién lo hace.
 *
 * Calidad y duración describen el resultado, no la implementación, y por eso
 * viajan de Brain al adaptador enteras. `creative` es lo mismo un paso más
 * allá: la intención creativa de quien pidió, ya estructurada —`aerial`,
 * `dolly_out`, `golden_hour`— en el vocabulario cerrado de Weë.
 *
 * ESTE ES EL SITIO, Y NO UNO NUEVO. Una segunda tubería para la intención
 * creativa habría obligado a tocar el Workflow, el Orchestrator y el Router
 * para transportar lo mismo que esta ya transporta. Aquí cabe, aquí se valida
 * con el mismo lector, y aguas abajo nadie tiene que enterarse.
 */
export interface ExecutionHints {
  quality?: 'standard' | 'high' | 'max';
  durationSec?: number;
  /** La intención creativa, estructurada. Vocabulario cerrado; jamás sintaxis de un proveedor. */
  creative?: CreativeParameters;
}

export interface ExecutionOptions {
  mode?: ExecutionMode;
  /** Tiempo máximo de ESTA ejecución. Sin él, la composición aplica el de la modalidad. */
  timeoutMs?: number;
  /** Plazo absoluto (epoch ms) que impone quien llama —el proceso que lo aloja, un Router con presupuesto—. */
  deadlineAt?: number;
  /** Pedir resultados parciales. Si el adaptador no lo soporta es un aviso, no un error. */
  stream?: boolean;
  hints?: ExecutionHints;
}

/** Etiquetas escalares que viajan intactas al resultado. Para observabilidad, nunca para contenido. */
export type GatewayMetadata = Readonly<Record<string, string | number | boolean>>;

/**
 * UNA PETICIÓN AL GATEWAY.
 *
 * Reutiliza la Fase 0 en vez de repetirla: los identificadores de correlación
 * son `TraceContext` (traceId = correlationId, requestId, userId, runId = el
 * trabajo, stepId, workplace, projectId) y el idioma es `LanguageContext`.
 *
 * `input` es un objeto abierto a propósito: texto, imagen, audio, vídeo,
 * documento y referencias ya viajan hoy como claves de ese objeto
 * (`prompt`, `imageUrl`, `imageUrls`, `audioUrl`, `documentUrl`…) y es lo que
 * los adaptadores leen. Tiparlas por modalidad es la Fase 12; el Gateway solo
 * exige que sea un objeto plano y acotado.
 *
 * `idempotencyKey` existe aparte de `requestId` porque no siempre son lo mismo:
 * un reintento del Job Engine puede llevar una petición nueva con la misma
 * clave. Cuando no viene, ES el requestId, que ya es la clave de idempotencia
 * del Credit Engine.
 */
export interface GatewayRequest {
  contract: string;
  capability: CoreCapabilityId;
  implementation: ImplementationRef;
  input: Readonly<Record<string, unknown>>;
  trace: TraceContext;
  language?: LanguageContext;
  idempotencyKey?: string;
  metadata?: GatewayMetadata;
  execution?: ExecutionOptions;
}

/**
 * Uso declarado por el adaptador, normalizado a nombres de Weë. Solo lo que
 * el proveedor dijo: lo que no dijo queda ausente. Sin precios: eso es de la
 * Fase 9. `raw` conserva lo que no cupo en un nombre conocido.
 */
export interface GatewayUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  images?: number;
  videoSeconds?: number;
  audioSeconds?: number;
  characters?: number;
  calls?: number;
  searchQueries?: number;
  raw?: Readonly<Record<string, number>>;
}

/** Avance de una ejecución. Hoy solo `processing`, cuando el proveedor acepta la tarea. */
export interface ProgressEvent {
  stage: 'processing';
  at: number;
  /** Lo que el proveedor contó, ya saneado. */
  providerMeta?: Readonly<Record<string, unknown>>;
}

/**
 * Ganchos de UNA ejecución. Van aparte de la petición para que la petición
 * siga siendo datos. Son OBSERVACIÓN, no ejecución: un gancho que falle nunca
 * cambia el desenlace de lo que el proveedor ya está haciendo.
 */
export interface ExecutionHooks {
  onProgress?(event: ProgressEvent): void | Promise<void>;
}

export type GatewayStatus = 'completed' | 'failed' | 'accepted';

/** Avisos: cosas que no impiden el resultado pero que quien lo consume debe saber. */
export type GatewayWarning =
  | 'provider_unverified'
  | 'synthetic_result'
  | 'stream_unsupported'
  | 'usage_missing'
  | 'provider_meta_sanitized'
  | 'progress_hook_failed'
  | 'trace_not_recorded';

/** Motivo fino de un fallo. Diagnóstico: se lee, no se ramifica por él. */
export type GatewayReason =
  | 'invalid_request'
  | 'contract_incompatible'
  | 'execution_mode_unsupported'
  | 'input_too_large'
  | 'unknown_capability'
  | 'capability_deprecated'
  | 'unknown_provider'
  | 'unknown_model'
  | 'model_of_other_provider'
  | 'model_lacks_capability'
  | 'implementation_inconsistent'
  | 'provider_disabled'
  | 'provider_pending'
  | 'provider_deprecated'
  | 'provider_unavailable'
  | 'model_disabled'
  | 'model_deprecated'
  | 'model_pending'
  | 'adapter_missing'
  | 'adapter_inactive'
  /* Dijo que el proveedor la aceptó, pero no dijo cómo la llama él: así no hay a quién preguntarle después. */
  | 'accepted_without_operation'
  | 'adapter_unsupported'
  | 'deadline_passed'
  | 'registry_unavailable'
  | 'executor_failure'
  | 'invalid_provider_response'
  | 'not_configured'
  | 'not_available'
  | 'provider_auth_failed'
  | 'rate_limited'
  | 'timeout'
  | 'input_rejected'
  | 'provider_error'
  | 'generation_failed';

/**
 * EL RESULTADO. Siempre con forma de Weë.
 *
 * `response` es `CanonicalResponse` de la Fase 0 y es el único hogar del
 * modelo real, la latencia y los metadatos del proveedor: no se repiten aquí.
 * `implementation` dice qué se ejecutó (o qué se pidió, si no llegó a
 * resolverse); `type` permite saber si el resultado es sintético sin comparar
 * ids.
 */
export interface GatewayResult {
  contract: typeof GATEWAY_CONTRACT_VERSION;
  status: GatewayStatus;
  requestId: string;
  /** = correlationId. Es el `traceId` de la Fase 0. */
  traceId: string;
  idempotencyKey: string;
  capability: CoreCapabilityId;
  implementation: {
    providerId: string;
    modelId: string;
    /** Solo cuando se resolvió contra el registro. */
    adapterId?: string;
    type?: ProviderType;
  };
  response?: CanonicalResponse;
  /**
   * Cómo llama el proveedor a esta operación. Solo con `accepted`: es lo único
   * que queda de una tarea que sigue en marcha del otro lado, y lo que permitirá
   * preguntar por ella. Sin esto, `accepted` sería un callejón sin salida.
   */
  operation?: GatewayOperationRef;
  usage?: GatewayUsage;
  error?: WeeError;
  timing: { startedAt: number; finishedAt: number };
  warnings: readonly GatewayWarning[];
  metadata?: GatewayMetadata;
}

/* ── Puertos ─────────────────────────────────────────────────────────────── */

/** Lo que recibe el ejecutor: todo ya validado y resuelto. */
export interface ExecutorRequest {
  capability: CoreCapabilityId;
  entry: CatalogEntry;
  implementation: CapabilityImplementation;
  input: Readonly<Record<string, unknown>>;
  trace: TraceContext;
  language?: LanguageContext;
  execution: ExecutionOptions & { mode: 'sync' };
  hooks?: ExecutionHooks;
}

/**
 * CÓMO LLAMA EL PROVEEDOR A UNA OPERACIÓN SUYA. Opaco: no se interpreta, no se
 * compara por partes. Es lo único que hace falta para poder volver a
 * preguntarle por ella. Misma forma que `ProviderOperationRef` del Job Engine,
 * escrita aquí para no cruzar capas.
 */
export interface GatewayOperationRef {
  providerId: string;
  operationId: string;
}

/**
 * LO QUE CONTESTA UN ADAPTADOR.
 *
 * Tres respuestas, no dos. Las dos primeras llevaban aquí desde la Fase 2: salió
 * bien con una respuesta, o salió mal con un error. La tercera es la que faltaba
 * y sin la cual `accepted` —que está declarado desde el primer día— no podía
 * producirse nunca: **el proveedor cogió la tarea y sigue con ella por su
 * cuenta**.
 *
 * No es un modo de ejecución nuevo. La llamada se hace y se espera, como
 * siempre; lo que cambia es que lo que contesta el proveedor no es un resultado
 * sino un acuse con su nombre para la operación. Un adaptador que nunca lo
 * devuelva se comporta exactamente igual que antes.
 */
export type ExecutorOutcome =
  /* `accepted` se declara aquí —ausente— para que distinguir las dos sea el tipo quien lo haga, y no una comprobación a mano. */
  | { ok: true; accepted?: undefined; response: CanonicalResponse; usage?: GatewayUsage; warnings?: readonly GatewayWarning[] }
  /* EL PROVEEDOR LA COGIÓ. No hay resultado todavía, y puede que tarde horas. */
  | { ok: true; accepted: true; operation: GatewayOperationRef; usage?: GatewayUsage; warnings?: readonly GatewayWarning[] }
  | { ok: false; error: WeeError };

/** Quien sabe hablar con un adaptador. La composición del motor lo implementa. */
export interface AdapterExecutor {
  run(request: ExecutorRequest): Promise<ExecutorOutcome>;
}

/**
 * El registro puede llegar hecho o pedirse en cada ejecución. Lo segundo es lo
 * que permite que una composición lo derive de la configuración viva sin que
 * el Gateway sepa de dónde sale.
 */
export type RegistrySource = Registry | (() => Registry | Promise<Registry>);

export interface GatewayPorts {
  registry: RegistrySource;
  executor: AdapterExecutor;
  /**
   * OBLIGATORIO. Una ejecución que gasta dinero de proveedor sin dejar rastro
   * no puede existir por accidente: quien componga el Gateway tiene que decir
   * dónde va la traza, aunque sea a una línea de registro.
   */
  tracer: Tracer;
  now: () => number;
  limits?: { maxInputBytes?: number };
}

export interface Gateway {
  ejecutar(request: GatewayRequest, hooks?: ExecutionHooks): Promise<GatewayResult>;
}

/**
 * QUIÉN DECIDE LA IMPLEMENTACIÓN. La costura del Router (Fase 7).
 *
 * El Gateway ejecuta una implementación ya resuelta; alguien tiene que
 * resolverla. Este puerto es ese alguien: recibe la capacidad que se necesita
 * y devuelve el trío proveedor/modelo/adaptador, o nada si hoy no hay con qué.
 * Quien componga Weë Brain sobre el Gateway lo inyecta; hasta que exista el
 * Router, solo lo implementan las pruebas.
 */
export interface ImplementationResolver {
  resolver(capability: CoreCapabilityId, trace: TraceContext): Promise<ImplementationRef | undefined>;
}

/* ── Formas ──────────────────────────────────────────────────────────────── */

/** La misma forma que exige el Credit Engine a `requestId`. Un solo criterio para todos los ids. */
export const FORMA_DE_ID = /^[A-Za-z0-9_.:-]{4,160}$/;
/** Los ids opcionales de la traza (paso, sesión, workplace…) pueden ser cortos, pero nunca llevar caracteres de control. */
export const FORMA_DE_ETIQUETA_DE_TRAZA = /^[A-Za-z0-9_.:/-]{1,160}$/;
/** Ids de proveedor, modelo y adaptador: lo que hay hoy incluye puntos, barras y dos puntos. */
/*
 * Se EXPORTA desde la Fase 8: el Job Engine guarda la implementación que eligió
 * el Router y tenía su propia comprobación, más estrecha. El registro real de
 * Weë tiene modelos con barra en el identificador, así que el Job Engine
 * rechazaba implementaciones perfectamente válidas que el Router le entregaba.
 * Dos criterios sobre lo mismo siempre acaban así; ahora hay uno.
 */
export const FORMA_DE_REFERENCIA = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,120}$/;
const FORMA_DE_CAPACIDAD = /^[a-z0-9]+\.[a-z0-9_]+$/;

/** El valor si tiene la forma exigida; si no, nada. Lo que no pasa la validación no se refleja ni se anota. */
const siTieneForma = (v: unknown, forma: RegExp): string => (typeof v === 'string' && forma.test(v) ? v : '');
/** Un nombre de clave desconocida viaja al resultado como diagnóstico: acotado, para que no sea un canal de texto libre. */
export const nombreDeCampo = (clave: string): string => (clave.length > 64 ? `${clave.slice(0, 64)}…` : clave);

/**
 * Lo que una lectura de la frontera devuelve cuando algo no tiene forma: el
 * campo y el motivo, sin `WeeError` todavía. Cada frontera —el Gateway, Weë
 * Brain— construye el suyo con su propio `source`; así comparten la
 * validación sin compartir la firma del error.
 */
export type LecturaInvalida = { ok: false; field: string; reason: GatewayReason };

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const MAX_DURATION_SEC = 3600;
const MAX_METADATA_KEYS = 32;
const MAX_METADATA_TEXT = 256;

const CLAVES_DE_PETICION = ['contract', 'capability', 'implementation', 'input', 'trace', 'language', 'idempotencyKey', 'metadata', 'execution'];
const CLAVES_DE_REFERENCIA = ['providerId', 'modelId', 'adapterId'];
/* Las cinco de `LanguageContext`. Lista local porque una interfaz no tiene claves en tiempo de ejecución. */
const CLAVES_DE_IDIOMA = ['appLanguage', 'userLocale', 'inputLanguage', 'outputLanguage', 'contentLanguage'];
const CLAVES_DE_USO_NORMALIZADO = ['inputTokens', 'outputTokens', 'totalTokens', 'images', 'videoSeconds', 'audioSeconds', 'characters', 'calls', 'searchQueries'] as const;
const CLAVES_DE_EJECUCION = ['mode', 'timeoutMs', 'deadlineAt', 'stream', 'hints'];
const CLAVES_DE_HINTS = ['quality', 'durationSec', 'creative'];
const CALIDADES = ['standard', 'high', 'max'];
const CLASES_DE_RESPUESTA = ['text', 'image', 'video', 'audio', 'document'];

export const esObjetoPlano = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const esTexto = (v: unknown): v is string => typeof v === 'string';
export const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/* ── Saneado ─────────────────────────────────────────────────────────────── */

const normalizarClave = (k: string): string => k.toLowerCase().replace(/[-_]/g, '');

/**
 * La lista de la Fase 0 es la única fuente; aquí solo se añaden FORMAS de
 * credencial que esa lista no nombra letra por letra (`x-api-key`,
 * `accessToken`…). Se compara por clave normalizada —minúsculas, sin guiones—
 * y NO por subcadena: `estimatedTokens` y `contentType` son metadatos legítimos
 * que una búsqueda de «token» o «content» se llevaría por delante.
 */
const CLAVES_PROHIBIDAS: ReadonlySet<string> = new Set([
  ...CAMPOS_PROHIBIDOS.map(normalizarClave),
  'xapikey', 'accesstoken', 'refreshtoken', 'authtoken', 'idtoken', 'bearer',
  'cookie', 'setcookie', 'clientsecret', 'privatekey',
  /* No son secretos: son las claves con las que un objeto deja de ser un objeto plano. */
  '__proto__', 'constructor', 'prototype',
]);

/**
 * Se comprueba la clave TAL CUAL y también normalizada, y las dos cosas hacen
 * falta: normalizar atrapa `x-api-key` y `API_KEY`, pero se come los guiones
 * bajos, así que `__proto__` se convertía en `proto` y dejaba de reconocerse
 * justo la clave con la que un objeto deja de ser un objeto plano. Meter
 * `proto` en la lista no vale: prohibiría un metadato legítimo llamado así.
 */
export const claveProhibida = (clave: string): boolean =>
  CLAVES_PROHIBIDAS.has(clave) || CLAVES_PROHIBIDAS.has(normalizarClave(clave));

const LIMITE_PROFUNDIDAD = 4;
const LIMITE_CLAVES = 64;
const LIMITE_TEXTO = 1_000;

/**
 * Deja unos metadatos listos para viajar en un resultado o una traza: sin
 * claves prohibidas, sin funciones, con profundidad, tamaño y texto acotados.
 * Devuelve además si tuvo que tocar algo, para avisarlo.
 */
export const sanearMeta = (valor: unknown, profundidad = 0): { valor: unknown; alterado: boolean } => {
  if (valor === null || valor === undefined) return { valor, alterado: false };
  if (esTexto(valor)) {
    return valor.length > LIMITE_TEXTO ? { valor: `${valor.slice(0, LIMITE_TEXTO)}…`, alterado: true } : { valor, alterado: false };
  }
  if (typeof valor === 'number') return Number.isFinite(valor) ? { valor, alterado: false } : { valor: null, alterado: true };
  if (typeof valor === 'boolean') return { valor, alterado: false };
  if (profundidad >= LIMITE_PROFUNDIDAD) return { valor: '[…]', alterado: true };
  if (Array.isArray(valor)) {
    let alterado = valor.length > LIMITE_CLAVES;
    const limpio = valor.slice(0, LIMITE_CLAVES).map((v) => {
      const r = sanearMeta(v, profundidad + 1);
      alterado = alterado || r.alterado;
      return r.valor;
    });
    return { valor: limpio, alterado };
  }
  if (esObjetoPlano(valor)) {
    const limpio: Record<string, unknown> = {};
    const claves = Object.keys(valor);
    let alterado = claves.length > LIMITE_CLAVES;
    for (const clave of claves.slice(0, LIMITE_CLAVES)) {
      if (claveProhibida(clave)) {
        alterado = true;
        continue;
      }
      const r = sanearMeta(valor[clave], profundidad + 1);
      alterado = alterado || r.alterado;
      /* Se define, no se asigna: asignar `__proto__` dispararía el setter
       * heredado y cambiaría el prototipo del objeto en vez de crear la clave.
       * Así la garantía no depende de que la lista de arriba esté completa. */
      if (r.valor !== undefined) Object.defineProperty(limpio, clave, { value: r.valor, enumerable: true, writable: true, configurable: true });
    }
    return { valor: limpio, alterado };
  }
  /* Funciones, símbolos, bigint, instancias raras: no viajan. */
  return { valor: undefined, alterado: true };
};

/* ── Uso ─────────────────────────────────────────────────────────────────── */

const CLAVES_DE_USO: Readonly<Record<string, keyof Omit<GatewayUsage, 'raw'>>> = {
  inputTokens: 'inputTokens',
  outputTokens: 'outputTokens',
  totalTokens: 'totalTokens',
  images: 'images',
  characters: 'characters',
  calls: 'calls',
  searchQueries: 'searchQueries',
};

/**
 * Del uso tal como lo declara un adaptador al contrato del Gateway. Las claves
 * que ya tienen nombre se copian; `seconds` depende de qué salió (vídeo o
 * audio); todo lo demás se conserva en `raw` sin interpretarlo. Nada se
 * inventa: si el adaptador no lo dijo, no está.
 */
export const normalizarUso = (
  crudo: Readonly<Record<string, unknown>>,
  kind: CanonicalResponse['kind'],
): GatewayUsage | undefined => {
  const uso: GatewayUsage = {};
  const raw: Record<string, number> = {};
  let hayAlgo = false;
  for (const [clave, valor] of Object.entries(crudo)) {
    if (!esNumero(valor)) continue;
    hayAlgo = true;
    const conocida = CLAVES_DE_USO[clave];
    if (conocida) uso[conocida] = valor;
    else if (clave === 'seconds' && kind === 'video') uso.videoSeconds = valor;
    else if (clave === 'seconds' && kind === 'audio') uso.audioSeconds = valor;
    else raw[clave] = valor;
  }
  if (!hayAlgo) return undefined;
  if (Object.keys(raw).length) uso.raw = raw;
  return uso;
};

/** Un `GatewayUsage` que venga de un ejecutor, reducido a lo que el contrato admite: números finitos, y nada más. */
const sanearUso = (crudo: unknown): GatewayUsage | undefined => {
  if (!esObjetoPlano(crudo)) return undefined;
  const uso: GatewayUsage = {};
  let hayAlgo = false;
  for (const clave of CLAVES_DE_USO_NORMALIZADO) {
    const valor = crudo[clave];
    if (esNumero(valor)) {
      uso[clave] = valor;
      hayAlgo = true;
    }
  }
  if (esObjetoPlano(crudo.raw)) {
    const raw: Record<string, number> = {};
    for (const [clave, valor] of Object.entries(crudo.raw)) {
      if (esNumero(valor) && !claveProhibida(clave)) raw[clave] = valor;
    }
    if (Object.keys(raw).length) {
      uso.raw = raw;
      hayAlgo = true;
    }
  }
  return hayAlgo ? uso : undefined;
};

/* ── ¿Se puede ejecutar? ─────────────────────────────────────────────────── */

export type Ejecutabilidad =
  | { ok: true; warnings: readonly GatewayWarning[] }
  | { ok: false; code: WeeErrorCode; reason: GatewayReason; extra?: Record<string, unknown> };

/**
 * NO ES `usable`. `usable` (Fase 1) responde «¿lo recomendarías?» y exige
 * READY o BETA; esta responde «¿hay con qué ejecutarlo?». La diferencia es
 * UNVERIFIED: un proveedor integrado y sirviendo al que le falta la ficha se
 * ejecuta —con aviso—, porque negarse lo dejaría fuera de una ruta que hoy lo
 * usa en producción. Lo que sí se niega es lo apagado, lo no integrado, lo
 * retirado, lo caído y lo que no tiene adaptador que le hable.
 */
export const puedeEjecutarse = (impl: CapabilityImplementation): Ejecutabilidad => {
  const { provider, model, adapter, capability } = impl;
  const no = (code: WeeErrorCode, reason: GatewayReason, extra?: Record<string, unknown>): Ejecutabilidad =>
    ({ ok: false, code, reason, extra });

  if (provider.status === 'DISABLED') return no('PROVIDER_UNAVAILABLE', 'provider_disabled');
  if (provider.status === 'PENDING') return no('PROVIDER_UNAVAILABLE', 'provider_pending');
  if (provider.status === 'DEPRECATED') return no('PROVIDER_UNAVAILABLE', 'provider_deprecated');
  if (provider.health?.state === 'UNAVAILABLE') {
    return no('PROVIDER_UNAVAILABLE', 'provider_unavailable', provider.health.reason ? { health: provider.health.reason } : undefined);
  }
  if (model.status === 'DISABLED') return no('MODEL_UNAVAILABLE', 'model_disabled');
  if (model.status === 'DEPRECATED') return no('MODEL_UNAVAILABLE', 'model_deprecated');
  if (model.status === 'PENDING') return no('MODEL_UNAVAILABLE', 'model_pending');
  if (!adapter) return no('PROVIDER_UNAVAILABLE', 'adapter_missing');
  if (adapter.status !== 'ACTIVE') return no('PROVIDER_UNAVAILABLE', 'adapter_inactive', { adapterStatus: adapter.status });
  if (!adapter.supportedCapabilities.includes(capability)) return no('PROVIDER_UNAVAILABLE', 'adapter_unsupported');

  const warnings: GatewayWarning[] = [];
  if (provider.status === 'UNVERIFIED' || model.status === 'UNVERIFIED') warnings.push('provider_unverified');
  if (provider.type === 'internal') warnings.push('synthetic_result');
  return { ok: true, warnings };
};

/* ── Validación ──────────────────────────────────────────────────────────── */

interface PeticionValidada {
  capability: CoreCapabilityId;
  implementation: ImplementationRef;
  input: Readonly<Record<string, unknown>>;
  trace: TraceContext;
  language?: LanguageContext;
  idempotencyKey: string;
  metadata?: GatewayMetadata;
  execution: ExecutionOptions & { mode: 'sync' };
}

type Fallo = { ok: false; error: WeeError };
type Validacion = { ok: true; peticion: PeticionValidada } | Fallo;

const fallo = (code: WeeErrorCode, reason: GatewayReason, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'gateway', { details: { reason, ...extra } });

const invalido = (field: string, reason: GatewayReason = 'invalid_request'): Fallo =>
  ({ ok: false, error: fallo('INVALID_REQUEST', reason, { field }) });

/** Los identificadores de traza, si tienen forma. Se leen ANTES de validar todo para poder anotar el fallo. */
export const leerTraza = (req: unknown): TraceContext | null => {
  if (!esObjetoPlano(req) || !esObjetoPlano(req.trace)) return null;
  const t = req.trace;
  if (!esTexto(t.traceId) || !FORMA_DE_ID.test(t.traceId)) return null;
  if (!esTexto(t.requestId) || !FORMA_DE_ID.test(t.requestId)) return null;
  if (!esTexto(t.userId) || !FORMA_DE_ID.test(t.userId)) return null;
  for (const opcional of ['sessionId', 'runId', 'stepId', 'appId', 'workplace', 'projectId', 'entityId', 'operationId', 'workspaceId']) {
    const v = t[opcional];
    if (v !== undefined && (!esTexto(v) || !FORMA_DE_ETIQUETA_DE_TRAZA.test(v))) return null;
  }
  /*
   * LOS CINCO CAMPOS DE LA FASE 10, QUE ESTE LECTOR SE COMÍA.
   *
   * La Fase 10 añadió a la traza `accountId`, `entityId`, `entityType`,
   * `operationId` y `workspaceId` para que la atribución viajara de la primera
   * capa a la última. Este lector es de la Fase 2, copiaba nueve campos por su
   * nombre y nadie lo tocó: los cinco nuevos desaparecían en el PRIMER lector,
   * sin error y sin aviso, y por este lector pasa toda traza que entra en Brain,
   * en el Workflow, en el Orchestrator, en el Router, en el Job Engine y en el
   * Gateway. Se encontró al construir el conductor (Fase 12-D), que tuvo que
   * llevarlos por otro sitio.
   *
   * `accountId` NO es una etiqueta más. El contrato dice que es «la cuenta,
   * dicha con su nombre. Mismo valor que `userId`», y mientras este lector lo
   * tiraba daba igual lo que trajera. Conservarlo sin comprobarlo abriría una
   * puerta que estaba cerrada por accidente: `cuentaDeTraza()` prefiere
   * `accountId`, así que una traza con la cuenta de OTRO ahí dentro atribuiría
   * la operación a esa otra cuenta. Si viene, tiene que ser el mismo. Si no lo
   * es, la traza entera no vale —no se «corrige»—.
   */
  if (t.accountId !== undefined && t.accountId !== t.userId) return null;
  if (t.entityType !== undefined && !esTipoDeEntidad(t.entityType)) return null;
  return {
    traceId: t.traceId,
    requestId: t.requestId,
    userId: t.userId,
    sessionId: t.sessionId as string | undefined,
    runId: t.runId as string | undefined,
    stepId: t.stepId as string | undefined,
    /* El producto anfitrión. Se lee como una etiqueta más: aquí no se sabe cuáles existen. */
    appId: t.appId as string | undefined,
    workplace: t.workplace as string | undefined,
    projectId: t.projectId as string | undefined,
    /*
     * Solo si vienen. Una traza que no los trae sale EXACTAMENTE como salía
     * antes, clave por clave: nada de lo que ya funciona nota este cambio.
     */
    ...(t.accountId !== undefined ? { accountId: t.accountId as string } : {}),
    ...(t.entityId !== undefined ? { entityId: t.entityId as string } : {}),
    ...(t.entityType !== undefined ? { entityType: t.entityType as string } : {}),
    ...(t.operationId !== undefined ? { operationId: t.operationId as string } : {}),
    ...(t.workspaceId !== undefined ? { workspaceId: t.workspaceId as string } : {}),
  };
};

/**
 * Las pistas de ejecución, si tienen forma. `prefijo` es el nombre del campo
 * en el mensaje de error de quien las lea ('execution.hints', 'options.hints').
 */
export const leerHints = (crudo: unknown, prefijo: string): { ok: true; hints?: ExecutionHints } | LecturaInvalida => {
  if (crudo === undefined) return { ok: true };
  if (!esObjetoPlano(crudo)) return { ok: false, field: prefijo, reason: 'invalid_request' };
  for (const clave of Object.keys(crudo)) {
    if (!CLAVES_DE_HINTS.includes(clave)) return { ok: false, field: `${prefijo}.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
  }
  if (crudo.quality !== undefined && !CALIDADES.includes(crudo.quality as string)) return { ok: false, field: `${prefijo}.quality`, reason: 'invalid_request' };
  if (crudo.durationSec !== undefined && (!esNumero(crudo.durationSec) || crudo.durationSec <= 0 || crudo.durationSec > MAX_DURATION_SEC)) {
    return { ok: false, field: `${prefijo}.durationSec`, reason: 'invalid_request' };
  }
  /*
   * La intención creativa se valida ENTERA con su propio contrato —vocabulario
   * cerrado, rangos, unidades— y se rechaza si algo no encaja. No se recorta ni
   * se admite a medias: media intención es una intención distinta.
   */
  if (crudo.creative !== undefined && !creativosValidos(crudo.creative)) {
    return { ok: false, field: `${prefijo}.creative`, reason: 'invalid_request' };
  }
  return {
    ok: true,
    hints: {
      quality: crudo.quality as ExecutionHints['quality'],
      durationSec: crudo.durationSec as number | undefined,
      creative: crudo.creative as CreativeParameters | undefined,
    },
  };
};

const validarEjecucion = (crudo: unknown): { ok: true; execution: PeticionValidada['execution'] } | Fallo => {
  if (crudo === undefined) return { ok: true, execution: { mode: 'sync' } };
  if (!esObjetoPlano(crudo)) return invalido('execution');
  /*
   * CUALQUIER clave desconocida se rechaza, y no es pedantería: es la regla
   * «el Gateway no elige». `allowedProviders`, `modelId`, `excludeProviders`,
   * `maxCredits` o `preferCheaper` son decisiones de otra capa, y la única
   * forma de que no se cuelen por aquí es que aquí no quepan.
   */
  for (const clave of Object.keys(crudo)) {
    if (!CLAVES_DE_EJECUCION.includes(clave)) return invalido(`execution.${nombreDeCampo(clave)}`);
  }
  const { mode, timeoutMs, deadlineAt, stream } = crudo;
  if (mode !== undefined && mode !== 'sync' && mode !== 'async') return invalido('execution.mode');
  if (mode === 'async') return { ok: false, error: fallo('INVALID_REQUEST', 'execution_mode_unsupported', { field: 'execution.mode' }) };
  if (timeoutMs !== undefined && (!esNumero(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS)) return invalido('execution.timeoutMs');
  if (deadlineAt !== undefined && (!esNumero(deadlineAt) || deadlineAt <= 0)) return invalido('execution.deadlineAt');
  if (stream !== undefined && typeof stream !== 'boolean') return invalido('execution.stream');
  const hints = leerHints(crudo.hints, 'execution.hints');
  if (!hints.ok) return invalido(hints.field, hints.reason);
  return {
    ok: true,
    execution: {
      mode: 'sync',
      timeoutMs: timeoutMs as number | undefined,
      deadlineAt: deadlineAt as number | undefined,
      stream: stream as boolean | undefined,
      hints: hints.hints,
    },
  };
};

/**
 * El idioma de una petición, si tiene forma. Las CINCO etiquetas pasan por
 * `normalizarEtiqueta`, no solo la principal: `idiomaDeSalida()` prefiere
 * `outputLanguage` sobre `appLanguage`, así que validar una y dejar pasar la
 * otra sería validar la que no manda. Y se devuelven NORMALIZADAS:
 * `LanguageTag` promete exactamente eso.
 */
export const leerIdioma = (crudo: unknown): { ok: true; language?: LanguageContext } | LecturaInvalida => {
  if (crudo === undefined) return { ok: true };
  if (!esObjetoPlano(crudo)) return { ok: false, field: 'language', reason: 'invalid_request' };
  for (const clave of Object.keys(crudo)) {
    if (!CLAVES_DE_IDIOMA.includes(clave)) return { ok: false, field: `language.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
  }
  const etiquetas: Record<string, LanguageTag> = {};
  for (const clave of CLAVES_DE_IDIOMA) {
    const valor = crudo[clave];
    if (valor === undefined) continue;
    const etiqueta = normalizarEtiqueta(valor);
    if (etiqueta === null) return { ok: false, field: `language.${clave}`, reason: 'invalid_request' };
    etiquetas[clave] = etiqueta;
  }
  if (!etiquetas.appLanguage) return { ok: false, field: 'language.appLanguage', reason: 'invalid_request' };
  return { ok: true, language: etiquetas as unknown as LanguageContext };
};

/** Las etiquetas escalares de una petición, si tienen forma: acotadas y sin claves de secreto. */
export const leerMetadata = (crudo: unknown): { ok: true; metadata?: GatewayMetadata } | LecturaInvalida => {
  if (crudo === undefined) return { ok: true };
  if (!esObjetoPlano(crudo)) return { ok: false, field: 'metadata', reason: 'invalid_request' };
  const entradas = Object.entries(crudo);
  if (entradas.length > MAX_METADATA_KEYS) return { ok: false, field: 'metadata', reason: 'invalid_request' };
  for (const [clave, valor] of entradas) {
    if (claveProhibida(clave)) return { ok: false, field: `metadata.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
    const escalar = typeof valor === 'boolean' || esNumero(valor) || (esTexto(valor) && valor.length <= MAX_METADATA_TEXT);
    if (!escalar) return { ok: false, field: `metadata.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
  }
  return { ok: true, metadata: crudo as GatewayMetadata };
};

const validarPeticion = (req: unknown, trace: TraceContext | null, maxInputBytes: number): Validacion => {
  if (!esObjetoPlano(req)) return invalido('request');
  for (const clave of Object.keys(req)) {
    if (!CLAVES_DE_PETICION.includes(clave)) return invalido(nombreDeCampo(clave));
  }
  if (!trace) return invalido('trace');

  if (!esTexto(req.contract) || !contratoCompatible(req.contract, GATEWAY_CONTRACT_VERSION)) {
    return { ok: false, error: fallo('INVALID_REQUEST', 'contract_incompatible', { field: 'contract', expected: GATEWAY_CONTRACT_VERSION }) };
  }
  if (!esTexto(req.capability) || !FORMA_DE_CAPACIDAD.test(req.capability)) return invalido('capability');

  const ref = req.implementation;
  if (!esObjetoPlano(ref)) return invalido('implementation');
  /* Una referencia es TRES ids. Un descriptor entero que mande el llamador no
   * se acepta ni se ignora: la única verdad sobre una implementación es el registro. */
  for (const clave of Object.keys(ref)) {
    if (!CLAVES_DE_REFERENCIA.includes(clave)) return invalido(`implementation.${nombreDeCampo(clave)}`);
  }
  if (!esTexto(ref.providerId) || !FORMA_DE_REFERENCIA.test(ref.providerId)) return invalido('implementation.providerId');
  if (!esTexto(ref.modelId) || !FORMA_DE_REFERENCIA.test(ref.modelId)) return invalido('implementation.modelId');
  if (ref.adapterId !== undefined && (!esTexto(ref.adapterId) || !FORMA_DE_REFERENCIA.test(ref.adapterId))) return invalido('implementation.adapterId');

  if (!esObjetoPlano(req.input)) return invalido('input');
  let bytes = 0;
  try {
    bytes = JSON.stringify(req.input).length;
  } catch {
    return invalido('input');
  }
  if (bytes > maxInputBytes) return { ok: false, error: fallo('INVALID_REQUEST', 'input_too_large', { field: 'input', maxInputBytes }) };

  if (req.idempotencyKey !== undefined && (!esTexto(req.idempotencyKey) || !FORMA_DE_ID.test(req.idempotencyKey))) return invalido('idempotencyKey');

  const idioma = leerIdioma(req.language);
  if (!idioma.ok) return invalido(idioma.field, idioma.reason);

  const metadata = leerMetadata(req.metadata);
  if (!metadata.ok) return invalido(metadata.field, metadata.reason);

  const ejecucion = validarEjecucion(req.execution);
  if (!ejecucion.ok) return ejecucion;

  return {
    ok: true,
    peticion: {
      capability: req.capability as CoreCapabilityId,
      implementation: { providerId: ref.providerId, modelId: ref.modelId, adapterId: ref.adapterId as string | undefined },
      input: req.input,
      trace,
      language: idioma.language,
      idempotencyKey: (req.idempotencyKey as string | undefined) ?? trace.requestId,
      metadata: metadata.metadata,
      execution: ejecucion.execution,
    },
  };
};

/* ── Resolución ──────────────────────────────────────────────────────────── */

type Resolucion =
  | { ok: true; entry: CatalogEntry; impl: CapabilityImplementation; warnings: readonly GatewayWarning[] }
  | { ok: false; error: WeeError };

const resolver = (registry: Registry, capability: CoreCapabilityId, ref: ImplementationRef): Resolucion => {
  const entry = registry.getCapability(capability);
  if (!entry) return { ok: false, error: fallo('CAPABILITY_UNAVAILABLE', 'unknown_capability', { capability }) };
  if (entry.status === 'DEPRECATED') return { ok: false, error: fallo('CAPABILITY_UNAVAILABLE', 'capability_deprecated', { capability }) };

  const impl = registry
    .getCapabilityImplementations(capability)
    .find((i) => i.provider.id === ref.providerId && i.model.id === ref.modelId);

  if (!impl) {
    /* Se diagnostica el motivo exacto: «no está» a secas obliga a adivinar. */
    if (!registry.getProvider(ref.providerId)) return { ok: false, error: fallo('PROVIDER_UNAVAILABLE', 'unknown_provider') };
    const model = registry.getModel(ref.modelId);
    if (!model) return { ok: false, error: fallo('MODEL_UNAVAILABLE', 'unknown_model') };
    if (model.providerId !== ref.providerId) return { ok: false, error: fallo('MODEL_UNAVAILABLE', 'model_of_other_provider') };
    return { ok: false, error: fallo('MODEL_UNAVAILABLE', 'model_lacks_capability', { capability }) };
  }

  const ejecutable = puedeEjecutarse(impl);
  if (!ejecutable.ok) return { ok: false, error: fallo(ejecutable.code, ejecutable.reason, ejecutable.extra) };

  /* A estas alturas hay adaptador (lo garantiza `puedeEjecutarse`). Si quien
   * llama nombró otro, su referencia es inconsistente y no se ejecuta nada. */
  if (ref.adapterId !== undefined && impl.adapter?.id !== ref.adapterId) {
    return { ok: false, error: fallo('INVALID_REQUEST', 'implementation_inconsistent', { field: 'implementation.adapterId', registered: impl.adapter?.id }) };
  }

  return { ok: true, entry, impl, warnings: ejecutable.warnings };
};

/* ── Normalización de la respuesta ───────────────────────────────────────── */

const lineaDeCoste = (l: unknown): l is CostLine =>
  esObjetoPlano(l) && esTexto(l.unit) && esNumero(l.quantity) && esNumero(l.usdPerUnit);

/**
 * PROYECCIÓN, no copia. La respuesta que sale del Gateway tiene exactamente
 * las claves de `CanonicalResponse` y ninguna más: lo que un ejecutor añada
 * —un cuerpo crudo, unas cabeceras— no atraviesa la frontera aunque sea
 * inofensivo, porque la regla es que nada del proveedor llegue sin traducir.
 */
const proyectarRespuesta = (r: CanonicalResponse, modeloPedido: string, meta: Record<string, unknown> | undefined): CanonicalResponse => {
  const proveedor = r.actual.provider;
  const response: CanonicalResponse = {
    kind: r.kind,
    content: r.content,
    urls: r.urls ? [...r.urls] : undefined,
    durationSec: r.durationSec,
    sources: r.sources ? r.sources.map((s) => (esTexto(s.title) ? { url: s.url, title: s.title } : { url: s.url })) : undefined,
    actual: {
      provider: {
        lines: proveedor.lines.filter(lineaDeCoste).map((l) => ({ unit: l.unit as CostUnit, quantity: l.quantity, usdPerUnit: l.usdPerUnit })),
        usd: proveedor.usd,
        provider: esTexto(proveedor.provider) ? proveedor.provider : undefined,
        model: esTexto(proveedor.model) ? proveedor.model : undefined,
      },
      latencyMs: r.actual.latencyMs,
    },
    /* Lo que no dijo el adaptador no se inventa; el modelo real, si no lo dijo, es el que se pidió. */
    model: r.model ?? modeloPedido,
    meta,
  };
  for (const clave of Object.keys(response) as (keyof CanonicalResponse)[]) {
    if (response[clave] === undefined) delete response[clave];
  }
  return response;
};

/** ¿Tiene esto la forma de `CanonicalResponse`? La comparten el Gateway y Weë Brain: una respuesta sin forma no cruza ninguna frontera. */
export const respuestaCanonicaValida = (r: unknown): r is CanonicalResponse => {
  if (!esObjetoPlano(r)) return false;
  if (!CLASES_DE_RESPUESTA.includes(r.kind as string)) return false;
  if (r.content !== undefined && !esTexto(r.content)) return false;
  if (r.urls !== undefined && (!Array.isArray(r.urls) || !r.urls.every(esTexto))) return false;
  if (r.durationSec !== undefined && (!esNumero(r.durationSec) || r.durationSec < 0)) return false;
  if (r.model !== undefined && !esTexto(r.model)) return false;
  if (r.meta !== undefined && !esObjetoPlano(r.meta)) return false;
  if (r.sources !== undefined && (!Array.isArray(r.sources) || !r.sources.every((s) => esObjetoPlano(s) && esTexto(s.url)))) return false;
  const actual = r.actual;
  if (!esObjetoPlano(actual) || !esNumero(actual.latencyMs) || actual.latencyMs < 0) return false;
  const provider = actual.provider;
  if (!esObjetoPlano(provider) || !esNumero(provider.usd) || provider.usd < 0 || !Array.isArray(provider.lines)) return false;
  return true;
};

/* ── El Gateway ──────────────────────────────────────────────────────────── */

/**
 * Construye un Gateway sobre sus puertos. Sin estado: se puede crear uno por
 * proceso o uno por petición, y escala horizontalmente porque no guarda nada.
 */
export const crearGateway = (ports: GatewayPorts): Gateway => {
  const maxInputBytes = ports.limits?.maxInputBytes ?? MAX_INPUT_BYTES;

  const obtenerRegistro = async (): Promise<Registry> =>
    typeof ports.registry === 'function' ? await ports.registry() : ports.registry;

  const ejecutar = async (request: GatewayRequest, hooks?: ExecutionHooks): Promise<GatewayResult> => {
    const startedAt = ports.now();
    const trace = leerTraza(request);
    const warnings: GatewayWarning[] = [];

    /* Lo que se sabe de la petición aunque no sea válida, para poder devolverlo. */
    const crudo: Record<string, unknown> = esObjetoPlano(request) ? request : {};
    const refCruda: Record<string, unknown> = esObjetoPlano(crudo.implementation) ? crudo.implementation : {};
    /* Solo se refleja lo que tiene la forma que exigirá la validación. Lo demás
     * vuelve vacío —igual que los ids de una traza inválida— y así ni el
     * resultado ni la traza transportan jamás texto libre de quien llama. */
    const base = {
      contract: GATEWAY_CONTRACT_VERSION,
      requestId: trace?.requestId ?? '',
      traceId: trace?.traceId ?? '',
      idempotencyKey: siTieneForma(crudo.idempotencyKey, FORMA_DE_ID) || (trace?.requestId ?? ''),
      capability: siTieneForma(crudo.capability, FORMA_DE_CAPACIDAD) as CoreCapabilityId,
      implementation: {
        providerId: siTieneForma(refCruda.providerId, FORMA_DE_REFERENCIA),
        modelId: siTieneForma(refCruda.modelId, FORMA_DE_REFERENCIA),
      } as GatewayResult['implementation'],
      metadata: undefined as GatewayMetadata | undefined,
    };

    /**
     * La traza se anota SIEMPRE que haya identificadores con los que anotarla:
     * un fallo de validación también es una operación que terminó, y el panel
     * de administración querrá saber cuántas y por qué.
     */
    const anotar = async (resultado: GatewayResult): Promise<GatewayResult> => {
      if (!trace) return resultado;
      const operacion: OperationTrace = {
        ...trace,
        capability: resultado.capability,
        provider: resultado.implementation.providerId || undefined,
        model: resultado.response?.model ?? (resultado.implementation.modelId || undefined),
        status: resultado.status === 'failed' ? 'error' : 'ok',
        errorCode: resultado.error?.code,
        latencyMs: resultado.response?.actual.latencyMs ?? resultado.timing.finishedAt - resultado.timing.startedAt,
        providerUsd: resultado.response?.actual.provider.usd,
        attempt: 1,
        at: resultado.timing.finishedAt,
      };
      try {
        if (!trazaLimpia(operacion as unknown as Record<string, unknown>)) throw new Error('traza sucia');
        await ports.tracer.record(operacion);
        return resultado;
      } catch {
        return { ...resultado, warnings: [...resultado.warnings, 'trace_not_recorded'] };
      }
    };

    const fallar = (error: WeeError, extra: Partial<GatewayResult> = {}): Promise<GatewayResult> =>
      anotar({
        ...base,
        ...extra,
        status: 'failed',
        error: { ...error, details: error.details ? (sanearMeta(error.details).valor as Record<string, unknown>) : undefined },
        timing: { startedAt, finishedAt: ports.now() },
        warnings: [...warnings],
      });

    const validacion = validarPeticion(request, trace, maxInputBytes);
    if (!validacion.ok) return fallar(validacion.error);
    const p = validacion.peticion;
    base.idempotencyKey = p.idempotencyKey;
    base.metadata = p.metadata;

    let registry: Registry;
    try {
      registry = await obtenerRegistro();
    } catch {
      return fallar(fallo('INTERNAL_ERROR', 'registry_unavailable'));
    }

    const resolucion = resolver(registry, p.capability, p.implementation);
    if (!resolucion.ok) return fallar(resolucion.error);
    const { entry, impl } = resolucion;
    warnings.push(...resolucion.warnings);
    const implementation: GatewayResult['implementation'] = {
      providerId: impl.provider.id,
      modelId: impl.model.id,
      adapterId: impl.adapter?.id,
      type: impl.provider.type,
    };
    base.implementation = implementation;

    if (p.execution.stream && !impl.adapter?.supportsStreaming) warnings.push('stream_unsupported');
    if (p.execution.deadlineAt !== undefined && p.execution.deadlineAt <= ports.now()) {
      return fallar(fallo('TIMEOUT', 'deadline_passed', { deadlineAt: p.execution.deadlineAt }));
    }

    let salida: ExecutorOutcome;
    try {
      salida = await ports.executor.run({
        capability: p.capability,
        entry,
        implementation: impl,
        input: p.input,
        trace: p.trace,
        language: p.language,
        execution: p.execution,
        hooks,
      });
    } catch (error) {
      /* Sin mensaje y sin traza: lo que falló aquí es Weë, y eso se lee en el servidor, no en el resultado. */
      return fallar(fallo('INTERNAL_ERROR', 'executor_failure', { errorName: error instanceof Error ? error.name : typeof error }));
    }

    if (!salida.ok) {
      const error = salida.error && esTexto(salida.error.code) ? salida.error : fallo('INTERNAL_ERROR', 'executor_failure');
      return fallar(error);
    }

    /*
     * ── ACEPTADA, QUE NO ES TERMINADA ────────────────────────────────────────
     *
     * El proveedor cogió la tarea y sigue con ella. No hay resultado que
     * validar, ni que proyectar, ni que sanear: lo único que vuelve es cómo la
     * llama él, y sin eso no habría forma de volver a preguntarle, así que sin
     * eso esto no es una aceptación —es un error nuestro—.
     *
     * Quien lo recibe (`informeDelGateway`, Fase 8) lo convierte en un intento
     * cuyo desenlace NO se conoce todavía, con la operación marcada como salida,
     * y el trabajo queda ESPERANDO. Ni se cobra, ni se devuelve, ni se repite.
     */
    if (salida.accepted === true) {
      const op = salida.operation;
      if (!op || !esTexto(op.providerId) || !esTexto(op.operationId) || !FORMA_DE_ETIQUETA_DE_TRAZA.test(op.operationId)) {
        return fallar(fallo('PROVIDER_ERROR', 'accepted_without_operation'));
      }
      if (salida.warnings) warnings.push(...salida.warnings);
      const usoDeAcuse = salida.usage ? sanearUso(salida.usage) : undefined;
      return anotar({
        ...base,
        status: 'accepted',
        operation: Object.freeze({ providerId: op.providerId, operationId: op.operationId }),
        ...(usoDeAcuse ? { usage: usoDeAcuse } : {}),
        timing: { startedAt, finishedAt: ports.now() },
        warnings: [...warnings],
      });
    }

    if (!respuestaCanonicaValida(salida.response)) {
      return fallar(fallo('PROVIDER_ERROR', 'invalid_provider_response'));
    }
    if (salida.warnings) warnings.push(...salida.warnings);
    const usage = salida.usage ? sanearUso(salida.usage) : undefined;
    if (!usage) warnings.push('usage_missing');

    const meta = salida.response.meta ? sanearMeta(salida.response.meta) : undefined;
    if (meta?.alterado) warnings.push('provider_meta_sanitized');
    const response = proyectarRespuesta(salida.response, impl.model.id, meta ? (meta.valor as Record<string, unknown>) : undefined);

    return anotar({
      ...base,
      status: 'completed',
      response,
      usage,
      timing: { startedAt, finishedAt: ports.now() },
      warnings: [...warnings],
    });
  };

  return { ejecutar };
};
