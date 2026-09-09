"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditEngine = exports.strip = void 0;
exports.createCreditEngine = createCreditEngine;
const firestore_1 = require("firebase-admin/firestore");
const creditCosts_1 = require("./creditCosts");
const creditValidation_1 = require("./creditValidation");
const creditTransactions_1 = require("./creditTransactions");
const CREDIT_FIELDS = ['creditsBalance', 'creditsLifetimeEarned', 'creditsLifetimeSpent'];
/** Objeto plano: se puede recorrer sin romper nada que Firestore trate especial. */
const isPlainObject = (value) => {
    if (typeof value !== 'object' || value === null)
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};
/**
 * Quita los `undefined` EN PROFUNDIDAD antes de escribir en Firestore, que los
 * rechaza. Limpiar solo el primer nivel no bastaba: el presupuesto de un trabajo
 * viaja anidado en `meta.steps[]`, así que una operación de una sola imagen metía
 * `volumeDiscount: undefined` dentro del array y tumbaba la reserva entera antes
 * de llamar a ningún proveedor.
 *
 * Solo se entra en objetos planos y arrays. Los Timestamp y los valores especiales
 * de Firestore (increment, serverTimestamp) se devuelven intactos: recorrerlos los
 * convertiría en objetos corrientes y perderían su significado.
 */
const strip = (value) => {
    if (Array.isArray(value))
        return value.map((item) => (0, exports.strip)(item));
    if (isPlainObject(value)) {
        const out = {};
        for (const [k, v] of Object.entries(value))
            if (v !== undefined)
                out[k] = (0, exports.strip)(v);
        return out;
    }
    return value;
};
exports.strip = strip;
function createCreditEngine(deps) {
    var _a, _b;
    const { increment, now } = deps;
    const db = () => deps.db();
    const welcome = (_a = deps.welcomeCredits) !== null && _a !== void 0 ? _a : creditCosts_1.WELCOME_CREDITS;
    const loadCosts = (_b = deps.loadCosts) !== null && _b !== void 0 ? _b : creditCosts_1.loadCostOverrides;
    const users = () => db().collection('users');
    const transactions = () => db().collection('creditTransactions');
    const stats = () => db().collection('creditStats');
    const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
    /** Perfil real de la persona (uid == auth uid). Los Credits son por cuenta, no por identidad. */
    const findAccount = async (tx, userId) => {
        const snap = await tx.get(users().where('uid', '==', userId).limit(1));
        if (snap.empty)
            throw new creditValidation_1.CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });
        return snap.docs[0];
    };
    const balanceOf = (account) => {
        const data = account.data() || {};
        return {
            userId: String(data.uid),
            balance: num(data.creditsBalance),
            lifetimeEarned: num(data.creditsLifetimeEarned),
            lifetimeSpent: num(data.creditsLifetimeSpent),
        };
    };
    const writeStats = (tx, delta) => {
        const update = (0, creditTransactions_1.statsUpdate)(delta, increment, now);
        tx.set(stats().doc(creditTransactions_1.STATS_DOC), update, { merge: true });
        tx.set(stats().doc((0, creditTransactions_1.dailyStatsId)()), update, { merge: true });
    };
    const record = (tx, id, data) => {
        const at = now();
        const history = (data.statusHistory || [data.status]).map((status) => ({ status, at }));
        tx.set(transactions().doc(id), (0, exports.strip)(Object.assign(Object.assign({}, data), { id, statusHistory: history, createdAt: at, updatedAt: at })));
    };
    // ── Cuenta ─────────────────────────────────────────────────────────────
    /**
     * Garantiza que el perfil tenga los campos de Credits. La primera vez migra el
     * saldo de la billetera anterior (wallets/{uid}) y otorga los Credits de bienvenida.
     */
    const ensureAccount = async (rawUserId) => {
        const userId = (0, creditValidation_1.assertUserId)(rawUserId);
        return db().runTransaction(async (tx) => {
            const account = await findAccount(tx, userId);
            const data = account.data() || {};
            const initialized = typeof data.creditsBalance === 'number';
            const legacy = initialized ? null : await tx.get(db().collection('wallets').doc(userId));
            const welcomeDoc = welcome > 0 ? await tx.get(transactions().doc((0, creditTransactions_1.welcomeTransactionId)(userId))) : null;
            let balance = num(data.creditsBalance);
            let earned = num(data.creditsLifetimeEarned);
            let spent = num(data.creditsLifetimeSpent);
            let migrated = 0;
            let welcomeGranted = false;
            let granted = 0;
            let grantCount = 0;
            const patch = {};
            if (!initialized) {
                const wallet = legacy && legacy.exists ? legacy.data() || {} : {};
                migrated = Math.max(0, Math.floor(num(wallet.balance)));
                balance = migrated;
                earned = Math.max(0, Math.floor(num(wallet.totalPurchased)));
                spent = Math.max(0, Math.floor(num(wallet.totalSpent)));
                patch.creditsInitializedAt = now();
                if (migrated > 0) {
                    granted += migrated;
                    grantCount += 1;
                    record(tx, (0, creditTransactions_1.migrationTransactionId)(userId), {
                        userId,
                        type: 'grant',
                        amount: migrated,
                        balanceBefore: 0,
                        balanceAfter: migrated,
                        reason: 'Saldo anterior',
                        source: 'migration',
                        status: 'COMPLETED',
                        requestId: (0, creditTransactions_1.migrationTransactionId)(userId),
                    });
                }
            }
            if (welcomeDoc && !welcomeDoc.exists) {
                const before = balance;
                balance += welcome;
                earned += welcome;
                welcomeGranted = true;
                record(tx, (0, creditTransactions_1.welcomeTransactionId)(userId), {
                    userId,
                    type: 'grant',
                    amount: welcome,
                    balanceBefore: before,
                    balanceAfter: balance,
                    reason: 'Credits de bienvenida',
                    source: 'welcome',
                    status: 'COMPLETED',
                    requestId: (0, creditTransactions_1.welcomeTransactionId)(userId),
                });
                granted += welcome;
                grantCount += 1;
            }
            // Un solo incremento de acumulados por transacción (migración + bienvenida)
            if (granted > 0)
                writeStats(tx, { totalGranted: granted, circulating: granted, transactions: { grant: grantCount } });
            if (!initialized || welcomeGranted) {
                tx.update(account.ref, Object.assign(Object.assign({}, patch), { creditsBalance: balance, creditsLifetimeEarned: earned, creditsLifetimeSpent: spent, updatedAt: now() }));
            }
            return { userId, balance, lifetimeEarned: earned, lifetimeSpent: spent, migrated, welcomeGranted };
        });
    };
    const getBalance = async (rawUserId) => {
        const userId = (0, creditValidation_1.assertUserId)(rawUserId);
        const snap = await users().where('uid', '==', userId).limit(1).get();
        if (snap.empty)
            throw new creditValidation_1.CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });
        const data = snap.docs[0].data() || {};
        if (typeof data.creditsBalance !== 'number') {
            const created = await ensureAccount(userId);
            return { userId, balance: created.balance, lifetimeEarned: created.lifetimeEarned, lifetimeSpent: created.lifetimeSpent };
        }
        return balanceOf(snap.docs[0]);
    };
    // ── Gastar (REQUEST → PENDING → AUTHORIZED) ─────────────────────────────
    const spendCredits = async (input) => {
        const userId = (0, creditValidation_1.assertUserId)(input.userId);
        const service = (0, creditValidation_1.assertService)(input.service);
        const requestId = (0, creditValidation_1.assertRequestId)(input.requestId);
        await loadCosts();
        const amount = input.amount !== undefined ? (0, creditValidation_1.assertAmount)(input.amount) : (0, creditValidation_1.assertAmount)((0, creditCosts_1.getCreditCost)(service));
        const reason = (0, creditValidation_1.cleanText)(input.reason, 140, creditCosts_1.SERVICE_LABEL[service]);
        const source = (0, creditValidation_1.cleanText)(input.source, 60, 'wee');
        const id = (0, creditTransactions_1.usageTransactionId)(requestId);
        return db().runTransaction(async (tx) => {
            const existing = await tx.get(transactions().doc(id));
            if (existing.exists) {
                // Misma operación repetida (doble clic, reintento): no se cobra de nuevo
                const data = existing.data() || {};
                if (data.userId !== userId)
                    throw new creditValidation_1.CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
                if (data.status === 'REFUNDED' || data.status === 'FAILED') {
                    // Un requestId reembolsado no se reutiliza: evita generar gratis con una operación ya devuelta
                    throw new creditValidation_1.CreditError('ALREADY_REFUNDED', 'Esta operación ya fue reembolsada; inicia una nueva', { requestId, status: data.status });
                }
                return {
                    transactionId: id,
                    status: data.status,
                    amount: Math.abs(num(data.amount)),
                    balanceBefore: num(data.balanceBefore),
                    balanceAfter: num(data.balanceAfter),
                    duplicate: true,
                };
            }
            const account = await findAccount(tx, userId);
            const current = balanceOf(account);
            if (typeof (account.data() || {}).creditsBalance !== 'number') {
                throw new creditValidation_1.CreditError('ACCOUNT_NOT_FOUND', 'La cuenta de Credits todavía no está inicializada', { userId });
            }
            if (current.balance < amount) {
                // Saldo insuficiente: no se modifica nada
                throw new creditValidation_1.CreditError('INSUFFICIENT_CREDITS', 'No tienes suficientes Credits', { required: amount, available: current.balance, service });
            }
            const balanceAfter = current.balance - amount;
            record(tx, id, {
                userId,
                type: 'usage',
                amount: -amount,
                balanceBefore: current.balance,
                balanceAfter,
                reason,
                source,
                service,
                generationId: input.generationId,
                status: 'AUTHORIZED',
                statusHistory: ['PENDING', 'AUTHORIZED'],
                requestId,
                authorizedAmount: amount,
                meta: (0, exports.strip)(input.meta),
            });
            tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: current.lifetimeSpent + amount, updatedAt: now() });
            writeStats(tx, { totalSpent: amount, circulating: -amount, byService: { [service]: { spent: amount, count: 1 } }, transactions: { usage: 1 } });
            return { transactionId: id, status: 'AUTHORIZED', amount, balanceBefore: current.balance, balanceAfter, duplicate: false };
        });
    };
    // ── Completar (AUTHORIZED → COMPLETED, con ajuste si costó menos) ─────────
    const completeCredits = async (input) => {
        const userId = (0, creditValidation_1.assertUserId)(input.userId);
        const requestId = (0, creditValidation_1.assertRequestId)(input.requestId);
        const id = (0, creditTransactions_1.usageTransactionId)(requestId);
        return db().runTransaction(async (tx) => {
            const usage = await tx.get(transactions().doc(id));
            if (!usage.exists)
                throw new creditValidation_1.CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });
            const data = usage.data() || {};
            if (data.userId !== userId)
                throw new creditValidation_1.CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
            const status = data.status;
            if (status !== 'AUTHORIZED') {
                // COMPLETED: repetición inofensiva. FAILED/REFUNDED: ya se devolvió; no hay nada que completar.
                return { status, refunded: 0, balanceAfter: num(data.balanceAfter) };
            }
            const authorized = num(data.authorizedAmount) || Math.abs(num(data.amount));
            const final = input.finalAmount === undefined ? authorized : Math.min(authorized, Math.max(0, Math.floor(input.finalAmount)));
            const diff = authorized - final;
            const account = await findAccount(tx, userId);
            const current = balanceOf(account);
            const history = [...(data.statusHistory || []), { status: 'COMPLETED', at: now() }];
            const meta = input.meta ? Object.assign(Object.assign({}, (data.meta || {})), (0, exports.strip)(input.meta)) : data.meta;
            tx.update(usage.ref, (0, exports.strip)({ status: 'COMPLETED', finalAmount: final, statusHistory: history, completedAt: now(), updatedAt: now(), meta }));
            let balanceAfter = current.balance;
            if (diff > 0) {
                balanceAfter = current.balance + diff;
                record(tx, (0, creditTransactions_1.adjustmentTransactionId)(requestId), {
                    userId,
                    type: 'refund',
                    amount: diff,
                    balanceBefore: current.balance,
                    balanceAfter,
                    reason: 'Ajuste: costó menos de lo reservado',
                    source: (0, creditValidation_1.cleanText)(data.source, 60, 'wee'),
                    service: data.service,
                    generationId: data.generationId,
                    status: 'COMPLETED',
                    requestId,
                    refundOf: id,
                });
                tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: Math.max(0, current.lifetimeSpent - diff), updatedAt: now() });
                writeStats(tx, { totalRefunded: diff, circulating: diff, byService: data.service ? { [data.service]: { refunded: diff } } : undefined, transactions: { refund: 1 } });
            }
            return { status: 'COMPLETED', refunded: diff, balanceAfter };
        });
    };
    // ── Reembolsar (AUTHORIZED → FAILED → REFUNDED), sin doble reembolso ──────
    const refundCredits = async (input) => {
        const userId = (0, creditValidation_1.assertUserId)(input.userId);
        const requestId = (0, creditValidation_1.assertRequestId)(input.requestId);
        const usageId = (0, creditTransactions_1.usageTransactionId)(requestId);
        const refundId = (0, creditTransactions_1.refundTransactionId)(requestId);
        return db().runTransaction(async (tx) => {
            const usage = await tx.get(transactions().doc(usageId));
            if (!usage.exists)
                throw new creditValidation_1.CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });
            const data = usage.data() || {};
            if (data.userId !== userId)
                throw new creditValidation_1.CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
            const status = data.status;
            if (status === 'REFUNDED') {
                const previous = await tx.get(transactions().doc(refundId));
                const prev = previous.data() || {};
                return { transactionId: refundId, amount: num(prev.amount), balanceAfter: num(prev.balanceAfter), duplicate: true };
            }
            if (status === 'COMPLETED' && !input.force) {
                throw new creditValidation_1.CreditError('NOT_REFUNDABLE', 'Esta operación ya se completó', { requestId, status });
            }
            // Se devuelve exactamente lo que se cobró (lo autorizado menos ajustes ya devueltos)
            const authorized = num(data.authorizedAmount) || Math.abs(num(data.amount));
            const alreadyAdjusted = status === 'COMPLETED' && typeof data.finalAmount === 'number' ? authorized - num(data.finalAmount) : 0;
            const amount = Math.max(0, authorized - alreadyAdjusted);
            const account = await findAccount(tx, userId);
            const current = balanceOf(account);
            const balanceAfter = current.balance + amount;
            const history = [...(data.statusHistory || []), ...(status === 'FAILED' ? [] : [{ status: 'FAILED', at: now() }]), { status: 'REFUNDED', at: now() }];
            tx.update(usage.ref, { status: 'REFUNDED', statusHistory: history, refundedAt: now(), updatedAt: now(), failureReason: (0, creditValidation_1.cleanText)(input.reason, 140, undefined) });
            record(tx, refundId, {
                userId,
                type: 'refund',
                amount,
                balanceBefore: current.balance,
                balanceAfter,
                reason: (0, creditValidation_1.cleanText)(input.reason, 140, 'Reembolso por generación fallida'),
                source: (0, creditValidation_1.cleanText)(input.source, 60, (0, creditValidation_1.cleanText)(data.source, 60, 'wee')),
                service: data.service,
                generationId: data.generationId,
                status: 'COMPLETED',
                requestId,
                refundOf: usageId,
            });
            if (amount > 0) {
                tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: Math.max(0, current.lifetimeSpent - amount), updatedAt: now() });
            }
            writeStats(tx, { totalRefunded: amount, circulating: amount, failed: 1, byService: data.service ? { [data.service]: { refunded: amount } } : undefined, transactions: { refund: 1 } });
            return { transactionId: refundId, amount, balanceAfter, duplicate: false };
        });
    };
    // ── Otorgar (compra validada, regalo, bienvenida) ────────────────────────
    const grantCredits = async (input) => {
        const userId = (0, creditValidation_1.assertUserId)(input.userId);
        const amount = (0, creditValidation_1.assertAmount)(input.amount);
        const type = input.type === 'purchase' ? 'purchase' : 'grant';
        if (type === 'purchase' && !input.purchaseId)
            throw new creditValidation_1.CreditError('INVALID_REQUEST', 'Una compra necesita purchaseId');
        const requestId = input.purchaseId ? (0, creditValidation_1.assertRequestId)(input.purchaseId) : (0, creditValidation_1.assertRequestId)(input.requestId);
        const id = type === 'purchase' ? (0, creditTransactions_1.purchaseTransactionId)(requestId) : (0, creditTransactions_1.grantTransactionId)(requestId);
        const reason = (0, creditValidation_1.cleanText)(input.reason, 140, type === 'purchase' ? 'Compra de Credits' : 'Credits de regalo');
        const source = (0, creditValidation_1.cleanText)(input.source, 60, type);
        return db().runTransaction(async (tx) => {
            const existing = await tx.get(transactions().doc(id));
            if (existing.exists) {
                const data = existing.data() || {};
                if (data.userId !== userId)
                    throw new creditValidation_1.CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');
                return { transactionId: id, amount: num(data.amount), balanceAfter: num(data.balanceAfter), duplicate: true };
            }
            const account = await findAccount(tx, userId);
            const current = balanceOf(account);
            const balanceAfter = current.balance + amount;
            record(tx, id, {
                userId,
                type,
                amount,
                balanceBefore: current.balance,
                balanceAfter,
                reason,
                source,
                purchaseId: input.purchaseId,
                status: 'COMPLETED',
                requestId,
                meta: (0, exports.strip)(Object.assign(Object.assign({}, (input.meta || {})), { priceUsd: input.priceUsd })),
            });
            tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeEarned: current.lifetimeEarned + amount, updatedAt: now() });
            writeStats(tx, {
                totalPurchased: type === 'purchase' ? amount : 0,
                totalGranted: type === 'grant' ? amount : 0,
                circulating: amount,
                revenueUsd: type === 'purchase' && input.priceUsd ? Number(input.priceUsd) : 0,
                transactions: { [type]: 1 },
            });
            return { transactionId: id, amount, balanceAfter, duplicate: false };
        });
    };
    // ── Consultas ──────────────────────────────────────────────────────────
    const getCreditHistory = async (rawUserId, limit) => {
        const userId = (0, creditValidation_1.assertUserId)(rawUserId);
        const snap = await transactions().where('userId', '==', userId).orderBy('createdAt', 'desc').limit((0, creditValidation_1.assertLimit)(limit)).get();
        return snap.docs.map((d) => (Object.assign({ id: d.id }, (d.data() || {}))));
    };
    const getCost = async (service) => {
        await loadCosts();
        return (0, creditCosts_1.getCreditCost)((0, creditValidation_1.assertService)(service));
    };
    return { ensureAccount, getBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS };
}
/** Instancia de producción (Firestore real, inicializado por functions/src/index.ts). */
exports.creditEngine = createCreditEngine({
    db: () => (0, firestore_1.getFirestore)(),
    increment: (n) => firestore_1.FieldValue.increment(n),
    now: () => firestore_1.Timestamp.now(),
    welcomeCredits: creditCosts_1.WELCOME_CREDITS,
    loadCosts: () => (0, creditCosts_1.loadCostOverrides)(),
});
//# sourceMappingURL=creditEngine.js.map