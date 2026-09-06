"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeAdapter = exports.claudeModels = void 0;
const http_1 = require("../http");
/**
 * Anthropic Claude (clave ANTHROPIC_API_KEY). LLM para guiones, planes y
 * textos donde importa la calidad. Contrato: Messages API (anthropic-version 2023-06-01).
 * Pendiente de verificar con clave real; precios de lista solo orientativos.
 */
const KEY = 'ANTHROPIC_API_KEY';
const API = 'https://api.anthropic.com/v1/messages';
exports.claudeModels = [
    { id: 'claude-sonnet-5', provider: 'claude', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split', 'subtitle.generate'], quality: 5, speed: 3, cost: { unit: 'mtoken', usd: 3, usdOutput: 15 }, verified: false },
    { id: 'claude-haiku-4-5-20251001', provider: 'claude', capabilities: ['text.generate', 'text.structure', 'subtitle.generate'], quality: 3, speed: 5, cost: { unit: 'mtoken', usd: 1, usdOutput: 5 }, verified: false },
];
exports.claudeAdapter = {
    id: 'claude',
    name: 'Anthropic Claude',
    modalities: ['text'],
    models: exports.claudeModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.claudeModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const apiKey = (0, http_1.env)(KEY);
        if (!apiKey)
            throw new http_1.NotConfiguredError('claude', KEY);
        const { input, model, capability } = request;
        const start = Date.now();
        const wantJson = capability === 'text.structure' || capability === 'scene.split';
        const system = String((_a = input.system) !== null && _a !== void 0 ? _a : 'Eres Weë. Responde en español, claro y breve.') + (wantJson ? '\nResponde SOLO con JSON válido, sin texto alrededor.' : '');
        const prompt = String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : '');
        const data = await (0, http_1.fetchJson)(API, {
            provider: 'claude',
            timeoutMs: request.timeoutMs,
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: {
                model: model.id,
                max_tokens: Number((_d = input.maxOutputTokens) !== null && _d !== void 0 ? _d : 1200),
                temperature: wantJson ? 0.2 : 0.8,
                system,
                messages: [{ role: 'user', content: prompt }],
            },
        });
        const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
        const inputTokens = Number((_f = (_e = data.usage) === null || _e === void 0 ? void 0 : _e.input_tokens) !== null && _f !== void 0 ? _f : 0);
        const outputTokens = Number((_h = (_g = data.usage) === null || _g === void 0 ? void 0 : _g.output_tokens) !== null && _h !== void 0 ? _h : 0);
        const content = wantJson ? text.replace(/^```(?:json)?\s*|\s*```$/g, '') : text;
        return {
            output: { kind: 'text', content },
            usage: { inputTokens, outputTokens },
            costUSD: (inputTokens * model.cost.usd + outputTokens * ((_j = model.cost.usdOutput) !== null && _j !== void 0 ? _j : model.cost.usd)) / 1000000,
            latencyMs: Date.now() - start,
            model: model.id,
        };
    },
};
//# sourceMappingURL=claude.js.map