import { getFirestore } from 'firebase-admin/firestore';
import { CapabilityId } from '../creator/types';
import { CapabilityRouting, EngineSettings, ProviderConfig } from './types';
import { DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS } from './registry';

/**
 * Configuración viva del engine: valores por defecto del registro + lo que el
 * administrador guarde en Firestore (aiProviders, aiRouting, aiSettings).
 * Se cachea un minuto; si Firestore falla, el engine sigue con los defaults.
 */
export interface EngineConfig {
  providers: Record<string, ProviderConfig>;
  routing: Partial<Record<CapabilityId, CapabilityRouting>>;
  settings: EngineSettings;
  source: 'defaults' | 'firestore';
}

const CACHE_MS = 60_000;
let cache: { at: number; config: EngineConfig } | null = null;

const db = () => getFirestore();

export const defaultConfig = (): EngineConfig => ({
  providers: { ...DEFAULT_PROVIDERS },
  routing: { ...DEFAULT_ROUTING },
  settings: { ...DEFAULT_SETTINGS },
  source: 'defaults',
});

export async function loadConfig(force = false): Promise<EngineConfig> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.config;
  const config = defaultConfig();
  try {
    const [providers, routing, settings] = await Promise.all([
      db().collection('aiProviders').get(),
      db().collection('aiRouting').get(),
      db().collection('aiSettings').doc('global').get(),
    ]);
    providers.forEach((doc) => {
      const data = doc.data() as Partial<ProviderConfig>;
      const base = config.providers[doc.id] || { enabled: true, priority: 50 };
      config.providers[doc.id] = { ...base, ...data, models: { ...(base.models || {}), ...(data.models || {}) } };
    });
    routing.forEach((doc) => {
      const data = doc.data() as Partial<CapabilityRouting>;
      const capability = doc.id as CapabilityId;
      const base = config.routing[capability];
      if (Array.isArray(data.chain)) {
        config.routing[capability] = { capability, chain: data.chain, policy: data.policy || base?.policy || config.settings.defaultPolicy };
      } else if (data.policy && base) {
        config.routing[capability] = { ...base, policy: data.policy };
      }
    });
    if (settings.exists) {
      const data = settings.data() as Partial<EngineSettings>;
      config.settings = {
        ...config.settings,
        ...data,
        timeoutsMs: { ...config.settings.timeoutsMs, ...(data.timeoutsMs || {}) },
        circuitBreaker: { ...config.settings.circuitBreaker, ...(data.circuitBreaker || {}) },
      };
    }
    config.source = 'firestore';
  } catch (error) {
    console.warn('WEË AI ENGINE: no se pudo leer la configuración, se usan los valores por defecto:', error);
  }
  cache = { at: Date.now(), config };
  return config;
}

export const invalidateConfig = (): void => {
  cache = null;
};
