import { Firestore } from 'firebase-admin/firestore';
import { Job, JobEngine, JobStore, ProviderOperationRef, esTrabajoTerminal } from '../core';
import { usageTransactionId } from '../credits/creditTransactions';
import { crearMotorDeTrabajosDeWee } from '../job';
import { PuertoDeLiquidacion, decidirLiquidacion, liquidacionDeWee, reservaDe, trabajoDelMedioDeWee } from '../runtime';
import { almacenDeTrabajos } from '../runtime/almacen';
import { costeDeLaOperacion } from '../runtime/liquidacion';
import { IdentidadDeToma, requestIdDeToma } from './toma';

/**
 * WEË FILMMAKER ENGINE · FASE 15 (D11) — CANCELAR UNA TOMA.
 *
 * ── La regla económica, cerrada ─────────────────────────────────────────────
 *
 * Decisión del usuario (2026-09-28, «CERRAR EL FILMMAKER ENGINE»):
 *
 *   · si la toma todavía NO la aceptó el proveedor → se cancela y se devuelven
 *     ÍNTEGROS sus Credits;
 *   · si el proveedor ya la aceptó y hay coste real → no se devuelve el coste
 *     incurrido: la toma termina y se cobra como cualquier otra;
 *   · la cancelación para el trabajo cuando todavía se puede; es idempotente;
 *     nunca devuelve dos veces; y nunca mueve dinero con un desenlace ambiguo.
 *
 * ── Cómo, sin inventar nada ─────────────────────────────────────────────────
 *
 * Todo lo que hace falta ya existe y se reutiliza tal cual:
 *
 *     parar el trabajo   `JobEngine.cancelar` / `evaluar` (F8): `queued` se para en
 *                        el acto; lo que ya corre se PIDE parar (`cancel_requested`)
 *                        y la parada se consuma cuando no queda nada en vuelo
 *     decidir el dinero  `decidirLiquidacion` (Fase 12-D): un trabajo cancelado que
 *                        nunca salió → `reembolsar` / `no_salio`
 *     mover el dinero    `liquidacionDeWee().reembolsar`, el puerto del barrido,
 *                        idempotente por la petición en el Credit Engine
 *     compare-and-set    `JobStore.aplicar`, con la revisión del trabajo
 *
 * Nada de esto llama al Credit Engine por su cuenta, ni crea un estado, ni toca
 * un contrato cerrado.
 *
 * ── Los casos, y por qué cada uno ───────────────────────────────────────────
 *
 *   sin reserva, o ajena                         no se cancela (`take_not_found`)
 *   cobrada                                      ya terminó (`take_finished`)
 *   devuelta                                     ya estaba devuelta: idempotente
 *   reservada, sin trabajo, dentro de la llamada la llamada lo está creando AHORA: devolver
 *                                                aquí regalaría el vídeo → otra vez en
 *                                                un momento (`take_starting`)
 *   reservada, sin trabajo, pasada la llamada    abandonada: se devuelve íntegra
 *   trabajo en cola, o corriendo sin haber salido se cancela en casa y se devuelve íntegra
 *   corriendo y ya salió, sin referencia         el POST está en vuelo: cancelar ahora
 *                                                perdería el vídeo con el dinero
 *                                                retenido → otra vez en unos segundos
 *                                                (`take_sending`)
 *   aceptada por el proveedor                    SOLO con la puerta de parada abierta:
 *                                                se le pregunta y, si todavía la tiene
 *                                                en cola, se la para; su desenlace entra
 *                                                por la reconciliación de siempre. Sin
 *                                                la puerta: termina y se cobra
 *                                                (`take_accepted`)
 *   desenlace desconocido                        se reconcilia; nadie adivina (`take_reconciling`)
 *
 * La parada en el proveedor nace CERRADA (`aiSettings/cancelacion`) porque no se
 * ha validado contra ModelArk real: ni su DELETE, ni si cobra una tarea cancelada
 * en cola. Una capacidad nueva no se activa en silencio.
 */

/** Por qué una toma no se cancela ahora. Códigos, nunca frases: la app los traduce. */
export type MotivoSinCancelar =
  | 'take_not_found'
  | 'take_finished'
  | 'take_starting'
  | 'take_sending'
  | 'take_accepted'
  | 'take_processing'
  | 'take_reconciling'
  | 'take_cancel_pending'
  | 'provider_unknown';

export type DecisionDeCancelacion =
  | { tipo: 'cancelar_el_trabajo' }
  | { tipo: 'terminar_la_cancelacion' }
  | { tipo: 'devolver_sin_trabajo' }
  | { tipo: 'devolver_con_trabajo' }
  | { tipo: 'parar_en_el_proveedor'; operacion: ProviderOperationRef }
  | { tipo: 'ya_devuelta' }
  | { tipo: 'no'; motivo: MotivoSinCancelar };

export interface ReservaDeLaToma {
  readonly estado: 'AUTHORIZED' | 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED';
  readonly importe: number;
  readonly autorizadaEn?: number;
}

export interface EvidenciaDeCancelacion {
  readonly reserva: ReservaDeLaToma | null;
  readonly trabajo: Job | undefined;
  readonly at: number;
  /** La vida de la llamada que crea el trabajo (`PLAZO_DE_VIDEO_MS`). */
  readonly vidaDeLaLlamadaMs: number;
  /** Si la parada en el proveedor está abierta para esta cuenta. */
  readonly paradaEnElProveedor: boolean;
}

const ultimoIntento = (job: Job) => job.attempts[job.attempts.length - 1];

/** ¿La paró la persona? El Job Engine lo escribe así, y solo así, al consumar una cancelación pedida. */
export const canceladaPorLaPersona = (job: Job | null | undefined): boolean =>
  !!job && job.state === 'cancelled' && job.error?.details?.reason === 'cancelled_by_request';

/**
 * QUÉ SE HACE CON ESTA CANCELACIÓN. Pura: la misma evidencia y el mismo `at`
 * dan lo mismo. No mueve nada; solo decide.
 */
export const decidirCancelacion = (e: EvidenciaDeCancelacion): DecisionDeCancelacion => {
  const r = e.reserva;
  if (!r) return { tipo: 'no', motivo: 'take_not_found' };
  if (r.estado === 'COMPLETED') return { tipo: 'no', motivo: 'take_finished' };
  if (r.estado === 'REFUNDED' || r.estado === 'FAILED') return { tipo: 'ya_devuelta' };

  const job = e.trabajo;
  if (!job) {
    /* Sin trabajo todavía. Mientras la llamada que lo crea puede seguir viva, no se toca: lo está creando ahora. */
    if (r.autorizadaEn === undefined || e.at < r.autorizadaEn + e.vidaDeLaLlamadaMs) return { tipo: 'no', motivo: 'take_starting' };
    return { tipo: 'devolver_sin_trabajo' };
  }

  if (esTrabajoTerminal(job.state)) {
    if (job.state === 'completed') return { tipo: 'no', motivo: 'take_finished' };
    const liquidacion = decidirLiquidacion(job, e.at);
    return liquidacion.tipo === 'reembolsar' ? { tipo: 'devolver_con_trabajo' } : { tipo: 'no', motivo: 'take_reconciling' };
  }

  if (job.state === 'queued') return { tipo: 'cancelar_el_trabajo' };
  if (job.state === 'cancel_requested') return { tipo: 'terminar_la_cancelacion' };

  const intento = ultimoIntento(job);
  /* Corriendo, pero todavía no salió hacia el proveedor: el trabajador ya no podrá mandarlo. */
  if (job.state === 'running' && (!intento || !intento.dispatched)) return { tipo: 'cancelar_el_trabajo' };
  /* Salió y el proveedor dijo que la tiene: solo él puede pararla. */
  if (intento?.dispatched && intento.providerRef) {
    return e.paradaEnElProveedor ? { tipo: 'parar_en_el_proveedor', operacion: intento.providerRef } : { tipo: 'no', motivo: 'take_accepted' };
  }
  /* Salió y todavía no contestó: el POST está en vuelo. */
  if (job.state === 'running') return { tipo: 'no', motivo: 'take_sending' };
  /* Salió y nadie sabe cómo acabó: eso lo resuelve la reconciliación, no una cancelación. */
  return { tipo: 'no', motivo: 'take_reconciling' };
};

/* ── La puerta de la parada en el proveedor ────────────────────────────────── */

/**
 * CERRADA SI NO DICE OTRA COSA. `aiSettings/cancelacion`, que solo lee el servidor:
 *
 *   { paradaEnElProveedor: true, cuentas: [...] }   solo esas cuentas
 *   { paradaEnElProveedor: true, todas: true }      todas —y hay que escribirlo—
 *
 * Como la del render: sin documento, sin el sí, o con el sí y sin cuentas ni
 * `todas`, cerrada. Si no se puede leer, cerrada.
 */
export const leerPuertaDeParada = async (db: Firestore, accountId: string): Promise<boolean> => {
  try {
    const snap = await db.collection('aiSettings').doc('cancelacion').get();
    const d = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;
    if (!d || d.paradaEnElProveedor !== true) return false;
    if (d.todas === true) return true;
    return Array.isArray(d.cuentas) && d.cuentas.some((c) => c === accountId);
  } catch {
    return false;
  }
};

/* ── Leer la reserva de la toma ────────────────────────────────────────────── */

const milisegundos = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = v as { toMillis?: () => number } | null | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : undefined;
};

/**
 * LA RESERVA DE UNA TOMA, si es de la cuenta y de ESA toma. La del Credit Engine
 * (`creditTransactions/usage_<petición>`), que las reglas solo dejan leer a su dueño.
 */
export const leerReservaDeLaToma = async (db: Firestore, accountId: string, requestId: string, identidad: IdentidadDeToma): Promise<ReservaDeLaToma | null> => {
  const snap = await db.collection('creditTransactions').doc(usageTransactionId(requestId)).get();
  const t = (snap.exists ? snap.data() : undefined) as Record<string, any> | undefined;
  if (!t || t.userId !== accountId || t.requestId !== requestId || t.type !== 'usage') return null;
  const f = t.meta?.filmmaker;
  if (!f || f.productionId !== identidad.productionId || f.unitId !== identidad.unitId || f.take !== identidad.toma) return null;
  const estado = t.status;
  if (!['AUTHORIZED', 'PENDING', 'COMPLETED', 'REFUNDED', 'FAILED'].includes(estado)) return null;
  const importe = Math.abs(Number(t.authorizedAmount ?? t.amount ?? 0)) || 0;
  const autorizadaEn = milisegundos(t.createdAt);
  return { estado, importe, ...(autorizadaEn !== undefined ? { autorizadaEn } : {}) };
};

/* ── Cancelar ──────────────────────────────────────────────────────────────── */

/** Lo que contesta el proveedor al pedirle parar: la paró, la está haciendo, ya terminó, o no se sabe. */
export type ParadaDelProveedor = 'parada' | 'en_proceso' | 'terminada' | 'desconocida';

export type ResultadoDeLaCancelacion =
  /** `cancelada`: se paró y se devolvió; `devuelta`: no había nada que parar y se devolvió; `cancelando`: pedida, se consuma sola; `ya_devuelta`: ya estaba. */
  | { ok: true; estado: 'cancelada' | 'devuelta' | 'cancelando' | 'ya_devuelta'; reembolso?: 'reembolsada' | 'ya_estaba' }
  | { ok: false; motivo: MotivoSinCancelar };

export interface DepsDeLaCancelacion {
  at: number;
  vidaDeLaLlamadaMs: number;
  store?: Pick<JobStore, 'aplicar'>;
  motor?: Pick<JobEngine, 'cancelar' | 'evaluar'>;
  liquidacion?: Pick<PuertoDeLiquidacion, 'reembolsar'>;
  /** Lee el trabajo de la toma por su petición (por defecto, el del runtime). */
  trabajo?: (accountId: string, requestId: string) => Promise<Job | undefined>;
  /** ¿Está abierta la parada en el proveedor para esta cuenta? (por defecto, `aiSettings/cancelacion`). */
  puertaDeParada?: (accountId: string) => Promise<boolean>;
  /** Pedirle al proveedor que pare una tarea. Sin él, no se para nada fuera de casa. */
  parar?: (operacion: ProviderOperationRef) => Promise<ParadaDelProveedor>;
  /** Aplicar ya lo que dice el proveedor de este trabajo, por la reconciliación de siempre. */
  reconciliar?: (job: Job) => Promise<unknown>;
}

/** Cuántas veces se vuelve a mirar si otro movió el trabajo entre medias. */
export const VUELTAS_DE_LA_CANCELACION = 3;

/**
 * CANCELAR UNA TOMA DE LA CUENTA. Idempotente: pedirlo dos veces, o a la vez
 * que otro, devuelve lo mismo y nunca devuelve dos veces.
 */
export const cancelarToma = async (
  db: Firestore,
  quien: { accountId: string },
  identidad: IdentidadDeToma,
  deps: DepsDeLaCancelacion,
): Promise<ResultadoDeLaCancelacion> => {
  const { accountId } = quien;
  const requestId = requestIdDeToma(accountId, identidad.productionId, identidad.unitId, identidad.toma);
  const store = deps.store ?? almacenDeTrabajos(db);
  const motor = deps.motor ?? crearMotorDeTrabajosDeWee().motor;
  const puerto = deps.liquidacion ?? liquidacionDeWee();
  const leerTrabajo = deps.trabajo ?? ((cuenta: string, rid: string) => trabajoDelMedioDeWee(db, cuenta, rid));
  const puertaDeParada = deps.puertaDeParada ?? ((cuenta: string) => leerPuertaDeParada(db, cuenta));

  /* El dinero de un trabajo terminado, por el puerto del barrido y SOLO si la liquidación dice «reembolsar». */
  const devolverElTrabajo = async (job: Job): Promise<'reembolsada' | 'ya_estaba' | undefined> => {
    const liquidacion = decidirLiquidacion(job, deps.at);
    const reserva = reservaDe(job);
    if (liquidacion.tipo !== 'reembolsar' || !reserva) return undefined;
    const hecho = await puerto.reembolsar({ userId: accountId, reserva, motivo: liquidacion.motivo, jobId: job.jobId, ...costeDeLaOperacion(job) });
    if (hecho.desenlace === 'reembolsada' || hecho.desenlace === 'ya_estaba') return hecho.desenlace;
    /* El puerto no pudo: el barrido lo vuelve a intentar con lo mismo, y la toma sigue apareciendo como «devolviendo». */
    return undefined;
  };

  for (let vuelta = 0; vuelta < VUELTAS_DE_LA_CANCELACION; vuelta++) {
    const reserva = await leerReservaDeLaToma(db, accountId, requestId, identidad);
    const trabajo = reserva ? await leerTrabajo(accountId, requestId) : undefined;
    const necesitaPuerta = !!trabajo && !esTrabajoTerminal(trabajo.state) && !!ultimoIntento(trabajo)?.providerRef;
    const d = decidirCancelacion({
      reserva, trabajo, at: deps.at, vidaDeLaLlamadaMs: deps.vidaDeLaLlamadaMs,
      paradaEnElProveedor: necesitaPuerta && !!deps.parar ? await puertaDeParada(accountId) : false,
    });

    switch (d.tipo) {
      case 'no':
        return { ok: false, motivo: d.motivo };
      case 'ya_devuelta':
        return { ok: true, estado: 'ya_devuelta' };
      case 'devolver_sin_trabajo': {
        /* Abandonada: nunca tuvo trabajo, así que nunca salió. Como la recuperación de la Fase 4. */
        const hecho = await puerto.reembolsar({
          userId: accountId,
          reserva: { requestId, transactionId: usageTransactionId(requestId), importe: (reserva as ReservaDeLaToma).importe },
          motivo: 'no_salio',
          jobId: '',
        });
        if (hecho.desenlace === 'reembolsada' || hecho.desenlace === 'ya_estaba') return { ok: true, estado: 'devuelta', reembolso: hecho.desenlace };
        return { ok: false, motivo: 'take_cancel_pending' };
      }
      case 'devolver_con_trabajo': {
        const reembolso = await devolverElTrabajo(trabajo as Job);
        return reembolso ? { ok: true, estado: 'devuelta', reembolso } : { ok: false, motivo: 'take_cancel_pending' };
      }
      case 'cancelar_el_trabajo':
      case 'terminar_la_cancelacion': {
        const job = trabajo as Job;
        const decision = d.tipo === 'cancelar_el_trabajo' ? motor.cancelar(job, { userId: accountId }, deps.at) : motor.evaluar(job, deps.at);
        if (decision.status !== 'transition' || !decision.transition) {
          /* Nada que mover: o sigue alguien en vuelo (se consuma sola), o cambió entre medias (se vuelve a mirar). */
          if (d.tipo === 'terminar_la_cancelacion') return { ok: true, estado: 'cancelando' };
          continue;
        }
        const aplicado = await store.aplicar(decision.transition);
        /* Otro lo movió entre medias —el trabajador, un reintento—: se vuelve a mirar con lo que haya ahora. */
        if (!aplicado.applied) continue;
        const despues = aplicado.job;
        if (!esTrabajoTerminal(despues.state)) return { ok: true, estado: 'cancelando' };
        const reembolso = await devolverElTrabajo(despues);
        return reembolso ? { ok: true, estado: 'cancelada', reembolso } : { ok: true, estado: 'cancelando' };
      }
      case 'parar_en_el_proveedor': {
        const job = trabajo as Job;
        const parada = deps.parar ? await deps.parar(d.operacion).catch((): ParadaDelProveedor => 'desconocida') : 'desconocida';
        if (parada === 'en_proceso') return { ok: false, motivo: 'take_processing' };
        if (parada === 'desconocida') return { ok: false, motivo: 'provider_unknown' };
        /* Parada o ya terminada: su desenlace entra AHORA por la reconciliación de siempre —la misma tabla, el mismo dinero—. */
        if (deps.reconciliar) await deps.reconciliar(job).catch(() => undefined);
        const despues = await leerTrabajo(accountId, requestId);
        if (!despues || !esTrabajoTerminal(despues.state)) return { ok: true, estado: 'cancelando' };
        if (despues.state === 'completed') return { ok: false, motivo: 'take_finished' };
        const reembolso = await devolverElTrabajo(despues);
        return reembolso ? { ok: true, estado: 'cancelada', reembolso } : { ok: true, estado: 'cancelando' };
      }
      default:
        return { ok: false, motivo: 'take_reconciling' };
    }
  }
  return { ok: false, motivo: 'take_cancel_pending' };
};

/* ── Consumar las cancelaciones que se quedaron pedidas ────────────────────── */

/**
 * UNA TOMA PEDIDA PARAR MIENTRAS UN TRABAJADOR LA TENÍA, sin haber salido todavía,
 * se queda en `cancel_requested` hasta que caduca su concesión: el Job Engine no
 * la da por parada mientras alguien podría estar ejecutándola. Nadie en producción
 * vuelve a mirar un trabajo de vídeo así, de modo que esto lo hace la pasada de
 * mantenimiento: `evaluar` —que la consuma cuando de verdad no queda nada en
 * vuelo— y, si queda cancelada, el reembolso por el mismo puerto. Solo tomas de
 * Filmmaker con su reserva; lo demás no se mira.
 */
export interface InformeDeCancelacionesPendientes {
  readonly miradas: number;
  readonly pendientes: number;
  readonly consumadas: number;
  readonly devueltas: number;
  readonly errores: number;
  readonly quedan: boolean;
}

const FORMA_DE_TOMA = /^fm\.[0-9a-f]{32}\.[1-9]\d{0,2}$/;
const POR_PAGINA_DE_CANCELACIONES = 100;
const MAX_PAGINAS_DE_CANCELACIONES = 10;

export const terminarCancelacionesPendientes = async (
  db: Firestore,
  deps: { at: number; store?: Pick<JobStore, 'aplicar' | 'recuperables'>; motor?: Pick<JobEngine, 'evaluar'>; liquidacion?: Pick<PuertoDeLiquidacion, 'reembolsar'> },
): Promise<InformeDeCancelacionesPendientes> => {
  const store = deps.store ?? almacenDeTrabajos(db);
  const motor = deps.motor ?? crearMotorDeTrabajosDeWee().motor;
  const puerto = deps.liquidacion ?? liquidacionDeWee();
  let miradas = 0; let pendientes = 0; let consumadas = 0; let devueltas = 0; let errores = 0;
  let cursor: string | undefined;
  for (let pagina = 0; pagina < MAX_PAGINAS_DE_CANCELACIONES; pagina++) {
    const { jobs, cursor: siguiente } = await store.recuperables({ before: deps.at, limit: POR_PAGINA_DE_CANCELACIONES, ...(cursor ? { cursor } : {}) });
    for (const job of jobs) {
      miradas++;
      /*
       * Una toma se reconoce por SU RESERVA —la petición con la que se reservaron sus
       * Credits, `fm.<32 hex>.<toma>`—, no por la traza del trabajo, que lleva el
       * identificador de su paso y no el de la toma.
       */
      const suReserva = reservaDe(job);
      if (job.state !== 'cancel_requested' || !suReserva || !FORMA_DE_TOMA.test(suReserva.requestId)) continue;
      pendientes++;
      try {
        const d = motor.evaluar(job, deps.at);
        if (d.status !== 'transition' || !d.transition) continue;
        const r = await store.aplicar(d.transition);
        if (!r.applied || !esTrabajoTerminal(r.job.state)) continue;
        consumadas++;
        const liquidacion = decidirLiquidacion(r.job, deps.at);
        const reserva = reservaDe(r.job);
        if (liquidacion.tipo !== 'reembolsar' || !reserva) continue;
        const hecho = await puerto.reembolsar({ userId: r.job.owner.userId, reserva, motivo: liquidacion.motivo, jobId: r.job.jobId, ...costeDeLaOperacion(r.job) });
        if (hecho.desenlace === 'reembolsada' || hecho.desenlace === 'ya_estaba') devueltas++;
        else errores++;
      } catch {
        /* Una que no se pudo mirar no para la pasada: la mira la siguiente. */
        errores++;
      }
    }
    cursor = siguiente;
    if (!cursor) break;
  }
  return Object.freeze({ miradas, pendientes, consumadas, devueltas, errores, quedan: !!cursor });
};

/** El paso, compuesto: lo que la pasada programada le añade a sus reservas sin trabajo. */
export const cancelacionesPendientesDeWee = (deps: { db: Firestore; ahora?: () => number; anotar?: (i: InformeDeCancelacionesPendientes) => void }) =>
  async (): Promise<InformeDeCancelacionesPendientes> => {
    const informe = await terminarCancelacionesPendientes(deps.db, { at: (deps.ahora ?? Date.now)() });
    deps.anotar?.(informe);
    return informe;
  };
