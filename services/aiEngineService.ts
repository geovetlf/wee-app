import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Administración del WEË AI ENGINE (docs/AI-ENGINE.md) desde la app.
 * Solo responde a administradores (claim `admin` o uid en WEE_ADMIN_UIDS);
 * para el resto devuelve permission-denied.
 */
export interface EngineModelStatus {
  id: string;
  capabilities: string[];
  quality: number;
  speed: number;
  cost: string;
  maxDurationSec?: number;
  verified: boolean;
}

export interface EngineProviderStatus {
  id: string;
  name: string;
  modalities: string[];
  configured: boolean;
  enabled: boolean;
  priority: number;
  note?: string;
  health: { failures: number; openUntil?: number } | null;
  models: EngineModelStatus[];
}

export interface EngineRoutingStatus {
  capability: string;
  policy: 'quality-first' | 'balanced' | 'cost-first';
  chain: { provider: string; model?: string; minQuality?: string; maxQuality?: string }[];
}

export interface EngineStatus {
  source: 'defaults' | 'firestore';
  settings: {
    pricingMode: 'simulated' | 'real';
    creditsPerUsd: number;
    margin: number;
    defaultPolicy: string;
    allowMockFallback: boolean;
  };
  providers: EngineProviderStatus[];
  routing: EngineRoutingStatus[];
}

const call = async <T>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const fn = httpsCallable(functions, 'engineAdmin');
  const result = await fn({ action, ...payload });
  return result.data as T;
};

export const aiEngineService = {
  status: () => call<EngineStatus>('status'),
  seedDefaults: (overwrite = false) => call<{ written: number }>('seedDefaults', { overwrite }),
  setProvider: (id: string, patch: { enabled?: boolean; priority?: number; note?: string }) => call<{ ok: true }>('setProvider', { id, ...patch }),
  setRouting: (capability: string, patch: { policy?: string; chain?: EngineRoutingStatus['chain'] }) => call<{ ok: true }>('setRouting', { capability, ...patch }),
  setSettings: (patch: Record<string, unknown>) => call<{ ok: true }>('setSettings', patch),
  resetHealth: (id?: string) => call<{ ok: true }>('resetHealth', id ? { id } : {}),
};

export const isPermissionDenied = (error: unknown): boolean => {
  const code = String((error as any)?.code || '');
  return code.includes('permission-denied') || code.includes('unauthenticated');
};
