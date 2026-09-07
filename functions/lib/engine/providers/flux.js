"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fluxAdapter = exports.fluxModels = exports.fluxUsd = exports.BFL_CREDIT_USD = void 0;
const http_1 = require("../http");
/**
 * FLUX — Black Forest Labs, API oficial directa (api.bfl.ai, cabecera x-key).
 * Documentación: docs.bfl.ai (verificada el 2026-09-07).
 *
 * Contrato:
 *   POST /v1/{modelo}  → { id, polling_url }
 *   GET  polling_url   → { status, result: { sample } }
 * Estados: Pending · Reasoning · Generating · Ready · Error · Request Moderated · Content Moderated.
 * La URL del resultado caduca a los 10 minutos: el archivo se copia a Weë Storage.
 * Límite oficial: 24 tareas simultáneas por cuenta (6 en flux-kontext-max).
 *
 * El id del modelo es a la vez el segmento del endpoint, así que añadir un
 * modelo nuevo de BFL es añadir una línea a FLUX_MODELS.
 */
const KEY = 'BFL_API_KEY';
const base = () => (0, http_1.env)('BFL_BASE_URL') || 'https://api.bfl.ai';
/** Máximo de imágenes de referencia que acepta la familia FLUX.2 (input_image … input_image_8). */
const MAX_REFERENCES = 8;
const PRICES = {
    'flux-2-pro': { generate: 0.03, edit: 0.045 },
    'flux-2-max': { generate: 0.07, edit: 0.07 },
    'flux-2-flex': { generate: 0.05, edit: 0.05 },
    'flux-2-klein-9b': { generate: 0.015, edit: 0.015 },
    'flux-pro-1.1': { generate: 0.04, edit: 0.04 },
    'flux-pro-1.1-ultra': { generate: 0.06, edit: 0.06 },
    'flux-kontext-pro': { generate: 0.04, edit: 0.04 },
};
/**
 * Las herramientas de FLUX se cobran por megapíxel y BFL no publica una tarifa
 * fija: la respuesta trae el coste liquidado en créditos de BFL. Estos valores
 * solo sirven para ordenar candidatos hasta la primera llamada real.
 */
const TOOL_ESTIMATE_USD = 0.06;
/** 1 crédito de BFL = USD 0.01 (docs.bfl.ai/quick_start/pricing). */
exports.BFL_CREDIT_USD = 0.01;
const fluxUsd = (modelId, withReference) => {
    if (!PRICES[modelId])
        return TOOL_ESTIMATE_USD;
    const price = PRICES[modelId] || PRICES['flux-2-pro'];
    return withReference ? price.edit : price.generate;
};
exports.fluxUsd = fluxUsd;
const GENERATE = ['image.generate', 'image.reference'];
const EDIT = ['image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle'];
const ALL = [...GENERATE, ...EDIT];
/** Herramientas dedicadas: el id es el resto de la ruta bajo /v1/. */
const TOOL_MODELS = new Set(['flux-tools/vto-v2']);
exports.fluxModels = [
    // FLUX.2: la generación que BFL recomienda para proyectos nuevos
    { id: 'flux-2-pro', provider: 'flux', capabilities: [...ALL], quality: 5, speed: 4, cost: { unit: 'image', usd: 0.03 }, tags: ['flux.2', 'producto', 'hasta 8 referencias'], note: 'Genera y edita con hasta 8 imágenes de referencia.', verified: false },
    { id: 'flux-2-max', provider: 'flux', capabilities: [...ALL], quality: 5, speed: 3, cost: { unit: 'image', usd: 0.07 }, tags: ['flux.2', 'máxima calidad'], verified: false },
    { id: 'flux-2-flex', provider: 'flux', capabilities: [...ALL], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.05 }, tags: ['flux.2'], verified: false },
    { id: 'flux-2-klein-9b', provider: 'flux', capabilities: [...ALL], quality: 3, speed: 5, cost: { unit: 'image', usd: 0.015 }, tags: ['flux.2', 'económico'], verified: false },
    // Generación anterior: se mantiene para poder volver atrás sin desplegar
    { id: 'flux-pro-1.1', provider: 'flux', capabilities: [...GENERATE], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, tags: ['legado'], verified: false },
    { id: 'flux-kontext-pro', provider: 'flux', capabilities: [...EDIT], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, tags: ['legado', 'edición'], verified: false },
    // Prueba virtual de ropa: modelo dedicado, hasta 4 megapíxeles de entrada y salida
    { id: 'flux-tools/vto-v2', provider: 'flux', capabilities: ['image.try_on'], quality: 5, speed: 4, cost: { unit: 'image', usd: TOOL_ESTIMATE_USD }, tags: ['probarse ropa'], note: 'Foto de la persona + foto de la prenda. Se cobra por megapíxel: el coste real llega en la respuesta.', verified: false },
];
const isFlux2 = (modelId) => modelId.startsWith('flux-2-');
const dims = (aspect) => {
    if (aspect === '9:16')
        return { width: 768, height: 1344 };
    if (aspect === '16:9')
        return { width: 1344, height: 768 };
    if (aspect === '2:3')
        return { width: 832, height: 1248 };
    if (aspect === '3:2')
        return { width: 1248, height: 832 };
    return { width: 1024, height: 1024 };
};
/** Fotos de la persona y referencias: siempre en base64, nunca como URL privada. */
const referencesOf = (input) => {
    const list = [];
    const single = input.imageUrl;
    if (typeof single === 'string' && single)
        list.push(single);
    const refs = input.referenceImages;
    if (Array.isArray(refs))
        for (const r of refs)
            if (typeof r === 'string' && r && !list.includes(r))
                list.push(r);
    return list.slice(0, MAX_REFERENCES);
};
const asBase64 = async (url) => {
    if (url.startsWith('data:'))
        return url.slice(url.indexOf(',') + 1);
    const { buffer } = await (0, http_1.readImage)(url, 'flux');
    return buffer.toString('base64');
};
exports.fluxAdapter = {
    id: 'flux',
    name: 'FLUX (Black Forest Labs)',
    modalities: ['image'],
    models: exports.fluxModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.fluxModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e;
        const apiKey = (0, http_1.env)(KEY);
        if (!apiKey)
            throw new http_1.NotConfiguredError('flux', KEY);
        const { input, model, ctx } = request;
        const start = Date.now();
        const headers = { 'x-key': apiKey };
        const count = Math.max(1, Math.min(4, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
        const prompt = [String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : ''), String((_d = input.brief) !== null && _d !== void 0 ? _d : '')].filter(Boolean).join('\n');
        if (!prompt.trim())
            throw new http_1.ProviderError('flux: falta la descripción de la imagen', 'flux', undefined, false);
        const references = referencesOf(input);
        const body = { prompt, output_format: 'png' };
        if (references.length) {
            // FLUX.2 admite hasta 8 referencias: input_image, input_image_2 … input_image_8
            // FLUX.2 y las herramientas aceptan varias; la generación anterior, solo una
            const limit = isFlux2(model.id) || TOOL_MODELS.has(model.id) ? MAX_REFERENCES : 1;
            for (let i = 0; i < Math.min(references.length, limit); i++) {
                body[i === 0 ? 'input_image' : `input_image_${i + 1}`] = await asBase64(references[i]);
            }
        }
        else {
            Object.assign(body, dims(String((_e = input.aspectRatio) !== null && _e !== void 0 ? _e : '1:1')));
        }
        if (input.seed !== undefined)
            body.seed = Number(input.seed);
        if (TOOL_MODELS.has(model.id) && references.length < 2) {
            throw new http_1.ProviderError('flux: la prueba de ropa necesita la foto de la persona y la de la prenda', 'flux', undefined, false);
        }
        const usdPerImage = (0, exports.fluxUsd)(model.id, references.length > 0);
        // BFL liquida el coste en su respuesta cuando cobra por megapíxel
        let settledUsd = 0;
        const urls = [];
        for (let i = 0; i < count; i++) {
            const created = await (0, http_1.fetchJson)(`${base()}/v1/${model.id}`, { provider: 'flux', headers, body, timeoutMs: 60000 });
            // La documentación exige sondear la polling_url devuelta, no construirla
            const pollingUrl = created.polling_url;
            if (!pollingUrl)
                throw new http_1.ProviderError('flux: la tarea no devolvió polling_url', 'flux');
            const remote = await (0, http_1.pollUntil)(async () => {
                var _a, _b;
                const state = await (0, http_1.fetchJson)(pollingUrl, { provider: 'flux', headers, timeoutMs: 30000 });
                if (state.status === 'Ready') {
                    if (typeof state.cost === 'number')
                        settledUsd += state.cost * exports.BFL_CREDIT_USD;
                    return { done: true, value: String((_b = (_a = state.result) === null || _a === void 0 ? void 0 : _a.sample) !== null && _b !== void 0 ? _b : '') };
                }
                if (state.status === 'Error' || state.status === 'Failed' || state.status === 'Task not found')
                    return { done: true, error: `flux: ${state.status}` };
                if (state.status === 'Content Moderated' || state.status === 'Request Moderated') {
                    return { done: true, error: 'rechazo de entrada: el contenido no pasó la moderación de FLUX' };
                }
                return { done: false };
            }, { intervalMs: 2000, timeoutMs: request.timeoutMs, provider: 'flux' });
            if (!remote)
                throw new http_1.ProviderError('flux: terminó sin imagen', 'flux');
            urls.push(await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'flux', `image-${i + 1}`));
        }
        return {
            output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
            usage: { images: urls.length },
            // El coste liquidado por BFL manda sobre el precio de lista cuando existe
            costUSD: settledUsd > 0 ? settledUsd : urls.length * usdPerImage,
            latencyMs: Date.now() - start,
            model: model.id,
            meta: { references: references.length, usdPerImage, edited: references.length > 0, settledUsd: settledUsd || undefined },
        };
    },
};
//# sourceMappingURL=flux.js.map