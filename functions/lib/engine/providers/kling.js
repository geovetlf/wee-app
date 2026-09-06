"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.klingAdapter = exports.klingModels = void 0;
const crypto_1 = require("crypto");
const http_1 = require("../http");
/**
 * Kling (Kuaishou). Claves KLING_ACCESS_KEY + KLING_SECRET_KEY; la API pide un
 * JWT HS256 firmado con ellas. Contrato: POST /v1/videos/text2video | image2video
 * → data.task_id; GET /v1/videos/{tipo}/{task_id} hasta task_status "succeed".
 * Pendiente de verificar con claves reales.
 */
const ACCESS = 'KLING_ACCESS_KEY';
const SECRET = 'KLING_SECRET_KEY';
const base = () => (0, http_1.env)('KLING_BASE_URL') || 'https://api-singapore.klingai.com';
exports.klingModels = [
    { id: 'kling-v2-1-master', provider: 'kling', capabilities: ['video.generate', 'video.image_to_video'], quality: 5, speed: 2, cost: { unit: 'second', usd: 0.14 }, maxDurationSec: 10, verified: false },
    { id: 'kling-v2-1', provider: 'kling', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 10, verified: false },
];
const b64url = (value) => Buffer.from(value).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = () => {
    const ak = (0, http_1.env)(ACCESS);
    const sk = (0, http_1.env)(SECRET);
    if (!ak || !sk)
        throw new http_1.NotConfiguredError('kling', `${ACCESS}/${SECRET}`);
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64url(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 }));
    const signature = b64url((0, crypto_1.createHmac)('sha256', sk).update(`${header}.${payload}`).digest());
    return `${header}.${payload}.${signature}`;
};
exports.klingAdapter = {
    id: 'kling',
    name: 'Kling',
    modalities: ['video'],
    models: exports.klingModels,
    isConfigured: () => !!(0, http_1.env)(ACCESS) && !!(0, http_1.env)(SECRET),
    supports: (capability) => exports.klingModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { input, model, ctx, prefs, capability } = request;
        const start = Date.now();
        const headers = { Authorization: `Bearer ${jwt()}` };
        const wanted = Math.round(Number((_b = (_a = prefs.durationSec) !== null && _a !== void 0 ? _a : input.durationSec) !== null && _b !== void 0 ? _b : 5));
        const duration = wanted > 5 ? '10' : '5';
        const kind = capability === 'video.image_to_video' ? 'image2video' : 'text2video';
        const body = {
            model_name: model.id,
            prompt: String((_d = (_c = input.prompt) !== null && _c !== void 0 ? _c : input.purpose) !== null && _d !== void 0 ? _d : ''),
            duration,
            aspect_ratio: String((_e = input.aspectRatio) !== null && _e !== void 0 ? _e : '9:16'),
            mode: prefs.quality === 'max' ? 'pro' : 'std',
        };
        if (kind === 'image2video')
            body.image = String((_f = input.imageUrl) !== null && _f !== void 0 ? _f : '');
        const created = await (0, http_1.fetchJson)(`${base()}/v1/videos/${kind}`, { provider: 'kling', headers, body, timeoutMs: 60000 });
        const taskId = (_g = created.data) === null || _g === void 0 ? void 0 : _g.task_id;
        if (!taskId)
            throw new http_1.ProviderError(`kling: ${(_h = created.message) !== null && _h !== void 0 ? _h : 'no devolvió id de tarea'}`, 'kling');
        const remote = await (0, http_1.pollUntil)(async () => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const state = await (0, http_1.fetchJson)(`${base()}/v1/videos/${kind}/${taskId}`, { provider: 'kling', headers, timeoutMs: 30000 });
            const status = (_a = state.data) === null || _a === void 0 ? void 0 : _a.task_status;
            if (status === 'failed')
                return { done: true, error: String((_c = (_b = state.data) === null || _b === void 0 ? void 0 : _b.task_status_msg) !== null && _c !== void 0 ? _c : 'la tarea falló') };
            if (status === 'succeed')
                return { done: true, value: String((_h = (_g = (_f = (_e = (_d = state.data) === null || _d === void 0 ? void 0 : _d.task_result) === null || _e === void 0 ? void 0 : _e.videos) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.url) !== null && _h !== void 0 ? _h : '') };
            return { done: false };
        }, { intervalMs: 10000, timeoutMs: request.timeoutMs, provider: 'kling' });
        if (!remote)
            throw new http_1.ProviderError('kling: terminó sin video', 'kling');
        const url = await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'kling', 'weel');
        const seconds = Number(duration);
        return { output: { kind: 'video', url, durationSec: seconds }, usage: { seconds }, costUSD: seconds * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
    },
};
//# sourceMappingURL=kling.js.map