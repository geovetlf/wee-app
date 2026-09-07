"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.DEFAULT_ROUTING = exports.DEFAULT_PROVIDERS = exports.ADAPTERS = void 0;
const limits_1 = require("./limits");
const mock_1 = require("./providers/mock");
const gemini_1 = require("./providers/gemini");
const claude_1 = require("./providers/claude");
const openai_1 = require("./providers/openai");
const fal_1 = require("./providers/fal");
const veo_1 = require("./providers/veo");
const seedance_1 = require("./providers/seedance");
const seedream_1 = require("./providers/seedream");
const kling_1 = require("./providers/kling");
const minimax_1 = require("./providers/minimax");
const runway_1 = require("./providers/runway");
const flux_1 = require("./providers/flux");
const elevenlabs_1 = require("./providers/elevenlabs");
const music_1 = require("./providers/music");
/**
 * Registro de proveedores y valores por defecto del router.
 * Todo lo de aquí se puede sobreescribir desde Firestore sin tocar código:
 *   aiProviders/{proveedor}   activo, prioridad, modelos, límites
 *   aiRouting/{capacidad}     cadena de fallback y política
 *   aiSettings/global         modo de precios, Credits por USD, margen, tiempos, límites
 * Añadir un proveedor = un archivo en providers/ + una línea en ADAPTERS.
 *
 * Proveedores iniciales de esta fase: Gemini (texto, búsqueda, visión, imagen),
 * fal.ai (video, Kling), ElevenLabs (voz). El resto queda preparado.
 */
exports.ADAPTERS = {
    mock: mock_1.mockAdapter,
    gemini: gemini_1.geminiAdapter,
    claude: claude_1.claudeAdapter,
    openai: openai_1.openaiAdapter,
    fal: fal_1.falAdapter,
    veo: veo_1.veoAdapter,
    seedance: seedance_1.seedanceAdapter,
    seedream: seedream_1.seedreamAdapter,
    kling: kling_1.klingAdapter,
    minimax: minimax_1.minimaxAdapter,
    runway: runway_1.runwayAdapter,
    flux: flux_1.fluxAdapter,
    elevenlabs: elevenlabs_1.elevenlabsAdapter,
    'music-pending': music_1.musicPlaceholderAdapter,
};
exports.DEFAULT_PROVIDERS = {
    gemini: { enabled: true, priority: 1 },
    claude: { enabled: true, priority: 2 },
    openai: { enabled: true, priority: 3 },
    fal: { enabled: true, priority: 1, limits: { maxCallsPerDay: 500 } },
    veo: { enabled: true, priority: 2 },
    seedance: { enabled: true, priority: 3 },
    kling: { enabled: true, priority: 4 },
    minimax: { enabled: true, priority: 5 },
    runway: { enabled: true, priority: 6 },
    flux: { enabled: true, priority: 2 },
    seedream: { enabled: true, priority: 3 },
    elevenlabs: { enabled: true, priority: 1 },
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
    'image.generate': routing('image.generate', chain('gemini', 'flux', 'seedream'), 'balanced'),
    'image.reference': routing('image.reference', chain('gemini', 'flux', 'seedream'), 'quality-first'),
    'image.edit': routing('image.edit', chain('gemini', 'flux', 'seedream'), 'balanced'),
    'image.background_remove': routing('image.background_remove', chain('gemini', 'flux'), 'balanced'),
    'image.object_remove': routing('image.object_remove', chain('gemini', 'flux'), 'balanced'),
    'image.identity_edit': routing('image.identity_edit', chain('gemini', 'flux'), 'quality-first'),
    'image.space_restyle': routing('image.space_restyle', chain('gemini', 'flux'), 'balanced'),
    'image.upscale': routing('image.upscale', chain('gemini'), 'balanced'),
    // Video: fal.ai (Kling) primero; el resto de adaptadores queda como respaldo
    'video.generate': routing('video.generate', chain('fal', 'veo', 'seedance', 'kling', 'minimax', 'runway'), 'quality-first'),
    'video.image_to_video': routing('video.image_to_video', chain('fal', 'veo', 'kling', 'runway', 'seedance', 'minimax'), 'quality-first'),
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
    timeoutsMs: { text: 90000, vision: 90000, image: 240000, video: 900000, voice: 120000, music: 300000, doc: 60000 },
    circuitBreaker: { failures: 3, windowMs: 10 * 60000, openMs: 5 * 60000 },
    limits: limits_1.DEFAULT_LIMITS,
};
//# sourceMappingURL=registry.js.map