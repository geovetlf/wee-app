"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingMode = void 0;
exports.estimatePlan = estimatePlan;
exports.planOptions = planOptions;
exports.estimatePlanCredits = estimatePlanCredits;
exports.ensureAccount = ensureAccount;
exports.holdCredits = holdCredits;
exports.settleCredits = settleCredits;
const https_1 = require("firebase-functions/v2/https");
const creditEngine_1 = require("../credits/creditEngine");
const creditCosts_1 = require("../credits/creditCosts");
const creditValidation_1 = require("../credits/creditValidation");
const engine_1 = require("../engine");
const video_1 = require("../engine/video");
const aiPricing_1 = require("../credits/aiPricing");
const image_1 = require("../engine/image");
/**
 * Credits de Weë Creator: reservar al empezar, ajustar al terminar.
 * Todo pasa por el Credit Engine (functions/src/credits): un solo movimiento
 * por trabajo (requestId = jobId) que se autoriza antes de crear, se completa
 * al terminar y se reembolsa entero si algo falla.
 *
 * Precios: modo "simulated" (por defecto) usa el catálogo configurable del
 * Credit Engine (creditCosts.ts + creditCosts/{servicio} en Firestore); son
 * valores de prueba mientras no se conozca el coste real de cada API. Modo
 * "real" pide la estimación al AI Router (mejor candidato disponible).
 */
const pricingMode = () => (process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated');
exports.pricingMode = pricingMode;
/**
 * Presupuesto del plan. Con `quality` se recalcula como si la persona hubiera
 * elegido ese nivel, para poder enseñarle las opciones antes de crear.
 */
async function estimatePlan(plan, userId = 'anonymous', quality) {
    var _a, _b, _c, _d, _e, _f, _g;
    await (0, creditCosts_1.loadCostOverrides)();
    const steps = [];
    for (const step of plan.steps) {
        const base = step.input || {};
        // Un nivel elegido por la persona manda sobre el que propuso la plantilla
        const input = quality ? Object.assign(Object.assign({}, base), { quality }) : base;
        let service = (0, creditCosts_1.serviceForCapability)(step.capability, input);
        let credits = (0, creditCosts_1.getCreditCost)(service);
        if (step.capability.startsWith('video.')) {
            // El precio del video depende del modelo de Seedance y de la resolución:
            // se calcula con la tarifa oficial de ByteDance (credits/aiPricing.ts).
            const settings = await engine_1.engine.settings();
            const request = (0, video_1.videoRequestFromStep)(step.capability, input);
            const price = (0, aiPricing_1.priceVideo)({
                modelId: (0, video_1.chooseSeedanceModel)(request, settings),
                durationSec: request.durationSec,
                aspectRatio: request.aspectRatio,
                resolution: request.resolution,
                quality: request.quality,
            }, settings);
            service = price.service;
            credits = price.credits;
            steps.push({
                stepId: step.id,
                capability: step.capability,
                service,
                credits,
                label: String((_a = price.detail.family) !== null && _a !== void 0 ? _a : '') || undefined,
                resolution: String((_b = price.detail.resolution) !== null && _b !== void 0 ? _b : '') || undefined,
                durationSec: Number(price.detail.durationSec) || undefined,
            });
            continue;
        }
        if (step.capability.startsWith('image.')) {
            // Mismo modelo que usará el Weë Image Engine: el más barato que sirve.
            // Tres propuestas cuestan tres veces una y la resolución cambia el precio.
            const settings = await engine_1.engine.settings();
            const price = (0, aiPricing_1.priceImage)({
                capability: step.capability,
                count: input.count === undefined ? undefined : Number(input.count),
                quality: input.quality,
                resolution: input.resolution,
                kind: input.kind,
                references: Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0,
                available: image_1.providerReady,
            }, settings);
            steps.push({
                stepId: step.id,
                capability: step.capability,
                service: price.service,
                credits: price.credits,
                label: String((_c = price.detail.label) !== null && _c !== void 0 ? _c : '') || undefined,
                resolution: String((_d = price.detail.imageSize) !== null && _d !== void 0 ? _d : '') || undefined,
                count: Number(price.detail.count) || undefined,
                volumeDiscount: Number(price.detail.volumeDiscount) || undefined,
            });
            continue;
        }
        // Resto de capacidades con coste de proveedor: mismo suelo que imagen y video
        if ((0, exports.pricingMode)() !== 'real') {
            const settings = await engine_1.engine.settings();
            const price = (0, aiPricing_1.priceOperation)(step.capability, input, service, settings);
            steps.push({ stepId: step.id, capability: step.capability, service, credits: price.credits });
            continue;
        }
        if ((0, exports.pricingMode)() === 'real') {
            const decision = await engine_1.engine.route({
                capability: step.capability,
                input,
                userId,
                goal: plan.goal,
                experienceId: plan.experience,
                prefs: { quality: input.quality || 'auto', durationSec: input.durationSec ? Number(input.durationSec) : undefined },
            });
            credits = (_f = (_e = decision.candidates[0]) === null || _e === void 0 ? void 0 : _e.estimatedCredits) !== null && _f !== void 0 ? _f : 0;
        }
        steps.push({ stepId: step.id, capability: step.capability, service, credits });
    }
    const dominant = steps.reduce((best, s) => (!best || s.credits > best.credits ? s : best), null);
    return { total: steps.reduce((sum, s) => sum + s.credits, 0), service: (_g = dominant === null || dominant === void 0 ? void 0 : dominant.service) !== null && _g !== void 0 ? _g : 'ai_text', steps };
}
/**
 * Presupuesto de cada nivel para el mismo plan. Es lo que se le enseña a la
 * persona: "Estándar 6 · Alta 25 · Máxima 41 Credits". Solo se ofrecen los
 * niveles que cambian el precio.
 */
const QUALITY_LABEL = { standard: 'Estándar', high: 'Alta calidad', max: 'Máxima calidad' };
async function planOptions(plan, userId = 'anonymous') {
    const levels = ['standard', 'high', 'max'];
    const out = [];
    for (const quality of levels) {
        const estimate = await estimatePlan(plan, userId, quality);
        if (!out.some((o) => o.credits === estimate.total))
            out.push({ quality, label: QUALITY_LABEL[quality], credits: estimate.total });
    }
    return out.length > 1 ? out : undefined;
}
async function estimatePlanCredits(plan, userId = 'anonymous') {
    return (await estimatePlan(plan, userId)).total;
}
/** Garantiza la cuenta de Credits (migra la billetera anterior y otorga la bienvenida la primera vez). */
async function ensureAccount(userId) {
    try {
        await creditEngine_1.creditEngine.ensureAccount(userId);
    }
    catch (error) {
        // Sin perfil todavía (cuenta recién creada): el trabajo puede seguir; el cobro fallará con un error claro
        if (error instanceof creditValidation_1.CreditError && error.code === 'ACCOUNT_NOT_FOUND')
            return;
        throw (0, creditValidation_1.toHttpsError)(error);
    }
}
/** Reserva Credits al empezar un trabajo (AUTHORIZED). Lanza failed-precondition/INSUFFICIENT_CREDITS si no alcanza. */
async function holdCredits(userId, jobId, plan, amount, description) {
    if (amount <= 0)
        return;
    try {
        const estimate = await estimatePlan(plan, userId);
        await creditEngine_1.creditEngine.spendCredits({
            userId,
            service: estimate.service,
            requestId: jobId,
            amount,
            reason: description,
            source: 'weë-creator',
            generationId: jobId,
            meta: { jobId, steps: estimate.steps },
        });
    }
    catch (error) {
        throw (0, creditValidation_1.toHttpsError)(error);
    }
}
/** Ajusta al terminar: completa cobrando lo usado (devuelve la diferencia) o reembolsa todo si falló. */
async function settleCredits(userId, jobId, held, used, description) {
    if (held <= 0)
        return;
    try {
        if (used > 0) {
            await creditEngine_1.creditEngine.completeCredits({ userId, requestId: jobId, finalAmount: Math.min(held, used) });
        }
        else {
            await creditEngine_1.creditEngine.refundCredits({ userId, requestId: jobId, reason: `${description} · no se pudo terminar`, source: 'weë-creator' });
        }
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error(`Credit Engine: no se pudo ajustar el trabajo ${jobId}:`, error);
    }
}
//# sourceMappingURL=credits.js.map