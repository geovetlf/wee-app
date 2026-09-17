"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepseekAdapter = exports.deepseekModels = exports.tarifaVigente = exports.DEEPSEEK_TEXT_MODEL = void 0;
exports.esHoraCara = esHoraCara;
const http_1 = require("../http");
/**
 * DEEPSEEK — API OFICIAL (api.deepseek.com), clave DEEPSEEK_API_KEY.
 *
 * Se integra por el mismo camino que todos: Weë → WEË AI ENGINE → este adaptador
 * → API oficial de DeepSeek. Nunca por Replicate, fal.ai, OpenRouter, Together,
 * Hugging Face ni ningún otro intermediario (decisión del usuario, 2026-09-16).
 *
 * Está aquí por UNA razón: el coste. `deepseek-flash` cuesta la mitad que el
 * modelo de texto más barato de Google para la misma conversación, y Weë Brain
 * es la experiencia que más veces al día se usa. No entra como "mejor modelo":
 * entra como el más barato que sirve para conversar.
 *
 * ── Su contrato es el de Chat Completions ────────────────────────────────────
 *
 * DeepSeek publica una API compatible con el formato de OpenAI, así que este
 * archivo se parece mucho a `openai.ts` a propósito: mismo cuerpo, mismos
 * campos de uso, misma lectura de la respuesta. Lo que cambia es la URL, la
 * clave, las tarifas y dos cosas que Weë Brain sí necesita y el adaptador de
 * OpenAI no traía: el HISTORIAL de la conversación y las FOTOS.
 */
const KEY = 'DEEPSEEK_API_KEY';
const API = 'https://api.deepseek.com/chat/completions';
/** El identificador oficial de DeepSeek-V4.1-Flash. Se puede cambiar sin tocar código. */
exports.DEEPSEEK_TEXT_MODEL = (0, http_1.env)('DEEPSEEK_TEXT_MODEL') || 'deepseek-flash';
/**
 * TARIFAS OFICIALES (api-docs.deepseek.com/quick_start/pricing), USD por millón
 * de tokens, con la entrada contada como fallo de caché —el caso normal—.
 *
 * DeepSeek cobra distinto según la hora: hay una franja "peak" y el resto es
 * "off-peak", que vale la mitad.
 */
const TARIFA_PEAK = { input: 0.3, output: 1.2 };
const TARIFA_OFF_PEAK = { input: 0.15, output: 0.6 };
/**
 * La franja cara: lunes a viernes, 01:00–04:00 y 06:00–10:00 UTC. Todo lo demás
 * —incluido el fin de semana entero— es off-peak.
 */
function esHoraCara(ahora) {
    const dia = ahora.getUTCDay();
    if (dia === 0 || dia === 6)
        return false;
    const hora = ahora.getUTCHours();
    return (hora >= 1 && hora < 4) || (hora >= 6 && hora < 10);
}
/** La tarifa que se aplica AHORA. Sirve para medir el coste real de una llamada. */
const tarifaVigente = (ahora = new Date()) => (esHoraCara(ahora) ? TARIFA_PEAK : TARIFA_OFF_PEAK);
exports.tarifaVigente = tarifaVigente;
/**
 * EL MODELO DECLARA LA TARIFA CARA, NO LA BARATA. NO ES UN DESCUIDO.
 *
 * El precio se le enseña a la persona ANTES de enviar y después no se le puede
 * cobrar más (es la regla de `credits/aiPricing.ts`: el precio mostrado es un
 * TECHO, no un promedio). Si el modelo declarara la tarifa off-peak, un mensaje
 * escrito dentro de la franja cara costaría el doble de lo cotizado.
 *
 * Así que se cotiza siempre con la cara y, cuando la llamada cae fuera de esa
 * franja —que es la mayor parte del día—, el ahorro se lo queda Weë. El coste
 * REAL medido que se apunta en el libro sí usa la tarifa de esa hora.
 */
exports.deepseekModels = [
    {
        id: exports.DEEPSEEK_TEXT_MODEL,
        provider: 'deepseek',
        capabilities: ['text.generate', 'text.structure', 'vision.describe'],
        quality: 3,
        speed: 5,
        cost: { unit: 'mtoken', usd: TARIFA_PEAK.input, usdOutput: TARIFA_PEAK.output },
        tags: ['económico'],
        note: 'DeepSeek-V4.1-Flash: conversación con historial y fotos. Tarifa declarada en franja cara.',
        verified: false,
    },
];
/**
 * El historial, en el formato de Chat Completions.
 *
 * Weë habla en el idioma del motor —`user` y `model`— y aquí se traduce a
 * `user` y `assistant`. Se recortan los mismos 24 turnos y los mismos 6 000
 * caracteres por turno que en Gemini, para que el coste de una conversación
 * larga no dependa de por qué proveedor entró.
 */
const mensajesDelHistorial = (history) => {
    var _a, _b;
    if (!Array.isArray(history))
        return [];
    const salida = [];
    for (const turno of history.slice(-24)) {
        const role = (turno === null || turno === void 0 ? void 0 : turno.role) === 'user' ? 'user' : 'assistant';
        const content = String((_b = (_a = turno === null || turno === void 0 ? void 0 : turno.text) !== null && _a !== void 0 ? _a : turno === null || turno === void 0 ? void 0 : turno.content) !== null && _b !== void 0 ? _b : '').trim();
        if (content)
            salida.push({ role, content });
    }
    return salida;
};
/** Las fotos viajan incrustadas, no por enlace: las de Weë viven en un Storage privado. */
const partesDeImagen = async (urls) => {
    const partes = [];
    for (const url of urls) {
        const archivo = await (0, http_1.readImage)(url, 'deepseek');
        partes.push({ type: 'image_url', image_url: { url: (0, http_1.toDataUri)(archivo) } });
    }
    return partes;
};
exports.deepseekAdapter = {
    id: 'deepseek',
    name: 'DeepSeek',
    modalities: ['text'],
    models: exports.deepseekModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.deepseekModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const apiKey = (0, http_1.env)(KEY);
        if (!apiKey)
            throw new http_1.NotConfiguredError('deepseek', KEY);
        const { input, model, capability } = request;
        const start = Date.now();
        const wantJson = capability === 'text.structure';
        const system = String((_a = input.system) !== null && _a !== void 0 ? _a : 'Eres Weë. Responde en español, claro y breve.');
        const prompt = String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : '');
        const urls = [
            ...(input.imageUrl ? [String(input.imageUrl)] : []),
            ...(Array.isArray(input.imageUrls) ? input.imageUrls.map(String) : []),
        ];
        const imagenes = urls.length ? await partesDeImagen(urls) : [];
        /* Sin fotos, el mensaje es texto plano: no se le cambia la forma sin motivo. */
        const contenido = imagenes.length ? [{ type: 'text', text: prompt || 'Hola' }, ...imagenes] : prompt;
        const data = await (0, http_1.fetchJson)(API, {
            provider: 'deepseek',
            timeoutMs: request.timeoutMs,
            headers: { Authorization: `Bearer ${apiKey}` },
            body: Object.assign({ model: model.id, messages: [
                    { role: 'system', content: system },
                    ...mensajesDelHistorial(input.history),
                    { role: 'user', content: contenido },
                ], max_tokens: Number((_d = input.maxOutputTokens) !== null && _d !== void 0 ? _d : 1200), temperature: wantJson ? 0.2 : Number((_e = input.temperature) !== null && _e !== void 0 ? _e : 0.8) }, (wantJson ? { response_format: { type: 'json_object' } } : {})),
        });
        const content = String((_j = (_h = (_g = (_f = data.choices) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.content) !== null && _j !== void 0 ? _j : '').trim();
        const inputTokens = Number((_l = (_k = data.usage) === null || _k === void 0 ? void 0 : _k.prompt_tokens) !== null && _l !== void 0 ? _l : 0);
        const outputTokens = Number((_o = (_m = data.usage) === null || _m === void 0 ? void 0 : _m.completion_tokens) !== null && _o !== void 0 ? _o : 0);
        /* El coste que se apunta en el libro es el de verdad: tokens reales por la tarifa de esta hora. */
        const tarifa = (0, exports.tarifaVigente)();
        return {
            output: { kind: 'text', content },
            usage: { inputTokens, outputTokens },
            costUSD: (inputTokens * tarifa.input + outputTokens * tarifa.output) / 1000000,
            latencyMs: Date.now() - start,
            model: model.id,
        };
    },
};
//# sourceMappingURL=deepseek.js.map