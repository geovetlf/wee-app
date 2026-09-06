"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryLedger = exports.firestoreLedger = void 0;
const firestore_1 = require("firebase-admin/firestore");
const db = () => (0, firestore_1.getFirestore)();
exports.firestoreLedger = {
    async open(record) {
        var _a, _b;
        const ref = db().collection('aiGenerations').doc();
        await ref.set(Object.assign(Object.assign({}, record), { status: 'running', actualUsd: (_a = record.actualUsd) !== null && _a !== void 0 ? _a : 0, credits: (_b = record.credits) !== null && _b !== void 0 ? _b : 0, durationMs: 0, createdAt: firestore_1.Timestamp.now() }));
        return ref.id;
    },
    async close(id, patch) {
        const ref = db().collection('aiGenerations').doc(id);
        const snap = await ref.get();
        const record = (snap.data() || {});
        const clean = Object.assign(Object.assign({}, patch), { finishedAt: firestore_1.Timestamp.now() });
        if (clean.error === undefined)
            delete clean.error;
        if (clean.usage === undefined)
            delete clean.usage;
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
                        failed: firestore_1.FieldValue.increment(patch.status === 'failed' ? 1 : 0),
                        usd: firestore_1.FieldValue.increment(patch.actualUsd || 0),
                        credits: firestore_1.FieldValue.increment(patch.credits || 0),
                        latencyMs: firestore_1.FieldValue.increment(patch.durationMs || 0),
                    },
                },
                updatedAt: firestore_1.Timestamp.now(),
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
            records[id] = Object.assign(Object.assign({}, record), { status: 'running' });
            return id;
        },
        async close(id, patch) {
            records[id] = Object.assign(Object.assign({}, (records[id] || {})), patch);
        },
    };
};
exports.memoryLedger = memoryLedger;
//# sourceMappingURL=ledger.js.map