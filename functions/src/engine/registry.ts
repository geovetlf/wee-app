import { CapabilityId } from '../creator/types';
import { CapabilityRouting, ChainLink, EngineSettings, ProviderAdapter, ProviderConfig, RoutingPolicy } from './types';
import { mockAdapter } from './providers/mock';
import { geminiAdapter } from './providers/gemini';
import { claudeAdapter } from './providers/claude';
import { openaiAdapter } from './providers/openai';
import { veoAdapter } from './providers/veo';
import { seedanceAdapter } from './providers/seedance';
import { seedreamAdapter } from './providers/seedream';
import { klingAdapter } from './providers/kling';
import { minimaxAdapter } from './providers/minimax';
import { runwayAdapter } from './providers/runway';
import { fluxAdapter } from './providers/flux';
import { elevenlabsAdapter } from './providers/elevenlabs';
import { musicPlaceholderAdapter } from './providers/music';

/**
 * Registro de proveedores y valores por defecto del router.
 * Todo lo de aquí se puede sobreescribir desde Firestore sin tocar código:
 *   aiProviders/{proveedor}   activo, prioridad, modelos, límites
 *   aiRouting/{capacidad}     cadena de fallback y política
 *   aiSettings/global         modo de precios, Credits por USD, margen, tiempos
 * Añadir un proveedor = un archivo en providers/ + una línea en ADAPTERS.
 */
export const ADAPTERS: Record<string, ProviderAdapter> = {
  mock: mockAdapter,
  gemini: geminiAdapter,
  claude: claudeAdapter,
  openai: openaiAdapter,
  veo: veoAdapter,
  seedance: seedanceAdapter,
  seedream: seedreamAdapter,
  kling: klingAdapter,
  minimax: minimaxAdapter,
  runway: runwayAdapter,
  flux: fluxAdapter,
  elevenlabs: elevenlabsAdapter,
  'music-pending': musicPlaceholderAdapter,
};

export const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  gemini: { enabled: true, priority: 1 },
  claude: { enabled: true, priority: 2 },
  openai: { enabled: true, priority: 3 },
  veo: { enabled: true, priority: 1 },
  seedance: { enabled: true, priority: 2 },
  kling: { enabled: true, priority: 3 },
  minimax: { enabled: true, priority: 4 },
  runway: { enabled: true, priority: 5 },
  flux: { enabled: true, priority: 2 },
  seedream: { enabled: true, priority: 3 },
  elevenlabs: { enabled: true, priority: 1 },
  'music-pending': { enabled: false, priority: 1, note: 'Sin proveedor de música con API oficial y licencia comercial todavía.' },
  mock: { enabled: true, priority: 99, note: 'Modo demo: último recurso.' },
};

const chain = (...providers: string[]): ChainLink[] => providers.map((provider) => ({ provider }));
const routing = (capability: CapabilityId, links: ChainLink[], policy: RoutingPolicy): CapabilityRouting => ({ capability, chain: links, policy });

/** Cadenas por defecto. El orden es la prioridad; el router salta lo que no esté disponible. */
export const DEFAULT_ROUTING: Record<CapabilityId, CapabilityRouting> = {
  'text.generate': routing('text.generate', chain('gemini', 'claude', 'openai'), 'balanced'),
  'text.structure': routing('text.structure', chain('gemini', 'claude', 'openai'), 'cost-first'),
  'script.write': routing('script.write', chain('claude', 'gemini', 'openai'), 'quality-first'),
  'scene.split': routing('scene.split', chain('claude', 'gemini', 'openai'), 'balanced'),
  'subtitle.generate': routing('subtitle.generate', chain('gemini', 'openai', 'claude'), 'cost-first'),
  'vision.describe': routing('vision.describe', chain('gemini'), 'balanced'),
  'image.generate': routing('image.generate', chain('gemini', 'flux', 'seedream'), 'balanced'),
  'image.reference': routing('image.reference', chain('flux', 'gemini', 'seedream'), 'quality-first'),
  'image.edit': routing('image.edit', chain('gemini', 'flux', 'seedream'), 'balanced'),
  'image.background_remove': routing('image.background_remove', chain('gemini', 'flux'), 'balanced'),
  'image.object_remove': routing('image.object_remove', chain('gemini', 'flux'), 'balanced'),
  'image.identity_edit': routing('image.identity_edit', chain('gemini', 'flux'), 'quality-first'),
  'image.space_restyle': routing('image.space_restyle', chain('gemini', 'flux'), 'balanced'),
  'image.upscale': routing('image.upscale', [], 'balanced'),
  // El ejemplo del producto: Veo → Seedance → Kling → Hailuo (MiniMax) → Runway
  'video.generate': routing('video.generate', chain('veo', 'seedance', 'kling', 'minimax', 'runway'), 'quality-first'),
  'video.image_to_video': routing('video.image_to_video', chain('veo', 'kling', 'runway', 'seedance', 'minimax'), 'quality-first'),
  'video.compose': routing('video.compose', [], 'balanced'),
  'video.montage': routing('video.montage', [], 'balanced'),
  'video.vertical': routing('video.vertical', [], 'balanced'),
  'voice.tts': routing('voice.tts', chain('elevenlabs', 'minimax'), 'balanced'),
  'music.generate': routing('music.generate', chain('music-pending'), 'balanced'),
  'audio.sfx': routing('audio.sfx', chain('music-pending'), 'balanced'),
  'doc.render': routing('doc.render', [], 'balanced'),
};

export const DEFAULT_SETTINGS: EngineSettings = {
  pricingMode: process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated',
  creditsPerUsd: 100,
  margin: 0.3,
  defaultPolicy: 'balanced',
  allowMockFallback: true,
  timeoutsMs: { text: 60_000, vision: 60_000, image: 240_000, video: 900_000, voice: 120_000, music: 300_000, doc: 60_000 },
  circuitBreaker: { failures: 3, windowMs: 10 * 60_000, openMs: 5 * 60_000 },
};
