"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCreditService = exports.invalidateCostOverrides = exports.getPackage = exports.CREDIT_PACKAGES = exports.WELCOME_CREDITS = exports.SERVICE_LABEL = exports.CREDIT_POLICY = exports.CREDIT_SERVICES = exports.CREDIT_COSTS = void 0;
exports.serviceForCapability = serviceForCapability;
exports.loadCostOverrides = loadCostOverrides;
exports.getCreditCost = getCreditCost;
exports.getCreditMargin = getCreditMargin;
exports.getCreditPricingMode = getCreditPricingMode;
exports.allCreditCosts = allCreditCosts;
const firestore_1 = require("firebase-admin/firestore");
/**
 * Catálogo de costos en Credits (docs/CREDITS.md §6).
 * ÚNICO lugar donde se definen los precios. El frontend nunca los conoce por su
 * cuenta: los consulta al Credit Engine (getCreditCost). Se pueden sobreescribir
 * sin desplegar desde Firestore: creditCosts/{servicio} { credits: number }.
 */
/**
 * Precios en Credits. 100 Credits = USD 1.
 *
 * Desde el 2026-09-07 cada valor sale del coste oficial del proveedor por la
 * operación típica de esa categoría, con el margen por defecto del motor (30 %):
 *   Credits = techo( coste_USD × creditsPerUsd × (1 + margen) )
 * El cálculo exacto por operación vive en credits/aiPricing.ts. Estos valores son
 * el precio de catálogo (modo simulated) y el suelo del modo real.
 */
exports.CREDIT_COSTS = {
    // Imagen — Gemini (ai.google.dev/gemini-api/docs/pricing)
    ai_image_lite: 3, // FLUX.2 klein 9B a 1K: USD 0.015 (imágenes sencillas, posts, borradores)
    ai_image_enhance_lite: 3, // Edición con FLUX.2 klein 9B: USD 0.015
    ai_image: 10, // Nano Banana 2 a 1K: USD 0.067 (texto dentro de la imagen)
    ai_image_enhance: 10, // Edición con Nano Banana 2 a 1K: USD 0.067
    ai_image_pro: 18, // Nano Banana Pro (identidad, restauración, logos): USD 0.134
    ai_tryon: 15, // Prueba virtual de ropa (BFL): precio por megapíxel pendiente de medir
    // Video — Seedance / BytePlus ModelArk (docs.byteplus.com/en/docs/ModelArk/1544106), 10 s
    ai_video_draft: 75, // Seedance 2.0 fast a 480p: USD 0.56
    ai_video: 160, // Seedance 2.0 fast a 720p: USD 1.20
    ai_video_hd: 200, // Seedance 2.0 a 720p: USD 1.51
    ai_video_advanced: 300, // Seedance 2.5 a 720p: USD 2.31
    ai_video_max: 740, // Seedance 2.5 a 1080p: USD 5.69
    ai_video_edit: 20, // Montaje propio con ffmpeg (no es IA)
    // Audio
    ai_audio: 20, // ElevenLabs: USD 0.10 por 1 000 caracteres
    ai_transcribe: 2, // Gemini 3.5 Transcribe: ≈ USD 0.005 por minuto
    ai_music: 30, // Weë Music pausada: sin proveedor activo
    // Texto
    /*
     * WEË BRAIN TIENE SU PROPIO SERVICIO (decisión del usuario, 2026-09-16).
     *
     * No es un capricho de contabilidad: `ai_text` lo cobran la receta de Weë Chef,
     * los pasos de texto de Weë Studio, Weë Travel, Weë Business y Weë Design. Darle
     * a Brain otro precio a través de `ai_text` se los cambiaba a todos —bajó la
     * receta de Chef de 2 Credits a 1 y lo cazaron las pruebas—.
     *
     * Con servicio propio, Brain se cobra por lo que de verdad cuesta su modelo más
     * su margen (`CREDIT_POLICY`), y `ai_text` se queda exactamente como estaba.
     * Además su consumo queda separado en el historial y en las estadísticas, que es
     * lo que permitirá medir Brain por su cuenta.
     *
     * Este número es el precio de catálogo y el suelo del modo prueba; con
     * `pricingMode: 'real'` NO se usa como precio. Está en 1 porque es lo que da el
     * cálculo real: DeepSeek-V4.1-Flash ≈ USD 0.0036 por respuesta, más un 20 %, son
     * 0.43 Credits, y la moneda de Weë es entera.
     */
    ai_brain: 1,
    ai_text: 2, // Gemini 3.8 Flash: ≈ USD 0.005 por paso
    ai_text_pro: 7, // Modelo de razonamiento (novela, guion, plan de negocio): ≈ USD 0.046
    // Las primeras 5 000 búsquedas de Google al mes son gratis en los modelos Gemini 3.x;
    // a partir de ahí, USD 14 por 1 000 consultas.
    ai_search: 3,
    ai_book: 100,
    wee_avatar: 50, // Nano Banana Pro, dos llamadas
};
exports.CREDIT_SERVICES = Object.keys(exports.CREDIT_COSTS);
/*
 * SOLO ENTRA AQUÍ QUIEN NECESITE ALGO DISTINTO DE LO GENERAL.
 *
 * `ai_text` NO está y no puede estar: lo cobran Weë Chef, Weë Studio, Weë Travel,
 * Weë Business y Weë Design, y ponerlo en modo real les cambiaba el precio a
 * todas (la receta de Chef bajó de 2 a 1 Credit y lo cazó
 * `test/estimate-plan.test.mjs`). Por eso Weë Brain tiene servicio propio.
 */
exports.CREDIT_POLICY = {
    ai_brain: { margin: 0.2, pricingMode: 'real' },
};
/** Nombre que ve la persona por cada servicio (historial, avisos). */
exports.SERVICE_LABEL = {
    ai_image_lite: 'Imagen estándar',
    ai_image_enhance_lite: 'Edición estándar',
    ai_image: 'Generación de imagen',
    ai_image_enhance: 'Edición de imagen',
    ai_image_pro: 'Imagen de máxima precisión',
    ai_tryon: 'Prueba de ropa',
    ai_video_draft: 'Video de vista previa',
    ai_video: 'Generación de video',
    ai_video_hd: 'Video de alta calidad',
    ai_video_advanced: 'Video avanzado',
    ai_video_max: 'Video de máxima calidad',
    ai_video_edit: 'Montaje de video',
    ai_audio: 'Generación de voz',
    ai_transcribe: 'Transcripción y subtítulos',
    ai_music: 'Generación de música',
    ai_brain: 'Respuesta de Weë Brain',
    ai_text: 'Generación de texto',
    ai_text_pro: 'Texto largo de máxima calidad',
    ai_search: 'Búsqueda con IA',
    ai_book: 'Creación de libro',
    wee_avatar: 'Avatar Weë',
};
/** Credits de bienvenida al abrir la cuenta (0 para desactivar). Configurable con CREDITS_WELCOME. */
exports.WELCOME_CREDITS = (() => {
    const raw = process.env.CREDITS_WELCOME;
    if (raw === undefined || raw === '')
        return 240;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();
exports.CREDIT_PACKAGES = [
    { id: 'basic', name: 'Básico', credits: 40, priceUsd: 4.99, productId: 'zone.wee.credits.basic' },
    { id: 'plus', name: 'Plus', credits: 90, priceUsd: 9.99, productId: 'zone.wee.credits.plus' },
    { id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9, productId: 'zone.wee.credits.blackpro' },
];
const getPackage = (id) => exports.CREDIT_PACKAGES.find((p) => p.id === id || p.productId === id);
exports.getPackage = getPackage;
/** Qué servicio del catálogo cobra cada capacidad del WEË AI ENGINE. */
/**
 * Operaciones de imagen que exigen el modelo de máxima precisión: conservar el
 * rostro de la persona (Beauty, retoque), restaurar una foto antigua o crear la
 * identidad de una marca. La decisión vive aquí, no dentro de cada sección.
 */
const PRO_KINDS = new Set(['restore', 'retouch', 'look', 'identity', 'logo']);
const proImage = (input) => { var _a; return PRO_KINDS.has(String((_a = input.kind) !== null && _a !== void 0 ? _a : '')) || input.quality === 'max'; };
function serviceForCapability(capability, input = {}) {
    switch (capability) {
        case 'image.generate':
        case 'image.reference':
            // El tramo exacto lo decide credits/aiPricing.ts según el modelo elegido;
            // esto es el respaldo cuando todavía no se conoce.
            return proImage(input) ? 'ai_image_pro' : input.quality === 'standard' ? 'ai_image_lite' : 'ai_image';
        case 'image.edit':
        case 'image.background_remove':
        case 'image.upscale':
        case 'image.object_remove':
        case 'image.space_restyle':
            return proImage(input) ? 'ai_image_pro' : input.quality === 'standard' ? 'ai_image_enhance_lite' : 'ai_image_enhance';
        case 'image.try_on':
            return 'ai_tryon';
        case 'image.identity_edit':
            // Conservar el rostro: siempre el modelo de máxima precisión
            return 'ai_image_pro';
        case 'video.generate':
        case 'video.image_to_video':
        case 'video.reference':
            // Precio real por modelo y resolución en credits/aiPricing.ts (priceVideo).
            // Este tramo es el respaldo cuando todavía no se conoce el modelo elegido.
            if (input.quality === 'max' || Number(input.durationSec) > 15)
                return 'ai_video_advanced';
            if (input.quality === 'high')
                return 'ai_video_hd';
            return input.resolution === '480p' ? 'ai_video_draft' : 'ai_video';
        case 'video.compose':
        case 'video.montage':
        case 'video.vertical':
            return 'ai_video_edit';
        case 'text.search':
            return 'ai_search';
        case 'voice.tts':
            return 'ai_audio';
        case 'audio.transcribe':
            return 'ai_transcribe';
        case 'doc.read':
            return 'ai_search';
        case 'music.generate':
        case 'audio.sfx':
            return 'ai_music';
        case 'doc.render':
            return input.kind === 'book' ? 'ai_book' : 'ai_text';
        default:
            // Un texto que pide el mejor modelo de la cadena cuesta mucho más que uno corto
            return input.quality === 'max' ? 'ai_text_pro' : 'ai_text';
    }
}
// ── Sobreescrituras desde Firestore (administración), con caché ──
const CACHE_MS = 60000;
let overrides = null;
async function loadCostOverrides(force = false) {
    if (!force && overrides && Date.now() - overrides.at < CACHE_MS)
        return overrides.values;
    const values = {};
    const policies = {};
    try {
        const snap = await (0, firestore_1.getFirestore)().collection('creditCosts').get();
        snap.forEach((doc) => {
            if (!exports.CREDIT_SERVICES.includes(doc.id))
                return;
            const service = doc.id;
            const data = doc.data() || {};
            const credits = Number(data.credits);
            if (Number.isFinite(credits) && credits >= 0)
                values[service] = Math.floor(credits);
            /*
             * El margen se lee TAL CUAL: es una proporción, no Credits. Pasarlo por el
             * `Math.floor` de arriba convertiría un 20 % en cero. Se acota a algo
             * sensato para que un dedo torpe en el panel no ponga un margen de 5 000 %.
             */
            const margin = Number(data.margin);
            const mode = data.pricingMode;
            const politica = {};
            if (Number.isFinite(margin) && margin >= 0 && margin <= 10)
                politica.margin = margin;
            if (mode === 'real' || mode === 'simulated')
                politica.pricingMode = mode;
            if (politica.margin !== undefined || politica.pricingMode !== undefined)
                policies[service] = politica;
        });
    }
    catch (error) {
        console.warn('Credit Engine: no se pudieron leer los costos de Firestore, se usa el catálogo:', error);
    }
    overrides = { at: Date.now(), values, policies };
    return values;
}
const invalidateCostOverrides = () => {
    overrides = null;
};
exports.invalidateCostOverrides = invalidateCostOverrides;
/** Costo vigente de un servicio (catálogo + sobreescritura cargada). Síncrono para el router. */
function getCreditCost(service) {
    const override = overrides === null || overrides === void 0 ? void 0 : overrides.values[service];
    return override !== undefined ? override : exports.CREDIT_COSTS[service];
}
/**
 * El margen de un servicio: el suyo si lo tiene, y si no el del motor.
 *
 * Se resuelve igual que el precio —Firestore primero, luego el catálogo del
 * código, luego lo general—, así que no hay dos maneras de averiguar un precio
 * en Weë: hay una, con una excepción declarada por servicio.
 */
function getCreditMargin(service, fallback) {
    var _a, _b, _c;
    const valor = (_b = (_a = overrides === null || overrides === void 0 ? void 0 : overrides.policies[service]) === null || _a === void 0 ? void 0 : _a.margin) !== null && _b !== void 0 ? _b : (_c = exports.CREDIT_POLICY[service]) === null || _c === void 0 ? void 0 : _c.margin;
    return valor === undefined ? fallback : valor;
}
/** Cómo se le pone precio a un servicio: lo suyo si lo tiene, y si no lo del motor. */
function getCreditPricingMode(service, fallback) {
    var _a, _b, _c, _d;
    return (_d = (_b = (_a = overrides === null || overrides === void 0 ? void 0 : overrides.policies[service]) === null || _a === void 0 ? void 0 : _a.pricingMode) !== null && _b !== void 0 ? _b : (_c = exports.CREDIT_POLICY[service]) === null || _c === void 0 ? void 0 : _c.pricingMode) !== null && _d !== void 0 ? _d : fallback;
}
const isCreditService = (value) => typeof value === 'string' && exports.CREDIT_SERVICES.includes(value);
exports.isCreditService = isCreditService;
function allCreditCosts() {
    const out = {};
    for (const service of exports.CREDIT_SERVICES)
        out[service] = getCreditCost(service);
    return out;
}
//# sourceMappingURL=creditCosts.js.map