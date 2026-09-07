"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.falAdapter = exports.falCostUsd = exports.falModels = void 0;
const http_1 = require("../http");
/**
 * fal.ai (clave FAL_KEY): capa de acceso a modelos de video, empezando por Kling.
 * Contrato de la cola (fal.ai/docs/model-apis/queue):
 *   POST https://queue.fal.run/{model}            → { request_id, status_url, response_url }
 *   GET  {status_url}                              → { status: IN_QUEUE | IN_PROGRESS | COMPLETED, error? }
 *   GET  {response_url}                            → { video: { url } }
 * Cabecera: Authorization: Key <FAL_KEY>. Las imágenes de entrada se envían como data URI.
 * Las generaciones son asíncronas: aquí se espera con sondeo; en producción se
 * puede añadir `?fal_webhook=` con una Cloud Function pública.
 * Precio Kling 2.5 Turbo Pro: $0.35 los primeros 5 s + $0.07 por segundo extra.
 */
const KEY = 'FAL_KEY';
const base = () => (0, http_1.env)('FAL_QUEUE_URL') || 'https://queue.fal.run';
exports.falModels = [
    { id: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', provider: 'fal', capabilities: ['video.generate'], quality: 5, speed: 3, cost: { unit: 'second', usd: 0.07 }, maxDurationSec: 10, tags: ['kling'], verified: false, note: 'Kling 2.5 Turbo Pro. $0.35 por 5 s + $0.07/s extra.' },
    { id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', provider: 'fal', capabilities: ['video.image_to_video'], quality: 5, speed: 3, cost: { unit: 'second', usd: 0.07 }, maxDurationSec: 10, tags: ['kling'], verified: false, note: 'Kling 2.5 Turbo Pro. $0.35 por 5 s + $0.07/s extra.' },
    { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', provider: 'fal', capabilities: ['video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 10, tags: ['kling', 'económico'], verified: false },
];
const headers = () => {
    const apiKey = (0, http_1.env)(KEY);
    if (!apiKey)
        throw new http_1.NotConfiguredError('fal', KEY);
    return { Authorization: `Key ${apiKey}` };
};
/** Coste según la lista de fal para cada modelo Kling. */
const falCostUsd = (modelId, seconds) => {
    if (modelId.includes('v2.5-turbo/pro'))
        return 0.35 + Math.max(0, seconds - 5) * 0.07;
    return seconds * 0.05;
};
exports.falCostUsd = falCostUsd;
const ASPECTS = new Set(['16:9', '9:16', '1:1']);
exports.falAdapter = {
    id: 'fal',
    name: 'fal.ai (Kling y otros modelos de video)',
    modalities: ['video'],
    models: exports.falModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.falModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const { input, model, ctx, prefs, capability } = request;
        const start = Date.now();
        const auth = headers();
        const wanted = Math.round(Number((_b = (_a = prefs.durationSec) !== null && _a !== void 0 ? _a : input.durationSec) !== null && _b !== void 0 ? _b : 5));
        const duration = wanted > 5 ? '10' : '5';
        const seconds = Number(duration);
        const prompt = String((_d = (_c = input.prompt) !== null && _c !== void 0 ? _c : input.purpose) !== null && _d !== void 0 ? _d : '').slice(0, 2500);
        if (!prompt)
            throw new http_1.ProviderError('fal: falta la descripción del video', 'fal', undefined, false);
        const body = {
            prompt,
            duration,
            negative_prompt: String((_e = input.negativePrompt) !== null && _e !== void 0 ? _e : 'blur, distort, and low quality'),
            cfg_scale: Number((_f = input.cfgScale) !== null && _f !== void 0 ? _f : 0.5),
        };
        if (capability === 'video.image_to_video') {
            const imageUrl = String((_g = input.imageUrl) !== null && _g !== void 0 ? _g : '');
            if (!imageUrl)
                throw new http_1.ProviderError('fal: este modelo necesita una imagen de partida', 'fal', undefined, false);
            // Las fotos de la persona viven en nuestro Storage: se envían en línea, sin exponer URLs
            body.image_url = imageUrl.startsWith('data:') ? imageUrl : (0, http_1.toDataUri)(await (0, http_1.readImage)(imageUrl, 'fal'));
        }
        else {
            const aspect = String((_h = input.aspectRatio) !== null && _h !== void 0 ? _h : '9:16');
            body.aspect_ratio = ASPECTS.has(aspect) ? aspect : '16:9';
        }
        const submitted = await (0, http_1.fetchJson)(`${base()}/${model.id}`, { provider: 'fal', headers: auth, body, timeoutMs: 60000 });
        const requestId = submitted.request_id;
        if (!requestId)
            throw new http_1.ProviderError('fal: no devolvió request_id', 'fal');
        const statusUrl = String(submitted.status_url || `${base()}/${model.id}/requests/${requestId}/status`);
        const responseUrl = String(submitted.response_url || `${base()}/${model.id}/requests/${requestId}`);
        await (0, http_1.pollUntil)(async () => {
            var _a, _b, _c;
            const state = await (0, http_1.fetchJson)(statusUrl, { provider: 'fal', headers: auth, timeoutMs: 30000 });
            if (state.error || state.error_type)
                return { done: true, error: String((_c = (_b = (_a = state.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : state.error) !== null && _c !== void 0 ? _c : state.error_type) };
            if (state.status === 'COMPLETED')
                return { done: true, value: true };
            return { done: false };
        }, { intervalMs: 8000, timeoutMs: request.timeoutMs, provider: 'fal' });
        const result = await (0, http_1.fetchJson)(responseUrl, { provider: 'fal', headers: auth, timeoutMs: 60000 });
        const remote = ((_j = result.video) === null || _j === void 0 ? void 0 : _j.url) || ((_l = (_k = result.videos) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.url);
        if (!remote)
            throw new http_1.ProviderError('fal: terminó sin video', 'fal');
        const url = await (0, http_1.persistRemoteFile)(ctx.userId, String(remote), 'fal', 'weel');
        return {
            output: { kind: 'video', url, durationSec: seconds },
            usage: { seconds },
            costUSD: (0, exports.falCostUsd)(model.id, seconds),
            latencyMs: Date.now() - start,
            model: model.id,
        };
    },
};
//# sourceMappingURL=fal.js.map