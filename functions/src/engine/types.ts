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
  output: ProviderOutput;
  usage?: Record<string, number>;
  /** Coste medido o estimado por el adaptador en USD (0 en demo). */
  costUSD: number;
  latencyMs: number;
  /** Modelo realmente usado (si el adaptador cambió el pedido). */
  model?: string;
}

export interface ProviderRunRequest {
  capability: CapabilityId;
  model: ModelSpec;
  input: Record<string, unknown>;
  ctx: EngineContext;
  prefs: RoutingPrefs;
  timeoutMs: number;
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
  run(request: ProviderRunRequest): Promise<ProviderResult>;
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
}

/** Estados de una generación (docs/CREDITS.md §generations). */
export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

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
  /** Credits que pagó la persona por este resultado (0 en demo o si falló). */
  creditsCharged: number;
  creditTransactionId?: string;
  pricingMode: PricingMode;
  inputType?: string;
  outputType?: string;
  durationMs: number;
  error?: string;
  usage?: Record<string, number>;
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

export const modalityOf = (capability: CapabilityId): Modality => MODALITY_OF[capability.split('.')[0]] || 'text';

/** Tipo de entrada / salida que se guarda en cada generación. */
export const inputTypeOf = (capability: CapabilityId, input: Record<string, unknown>): string => {
  const hasImage = !!(input.imageUrl || (Array.isArray(input.imageUrls) && input.imageUrls.length));
  if (capability.startsWith('video.image_to_video')) return 'image';
  if (hasImage) return capability.startsWith('image.') ? 'image' : 'text+image';
  return 'text';
};

export const outputTypeOf = (kind: ResultKind): string => kind;

export const QUALITY_RANK: Record<QualityTier, number> = { standard: 1, high: 2, max: 3 };
/** Calidad mínima de modelo (1–5) que satisface cada nivel. */
export const QUALITY_MIN_SCORE: Record<QualityTier, number> = { standard: 2, high: 4, max: 5 };
