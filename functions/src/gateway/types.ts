import { CapabilityId, ResultKind } from '../creator/types';

/**
 * AI Gateway: una capacidad, N proveedores. Cada proveedor implementa esta
 * interfaz; toda la rareza de su API vive en su adaptador.
 */
export interface GatewayContext {
  userId: string;
  jobId: string;
  experienceId: string;
  goal: string;
}

export interface ProviderOutput {
  kind: ResultKind;
  content?: string;
  url?: string;
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
