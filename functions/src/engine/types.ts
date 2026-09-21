import { ExecutionHints } from '../core';
import { CapabilityId, ResultKind } from '../creator/types';

/**
 * WEË AI ENGINE — tipos (docs/AI-ENGINE.md).
 *
 * Weë no "usa una IA": orquesta muchas. La persona solo ve "✨ Crear con IA";
 * por dentro: Weë → WEË AI ENGINE → AI ROUTER → proveedor especializado.
 * Cada proveedor vive en su propio adaptador; cambiar de proveedor nunca
 * obliga a tocar el resto de la aplicación.
 */

export type Modality = 'text' | 'vision' | 'image' | 'video' | 'voice' | 'music' | 'doc';

/** Calidad que exige la tarea (la decide Weë Brain o la experiencia, nunca la persona). */
export type QualityTier = 'standard' | 'high' | 'max';
export type SpeedTier = 'fast' | 'normal' | 'slow';
export type RoutingPolicy = 'quality-first' | 'balanced' | 'cost-first';
export type PricingMode = 'simulated' | 'real';

export interface RoutingPrefs {
  /** 'auto' deja que el router decida a partir de la petición. */
  quality?: QualityTier | 'auto';
  speed?: SpeedTier | 'auto';
  /** Tope de Credits para este paso; los candidatos más caros se descartan. */
  maxCredits?: number;
  /** Si hay un proveedor más barato que cumple la calidad, usarlo primero. */
  preferCheaper?: boolean;
  /** Proveedores que no deben usarse en esta petición. */
  excludeProviders?: string[];
  /** Duración deseada (video, voz, música) en segundos. */
  durationSec?: number;
  /** Solo estos proveedores pueden atender (p. ej. la familia Seedance para video). */
  allowedProviders?: string[];
  /** Modelo concreto elegido por un motor de dominio (Weë Video Engine). */
  modelId?: string;
}

export interface EngineContext {
  userId: string;
  jobId?: string;
  stepId?: string;
  experienceId?: string;
  goal?: string;
  /** Identificador único de la operación (idempotencia y trazabilidad): jobId:stepId, brain_<id>… */
  requestId?: string;
  /** Servicio del catálogo de Credits que paga esta generación (ai_image, ai_video…). */
  service?: string;
  /** Transacción de Credits que autorizó el cobro (usage_<requestId>). */
  creditTransactionId?: string;
  /**
   * LO QUE ESTA OPERACIÓN LE CUESTA A LA PERSONA, CUANDO EL MOTOR NO PUEDE SABERLO.
   *
   * El libro (`aiGenerations.creditsEstimated`) anota lo que vale cada generación,
   * y normalmente lo deduce solo: capacidad → servicio → catálogo. Eso funciona
   * mientras el precio dependa únicamente de la operación.
   *
   * Weë Brain rompe esa suposición: se cobra por BLOQUES de doce respuestas
   * (decisión del usuario, 2026-09-16), así que once de cada doce valen 0 Credits
   * y la duodécima vale uno. El motor no conoce el bloque —vive en Weë Brain— y
   * deduciendo acababa anotando el precio de `ai_text`, que no es ni su servicio
   * ni su importe: decía 2 donde se cobró 0 (visto en producción, 2026-09-16).
   *
   * Quien sí lo sabe lo dice aquí. No es un precio nuevo ni otro cálculo: es el
   * MISMO número que `brainQuote` ya le enseña a la persona antes de enviar.
   * Quien no lo diga —todas las demás secciones— sigue con la deducción de
   * siempre, sin enterarse.
   */
  creditsEstimated?: number;
  /**
   * HASTA CUÁNDO PUEDE DURAR TODO ESTO. En milisegundos, absoluto.
   *
   * Lo pone quien tiene el presupuesto de verdad —la función que espera— y el
   * motor solo lo RESTA: ningún intento recibe más tiempo del que le queda a
   * quien lo está esperando. Sin esto, el plazo por modalidad es una promesa
   * sobre el proveedor que nadie compara con la vida del proceso, y un vídeo de
   * veinte minutos dentro de una función de quince mata a la función antes de
   * que pueda liquidar los Credits que retuvo.
   *
   * Opcional a propósito: quien no lo diga —`generateVideo`, que tiene plazo
   * propio y más largo— sigue exactamente igual que antes.
   */
  deadlineAt?: number;
}

export interface EngineRequest extends EngineContext {
  capability: CapabilityId;
  input: Record<string, unknown>;
  prefs?: RoutingPrefs;
  /** Registro de consumo por trabajo (lo escribe Weë Creator). */
  record?: (entry: UsageEntry) => Promise<void>;
}

/** Coste de lista de un modelo. SOLO para ordenar candidatos: los Credits que
 *  ve la persona salen del catálogo del Credit Engine (modo prueba) o del coste medido (modo real). */
export interface ModelCost {
  unit: 'second' | 'image' | 'kchar' | 'mtoken' | 'call' | 'minute';
  usd: number;
  /** Para LLM: coste por millón de tokens de salida. */
  usdOutput?: number;
}

export interface ModelSpec {
  id: string;
  provider: string;
  capabilities: CapabilityId[];
  /** 1 (básico) … 5 (lo mejor disponible). */
  quality: 1 | 2 | 3 | 4 | 5;
  /** 1 (lento) … 5 (muy rápido). */
  speed: 1 | 2 | 3 | 4 | 5;
  cost: ModelCost;
  maxDurationSec?: number;
  tags?: string[];
  /** true cuando el contrato de la API se verificó con una clave real. */
  verified?: boolean;
  note?: string;
}

/**
 * Hasta dónde está comprobada una integración. Solo se llega a REAL_API_VERIFIED
 * cuando el proveedor ha respondido de verdad al menos una vez: lo escribe el
 * router en aiProviderVerification/{proveedor}, nunca se pone a mano.
 */
export type VerificationState =
  | 'CODE_COMPLETE'
  | 'TESTED_WITH_MOCK'
  | 'DOCUMENTATION_VERIFIED'
  | 'REAL_API_VERIFIED'
  | 'PRODUCTION_READY';

export interface ProviderVerification {
  state: VerificationState;
  /** Variable de entorno con la credencial que hace falta. */
  credential: string;
  /** Documentación oficial en la que se basa el contrato. */
  docsUrl: string;
  /** Cómo hacer la primera llamada real, en una frase. */
  firstTest: string;
  /** Fecha en que se leyó la documentación oficial. */
  documentedAt?: string;
  /** Primera respuesta real del proveedor, si la hubo. */
  firstSuccessAt?: string;
}

/** Fuente citada cuando la respuesta usó búsqueda web (Weë Brain). */
export interface SourceRef {
  url: string;
  title?: string;
}

export interface ProviderOutput {
  kind: ResultKind;
  content?: string;
  url?: string;
  /** Varias propuestas cuando el paso pide count > 1. */
  urls?: string[];
  /** Duración real (audio/video) cuando se conoce. */
  durationSec?: number;
  /** Fuentes de la búsqueda web (cuando corresponde). */
  sources?: SourceRef[];
}

export interface ProviderResult {
  /*
   * El discriminante, AUSENTE. Está aquí para que distinguir «terminó» de
   * «la cogió» lo haga el tipo, y no una comprobación a mano en cada consumidor.
   * Mismo patrón que `ExecutorOutcome` en `core/gateway.ts`.
   */
  accepted?: undefined;
  output: ProviderOutput;
  usage?: Record<string, number>;
  /** Coste medido o estimado por el adaptador en USD (0 en demo). */
  costUSD: number;
  latencyMs: number;
  /** Modelo realmente usado (si el adaptador cambió el pedido). */
  model?: string;
  /** Datos del proveedor para el libro (id de tarea, resolución, tokens estimados y reales…). */
  meta?: Record<string, unknown>;
}

/**
 * EL PROVEEDOR COGIÓ LA TAREA Y SIGUE CON ELLA.
 *
 * No hay salida todavía, y puede que tarde horas. Lo único que queda de la
 * tarea es cómo la llama él: sin `operationId` esto sería un callejón sin
 * salida, porque no habría a quién preguntarle después.
 *
 * NO es un modo de ejecución nuevo: la llamada a la API se hace y se espera,
 * como siempre, y dura segundos. Lo que cambia es que lo que contesta el
 * proveedor no es un resultado sino un acuse con su nombre para la operación.
 * Un adaptador que nunca devuelva esto se comporta exactamente igual que antes.
 */
export interface ProviderAccepted {
  accepted: { operationId: string };
  usage?: Record<string, number>;
  /** Lo que ya se sabe que va a costar. El real llega con el desenlace. */
  costUSD: number;
  latencyMs: number;
  model?: string;
  meta?: Record<string, unknown>;
}

/** Lo que contesta un adaptador: terminó, o el proveedor la cogió. */
export type ProviderOutcome = ProviderResult | ProviderAccepted;

/** Avance de una generación asíncrona (la tarea ya está en el proveedor). */
export type ProviderStatusHook = (status: 'PROCESSING', meta: Record<string, unknown>) => Promise<void> | void;

export interface ProviderRunRequest {
  capability: CapabilityId;
  model: ModelSpec;
  input: Record<string, unknown>;
  ctx: EngineContext;
  prefs: RoutingPrefs;
  timeoutMs: number;
  onStatus?: ProviderStatusHook;
  /**
   * QUIEN LLAMA SABE ESPERAR SIN OCUPAR EL PROCESO.
   *
   * Por defecto, ausente: el adaptador se comporta como siempre y devuelve el
   * resultado terminado, sondeando por dentro si hace falta. Solo lo pone quien
   * tiene dónde guardar la tarea a medias —el Job Engine— y quien después sabrá
   * preguntar por ella: el callback o la reconciliación.
   *
   * Pedirlo no obliga a nadie. Un adaptador síncrono lo ignora y termina la
   * tarea; el que sepa, contesta `ProviderAccepted` y suelta el proceso.
   */
  acceptAsync?: boolean;
  /**
   * LOS REQUISITOS ABSTRACTOS DEL RESULTADO, tal y como salieron de Weë.
   *
   * `prefs` es del ENRUTADO —qué calidad, cuántos segundos, qué se puede
   * elegir— y por eso lleva años siendo dos escalares. Esto es otra cosa: lo
   * que la persona pidió del resultado. La intención creativa (S2) y lo que
   * tiene que quedarse igual (C2) viajaban por todo el sistema y se perdían
   * justo aquí, en la última línea, porque la composición solo copiaba esos
   * dos escalares. Se medía en las pruebas de transporte y no lo veía nadie:
   * el adaptador nunca supo que existían.
   *
   * Opcional, y ningún adaptador está obligado a leerla. Traducir un requisito
   * a los mandos de un proveedor concreto es trabajo SUYO y de nadie más: aquí
   * solo se le entrega, intacto y en el vocabulario del Core.
   */
  hints?: ExecutionHints;
}

/** Contrato que implementa cada adaptador (video, imagen, voz, música, LLM…). */
export interface ProviderAdapter {
  id: string;
  name: string;
  modalities: Modality[];
  models: ModelSpec[];
  /** Hay clave/credenciales: sin esto el router ni lo considera. */
  isConfigured(): boolean;
  supports(capability: CapabilityId): boolean;
  /**
   * Devolver `ProviderAccepted` solo está permitido cuando la petición trae
   * `acceptAsync`. Sin eso, quien llama no tiene dónde guardar una tarea a
   * medias y la aceptación sería una pérdida silenciosa.
   */
  run(request: ProviderRunRequest): Promise<ProviderOutcome>;
  /** Hasta dónde está comprobada esta integración (ver VerificationState). */
  verification?: ProviderVerification;
}

/** Un eslabón de la cadena de enrutamiento de una capacidad. */
export interface ChainLink {
  provider: string;
  /** Modelo concreto; si falta, el router elige el mejor del proveedor para la capacidad. */
  model?: string;
  /** Solo usar este eslabón cuando la tarea exige al menos esta calidad. */
  minQuality?: QualityTier;
  /** No usar este eslabón cuando la tarea exige más que esta calidad. */
  maxQuality?: QualityTier;
}

export interface CapabilityRouting {
  capability: CapabilityId;
  chain: ChainLink[];
  policy: RoutingPolicy;
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  models?: Record<string, Partial<Pick<ModelSpec, 'quality' | 'speed' | 'cost' | 'maxDurationSec'>> & { enabled?: boolean }>;
  limits?: { maxCallsPerDay?: number; maxUsdPerDay?: number };
  note?: string;
}

/** Límites por persona y día, por modalidad (0 = sin límite). */
export interface UsageLimits {
  perUserPerDay: Partial<Record<Modality, number>>;
}

export interface EngineSettings {
  pricingMode: PricingMode;
  /** Cuántos Credits vale 1 USD de coste (antes de margen). */
  creditsPerUsd: number;
  /** Margen sobre el coste (0.3 = 30 %). */
  margin: number;
  defaultPolicy: RoutingPolicy;
  /** Si nadie real puede atender, usar el proveedor de prueba. */
  allowMockFallback: boolean;
  timeoutsMs: Partial<Record<Modality, number>>;
  circuitBreaker: { failures: number; windowMs: number; openMs: number };
  /** Límites de uso para evitar abusos (por persona; los de proveedor van en aiProviders/{id}.limits). */
  limits: UsageLimits;
  /** Weë Video Engine: versión de Seedance por defecto (auto | SEEDANCE_2_5 | SEEDANCE_2_0 | SEEDANCE_2_0_FAST | SEEDANCE_2_0_MINI). */
  video?: { defaultModel?: string };
}

export interface RouteCandidate {
  provider: string;
  model: ModelSpec;
  priority: number;
  estimatedUsd: number;
  estimatedCredits: number;
  reason: string;
}

export interface RouteDecision {
  capability: CapabilityId;
  quality: QualityTier;
  policy: RoutingPolicy;
  candidates: RouteCandidate[];
  skipped: { provider: string; model?: string; reason: string }[];
  /**
   * Hay al menos un proveedor real con clave y con modelo para esta capacidad.
   * Cuando es true el modo demo NO puede ser candidato, ni siquiera si todos los
   * proveedores reales acaban descartados por cuota, pausa, límite o fallo.
   */
  realProviderAvailable: boolean;
}

/** Estados de una generación (docs/CREDITS.md §generations): QUEUED al crearla, PROCESSING cuando el proveedor la acepta. */
export type GenerationStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/** Documento aiGenerations/{generationId}: lo que Weë sabe de cada generación. */
export interface GenerationRecord {
  id: string;
  /** jobId:stepId, brain_<mensaje>… (misma operación → mismo requestId). */
  requestId?: string;
  userId: string;
  jobId?: string;
  stepId?: string;
  experienceId?: string;
  capability: CapabilityId;
  /** Servicio del catálogo de Credits (ai_image, ai_video…). */
  service?: string;
  modality: Modality;
  provider: string;
  model: string;
  status: GenerationStatus;
  /** 1 = primer intento; >1 = fallback tras un fallo. */
  attempt: number;
  /** Coste del proveedor: estimado antes de llamar y medido/estimado al terminar. */
  estimatedUsd: number;
  providerCost: number;
  providerCurrency: 'USD';
  /**
   * Credits DEFINITIVAMENTE CAPTURADOS a la persona por este paso.
   *
   * AUSENTE significa "todavía no se sabe": la operación se ejecutó pero su
   * transacción sigue autorizada y aún no se ha liquidado. NO significa cero.
   * Solo lo escribe la liquidación (ledger.settle), que es la única que conoce
   * el desenlace. Que exista creditTransactionId NO implica que se cobrara: una
   * reserva puede acabar reembolsada entera.
   */
  creditsCharged?: number;
  /** Cuándo se liquidó. Su presencia es la marca de que ya está resuelto. */
  settledAt?: unknown;
  /**
   * Versión de la semántica del libro.
   *   1 (ausente) — creditsCharged era el precio del paso ligado a una reserva.
   *   2           — creditsCharged son Credits definitivamente capturados.
   * Los informes deben distinguirlas: no son comparables entre sí.
   */
  ledgerVersion?: number;
  /**
   * Lo que ESTA operación habría costado según el catálogo, cuando no se cobró.
   * Solo aparece en generaciones sin transacción: sirve para saber cuánto vale
   * el trabajo interno que Weë absorbe, sin confundirlo nunca con un ingreso.
   */
  creditsEstimated?: number;
  creditTransactionId?: string;
  pricingMode: PricingMode;
  inputType?: string;
  outputType?: string;
  durationMs: number;
  error?: string;
  usage?: Record<string, number>;
  /** Video: id de tarea en el proveedor, resolución, duración y tokens estimados/reales (Pricing Engine). */
  providerTaskId?: string;
  resolution?: string;
  /**
   * Dimensiones reales de una salida de imagen, en píxeles y con los mismos
   * nombres que ResolutionPlan. No sustituyen a `resolution`, que es la etiqueta
   * de vídeo de Seedance ("1080p"): son dos cosas distintas y no se mezclan.
   */
  width?: number;
  height?: number;
  videoDurationSec?: number;
  estimatedTokens?: number;
  providerTokens?: number;
  providerMeta?: Record<string, unknown>;
  createdAt: unknown;
  updatedAt: unknown;
  completedAt?: unknown;
}

export interface EngineResult extends ProviderResult {
  provider: string;
  modelId: string;
  /** Credits que cuesta este resultado (modo prueba o real). */
  credits: number;
  /** id del documento aiGenerations del intento que tuvo éxito. */
  generationId: string;
  attempts: number;
  demo: boolean;
  decision: RouteDecision;
}

/** Compatibilidad con el registro de consumo de Weë Creator (creatorUsage/{día}). */
export interface UsageEntry {
  capability: CapabilityId;
  provider: string;
  costUSD: number;
  latencyMs: number;
  usage: Record<string, number>;
}

export const MODALITY_OF: Record<string, Modality> = {
  text: 'text',
  vision: 'vision',
  image: 'image',
  video: 'video',
  voice: 'voice',
  music: 'music',
  doc: 'doc',
  script: 'text',
  scene: 'text',
  subtitle: 'text',
  audio: 'music',
};

/** Capacidades con modalidad propia que no se deduce del prefijo. */
const MODALITY_EXACT: Partial<Record<CapabilityId, Modality>> = {
  'audio.transcribe': 'voice',
  'doc.read': 'vision',
};

export const modalityOf = (capability: CapabilityId): Modality => MODALITY_EXACT[capability] || MODALITY_OF[capability.split('.')[0]] || 'text';

/** Tipo de entrada / salida que se guarda en cada generación. */
export const inputTypeOf = (capability: CapabilityId, input: Record<string, unknown>): string => {
  const hasImage = !!(input.imageUrl || (Array.isArray(input.imageUrls) && input.imageUrls.length));
  if (input.audioUrl) return 'audio';
  if (input.documentUrl) return 'document';
  if (capability.startsWith('video.image_to_video')) return 'image';
  if (hasImage) return capability.startsWith('image.') ? 'image' : 'text+image';
  return 'text';
};

export const outputTypeOf = (kind: ResultKind): string => kind;

export const QUALITY_RANK: Record<QualityTier, number> = { standard: 1, high: 2, max: 3 };
/** Calidad mínima de modelo (1–5) que satisface cada nivel. */
export const QUALITY_MIN_SCORE: Record<QualityTier, number> = { standard: 2, high: 4, max: 5 };
