import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GenerationRecord, GenerationStatus } from './types';

/**
 * Libro de generaciones: aiGenerations/{generationId} (docs/CREDITS.md §generations).
 * Cada intento (incluidos los fallbacks) deja un documento con requestId, usuario,
 * servicio, proveedor, modelo, estado (PENDING → PROCESSING → COMPLETED | FAILED),
 * coste del proveedor (providerCost, USD) separado de los Credits cobrados
 * (creditsCharged), transacción de Credits, tipos de entrada/salida y tiempos.
 * La persona puede leer los suyos; solo el servidor escribe.
 * Además acumula por día en aiUsage/{día} para el panel de administración.
 */
export type OpenRecord = Omit<GenerationRecord, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'status' | 'durationMs' | 'providerCost' | 'providerCurrency' | 'creditsCharged'>;

export interface CloseRecord {
  status: Extract<GenerationStatus, 'COMPLETED' | 'FAILED' | 'CANCELLED'>;
  providerCost: number;
  creditsCharged: number;
  durationMs: number;
  outputType?: string;
  error?: string;
  usage?: Record<string, number>;
}

export interface Ledger {
  open(record: OpenRecord): Promise<string>;
  close(id: string, patch: CloseRecord): Promise<void>;
}

const db = () => getFirestore();

const stripUndefined = <T extends Record<string, unknown>>(value: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = v;
  return out as T;
};

export const firestoreLedger: Ledger = {
  async open(record) {
    const ref = db().collection('aiGenerations').doc();
    const now = Timestamp.now();
    await ref.set(
      stripUndefined({
        ...record,
        status: 'PROCESSING' as GenerationStatus,
        providerCost: 0,
        providerCurrency: 'USD',
        creditsCharged: 0,
        durationMs: 0,
        createdAt: now,
        updatedAt: now,
      })
    );
    return ref.id;
  },
  async close(id, patch) {
    const ref = db().collection('aiGenerations').doc(id);
    const snap = await ref.get();
    const record = (snap.data() || {}) as Partial<GenerationRecord>;
    const now = Timestamp.now();
    const clean = stripUndefined({ ...patch, updatedAt: now, completedAt: patch.status === 'COMPLETED' ? now : undefined });
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
                failed: FieldValue.increment(patch.status === 'FAILED' ? 1 : 0),
                usd: FieldValue.increment(patch.providerCost || 0),
                credits: FieldValue.increment(patch.creditsCharged || 0),
                latencyMs: FieldValue.increment(patch.durationMs || 0),
              },
            },
            byProvider: { [provider]: { calls: FieldValue.increment(1), usd: FieldValue.increment(patch.providerCost || 0) } },
            updatedAt: now,
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
      records[id] = { ...record, status: 'PROCESSING', providerCost: 0, providerCurrency: 'USD', creditsCharged: 0 };
      return id;
    },
    async close(id, patch) {
      records[id] = { ...(records[id] || {}), ...patch };
    },
  };
};
