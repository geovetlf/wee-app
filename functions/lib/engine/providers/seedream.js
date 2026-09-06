"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedreamAdapter = exports.seedreamModels = void 0;
const http_1 = require("../http");
const ark_1 = require("./ark");
/**
 * ByteDance Seedream (imagen) vía BytePlus ModelArk.
 * Contrato: POST /images/generations → data[].url. Pendiente de verificar con clave real.
 */
exports.seedreamModels = [
    { id: 'seedream-4-0-250828', provider: 'seedream', capabilities: ['image.generate', 'image.edit', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.03 }, verified: false },
];
const sizeFor = (aspect) => {
    if (aspect === '9:16')
        return '1024x1792';
    if (aspect === '16:9')
        return '1792x1024';
    return '1024x1024';
};
exports.seedreamAdapter = {
    id: 'seedream',
    name: 'ByteDance Seedream',
    modalities: ['image'],
    models: exports.seedreamModels,
    isConfigured: ark_1.isArkConfigured,
    supports: (capability) => exports.seedreamModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { input, model, ctx } = request;
        const start = Date.now();
        const headers = (0, ark_1.arkHeaders)('seedream');
        const count = Math.max(1, Math.min(4, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
        const prompt = [String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : ''), String((_d = input.brief) !== null && _d !== void 0 ? _d : '')].filter(Boolean).join('\n');
        const imageUrl = String((_e = input.imageUrl) !== null && _e !== void 0 ? _e : '');
        const urls = [];
        for (let i = 0; i < count; i++) {
            const data = await (0, http_1.fetchJson)(`${(0, ark_1.arkBase)()}/images/generations`, {
                provider: 'seedream',
                headers,
                timeoutMs: request.timeoutMs,
                body: Object.assign({ model: model.id, prompt, size: sizeFor(String((_f = input.aspectRatio) !== null && _f !== void 0 ? _f : '1:1')), response_format: 'url', watermark: false }, (imageUrl ? { image: imageUrl } : {})),
            });
            const remote = (_h = (_g = data.data) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.url;
            if (!remote)
                throw new http_1.ProviderError('seedream: la respuesta no trajo imagen', 'seedream');
            urls.push(await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'seedream', `image-${i + 1}`));
        }
        return { output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined }, usage: { images: urls.length }, costUSD: urls.length * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
    },
};
//# sourceMappingURL=seedream.js.map