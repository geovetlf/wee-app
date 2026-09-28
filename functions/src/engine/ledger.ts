import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { strip } from '../credits/creditEngine';
import { GenerationRecord, GenerationStatus, ProviderCostSource, ProviderCostStatus } from './types';

/**
 * Libro de generaciones: aiGenerations/{generationId} (docs/CREDITS.md §generations).
 * Cada intento (incluidos los fallbacks) deja un documento con requestId, usuario,
 * servicio, proveedor, modelo, estado (PENDING → PROCESSING → COMPLETED | FAILED),
 * coste del proveedor (providerCost, USD) separado de los Credits cobrados
 * (creditsCharged), transacción de Credits, tipos de entrada/salida y tiempos.
 * La persona puede leer los suyos; solo el servidor escribe.
 * Además acumula por día en aiUsage/{día} para el panel de administración.
 *
 * Las filas del Core (F1-D, tras el canary real) llevan además el coste SEPARADO
 * en tres campos que no se mezclan: `estimatedProviderCost` (lo estimado),
 * `actualProviderCost` (lo real, o `null`) y `providerCostStatus` (estimated ·
 * actual · unavailable). Un coste que no se conoce nunca se escribe como 0.
 */
/**
 * EL DÍA DE UNA OPERACIÓN ES EL DÍA UTC EN QUE SE CREÓ.
 *
 * Una sola definición para todo el libro. La había en dos sitios y no decían lo
 * mismo: `close()` preguntaba la hora al sistema (`new Date()`) y `settle()`
 * miraba el `createdAt` de la fila. Mientras nada cruzara medianoche daba igual;
 * en cuanto una generación empezaba a las 23:59 UTC y terminaba a las 00:01, el
 * dinero del proveedor quedaba apuntado en un día y los Credits en el siguiente,
 * y el resumen diario no cuadraba nunca (fase 2E-66).
 *
 * Se elige `createdAt` porque un trabajo pertenece al día en que se pidió, no al
 * azar de cuánto tardó el proveedor en contestar.
 *
 * `respaldo` es el reloj que ya trae quien llama —nunca `new Date()`—, para que
 * el tiempo se pueda controlar desde fuera y las pruebas signifiquen algo.
 */
export const diaDelLibro = (createdAt: unknown, respaldo: Timestamp): string => {
  const fecha = (createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  return (fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha : respaldo.toDate()).toISOString().slice(0, 10);
};

export type OpenRecord = Omit<GenerationRecord, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'status' | 'durationMs' | 'providerCost' | 'providerCurrency' | 'creditsCharged'>;

/** Semántica actual del libro. Ver GenerationRecord.ledgerVersion. */
export const LEDGER_VERSION = 2;

export interface CloseRecord {
  status: Extract<GenerationStatus, 'COMPLETED' | 'FAILED' | 'CANCELLED'>;
  /**
   * El coste del proveedor. Las filas de siempre lo mandan siempre; las que
   * llevan el coste separado, SOLO cuando se conoce (`actualProviderCost`).
   */
  providerCost?: number;
  /* ── El coste, separado: solo quien abrió la fila con `providerCostStatus` ── */
  actualProviderCost?: number | null;
  providerCostStatus?: ProviderCostStatus;
  providerCostSource?: ProviderCostSource;
  providerUsageTokens?: number;
  providerRateUsdPerMillionTokens?: number;
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
  /** La estimación del ADAPTADOR al aceptar (tokens × tarifa), que afina la del catálogo. Sigue siendo estimación. */
  estimatedProviderCost?: number;
  /** La tarifa con la que el proveedor valorará lo que consuma. Hace falta para convertir su consumo en dinero al final. */
  providerRateUsdPerMillionTokens?: number;
}

/**
 * EL FINAL DE UNA OPERACIÓN ASÍNCRONA, dicho por el proveedor.
 *
 * Se busca la fila por cómo llama el proveedor a la tarea —lo que el aviso y la
 * pregunta traen—, no por nada que diga el mensaje sobre de quién es.
 */
export interface CloseOperationRecord {
  provider: string;
  providerTaskId: string;
  status: Extract<GenerationStatus, 'COMPLETED' | 'FAILED'>;
  /** Lo que el proveedor DECLARÓ haber consumido. Ausente = no lo dijo, que no es lo mismo que cero. */
  reportedTokens?: number;
}

export interface CloseOperationResult {
  /** Filas cerradas en esta llamada: 0 o 1. */
  closed: number;
  /** Ya estaba cerrada: no se tocó nada ni se volvió a sumar nada. */
  already: boolean;
  /** No hay fila del Core con esa tarea. No es un fallo: el camino de siempre no las abre así. */
  found: boolean;
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
  /**
   * Cerrar la fila de una operación asíncrona cuando el proveedor ya dijo cómo
   * acabó. IDEMPOTENTE: la segunda vez no cambia nada ni vuelve a sumar nada.
   * Opcional para que un libro de prueba escrito a mano siga valiendo.
   */
  closeOperation?(patch: CloseOperationRecord): Promise<CloseOperationResult>;
}

/**
 * LO QUE VALE UN CONSUMO DECLARADO, a la tarifa declarada. Pura.
 *
 * Solo con los dos números de verdad: un consumo que el proveedor no dijo, o una
 * tarifa que el adaptador no declaró, no dan un coste —dan `null`—. Cero tokens
 * es un consumo legítimo y vale cero.
 */
export const costeDeUnConsumo = (tokens: unknown, usdPorMillon: unknown): number | null => {
  const t = typeof tokens === 'number' && Number.isFinite(tokens) && tokens >= 0 ? tokens : undefined;
  const r = typeof usdPorMillon === 'number' && Number.isFinite(usdPorMillon) && usdPorMillon >= 0 ? usdPorMillon : undefined;
  return t === undefined || r === undefined ? null : (t * r) / 1_000_000;
};

/**
 * EL CIERRE DE UNA OPERACIÓN ASÍNCRONA, decidido sobre la fila GUARDADA. Pura.
 *
 * Devuelve `null` cuando no hay nada que hacer: una fila del camino de siempre
 * (no lleva `providerCostStatus` y no se toca), o una que ya se cerró.
 */
export const cierreDeOperacion = (
  fila: Record<string, unknown>,
  patch: CloseOperationRecord,
): { campos: Record<string, unknown>; actual: number | null } | null => {
  if (fila.providerCostStatus === undefined) return null;
  const cerrada = fila.status === 'COMPLETED' || fila.status === 'FAILED' || fila.status === 'CANCELLED';
  if (cerrada && fila.providerCostStatus !== 'estimated') return null;
  const actual = costeDeUnConsumo(patch.reportedTokens, fila.providerRateUsdPerMillionTokens);
  return {
    actual,
    campos: {
      status: patch.status,
      actualProviderCost: actual,
      providerCostStatus: actual === null ? 'unavailable' : 'actual',
      ...(actual !== null ? { providerCost: actual, providerCostSource: 'provider_usage' } : {}),
      ...(typeof patch.reportedTokens === 'number' && Number.isFinite(patch.reportedTokens) && patch.reportedTokens >= 0
        ? { providerUsageTokens: patch.reportedTokens } : {}),
    },
  };
};

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

/**
 * LA APERTURA DEL COSTE. La fila de siempre nace con `providerCost: 0` y la cierra
 * quien la abrió. La que llega con el coste SEPARADO nace sin coste real —`null`,
 * que es «todavía no se sabe»— y sin `providerCost`: un 0 aquí era el que se
 * quedaba escrito cuando el vídeo terminaba fuera de la llamada.
 */
const costeAlAbrir = (record: OpenRecord): Record<string, unknown> =>
  (record.providerCostStatus !== undefined ? { actualProviderCost: null } : { providerCost: 0 });

/** Lo que una fila cerrada suma al resumen del día, contado igual en `close` y en `closeOperation`. */
const sumaDelDia = (p: { status: string; providerCost?: number; durationMs?: number; sinCoste: boolean }) => ({
  calls: FieldValue.increment(1),
  failed: FieldValue.increment(p.status === 'FAILED' ? 1 : 0),
  // Dinero real del proveedor y llamadas: ocurrieron de verdad aunque
  // después se reembolse, así que se acumulan siempre. Los Credits NO
  // se acumulan aquí: hasta que la transacción se liquide no se sabe
  // si hubo ingreso. Lo hace ledger.settle().
  usd: FieldValue.increment(p.providerCost || 0),
  latencyMs: FieldValue.increment(p.durationMs || 0),
  /* Las que terminaron SIN coste conocido se cuentan aparte: sumarlas como cero escondería el hueco. */
  ...(p.sinCoste ? { unpricedCalls: FieldValue.increment(1) } : {}),
});

export const firestoreLedger: Ledger = {
  async open(record) {
    const ref = db().collection('aiGenerations').doc();
    const now = Timestamp.now();
    await ref.set(
      stripUndefined({
        ...record,
        status: 'QUEUED' as GenerationStatus,
        ...costeAlAbrir(record),
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
    // El día de la fila, no el de ahora: si la generación cruzó medianoche, el
    // gasto se apunta donde ya está el resto de la operación.
    const day = diaDelLibro(record.createdAt, now);
    const provider = record.provider || 'unknown';
    const capability = record.capability || 'unknown';
    const sinCoste = patch.providerCostStatus === 'unavailable';
    await Promise.all([
      ref.set(clean, { merge: true }),
      db()
        .collection('aiUsage')
        .doc(day)
        .set(
          {
            [capability]: {
              [provider]: sumaDelDia({ status: patch.status, providerCost: patch.providerCost, durationMs: patch.durationMs, sinCoste }),
            },
            byProvider: {
              [provider]: {
                calls: FieldValue.increment(1),
                usd: FieldValue.increment(patch.providerCost || 0),
                ...(sinCoste ? { unpricedCalls: FieldValue.increment(1) } : {}),
              },
            },
            updatedAt: now,
          },
          { merge: true }
        ),
    ]);
  },
  /**
   * EL FINAL DE UNA OPERACIÓN ASÍNCRONA, UNA SOLA VEZ.
   *
   * La fila se abrió al salir y quedó en PROCESSING al aceptar la tarea; aquí se
   * cierra con lo que el proveedor DECLARÓ haber consumido, valorado con la
   * tarifa que el adaptador declaró al salir. Sin consumo declarado, el coste
   * real queda en `null` y la fila dice `unavailable`: no se inventa ni se pone 0.
   *
   * En una transacción, y por eso idempotente: si el aviso y la pregunta llegan a
   * la vez, o la liquidación vuelve a intentarlo, solo uno cierra y suma al día.
   */
  async closeOperation(patch) {
    const providerTaskId = String(patch.providerTaskId ?? '').trim();
    if (!providerTaskId || !patch.provider) return { closed: 0, already: false, found: false };
    const snap = await db().collection('aiGenerations').where('providerTaskId', '==', providerTaskId).limit(4).get();
    const suyas = snap.docs.filter((d) => d.get('provider') === patch.provider && d.get('providerCostStatus') !== undefined);
    /* Una tarea es de UNA fila. Si hubiera dos, no se adivina cuál: se deja como está y se ve. */
    if (suyas.length !== 1) return { closed: 0, already: false, found: suyas.length > 0 };
    const ref = suyas[0].ref;
    return db().runTransaction(async (tx) => {
      const actual = await tx.get(ref);
      const fila = (actual.data() || {}) as Record<string, unknown>;
      const cierre = cierreDeOperacion(fila, patch);
      if (!cierre) return { closed: 0, already: true, found: true };
      const now = Timestamp.now();
      const creada = (fila.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.();
      const durationMs = typeof creada === 'number' ? Math.max(0, now.toMillis() - creada) : 0;
      tx.set(ref, stripUndefined({ ...cierre.campos, durationMs, updatedAt: now, completedAt: patch.status === 'COMPLETED' ? now : undefined }), { merge: true });
      const provider = String(fila.provider || 'unknown');
      const capability = String(fila.capability || 'unknown');
      const sinCoste = cierre.actual === null;
      tx.set(db().collection('aiUsage').doc(diaDelLibro(fila.createdAt, now)), {
        [capability]: { [provider]: sumaDelDia({ status: patch.status, providerCost: cierre.actual ?? undefined, durationMs, sinCoste }) },
        byProvider: {
          [provider]: {
            calls: FieldValue.increment(1),
            usd: FieldValue.increment(cierre.actual ?? 0),
            ...(sinCoste ? { unpricedCalls: FieldValue.increment(1) } : {}),
          },
        },
        updatedAt: now,
      }, { merge: true });
      return { closed: 1, already: false, found: true };
    });
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
      const dia = diaDelLibro(d.get('createdAt'), now);
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
      records[id] = { ...record, status: 'QUEUED', ...costeAlAbrir(record), providerCurrency: 'USD', ledgerVersion: LEDGER_VERSION };
      return id;
    },
    async progress(id, patch) {
      records[id] = { ...(records[id] || {}), ...patch };
    },
    async close(id, patch) {
      records[id] = { ...(records[id] || {}), ...patch };
    },
    async closeOperation(patch) {
      const suyas = Object.entries(records).filter(([, r]) => r.providerTaskId === patch.providerTaskId && r.provider === patch.provider && r.providerCostStatus !== undefined);
      if (suyas.length !== 1) return { closed: 0, already: false, found: suyas.length > 0 };
      const [id, fila] = suyas[0];
      const cierre = cierreDeOperacion(fila, patch);
      if (!cierre) return { closed: 0, already: true, found: true };
      records[id] = { ...fila, ...cierre.campos };
      return { closed: 1, already: false, found: true };
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
