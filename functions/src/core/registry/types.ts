import { Modality } from '../capability';
import { ProviderLanguageSupport } from '../language';
import { ProviderStatus } from '../provider';
import { PROVIDER_CONTRACT_VERSION } from '../contracts';
import { CoreCapabilityId } from './capabilities';

/**
 * WEE CORE — TIPOS DEL REGISTRO.
 *
 * Tres dimensiones y una relación entre ellas:
 *
 *     CAPACIDAD  ←  qué se quiere conseguir
 *         ↑
 *      MODELO    ←  qué sabe hacerlo
 *         ↑
 *    PROVEEDOR   ←  de quién es
 *         ↑
 *    ADAPTADOR   ←  cómo se le habla
 *
 * La flecha apunta hacia arriba a propósito: un modelo declara qué capacidades
 * cubre, no al revés. Una capacidad nunca sabe quién la implementa — si lo
 * supiera, añadir una matriz obligaría a tocar la capacidad, que es justo lo
 * que este registro existe para evitar.
 *
 * ── SIN SECRETOS, Y ESTO ES ESTRUCTURAL ─────────────────────────────────────
 *
 * `credentialEnv` guarda el NOMBRE de la variable de entorno, jamás su valor.
 * No es una recomendación: es que en el registro no hay ningún campo donde
 * quepa un valor de credencial. Lo que no tiene sitio no se filtra por
 * descuido.
 */

/** Unidad en la que un proveedor factura. Multimodal desde el contrato. */
export type BillingUnit = 'token' | 'second' | 'image' | 'megapixel' | 'kchar' | 'call' | 'minute' | 'page';

/**
 * REFERENCIA DE PRECIO, no precio final.
 *
 * Es la tarifa PUBLICADA del proveedor, y solo se rellena cuando consta. De
 * aquí a Credits hay dos pasos más —el motor de coste y el margen— y el
 * registro no los da: mezclarlos aquí ataría el catálogo a una política
 * comercial que cambia sola.
 */
export interface PricingReference {
  unit: BillingUnit;
  currency: 'USD';
  /** Tarifa de entrada. Para LLM, por millón de tokens. */
  inputRate?: number;
  /** Tarifa de salida, cuando el proveedor cobra distinto. */
  outputRate?: number;
  /** Tarifa por unidad de medio: imagen, megapíxel, segundo. */
  mediaRate?: number;
  /** De dónde salió esta tarifa. Sin fuente, no se registra. */
  source?: string;
  verifiedAt?: string;
}

/** Límites que el proveedor declara para un modelo. Solo lo documentado. */
export interface ModelLimits {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxDurationSec?: number;
  minDurationSec?: number;
  maxReferences?: number;
  maxOutputPixels?: number;
  /** Resoluciones admitidas, tal como las nombra el proveedor. */
  resolutions?: readonly string[];
  maxCharacters?: number;
}

/**
 * IDIOMAS DE UN MODELO O PROVEEDOR.
 *
 * Describe COMPATIBILIDAD, no preferencia. Es lo que permitirá al Language
 * Intelligence Layer (Fase 10) saber que hace falta adaptar antes de llamar —
 * sin crear un segundo sistema de idioma: el de la persona sigue resolviéndose
 * en `i18n/`, y esto solo dice qué entiende la máquina del otro lado.
 */
export interface LanguageMetadata extends ProviderLanguageSupport {
  /** Idiomas de entrada, si difieren de los de salida. */
  inputLanguages?: readonly string[];
  outputLanguages?: readonly string[];
  /** Calidad conocida por idioma, 0–1. Solo lo medido; vacío es lo normal. */
  qualityByLanguage?: Readonly<Record<string, number>>;
}

/** Calidad y velocidad relativas, en la escala que ya usa el motor. */
export interface ModelGrades {
  /** 1 (básico) … 5 (lo mejor disponible). */
  quality: 1 | 2 | 3 | 4 | 5;
  /** 1 (lento) … 5 (muy rápido). */
  speed: 1 | 2 | 3 | 4 | 5;
  /** Latencia mediana medida, si se mide. */
  latencyMsP50?: number;
}

export type ModelStatus = 'READY' | 'BETA' | 'PENDING' | 'UNVERIFIED' | 'DISABLED' | 'DEPRECATED';

/**
 * UN MODELO EN EL REGISTRO.
 *
 * Los campos duros —id, capacidades, calidad, velocidad, coste— NO se escriben
 * a mano aquí: se derivan del `ModelSpec` que cada adaptador ya declara. Esa es
 * la única forma de que no haya dos verdades sobre lo que un modelo sabe hacer.
 * Lo que sí se añade en el registro es lo que el adaptador no dice: idiomas,
 * regiones, límites documentados y estado.
 */
export interface ModelDescriptor {
  id: string;
  providerId: string;
  displayName?: string;
  version?: string;
  capabilities: readonly CoreCapabilityId[];
  modalities: readonly Modality[];
  grades: ModelGrades;
  limits?: ModelLimits;
  languages?: LanguageMetadata;
  pricing?: PricingReference;
  status: ModelStatus;
  regions?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * QUÉ CLASE DE PROVEEDOR ES.
 *
 * ── LA REGLA DE LAS MATRICES ────────────────────────────────────────────────
 *
 * Weë integra MATRICES: quien entrena y sirve sus propios modelos, por su API
 * oficial directa. Nunca un intermediario, un agregador ni un revendedor.
 *
 * El motivo no es purismo. Un intermediario añade un salto que Weë no controla:
 * su disponibilidad, su latencia, su margen, sus límites y su criterio para
 * decidir qué modelo te toca. Weë ya tiene un router; no necesita el de otro
 * encima, y cuando algo falle quiere saber de quién es la culpa.
 *
 * `'internal'` es para el modo demo, que no es de nadie. No hay ningún otro
 * valor a propósito: si algún día hiciera falta uno, la conversación es si esa
 * integración debe existir, no qué etiqueta ponerle.
 */
export type ProviderType = 'matrix' | 'internal';

/** Salud declarada. El monitor real llega en una fase posterior. */
export type HealthState = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface ProviderHealthInfo {
  state: HealthState;
  reason?: string;
  checkedAt?: number;
}

/** Límites de uso que el propio Weë impone a un proveedor. */
export interface ProviderLimits {
  maxCallsPerDay?: number;
  maxUsdPerDay?: number;
  maxConcurrent?: number;
}

/**
 * UN PROVEEDOR EN EL REGISTRO.
 *
 * `capabilities` es la UNIÓN de lo que declaran sus modelos, no una lista
 * aparte. Un proveedor sin modelos tiene capacidades vacías, y eso es lo
 * correcto: una matriz declarada pero no integrada no puede prometer nada.
 */
export interface RegisteredProvider {
  id: string;
  name: string;
  displayName?: string;
  type: ProviderType;
  status: ProviderStatus;
  contract: typeof PROVIDER_CONTRACT_VERSION;
  /** La API oficial. Nunca la de un intermediario. */
  officialApi?: string;
  docsUrl?: string;
  /** NOMBRE de la variable de entorno. Jamás el valor. */
  credentialEnv?: string;
  modalities: readonly Modality[];
  capabilities: readonly CoreCapabilityId[];
  languages?: LanguageMetadata;
  regions?: readonly string[];
  limits?: ProviderLimits;
  health?: ProviderHealthInfo;
  /** Adaptador que le habla. Ausente = declarada pero no integrada. */
  adapterId?: string;
  note?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export type AdapterStatus = 'ACTIVE' | 'PLACEHOLDER' | 'DISABLED';

/**
 * UN ADAPTADOR EN EL REGISTRO.
 *
 * El registro guarda que existe y qué promete; no guarda su implementación. El
 * Core no puede conocer detalles de HTTP de nadie, así que aquí solo hay
 * metadatos y el adaptador vive donde debe: en `engine/providers/`.
 */
export interface RegisteredAdapter {
  id: string;
  providerId: string;
  contract: string;
  supportedCapabilities: readonly CoreCapabilityId[];
  status: AdapterStatus;
  /** ¿Qué sabe hacer de más? Cancelar, sondear, avisar por webhook. */
  supportsPolling?: boolean;
  supportsCallback?: boolean;
  supportsStreaming?: boolean;
  supportsCancel?: boolean;
  /** Hasta dónde está comprobada la integración. Lo escribe el motor, no una persona. */
  verificationState?: string;
}

/** Lo que el registro necesita para arrancar. */
export interface RegistryData {
  capabilities: readonly import('./capabilities').CatalogEntry[];
  providers: readonly RegisteredProvider[];
  models: readonly ModelDescriptor[];
  adapters: readonly RegisteredAdapter[];
}

/**
 * UNA IMPLEMENTACIÓN DE UNA CAPACIDAD: el trío resuelto.
 *
 * Es lo que el Router de la Fase 7 va a consumir. Que exista una no significa
 * que esté disponible ahora —eso lo dice `usable`—, y esa diferencia es la que
 * permite explicar «hoy no puedo» sin confundirlo con «no sé hacerlo».
 */
export interface CapabilityImplementation {
  capability: CoreCapabilityId;
  model: ModelDescriptor;
  provider: RegisteredProvider;
  adapter?: RegisteredAdapter;
  /** ¿Se puede pedir HOY? Proveedor READY + modelo READY + salud no caída. */
  usable: boolean;
  /** Por qué no, cuando no. Va al registro, no a la pantalla. */
  reason?: string;
}
