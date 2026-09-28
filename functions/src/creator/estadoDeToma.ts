import { Firestore } from 'firebase-admin/firestore';
import { Job, JobState } from '../core';
import { decidirLiquidacion, trabajoDelMedioDeWee } from '../runtime';
import { usageTransactionId } from '../credits/creditTransactions';
import { CategoriaDeFallo, categoriaDelFallo } from './fallos';
import { MAX_TOMAS, leerUnidadEnLaProduccion, nodoDeLaUnidad, requestIdDeToma } from './toma';

/**
 * WEË FILMMAKER ENGINE · FASE 2 — EN QUÉ ESTÁ UNA TOMA, Y DE DÓNDE VIENE.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * De una toma se sabían cosas sueltas, cada una en su sitio: la reserva de
 * Credits decía «autorizada», «cobrada» o «devuelta»; el trabajo del Core, en
 * qué punto de su vida estaba; el material, si el vídeo había llegado a casa; y
 * el plano del Core, qué vídeo tenía puesto. Nadie las juntaba, así que la app
 * solo veía la reserva: «aceptada» y «trabajando» se veían igual, y lo que no se
 * sabía cómo había acabado se veía como «en proceso».
 *
 * ── Lo que esto es ──────────────────────────────────────────────────────────
 *
 * UNA respuesta, calculada solo de lo que está escrito: la reserva, el trabajo,
 * el material, la fila del libro y el plano. No guarda nada, no mueve dinero, no
 * reintenta, no pregunta al proveedor y no decide nada que no esté decidido ya.
 * Lo del dinero lo sigue diciendo `decidirLiquidacion` —la misma función que usa
 * el barrido para cobrar o devolver—: aquí solo se lee su respuesta. No es un
 * segundo sistema de estados: es la vista de los que ya hay, en una palabra.
 *
 * ── Los estados ─────────────────────────────────────────────────────────────
 *
 *   queued       reservada y esperando a empezar: el trabajo todavía no existe
 *                (lo está creando la llamada que reservó) o está en la cola
 *   preparing    alguien de Weë la tiene y la está mandando: el proveedor todavía
 *                no ha dicho que la tiene
 *   accepted     el proveedor la aceptó y le puso nombre. ModelArk no distingue de
 *                forma durable su cola de su trabajo —las dos son «en marcha»—,
 *                así que no se inventa un «generando» que no se puede comprobar
 *   processing   el proveedor terminó bien y el vídeo ya está en casa (el trabajo
 *                del Core solo se cierra después de guardarlo); falta cerrar el cobro
 *   completed    cobrada exacta, con su vídeo
 *   failed       acabó sin vídeo y su dinero está volviendo: el trabajo falló sin
 *                dudas, o la reserva se quedó sin trabajo más de lo que vive la
 *                llamada que tenía que crearlo (`abandoned`)
 *   refunded     devuelta entera
 *   reconciling  salió hacia el proveedor y no se sabe cómo acabó, o lo escrito se
 *                contradice. Ni se cobra ni se devuelve: hace falta saber
 *
 * Cerrados, donde el dinero ya no se mueve: `completed` y `refunded`.
 *
 * ── Lo que no se inventa ────────────────────────────────────────────────────
 *
 * Un plazo cuenta solo cuando ya es un estado: el del trabajo lo aplica el Job
 * Engine. La ÚNICA cuenta de tiempo de aquí es la de una reserva SIN trabajo: el
 * trabajo solo lo puede crear la llamada que reservó, y esa llamada no vive más
 * que su plazo (`vidaDeLaLlamadaMs`, el de `generateVideo`); pasado, ya no
 * aparecerá nunca, y nunca salió hacia el proveedor. Es la misma regla con la que
 * `generateVideo` devuelve una reserva así cuando se repite la toma.
 */

export type EstadoDeToma = 'queued' | 'preparing' | 'accepted' | 'processing' | 'completed' | 'failed' | 'refunded' | 'reconciling';

/** En el orden en que los recorre una toma que sale bien; `failed`, `refunded` y `reconciling`, los otros finales. */
export const ESTADOS_DE_TOMA: readonly EstadoDeToma[] = Object.freeze([
  'queued', 'preparing', 'accepted', 'processing', 'completed', 'failed', 'refunded', 'reconciling',
] as EstadoDeToma[]);

/** Donde el dinero ya no se mueve: cobrada o devuelta. */
export const ESTADOS_CERRADOS_DE_TOMA: readonly EstadoDeToma[] = Object.freeze(['completed', 'refunded'] as EstadoDeToma[]);

export type MotivoDelEstado =
  /* queued: la llamada que reservó está creando el trabajo. */
  | 'starting'
  /* queued: el trabajo espera en la cola, o el Job Engine todavía puede moverlo. */
  | 'in_queue'
  /* preparing: un trabajador la tiene y el proveedor no ha contestado todavía. */
  | 'sending'
  /* accepted */
  | 'provider_has_it'
  /* processing: el vídeo está en casa y falta cerrar el cobro. */
  | 'settling'
  /* completed */
  | 'charged'
  /* failed: acabó sin vídeo; la devolución está pendiente. */
  | 'refund_pending'
  /* failed: reservada y nunca empezada; la devolución está pendiente. */
  | 'abandoned'
  /* refunded */
  | 'refunded'
  /* reconciling: salió y no se sabe cómo acabó. */
  | 'unknown_outcome'
  /* reconciling: la reserva y el trabajo se contradicen. */
  | 'evidence_mismatch';

/** La reserva de la toma, como la guardó el Credit Engine. */
export interface ReservaDeLaToma {
  /** El estado tal cual: AUTHORIZED, COMPLETED, REFUNDED… */
  readonly estado: string;
  readonly reservado: number;
  /** Lo capturado al cobrar. Ausente mientras no se cobra. */
  readonly final?: number;
  /** Cuándo se reservó, en milisegundos. */
  readonly autorizadaEn?: number;
}

export interface EvidenciaDeToma {
  /** `null`: esta toma no existe para quien pregunta. */
  readonly reserva: ReservaDeLaToma | null;
  /** El trabajo del Core de su operación, si lo hay. */
  readonly trabajo: Job | null;
}

export interface EstadoDecidido {
  readonly estado: EstadoDeToma;
  readonly motivo: MotivoDelEstado;
}

const decidido = (estado: EstadoDeToma, motivo: MotivoDelEstado): EstadoDecidido => Object.freeze({ estado, motivo });
const CONTRADICCION = decidido('reconciling', 'evidence_mismatch');

/**
 * EL ESTADO DE UNA TOMA. Pura: la misma evidencia y el mismo `at` dan lo mismo.
 * `at` sirve para dos cosas y solo dos: lo que ya sirve en `decidirLiquidacion`
 * —si la concesión del último intento sigue viva— y si una reserva sin trabajo
 * ya pasó la vida de la llamada que tenía que crearlo.
 */
export const decidirEstadoDeLaToma = (e: EvidenciaDeToma, at: number, vidaDeLaLlamadaMs: number): EstadoDecidido | null => {
  const r = e.reserva;
  if (!r) return null;
  const job = e.trabajo;

  /* El dinero ya se movió: la reserva es la verdad, y el trabajo tiene que decir lo mismo. */
  if (r.estado === 'REFUNDED') return job?.state === 'completed' ? CONTRADICCION : decidido('refunded', 'refunded');
  if (r.estado === 'COMPLETED') return job?.state === 'completed' ? decidido('completed', 'charged') : CONTRADICCION;
  /* Una toma se reserva autorizada, y de ahí solo sale cobrada o devuelta. Lo demás no es de una toma. */
  if (r.estado !== 'AUTHORIZED' && r.estado !== 'PENDING') return CONTRADICCION;

  /* El dinero sigue retenido. */
  if (!job) {
    const vence = r.autorizadaEn !== undefined ? r.autorizadaEn + vidaDeLaLlamadaMs : undefined;
    return vence !== undefined && at >= vence ? decidido('failed', 'abandoned') : decidido('queued', 'starting');
  }
  const liquidacion = decidirLiquidacion(job, at);
  switch (liquidacion.tipo) {
    /* El trabajo de una toma lleva siempre su reserva dentro: si no la lleva, no es de esta toma. */
    case 'nada': return CONTRADICCION;
    case 'reconciliar': return decidido('reconciling', 'unknown_outcome');
    case 'liquidar': return decidido('processing', 'settling');
    case 'reembolsar': return decidido('failed', 'refund_pending');
    case 'esperar':
    default:
      if (job.state === 'queued') return decidido('queued', 'in_queue');
      if (liquidacion.tipo === 'esperar' && liquidacion.motivo === 'aceptada_por_el_proveedor') return decidido('accepted', 'provider_has_it');
      if (liquidacion.tipo === 'esperar' && liquidacion.motivo === 'en_marcha') {
        const ultimo = job.attempts[job.attempts.length - 1];
        return ultimo?.providerRef ? decidido('accepted', 'provider_has_it') : decidido('preparing', 'sending');
      }
      /* Sin dueño y sin nada incierto: el Job Engine lo vuelve a coger. */
      return decidido('queued', 'in_queue');
  }
};

/* ── El dinero, en tres números ───────────────────────────────────────────── */

export interface DineroDeLaToma {
  readonly reservado: number;
  readonly cobrado: number;
  readonly reembolsado: number;
}

/**
 * LO RESERVADO, LO COBRADO Y LO DEVUELTO, con la misma regla que ya usa la app
 * (`utils/controladorDeToma.ts`, `economiaDeLaReserva`): devuelta es devuelta
 * entera; cobrada es lo capturado, y lo que sobre de la reserva, devuelto; lo
 * demás, retenido. Son Credits: el coste del proveedor no se mezcla aquí.
 */
export const dineroDeLaReserva = (r: ReservaDeLaToma | null): DineroDeLaToma => {
  if (!r) return Object.freeze({ reservado: 0, cobrado: 0, reembolsado: 0 });
  const reservado = Math.max(0, r.reservado);
  if (r.estado === 'FAILED') return Object.freeze({ reservado: 0, cobrado: 0, reembolsado: 0 });
  if (r.estado === 'REFUNDED') return Object.freeze({ reservado, cobrado: 0, reembolsado: reservado });
  if (r.estado === 'COMPLETED') {
    const cobrado = r.final !== undefined ? Math.min(reservado, Math.max(0, r.final)) : reservado;
    return Object.freeze({ reservado, cobrado, reembolsado: reservado - cobrado });
  }
  return Object.freeze({ reservado, cobrado: 0, reembolsado: 0 });
};

/* ── El vídeo en su plano ─────────────────────────────────────────────────── */

/**
 * SI EL VÍDEO DE ESTA TOMA ESTÁ EN SU PLANO, con las mismas reglas que
 * `enlazarToma`, que es la única que lo pone:
 *
 *   linked      el plano del Core tiene puesto el material de esta toma
 *   superseded  una toma posterior ya está cobrada: el plano es suyo
 *   stale       el plano cambió desde que se pidió (o ya no está): no se enlaza
 *   pending     cobrada, con su vídeo, y el plano esperándolo: se puede enlazar
 *   none        no hay nada que enlazar todavía
 */
export type EnlaceDeToma = 'linked' | 'pending' | 'superseded' | 'stale' | 'none';

export interface MaterialDeLaToma {
  readonly assetId: string;
  readonly estado: string;
  readonly clase: string;
}

export const decidirEnlace = (x: {
  readonly estado: EstadoDeToma;
  readonly material: MaterialDeLaToma | null;
  readonly producedAssetId: string | null;
  readonly posteriorCobrada: boolean;
  readonly unidadCambio: boolean;
}): EnlaceDeToma => {
  if (x.estado !== 'completed' || !x.material) return 'none';
  if (x.producedAssetId === x.material.assetId) return 'linked';
  if (x.posteriorCobrada) return 'superseded';
  if (x.unidadCambio) return 'stale';
  return x.material.estado === 'ready' && x.material.clase === 'video' ? 'pending' : 'none';
};

/* ── La traza entera ──────────────────────────────────────────────────────── */

export interface GeneracionDeLaToma {
  readonly generationId: string;
  readonly estado: string | null;
  /** El coste del PROVEEDOR, en dólares. Nunca Credits, y nunca 0 por defecto: `null` es «no se sabe». */
  readonly costeEstimadoUsd: number | null;
  readonly costeRealUsd: number | null;
  readonly estadoDelCoste: string | null;
}

/**
 * TODO LO QUE SE SABE DE UNA TOMA, y de dónde sale cada cosa:
 *
 *   cuenta, producción, escena, unidad, toma, revisión, firma, plantilla y huella
 *                ← la reserva (las escribió el servidor al reservar, F1-D)
 *   requestId    ← calculado: cuenta, producción, unidad y toma
 *   trabajo      ← el Job Engine, por la idempotencia de su operación
 *   generación   ← el libro (`aiGenerations`), por la transacción de la reserva
 *   material     ← el Content Core, por su procedencia: la escribió el Core
 *   plano        ← el `ShotNode` de la unidad
 *
 * Es para Weë: lleva lo de dentro —el trabajo, el coste del proveedor, la
 * huella— y NO sale tal cual hacia la app. Lo que sale es `vistaDeLaToma`.
 */
export interface TrazaDeToma {
  readonly cuenta: string;
  readonly produccion: string;
  readonly escena: string | null;
  readonly unidad: string;
  readonly toma: number;
  readonly requestId: string;
  readonly revision: number | null;
  readonly firma: string | null;
  readonly plantilla: string | null;
  readonly huella: string | null;
  readonly estado: EstadoDeToma;
  readonly motivo: MotivoDelEstado;
  readonly fallo: CategoriaDeFallo | null;
  readonly dinero: DineroDeLaToma;
  readonly trabajo: {
    readonly jobId: string;
    readonly estado: JobState;
    readonly intentos: number;
    readonly salio: boolean;
    readonly aceptada: boolean;
  } | null;
  readonly generacion: GeneracionDeLaToma | null;
  readonly material: MaterialDeLaToma | null;
  readonly plano: { readonly shotNodeId: string; readonly producedAssetId: string | null; readonly version: number } | null;
  readonly enlace: EnlaceDeToma;
}

/**
 * POR QUÉ NO SALIÓ, en una de las cinco categorías y solo cuando acabó sin
 * vídeo o no se sabe cómo acabó. La misma regla que la consulta de la toma de
 * F1-D: un trabajo vencido sin error es `TIMEOUT`.
 */
export const falloDeLaToma = (estado: EstadoDeToma, job: Job | null): CategoriaDeFallo | null => {
  if (!job || !['failed', 'refunded', 'reconciling'].includes(estado)) return null;
  if (!['failed', 'timed_out', 'cancelled'].includes(job.state)) return null;
  const intento = job.attempts[job.attempts.length - 1];
  return job.state === 'timed_out' && !intento?.error ? 'TIMEOUT' : categoriaDelFallo(intento?.error ?? job.error);
};

/* ── Lo que ve la app ─────────────────────────────────────────────────────── */

/**
 * LA TOMA, COMO LA VE SU DUEÑO. Nada de dentro: ni el trabajo, ni el proveedor,
 * ni su coste, ni la huella ni el texto con que se pidió. El estado, su motivo,
 * la categoría si falló, los tres números en Credits, el vídeo si es suyo y
 * está listo, y si está en su plano.
 */
export interface VistaDeToma {
  readonly take: number;
  readonly requestId: string;
  readonly state: EstadoDeToma;
  readonly reason: MotivoDelEstado;
  readonly failure?: CategoriaDeFallo;
  readonly credits: { readonly reserved: number; readonly charged: number; readonly refunded: number };
  readonly assetId?: string;
  readonly link: EnlaceDeToma;
  readonly revision?: number;
}

export const vistaDeLaToma = (t: TrazaDeToma): VistaDeToma => Object.freeze({
  take: t.toma,
  requestId: t.requestId,
  state: t.estado,
  reason: t.motivo,
  ...(t.fallo ? { failure: t.fallo } : {}),
  credits: Object.freeze({ reserved: t.dinero.reservado, charged: t.dinero.cobrado, refunded: t.dinero.reembolsado }),
  ...(t.material && t.material.estado === 'ready' && t.material.clase === 'video' ? { assetId: t.material.assetId } : {}),
  link: t.enlace,
  ...(t.revision !== null ? { revision: t.revision } : {}),
});

/* ── La lectura ───────────────────────────────────────────────────────────── */

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null);
const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const dolares = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const milisegundos = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (esObj(v) && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return undefined;
};

interface ReservaLeida {
  readonly toma: number;
  readonly requestId: string;
  readonly reserva: ReservaDeLaToma;
  readonly meta: Record<string, unknown>;
  readonly huella: string | null;
}

/** Las reservas de las tomas de una unidad, en orden, hasta la primera que no existe o no es de quien pregunta. */
const reservasDeLaUnidad = async (db: Firestore, uid: string, accountId: string, u: { productionId: string; unitId: string }): Promise<readonly ReservaLeida[]> => {
  const salida: ReservaLeida[] = [];
  for (let toma = 1; toma <= MAX_TOMAS; toma++) {
    const requestId = requestIdDeToma(accountId, u.productionId, u.unitId, toma);
    const snap = await db.collection('creditTransactions').doc(usageTransactionId(requestId)).get();
    const d = snap.exists ? snap.data() : undefined;
    if (!esObj(d) || d.userId !== uid) break;
    const autorizadaEn = milisegundos(d.createdAt);
    const final = numero(d.finalAmount);
    salida.push({
      toma,
      requestId,
      reserva: {
        estado: String(d.status),
        reservado: Math.abs(numero(d.authorizedAmount) ?? numero(d.amount) ?? 0),
        ...(final !== undefined ? { final } : {}),
        ...(autorizadaEn !== undefined ? { autorizadaEn } : {}),
      },
      meta: esObj(d.meta) && esObj(d.meta.filmmaker) ? d.meta.filmmaker : {},
      huella: texto(d.fingerprint),
    });
  }
  return salida;
};

/** El material de la operación, por su procedencia, con el estado que tenga. Exactamente uno, o ninguno. */
const materialDeLaToma = async (db: Firestore, uid: string, requestId: string): Promise<MaterialDeLaToma | null> => {
  const snap = await db.collection('assets')
    .where('ownerAccountId', '==', uid)
    .where('provenance.traceId', '==', requestId)
    .limit(2)
    .get();
  if (snap.docs.length !== 1) return null;
  const m = snap.docs[0].data();
  const p = esObj(m.provenance) ? m.provenance : {};
  if (p.runId !== `run_${requestId}` || typeof m.assetId !== 'string') return null;
  return { assetId: m.assetId, estado: String(m.status), clase: String(m.kind) };
};

/** La fila del libro de la operación, por la transacción de su reserva. De quien pregunta, o ninguna. */
const generacionDeLaToma = async (db: Firestore, uid: string, requestId: string): Promise<GeneracionDeLaToma | null> => {
  const snap = await db.collection('aiGenerations').where('creditTransactionId', '==', usageTransactionId(requestId)).limit(4).get();
  const suyas = snap.docs.filter((d) => d.get('userId') === uid);
  const fila = suyas[suyas.length - 1];
  if (!fila) return null;
  const g = fila.data();
  return {
    generationId: fila.id,
    estado: texto(g.status),
    costeEstimadoUsd: dolares(g.estimatedProviderCost),
    costeRealUsd: dolares(g.actualProviderCost),
    estadoDelCoste: texto(g.providerCostStatus),
  };
};

/**
 * LAS TOMAS DE UNA UNIDAD, CON SU ESTADO Y SU TRAZA. Solo lectura.
 *
 * De una unidad ajena o inexistente contesta lo mismo: ninguna. Un fallo al leer
 * NO se convierte en un estado: sale como error, porque adivinar el estado de
 * algo que cuesta dinero es justo lo que esto viene a evitar.
 */
export const trazasDeLaUnidad = async (
  db: Firestore,
  quien: { uid: string; accountId: string },
  u: { productionId: string; sceneId: string; unitId: string },
  opciones: { at: number; vidaDeLaLlamadaMs: number },
): Promise<readonly TrazaDeToma[]> => {
  const reservas = await reservasDeLaUnidad(db, quien.uid, quien.accountId, u);
  if (!reservas.length) return Object.freeze([]);

  const nodo = await nodoDeLaUnidad(db, quien.accountId, u);
  const unidad = await leerUnidadEnLaProduccion(db, quien.accountId, u);
  const firmaActual = unidad.ok ? unidad.unidad.firma : null;

  const trazas: TrazaDeToma[] = [];
  for (const r of reservas) {
    const trabajo = (await trabajoDelMedioDeWee(db, quien.uid, r.requestId)) ?? null;
    const [material, generacion] = await Promise.all([
      materialDeLaToma(db, quien.uid, r.requestId),
      generacionDeLaToma(db, quien.uid, r.requestId),
    ]);
    const decision = decidirEstadoDeLaToma({ reserva: r.reserva, trabajo }, opciones.at, opciones.vidaDeLaLlamadaMs) as EstadoDecidido;
    const firma = texto(r.meta.firma);
    const intentos = trabajo?.attempts ?? [];
    trazas.push({
      cuenta: quien.accountId,
      produccion: u.productionId,
      escena: texto(r.meta.sceneId),
      unidad: u.unitId,
      toma: r.toma,
      requestId: r.requestId,
      revision: numero(r.meta.revision) ?? null,
      firma,
      plantilla: texto(r.meta.plantilla),
      huella: r.huella,
      estado: decision.estado,
      motivo: decision.motivo,
      fallo: falloDeLaToma(decision.estado, trabajo),
      dinero: dineroDeLaReserva(r.reserva),
      trabajo: trabajo ? {
        jobId: trabajo.jobId,
        estado: trabajo.state,
        intentos: trabajo.attemptCount,
        salio: intentos.some((a) => a.dispatched === true),
        aceptada: intentos.some((a) => a.dispatched === true && !!a.providerRef),
      } : null,
      generacion,
      material,
      plano: nodo ? { shotNodeId: nodo.shotNodeId, producedAssetId: nodo.producedAssetId ?? null, version: nodo.version } : null,
      enlace: decidirEnlace({
        estado: decision.estado,
        material,
        producedAssetId: nodo?.producedAssetId ?? null,
        posteriorCobrada: reservas.some((x) => x.toma > r.toma && x.reserva.estado === 'COMPLETED'),
        unidadCambio: !firma || firmaActual === null || firmaActual !== firma,
      }),
    });
  }
  return Object.freeze(trazas);
};
