"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryLedger = exports.firestoreLedger = void 0;
const firestore_1 = require("firebase-admin/firestore");
const db = () => (0, firestore_1.getFirestore)();
const stripUndefined = (value) => {
    const out = {};
    for (const [k, v] of Object.entries(value))
        if (v !== undefined)
            out[k] = v;
    return out;
};
exports.firestoreLedger = {
    async open(record) {
        const ref = db().collection('aiGenerations').doc();
        const now = firestore_1.Timestamp.now();
        await ref.set(stripUndefined(Object.assign(Object.assign({}, record), { status: 'QUEUED', providerCost: 0, providerCurrency: 'USD', creditsCharged: 0, durationMs: 0, createdAt: now, updatedAt: now })));
        return ref.id;
    },
    async progress(id, patch) {
        await db().collection('aiGenerations').doc(id).set(stripUndefined(Object.assign(Object.assign({}, patch), { updatedAt: firestore_1.Timestamp.now() })), { merge: true });
    },
    async close(id, patch) {
        const ref = db().collection('aiGenerations').doc(id);
        const snap = await ref.get();
        const record = (snap.data() || {});
        const now = firestore_1.Timestamp.now();
        const clean = stripUndefined(Object.assign(Object.assign({}, patch), { updatedAt: now, completedAt: patch.status === 'COMPLETED' ? now : undefined }));
        const day = new Date().toISOString().slice(0, 10);
        const provider = record.provider || 'unknown';
        const capability = record.capability || 'unknown';
        await Promise.all([
            ref.set(clean, { merge: true }),
            db()
                .collection('aiUsage')
                .doc(day)
                .set({
                [capability]: {
                    [provider]: {
                        calls: firestore_1.FieldValue.increment(1),
                        failed: firestore_1.FieldValue.increment(patch.status === 'FAILED' ? 1 : 0),
                        usd: firestore_1.FieldValue.increment(patch.providerCost || 0),
                        credits: firestore_1.FieldValue.increment(patch.creditsCharged || 0),
                        latencyMs: firestore_1.FieldValue.increment(patch.durationMs || 0),
                    },
                },
                byProvider: { [provider]: { calls: firestore_1.FieldValue.increment(1), usd: firestore_1.FieldValue.increment(patch.providerCost || 0) } },
                updatedAt: now,
            }, { merge: true }),
        ]);
    },
};
/** Libro en memoria para pruebas unitarias. */
const memoryLedger = () => {
    const records = {};
    let counter = 0;
    return {
        records,
        async open(record) {
            const id = `gen-${++counter}`;
            records[id] = Object.assign(Object.assign({}, record), { status: 'QUEUED', providerCost: 0, providerCurrency: 'USD', creditsCharged: 0 });
            return id;
        },
        async progress(id, patch) {
            records[id] = Object.assign(Object.assign({}, (records[id] || {})), patch);
        },
        async close(id, patch) {
            records[id] = Object.assign(Object.assign({}, (records[id] || {})), patch);
        },
    };
};
exports.memoryLedger = memoryLedger;
//# sourceMappingURL=ledger.js.map