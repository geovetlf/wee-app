"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiAdapter = exports.openaiModels = void 0;
const http_1 = require("../http");
/**
 * OpenAI (clave OPENAI_API_KEY). LLM alternativo para texto y JSON.
 * Contrato: Chat Completions. Los nombres de modelo se pueden sobreescribir
 * desde aiProviders/openai.models o con OPENAI_MODEL. Pendiente de verificar.
 */
const KEY = 'OPENAI_API_KEY';
const API = 'https://api.openai.com/v1/chat/completions';
exports.openaiModels = [
    // Precios de lista oficiales (developers.openai.com/api/docs/pricing, sept. 2026), USD por millón de tokens.
    // gpt-5 y gpt-5-mini siguen disponibles, pero OpenAI los marca como generación anterior.
    { id: (0, http_1.env)('OPENAI_MODEL') || 'gpt-5.6-terra', provider: 'openai', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split', 'subtitle.generate'], quality: 5, speed: 3, cost: { unit: 'mtoken', usd: 2, usdOutput: 12 }, verified: false },
    { id: (0, http_1.env)('OPENAI_MODEL_MINI') || 'gpt-5.6-luna', provider: 'openai', capabilities: ['text.generate', 'text.structure', 'subtitle.generate'], quality: 3, speed: 5, cost: { unit: 'mtoken', usd: 0.2, usdOutput: 1.2 }, tags: ['económico'], verified: false },
];
exports.openaiAdapter = {
    id: 'openai',
    name: 'OpenAI',
    modalities: ['text'],
    models: exports.openaiModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.openaiModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const apiKey = (0, http_1.env)(KEY);
        if (!apiKey)
            throw new http_1.NotConfiguredError('openai', KEY);
        const { input, model, capability } = request;
        const start = Date.now();
        const wantJson = capability === 'text.structure' || capability === 'scene.split';
        const system = String((_a = input.system) !== null && _a !== void 0 ? _a : 'Eres Weë. Responde en español, claro y breve.');
        const prompt = String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : '');
        const data = await (0, http_1.fetchJson)(API, {
            provider: 'openai',
            timeoutMs: request.timeoutMs,
            headers: { Authorization: `Bearer ${apiKey}` },
            body: Object.assign({ model: model.id, messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt },
                ], max_completion_tokens: Number((_d = input.maxOutputTokens) !== null && _d !== void 0 ? _d : 1200) }, (wantJson ? { response_format: { type: 'json_object' } } : {})),
        });
        const content = String((_h = (_g = (_f = (_e = data.choices) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content) !== null && _h !== void 0 ? _h : '').trim();
        const inputTokens = Number((_k = (_j = data.usage) === null || _j === void 0 ? void 0 : _j.prompt_tokens) !== null && _k !== void 0 ? _k : 0);
        const outputTokens = Number((_m = (_l = data.usage) === null || _l === void 0 ? void 0 : _l.completion_tokens) !== null && _m !== void 0 ? _m : 0);
        return {
            output: { kind: 'text', content },
            usage: { inputTokens, outputTokens },
            costUSD: (inputTokens * model.cost.usd + outputTokens * ((_o = model.cost.usdOutput) !== null && _o !== void 0 ? _o : model.cost.usd)) / 1000000,
            latencyMs: Date.now() - start,
            model: model.id,
        };
    },
};
//# sourceMappingURL=openai.js.map