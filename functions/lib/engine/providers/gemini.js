"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setGeminiClient = exports.geminiAdapter = exports.MAX_INPUT_TOKENS = exports.geminiModels = exports.IMAGE_MODEL_LITE = exports.IMAGE_MODEL_PRO = exports.IMAGE_MODEL = exports.TEXT_MODEL_MULTI = void 0;
exports.resolveImageSize = resolveImageSize;
exports.imageUsd = imageUsd;
exports.thinkingFor = thinkingFor;
const http_1 = require("../http");
const aiPricing_1 = require("../../credits/aiPricing");
const resolutionPolicy_1 = require("../resolutionPolicy");
/**
 * Google Gemini (clave GEMINI_API_KEY, SDK @google/genai, método generateContent).
 * - Texto y razonamiento: modelo principal configurable (GEMINI_TEXT_MODEL), con
 *   historial de conversación (Weë Brain), instrucciones de sistema y JSON.
 * - Búsqueda con información actual: text.search = Gemini + Google Search
 *   grounding; devuelve las fuentes citadas.
 * - Visión: describe fotos (vision.describe) y las usa como contexto en texto.
 * - Imagen: generación y edición multimodal (Nano Banana 2 / Pro / legado),
 *   texto → imagen, imagen → imagen, referencias.
 *
 * Ids de modelo según ai.google.dev/gemini-api/docs/models (sept. 2026). Se
 * pueden cambiar por variables de entorno sin tocar código. Los precios de
 * lista (USD) solo alimentan providerCost y el orden del router; nunca fijan Credits.
 */
const KEY = 'GEMINI_API_KEY';
const TEXT_MODEL = (0, http_1.env)('GEMINI_TEXT_MODEL') || 'gemini-3.8-flash';
/**
 * Texto sencillo y mirar una foto: Gemini 3.1 Flash-Lite. Sustituye a
 * gemini-2.5-flash-lite, que la API devuelve como 404 "no longer available to new
 * users" aunque la página de bajas no le anuncie fecha de retirada. Es el modelo
 * 3.x más barato (0.25 / 1.50 USD por millón), es estable, acepta imagen como
 * entrada y es gratuito en el nivel gratuito.
 */
const TEXT_MODEL_LITE = (0, http_1.env)('GEMINI_TEXT_MODEL_LITE') || 'gemini-3.1-flash-lite';
/**
 * Máxima calidad: Gemini 3.8 Flash. Es el modelo Flash más inteligente de Google,
 * de generación posterior a 2.5 Pro, y su salida cuesta 3.75 en vez de 10.00 USD
 * por millón. Lo decisivo para el texto largo es que su nivel de razonamiento se
 * puede configurar: los tokens de pensamiento se facturan como salida, y 2.5 Pro
 * no permite bajarlos ni apagarlos.
 */
const TEXT_MODEL_PRO = (0, http_1.env)('GEMINI_TEXT_MODEL_PRO') || 'gemini-3.8-flash';
/**
 * Búsqueda con fuentes, PDF y audio: Gemini 3.5 Flash-Lite es el modelo 3.x más
 * barato que Google declara compatible con las tres. Ser 3.x importa: el cupo de
 * 5 000 búsquedas gratuitas al mes solo aplica a esa generación, y en la 2.5 la
 * búsqueda cuesta 35 USD por mil en vez de 14.
 */
exports.TEXT_MODEL_MULTI = (0, http_1.env)('GEMINI_TEXT_MODEL_MULTI') || 'gemini-3.5-flash-lite';
exports.IMAGE_MODEL = (0, http_1.env)('GEMINI_IMAGE_MODEL') || 'gemini-3.1-flash-image';
/** Nano Banana Pro: el modelo de identidad (Beauty, retoque, restauración, logos). */
exports.IMAGE_MODEL_PRO = (0, http_1.env)('GEMINI_IMAGE_MODEL_PRO') || 'gemini-3-pro-image';
exports.IMAGE_MODEL_LITE = (0, http_1.env)('GEMINI_IMAGE_MODEL_LITE') || 'gemini-3.1-flash-lite-image';
/** USD por millón de tokens (entrada / salida) — página oficial de precios. */
const TEXT_RATES = {
    'gemini-3.8-flash': { input: 0.75, output: 3.75 },
    'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
    'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
    'gemini-3.1-pro-preview': { input: 2, output: 12 },
};
const IMAGE_RATES = {
    'gemini-3.1-flash-image': { '512px': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
    'gemini-3.1-flash-lite-image': { '1K': 0.0336 },
    'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
};
/** Tamaños que admite cada modelo, de menor a mayor. */
const IMAGE_SIZES = {
    'gemini-3.1-flash-image': ['512px', '1K', '2K', '4K'],
    'gemini-3.1-flash-lite-image': ['1K'],
    'gemini-3-pro-image': ['1K', '2K', '4K'],
};
/** Resolución pedida (o deducida de la calidad) recortada a lo que admite el modelo. */
function resolveImageSize(modelId, quality, requested) {
    const allowed = IMAGE_SIZES[modelId] || ['1K'];
    const wanted = requested || (quality === 'max' ? '2K' : quality === 'standard' ? '512px' : '1K');
    if (allowed.includes(wanted))
        return wanted;
    const order = ['512px', '1K', '2K', '4K'];
    const target = Math.max(0, order.indexOf(wanted));
    for (let i = target; i >= 0; i--)
        if (allowed.includes(order[i]))
            return order[i];
    return allowed[0] || '1K';
}
/** USD por imagen de ese modelo en esa resolución. */
function imageUsd(modelId, size) {
    var _a, _b;
    const table = IMAGE_RATES[modelId] || IMAGE_RATES[exports.IMAGE_MODEL];
    return (_b = (_a = table === null || table === void 0 ? void 0 : table[size]) !== null && _a !== void 0 ? _a : table === null || table === void 0 ? void 0 : table['1K']) !== null && _b !== void 0 ? _b : 0.067;
}
/** Google Search grounding: $14 por 1 000 consultas tras el cupo gratuito mensual. */
const SEARCH_QUERY_USD = 0.014;
/**
 * Configuración de razonamiento. Google factura la respuesta como la suma de los
 * tokens de salida y los de razonamiento, así que aquí se acota siempre:
 *  - Gemini 3 en texto máximo → nivel BAJO (el texto largo ya es caro por su tamaño).
 *  - Gemini 3 en el resto → nivel por defecto del modelo.
 *  - Gemini 2.5 Flash y Flash-Lite → apagado del todo, que sí lo permiten.
 *  - Gemini 2.5 Pro → nada: es el único que NO permite apagarlo, y mandarle un
 *    presupuesto de cero haría fallar o ignorar la llamada.
 */
function thinkingFor(modelId, quality) {
    if (modelId.startsWith('gemini-3')) {
        return quality === 'max' ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {};
    }
    if (modelId === 'gemini-2.5-pro')
        return {};
    if (modelId.startsWith('gemini-2.5'))
        return { thinkingConfig: { thinkingBudget: 0 } };
    return {};
}
const textRate = (id, fallback) => TEXT_RATES[id] || TEXT_RATES[fallback] || TEXT_RATES['gemini-3.1-flash-lite'];
const imageRate = (id, fallback) => imageUsd(IMAGE_RATES[id] ? id : fallback, '1K');
const TEXT_CAPS = ['text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe', 'doc.read', 'audio.transcribe'];
const IMAGE_CAPS = ['image.generate', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.reference', 'image.upscale'];
const text = (id, quality, speed, fallback, capabilities, extra = {}) => {
    const rate = textRate(id, fallback);
    return Object.assign({ id, provider: 'gemini', capabilities, quality, speed, cost: { unit: 'mtoken', usd: rate.input, usdOutput: rate.output }, verified: false }, extra);
};
const image = (id, quality, speed, fallback, extra = {}) => (Object.assign({ id, provider: 'gemini', capabilities: IMAGE_CAPS, quality,
    speed, cost: { unit: 'image', usd: imageRate(id, fallback) }, verified: false }, extra));
const unique = (models) => models.filter((m, i) => models.findIndex((o) => o.id === m.id) === i);
exports.geminiModels = unique([
    text(TEXT_MODEL_PRO, 5, 4, 'gemini-3.8-flash', TEXT_CAPS, {
        tags: ['máxima calidad'],
        note: 'Texto largo con razonamiento en nivel bajo: novela, guion, historia.',
    }),
    text(TEXT_MODEL, 4, 4, 'gemini-3.8-flash', TEXT_CAPS, { note: 'Texto, visión y búsqueda con Google (Weë Brain).' }),
    text(TEXT_MODEL_LITE, 2, 5, 'gemini-3.1-flash-lite', ['text.generate', 'text.structure', 'subtitle.generate', 'vision.describe'], { tags: ['económico'] }),
    text(exports.TEXT_MODEL_MULTI, 3, 5, 'gemini-3.5-flash-lite', ['text.generate', 'text.structure', 'text.search', 'subtitle.generate', 'vision.describe', 'doc.read', 'audio.transcribe'], {
        tags: ['búsqueda', 'PDF', 'audio'],
        note: 'Búsqueda con fuentes con cupo gratuito de Gemini 3.x, lectura de PDF y transcripción.',
    }),
    image(exports.IMAGE_MODEL, 4, 4, 'gemini-3.1-flash-image', { note: 'Nano Banana 2: genera y edita con instrucciones en lenguaje natural; 512px a 4K.' }),
    image(exports.IMAGE_MODEL_PRO, 5, 3, 'gemini-3-pro-image', { tags: ['máxima calidad', 'identidad'], note: 'Nano Banana Pro: conserva mejor el rostro (retoque, restauración, looks).' }),
    image(exports.IMAGE_MODEL_LITE, 3, 5, 'gemini-3.1-flash-lite-image', { tags: ['económico'], note: 'Nano Banana 2 Lite: solo texto a imagen a 1K.' }),
]);
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
const DEFAULT_SYSTEM = 'Eres Weë. Respondes en español, claro, cálido y directo. Nunca mencionas modelos, proveedores ni términos técnicos.';
/**
 * Cualquier archivo de la persona viaja en línea (base64). Gemini entiende de
 * forma nativa imágenes, PDF (258 tokens por página) y audio (32 tokens por
 * segundo), así que no hay que convertir nada antes de enviarlo.
 * ai.google.dev/gemini-api/docs/document-processing y /docs/audio.
 */
const filePart = async (url, fallbackMime = 'image/jpeg') => {
    const file = await (0, http_1.readImage)(url, 'gemini');
    return { inlineData: { mimeType: file.contentType || fallbackMime, data: file.buffer.toString('base64') } };
};
const imagePart = (url) => filePart(url);
/**
 * Tope de tokens de entrada por petición. El precio se le enseña a la persona
 * ANTES de generar y no puede cambiar después, así que una entrada que costaría
 * más de lo mostrado se rechaza con un mensaje claro en vez de generarse a pérdida.
 * Configurable con GEMINI_MAX_INPUT_TOKENS.
 */
exports.MAX_INPUT_TOKENS = Number((0, http_1.env)('GEMINI_MAX_INPUT_TOKENS') || 120000);
const assertInputBudget = (input, images, attachments) => {
    if (!attachments && images <= 4)
        return;
    const tokens = (0, aiPricing_1.estimateInputTokens)(input);
    if (tokens <= exports.MAX_INPUT_TOKENS)
        return;
    throw new http_1.ProviderError(`rechazo de entrada: el archivo es demasiado largo para procesarlo de una vez (${Math.round(tokens / 1000)}k de ${Math.round(exports.MAX_INPUT_TOKENS / 1000)}k)`, 'gemini', undefined, false);
};
/** Documentos y audio que acompañan a la petición (uno de cada, como máximo). */
const attachmentsOf = (input) => {
    const out = [];
    if (typeof input.documentUrl === 'string' && input.documentUrl)
        out.push({ url: input.documentUrl, mime: 'application/pdf' });
    if (typeof input.audioUrl === 'string' && input.audioUrl)
        out.push({ url: input.audioUrl, mime: 'audio/mpeg' });
    return out;
};
const imageUrlsOf = (input) => {
    const urls = [];
    if (typeof input.imageUrl === 'string' && input.imageUrl)
        urls.push(input.imageUrl);
    if (Array.isArray(input.imageUrls))
        for (const u of input.imageUrls)
            if (typeof u === 'string' && u)
                urls.push(u);
    if (Array.isArray(input.referenceUrls))
        for (const u of input.referenceUrls)
            if (typeof u === 'string' && u)
                urls.push(u);
    return urls.slice(0, 4);
};
/** Instrucciones internas por tipo de edición (la persona nunca las ve). */
const EDIT_INSTRUCTIONS = {
    enhance: 'Enhance this photo: improve sharpness, exposure, colors and detail. Keep the same scene, people and composition; do not add or remove elements.',
    restore: 'Restore this old photo: repair scratches, tears, fading and stains, recover detail and natural colors, keep the people and the original composition faithful.',
    colorize: 'Colorize this black and white photo with realistic, natural colors. Keep every detail and the composition unchanged.',
    remove: 'Remove the unwanted element described and fill the background naturally so nothing looks edited. Keep everything else unchanged.',
    background: 'Replace the background as described (or use a clean white background if nothing is specified). Keep the subject, its edges, lighting and pose intact.',
    retouch: 'Do a subtle, natural facial retouch: even skin tone, reduce blemishes and shine. Keep the identity, expression and features exactly the same; nothing artificial.',
    transform: 'Transform this photo into the requested style while keeping the subject recognizable and the composition.',
    look: 'Apply the requested change of look to this person (hair, makeup, beard, outfit, accessories or nails). Keep the face, skin, identity, pose and lighting exactly the same; make it realistic and flattering.',
    space: 'Redesign this room/space as described. Keep the walls, windows, doors, proportions and perspective of the photo; change only furniture, colors, materials, decoration and lighting. Photorealistic interior render.',
    dish: 'Photorealistic food photograph of the finished dish, appetizing, natural light, restaurant plating.',
    design: 'Professional concept design render, clean composition, studio lighting, high detail.',
    cover: 'Book cover design with the title area clearly visible, professional typography space, striking composition.',
    scene: 'Cinematic scene frame, coherent lighting and style, no text.',
    'image.background_remove': 'Remove the background and place the subject on a clean white background with precise edges.',
    'image.object_remove': 'Remove the element described and fill the background naturally.',
    'image.identity_edit': 'Keep the identity and features of the person; apply only the requested change realistically.',
    'image.space_restyle': 'Keep the structure of the space (walls, windows, proportions) and change only the style, furniture and colors.',
    'image.reference': 'Create a consistent reference image to reuse in other scenes (same character, same style).',
    'image.upscale': 'Enhance this image: increase sharpness and detail without changing its content.',
};
const isTextCapability = (capability) => TEXT_CAPS.includes(capability);
const toContents = (history, userParts) => {
    var _a, _b;
    const contents = [];
    if (Array.isArray(history)) {
        for (const turn of history.slice(-24)) {
            const role = (turn === null || turn === void 0 ? void 0 : turn.role) === 'user' ? 'user' : 'model';
            const content = String((_b = (_a = turn === null || turn === void 0 ? void 0 : turn.text) !== null && _a !== void 0 ? _a : turn === null || turn === void 0 ? void 0 : turn.content) !== null && _b !== void 0 ? _b : '').trim();
            if (content)
                contents.push({ role, parts: [{ text: content.slice(0, 6000) }] });
        }
    }
    contents.push({ role: 'user', parts: userParts });
    return contents;
};
const groundingSources = (response) => {
    var _a, _b, _c, _d;
    const metadata = (_b = (_a = response === null || response === void 0 ? void 0 : response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.groundingMetadata;
    const sources = [];
    const seen = new Set();
    for (const chunk of (metadata === null || metadata === void 0 ? void 0 : metadata.groundingChunks) || []) {
        const uri = (_c = chunk === null || chunk === void 0 ? void 0 : chunk.web) === null || _c === void 0 ? void 0 : _c.uri;
        if (typeof uri !== 'string' || !uri || seen.has(uri))
            continue;
        seen.add(uri);
        sources.push({ url: uri, title: typeof ((_d = chunk === null || chunk === void 0 ? void 0 : chunk.web) === null || _d === void 0 ? void 0 : _d.title) === 'string' ? chunk.web.title : undefined });
        if (sources.length >= 8)
            break;
    }
    return { sources, queries: Array.isArray(metadata === null || metadata === void 0 ? void 0 : metadata.webSearchQueries) ? metadata.webSearchQueries.length : 0 };
};
async function runText(ai, request, start) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const { capability, input, model } = request;
    const wantJson = capability === 'text.structure' || capability === 'scene.split' || input.format === 'json';
    const search = capability === 'text.search';
    const vision = capability === 'vision.describe';
    const system = String((_a = input.system) !== null && _a !== void 0 ? _a : DEFAULT_SYSTEM);
    const prompt = String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : (vision ? 'Describe esta foto con detalle y en español: qué se ve, luz, colores, estado y todo lo que ayude a trabajar con ella.' : ''));
    const images = imageUrlsOf(input);
    const attachments = attachmentsOf(input);
    assertInputBudget(input, images.length, attachments.length);
    if (vision && images.length === 0)
        throw new http_1.ProviderError('gemini: falta la foto para describir', 'gemini', undefined, false);
    const parts = [{ text: prompt || 'Hola' }];
    for (const url of images)
        parts.push(await imagePart(url));
    for (const file of attachments)
        parts.push(await filePart(file.url, file.mime));
    const rate = textRate(model.id, TEXT_MODEL);
    const response = await ai.models.generateContent({
        model: model.id,
        contents: toContents(input.history, parts),
        config: Object.assign(Object.assign(Object.assign({ systemInstruction: system, temperature: wantJson ? 0.2 : Number((_d = input.temperature) !== null && _d !== void 0 ? _d : 0.8), maxOutputTokens: Number((_e = input.maxOutputTokens) !== null && _e !== void 0 ? _e : 1200) }, thinkingFor(model.id, String((_f = input.quality) !== null && _f !== void 0 ? _f : ''))), (wantJson ? Object.assign({ responseMimeType: 'application/json' }, (input.schema ? { responseSchema: input.schema } : {})) : {})), (search ? { tools: [{ googleSearch: {} }] } : {})),
    });
    const content = String((_g = response.text) !== null && _g !== void 0 ? _g : '').trim();
    if (!content)
        throw new http_1.ProviderError('gemini: la respuesta llegó vacía', 'gemini');
    const usage = (response.usageMetadata || {});
    const inputTokens = Number((_h = usage.promptTokenCount) !== null && _h !== void 0 ? _h : 0);
    const outputTokens = Number((_j = usage.candidatesTokenCount) !== null && _j !== void 0 ? _j : 0) + Number((_k = usage.thoughtsTokenCount) !== null && _k !== void 0 ? _k : 0);
    const { sources, queries } = search ? groundingSources(response) : { sources: [], queries: 0 };
    const costUSD = (inputTokens * rate.input + outputTokens * rate.output) / 1000000 + queries * SEARCH_QUERY_USD;
    return {
        output: Object.assign({ kind: 'text', content }, (sources.length ? { sources } : {})),
        usage: Object.assign({ inputTokens, outputTokens, totalTokens: Number((_l = usage.totalTokenCount) !== null && _l !== void 0 ? _l : inputTokens + outputTokens) }, (search ? { searchQueries: queries } : {})),
        costUSD,
        latencyMs: Date.now() - start,
        model: model.id,
    };
}
/**
 * Etiqueta de proporción de las medidas que resolvió el motor, si es una de las
 * que el proveedor entiende. Si la foto tiene una proporción rara, devuelve
 * undefined y se usa el valor por defecto de siempre: nunca se deforma nada.
 */
const aspectFromOutput = (input) => {
    const width = Number(input.outputWidth);
    const height = Number(input.outputHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
        return undefined;
    return (0, resolutionPolicy_1.nearestAspectLabel)((0, resolutionPolicy_1.aspectOf)(width, height));
};
async function runImage(ai, request, start) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { capability, input, ctx, model, prefs } = request;
    const count = Math.max(1, Math.min(4, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
    const kind = String((_b = input.kind) !== null && _b !== void 0 ? _b : '');
    const instruction = EDIT_INSTRUCTIONS[kind] || EDIT_INSTRUCTIONS[capability] || '';
    const prompt = [String((_d = (_c = input.prompt) !== null && _c !== void 0 ? _c : input.purpose) !== null && _d !== void 0 ? _d : ''), String((_e = input.brief) !== null && _e !== void 0 ? _e : ''), instruction].filter(Boolean).join('\n');
    const parts = [{ text: prompt }];
    for (const url of imageUrlsOf(input))
        parts.push(await imagePart(url));
    /*
     * La proporción sale de las medidas que ya resolvió la Resolution Policy.
     *
     * `outputWidth`/`outputHeight` llegan calculadas desde la foto real de la
     * persona —son las mismas con las que se calculó el precio— y hasta la fase
     * 2E-59 este adaptador las ignoraba y pedía 1:1. Una sala panorámica volvía
     * cuadrada, que es justo lo contrario de "conservar las proporciones". No hay
     * lógica nueva aquí: solo se lee lo que el motor ya había decidido.
     */
    const aspectRatio = String((_g = (_f = input.aspectRatio) !== null && _f !== void 0 ? _f : aspectFromOutput(input)) !== null && _g !== void 0 ? _g : (kind === 'cover' ? '2:3' : '1:1'));
    const size = resolveImageSize(model.id, prefs.quality, typeof input.resolution === 'string' ? input.resolution : undefined);
    const config = {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { aspectRatio, imageSize: size },
    };
    // El coste depende de la resolución de salida, no solo del modelo
    const rate = imageUsd(model.id, size);
    const urls = [];
    for (let i = 0; i < count; i++) {
        const response = await ai.models.generateContent({ model: model.id, contents: [{ role: 'user', parts }], config });
        const candidateParts = (_l = (_k = (_j = (_h = response.candidates) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.content) === null || _k === void 0 ? void 0 : _k.parts) !== null && _l !== void 0 ? _l : [];
        const found = candidateParts.find((p) => { var _a; return (_a = p.inlineData) === null || _a === void 0 ? void 0 : _a.data; });
        if (!found) {
            const reason = ((_o = (_m = response.candidates) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.finishReason) || ((_p = response.promptFeedback) === null || _p === void 0 ? void 0 : _p.blockReason) || 'sin imagen';
            throw new http_1.ProviderError(`gemini: la respuesta no trajo imagen (${reason})`, 'gemini', undefined, /SAFETY|PROHIBITED|BLOCK/i.test(String(reason)) ? false : true);
        }
        urls.push(await (0, http_1.persistBase64)(ctx.userId, found.inlineData.data, found.inlineData.mimeType || 'image/png', `image-${i + 1}`));
    }
    return {
        output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
        usage: { images: urls.length },
        costUSD: urls.length * rate,
        latencyMs: Date.now() - start,
        model: model.id,
        meta: { imageSize: size, usdPerImage: rate },
    };
}
exports.geminiAdapter = {
    id: 'gemini',
    name: 'Google Gemini (texto, búsqueda, visión, imagen)',
    modalities: ['text', 'vision', 'image'],
    models: exports.geminiModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.geminiModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        const start = Date.now();
        const ai = await getClient();
        return isTextCapability(request.capability) ? runText(ai, request, start) : runImage(ai, request, start);
    },
};
/** Para pruebas: permite inyectar un cliente falso. */
const __setGeminiClient = (fake) => {
    client = fake;
};
exports.__setGeminiClient = __setGeminiClient;
//# sourceMappingURL=gemini.js.map