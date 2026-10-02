import { getFirestore } from 'firebase-admin/firestore';
import { CapabilityId } from '../creator/types';
import { CapabilityRouting, EngineSettings, Modality, ProviderConfig } from './types';
import { DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS } from './registry';

/**
 * LOS CUPOS POR PERSONA SE FUSIONAN, NO SE SUSTITUYEN (auditoría H0, escenario #20).
 *
 * `aiSettings/global.limits = { perUserPerDay: { video: 5 } }` dejaba SIN límite
 * el texto, la imagen, la voz… porque la mezcla era plana; y `limits: {}` hacía
 * fallar todas las IA con un TypeError en el limitador. Ahora un ajuste toca solo
 * las modalidades que nombra, y solo con un entero ≥ 0 (0 sigue siendo «sin
 * límite», como fija creator.test.mjs). Lo demás se ignora y se avisa.
 */
const MODALIDADES = ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc'] as const;
/* Si `Modality` gana una modalidad, esto deja de compilar hasta añadirla arriba. */
const _todasLasModalidades: Exclude<Modality, (typeof MODALIDADES)[number]> extends never ? true : never = true;
void _todasLasModalidades;

export const cuposLimpios = (raw: unknown): Partial<Record<Modality, number>> => {
  const cupos: Partial<Record<Modality, number>> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return cupos;
  for (const [modalidad, valor] of Object.entries(raw as Record<string, unknown>)) {
    if (!(MODALIDADES as readonly string[]).includes(modalidad)) {
      console.warn(`WEË AI ENGINE: cupo de una modalidad desconocida ignorado (${modalidad}).`);
      continue;
    }
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
      console.warn(`WEË AI ENGINE: cupo de ${modalidad} ignorado: tiene que ser un entero ≥ 0.`);
      continue;
    }
    cupos[modalidad as Modality] = valor;
  }
  return cupos;
};

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
        limits: {
          ...config.settings.limits,
          perUserPerDay: { ...config.settings.limits.perUserPerDay, ...cuposLimpios(data.limits?.perUserPerDay) },
        },
      };
    }
    // Solo cuenta como Firestore si hay algo guardado allí
    config.source = providers.size > 0 || routing.size > 0 || settings.exists ? 'firestore' : 'defaults';
  } catch (error) {
    console.warn('WEË AI ENGINE: no se pudo leer la configuración, se usan los valores por defecto:', error);
  }
  cache = { at: Date.now(), config };
  return config;
}

export const invalidateConfig = (): void => {
  cache = null;
};
