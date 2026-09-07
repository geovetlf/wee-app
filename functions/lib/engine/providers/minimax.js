"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimaxAdapter = exports.minimaxModels = void 0;
const http_1 = require("../http");
/**
 * MiniMax: voz (clave MINIMAX_API_KEY, opcional MINIMAX_GROUP_ID).
 * Voz: POST /v1/t2a_v2 → data.audio (hex). Pendiente de verificar con clave real.
 * El video de Weë Studio es exclusivamente Seedance (providers/seedance.ts): aquí no hay modelos de video.
 */
const KEY = 'MINIMAX_API_KEY';
const base = () => (0, http_1.env)('MINIMAX_BASE_URL') || 'https://api.minimax.io';
exports.minimaxModels = [
    { id: 'speech-02-hd', provider: 'minimax', capabilities: ['voice.tts'], quality: 4, speed: 4, cost: { unit: 'kchar', usd: 0.05 }, verified: false },
    { id: 'speech-02-turbo', provider: 'minimax', capabilities: ['voice.tts'], quality: 3, speed: 5, cost: { unit: 'kchar', usd: 0.03 }, tags: ['económico'], verified: false },
];
const headers = () => {
    const apiKey = (0, http_1.env)(KEY);
    if (!apiKey)
        throw new http_1.NotConfiguredError('minimax', KEY);
    return { Authorization: `Bearer ${apiKey}` };
};
const withGroup = (url) => {
    const group = (0, http_1.env)('MINIMAX_GROUP_ID');
    return group ? `${url}${url.includes('?') ? '&' : '?'}GroupId=${group}` : url;
};
async function runVoice(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const { input, model, ctx } = request;
    const start = Date.now();
    const text = String((_c = (_b = (_a = input.text) !== null && _a !== void 0 ? _a : input.prompt) !== null && _b !== void 0 ? _b : input.content) !== null && _c !== void 0 ? _c : '').slice(0, 5000);
    const data = await (0, http_1.fetchJson)(withGroup(`${base()}/v1/t2a_v2`), {
        provider: 'minimax',
        headers: headers(),
        timeoutMs: request.timeoutMs,
        body: {
            model: model.id,
            text,
            stream: false,
            voice_setting: { voice_id: String((_e = (_d = input.voiceId) !== null && _d !== void 0 ? _d : (0, http_1.env)('MINIMAX_VOICE_ID')) !== null && _e !== void 0 ? _e : 'Spanish_ReliableMan'), speed: Number((_f = input.speed) !== null && _f !== void 0 ? _f : 1), vol: 1, pitch: 0 },
            audio_setting: { format: 'mp3', sample_rate: 32000, bitrate: 128000 },
        },
    });
    const hex = (_g = data.data) === null || _g === void 0 ? void 0 : _g.audio;
    if (!hex)
        throw new http_1.ProviderError(`minimax: ${(_j = (_h = data.base_resp) === null || _h === void 0 ? void 0 : _h.status_msg) !== null && _j !== void 0 ? _j : 'sin audio'}`, 'minimax');
    const url = await (0, http_1.saveGeneratedFile)(ctx.userId, Buffer.from(hex, 'hex'), 'audio/mpeg', 'voice');
    const kchars = text.length / 1000;
    return {
        output: { kind: 'audio', url, durationSec: Number((_l = (_k = data.extra_info) === null || _k === void 0 ? void 0 : _k.audio_length) !== null && _l !== void 0 ? _l : 0) / 1000 || undefined },
        usage: { characters: text.length },
        costUSD: kchars * model.cost.usd,
        latencyMs: Date.now() - start,
        model: model.id,
    };
}
exports.minimaxAdapter = {
    id: 'minimax',
    name: 'MiniMax (voz)',
    modalities: ['voice'],
    models: exports.minimaxModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.minimaxModels.some((m) => m.capabilities.includes(capability)),
    run: (request) => runVoice(request),
};
//# sourceMappingURL=minimax.js.map