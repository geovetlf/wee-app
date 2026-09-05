"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimatePlanCredits = estimatePlanCredits;
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
async function estimatePlanCredits(plan) {
    const ids = Array.from(new Set(plan.steps.map((s) => s.capability)));
    const snaps = await Promise.all(ids.map((id) => db().collection('pricing').doc(id).get()));
    const price = {};
    snaps.forEach((snap, index) => {
        var _a, _b;
        price[ids[index]] = snap.exists ? Number((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.credits) !== null && _b !== void 0 ? _b : 0) : 0;
    });
    return plan.steps.reduce((sum, s) => sum + (price[s.capability] || 0), 0);
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