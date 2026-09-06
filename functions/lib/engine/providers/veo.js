"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.veoAdapter = exports.veoModels = void 0;
const http_1 = require("../http");
/**
 * Google Veo (misma clave GEMINI_API_KEY, SDK @google/genai).
 * Video cinematográfico de hasta 8 s por clip, texto → video e imagen → video.
 * Contrato: models.generateVideos + operations.getVideosOperation. Pendiente de
 * verificar con clave real; precios de lista solo orientativos.
 */
const KEY = 'GEMINI_API_KEY';
exports.veoModels = [
    { id: 'veo-3.1-generate-preview', provider: 'veo', capabilities: ['video.generate', 'video.image_to_video'], quality: 5, speed: 2, cost: { unit: 'second', usd: 0.4 }, maxDurationSec: 8, tags: ['cinematográfico', 'audio'], verified: false },
    { id: 'veo-3.1-fast-generate-preview', provider: 'veo', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.15 }, maxDurationSec: 8, tags: ['rápido'], verified: false },
];
let client = null;
const getClient = async () => {
    const apiKey = (0, http_1.env)(KEY);
    if (!apiKey)
        throw new http_1.NotConfiguredError('veo', KEY);
    if (!client) {
        const { GoogleGenAI } = await Promise.resolve().then(() => require('@google/genai'));
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};
exports.veoAdapter = {
    id: 'veo',
    name: 'Google Veo',
    modalities: ['video'],
    models: exports.veoModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.veoModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { input, model, ctx, prefs, capability } = request;
        const start = Date.now();
        const ai = await getClient();
        const apiKey = (0, http_1.env)(KEY);
        const durationSeconds = Math.min((_a = model.maxDurationSec) !== null && _a !== void 0 ? _a : 8, Math.max(4, Math.round(Number((_c = (_b = prefs.durationSec) !== null && _b !== void 0 ? _b : input.durationSec) !== null && _c !== void 0 ? _c : 8))));
        const prompt = String((_e = (_d = input.prompt) !== null && _d !== void 0 ? _d : input.purpose) !== null && _e !== void 0 ? _e : '');
        let image;
        const imageUrl = String((_f = input.imageUrl) !== null && _f !== void 0 ? _f : '');
        if (capability === 'video.image_to_video' && imageUrl) {
            const { buffer, contentType } = await (0, http_1.fetchBytes)(imageUrl, { provider: 'veo' });
            image = { imageBytes: buffer.toString('base64'), mimeType: contentType.split(';')[0] || 'image/png' };
        }
        let operation = await ai.models.generateVideos(Object.assign(Object.assign({ model: model.id, prompt }, (image ? { image } : {})), { config: Object.assign({ aspectRatio: String((_g = input.aspectRatio) !== null && _g !== void 0 ? _g : '9:16'), durationSeconds, numberOfVideos: 1 }, (input.resolution ? { resolution: String(input.resolution) } : {})) }));
        const finished = await (0, http_1.pollUntil)(async () => {
            var _a;
            operation = await ai.operations.getVideosOperation({ operation });
            if (operation.error)
                return { done: true, error: String((_a = operation.error.message) !== null && _a !== void 0 ? _a : operation.error) };
            return { done: !!operation.done, value: operation };
        }, { intervalMs: 10000, timeoutMs: request.timeoutMs, provider: 'veo' });
        const video = (_k = (_j = (_h = finished.response) === null || _h === void 0 ? void 0 : _h.generatedVideos) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.video;
        if (!(video === null || video === void 0 ? void 0 : video.uri))
            throw new http_1.ProviderError('veo: la operación terminó sin video', 'veo');
        const { buffer, contentType } = await (0, http_1.fetchBytes)(video.uri, { provider: 'veo', headers: { 'x-goog-api-key': apiKey }, timeoutMs: 180000 });
        const url = await (0, http_1.saveGeneratedFile)(ctx.userId, buffer, contentType.includes('video') ? contentType : 'video/mp4', 'weel');
        return {
            output: { kind: 'video', url, durationSec: durationSeconds },
            usage: { seconds: durationSeconds },
            costUSD: durationSeconds * model.cost.usd,
            latencyMs: Date.now() - start,
            model: model.id,
        };
    },
};
//# sourceMappingURL=veo.js.map