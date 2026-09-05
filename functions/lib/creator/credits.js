"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingMode = void 0;
exports.estimatePlanCredits = estimatePlanCredits;
exports.ensureDemoWallet = ensureDemoWallet;
exports.holdCredits = holdCredits;
exports.settleCredits = settleCredits;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
/**
 * Credits de Weë Creator: reservar al empezar, ajustar al terminar.
 * Precios por capacidad en pricing/{capabilityId}.credits. Mientras la tabla
 * esté vacía (fase 0, modo demo) todo cuesta 0: los precios no se inventan.
 */
const db = () => (0, firestore_1.getFirestore)();
/**
 * Precios SIMULADOS por capacidad (docs/CREATOR-BUILD.md §16): sirven para
 * probar la experiencia completa. No son costos reales; los reales se fijan
 * en pricing/{capabilityId} cuando se midan las APIs (CREATOR_PRICING_MODE=real).
 */
const SIMULATED_PRICING = {
    'text.generate': 1,
    'text.structure': 0,
    'image.generate': 3,
    'image.edit': 2,
    'image.background_remove': 2,
    'image.upscale': 2,
    'image.object_remove': 2,
    'image.identity_edit': 4,
    'image.space_restyle': 4,
    'vision.describe': 1,
    'video.generate': 10,
    'video.image_to_video': 8,
    'video.compose': 6,
    'voice.tts': 2,
    'music.generate': 6,
    'doc.render': 1,
};
/** Credits de bienvenida en modo simulado (la referencia muestra 240). */
const WELCOME_CREDITS = 240;
const pricingMode = () => (process.env.CREATOR_PRICING_MODE === 'real' ? 'real' : 'simulated');
exports.pricingMode = pricingMode;
async function estimatePlanCredits(plan) {
    if ((0, exports.pricingMode)() === 'simulated') {
        return plan.steps.reduce((sum, s) => { var _a; return sum + ((_a = SIMULATED_PRICING[s.capability]) !== null && _a !== void 0 ? _a : 1); }, 0);
    }
    const ids = Array.from(new Set(plan.steps.map((s) => s.capability)));
    const snaps = await Promise.all(ids.map((id) => db().collection('pricing').doc(id).get()));
    const price = {};
    snaps.forEach((snap, index) => {
        var _a, _b;
        price[ids[index]] = snap.exists ? Number((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.credits) !== null && _b !== void 0 ? _b : 0) : 0;
    });
    return plan.steps.reduce((sum, s) => sum + (price[s.capability] || 0), 0);
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