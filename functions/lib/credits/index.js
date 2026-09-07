"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditsAdmin = exports.restorePurchaseCallable = exports.validatePurchaseCallable = exports.refundCredits = exports.grantCredits = exports.spendCredits = exports.getCreditCost = exports.getCreditHistory = exports.getCreditsBalance = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const creditEngine_1 = require("./creditEngine");
const creditCosts_1 = require("./creditCosts");
const creditValidation_1 = require("./creditValidation");
const admin_1 = require("../shared/admin");
const purchaseValidation_1 = require("../payments/purchaseValidation");
/**
 * Cloud Functions del Credit Engine (docs/CREDITS.md §10).
 * El cliente solo pasa por aquí; nunca escribe Credits en Firestore.
 */
const OPTS = { region: 'us-central1', timeoutSeconds: 30 };
const uidOf = (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    return request.auth.uid;
};
const run = async (fn) => {
    try {
        return await fn();
    }
    catch (error) {
        throw (0, creditValidation_1.toHttpsError)(error);
    }
};
/** Saldo de la cuenta (inicializa la cuenta, migra el saldo anterior y otorga la bienvenida la primera vez). */
exports.getCreditsBalance = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    const userId = uidOf(request);
    const balance = await creditEngine_1.creditEngine.getBalance(userId);
    return balance;
}));
exports.getCreditHistory = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {});
    const items = await creditEngine_1.creditEngine.getCreditHistory(userId, data.limit);
    return { items };
}));
/** Costo de un servicio, o de todos si no se indica ninguno. */
exports.getCreditCost = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    uidOf(request);
    await (0, creditCosts_1.loadCostOverrides)();
    const data = (request.data || {});
    const costs = (0, creditCosts_1.allCreditCosts)();
    if (data.service) {
        if (!(0, creditCosts_1.isCreditService)(data.service))
            throw new https_1.HttpsError('invalid-argument', `Servicio desconocido: ${data.service}`);
        return { service: data.service, credits: costs[data.service] };
    }
    return { costs, packages: creditCosts_1.CREDIT_PACKAGES };
}));
/**
 * Gastar Credits por un servicio. El monto lo decide el servidor (catálogo);
 * requestId hace la operación idempotente. Devuelve la autorización; quien
 * ejecute la IA debe completarla o reembolsarla.
 */
exports.spendCredits = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {});
    if (!(0, creditCosts_1.isCreditService)(data.service))
        throw new https_1.HttpsError('invalid-argument', `Servicio desconocido: ${String(data.service)}`);
    await creditEngine_1.creditEngine.ensureAccount(userId);
    return creditEngine_1.creditEngine.spendCredits({
        userId,
        service: data.service,
        requestId: (0, creditValidation_1.assertRequestId)(data.requestId),
        reason: (0, creditValidation_1.cleanText)(data.reason, 140, undefined) || undefined,
        source: 'client',
        generationId: data.generationId ? (0, creditValidation_1.cleanText)(data.generationId, 160) : undefined,
    });
}));
/** Otorgar Credits (solo administración; las compras llegan por validatePurchase). */
exports.grantCredits = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    (0, admin_1.assertAdmin)(request.auth);
    const data = (request.data || {});
    return creditEngine_1.creditEngine.grantCredits({
        userId: String(data.userId || ''),
        amount: Number(data.amount),
        reason: (0, creditValidation_1.cleanText)(data.reason, 140, 'Credits de regalo'),
        source: 'admin',
        requestId: data.requestId || `admin_${Date.now()}`,
    });
}));
/** Reembolsar una operación (solo administración; los flujos de IA reembolsan solos al fallar). */
exports.refundCredits = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    (0, admin_1.assertAdmin)(request.auth);
    const data = (request.data || {});
    return creditEngine_1.creditEngine.refundCredits({
        userId: String(data.userId || ''),
        requestId: String(data.requestId || ''),
        reason: (0, creditValidation_1.cleanText)(data.reason, 140, 'Reembolso por administración'),
        source: 'admin',
        force: data.force === true,
    });
}));
/** Compra: el proveedor valida el comprobante y el Credit Engine acredita el paquete. */
exports.validatePurchaseCallable = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {});
    const provider = data.provider || 'test';
    await creditEngine_1.creditEngine.ensureAccount(userId);
    return (0, purchaseValidation_1.validatePurchase)({ userId, provider, packageId: data.packageId, payload: data.payload });
}));
exports.restorePurchaseCallable = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    const userId = uidOf(request);
    const data = (request.data || {});
    return (0, purchaseValidation_1.restorePurchases)({ userId, provider: data.provider || 'apple', payload: data.payload });
}));
/** Panel de administración (docs/CREDITS.md §12): estadísticas, historial de una persona, fallidas, costos. */
exports.creditsAdmin = (0, https_1.onCall)(OPTS, async (request) => run(async () => {
    (0, admin_1.assertAdmin)(request.auth);
    const data = (request.data || {});
    const db = (0, firestore_1.getFirestore)();
    switch (String(data.action || 'stats')) {
        case 'stats': {
            const [global, daily] = await Promise.all([
                db.collection('creditStats').doc('global').get(),
                db.collection('creditStats').orderBy('updatedAt', 'desc').limit(31).get(),
            ]);
            return { global: global.data() || {}, daily: daily.docs.filter((d) => d.id.startsWith('daily_')).map((d) => (Object.assign({ id: d.id }, d.data()))) };
        }
        case 'userHistory':
            return { items: await creditEngine_1.creditEngine.getCreditHistory(String(data.userId || ''), data.limit) };
        case 'balance':
            return creditEngine_1.creditEngine.getBalance(String(data.userId || ''));
        case 'failed': {
            const snap = await db.collection('creditTransactions').where('status', '==', 'REFUNDED').orderBy('createdAt', 'desc').limit(Number(data.limit) || 50).get();
            return { items: snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))) };
        }
        case 'costs': {
            await (0, creditCosts_1.loadCostOverrides)(true);
            return { costs: (0, creditCosts_1.allCreditCosts)(), packages: creditCosts_1.CREDIT_PACKAGES };
        }
        case 'setCost': {
            if (!(0, creditCosts_1.isCreditService)(data.service))
                throw new https_1.HttpsError('invalid-argument', 'Servicio desconocido');
            const credits = Math.floor(Number(data.credits));
            if (!Number.isFinite(credits) || credits < 0)
                throw new https_1.HttpsError('invalid-argument', 'credits inválido');
            await db.collection('creditCosts').doc(data.service).set({ credits, updatedAt: new Date() }, { merge: true });
            (0, creditCosts_1.invalidateCostOverrides)();
            return { ok: true };
        }
        default:
            throw new https_1.HttpsError('invalid-argument', `Acción desconocida: ${data.action}`);
    }
}));
//# sourceMappingURL=index.js.map