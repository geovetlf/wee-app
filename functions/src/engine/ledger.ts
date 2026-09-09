import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { strip } from '../credits/creditEngine';
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

/** Semántica actual del libro. Ver GenerationRecord.ledgerVersion. */
export const LEDGER_VERSION = 2;

export interface CloseRecord {
  status: Extract<GenerationStatus, 'COMPLETED' | 'FAILED' | 'CANCELLED'>;
  providerCost: number;
  /**
   * Precio de catálogo de este paso. Se escribe SIEMPRE, haya cobro o no: es lo
   * que la operación vale, no lo que se cobró. Cerrar una generación ya no
   * declara ningún cobro, porque en ese momento la transacción sigue autorizada
   * y todavía puede reembolsarse entera.
   */
  creditsEstimated?: number;
  durationMs: number;
  outputType?: string;
  error?: string;
  usage?: Record<string, number>;
  videoDurationSec?: number;
  resolution?: string;
  /**
   * Dimensiones REALES de la salida, tal como las envió el adaptador. Las decide
   * la Weë Resolution Policy y viajan Policy → ResolutionPlan → input → adaptador;
   * el libro solo copia lo que el adaptador declara haber usado. Si el proveedor
   * no las declara, no se escriben: nunca se deducen aquí.
   */
  width?: number;
  height?: number;
  providerTokens?: number;
  providerMeta?: Record<string, unknown>;
}

/** Avance de una tarea asíncrona: el proveedor la aceptó (QUEUED → PROCESSING). */
export interface ProgressRecord {
  status: Extract<GenerationStatus, 'PROCESSING'>;
  providerTaskId?: string;
  estimatedTokens?: number;
  estimatedUsd?: number;
  resolution?: string;
}

/** Desenlace de una transacción, ya conocido. */
export interface SettleRecord {
  /** Transacción de Credits cuyo desenlace se liquida. */
  creditTransactionId: string;
  /** Credits realmente capturados. 0 si se reembolsó todo. */
  finalAmount: number;
}

export interface SettleResult {
  /** Filas liquidadas en esta llamada. */
  rows: number;
  /** Credits acumulados como ingreso en esta llamada. */
  credited: number;
  /** Ya estaba liquidada: no se volvió a aplicar nada. */
  already: boolean;
}

export interface Ledger {
  open(record: OpenRecord): Promise<string>;
  progress(id: string, patch: ProgressRecord): Promise<void>;
  close(id: string, patch: CloseRecord): Promise<void>;
  settle(patch: SettleRecord): Promise<SettleResult>;
}

/**
 * Reparto contable de los Credits capturados entre los pasos que sí produjeron
 * resultado, en proporción a lo que vale cada uno.
 *
 * No es una política comercial: es la forma de que las filas sumen EXACTAMENTE
 * lo que se cobró, ni un Credit más ni uno menos. Con enteros el reparto
 * proporcional deja resto, y ese resto va a los pasos de mayor peso —y a igual
 * peso, al primero— para que el resultado sea siempre el mismo.
 */
export function distribute(finalAmount: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (finalAmount <= 0 || total <= 0 || !weights.length) return weights.map(() => 0);
  const out = weights.map((w) => Math.floor((finalAmount * w) / total));
  let resto = finalAmount - out.reduce((a, b) => a + b, 0);
  const orden = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i);
  for (let k = 0; resto > 0; k++, resto--) out[orden[k % orden.length].i]++;
  return out;
}

const db = () => getFirestore();

/**
 * Firestore rechaza el documento entero si encuentra un undefined A CUALQUIER
 * PROFUNDIDAD. Aquí llegan objetos anidados que el motor no controla: providerMeta
 * es lo que devuelve cada adaptador (Record<string, unknown>, así que el tipo no
 * impide que un campo opcional venga sin valor) y usage. Una limpieza de un solo
 * nivel dejaba pasar esos undefined y el cierre reventaba DESPUÉS de que el
 * proveedor ya hubiera cobrado y generado.
 *
 * Se reutiliza la limpieza profunda del Credit Engine en lugar de escribir otra:
 * quita únicamente undefined y conserva 0, false, null y "" (que significan algo)
 * y los Timestamp (no son objetos planos, pasan intactos).
 */
const stripUndefined = strip;

export const firestoreLedger: Ledger = {
  async open(record) {
    const ref = db().collection('aiGenerations').doc();
    const now = Timestamp.now();
    await ref.set(
      stripUndefined({
        ...record,
        status: 'QUEUED' as GenerationStatus,
        providerCost: 0,
        providerCurrency: 'USD',
        // creditsCharged NO se inicializa: su ausencia significa "sin liquidar".
        ledgerVersion: LEDGER_VERSION,
        durationMs: 0,
        createdAt: now,
        updatedAt: now,
      })
    );
    return ref.id;
  },
  async progress(id, patch) {
    await db().collection('aiGenerations').doc(id).set(stripUndefined({ ...patch, updatedAt: Timestamp.now() }), { merge: true });
  },
  settle: settleFirestore,
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
                // Dinero real del proveedor y llamadas: ocurrieron de verdad aunque
                // después se reembolse, así que se acumulan siempre. Los Credits NO
                // se acumulan aquí: hasta que la transacción se liquide no se sabe
                // si hubo ingreso. Lo hace ledger.settle().
                usd: FieldValue.increment(patch.providerCost || 0),
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

/**
 * LIQUIDACIÓN: el único punto que puede afirmar "esto se cobró".
 *
 * Se llama cuando la transacción ya terminó (COMPLETED o REFUNDED) y reparte el
 * importe realmente capturado entre las filas de esa transacción. Es IDEMPOTENTE:
 * si alguna fila ya tiene settledAt, no vuelve a repartir ni a acumular ingreso.
 */
async function settleFirestore(patch: SettleRecord): Promise<SettleResult> {
  const { creditTransactionId, finalAmount } = patch;
  if (!creditTransactionId) return { rows: 0, credited: 0, already: false };

  const snap = await db().collection('aiGenerations').where('creditTransactionId', '==', creditTransactionId).get();
  if (snap.empty) return { rows: 0, credited: 0, already: false };
  // Guarda de idempotencia: basta una fila liquidada para saber que ya se hizo.
  if (snap.docs.some((d) => d.get('settledAt'))) return { rows: 0, credited: 0, already: true };

  const now = Timestamp.now();
  // Solo los pasos que produjeron resultado pueden llevar cobro; los fallidos, 0.
  const cobrables = snap.docs.filter((d) => d.get('status') === 'COMPLETED');
  const pesos = cobrables.map((d) => Number(d.get('creditsEstimated') || 0));
  const reparto = distribute(Math.max(0, Math.floor(finalAmount)), pesos);
  const porFila = new Map<string, number>();
  cobrables.forEach((d, i) => porFila.set(d.id, reparto[i] || 0));

  const batch = db().batch();
  for (const d of snap.docs) {
    batch.set(d.ref, { creditsCharged: porFila.get(d.id) ?? 0, settledAt: now, updatedAt: now, ledgerVersion: LEDGER_VERSION }, { merge: true });
  }
  await batch.commit();

  const credited = reparto.reduce((a, b) => a + b, 0);
  if (credited > 0) {
    /*
     * Cada paso acumula SU parte en SU cubo, con el mismo reparto que se acaba de
     * escribir fila a fila. Antes el importe entero caía en el cubo de la PRIMERA
     * fila de la consulta: un trabajo de Chef apuntaba los 5 Credits a
     * gemini/text.generate y dejaba flux/image.generate en 0, aunque cada fila
     * llevara su creditsCharged correcto. No hay política nueva —el reparto ya
     * estaba en `porFila`—: lo que se corrige es dejar de colapsarlo.
     *
     * El ingreso sigue yendo al día en que se COBRÓ cada paso y no al de la
     * liquidación; ahora cada fila aporta además su propia fecha.
     */
    const porDia: Record<string, Record<string, Record<string, number>>> = {};
    for (const d of cobrables) {
      const parte = porFila.get(d.id) || 0;
      if (parte <= 0) continue;
      const dia = String(d.get('createdAt')?.toDate?.().toISOString?.() || now.toDate().toISOString()).slice(0, 10);
      const capacidades = (porDia[dia] = porDia[dia] || {});
      const proveedores = (capacidades[String(d.get('capability') || 'unknown')] = capacidades[String(d.get('capability') || 'unknown')] || {});
      // Dos pasos del mismo proveedor y capacidad se SUMAN antes de escribir: si se
      // escribieran por separado, la segunda clave pisaría el increment de la primera.
      const proveedor = String(d.get('provider') || 'unknown');
      proveedores[proveedor] = (proveedores[proveedor] || 0) + parte;
    }
    await Promise.all(
      Object.entries(porDia).map(([dia, capacidades]) => {
        const doc: Record<string, unknown> = { updatedAt: now };
        for (const [capability, proveedores] of Object.entries(capacidades)) {
          doc[capability] = Object.fromEntries(Object.entries(proveedores).map(([provider, parte]) => [provider, { credits: FieldValue.increment(parte) }]));
        }
        return db().collection('aiUsage').doc(dia).set(doc, { merge: true });
      })
    );
  }
  return { rows: snap.size, credited, already: false };
}

/** Libro en memoria para pruebas unitarias. */
export const memoryLedger = (): Ledger & { records: Record<string, Record<string, unknown>>; usage: { credits: number } } => {
  const records: Record<string, Record<string, unknown>> = {};
  const usage = { credits: 0 };
  let counter = 0;
  let sello = 0;
  return {
    records,
    usage,
    async open(record) {
      const id = `gen-${++counter}`;
      records[id] = { ...record, status: 'QUEUED', providerCost: 0, providerCurrency: 'USD', ledgerVersion: LEDGER_VERSION };
      return id;
    },
    async progress(id, patch) {
      records[id] = { ...(records[id] || {}), ...patch };
    },
    async close(id, patch) {
      records[id] = { ...(records[id] || {}), ...patch };
    },
    async settle(patch) {
      const filas = Object.entries(records).filter(([, r]) => r.creditTransactionId === patch.creditTransactionId);
      if (!filas.length) return { rows: 0, credited: 0, already: false };
      if (filas.some(([, r]) => r.settledAt)) return { rows: 0, credited: 0, already: true };
      const cobrables = filas.filter(([, r]) => r.status === 'COMPLETED');
      const reparto = distribute(Math.max(0, Math.floor(patch.finalAmount)), cobrables.map(([, r]) => Number(r.creditsEstimated || 0)));
      const porFila = new Map(cobrables.map(([id], i) => [id, reparto[i] || 0]));
      const ahora = ++sello;
      for (const [id] of filas) records[id] = { ...records[id], creditsCharged: porFila.get(id) ?? 0, settledAt: ahora, ledgerVersion: LEDGER_VERSION };
      const credited = reparto.reduce((a, b) => a + b, 0);
      usage.credits += credited;
      return { rows: filas.length, credited, already: false };
    },
  };
};
