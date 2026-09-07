"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCheap = void 0;
exports.estimateUsd = estimateUsd;
exports.usdToCredits = usdToCredits;
exports.creditsFor = creditsFor;
exports.estimateStepCredits = estimateStepCredits;
const types_1 = require("./types");
const creditCosts_1 = require("../credits/creditCosts");
/**
 * De coste a Credits.
 * - Modo "simulated" (mientras se construye Weë Creator): el catálogo del
 *   Credit Engine (functions/src/credits/creditCosts.ts, sobreescribible desde
 *   creditCosts/{servicio} en Firestore). Son valores de prueba, no costes reales.
 * - Modo "real": Credits = USD medido/estimado × creditsPerUsd × (1 + margen).
 *   Los precios de lista de los modelos son orientativos hasta verificarlos.
 */
const DEFAULT_SECONDS = {
    'video.generate': 8,
    'video.image_to_video': 8,
    'music.generate': 30,
    'audio.sfx': 5,
};
/** USD estimado de una llamada con este modelo, según la unidad de cobro. */
function estimateUsd(model, capability, input, prefs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const cost = model.cost;
    switch (cost.unit) {
        case 'second': {
            const wanted = Number((_c = (_b = (_a = prefs.durationSec) !== null && _a !== void 0 ? _a : input.durationSec) !== null && _b !== void 0 ? _b : DEFAULT_SECONDS[capability]) !== null && _c !== void 0 ? _c : 8);
            const seconds = model.maxDurationSec ? Math.min(model.maxDurationSec, wanted) : wanted;
            return seconds * cost.usd;
        }
        case 'minute': {
            const wanted = Number((_f = (_e = (_d = prefs.durationSec) !== null && _d !== void 0 ? _d : input.durationSec) !== null && _e !== void 0 ? _e : DEFAULT_SECONDS[capability]) !== null && _f !== void 0 ? _f : 30);
            return (wanted / 60) * cost.usd;
        }
        case 'image':
            return Math.max(1, Math.min(4, Number((_g = input.count) !== null && _g !== void 0 ? _g : 1))) * cost.usd;
        case 'kchar': {
            const text = String((_k = (_j = (_h = input.text) !== null && _h !== void 0 ? _h : input.prompt) !== null && _j !== void 0 ? _j : input.content) !== null && _k !== void 0 ? _k : '');
            return (Math.max(text.length, 200) / 1000) * cost.usd;
        }
        case 'mtoken': {
            const prompt = String((_m = (_l = input.prompt) !== null && _l !== void 0 ? _l : input.purpose) !== null && _m !== void 0 ? _m : '') + String((_o = input.system) !== null && _o !== void 0 ? _o : '');
            const inputTokens = Math.max(400, Math.round(prompt.length / 4) + 300);
            const outputTokens = Number((_p = input.maxOutputTokens) !== null && _p !== void 0 ? _p : 800);
            return (inputTokens * cost.usd + outputTokens * ((_q = cost.usdOutput) !== null && _q !== void 0 ? _q : cost.usd)) / 1000000;
        }
        case 'call':
        default:
            return cost.usd;
    }
}
function usdToCredits(usd, settings) {
    if (usd <= 0)
        return 0;
    return Math.max(1, Math.ceil(usd * settings.creditsPerUsd * (1 + settings.margin)));
}
/** Credits que se cobran por una generación (lo que ve la persona). */
function creditsFor(capability, usd, settings, demo, input = {}) {
    if (settings.pricingMode === 'simulated')
        return (0, creditCosts_1.getCreditCost)((0, creditCosts_1.serviceForCapability)(capability, input));
    if (demo)
        return 0;
    return usdToCredits(usd, settings);
}
/** Estimación previa (antes de crear) para un paso de un plan. */
function estimateStepCredits(capability, estimatedUsd, settings, input = {}) {
    return creditsFor(capability, estimatedUsd, settings, false, input);
}
const isCheap = (capability) => (0, types_1.modalityOf)(capability) === 'text' || (0, types_1.modalityOf)(capability) === 'vision';
exports.isCheap = isCheap;
//# sourceMappingURL=pricing.js.map