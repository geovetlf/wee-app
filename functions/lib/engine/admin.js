"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.engineAdmin = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const index_1 = require("./index");
const registry_1 = require("./registry");
const config_1 = require("./config");
/**
 * Administración del engine sin tocar código (Firestore):
 *   aiProviders/{id}      { enabled, priority, models: { [modelo]: { enabled, quality, speed, cost, maxDurationSec } }, limits, note }
 *   aiRouting/{capacidad} { chain: [{ provider, model?, minQuality?, maxQuality? }], policy }
 *   aiSettings/global     { pricingMode, creditsPerUsd, margin, defaultPolicy, allowMockFallback, timeoutsMs, circuitBreaker }
 *
 * Solo administradores: custom claim `admin: true` o uid en WEE_ADMIN_UIDS.
 * Un panel visual puede construirse encima de esta función más adelante.
 */
const db = () => (0, firestore_1.getFirestore)();
const POLICIES = ['quality-first', 'balanced', 'cost-first'];
const assertAdmin = (auth) => {
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const allowed = (process.env.WEE_ADMIN_UIDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (auth.token.admin === true || allowed.includes(auth.uid))
        return;
    throw new https_1.HttpsError('permission-denied', 'Solo administración');
};
const validateChain = (chain) => {
    if (!Array.isArray(chain))
        throw new https_1.HttpsError('invalid-argument', 'chain debe ser una lista');
    return chain.map((link) => {
        const provider = String((link === null || link === void 0 ? void 0 : link.provider) || '');
        if (!registry_1.ADAPTERS[provider])
            throw new https_1.HttpsError('invalid-argument', `Proveedor desconocido: ${provider}`);
        const out = { provider };
        if (link.model)
            out.model = String(link.model);
        if (link.minQuality)
            out.minQuality = link.minQuality;
        if (link.maxQuality)
            out.maxQuality = link.maxQuality;
        return out;
    });
};
exports.engineAdmin = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 60 }, async (request) => {
    assertAdmin(request.auth);
    const data = (request.data || {});
    const action = String(data.action || 'status');
    switch (action) {
        case 'status':
            return index_1.engine.status();
        case 'seedDefaults': {
            const overwrite = data.overwrite === true;
            const batch = db().batch();
            let written = 0;
            for (const [id, conf] of Object.entries(registry_1.DEFAULT_PROVIDERS)) {
                const ref = db().collection('aiProviders').doc(id);
                if (!overwrite && (await ref.get()).exists)
                    continue;
                batch.set(ref, Object.assign(Object.assign({}, conf), { updatedAt: firestore_1.Timestamp.now() }), { merge: true });
                written++;
            }
            for (const [capability, routing] of Object.entries(registry_1.DEFAULT_ROUTING)) {
                const ref = db().collection('aiRouting').doc(capability);
                if (!overwrite && (await ref.get()).exists)
                    continue;
                batch.set(ref, { chain: routing.chain, policy: routing.policy, updatedAt: firestore_1.Timestamp.now() }, { merge: true });
                written++;
            }
            const settingsRef = db().collection('aiSettings').doc('global');
            if (overwrite || !(await settingsRef.get()).exists) {
                batch.set(settingsRef, Object.assign(Object.assign({}, registry_1.DEFAULT_SETTINGS), { updatedAt: firestore_1.Timestamp.now() }), { merge: true });
                written++;
            }
            await batch.commit();
            (0, config_1.invalidateConfig)();
            return { written };
        }
        case 'setProvider': {
            const id = String(data.id || '');
            if (!registry_1.ADAPTERS[id])
                throw new https_1.HttpsError('invalid-argument', `Proveedor desconocido: ${id}`);
            const patch = { updatedAt: firestore_1.Timestamp.now() };
            if (typeof data.enabled === 'boolean')
                patch.enabled = data.enabled;
            if (typeof data.priority === 'number')
                patch.priority = data.priority;
            if (data.models && typeof data.models === 'object')
                patch.models = data.models;
            if (data.limits && typeof data.limits === 'object')
                patch.limits = data.limits;
            if (typeof data.note === 'string')
                patch.note = data.note;
            await db().collection('aiProviders').doc(id).set(patch, { merge: true });
            (0, config_1.invalidateConfig)();
            return { ok: true };
        }
        case 'setRouting': {
            const capability = String(data.capability || '');
            if (!(capability in registry_1.DEFAULT_ROUTING))
                throw new https_1.HttpsError('invalid-argument', `Capacidad desconocida: ${capability}`);
            const patch = { updatedAt: firestore_1.Timestamp.now() };
            if (data.chain !== undefined)
                patch.chain = validateChain(data.chain);
            if (data.policy !== undefined) {
                if (!POLICIES.includes(data.policy))
                    throw new https_1.HttpsError('invalid-argument', 'policy inválida');
                patch.policy = data.policy;
            }
            await db().collection('aiRouting').doc(capability).set(patch, { merge: true });
            (0, config_1.invalidateConfig)();
            return { ok: true };
        }
        case 'setSettings': {
            const allowed = ['pricingMode', 'creditsPerUsd', 'margin', 'defaultPolicy', 'allowMockFallback', 'timeoutsMs', 'circuitBreaker'];
            const patch = { updatedAt: firestore_1.Timestamp.now() };
            for (const key of allowed)
                if (data[key] !== undefined)
                    patch[key] = data[key];
            await db().collection('aiSettings').doc('global').set(patch, { merge: true });
            (0, config_1.invalidateConfig)();
            return { ok: true };
        }
        case 'resetHealth':
            index_1.engine.health.reset(data.id ? String(data.id) : undefined);
            return { ok: true };
        default:
            throw new https_1.HttpsError('invalid-argument', `Acción desconocida: ${action}`);
    }
});
//# sourceMappingURL=admin.js.map