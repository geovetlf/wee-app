"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiProvider = exports.isGeminiConfigured = void 0;
/**
 * Proveedor Gemini (Google AI, clave GEMINI_API_KEY — la misma que usa el avatar).
 * Capacidades: text.generate (texto listo para usar) y text.structure (JSON).
 *
 * Coste: se calcula con los tokens que devuelve la API y las tarifas de abajo.
 * Las tarifas son por millón de tokens y deben verificarse en la página oficial
 * de precios de Gemini antes de fijar precios en Credits.
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const RATES_PER_MILLION_USD = {
    'gemini-2.5-flash': { input: 0.3, output: 2.5 },
    'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
    'gemini-2.5-pro': { input: 1.25, output: 10 },
};
const isGeminiConfigured = () => !!process.env.GEMINI_API_KEY;
exports.isGeminiConfigured = isGeminiConfigured;
const getModel = () => process.env.WEE_BRAIN_MODEL || DEFAULT_MODEL;
let client = null;
const getClient = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY no configurada');
    if (!client) {
        const { GoogleGenAI } = await Promise.resolve().then(() => require('@google/genai'));
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};
exports.geminiProvider = {
    id: 'gemini',
    supports: (capability) => capability === 'text.generate' || capability === 'text.structure',
    async run(capability, input, _ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const start = Date.now();
        const ai = await getClient();
        const model = getModel();
        const wantJson = capability === 'text.structure';
        const system = String((_a = input.system) !== null && _a !== void 0 ? _a : 'Eres Weë. Responde en español, claro y breve.');
        const prompt = String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : '');
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: Object.assign({ systemInstruction: system, temperature: wantJson ? 0.2 : 0.8, maxOutputTokens: Number((_d = input.maxOutputTokens) !== null && _d !== void 0 ? _d : 1200), 
                // Sin "pensamiento" extendido: texto directo y barato
                thinkingConfig: { thinkingBudget: 0 } }, (wantJson
                ? Object.assign({ responseMimeType: 'application/json' }, (input.schema ? { responseSchema: input.schema } : {})) : {})),
        });
        const text = String((_e = response.text) !== null && _e !== void 0 ? _e : '').trim();
        if (!text)
            throw new Error('Gemini devolvió una respuesta vacía');
        const usage = (response.usageMetadata || {});
        const inputTokens = Number((_f = usage.promptTokenCount) !== null && _f !== void 0 ? _f : 0);
        const outputTokens = Number((_g = usage.candidatesTokenCount) !== null && _g !== void 0 ? _g : 0) + Number((_h = usage.thoughtsTokenCount) !== null && _h !== void 0 ? _h : 0);
        const rate = RATES_PER_MILLION_USD[model] || RATES_PER_MILLION_USD[DEFAULT_MODEL];
        const costUSD = (inputTokens * rate.input + outputTokens * rate.output) / 1000000;
        return {
            output: { kind: 'text', content: text },
            usage: { inputTokens, outputTokens, totalTokens: Number((_j = usage.totalTokenCount) !== null && _j !== void 0 ? _j : inputTokens + outputTokens) },
            costUSD,
            latencyMs: Date.now() - start,
        };
    },
};
//# sourceMappingURL=gemini.js.map