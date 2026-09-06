"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fluxAdapter = exports.fluxModels = void 0;
const http_1 = require("../http");
/**
 * FLUX (Black Forest Labs, clave BFL_API_KEY). Imagen de alta calidad y edición
 * con Kontext. Contrato: POST /v1/{modelo} → { id, polling_url }; GET polling_url
 * hasta status "Ready" con result.sample (URL temporal). Pendiente de verificar.
 */
const KEY = 'BFL_API_KEY';
const base = () => (0, http_1.env)('BFL_BASE_URL') || 'https://api.bfl.ai';
exports.fluxModels = [
    { id: 'flux-pro-1.1', provider: 'flux', capabilities: ['image.generate', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, verified: false },
    { id: 'flux-pro-1.1-ultra', provider: 'flux', capabilities: ['image.generate', 'image.reference'], quality: 5, speed: 3, cost: { unit: 'image', usd: 0.06 }, tags: ['máxima calidad'], verified: false },
    { id: 'flux-kontext-pro', provider: 'flux', capabilities: ['image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, tags: ['edición'], verified: false },
];
const dims = (aspect) => {
    if (aspect === '9:16')
        return { width: 768, height: 1344 };
    if (aspect === '16:9')
        return { width: 1344, height: 768 };
    return { width: 1024, height: 1024 };
};
exports.fluxAdapter = {
    id: 'flux',
    name: 'FLUX (Black Forest Labs)',
    modalities: ['image'],
    models: exports.fluxModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.fluxModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f;
        const apiKey = (0, http_1.env)(KEY);
        if (!apiKey)
            throw new http_1.NotConfiguredError('flux', KEY);
        const { input, model, ctx } = request;
        const start = Date.now();
        const headers = { 'x-key': apiKey };
        const count = Math.max(1, Math.min(4, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
        const prompt = [String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : ''), String((_d = input.brief) !== null && _d !== void 0 ? _d : '')].filter(Boolean).join('\n');
        const body = Object.assign({ prompt, output_format: 'png' }, dims(String((_e = input.aspectRatio) !== null && _e !== void 0 ? _e : '1:1')));
        const imageUrl = String((_f = input.imageUrl) !== null && _f !== void 0 ? _f : '');
        if (model.id === 'flux-kontext-pro' && imageUrl) {
            const { buffer } = await (0, http_1.fetchBytes)(imageUrl, { provider: 'flux' });
            body.input_image = buffer.toString('base64');
            delete body.width;
            delete body.height;
        }
        const urls = [];
        for (let i = 0; i < count; i++) {
            const created = await (0, http_1.fetchJson)(`${base()}/v1/${model.id}`, { provider: 'flux', headers, body, timeoutMs: 60000 });
            const pollingUrl = created.polling_url || `${base()}/v1/get_result?id=${created.id}`;
            const remote = await (0, http_1.pollUntil)(async () => {
                var _a, _b;
                const state = await (0, http_1.fetchJson)(pollingUrl, { provider: 'flux', headers, timeoutMs: 30000 });
                if (state.status === 'Ready')
                    return { done: true, value: String((_b = (_a = state.result) === null || _a === void 0 ? void 0 : _a.sample) !== null && _b !== void 0 ? _b : '') };
                if (state.status === 'Error' || state.status === 'Failed' || state.status === 'Content Moderated' || state.status === 'Request Moderated')
                    return { done: true, error: String(state.status) };
                return { done: false };
            }, { intervalMs: 2000, timeoutMs: request.timeoutMs, provider: 'flux' });
            if (!remote)
                throw new http_1.ProviderError('flux: terminó sin imagen', 'flux');
            urls.push(await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'flux', `image-${i + 1}`));
        }
        return { output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined }, usage: { images: urls.length }, costUSD: urls.length * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
    },
};
//# sourceMappingURL=flux.js.map