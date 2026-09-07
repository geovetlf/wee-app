"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyStatsId = exports.STATS_DOC = exports.migrationTransactionId = exports.welcomeTransactionId = exports.purchaseTransactionId = exports.grantTransactionId = exports.adjustmentTransactionId = exports.refundTransactionId = exports.usageTransactionId = void 0;
exports.statsUpdate = statsUpdate;
/** Ids deterministas: la misma operación siempre cae en el mismo documento (idempotencia). */
const usageTransactionId = (requestId) => `usage_${requestId}`;
exports.usageTransactionId = usageTransactionId;
const refundTransactionId = (requestId) => `refund_${requestId}`;
exports.refundTransactionId = refundTransactionId;
const adjustmentTransactionId = (requestId) => `adjust_${requestId}`;
exports.adjustmentTransactionId = adjustmentTransactionId;
const grantTransactionId = (requestId) => `grant_${requestId}`;
exports.grantTransactionId = grantTransactionId;
const purchaseTransactionId = (purchaseId) => `purchase_${purchaseId}`;
exports.purchaseTransactionId = purchaseTransactionId;
const welcomeTransactionId = (userId) => `grant_welcome_${userId}`;
exports.welcomeTransactionId = welcomeTransactionId;
const migrationTransactionId = (userId) => `migration_${userId}`;
exports.migrationTransactionId = migrationTransactionId;
exports.STATS_DOC = 'global';
const dailyStatsId = (date = new Date()) => `daily_${date.toISOString().slice(0, 10)}`;
exports.dailyStatsId = dailyStatsId;
/** Convierte un delta en un objeto de incrementos anidados (se escribe con merge). */
function statsUpdate(delta, inc, now) {
    const out = { updatedAt: now() };
    for (const key of ['totalPurchased', 'totalGranted', 'totalSpent', 'totalRefunded', 'circulating', 'revenueUsd', 'failed']) {
        const value = delta[key];
        if (value)
            out[key] = inc(value);
    }
    if (delta.byService) {
        out.byService = Object.fromEntries(Object.entries(delta.byService).map(([service, v]) => [
            service,
            Object.fromEntries(Object.entries(v || {}).filter(([, n]) => n).map(([k, n]) => [k, inc(n)])),
        ]));
    }
    if (delta.transactions) {
        out.transactions = Object.fromEntries(Object.entries(delta.transactions).filter(([, n]) => n).map(([k, n]) => [k, inc(n)]));
    }
    return out;
}
//# sourceMappingURL=creditTransactions.js.map