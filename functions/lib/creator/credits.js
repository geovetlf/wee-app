"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingMode = void 0;
exports.estimatePlanCredits = estimatePlanCredits;
exports.ensureDemoWallet = ensureDemoWallet;
exports.holdCredits = holdCredits;
exports.settleCredits = settleCredits;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const pricing_1 = require("../engine/pricing");
const engine_1 = require("../engine");
/**
 * Credits de Weë Creator: reservar al empezar, ajustar al terminar.
 * Precios por capacidad en pricing/{capabilityId}.credits. Mientras la tabla
 * esté vacía (fase 0, modo demo) todo cuesta 0: los precios no se inventan.
 */
const db = () => (0, firestore_1.getFirestore)();
/**
 * Precios de PRUEBA por capacidad: viven en el engine (functions/src/engine/pricing.ts).
 * En modo real, la estimación la da el AI Router (mejor candidato disponible).
 */
/** Credits de bienvenida en modo simulado (la referencia muestra 240). */
const WELCOME_CREDITS = 240;
const pricingMode = () => (process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated');
exports.pricingMode = pricingMode;
async function estimatePlanCredits(plan, userId = 'anonymous') {
    var _a, _b;
    if ((0, exports.pricingMode)() === 'simulated') {
        return plan.steps.reduce((sum, s) => { var _a; return sum + ((_a = pricing_1.SIMULATED_PRICING[s.capability]) !== null && _a !== void 0 ? _a : 1); }, 0);
    }
    // Modo real: lo que costaría el mejor proveedor disponible para cada paso
    let total = 0;
    for (const step of plan.steps) {
        const input = step.input || {};
        const decision = await engine_1.engine.route({
            capability: step.capability,
            input,
            userId,
            goal: plan.goal,
            experienceId: plan.experience,
            prefs: { quality: input.quality || 'auto', durationSec: input.durationSec ? Number(input.durationSec) : undefined },
        });
        total += (_b = (_a = decision.candidates[0]) === null || _a === void 0 ? void 0 : _a.estimatedCredits) !== null && _b !== void 0 ? _b : 0;
    }
    return total;
}
/** En modo simulado, cada persona empieza con Credits de bienvenida para probar Weë Creator. */
async function ensureDemoWallet(userId) {
    if ((0, exports.pricingMode)() !== 'simulated')
        return;
    const walletRef = db().collection('wallets').doc(userId);
    await db().runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const wallet = await tx.get(walletRef);
        if (wallet.exists && ((_a = wallet.data()) === null || _a === void 0 ? void 0 : _a.welcomeGranted))
            return;
        const now = firestore_1.Timestamp.now();
        const balance = (wallet.exists ? Number((_c = (_b = wallet.data()) === null || _b === void 0 ? void 0 : _b.balance) !== null && _c !== void 0 ? _c : 0) : 0) + WELCOME_CREDITS;
        tx.set(walletRef, {
            userId,
            balance,
            totalPurchased: firestore_1.FieldValue.increment(WELCOME_CREDITS),
            totalSpent: wallet.exists ? Number((_e = (_d = wallet.data()) === null || _d === void 0 ? void 0 : _d.totalSpent) !== null && _e !== void 0 ? _e : 0) : 0,
            welcomeGranted: true,
            createdAt: wallet.exists ? (_g = (_f = wallet.data()) === null || _f === void 0 ? void 0 : _f.createdAt) !== null && _g !== void 0 ? _g : now : now,
            updatedAt: now,
        }, { merge: true });
        tx.set(db().collection('transactions').doc(), {
            userId,
            type: 'purchase',
            amount: WELCOME_CREDITS,
            balance,
            description: 'Credits de bienvenida (simulados)',
            createdAt: now,
        });
    });
}
/** Reserva Credits al empezar un trabajo (cobro provisional). */
async function holdCredits(userId, amount, description) {
    if (amount <= 0)
        return;
    const walletRef = db().collection('wallets').doc(userId);
    await db().runTransaction(async (tx) => {
        var _a, _b;
        const wallet = await tx.get(walletRef);
        const balance = wallet.exists ? Number((_b = (_a = wallet.data()) === null || _a === void 0 ? void 0 : _a.balance) !== null && _b !== void 0 ? _b : 0) : 0;
        if (balance < amount) {
            throw new https_1.HttpsError('failed-precondition', 'insufficient-credits');
        }
        const now = firestore_1.Timestamp.now();
        tx.set(walletRef, {
            userId,
            balance: balance - amount,
            totalSpent: firestore_1.FieldValue.increment(amount),
            updatedAt: now,
        }, { merge: true });
        tx.set(db().collection('transactions').doc(), {
            userId,
            type: 'spend',
            amount: -amount,
            balance: balance - amount,
            description,
            createdAt: now,
        });
    });
}
/** Ajusta al terminar: devuelve lo reservado que no se usó (o todo, si falló). */
async function settleCredits(userId, held, used, description) {
    const refund = held - Math.max(0, used);
    if (refund <= 0)
        return;
    const walletRef = db().collection('wallets').doc(userId);
    await db().runTransaction(async (tx) => {
        var _a, _b;
        const wallet = await tx.get(walletRef);
        const balance = wallet.exists ? Number((_b = (_a = wallet.data()) === null || _a === void 0 ? void 0 : _a.balance) !== null && _b !== void 0 ? _b : 0) : 0;
        const now = firestore_1.Timestamp.now();
        tx.set(walletRef, {
            userId,
            balance: balance + refund,
            totalSpent: firestore_1.FieldValue.increment(-refund),
            updatedAt: now,
        }, { merge: true });
        tx.set(db().collection('transactions').doc(), {
            userId,
            type: 'refund',
            amount: refund,
            balance: balance + refund,
            description: `${description} · devolución`,
            createdAt: now,
        });
    });
}
//# sourceMappingURL=credits.js.map