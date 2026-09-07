"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCreditService = exports.invalidateCostOverrides = exports.getPackage = exports.CREDIT_PACKAGES = exports.WELCOME_CREDITS = exports.SERVICE_LABEL = exports.CREDIT_SERVICES = exports.CREDIT_COSTS = void 0;
exports.serviceForCapability = serviceForCapability;
exports.loadCostOverrides = loadCostOverrides;
exports.getCreditCost = getCreditCost;
exports.allCreditCosts = allCreditCosts;
const firestore_1 = require("firebase-admin/firestore");
/**
 * Catálogo de costos en Credits (docs/CREDITS.md §6).
 * ÚNICO lugar donde se definen los precios. El frontend nunca los conoce por su
 * cuenta: los consulta al Credit Engine (getCreditCost). Se pueden sobreescribir
 * sin desplegar desde Firestore: creditCosts/{servicio} { credits: number }.
 */
exports.CREDIT_COSTS = {
    ai_image: 10,
    ai_image_enhance: 8,
    ai_video: 50,
    ai_video_advanced: 100,
    ai_video_edit: 20,
    ai_audio: 20,
    ai_music: 30,
    ai_text: 2,
    ai_search: 3,
    ai_book: 100,
    wee_avatar: 50,
};
exports.CREDIT_SERVICES = Object.keys(exports.CREDIT_COSTS);
/** Nombre que ve la persona por cada servicio (historial, avisos). */
exports.SERVICE_LABEL = {
    ai_image: 'Generación de imagen',
    ai_image_enhance: 'Edición de imagen',
    ai_video: 'Generación de video',
    ai_video_advanced: 'Video de alta calidad',
    ai_video_edit: 'Montaje de video',
    ai_audio: 'Generación de voz',
    ai_music: 'Generación de música',
    ai_text: 'Generación de texto',
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
function serviceForCapability(capability, input = {}) {
    switch (capability) {
        case 'image.generate':
        case 'image.reference':
            return 'ai_image';
        case 'image.edit':
        case 'image.background_remove':
        case 'image.upscale':
        case 'image.object_remove':
        case 'image.identity_edit':
        case 'image.space_restyle':
            return 'ai_image_enhance';
        case 'video.generate':
        case 'video.image_to_video':
        case 'video.reference':
            return input.quality === 'max' || Number(input.durationSec) > 15 ? 'ai_video_advanced' : 'ai_video';
        case 'video.compose':
        case 'video.montage':
        case 'video.vertical':
            return 'ai_video_edit';
        case 'text.search':
            return 'ai_search';
        case 'voice.tts':
            return 'ai_audio';
        case 'music.generate':
        case 'audio.sfx':
            return 'ai_music';
        case 'doc.render':
            return input.kind === 'book' ? 'ai_book' : 'ai_text';
        default:
            return 'ai_text';
    }
}
// ── Sobreescrituras desde Firestore (administración), con caché ──
const CACHE_MS = 60000;
let overrides = null;
async function loadCostOverrides(force = false) {
    if (!force && overrides && Date.now() - overrides.at < CACHE_MS)
        return overrides.values;
    const values = {};
    try {
        const snap = await (0, firestore_1.getFirestore)().collection('creditCosts').get();
        snap.forEach((doc) => {
            var _a;
            const credits = Number((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.credits);
            if (exports.CREDIT_SERVICES.includes(doc.id) && Number.isFinite(credits) && credits >= 0)
                values[doc.id] = Math.floor(credits);
        });
    }
    catch (error) {
        console.warn('Credit Engine: no se pudieron leer los costos de Firestore, se usa el catálogo:', error);
    }
    overrides = { at: Date.now(), values };
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
const isCreditService = (value) => typeof value === 'string' && exports.CREDIT_SERVICES.includes(value);
exports.isCreditService = isCreditService;
function allCreditCosts() {
    const out = {};
    for (const service of exports.CREDIT_SERVICES)
        out[service] = getCreditCost(service);
    return out;
}
//# sourceMappingURL=creditCosts.js.map