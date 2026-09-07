import { getFirestore } from 'firebase-admin/firestore';
import { CapabilityId } from '../creator/types';
import { ADAPTERS } from './registry';
import { loadConfig } from './config';
import { firestoreLedger } from './ledger';
import { createRouter, memoryHealth } from './router';
import { dayKey } from './limits';
import { EngineRequest, EngineResult, RouteDecision } from './types';

/**
 * WEË AI ENGINE — punto de entrada (docs/AI-ENGINE.md).
 *
 *   Weë → WEË AI ENGINE → AI ROUTER → proveedor especializado
 *
 * engine.generate(): ejecuta una capacidad eligiendo el mejor proveedor
 * disponible con fallback automático y registro en aiGenerations.
 * engine.route(): solo decide (para estimar Credits antes de crear).
 * engine.status(): estado de proveedores, cadenas y salud (administración).
 */
const health = memoryHealth();

let usageCache: { day: string; at: number; data: Record<string, any> | undefined } | null = null;
const usageToday = async (): Promise<Record<string, any> | undefined> => {
  const day = dayKey();
  if (usageCache && usageCache.day === day && Date.now() - usageCache.at < 60_000) return usageCache.data;
  const snap = await getFirestore().collection('aiUsage').doc(day).get();
  usageCache = { day, at: Date.now(), data: snap.data() };
  return usageCache.data;
};

const router = createRouter({ adapters: ADAPTERS, loadConfig, ledger: firestoreLedger, health, usageToday });

export interface ProviderStatus {
  id: string;
  name: string;
  modalities: string[];
  configured: boolean;
  enabled: boolean;
  priority: number;
  note?: string;
  health: { failures: number; openUntil?: number } | null;
  models: { id: string; capabilities: CapabilityId[]; quality: number; speed: number; cost: string; maxDurationSec?: number; verified: boolean }[];
}

export const engine = {
  generate: (request: EngineRequest): Promise<EngineResult> => router.execute(request),
  route: (request: EngineRequest): Promise<RouteDecision> => router.route(request),
  /** Ajustes vivos (aiSettings/global + defaults). */
  settings: async () => (await loadConfig()).settings,
  health,
  async status() {
    const config = await loadConfig(true);
    const snapshot = health.snapshot();
    const providers: ProviderStatus[] = Object.values(ADAPTERS).map((adapter) => {
      const conf = config.providers[adapter.id] || { enabled: true, priority: 50 };
      return {
        id: adapter.id,
        name: adapter.name,
        modalities: adapter.modalities,
        configured: adapter.isConfigured(),
        enabled: conf.enabled,
        priority: conf.priority,
        note: conf.note,
        health: snapshot[adapter.id] || null,
        models: adapter.models.map((m) => ({
          id: m.id,
          capabilities: m.capabilities,
          quality: m.quality,
          speed: m.speed,
          cost: `$${m.cost.usd}/${m.cost.unit}${m.cost.usdOutput ? ` (+$${m.cost.usdOutput} salida)` : ''}`,
          maxDurationSec: m.maxDurationSec,
          verified: !!m.verified,
        })),
      };
    });
    return {
      source: config.source,
      settings: config.settings,
      providers,
      routing: Object.values(config.routing).map((r) => ({ capability: r!.capability, policy: r!.policy, chain: r!.chain })),
    };
  },
};

export * from './types';
export { progressTextFor, friendlyFailure } from './humanize';
export { EngineError, toEngineHttpsError, classifyError, assertText } from './errors';
export { limiter } from './limits';
