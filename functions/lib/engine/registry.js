"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.DEFAULT_ROUTING = exports.DEFAULT_PROVIDERS = exports.ADAPTERS = void 0;
const limits_1 = require("./limits");
const mock_1 = require("./providers/mock");
const gemini_1 = require("./providers/gemini");
const claude_1 = require("./providers/claude");
const openai_1 = require("./providers/openai");
const seedance_1 = require("./providers/seedance");
const seedream_1 = require("./providers/seedream");
const minimax_1 = require("./providers/minimax");
const flux_1 = require("./providers/flux");
const elevenlabs_1 = require("./providers/elevenlabs");
const music_1 = require("./providers/music");
/**
 * Registro de proveedores y valores por defecto del router.
 * Todo lo de aquí se puede sobreescribir desde Firestore sin tocar código:
 *   aiProviders/{proveedor}   activo, prioridad, modelos, límites
 *   aiRouting/{capacidad}     cadena de fallback y política
 *   aiSettings/global         modo de precios, Credits por USD, margen, tiempos, límites, video
 * Añadir un proveedor = un archivo en providers/ + una línea en ADAPTERS.
 *
 * Video: SOLO la familia Seedance (BytePlus ModelArk). No hay Kling, Runway,
 * Veo ni otro modelo de video como respaldo: si Seedance falla, el error se
 * maneja y se reembolsa; el modo demo solo entra cuando no hay clave.
 */
exports.ADAPTERS = {
    mock: mock_1.mockAdapter,
    gemini: gemini_1.geminiAdapter,
    claude: claude_1.claudeAdapter,
    openai: openai_1.openaiAdapter,
    seedance: seedance_1.seedanceAdapter,
    seedream: seedream_1.seedreamAdapter,
    minimax: minimax_1.minimaxAdapter,
    flux: flux_1.fluxAdapter,
    elevenlabs: elevenlabs_1.elevenlabsAdapter,
    'music-pending': music_1.musicPlaceholderAdapter,
};
exports.DEFAULT_PROVIDERS = {
    gemini: { enabled: true, priority: 1 },
    claude: { enabled: true, priority: 2 },
    openai: { enabled: true, priority: 3 },
    seedance: { enabled: true, priority: 1, limits: { maxCallsPerDay: 500 } },
    flux: { enabled: true, priority: 2 },
    seedream: { enabled: true, priority: 3 },
    elevenlabs: { enabled: true, priority: 1 },
    minimax: { enabled: true, priority: 2, note: 'Solo voz.' },
    'music-pending': { enabled: false, priority: 1, note: 'Sin proveedor de música con API oficial y licencia comercial todavía.' },
    mock: { enabled: true, priority: 99, note: 'Modo demo: último recurso.' },
};
const chain = (...providers) => providers.map((provider) => ({ provider }));
const routing = (capability, links, policy) => ({ capability, chain: links, policy });
/** Cadenas por defecto. El orden es la prioridad; el router salta lo que no esté disponible. */
exports.DEFAULT_ROUTING = {
    'text.generate': routing('text.generate', chain('gemini', 'claude', 'openai'), 'balanced'),
    'text.structure': routing('text.structure', chain('gemini', 'claude', 'openai'), 'cost-first'),
    'text.search': routing('text.search', chain('gemini'), 'balanced'),
    'script.write': routing('script.write', chain('gemini', 'claude', 'openai'), 'quality-first'),
    'scene.split': routing('scene.split', chain('gemini', 'claude', 'openai'), 'balanced'),
    'subtitle.generate': routing('subtitle.generate', chain('gemini', 'openai', 'claude'), 'cost-first'),
    'vision.describe': routing('vision.describe', chain('gemini'), 'balanced'),
    // Leer un PDF y transcribir audio: Gemini los entiende de forma nativa, sin convertirlos antes
    'doc.read': routing('doc.read', chain('gemini', 'claude'), 'balanced'),
    'audio.transcribe': routing('audio.transcribe', chain('gemini'), 'cost-first'),
    'image.generate': routing('image.generate', chain('gemini', 'flux', 'seedream'), 'balanced'),
    'image.reference': routing('image.reference', chain('gemini', 'flux', 'seedream'), 'quality-first'),
    'image.edit': routing('image.edit', chain('gemini', 'flux', 'seedream'), 'balanced'),
    'image.background_remove': routing('image.background_remove', chain('gemini', 'flux'), 'balanced'),
    'image.object_remove': routing('image.object_remove', chain('gemini', 'flux'), 'balanced'),
    // Conservar el rostro es lo que decide esta capacidad: Nano Banana Pro fijado.
    'image.identity_edit': routing('image.identity_edit', [{ provider: 'gemini', model: gemini_1.IMAGE_MODEL_PRO }, { provider: 'flux' }], 'quality-first'),
    'image.space_restyle': routing('image.space_restyle', chain('gemini', 'flux'), 'balanced'),
    // Probarse ropa: modelo dedicado de BFL, con Nano Banana Pro como respaldo
    'image.try_on': routing('image.try_on', [{ provider: 'flux', model: 'flux-tools/vto-v2' }, { provider: 'gemini', model: gemini_1.IMAGE_MODEL_PRO }], 'quality-first'),
    'image.upscale': routing('image.upscale', chain('gemini'), 'balanced'),
    // Video: exclusivamente Seedance (el Weë Video Engine elige la versión)
    'video.generate': routing('video.generate', chain('seedance'), 'quality-first'),
    'video.image_to_video': routing('video.image_to_video', chain('seedance'), 'quality-first'),
    'video.reference': routing('video.reference', chain('seedance'), 'quality-first'),
    'video.compose': routing('video.compose', [], 'balanced'),
    'video.montage': routing('video.montage', [], 'balanced'),
    'video.vertical': routing('video.vertical', [], 'balanced'),
    'voice.tts': routing('voice.tts', chain('elevenlabs', 'minimax'), 'balanced'),
    'music.generate': routing('music.generate', chain('music-pending'), 'balanced'),
    'audio.sfx': routing('audio.sfx', chain('music-pending'), 'balanced'),
    'doc.render': routing('doc.render', [], 'balanced'),
};
exports.DEFAULT_SETTINGS = {
    pricingMode: process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated',
    creditsPerUsd: 100,
    margin: 0.3,
    defaultPolicy: 'balanced',
    allowMockFallback: true,
    timeoutsMs: { text: 90000, vision: 90000, image: 240000, video: 1200000, voice: 120000, music: 300000, doc: 60000 },
    circuitBreaker: { failures: 3, windowMs: 10 * 60000, openMs: 5 * 60000 },
    limits: limits_1.DEFAULT_LIMITS,
    // Modelo de video por defecto. Seedance 2.0 fast cuesta USD 0.12 por segundo a 720p
    // frente a 0.15 de Seedance 2.0, con calidad de la misma generación; la calidad alta
    // y la máxima suben a 2.0 y 2.5. Cambiable en aiSettings/global.video.defaultModel.
    video: { defaultModel: 'SEEDANCE_2_0_FAST' },
};
//# sourceMappingURL=registry.js.map