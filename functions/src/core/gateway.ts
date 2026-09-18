import { GATEWAY_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { CostLine, CostUnit } from './cost';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
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
 * Lo ÚNICO que un adaptador lee de las preferencias hoy. No es selección:
 * calidad y duración describen el resultado que se quiere, no quién lo hace.
 */
export interface ExecutionHints {
  quality?: 'standard' | 'high' | 'max';
  durationSec?: number;
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

export type ExecutorOutcome =
  | { ok: true; response: CanonicalResponse; usage?: GatewayUsage; warnings?: readonly GatewayWarning[] }
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

/* ── Formas ──────────────────────────────────────────────────────────────── */

/** La misma forma que exige el Credit Engine a `requestId`. Un solo criterio para todos los ids. */
const FORMA_DE_ID = /^[A-Za-z0-9_.:-]{4,160}$/;
/** Los ids opcionales de la traza (paso, sesión, workplace…) pueden ser cortos, pero nunca llevar caracteres de control. */
const FORMA_DE_ETIQUETA_DE_TRAZA = /^[A-Za-z0-9_.:/-]{1,160}$/;
/** Ids de proveedor, modelo y adaptador: lo que hay hoy incluye puntos, barras y dos puntos. */
const FORMA_DE_REFERENCIA = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,120}$/;
const FORMA_DE_CAPACIDAD = /^[a-z0-9]+\.[a-z0-9_]+$/;

/** El valor si tiene la forma exigida; si no, nada. Lo que no pasa la validación no se refleja ni se anota. */
const siTieneForma = (v: unknown, forma: RegExp): string => (typeof v === 'string' && forma.test(v) ? v : '');
/** Un nombre de clave desconocida viaja al resultado como diagnóstico: acotado, para que no sea un canal de texto libre. */
const nombreDeCampo = (clave: string): string => (clave.length > 64 ? `${clave.slice(0, 64)}…` : clave);

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
const CLAVES_DE_HINTS = ['quality', 'durationSec'];
const CALIDADES = ['standard', 'high', 'max'];
const CLASES_DE_RESPUESTA = ['text', 'image', 'video', 'audio', 'document'];

const esObjetoPlano = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === 'string';
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

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

export const claveProhibida = (clave: string): boolean => CLAVES_PROHIBIDAS.has(normalizarClave(clave));

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
      if (r.valor !== undefined) limpio[clave] = r.valor;
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
const leerTraza = (req: unknown): TraceContext | null => {
  if (!esObjetoPlano(req) || !esObjetoPlano(req.trace)) return null;
  const t = req.trace;
  if (!esTexto(t.traceId) || !FORMA_DE_ID.test(t.traceId)) return null;
  if (!esTexto(t.requestId) || !FORMA_DE_ID.test(t.requestId)) return null;
  if (!esTexto(t.userId) || !FORMA_DE_ID.test(t.userId)) return null;
  for (const opcional of ['sessionId', 'runId', 'stepId', 'workplace', 'projectId']) {
    const v = t[opcional];
    if (v !== undefined && (!esTexto(v) || !FORMA_DE_ETIQUETA_DE_TRAZA.test(v))) return null;
  }
  return {
    traceId: t.traceId,
    requestId: t.requestId,
    userId: t.userId,
    sessionId: t.sessionId as string | undefined,
    runId: t.runId as string | undefined,
    stepId: t.stepId as string | undefined,
    workplace: t.workplace as string | undefined,
    projectId: t.projectId as string | undefined,
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
  const { mode, timeoutMs, deadlineAt, stream, hints } = crudo;
  if (mode !== undefined && mode !== 'sync' && mode !== 'async') return invalido('execution.mode');
  if (mode === 'async') return { ok: false, error: fallo('INVALID_REQUEST', 'execution_mode_unsupported', { field: 'execution.mode' }) };
  if (timeoutMs !== undefined && (!esNumero(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS)) return invalido('execution.timeoutMs');
  if (deadlineAt !== undefined && (!esNumero(deadlineAt) || deadlineAt <= 0)) return invalido('execution.deadlineAt');
  if (stream !== undefined && typeof stream !== 'boolean') return invalido('execution.stream');
  let hintsLimpios: ExecutionHints | undefined;
  if (hints !== undefined) {
    if (!esObjetoPlano(hints)) return invalido('execution.hints');
    for (const clave of Object.keys(hints)) {
      if (!CLAVES_DE_HINTS.includes(clave)) return invalido(`execution.hints.${nombreDeCampo(clave)}`);
    }
    if (hints.quality !== undefined && !CALIDADES.includes(hints.quality as string)) return invalido('execution.hints.quality');
    if (hints.durationSec !== undefined && (!esNumero(hints.durationSec) || hints.durationSec <= 0 || hints.durationSec > MAX_DURATION_SEC)) {
      return invalido('execution.hints.durationSec');
    }
    hintsLimpios = { quality: hints.quality as ExecutionHints['quality'], durationSec: hints.durationSec as number | undefined };
  }
  return {
    ok: true,
    execution: {
      mode: 'sync',
      timeoutMs: timeoutMs as number | undefined,
      deadlineAt: deadlineAt as number | undefined,
      stream: stream as boolean | undefined,
      hints: hintsLimpios,
    },
  };
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

  /*
   * IDIOMA: las cinco etiquetas pasan por `normalizarEtiqueta`, no solo la
   * principal. `idiomaDeSalida()` prefiere `outputLanguage` sobre `appLanguage`,
   * así que validar una y dejar pasar la otra sería validar la que no manda.
   * Y se guardan NORMALIZADAS: `LanguageTag` promete exactamente eso.
   */
  let language: LanguageContext | undefined;
  if (req.language !== undefined) {
    if (!esObjetoPlano(req.language)) return invalido('language');
    for (const clave of Object.keys(req.language)) {
      if (!CLAVES_DE_IDIOMA.includes(clave)) return invalido(`language.${nombreDeCampo(clave)}`);
    }
    const etiquetas: Record<string, LanguageTag> = {};
    for (const clave of CLAVES_DE_IDIOMA) {
      const valor = req.language[clave];
      if (valor === undefined) continue;
      const etiqueta = normalizarEtiqueta(valor);
      if (etiqueta === null) return invalido(`language.${clave}`);
      etiquetas[clave] = etiqueta;
    }
    if (!etiquetas.appLanguage) return invalido('language.appLanguage');
    language = etiquetas as unknown as LanguageContext;
  }

  let metadata: GatewayMetadata | undefined;
  if (req.metadata !== undefined) {
    if (!esObjetoPlano(req.metadata)) return invalido('metadata');
    const entradas = Object.entries(req.metadata);
    if (entradas.length > MAX_METADATA_KEYS) return invalido('metadata');
    for (const [clave, valor] of entradas) {
      if (claveProhibida(clave)) return invalido(`metadata.${nombreDeCampo(clave)}`);
      const escalar = typeof valor === 'boolean' || esNumero(valor) || (esTexto(valor) && valor.length <= MAX_METADATA_TEXT);
      if (!escalar) return invalido(`metadata.${nombreDeCampo(clave)}`);
    }
    metadata = req.metadata as GatewayMetadata;
  }

  const ejecucion = validarEjecucion(req.execution);
  if (!ejecucion.ok) return ejecucion;

  return {
    ok: true,
    peticion: {
      capability: req.capability as CoreCapabilityId,
      implementation: { providerId: ref.providerId, modelId: ref.modelId, adapterId: ref.adapterId as string | undefined },
      input: req.input,
      trace,
      language,
      idempotencyKey: (req.idempotencyKey as string | undefined) ?? trace.requestId,
      metadata,
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

const respuestaValida = (r: unknown): r is CanonicalResponse => {
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

    if (!respuestaValida(salida.response)) {
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
