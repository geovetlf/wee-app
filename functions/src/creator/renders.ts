import { createHash, randomUUID } from 'crypto';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Job, JobEngine, JobExecutor, JobStore, ProviderEvent, errorDelCore, esTrabajoTerminal, mensajeDeCola } from '../core';
import { AssetDoc, leerMaterial } from '../content';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import { crearMotorDeTrabajosDeWee } from '../job';
import { atenderEntrega } from '../job/worker';
import { almacenDeTrabajos } from '../runtime/almacen';
import { colaDeInvocacion } from '../runtime/cola';
import { POLITICA_DEL_RENDER, TAREA_DE_RENDER, estadoDelRender, materialDelRender, pedirRender, rendersDeLaProduccion } from './render';
import { crearEjecutorDeRender } from './renderizador';

/**
 * WEË FILMMAKER ENGINE · FASE 8 — EL TRABAJADOR DEL RENDER Y SUS DOS PUERTAS.
 *
 * ── Composición, y nada más ─────────────────────────────────────────────────
 *
 * Como el canary de Media Cloud (`media/canary.ts`), esto ATA piezas que ya
 * existen y no reimplementa ninguna:
 *
 *     motor        `crearMotorDeTrabajosDeWee`   (Fase 8), con la política del render
 *     almacén      `almacenDeTrabajos`           (Fase 12-D), el de todos los trabajos
 *     cola         `colaDeInvocacion`            (Fase 12-D), dentro de la invocación
 *     trabajador   `atenderEntrega`              (Fase 12-A), sin cambiar una línea
 *     ejecutor     `crearEjecutorDeRender`       (esta fase)
 *
 * ── Por qué no hace falta una cola durable ──────────────────────────────────
 *
 * Porque la verdad es el almacén y la cola solo avisa: «la cola ES el almacén con
 * `availableAt`» (`core/job-queue.ts`). Cada pasada busca en el almacén los
 * renders sin terminar, recupera los que murieron, reconcilia los que se
 * quedaron sin saber y avisa a su trabajador de los que tocan. Si una invocación
 * muere, el trabajo no se pierde: la siguiente pasada lo encuentra.
 *
 * ── Lo que esta pasada NO toca ──────────────────────────────────────────────
 *
 * Nada que no sea un render. Mira los trabajos sin terminar de todo Weë —así los
 * sirve el almacén— y a los que no son `media.render` no les hace NADA: ni los
 * evalúa, ni los recupera, ni los avisa. Esos son del conductor, de su
 * reconciliador y de su barrido.
 */

/**
 * CUÁNTO SE ESPERA ANTES DE DAR POR PERDIDO UN INTENTO SIN MATERIAL.
 *
 * Cuando un trabajador muere a mitad de un montaje, el Job Engine deja el trabajo
 * esperando: el intento salió y no se sabe cómo acabó. Para un proveedor eso se
 * pregunta; para un render, la respuesta es el material. Si está, el render está
 * hecho. Si no está pasados dos minutos desde que la concesión caducó —más de lo
 * que tarda en guardarse y ficharse un montaje—, ese intento no va a volver, y se
 * dice: falló, y el Job Engine decide si queda otro.
 */
export const GRACIA_DE_UN_INTENTO_PERDIDO_MS = 2 * 60_000;
const POR_PAGINA = 100;
const MAX_PAGINAS = 10;

export const esTrabajoDeRender = (job: Job): boolean => job.task?.name === TAREA_DE_RENDER && job.capability === undefined;

const hex16 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

export type DesenlaceDeLaReconciliacionDeRender = 'nada' | 'hecho' | 'perdido' | 'esperar';

/**
 * RECONCILIAR UN RENDER CON SU PROPIA VERDAD: EL MATERIAL.
 *
 * Es el mismo camino que un aviso de proveedor —`recibirEvento`, con la misma
 * tabla, el mismo reintento y el mismo plazo—, porque dos caminos que decidieran
 * distinto serían dos motores. Lo único propio es a quién se le pregunta.
 */
export const reconciliarRender = async (
  store: Pick<JobStore, 'aplicar'>,
  motor: Pick<JobEngine, 'recibirEvento'>,
  job: Job,
  at: number,
  leer: (assetId: string) => Promise<AssetDoc | null>,
): Promise<DesenlaceDeLaReconciliacionDeRender> => {
  const intento = job.attempts[job.attempts.length - 1];
  if (job.state !== 'waiting' || !intento || intento.outcome !== 'unknown') return 'nada';
  if (intento.lease && intento.lease.until > at) return 'nada';
  const assetId = materialDelRender(job.trace.requestId);
  const m = await leer(assetId);
  const listo = !!m && m.ownerAccountId === job.owner.userId && m.status === 'ready' && m.kind === 'video';
  if (!listo && at - (intento.endedAt ?? intento.startedAt) < GRACIA_DE_UN_INTENTO_PERDIDO_MS) return 'esperar';
  const aviso: ProviderEvent = listo
    ? { eventId: `render.ok.${hex16(intento.attemptId)}`, jobId: job.jobId, attemptId: intento.attemptId, kind: 'succeeded', at, outputRefs: [assetId] }
    : {
      eventId: `render.lost.${hex16(intento.attemptId)}`, jobId: job.jobId, attemptId: intento.attemptId, kind: 'failed', at,
      error: errorDelCore('PROVIDER_ERROR', 'render', { details: { reason: 'render_lost' } }),
    };
  const d = motor.recibirEvento(job, aviso, at);
  if (d.status !== 'transition' || !d.transition) return 'nada';
  const r = await store.aplicar(d.transition);
  return r.applied ? (listo ? 'hecho' : 'perdido') : 'nada';
};

export interface InformeDeLaPasadaDeRender {
  /** Trabajos sin terminar vistos, de cualquier clase. */
  mirados: number;
  /** De ellos, renders. A los demás no se les hizo nada. */
  deRender: number;
  recuperados: number;
  reconciliados: number;
  encolados: number;
  atendidos: number;
  completados: number;
  fallidos: number;
  errores: number;
  /** Quedaron páginas sin mirar: las mira la siguiente pasada. */
  quedan: boolean;
}

export interface DepsDeLaPasadaDeRender {
  db: Firestore;
  /** Cuánto puede durar la pasada entera: la vida de la invocación menos un margen. */
  presupuestoMs: number;
  ahora?: () => number;
  ejecutor?: JobExecutor;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  worker?: string;
}

/**
 * UNA PASADA DEL TRABAJADOR DEL RENDER.
 *
 *   1. buscar      los trabajos sin terminar, página a página; solo los renders
 *   2. recuperar   `evaluar`: la concesión caducada, el plazo vencido
 *   3. reconciliar lo que se quedó sin saber, con el material
 *   4. avisar      lo que toca ya, a la cola de esta invocación
 *   5. atender     con el trabajador de siempre, mientras quepa un intento entero
 *
 * No empieza un montaje que no pueda terminar dentro de la invocación: un
 * intento puede durar veinte minutos, y si no quedan, lo coge la siguiente.
 */
export const pasadaDeRender = async (deps: DepsDeLaPasadaDeRender): Promise<InformeDeLaPasadaDeRender> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const empezo = ahora();
  const fin = empezo + deps.presupuestoMs;
  const store = almacenDeTrabajos(deps.db);
  const { motor } = crearMotorDeTrabajosDeWee(POLITICA_DEL_RENDER);
  const cola = colaDeInvocacion(ahora);
  const leer = deps.leer ?? ((assetId: string) => leerMaterial(assetId).catch(() => null));
  const worker = deps.worker ?? `render-${randomUUID().slice(0, 8)}`;
  const informe: InformeDeLaPasadaDeRender = {
    mirados: 0, deRender: 0, recuperados: 0, reconciliados: 0, encolados: 0, atendidos: 0, completados: 0, fallidos: 0, errores: 0, quedan: false,
  };

  let cursor: string | undefined;
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { jobs, cursor: siguiente } = await store.recuperables({ before: ahora(), limit: POR_PAGINA, ...(cursor ? { cursor } : {}) });
    for (const job of jobs) {
      informe.mirados++;
      if (!esTrabajoDeRender(job)) continue;
      informe.deRender++;
      try {
        let actual = job;
        const d = motor.evaluar(actual, ahora());
        if (d.status === 'transition' && d.transition) {
          const r = await store.aplicar(d.transition);
          if (!r.applied) continue;
          actual = r.job;
          informe.recuperados++;
        }
        const rec = await reconciliarRender(store, motor, actual, ahora(), leer);
        if (rec === 'hecho' || rec === 'perdido') {
          informe.reconciliados++;
          actual = (await store.obtener(actual.jobId)) ?? actual;
        }
        if (!esTrabajoTerminal(actual.state) && actual.state === 'queued' && actual.availableAt <= ahora()) {
          await cola.enqueue(mensajeDeCola(actual, ahora(), 'requeued'));
          informe.encolados++;
        }
      } catch {
        /* Un trabajo que no se pudo mirar no para la pasada: lo mira la siguiente. */
        informe.errores++;
      }
    }
    cursor = siguiente;
    if (!cursor) break;
  }
  informe.quedan = !!cursor;

  const ejecutor = deps.ejecutor ?? crearEjecutorDeRender({ ahora, limite: () => fin });
  const config = { worker, visibilityMs: POLITICA_DEL_RENDER.leaseMs, backpressureDelayMs: 30_000 };
  while (ahora() + POLITICA_DEL_RENDER.attemptTimeoutMs <= fin) {
    const entrega = await cola.claim({ worker, at: ahora(), visibilityMs: POLITICA_DEL_RENDER.leaseMs });
    if (!entrega) break;
    try {
      const r = await atenderEntrega({ store, queue: cola, engine: motor, executor: ejecutor, config, now: ahora }, entrega);
      informe.atendidos++;
      if (r.jobState === 'completed') informe.completados++;
      if (r.jobState === 'failed' || r.jobState === 'timed_out') informe.fallidos++;
    } catch {
      informe.errores++;
    }
  }
  return informe;
};

export const anotarPasadaDeRender = (i: InformeDeLaPasadaDeRender): void => {
  if (!i.deRender && !i.errores) return;
  console.log(
    `WEË RENDER · mirados=${i.mirados} renders=${i.deRender} recuperados=${i.recuperados} reconciliados=${i.reconciliados}`
    + ` encolados=${i.encolados} atendidos=${i.atendidos} completados=${i.completados} fallidos=${i.fallidos} errores=${i.errores}`
    + `${i.quedan ? ' · quedan páginas' : ''}`,
  );
};

/* ── Las puertas ───────────────────────────────────────────────────────────── */

const REGION = 'us-central1';
const texto = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined);
const entero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) ? v : undefined);

/**
 * PEDIR Y MIRAR. La cuenta sale de la sesión, por la única puerta que hay; de
 * los datos solo se lee la producción, la revisión y la huella de un montaje.
 * Nada de lo que decide qué se monta —planos, vídeos, formato— llega del
 * cliente: lo calcula el servidor desde la producción guardada.
 */
export const renders = onCall({ region: REGION, timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const db = getFirestore();
  const cuenta = await cuentaDelPrincipalEnWee(db, request.auth.uid);
  if (!cuenta) throw new HttpsError('permission-denied', 'No encontramos tu cuenta.');
  const quien = { uid: request.auth.uid, accountId: cuenta.accountId };

  const data = (request.data || {}) as Record<string, unknown>;
  const op = String(data.op || '');
  const productionId = texto(data.productionId, 128);
  const noVale: () => never = () => { throw new HttpsError('invalid-argument', 'Faltan datos o no tienen forma válida.'); };
  if (!productionId) noVale();

  if (op === 'render.request') {
    const revision = entero(data.revision);
    if (revision === undefined || revision < 0) noVale();
    const r = await pedirRender(db, quien, { productionId: productionId as string, revision: revision as number }, { at: Date.now() });
    return r.ok
      ? { render: r.vista, created: r.nuevo }
      : { refused: { reason: r.motivo, ...(r.faltan ? { missing: r.faltan } : {}), ...(r.limite !== undefined ? { limit: r.limite } : {}) } };
  }
  if (op === 'render.status') {
    const huella = typeof data.montage === 'string' && /^[0-9a-f]{64}$/.test(data.montage) ? data.montage : undefined;
    if (!huella) noVale();
    return { render: await estadoDelRender(db, quien, { productionId: productionId as string, huella: huella as string }) };
  }
  if (op === 'render.list') return { renders: await rendersDeLaProduccion(db, quien, productionId as string) };
  return noVale();
});

/** La invocación del trabajador: treinta minutos, el máximo de una tarea programada. */
export const VIDA_DEL_TRABAJADOR_S = 1800;

/**
 * EL TRABAJADOR. Cada minuto: una pasada. Dos instancias como mucho, y una
 * petición por instancia: un montaje ocupa los dos procesadores. Cuatro gigas
 * porque el disco temporal de una Function vive en memoria, y ahí caben los
 * planos, el montaje y FFmpeg.
 */
export const renderWorker = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: REGION,
    timeoutSeconds: VIDA_DEL_TRABAJADOR_S,
    memory: '4GiB',
    cpu: 2,
    maxInstances: 2,
    concurrency: 1,
  },
  async () => {
    const informe = await pasadaDeRender({ db: getFirestore(), presupuestoMs: (VIDA_DEL_TRABAJADOR_S - 60) * 1000 });
    anotarPasadaDeRender(informe);
  },
);
