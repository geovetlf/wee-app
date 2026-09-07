"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limiter = exports.dayKey = exports.DEFAULT_LIMITS = void 0;
exports.createLimiter = createLimiter;
exports.providerCallsToday = providerCallsToday;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("./errors");
/**
 * Límites de uso (docs/AI-ENGINE.md §Límites): por persona y día, por modalidad
 * (imagen, video, voz…). Se reservan ANTES de cobrar y de llamar a la IA, en
 * una transacción sobre aiRateLimits/{uid}_{día}; si se supera el límite se
 * responde RATE_LIMITED sin tocar Credits. Los límites por proveedor
 * (aiProviders/{id}.limits.maxCallsPerDay) los aplica el router con aiUsage/{día}.
 */
exports.DEFAULT_LIMITS = {
    perUserPerDay: { text: 400, vision: 200, image: 80, video: 12, voice: 60, doc: 100 },
};
const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
exports.dayKey = dayKey;
function createLimiter(deps) {
    const now = deps.now || (() => firestore_1.Timestamp.now());
    return {
        /** Reserva cupo para las generaciones pedidas; lanza RATE_LIMITED si alguna modalidad se pasa. */
        async reserve(userId, counts, limits = exports.DEFAULT_LIMITS) {
            const wanted = Object.entries(counts).filter(([, n]) => (n || 0) > 0);
            if (!wanted.length)
                return;
            const ref = deps.db().collection('aiRateLimits').doc(`${userId}_${(0, exports.dayKey)()}`);
            await deps.db().runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const used = (snap.data() || {});
                const patch = { userId, day: (0, exports.dayKey)(), updatedAt: now() };
                for (const [modality, n] of wanted) {
                    const limit = limits.perUserPerDay[modality];
                    const current = Number(used[modality] || 0);
                    if (limit && limit > 0 && current + n > limit) {
                        throw new errors_1.EngineError('RATE_LIMITED', undefined, { modality, limit, used: current });
                    }
                    patch[modality] = current + n;
                }
                tx.set(ref, patch, { merge: true });
            });
        },
    };
}
exports.limiter = createLimiter({ db: () => (0, firestore_1.getFirestore)() });
/** Llamadas hechas hoy por un proveedor según aiUsage/{día}. */
function providerCallsToday(usage, provider) {
    var _a, _b, _c;
    if (!usage)
        return 0;
    const direct = (_b = (_a = usage.byProvider) === null || _a === void 0 ? void 0 : _a[provider]) === null || _b === void 0 ? void 0 : _b.calls;
    if (typeof direct === 'number')
        return direct;
    let total = 0;
    for (const [key, value] of Object.entries(usage)) {
        if (key === 'byProvider' || key === 'updatedAt' || !value || typeof value !== 'object')
            continue;
        const calls = (_c = value[provider]) === null || _c === void 0 ? void 0 : _c.calls;
        if (typeof calls === 'number')
            total += calls;
    }
    return total;
}
//# sourceMappingURL=limits.js.map