import { CapabilityId, ResultKind } from '../creator/types';
import { RoutingPrefs } from '../engine/types';

/**
 * AI Gateway: una capacidad, N proveedores. Cada proveedor implementa esta
 * interfaz; toda la rareza de su API vive en su adaptador.
 */
export interface UsageEntry {
  capability: CapabilityId;
  provider: string;
  costUSD: number;
  latencyMs: number;
  usage: Record<string, number>;
}

export interface GatewayContext {
  userId: string;
  jobId: string;
  experienceId: string;
  goal: string;
  /** Registro de coste real por llamada (lo escribe Weë Creator, nunca el cliente). */
  record?: (entry: UsageEntry) => Promise<void>;
  /** Paso del plan que se está ejecutando (para aiGenerations). */
  stepId?: string;
  /** Preferencias de enrutamiento del paso (calidad, duración, tope de Credits). */
  prefs?: RoutingPrefs;
}

export interface ProviderOutput {
  kind: ResultKind;
  content?: string;
  url?: string;
  /** Varias propuestas cuando el paso pide count > 1. */
  urls?: string[];
}

export interface ProviderResult {
  output: ProviderOutput;
  usage?: Record<string, number>;
  costUSD: number;
  latencyMs: number;
}

export interface ProviderAdapter {
  id: string;
  supports(capability: CapabilityId): boolean;
  run(capability: CapabilityId, input: Record<string, unknown>, ctx: GatewayContext): Promise<ProviderResult>;
}

export interface ProviderRef {
  id: string;
  priority: number;
  enabled: boolean;
}
