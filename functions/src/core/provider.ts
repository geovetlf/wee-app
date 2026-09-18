import { CapabilityId, Modality } from './capability';
import { ActualCost, CostEstimate } from './cost';
import { ProviderLanguageSupport } from './language';
import { WeeError } from './errors';
import { PROVIDER_CONTRACT_VERSION } from './contracts';

/**
 * WEE CORE — CONTRATO DE PROVEEDOR.
 *
 * ── Qué se conserva y qué se añade ──────────────────────────────────────────
 *
 * `engine/types.ts` ya define un `ProviderAdapter` que funciona y que once
 * adaptadores cumplen: `isConfigured`, `supports`, `run`, `verification`. Ese
 * contrato NO se sustituye ni se rompe.
 *
 * Lo que falta son cuatro cosas que el Core necesita para decidir bien, y las
 * cuatro se declaran OPCIONALES para que los once adaptadores de hoy sigan
 * siendo válidos sin tocarlos:
 *
 *   · `estimate()`  — cuánto va a costar ANTES de llamar. Hoy el coste se
 *     estima fuera, en `aiPricing`, con tablas que hay que mantener en paralelo
 *     a lo que sabe cada adaptador. Quien conoce su tarifa es él.
 *   · `cancel()`    — hoy no se puede cancelar nada. Por eso `cancelled` está
 *     declarado en el tipo de trabajo y no se escribe jamás.
 *   · `health()`    — hoy la salud se INFIERE de los fallos, con cortacircuitos.
 *     Funciona, pero solo se entera después de fallar. Un proveedor que sabe
 *     decir «estoy mal» ahorra el fallo.
 *   · `languages`   — qué idiomas admite. Hoy vive en una tabla aparte
 *     (`engine/promptLanguage.ts`) que hay que acordarse de actualizar cuando
 *     entra un proveedor. Donde debe estar es en el proveedor.
 *
 * ── La regla que hace todo esto posible ─────────────────────────────────────
 *
 * Un adaptador TRADUCE, no decide. Convierte la petición canónica de Weë en lo
 * que su API pide, y la respuesta de su API en lo que Weë entiende. No elige
 * modelo por su cuenta, no decide si merece la pena, no sabe qué son los
 * Credits. Todo lo que sepa de su proveedor se queda dentro de él.
 */

/** Estado de una integración. Nunca se pone a mano por optimismo. */
export type ProviderStatus = 'READY' | 'BETA' | 'PENDING' | 'UNVERIFIED' | 'DISABLED' | 'DEPRECATED';

/** Lo que el registro sabe de un proveedor, sin una sola credencial dentro. */
export interface ProviderDescriptor {
  id: string;
  name: string;
  contract: typeof PROVIDER_CONTRACT_VERSION;
  status: ProviderStatus;
  modalities: readonly Modality[];
  capabilities: readonly CapabilityId[];
  languages?: ProviderLanguageSupport;
  /** Regiones donde puede servirse, si el proveedor lo limita. */
  regions?: readonly string[];
  /** Nombre de la variable de entorno con la credencial. EL NOMBRE, nunca el valor. */
  credentialEnv?: string;
  /** Documentación oficial en la que se basa el contrato. */
  docsUrl?: string;
}

/** Cómo está ahora mismo. */
export interface ProviderHealth {
  available: boolean;
  /** Por qué no, cuando no. */
  reason?: string;
  /** Latencia típica reciente, si se mide. */
  latencyMsP50?: number;
  checkedAt: number;
}

/** Una petición ya canónica, sin nada del proveedor dentro. */
export interface CanonicalRequest {
  capability: CapabilityId;
  input: Record<string, unknown>;
  /** Modelo concreto cuando alguien con criterio ya lo eligió. */
  modelId?: string;
  timeoutMs?: number;
}

/** Fuente citada cuando la respuesta usó búsqueda web. */
export interface SourceRef {
  url: string;
  title?: string;
}

/** Una respuesta ya canónica, con lo del proveedor traducido. */
export interface CanonicalResponse {
  kind: 'text' | 'image' | 'video' | 'audio' | 'document';
  content?: string;
  urls?: readonly string[];
  durationSec?: number;
  /** Fuentes de la búsqueda web, cuando las hubo. Ya existen en la salida de los adaptadores. */
  sources?: readonly SourceRef[];
  actual: ActualCost;
  /** Modelo realmente usado, si el adaptador cambió el pedido. */
  model?: string;
  /** Datos del proveedor para el registro. Nunca credenciales. */
  meta?: Record<string, unknown>;
}

/**
 * LO QUE UN PROVEEDOR PUEDE OFRECER DE MÁS.
 *
 * Todo opcional, y ese es el punto: el contrato crece sin romper a nadie. Un
 * adaptador que no implemente `cancel` simplemente no se puede cancelar, y el
 * orquestador lo sabrá preguntando en vez de suponerlo.
 */
export interface ProviderCapabilities {
  estimate?(request: CanonicalRequest): Promise<CostEstimate>;
  cancel?(taskId: string): Promise<boolean>;
  health?(): Promise<ProviderHealth>;
  /** Devuelve resultados parciales según llegan. */
  supportsStreaming?: boolean;
  /** Trabaja con tareas asíncronas que hay que sondear. */
  supportsPolling?: boolean;
  /** Puede avisar por webhook cuando termina. */
  supportsCallback?: boolean;
}

/**
 * Traduce un fallo del proveedor al vocabulario de Weë.
 *
 * Es el único sitio donde debe existir conocimiento de los códigos de error de
 * una API concreta. Si esto se hace bien, ninguna capa de arriba necesita saber
 * que Seedance existe.
 */
export type ErrorNormalizer = (error: unknown) => WeeError;
