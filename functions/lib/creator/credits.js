"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingMode = void 0;
exports.estimatePlan = estimatePlan;
exports.estimatePlanCredits = estimatePlanCredits;
exports.ensureAccount = ensureAccount;
exports.holdCredits = holdCredits;
exports.settleCredits = settleCredits;
const https_1 = require("firebase-functions/v2/https");
const creditEngine_1 = require("../credits/creditEngine");
const creditCosts_1 = require("../credits/creditCosts");
const creditValidation_1 = require("../credits/creditValidation");
const engine_1 = require("../engine");
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
async function estimatePlan(plan, userId = 'anonymous') {
    var _a, _b, _c;
    await (0, creditCosts_1.loadCostOverrides)();
    const steps = [];
    for (const step of plan.steps) {
        const input = step.input || {};
        const service = (0, creditCosts_1.serviceForCapability)(step.capability, input);
        let credits = (0, creditCosts_1.getCreditCost)(service);
        if ((0, exports.pricingMode)() === 'real') {
            const decision = await engine_1.engine.route({
                capability: step.capability,
                input,
                userId,
                goal: plan.goal,
                experienceId: plan.experience,
                prefs: { quality: input.quality || 'auto', durationSec: input.durationSec ? Number(input.durationSec) : undefined },
            });
            credits = (_b = (_a = decision.candidates[0]) === null || _a === void 0 ? void 0 : _a.estimatedCredits) !== null && _b !== void 0 ? _b : 0;
        }
        steps.push({ stepId: step.id, capability: step.capability, service, credits });
    }
    const dominant = steps.reduce((best, s) => (!best || s.credits > best.credits ? s : best), null);
    return { total: steps.reduce((sum, s) => sum + s.credits, 0), service: (_c = dominant === null || dominant === void 0 ? void 0 : dominant.service) !== null && _c !== void 0 ? _c : 'ai_text', steps };
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