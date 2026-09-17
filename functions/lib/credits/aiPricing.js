"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsProImage = exports.PRO_IMAGE_KINDS = exports.billableOutput = exports.MULTIMODAL_THINKING_FACTOR = exports.THINKING_FACTOR = exports.DEFAULT_MAX_OUTPUT_TOKENS = exports.ASSUMED = exports.TOKENS = exports.SEARCH_USD_PER_QUERY = exports.VOICE_USD_PER_KCHAR = exports.MULTIMODAL_RATE = exports.TEXT_RATES = void 0;
exports.usdToCredits = usdToCredits;
exports.estimateInputTokens = estimateInputTokens;
exports.estimateProviderUsd = estimateProviderUsd;
exports.priceOperation = priceOperation;
exports.videoServiceFor = videoServiceFor;
exports.priceVideo = priceVideo;
exports.imageServiceFor = imageServiceFor;
exports.priceImage = priceImage;
const imageModels_1 = require("../engine/imageModels");
const resolutionPolicy_1 = require("../engine/resolutionPolicy");
const seedance_1 = require("../engine/providers/seedance");
const creditCosts_1 = require("./creditCosts");
/** USD → Credits, con el margen del motor. Redondea siempre hacia arriba. */
function usdToCredits(usd, settings) {
    if (usd <= 0)
        return 0;
    return Math.max(1, Math.ceil(usd * settings.creditsPerUsd * (1 + settings.margin)));
}
/**
 * Credits de una operación.
 *  - Modo real: coste oficial × Credits por dólar × (1 + margen).
 *  - Modo prueba: el precio del catálogo (configurable en creditCosts/{servicio}).
 *
 * En los dos casos se aplica un suelo: **nunca se cobra menos de lo que cuesta la
 * API**. Un precio fijo por tramo no puede cubrir todas las duraciones (una historia
 * de 20 s cuesta el triple que un clip de 5 s), así que el coste sin margen manda
 * cuando el catálogo se queda corto. Para vender más barato se baja el margen o
 * los Credits por dólar en aiSettings/global, no el suelo.
 */
const creditsOf = (service, usd, settings) => {
    /*
     * El margen y el modo se preguntan POR SERVICIO, y la respuesta por defecto es
     * la general. Quien no declara nada —imagen, video, voz, búsqueda— recibe
     * exactamente lo mismo que antes de que esto existiera.
     *
     * La fórmula sigue siendo una sola: `usdToCredits`. Lo único que cambia es qué
     * margen se le pasa. No hay un segundo cálculo de precios en Weë.
     */
    const margin = (0, creditCosts_1.getCreditMargin)(service, settings.margin);
    const withMargin = usdToCredits(usd, { creditsPerUsd: settings.creditsPerUsd, margin });
    if ((0, creditCosts_1.getCreditPricingMode)(service, settings.pricingMode) === 'real')
        return withMargin;
    const atCost = usd > 0 ? Math.ceil(usd * settings.creditsPerUsd) : 0;
    return Math.max((0, creditCosts_1.getCreditCost)(service), atCost);
};
// ──────── COSTE DE PROVEEDOR DE CUALQUIER OPERACIÓN (texto, voz, búsqueda, audio) ────────
/**
 * Tarifas oficiales del modelo MÁS CARO que puede atender cada nivel. Se usa el
 * más caro a propósito: el precio que ve la persona tiene que ser un techo, no
 * un promedio, porque después de confirmar no se le puede cobrar más.
 *
 * Texto (USD por millón de tokens, entrada / salida):
 *   standard → Gemini 3.1 Flash-Lite   0.25 / 1.50  (sustituye a Gemini 2.5 Flash-Lite,
 *                                                    0.10 / 0.40, retirado para claves nuevas)
 *   high     → Gemini 3.8 Flash        0.75 / 3.75
 *   max      → Gemini 3.8 Flash        0.75 / 3.75
 *
 * El nivel máximo lo sirve Gemini 3.8 Flash con razonamiento bajo, así que su
 * tarifa coincide con la del nivel alto y lo que separa a los dos niveles es el
 * tamaño de la respuesta, no el precio por token. AVISO PARA LA FASE 4: cuando se
 * integre Claude hay que revisar este techo, porque Claude Sonnet 5 cuesta
 * 2.00 / 10.00 y encarecería el nivel máximo.
 */
exports.TEXT_RATES = {
    standard: { input: 0.25, output: 1.5 },
    high: { input: 0.75, output: 3.75 },
    max: { input: 0.75, output: 3.75 },
};
/**
 * Gemini 3.5 Flash-Lite: el modelo 3.x más barato que Google declara compatible
 * con búsqueda con fuentes, PDF y audio a la vez. Sirve esas tres funciones, y
 * cuesta más que el modelo económico de texto, así que el suelo tiene que usar
 * SU tarifa y no la del nivel. El audio tiene precio propio, más caro que el texto.
 * USD por millón de tokens (ai.google.dev/gemini-api/docs/pricing).
 */
exports.MULTIMODAL_RATE = { input: 0.3, output: 2.5, audioInput: 0.3 };
/** Tarifa que cubre a las dos: el suelo nunca puede quedar por debajo de ninguna. */
const ceilingOf = (a, b) => ({
    input: Math.max(a.input, b.input),
    output: Math.max(a.output, b.output),
});
/** USD por 1 000 caracteres de voz: ElevenLabs v3 y Multilingual v2, los más caros de la cadena. */
exports.VOICE_USD_PER_KCHAR = 0.1;
/** USD por consulta de búsqueda con fuentes, pasado el cupo mensual gratuito de Google. */
exports.SEARCH_USD_PER_QUERY = 0.014;
/** Tokens que consume cada entrada, según la documentación oficial de Gemini. */
exports.TOKENS = { perImage: 1300, perDocumentPage: 258, perAudioSecond: 32 };
/** Cuando no se conoce el tamaño del adjunto se asume este, y el motor rechaza lo que lo supere. */
exports.ASSUMED = { documentPages: 60, audioSeconds: 600 };
/** Salida máxima por defecto de los adaptadores de texto: el techo del coste de salida. */
exports.DEFAULT_MAX_OUTPUT_TOKENS = 1200;
const chars = (value) => (typeof value === 'string' ? value.length : 0);
/**
 * Tokens de entrada de una petición de texto, contando TODO lo que se envía:
 * prompt, instrucciones, historial de la conversación, fotos, documentos y audio.
 * Ignorar el historial y los adjuntos era la causa de que el precio mostrado
 * pudiera quedarse por debajo del coste real.
 */
function estimateInputTokens(input) {
    var _a, _b;
    let text = chars(input.prompt) + chars(input.purpose) + chars(input.system) + chars(input.brief) + chars(input.text) + chars(input.content);
    if (Array.isArray(input.history)) {
        for (const turn of input.history)
            text += chars(turn === null || turn === void 0 ? void 0 : turn.text);
    }
    if (Array.isArray(input.previous)) {
        for (const p of input.previous)
            text += chars(p);
    }
    let tokens = Math.max(400, Math.round(text / 4) + 300);
    const images = (input.imageUrl ? 1 : 0) + (Array.isArray(input.imageUrls) ? input.imageUrls.length : 0) + (Array.isArray(input.referenceImages) ? input.referenceImages.length : 0);
    tokens += images * exports.TOKENS.perImage;
    if (input.documentUrl)
        tokens += Number((_a = input.documentPages) !== null && _a !== void 0 ? _a : exports.ASSUMED.documentPages) * exports.TOKENS.perDocumentPage;
    if (input.audioUrl)
        tokens += Number((_b = input.audioSeconds) !== null && _b !== void 0 ? _b : exports.ASSUMED.audioSeconds) * exports.TOKENS.perAudioSecond;
    return tokens;
}
const tierOf = (input) => {
    var _a;
    const q = String((_a = input.quality) !== null && _a !== void 0 ? _a : '');
    return q === 'max' ? 'max' : q === 'high' ? 'high' : 'standard';
};
/**
 * Tokens de razonamiento por cada token de respuesta. Google cobra la respuesta
 * como la suma de los tokens de salida y los de razonamiento, así que la
 * estimación tiene que contarlos o el suelo queda por debajo del coste real.
 *  - standard: Gemini 3.1 Flash-Lite es de la generación 3 y razona por defecto → 1 a 1.
 *    (con Gemini 2.5 Flash-Lite era 0, porque aquel traía el razonamiento apagado).
 *  - high: Gemini 3.8 Flash con su nivel por defecto (medio) → se asume 1 a 1.
 *  - max: Gemini 3.8 Flash con el nivel fijado en bajo → se asume la mitad.
 * Es una proporción SUPUESTA, no medida. Se corrige con la primera generación real.
 */
exports.THINKING_FACTOR = { standard: 1, high: 1, max: 0.5 };
/** Razonamiento del modelo que sirve búsqueda, PDF y audio (Gemini 3.5 Flash-Lite). */
exports.MULTIMODAL_THINKING_FACTOR = 1;
/** Salida facturable: la respuesta más los tokens de razonamiento que se cobran con ella. */
const billableOutput = (outputTokens, factor) => Math.round(outputTokens * (1 + factor));
exports.billableOutput = billableOutput;
function estimateProviderUsd(capability, input = {}, modelo) {
    var _a, _b;
    const tier = tierOf(input);
    if (capability === 'voice.tts') {
        const text = Math.max(chars(input.text) || chars(input.prompt) || chars(input.content), 200);
        return (text / 1000) * exports.VOICE_USD_PER_KCHAR;
    }
    if (capability === 'audio.transcribe') {
        const seconds = Number((_a = input.audioSeconds) !== null && _a !== void 0 ? _a : exports.ASSUMED.audioSeconds);
        // El audio se factura con su propia tarifa, no con la de texto del mismo modelo.
        const rate = ceilingOf(exports.TEXT_RATES[tier], exports.MULTIMODAL_RATE);
        const audioIn = Math.max(exports.MULTIMODAL_RATE.audioInput, exports.TEXT_RATES[tier].input);
        const salida = (0, exports.billableOutput)(exports.DEFAULT_MAX_OUTPUT_TOKENS, Math.max(exports.THINKING_FACTOR[tier], exports.MULTIMODAL_THINKING_FACTOR));
        return (seconds * exports.TOKENS.perAudioSecond * audioIn + salida * rate.output) / 1000000;
    }
    // Búsqueda con fuentes y PDF los sirve Gemini 3.5 Flash-Lite, más caro que el
    // modelo económico: el techo tiene que ser el suyo y no el del nivel pedido.
    const multimodal = capability === 'text.search' || capability === 'doc.read';
    /*
     * SI YA SE SABE QUÉ MODELO VA A RESPONDER, MANDA SU TARIFA.
     *
     * `TEXT_RATES` es un techo por NIVEL, no por modelo: el del modelo más caro
     * que puede atender ese nivel. Sirve para cotizar cuando todavía no se sabe
     * quién atenderá —y por eso se queda—, pero es incorrecto cuando el modelo ya
     * está decidido: Weë Brain pide `deepseek-flash` por su nombre, y cotizarlo
     * con tarifas de Google sería cobrar por un proveedor que no interviene.
     *
     * Es el mismo trato que ya tienen imagen y video, que preguntan al modelo
     * elegido (`usdFor(model, …)`, `seedanceCostUsd(specOf(id))`). El texto era la
     * única modalidad que seguía mirando una tabla en vez de al modelo.
     */
    const rate = modelo
        ? { input: modelo.input, output: modelo.output }
        : multimodal ? ceilingOf(exports.TEXT_RATES[tier], exports.MULTIMODAL_RATE) : exports.TEXT_RATES[tier];
    const factor = multimodal ? Math.max(exports.THINKING_FACTOR[tier], exports.MULTIMODAL_THINKING_FACTOR) : exports.THINKING_FACTOR[tier];
    const inputTokens = estimateInputTokens(input);
    // La salida facturable incluye los tokens de razonamiento, que Google cobra con ella
    const outputTokens = (0, exports.billableOutput)(Number((_b = input.maxOutputTokens) !== null && _b !== void 0 ? _b : exports.DEFAULT_MAX_OUTPUT_TOKENS), factor);
    const usd = (inputTokens * rate.input + outputTokens * rate.output) / 1000000;
    return capability === 'text.search' ? usd + exports.SEARCH_USD_PER_QUERY : usd;
}
/**
 * Precio de cualquier operación con coste de proveedor que no sea imagen ni video.
 * Aplica el mismo suelo: nunca por debajo del coste oficial estimado.
 */
function priceOperation(capability, input, service, settings, modelo) {
    var _a, _b, _c;
    const usd = estimateProviderUsd(capability, input, modelo);
    return {
        service,
        credits: creditsOf(service, usd, settings),
        usd,
        /* Quien sepa qué modelo va a responder lo dice; quien no, sigue diciendo "la cadena". */
        provider: (_a = modelo === null || modelo === void 0 ? void 0 : modelo.provider) !== null && _a !== void 0 ? _a : 'router',
        model: (_b = modelo === null || modelo === void 0 ? void 0 : modelo.modelId) !== null && _b !== void 0 ? _b : 'según la cadena',
        detail: Object.assign({ tier: tierOf(input), estimatedInputTokens: estimateInputTokens(input), maxOutputTokens: Number((_c = input.maxOutputTokens) !== null && _c !== void 0 ? _c : exports.DEFAULT_MAX_OUTPUT_TOKENS) }, (modelo ? { rateInput: modelo.input, rateOutput: modelo.output } : null)),
    };
}
/**
 * Tramo de precio del video. Sigue a la familia Seedance: cada modelo tiene su
 * tarifa oficial, así que cada uno tiene su propio servicio de Credits.
 */
function videoServiceFor(modelId, resolution) {
    if (modelId === seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_5)
        return resolution === '1080p' ? 'ai_video_max' : 'ai_video_advanced';
    if (modelId === seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0)
        return resolution === '1080p' || resolution === '4k' ? 'ai_video_max' : 'ai_video_hd';
    return resolution === '480p' ? 'ai_video_draft' : 'ai_video';
}
/** Coste oficial y Credits de una generación de video, antes de llamar al proveedor. */
function priceVideo(input, settings) {
    var _a, _b;
    const modelId = seedance_1.SEEDANCE_MODEL_IDS[input.modelId] || input.modelId;
    const spec = (0, seedance_1.specOf)(modelId);
    const resolution = (0, seedance_1.resolveResolution)(modelId, input.resolution, input.quality);
    const durationSec = (0, seedance_1.clampDuration)(modelId, (_a = input.durationSec) !== null && _a !== void 0 ? _a : 5);
    const { usd, tokens, ratePerMillion } = (0, seedance_1.seedanceCostUsd)({
        modelId,
        resolution,
        durationSec,
        ratio: input.aspectRatio,
        inputVideoSec: input.inputVideoSec,
    });
    const service = videoServiceFor(modelId, resolution);
    return {
        service,
        credits: creditsOf(service, usd, settings),
        usd,
        provider: 'seedance',
        model: modelId,
        detail: { family: spec.key, resolution, durationSec, estimatedTokens: tokens, usdPerMillionTokens: ratePerMillion, inputVideoSec: (_b = input.inputVideoSec) !== null && _b !== void 0 ? _b : 0 },
    };
}
// ──────────────────────────── IMAGEN (Gemini y compañía) ────────────────────────────
/** Operaciones que necesitan el modelo de máxima precisión: conservar la identidad. */
exports.PRO_IMAGE_KINDS = new Set(['restore', 'retouch', 'look', 'identity']);
const needsProImage = (capability, input = {}) => {
    var _a, _b;
    return capability === 'image.identity_edit' ||
        exports.PRO_IMAGE_KINDS.has(String((_a = input.kind) !== null && _a !== void 0 ? _a : '')) ||
        String((_b = input.quality) !== null && _b !== void 0 ? _b : '') === 'max';
};
exports.needsProImage = needsProImage;
/** Servicio de Credits de una operación de imagen, según el nivel del modelo elegido. */
function imageServiceFor(capability, input = {}, tier) {
    // Probarse ropa tiene su propio precio: BFL cobra por megapíxel y devuelve el coste real
    if (capability === 'image.try_on')
        return 'ai_tryon';
    const level = tier || ((0, exports.needsProImage)(capability, input) ? 'max' : undefined);
    if (level === 'max')
        return 'ai_image_pro';
    if (level === 'standard')
        return (0, imageModels_1.isEditCapability)(capability) ? 'ai_image_enhance_lite' : 'ai_image_lite';
    return (0, imageModels_1.isEditCapability)(capability) ? 'ai_image_enhance' : 'ai_image';
}
/**
 * Coste oficial y Credits de una operación de imagen.
 *
 * Elige el modelo más barato capaz de hacer la tarea (engine/imageModels.ts),
 * salvo que se pase uno concreto porque la persona eligió una opción superior.
 * El precio depende siempre de tres cosas: modelo, resolución y cantidad.
 */
function priceImage(input, settings) {
    var _a, _b, _c;
    const count = Math.max(1, Math.min(8, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
    const need = { capability: input.capability, kind: input.kind, quality: input.quality, resolution: input.resolution, references: input.references, resolutionFromEngine: input.resolutionFromEngine };
    const chosen = input.modelId && (0, imageModels_1.imageModelOf)(input.modelId)
        ? { model: (0, imageModels_1.imageModelOf)(input.modelId), size: input.resolution || '1K', tier: (0, imageModels_1.imageModelOf)(input.modelId).tier, reason: 'lo eligió la persona' }
        : (0, imageModels_1.chooseImageModel)(need, input.available);
    const edit = (0, imageModels_1.isEditCapability)(input.capability);
    /*
     * LAS DIMENSIONES LAS DECIDE LA WEË RESOLUTION POLICY, y aquí solo se
     * consumen. Es la única forma de que el precio y lo que se acabe enviando al
     * proveedor no puedan discrepar: antes el precio razonaba con una etiqueta
     * ("1K") y cada adaptador decidía por su cuenta los píxeles de esa etiqueta.
     *
     * En una edición la proporción sale de la foto; al crear desde cero, de lo que
     * pida la operación. Si el modelo no tiene rejilla declarada todavía, se sigue
     * sin dimensiones y `usdFor` usa su nominal de siempre: nadie se rompe.
     */
    const plan = (0, resolutionPolicy_1.resolveForModel)(chosen.model.modelId, {
        quality: chosen.tier,
        input: edit ? (_b = input.referenceSizes) === null || _b === void 0 ? void 0 : _b[0] : undefined,
        aspect: input.aspectRatio,
    });
    /*
     * Cuando se conocen las dimensiones de las imágenes de entrada se pasan tal
     * cual y el precio es exacto. Si no llegan, se usa la cota inferior de 1 MP por
     * referencia, que es el mínimo que factura el proveedor. Una edición cuenta
     * siempre al menos una entrada: la foto que se está editando.
     */
    const usdPerImage = (0, imageModels_1.usdFor)(chosen.model, chosen.size, edit, {
        output: plan ? { width: plan.width, height: plan.height } : undefined,
        references: Math.max((_c = input.references) !== null && _c !== void 0 ? _c : 0, edit ? 1 : 0),
        referenceSizes: input.referenceSizes,
    });
    const discount = (0, imageModels_1.volumeFactor)(count);
    /*
     * COSTE PROTEGIDO → SUELO → PRECIO BASE → DESCUENTO COMERCIAL → PRECIO FINAL
     *
     * El coste protegido es lo que cobra el proveedor por las imágenes, SIN el
     * descuento comercial de Weë: el proveedor no nos hace descuento por volumen,
     * así que restarlo del coste hundía el suelo por debajo del gasto real. Este es
     * además el coste que se guarda en el libro de generaciones.
     */
    const usd = count * usdPerImage;
    const floor = Math.ceil(usd * settings.creditsPerUsd);
    const service = imageServiceFor(input.capability, { kind: input.kind, quality: input.quality }, chosen.tier);
    // El descuento solo puede rebajar el precio mientras quede margen sobre el suelo
    const base = creditsOf(service, usd, settings);
    const credits = Math.max(floor, Math.round(base * discount));
    return {
        service,
        credits,
        usd,
        provider: chosen.model.provider,
        model: chosen.model.modelId,
        detail: Object.assign(Object.assign({ tier: chosen.tier, label: chosen.model.label, imageSize: chosen.size, count,
            usdPerImage }, (plan ? { outputWidth: plan.width, outputHeight: plan.height, outputPixels: plan.pixels, aspectExact: plan.aspectExact, aboveTarget: plan.aboveTarget } : {})), { costFloor: floor, creditsBeforeDiscount: base, volumeDiscount: discount < 1 ? Math.round((1 - discount) * 100) : 0, reason: chosen.reason, edit }),
    };
}
//# sourceMappingURL=aiPricing.js.map