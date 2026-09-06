"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiAdapter = exports.geminiModels = void 0;
const gemini_1 = require("../../gateway/providers/gemini");
const http_1 = require("../http");
/**
 * Google Gemini (clave GEMINI_API_KEY).
 * - LLM: gemini-2.5-flash / pro / flash-lite (texto y JSON) — reutiliza el adaptador de la fase 1.
 * - Visión: describe fotos (vision.describe).
 * - Imagen "Nano Banana": gemini-2.5-flash-image genera y edita imágenes.
 *
 * Precios de lista (USD) solo como referencia para el router; verificar en la
 * página oficial antes de fijar Credits reales.
 */
const KEY = 'GEMINI_API_KEY';
exports.geminiModels = [
    { id: 'gemini-2.5-flash', provider: 'gemini', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split', 'subtitle.generate'], quality: 3, speed: 5, cost: { unit: 'mtoken', usd: 0.3, usdOutput: 2.5 }, verified: false },
    { id: 'gemini-2.5-pro', provider: 'gemini', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split'], quality: 5, speed: 3, cost: { unit: 'mtoken', usd: 1.25, usdOutput: 10 }, verified: false },
    { id: 'gemini-2.5-flash-lite', provider: 'gemini', capabilities: ['text.generate', 'text.structure', 'subtitle.generate'], quality: 2, speed: 5, cost: { unit: 'mtoken', usd: 0.1, usdOutput: 0.4 }, verified: false },
    { id: 'gemini-2.5-flash-vision', provider: 'gemini', capabilities: ['vision.describe'], quality: 4, speed: 5, cost: { unit: 'call', usd: 0.002 }, verified: false, note: 'Usa gemini-2.5-flash con la foto como entrada.' },
    { id: 'gemini-2.5-flash-image', provider: 'gemini', capabilities: ['image.generate', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.039 }, verified: false, note: '"Nano Banana": genera y edita con instrucciones en lenguaje natural.' },
];
let client = null;
const getClient = async () => {
    const apiKey = (0, http_1.env)(KEY);
    if (!apiKey)
        throw new http_1.NotConfiguredError('gemini', KEY);
    if (!client) {
        const { GoogleGenAI } = await Promise.resolve().then(() => require('@google/genai'));
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};
const imagePart = async (url) => {
    if (url.startsWith('data:')) {
        const [meta, data] = url.split(',');
        return { inlineData: { mimeType: meta.slice(5).split(';')[0] || 'image/png', data } };
    }
    const { buffer, contentType } = await (0, http_1.fetchBytes)(url, { provider: 'gemini' });
    return { inlineData: { mimeType: contentType.split(';')[0] || 'image/jpeg', data: buffer.toString('base64') } };
};
const EDIT_INSTRUCTIONS = {
    'image.background_remove': 'Quita el fondo y deja el sujeto sobre fondo blanco limpio, con bordes precisos.',
    'image.object_remove': 'Elimina el elemento indicado y rellena el fondo de forma natural.',
    'image.identity_edit': 'Mantén la identidad y los rasgos de la persona; aplica solo el cambio pedido de forma realista.',
    'image.space_restyle': 'Conserva la estructura del espacio (paredes, ventanas, proporciones) y cambia solo el estilo, muebles y colores.',
    'image.reference': 'Crea una imagen de referencia coherente para reutilizar en otras escenas (mismo personaje, mismo estilo).',
};
exports.geminiAdapter = {
    id: 'gemini',
    name: 'Google Gemini (texto, visión, Nano Banana)',
    modalities: ['text', 'vision', 'image'],
    models: exports.geminiModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.geminiModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        const { capability, input, ctx, model } = request;
        const start = Date.now();
        // Texto y JSON: adaptador de la fase 1 (prompts internos de Weë Brain)
        if (capability === 'text.generate' || capability === 'text.structure' || capability === 'script.write' || capability === 'scene.split' || capability === 'subtitle.generate') {
            const mapped = capability === 'text.structure' || capability === 'scene.split' ? 'text.structure' : 'text.generate';
            const previousModel = process.env.WEE_BRAIN_MODEL;
            process.env.WEE_BRAIN_MODEL = model.id.replace('-vision', '');
            try {
                const result = await gemini_1.geminiProvider.run(mapped, input, { userId: ctx.userId, jobId: ctx.jobId || '', experienceId: ctx.experienceId || 'brain', goal: ctx.goal || '' });
                return Object.assign(Object.assign({}, result), { model: model.id });
            }
            finally {
                if (previousModel === undefined)
                    delete process.env.WEE_BRAIN_MODEL;
                else
                    process.env.WEE_BRAIN_MODEL = previousModel;
            }
        }
        const ai = await getClient();
        if (capability === 'vision.describe') {
            const imageUrl = String((_b = (_a = input.imageUrl) !== null && _a !== void 0 ? _a : input.url) !== null && _b !== void 0 ? _b : '');
            if (!imageUrl)
                throw new http_1.ProviderError('gemini: falta la foto para describir', 'gemini', undefined, false);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: String((_d = (_c = input.prompt) !== null && _c !== void 0 ? _c : input.purpose) !== null && _d !== void 0 ? _d : 'Describe esta foto con detalle, en español.') }, await imagePart(imageUrl)] }],
                config: { temperature: 0.3, maxOutputTokens: 600 },
            });
            const usage = response.usageMetadata || {};
            const inputTokens = Number((_e = usage.promptTokenCount) !== null && _e !== void 0 ? _e : 0);
            const outputTokens = Number((_f = usage.candidatesTokenCount) !== null && _f !== void 0 ? _f : 0);
            return {
                output: { kind: 'text', content: String((_g = response.text) !== null && _g !== void 0 ? _g : '') },
                usage: { inputTokens, outputTokens },
                costUSD: (inputTokens * 0.3 + outputTokens * 2.5) / 1000000,
                latencyMs: Date.now() - start,
                model: model.id,
            };
        }
        // Imagen (Nano Banana): generar o editar
        const count = Math.max(1, Math.min(4, Number((_h = input.count) !== null && _h !== void 0 ? _h : 1)));
        const prompt = [String((_k = (_j = input.prompt) !== null && _j !== void 0 ? _j : input.purpose) !== null && _k !== void 0 ? _k : ''), (_l = EDIT_INSTRUCTIONS[capability]) !== null && _l !== void 0 ? _l : '', String((_m = input.brief) !== null && _m !== void 0 ? _m : '')].filter(Boolean).join('\n');
        const parts = [{ text: prompt }];
        const sourceUrl = String((_o = input.imageUrl) !== null && _o !== void 0 ? _o : '');
        if (sourceUrl)
            parts.push(await imagePart(sourceUrl));
        const urls = [];
        for (let i = 0; i < count; i++) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ role: 'user', parts }],
                config: Object.assign({ responseModalities: ['IMAGE'] }, (input.aspectRatio ? { imageConfig: { aspectRatio: String(input.aspectRatio) } } : {})),
            });
            const candidateParts = (_s = (_r = (_q = (_p = response.candidates) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.content) === null || _r === void 0 ? void 0 : _r.parts) !== null && _s !== void 0 ? _s : [];
            const image = candidateParts.find((p) => { var _a; return (_a = p.inlineData) === null || _a === void 0 ? void 0 : _a.data; });
            if (!image)
                throw new http_1.ProviderError('gemini: la respuesta no trajo imagen', 'gemini');
            urls.push(await (0, http_1.persistBase64)(ctx.userId, image.inlineData.data, image.inlineData.mimeType || 'image/png', `image-${i + 1}`));
        }
        return {
            output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
            usage: { images: urls.length },
            costUSD: urls.length * model.cost.usd,
            latencyMs: Date.now() - start,
            model: model.id,
        };
    },
};
//# sourceMappingURL=gemini.js.map