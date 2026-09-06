"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runwayAdapter = exports.runwayModels = void 0;
const http_1 = require("../http");
/**
 * Runway (clave RUNWAY_API_KEY). Contrato: POST /v1/image_to_video | /v1/text_to_video
 * → id; GET /v1/tasks/{id} hasta SUCCEEDED con output[0]. Cabecera X-Runway-Version.
 * Pendiente de verificar con clave real.
 */
const KEY = 'RUNWAY_API_KEY';
const base = () => (0, http_1.env)('RUNWAY_BASE_URL') || 'https://api.dev.runwayml.com';
const VERSION = '2024-11-06';
exports.runwayModels = [
    { id: 'gen4_turbo', provider: 'runway', capabilities: ['video.image_to_video'], quality: 4, speed: 4, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 10, verified: false },
    { id: 'gen4.5', provider: 'runway', capabilities: ['video.generate', 'video.image_to_video'], quality: 5, speed: 3, cost: { unit: 'second', usd: 0.12 }, maxDurationSec: 10, verified: false },
];
const headers = () => {
    const apiKey = (0, http_1.env)(KEY);
    if (!apiKey)
        throw new http_1.NotConfiguredError('runway', KEY);
    return { Authorization: `Bearer ${apiKey}`, 'X-Runway-Version': VERSION };
};
exports.runwayAdapter = {
    id: 'runway',
    name: 'Runway',
    modalities: ['video'],
    models: exports.runwayModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.runwayModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f;
        const { input, model, ctx, prefs, capability } = request;
        const start = Date.now();
        const wanted = Math.round(Number((_b = (_a = prefs.durationSec) !== null && _a !== void 0 ? _a : input.durationSec) !== null && _b !== void 0 ? _b : 5));
        const duration = wanted > 5 ? 10 : 5;
        const ratio = String((_c = input.aspectRatio) !== null && _c !== void 0 ? _c : '9:16') === '16:9' ? '1280:720' : '720:1280';
        const imageUrl = String((_d = input.imageUrl) !== null && _d !== void 0 ? _d : '');
        const endpoint = capability === 'video.image_to_video' || (imageUrl && model.id === 'gen4_turbo') ? 'image_to_video' : 'text_to_video';
        if (endpoint === 'image_to_video' && !imageUrl)
            throw new http_1.ProviderError('runway: este modelo necesita una imagen de partida', 'runway', undefined, false);
        const body = { model: model.id, promptText: String((_f = (_e = input.prompt) !== null && _e !== void 0 ? _e : input.purpose) !== null && _f !== void 0 ? _f : ''), ratio, duration };
        if (endpoint === 'image_to_video')
            body.promptImage = imageUrl;
        const created = await (0, http_1.fetchJson)(`${base()}/v1/${endpoint}`, { provider: 'runway', headers: headers(), body, timeoutMs: 60000 });
        const taskId = created.id;
        if (!taskId)
            throw new http_1.ProviderError('runway: no devolvió id de tarea', 'runway');
        const remote = await (0, http_1.pollUntil)(async () => {
            var _a, _b, _c, _d;
            const state = await (0, http_1.fetchJson)(`${base()}/v1/tasks/${taskId}`, { provider: 'runway', headers: headers(), timeoutMs: 30000 });
            if (state.status === 'FAILED')
                return { done: true, error: String((_b = (_a = state.failure) !== null && _a !== void 0 ? _a : state.failureCode) !== null && _b !== void 0 ? _b : 'la tarea falló') };
            if (state.status === 'SUCCEEDED')
                return { done: true, value: String((_d = (_c = state.output) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : '') };
            return { done: false };
        }, { intervalMs: 8000, timeoutMs: request.timeoutMs, provider: 'runway' });
        if (!remote)
            throw new http_1.ProviderError('runway: terminó sin video', 'runway');
        const url = await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'runway', 'weel');
        return { output: { kind: 'video', url, durationSec: duration }, usage: { seconds: duration }, costUSD: duration * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
    },
};
//# sourceMappingURL=runway.js.map