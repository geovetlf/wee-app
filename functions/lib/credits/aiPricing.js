"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsProImage = exports.PRO_IMAGE_KINDS = exports.DEFAULT_MAX_OUTPUT_TOKENS = exports.ASSUMED = exports.TOKENS = exports.SEARCH_USD_PER_QUERY = exports.VOICE_USD_PER_KCHAR = exports.TEXT_RATES = void 0;
exports.usdToCredits = usdToCredits;
exports.estimateInputTokens = estimateInputTokens;
exports.estimateProviderUsd = estimateProviderUsd;
exports.priceOperation = priceOperation;
exports.videoServiceFor = videoServiceFor;
exports.priceVideo = priceVideo;
exports.imageServiceFor = imageServiceFor;
exports.priceImage = priceImage;
const imageModels_1 = require("../engine/imageModels");
const seedance_1 = require("../engine/providers/seedance");
const creditCosts_1 = require("./creditCosts");
/** USD → Credits, con el margen del motor. Redondea siempre hacia arriba. */
function usdToCredits(usd, settings) {
    if (usd <= 0)
        return 0;
    return Math.max(1, Math.ceil(usd * settings.creditsPerUsd * (1 + settings.margin)));
}
/**
 * Credits de una operación.
 *  - Modo real: coste oficial × Credits por dólar × (1 + margen).
 *  - Modo prueba: el precio del catálogo (configurable en creditCosts/{servicio}).
 *
 * En los dos casos se aplica un suelo: **nunca se cobra menos de lo que cuesta la
 * API**. Un precio fijo por tramo no puede cubrir todas las duraciones (una historia
 * de 20 s cuesta el triple que un clip de 5 s), así que el coste sin margen manda
 * cuando el catálogo se queda corto. Para vender más barato se baja el margen o
 * los Credits por dólar en aiSettings/global, no el suelo.
 */
const creditsOf = (service, usd, settings) => {
    const withMargin = usdToCredits(usd, settings);
    if (settings.pricingMode === 'real')
        return withMargin;
    const atCost = usd > 0 ? Math.ceil(usd * settings.creditsPerUsd) : 0;
    return Math.max((0, creditCosts_1.getCreditCost)(service), atCost);
};
// ──────── COSTE DE PROVEEDOR DE CUALQUIER OPERACIÓN (texto, voz, búsqueda, audio) ────────
/**
 * Tarifas oficiales del modelo MÁS CARO que puede atender cada nivel. Se usa el
 * más caro a propósito: el precio que ve la persona tiene que ser un techo, no
 * un promedio, porque después de confirmar no se le puede cobrar más.
 *
 * Texto (USD por millón de tokens, entrada / salida):
 *   standard → Gemini 2.5 Flash-Lite   0.10 / 0.40
 *   high     → Gemini 3.8 Flash        0.75 / 3.75
 *   max      → Claude Sonnet 5         2.00 / 10.00
 */
exports.TEXT_RATES = {
    standard: { input: 0.1, output: 0.4 },
    high: { input: 0.75, output: 3.75 },
    max: { input: 2, output: 10 },
};
/** USD por 1 000 caracteres de voz: ElevenLabs v3 y Multilingual v2, los más caros de la cadena. */
exports.VOICE_USD_PER_KCHAR = 0.1;
/** USD por consulta de búsqueda con fuentes, pasado el cupo mensual gratuito de Google. */
exports.SEARCH_USD_PER_QUERY = 0.014;
/** Tokens que consume cada entrada, según la documentación oficial de Gemini. */
exports.TOKENS = { perImage: 1300, perDocumentPage: 258, perAudioSecond: 32 };
/** Cuando no se conoce el tamaño del adjunto se asume este, y el motor rechaza lo que lo supere. */
exports.ASSUMED = { documentPages: 60, audioSeconds: 600 };
/** Salida máxima por defecto de los adaptadores de texto: el techo del coste de salida. */
exports.DEFAULT_MAX_OUTPUT_TOKENS = 1200;
const chars = (value) => (typeof value === 'string' ? value.length : 0);
/**
 * Tokens de entrada de una petición de texto, contando TODO lo que se envía:
 * prompt, instrucciones, historial de la conversación, fotos, documentos y audio.
 * Ignorar el historial y los adjuntos era la causa de que el precio mostrado
 * pudiera quedarse por debajo del coste real.
 */
function estimateInputTokens(input) {
    var _a, _b;
    let text = chars(input.prompt) + chars(input.purpose) + chars(input.system) + chars(input.brief) + chars(input.text) + chars(input.content);
    if (Array.isArray(input.history)) {
        for (const turn of input.history)
            text += chars(turn === null || turn === void 0 ? void 0 : turn.text);
    }
    if (Array.isArray(input.previous)) {
        for (const p of input.previous)
            text += chars(p);
    }
    let tokens = Math.max(400, Math.round(text / 4) + 300);
    const images = (input.imageUrl ? 1 : 0) + (Array.isArray(input.imageUrls) ? input.imageUrls.length : 0) + (Array.isArray(input.referenceImages) ? input.referenceImages.length : 0);
    tokens += images * exports.TOKENS.perImage;
    if (input.documentUrl)
        tokens += Number((_a = input.documentPages) !== null && _a !== void 0 ? _a : exports.ASSUMED.documentPages) * exports.TOKENS.perDocumentPage;
    if (input.audioUrl)
        tokens += Number((_b = input.audioSeconds) !== null && _b !== void 0 ? _b : exports.ASSUMED.audioSeconds) * exports.TOKENS.perAudioSecond;
    return tokens;
}
const tierOf = (input) => {
    var _a;
    const q = String((_a = input.quality) !== null && _a !== void 0 ? _a : '');
    return q === 'max' ? 'max' : q === 'high' ? 'high' : 'standard';
};
/**
 * Coste oficial estimado de una operación que NO es de imagen ni de video.
 * Siempre por arriba: modelo más caro del nivel y salida al máximo permitido.
 */
function estimateProviderUsd(capability, input = {}) {
    var _a, _b;
    const tier = tierOf(input);
    if (capability === 'voice.tts') {
        const text = Math.max(chars(input.text) || chars(input.prompt) || chars(input.content), 200);
        return (text / 1000) * exports.VOICE_USD_PER_KCHAR;
    }
    if (capability === 'audio.transcribe') {
        const seconds = Number((_a = input.audioSeconds) !== null && _a !== void 0 ? _a : exports.ASSUMED.audioSeconds);
        const rate = exports.TEXT_RATES[tier];
        return (seconds * exports.TOKENS.perAudioSecond * rate.input + exports.DEFAULT_MAX_OUTPUT_TOKENS * rate.output) / 1000000;
    }
    const rate = exports.TEXT_RATES[tier];
    const inputTokens = estimateInputTokens(input);
    const outputTokens = Number((_b = input.maxOutputTokens) !== null && _b !== void 0 ? _b : exports.DEFAULT_MAX_OUTPUT_TOKENS);
    const usd = (inputTokens * rate.input + outputTokens * rate.output) / 1000000;
    return capability === 'text.search' ? usd + exports.SEARCH_USD_PER_QUERY : usd;
}
/**
 * Precio de cualquier operación con coste de proveedor que no sea imagen ni video.
 * Aplica el mismo suelo: nunca por debajo del coste oficial estimado.
 */
function priceOperation(capability, input, service, settings) {
    var _a;
    const usd = estimateProviderUsd(capability, input);
    return {
        service,
        credits: creditsOf(service, usd, settings),
        usd,
        provider: 'router',
        model: 'según la cadena',
        detail: { tier: tierOf(input), estimatedInputTokens: estimateInputTokens(input), maxOutputTokens: Number((_a = input.maxOutputTokens) !== null && _a !== void 0 ? _a : exports.DEFAULT_MAX_OUTPUT_TOKENS) },
    };
}
/**
 * Tramo de precio del video. Sigue a la familia Seedance: cada modelo tiene su
 * tarifa oficial, así que cada uno tiene su propio servicio de Credits.
 */
function videoServiceFor(modelId, resolution) {
    if (modelId === seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_5)
        return resolution === '1080p' ? 'ai_video_max' : 'ai_video_advanced';
    if (modelId === seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0)
        return resolution === '1080p' || resolution === '4k' ? 'ai_video_max' : 'ai_video_hd';
    return resolution === '480p' ? 'ai_video_draft' : 'ai_video';
}
/** Coste oficial y Credits de una generación de video, antes de llamar al proveedor. */
function priceVideo(input, settings) {
    var _a, _b;
    const modelId = seedance_1.SEEDANCE_MODEL_IDS[input.modelId] || input.modelId;
    const spec = (0, seedance_1.specOf)(modelId);
    const resolution = (0, seedance_1.resolveResolution)(modelId, input.resolution, input.quality);
    const durationSec = (0, seedance_1.clampDuration)(modelId, (_a = input.durationSec) !== null && _a !== void 0 ? _a : 5);
    const { usd, tokens, ratePerMillion } = (0, seedance_1.seedanceCostUsd)({
        modelId,
        resolution,
        durationSec,
        ratio: input.aspectRatio,
        inputVideoSec: input.inputVideoSec,
    });
    const service = videoServiceFor(modelId, resolution);
    return {
        service,
        credits: creditsOf(service, usd, settings),
        usd,
        provider: 'seedance',
        model: modelId,
        detail: { family: spec.key, resolution, durationSec, estimatedTokens: tokens, usdPerMillionTokens: ratePerMillion, inputVideoSec: (_b = input.inputVideoSec) !== null && _b !== void 0 ? _b : 0 },
    };
}
// ──────────────────────────── IMAGEN (Gemini y compañía) ────────────────────────────
/** Operaciones que necesitan el modelo de máxima precisión: conservar la identidad. */
exports.PRO_IMAGE_KINDS = new Set(['restore', 'retouch', 'look', 'identity']);
const needsProImage = (capability, input = {}) => {
    var _a, _b;
    return capability === 'image.identity_edit' ||
        exports.PRO_IMAGE_KINDS.has(String((_a = input.kind) !== null && _a !== void 0 ? _a : '')) ||
        String((_b = input.quality) !== null && _b !== void 0 ? _b : '') === 'max';
};
exports.needsProImage = needsProImage;
/** Servicio de Credits de una operación de imagen, según el nivel del modelo elegido. */
function imageServiceFor(capability, input = {}, tier) {
    // Probarse ropa tiene su propio precio: BFL cobra por megapíxel y devuelve el coste real
    if (capability === 'image.try_on')
        return 'ai_tryon';
    const level = tier || ((0, exports.needsProImage)(capability, input) ? 'max' : undefined);
    if (level === 'max')
        return 'ai_image_pro';
    if (level === 'standard')
        return (0, imageModels_1.isEditCapability)(capability) ? 'ai_image_enhance_lite' : 'ai_image_lite';
    return (0, imageModels_1.isEditCapability)(capability) ? 'ai_image_enhance' : 'ai_image';
}
/**
 * Coste oficial y Credits de una operación de imagen.
 *
 * Elige el modelo más barato capaz de hacer la tarea (engine/imageModels.ts),
 * salvo que se pase uno concreto porque la persona eligió una opción superior.
 * El precio depende siempre de tres cosas: modelo, resolución y cantidad.
 */
function priceImage(input, settings) {
    var _a;
    const count = Math.max(1, Math.min(8, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
    const need = { capability: input.capability, kind: input.kind, quality: input.quality, resolution: input.resolution, references: input.references };
    const chosen = input.modelId && (0, imageModels_1.imageModelOf)(input.modelId)
        ? { model: (0, imageModels_1.imageModelOf)(input.modelId), size: input.resolution || '1K', tier: (0, imageModels_1.imageModelOf)(input.modelId).tier, reason: 'lo eligió la persona' }
        : (0, imageModels_1.chooseImageModel)(need, input.available);
    const edit = (0, imageModels_1.isEditCapability)(input.capability);
    const usdPerImage = (0, imageModels_1.usdFor)(chosen.model, chosen.size, edit);
    const discount = (0, imageModels_1.volumeFactor)(count);
    const usd = count * usdPerImage * discount;
    const service = imageServiceFor(input.capability, { kind: input.kind, quality: input.quality }, chosen.tier);
    return {
        service,
        credits: creditsOf(service, usd, settings),
        usd,
        provider: chosen.model.provider,
        model: chosen.model.modelId,
        detail: {
            tier: chosen.tier,
            label: chosen.model.label,
            imageSize: chosen.size,
            count,
            usdPerImage,
            volumeDiscount: discount < 1 ? Math.round((1 - discount) * 100) : 0,
            reason: chosen.reason,
            edit,
        },
    };
}
//# sourceMappingURL=aiPricing.js.map