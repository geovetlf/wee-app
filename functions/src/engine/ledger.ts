import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GenerationRecord, GenerationStatus } from './types';

/**
 * Libro de generaciones: aiGenerations/{id}.
 * Cada intento (incluidos los fallbacks) deja un documento con usuario,
 * proveedor, modelo, tipo, coste estimado y real, Credits, estado, duración y
 * error. La persona puede leer los suyos; solo el servidor escribe.
 * Además acumula por día en aiUsage/{día} para el panel de administración.
 */
export interface Ledger {
  open(record: Omit<GenerationRecord, 'id' | 'createdAt' | 'status' | 'durationMs' | 'actualUsd' | 'credits'> & { actualUsd?: number; credits?: number }): Promise<string>;
  close(id: string, patch: { status: GenerationStatus; actualUsd: number; credits: number; durationMs: number; error?: string; usage?: Record<string, number> }): Promise<void>;
}

const db = () => getFirestore();

export const firestoreLedger: Ledger = {
  async open(record) {
    const ref = db().collection('aiGenerations').doc();
    await ref.set({
      ...record,
      status: 'running',
      actualUsd: record.actualUsd ?? 0,
      credits: record.credits ?? 0,
      durationMs: 0,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  },
  async close(id, patch) {
    const ref = db().collection('aiGenerations').doc(id);
    const snap = await ref.get();
    const record = (snap.data() || {}) as Partial<GenerationRecord>;
    const clean: Record<string, unknown> = { ...patch, finishedAt: Timestamp.now() };
    if (clean.error === undefined) delete clean.error;
    if (clean.usage === undefined) delete clean.usage;
    const day = new Date().toISOString().slice(0, 10);
    const provider = record.provider || 'unknown';
    const capability = record.capability || 'unknown';
    await Promise.all([
      ref.set(clean, { merge: true }),
      db()
        .collection('aiUsage')
        .doc(day)
        .set(
          {
            [capability]: {
              [provider]: {
                calls: FieldValue.increment(1),
                failed: FieldValue.increment(patch.status === 'failed' ? 1 : 0),
                usd: FieldValue.increment(patch.actualUsd || 0),
                credits: FieldValue.increment(patch.credits || 0),
                latencyMs: FieldValue.increment(patch.durationMs || 0),
              },
            },
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        ),
    ]);
  },
};

/** Libro en memoria para pruebas unitarias. */
export const memoryLedger = (): Ledger & { records: Record<string, Record<string, unknown>> } => {
  const records: Record<string, Record<string, unknown>> = {};
  let counter = 0;
  return {
    records,
    async open(record) {
      const id = `gen-${++counter}`;
      records[id] = { ...record, status: 'running' };
      return id;
    },
    async close(id, patch) {
      records[id] = { ...(records[id] || {}), ...patch };
    },
  };
};
