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
  providerCost: number;
  /**
   * Un fallo que pudo costar dinero al proveedor (H0 #22, `costeTrasUnFallo` en engine/errors.ts). `providerCost`
   * sigue siendo lo MEDIDO (0); el estimado va aparte y se suma a `aiUsage/{día}` como `usdEnRiesgo`.
   *
   * `estimado` (RUNTIME §22.5): una generación aceptada que terminó bien y cuyo coste no se midió —un modelo que cobra
   * por tokens o por segundos, cerrado con la estimación de su cotización—. `providerCost` lleva esa estimación y
   * cuenta como gastado; la marca dice que no es una medida.
   */
  providerCostStatus?: 'desconocido' | 'estimado';
  providerCostEstimated?: number;
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

/**
 * EL DESENLACE DE UN INTENTO QUE EL PROVEEDOR ACEPTÓ (RUNTIME §22.5).
 *
 * Con aceptar y soltar, la fila de un intento no se puede cerrar cuando vuelve la llamada: el proveedor solo dijo «lo
 * tengo». Queda en curso (`PROCESSING`, con su `providerTaskId`) hasta que se sabe cómo acabó, y la cierra quien lo
 * sabe —la liquidación, leyendo el trabajo—, con el coste que corresponde sobre la tarifa que se cotizó
 * (`estimatedUsd` de la fila):
 *
 *   exacto       la tarifa ES el coste (un modelo que cobra por petición): `providerCost`.
 *   estimado     terminó bien y no se midió (cobra por tokens o por segundos): `providerCost` = la estimación,
 *                marcada `providerCostStatus: 'estimado'`.
 *   desconocido  el proveedor trabajó y no terminó bien (H0 #22): `providerCost` 0 y la tarifa «en riesgo».
 */
export interface CierreDeAceptada {
  /** La tarea del proveedor: se cierra la fila que tenga ESTE `providerTaskId`, y solo ella. */
  providerTaskId: string;
  status: Extract<GenerationStatus, 'COMPLETED' | 'FAILED' | 'CANCELLED'>;
  coste: 'exacto' | 'estimado' | 'desconocido';
  creditsEstimated?: number;
  durationMs: number;
  error?: string;
  usage?: Record<string, number>;
}

export interface CloseAcceptedRecord {
  /** La transacción de Credits del trabajo: sus filas, y ninguna otra. */
  creditTransactionId: string;
  cierres: readonly CierreDeAceptada[];
}

export interface Ledger {
  open(record: OpenRecord): Promise<string>;
  progress(id: string, patch: ProgressRecord): Promise<void>;
  close(id: string, patch: CloseRecord): Promise<void>;
  settle(patch: SettleRecord): Promise<SettleResult>;
  /**
   * Cierra las filas EN CURSO de una transacción cuyo intento ya tiene desenlace. Una vez: solo se cierra una fila que
   * siga en curso, y en la misma transacción que su suma al uso del día, así que dos liquidaciones a la vez no cuentan
   * dos veces. Devuelve cuántas cerró ESTA llamada.
   */
  closeAccepted(patch: CloseAcceptedRecord): Promise<{ cerradas: number }>;
}

/** El cierre de una fila aceptada, sobre la tarifa que guarda la fila. Pura: la usan el libro de Firestore y el de memoria. */
export const cierreDeAceptada = (estimatedUsd: unknown, c: CierreDeAceptada): CloseRecord => {
  const tarifa = typeof estimatedUsd === 'number' && Number.isFinite(estimatedUsd) && estimatedUsd > 0 ? estimatedUsd : 0;
  return {
    status: c.status,
    providerCost: c.coste === 'desconocido' ? 0 : tarifa,
    ...(c.coste === 'estimado' ? { providerCostStatus: 'estimado' as const } : {}),
    ...(c.coste === 'desconocido' ? { providerCostStatus: 'desconocido' as const, providerCostEstimated: tarifa } : {}),
    ...(c.creditsEstimated !== undefined ? { creditsEstimated: c.creditsEstimated } : {}),
    durationMs: Math.max(0, c.durationMs),
    ...(c.error ? { error: c.error } : {}),
    ...(c.usage && Object.keys(c.usage).length ? { usage: c.usage } : {}),
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
    const uso = sumaAlUsoDelDia(record, patch, now);
    await Promise.all([
      ref.set(clean, { merge: true }),
      db().collection(uso.coleccion).doc(uso.dia).set(uso.datos, { merge: true }),
    ]);
  },
  closeAccepted: closeAcceptedFirestore,
};

/**
 * LO QUE UNA GENERACIÓN CERRADA SUMA AL USO DEL DÍA. Una sola definición para `close` y `closeAccepted`: las dos cuentan
 * lo mismo, y una fila aceptada que se cierra al saberse su desenlace no puede contar distinto que una que se cerró al
 * volver la llamada.
 */
/**
 * CUÁNTO SUMA UN CIERRE: una llamada, si falló, el dinero medido del proveedor, lo que pudo costar si falló después de
 * llegarle (H0 #22: `usdEnRiesgo`, aparte del dinero medido, para que los topes lo vean) y el tiempo. Pura: la usan el
 * libro de Firestore (como incrementos) y el de memoria (como sumas), así que los dos cuentan lo mismo.
 */
export const sumaDeUnCierre = (patch: CloseRecord): { calls: number; failed: number; usd: number; usdEnRiesgo: number; latencyMs: number } => {
  const estimado = Number(patch.providerCostEstimated);
  return {
    calls: 1,
    failed: patch.status === 'FAILED' ? 1 : 0,
    usd: patch.providerCost || 0,
    usdEnRiesgo: patch.providerCostStatus === 'desconocido' && Number.isFinite(estimado) && estimado > 0 ? estimado : 0,
    latencyMs: patch.durationMs || 0,
  };
};

const sumaAlUsoDelDia = (record: Partial<GenerationRecord>, patch: CloseRecord, now: Timestamp) => {
  // El día de la fila, no el de ahora: si la generación cruzó medianoche, el
  // gasto se apunta donde ya está el resto de la operación.
  const day = diaDelLibro(record.createdAt, now);
  const provider = record.provider || 'unknown';
  const capability = record.capability || 'unknown';
  /*
   * El gasto de una EVALUACIÓN interna (F2-C) se contabiliza APARTE, en evalUsage/{día}, NUNCA en aiUsage/{día}:
   * así el presupuesto de evals es su propio bolsillo y jamás contamina el tope de gasto del usuario ni los
   * informes de coste de producción. El resto (tráfico real) sigue en aiUsage como siempre.
   */
  const coleccionDeUso = record.attribution === 'eval' ? 'evalUsage' : 'aiUsage';
  const suma = sumaDeUnCierre(patch);
  const riesgo = suma.usdEnRiesgo > 0 ? { usdEnRiesgo: FieldValue.increment(suma.usdEnRiesgo) } : {};
  return {
    coleccion: coleccionDeUso,
    dia: day,
    datos: {
      [capability]: {
        [provider]: {
          calls: FieldValue.increment(suma.calls),
          failed: FieldValue.increment(suma.failed),
          // Dinero real del proveedor y llamadas: ocurrieron de verdad aunque
          // después se reembolse, así que se acumulan siempre. Los Credits NO
          // se acumulan aquí: hasta que la transacción se liquide no se sabe
          // si hubo ingreso. Lo hace ledger.settle().
          usd: FieldValue.increment(suma.usd),
          ...riesgo,
          latencyMs: FieldValue.increment(suma.latencyMs),
        },
      },
      byProvider: { [provider]: { calls: FieldValue.increment(suma.calls), usd: FieldValue.increment(suma.usd), ...riesgo } },
      updatedAt: now,
    },
  };
};

/**
 * Cuántas filas de UNA transacción se miran como mucho al cerrar lo aceptado. Una transacción lleva una fila por
 * intento de su trabajo (un mundo, uno; un vídeo, los que permita su política): cien es de sobra, y acotar la consulta
 * evita leer sin fin si algo escribiera filas de más. Lo que quedara fuera seguiría en curso, que se ve.
 */
const MAX_FILAS_DE_UNA_TRANSACCION = 100;

/**
 * EL CIERRE DE LO ACEPTADO, EN FIRESTORE. La consulta es la de `settle` (un campo, sin índice compuesto), acotada; cada
 * fila se cierra en su propia transacción, que relee la fila, comprueba que SIGUE en curso y con la misma tarea, y
 * escribe la fila y su suma al uso del día juntas. Si otra liquidación la cerró antes, esta no escribe nada.
 */
async function closeAcceptedFirestore(patch: CloseAcceptedRecord): Promise<{ cerradas: number }> {
  const { creditTransactionId, cierres } = patch;
  if (!creditTransactionId || !cierres.length) return { cerradas: 0 };
  const porTarea = new Map(cierres.map((c) => [c.providerTaskId, c]));
  const snap = await db().collection('aiGenerations').where('creditTransactionId', '==', creditTransactionId).limit(MAX_FILAS_DE_UNA_TRANSACCION).get();
  let cerradas = 0;
  for (const d of snap.docs) {
    const cierre = porTarea.get(String(d.get('providerTaskId') ?? ''));
    if (!cierre || d.get('status') !== 'PROCESSING') continue;
    const cerrada = await db().runTransaction(async (tx) => {
      const fresca = await tx.get(d.ref);
      const record = (fresca.data() || {}) as Partial<GenerationRecord>;
      if (record.status !== 'PROCESSING' || record.providerTaskId !== cierre.providerTaskId) return false;
      const now = Timestamp.now();
      const cerrado = cierreDeAceptada(record.estimatedUsd, cierre);
      const uso = sumaAlUsoDelDia(record, cerrado, now);
      tx.set(d.ref, stripUndefined({ ...cerrado, updatedAt: now, completedAt: cerrado.status === 'COMPLETED' ? now : undefined }), { merge: true });
      tx.set(db().collection(uso.coleccion).doc(uso.dia), uso.datos, { merge: true });
      return true;
    });
    if (cerrada) cerradas++;
  }
  return { cerradas };
}

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
export const memoryLedger = (): Ledger & {
  records: Record<string, Record<string, unknown>>;
  /** Lo mismo que sumaría `aiUsage/{día}`, en un solo cubo: Credits liquidados, llamadas, fallos, dinero medido y en riesgo. */
  usage: { credits: number; calls: number; failed: number; usd: number; usdEnRiesgo: number };
} => {
  const records: Record<string, Record<string, unknown>> = {};
  const usage = { credits: 0, calls: 0, failed: 0, usd: 0, usdEnRiesgo: 0 };
  let counter = 0;
  let sello = 0;
  /* La MISMA suma que el libro de Firestore (`sumaDeUnCierre`), no una copia de la regla. */
  const sumar = (patch: CloseRecord) => {
    const suma = sumaDeUnCierre(patch);
    usage.calls += suma.calls;
    usage.failed += suma.failed;
    usage.usd += suma.usd;
    usage.usdEnRiesgo += suma.usdEnRiesgo;
  };
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
      sumar(patch);
    },
    /* Como el de Firestore: cada fila EN CURSO de la transacción cuya tarea tenga cierre, una vez. */
    async closeAccepted({ creditTransactionId, cierres }) {
      const porTarea = new Map(cierres.map((c) => [c.providerTaskId, c]));
      let cerradas = 0;
      for (const [id, r] of Object.entries(records)) {
        const cierre = porTarea.get(String(r.providerTaskId ?? ''));
        if (r.creditTransactionId !== creditTransactionId || !cierre || r.status !== 'PROCESSING') continue;
        const cerrado = cierreDeAceptada(r.estimatedUsd, cierre);
        records[id] = { ...r, ...cerrado };
        sumar(cerrado);
        cerradas++;
      }
      return { cerradas };
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
