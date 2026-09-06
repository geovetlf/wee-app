"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedanceAdapter = exports.seedanceModels = void 0;
const http_1 = require("../http");
const ark_1 = require("./ark");
/**
 * ByteDance Seedance (video) vía BytePlus ModelArk.
 * Contrato: POST /contents/generations/tasks → id; GET /contents/generations/tasks/{id}
 * hasta status "succeeded" con content.video_url. Pendiente de verificar con clave real.
 */
exports.seedanceModels = [
    { id: 'seedance-1-0-pro-250528', provider: 'seedance', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 12, verified: false },
    { id: 'seedance-1-0-lite-t2v-250428', provider: 'seedance', capabilities: ['video.generate'], quality: 3, speed: 4, cost: { unit: 'second', usd: 0.02 }, maxDurationSec: 10, tags: ['económico'], verified: false },
];
exports.seedanceAdapter = {
    id: 'seedance',
    name: 'ByteDance Seedance',
    modalities: ['video'],
    models: exports.seedanceModels,
    isConfigured: ark_1.isArkConfigured,
    supports: (capability) => exports.seedanceModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g;
        const { input, model, ctx, prefs, capability } = request;
        const start = Date.now();
        const headers = (0, ark_1.arkHeaders)('seedance');
        const duration = Math.min((_a = model.maxDurationSec) !== null && _a !== void 0 ? _a : 10, Math.max(4, Math.round(Number((_c = (_b = prefs.durationSec) !== null && _b !== void 0 ? _b : input.durationSec) !== null && _c !== void 0 ? _c : 5))));
        const ratio = String((_d = input.aspectRatio) !== null && _d !== void 0 ? _d : '9:16');
        const content = [{ type: 'text', text: `${String((_f = (_e = input.prompt) !== null && _e !== void 0 ? _e : input.purpose) !== null && _f !== void 0 ? _f : '')} --ratio ${ratio} --duration ${duration}` }];
        const imageUrl = String((_g = input.imageUrl) !== null && _g !== void 0 ? _g : '');
        if (capability === 'video.image_to_video' && imageUrl)
            content.push({ type: 'image_url', image_url: { url: imageUrl } });
        const task = await (0, http_1.fetchJson)(`${(0, ark_1.arkBase)()}/contents/generations/tasks`, { provider: 'seedance', headers, body: { model: model.id, content }, timeoutMs: 60000 });
        const taskId = task.id;
        if (!taskId)
            throw new http_1.ProviderError('seedance: no devolvió id de tarea', 'seedance');
        const videoUrl = await (0, http_1.pollUntil)(async () => {
            var _a, _b, _c, _d;
            const state = await (0, http_1.fetchJson)(`${(0, ark_1.arkBase)()}/contents/generations/tasks/${taskId}`, { provider: 'seedance', headers, timeoutMs: 30000 });
            if (state.status === 'failed')
                return { done: true, error: String((_b = (_a = state.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : 'la tarea falló') };
            if (state.status === 'succeeded')
                return { done: true, value: String((_d = (_c = state.content) === null || _c === void 0 ? void 0 : _c.video_url) !== null && _d !== void 0 ? _d : '') };
            return { done: false };
        }, { intervalMs: 8000, timeoutMs: request.timeoutMs, provider: 'seedance' });
        if (!videoUrl)
            throw new http_1.ProviderError('seedance: terminó sin video', 'seedance');
        const url = await (0, http_1.persistRemoteFile)(ctx.userId, videoUrl, 'seedance', 'weel');
        return { output: { kind: 'video', url, durationSec: duration }, usage: { seconds: duration }, costUSD: duration * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
    },
};
//# sourceMappingURL=seedance.js.map