"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimaxAdapter = exports.minimaxModels = void 0;
const http_1 = require("../http");
/**
 * MiniMax: video Hailuo y voz (clave MINIMAX_API_KEY, opcional MINIMAX_GROUP_ID).
 * Video: POST /v1/video_generation → task_id; GET /v1/query/video_generation;
 *        GET /v1/files/retrieve → download_url.
 * Voz:   POST /v1/t2a_v2 → data.audio (hex). Pendiente de verificar con clave real.
 */
const KEY = 'MINIMAX_API_KEY';
const base = () => (0, http_1.env)('MINIMAX_BASE_URL') || 'https://api.minimax.io';
exports.minimaxModels = [
    { id: 'MiniMax-Hailuo-02', provider: 'minimax', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.045 }, maxDurationSec: 10, tags: ['hailuo'], verified: false },
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
async function runVideo(request) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { input, model, ctx, prefs, capability } = request;
    const start = Date.now();
    const wanted = Math.round(Number((_b = (_a = prefs.durationSec) !== null && _a !== void 0 ? _a : input.durationSec) !== null && _b !== void 0 ? _b : 6));
    const duration = wanted > 6 ? 10 : 6;
    const body = {
        model: model.id,
        prompt: String((_d = (_c = input.prompt) !== null && _c !== void 0 ? _c : input.purpose) !== null && _d !== void 0 ? _d : ''),
        duration,
        resolution: prefs.quality === 'max' ? '1080P' : '768P',
    };
    if (capability === 'video.image_to_video' && input.imageUrl)
        body.first_frame_image = String(input.imageUrl);
    const created = await (0, http_1.fetchJson)(withGroup(`${base()}/v1/video_generation`), { provider: 'minimax', headers: headers(), body, timeoutMs: 60000 });
    const taskId = created.task_id;
    if (!taskId)
        throw new http_1.ProviderError(`minimax: ${(_f = (_e = created.base_resp) === null || _e === void 0 ? void 0 : _e.status_msg) !== null && _f !== void 0 ? _f : 'no devolvió id de tarea'}`, 'minimax');
    const fileId = await (0, http_1.pollUntil)(async () => {
        var _a, _b, _c;
        const state = await (0, http_1.fetchJson)(withGroup(`${base()}/v1/query/video_generation?task_id=${taskId}`), { provider: 'minimax', headers: headers(), timeoutMs: 30000 });
        if (state.status === 'Fail')
            return { done: true, error: String((_b = (_a = state.base_resp) === null || _a === void 0 ? void 0 : _a.status_msg) !== null && _b !== void 0 ? _b : 'la tarea falló') };
        if (state.status === 'Success')
            return { done: true, value: String((_c = state.file_id) !== null && _c !== void 0 ? _c : '') };
        return { done: false };
    }, { intervalMs: 10000, timeoutMs: request.timeoutMs, provider: 'minimax' });
    if (!fileId)
        throw new http_1.ProviderError('minimax: terminó sin archivo', 'minimax');
    const file = await (0, http_1.fetchJson)(withGroup(`${base()}/v1/files/retrieve?file_id=${fileId}`), { provider: 'minimax', headers: headers(), timeoutMs: 30000 });
    const remote = (_g = file.file) === null || _g === void 0 ? void 0 : _g.download_url;
    if (!remote)
        throw new http_1.ProviderError('minimax: sin URL de descarga', 'minimax');
    const url = await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'minimax', 'weel');
    return { output: { kind: 'video', url, durationSec: duration }, usage: { seconds: duration }, costUSD: duration * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
}
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
    name: 'MiniMax (Hailuo video · voz)',
    modalities: ['video', 'voice'],
    models: exports.minimaxModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.minimaxModels.some((m) => m.capabilities.includes(capability)),
    run: (request) => (request.capability === 'voice.tts' ? runVoice(request) : runVideo(request)),
};
//# sourceMappingURL=minimax.js.map