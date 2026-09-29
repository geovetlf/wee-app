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
import { POLITICA_DEL_POSTER, TAREA_DE_POSTER, estadoDeLosPosters, leerPaqueteDePoster, pedirPosters, posterDelMaterial } from './poster';
import { publicarMontaje } from './publicacion';
import { planDeVoces } from './vocesDeDialogo';
import { POLITICA_DEL_RENDER, TAREA_DE_RENDER, estadoDelRender, materialDelRender, pedirRender, rendersDeLaProduccion } from './render';
import { almacenDelRenderDeWee, crearEjecutorDePoster, crearEjecutorDeRender } from './renderizador';

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
 * Nada que no sea suyo. Mira los trabajos sin terminar de todo Weë —así los
 * sirve el almacén— y a los que no son `media.render` ni, desde la Fase 11,
 * `media.video_poster` no les hace NADA: ni los evalúa, ni los recupera, ni los
 * avisa. Esos son del conductor, de su reconciliador y de su barrido.
 *
 * ── Los pósters (Fase 11) ───────────────────────────────────────────────────
 *
 * El póster de un vídeo es otra tarea del MISMO trabajador: el mismo FFmpeg, el
 * mismo almacén, la misma cola de la invocación y el mismo Job Engine, con su
 * propia política. Van delante en la cola —un póster es un fotograma; un render,
 * minutos— y cada trabajo se empieza solo si le cabe SU intento entero.
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
export const esTrabajoDePoster = (job: Job): boolean => job.task?.name === TAREA_DE_POSTER && job.capability === undefined;
/** Lo que atiende este trabajador: renders y pósters. Nada más. */
export const esTrabajoDelTrabajador = (job: Job): boolean => esTrabajoDeRender(job) || esTrabajoDePoster(job);

const hex16 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

export type DesenlaceDeLaReconciliacionDeRender = 'nada' | 'hecho' | 'perdido' | 'esperar';

/** El intento que se quedó sin saber, si lo hay y su concesión ya caducó. */
const intentoSinSaber = (job: Job, at: number) => {
  const intento = job.attempts[job.attempts.length - 1];
  if (job.state !== 'waiting' || !intento || intento.outcome !== 'unknown') return undefined;
  if (intento.lease && intento.lease.until > at) return undefined;
  return intento;
};

/**
 * CERRAR UN INTENTO SIN SABER CON LA VERDAD DE SU TAREA. Por `recibirEvento`,
 * como un aviso de proveedor: la misma tabla, el mismo reintento, el mismo plazo.
 */
const cerrarConSuVerdad = async (
  store: Pick<JobStore, 'aplicar'>,
  motor: Pick<JobEngine, 'recibirEvento'>,
  job: Job,
  at: number,
  verdad: { hecho: boolean; outputRefs: string[]; tarea: 'render' | 'poster' },
): Promise<DesenlaceDeLaReconciliacionDeRender> => {
  const intento = intentoSinSaber(job, at);
  if (!intento) return 'nada';
  if (!verdad.hecho && at - (intento.endedAt ?? intento.startedAt) < GRACIA_DE_UN_INTENTO_PERDIDO_MS) return 'esperar';
  const aviso: ProviderEvent = verdad.hecho
    ? { eventId: `${verdad.tarea}.ok.${hex16(intento.attemptId)}`, jobId: job.jobId, attemptId: intento.attemptId, kind: 'succeeded', at, outputRefs: verdad.outputRefs }
    : {
      eventId: `${verdad.tarea}.lost.${hex16(intento.attemptId)}`, jobId: job.jobId, attemptId: intento.attemptId, kind: 'failed', at,
      error: errorDelCore('PROVIDER_ERROR', verdad.tarea, { details: { reason: `${verdad.tarea}_lost` } }),
    };
  const d = motor.recibirEvento(job, aviso, at);
  if (d.status !== 'transition' || !d.transition) return 'nada';
  const r = await store.aplicar(d.transition);
  return r.applied ? (verdad.hecho ? 'hecho' : 'perdido') : 'nada';
};

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
  if (!intentoSinSaber(job, at)) return 'nada';
  const assetId = materialDelRender(job.trace.requestId);
  const m = await leer(assetId);
  const hecho = !!m && m.ownerAccountId === job.owner.userId && m.status === 'ready' && m.kind === 'video';
  return cerrarConSuVerdad(store, motor, job, at, { hecho, outputRefs: [assetId], tarea: 'render' });
};

/**
 * RECONCILIAR UN PÓSTER CON SU VERDAD: LA VARIANTE ANOTADA EN SU VÍDEO. Si está,
 * el póster está hecho, diga lo que diga el trabajo; si no, pasada la gracia, ese
 * intento se da por perdido y el Job Engine decide si queda otro.
 */
export const reconciliarPoster = async (
  store: Pick<JobStore, 'aplicar'>,
  motor: Pick<JobEngine, 'recibirEvento'>,
  job: Job,
  at: number,
  leer: (assetId: string) => Promise<AssetDoc | null>,
): Promise<DesenlaceDeLaReconciliacionDeRender> => {
  if (!intentoSinSaber(job, at)) return 'nada';
  const leido = leerPaqueteDePoster(job.input, job.owner.userId);
  const assetId = leido.ok ? leido.paquete.assetId : undefined;
  const m = assetId ? await leer(assetId) : null;
  const hecho = !!assetId && !!m && m.ownerAccountId === job.owner.userId && !!posterDelMaterial(m, job.owner.userId);
  return cerrarConSuVerdad(store, motor, job, at, { hecho, outputRefs: assetId ? [assetId] : [], tarea: 'poster' });
};

export interface InformeDeLaPasadaDeRender {
  /** Trabajos sin terminar vistos, de cualquier clase. */
  mirados: number;
  /** De ellos, renders. */
  deRender: number;
  /** Y pósters (Fase 11). A los demás no se les hizo nada. */
  dePoster: number;
  recuperados: number;
  reconciliados: number;
  encolados: number;
  atendidos: number;
  completados: number;
  fallidos: number;
  errores: number;
  /** Avisados que no cabían en lo que quedaba de invocación: siguen en cola para la siguiente pasada. */
  aplazados: number;
  /** Quedaron páginas sin mirar: las mira la siguiente pasada. */
  quedan: boolean;
}

export interface DepsDeLaPasadaDeRender {
  db: Firestore;
  /** Cuánto puede durar la pasada entera: la vida de la invocación menos un margen. */
  presupuestoMs: number;
  ahora?: () => number;
  /** El ejecutor de los renders. */
  ejecutor?: JobExecutor;
  /** El de los pósters (Fase 11). */
  ejecutorDePoster?: JobExecutor;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  worker?: string;
}

/**
 * UNA PASADA DEL TRABAJADOR DEL RENDER (Y, DESDE LA FASE 11, DE LOS PÓSTERS).
 *
 *   1. buscar      los trabajos sin terminar, página a página; solo los suyos
 *   2. recuperar   `evaluar`: la concesión caducada, el plazo vencido
 *   3. reconciliar lo que se quedó sin saber, con su verdad: el material o la variante
 *   4. avisar      lo que toca ya, a la cola de esta invocación, los pósters delante
 *   5. atender     con el trabajador de siempre, cada uno si le cabe su intento entero
 *
 * No empieza un montaje que no pueda terminar dentro de la invocación: un
 * intento puede durar veinte minutos, y si no quedan, lo coge la siguiente. Un
 * póster necesita cinco, y puede caber donde un montaje ya no cabe.
 */
export const pasadaDeRender = async (deps: DepsDeLaPasadaDeRender): Promise<InformeDeLaPasadaDeRender> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const empezo = ahora();
  const fin = empezo + deps.presupuestoMs;
  const store = almacenDeTrabajos(deps.db);
  /* Un solo motor: cada trabajo lleva SU política guardada, y el Job Engine usa esa. */
  const { motor } = crearMotorDeTrabajosDeWee(POLITICA_DEL_RENDER);
  const cola = colaDeInvocacion(ahora);
  const leer = deps.leer ?? ((assetId: string) => leerMaterial(assetId).catch(() => null));
  const worker = deps.worker ?? `render-${randomUUID().slice(0, 8)}`;
  const informe: InformeDeLaPasadaDeRender = {
    mirados: 0, deRender: 0, dePoster: 0, recuperados: 0, reconciliados: 0, encolados: 0, atendidos: 0, completados: 0, fallidos: 0, errores: 0, aplazados: 0, quedan: false,
  };
  /* Lo que se avisará, y cuánto necesita cada uno: el intento de SU política. */
  const avisar: Job[] = [];
  const necesita = new Map<string, number>();

  let cursor: string | undefined;
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { jobs, cursor: siguiente } = await store.recuperables({ before: ahora(), limit: POR_PAGINA, ...(cursor ? { cursor } : {}) });
    for (const job of jobs) {
      informe.mirados++;
      if (!esTrabajoDelTrabajador(job)) continue;
      const esPoster = esTrabajoDePoster(job);
      if (esPoster) informe.dePoster++;
      else informe.deRender++;
      try {
        let actual = job;
        const d = motor.evaluar(actual, ahora());
        if (d.status === 'transition' && d.transition) {
          const r = await store.aplicar(d.transition);
          if (!r.applied) continue;
          actual = r.job;
          informe.recuperados++;
        }
        const rec = await (esPoster ? reconciliarPoster : reconciliarRender)(store, motor, actual, ahora(), leer);
        if (rec === 'hecho' || rec === 'perdido') {
          informe.reconciliados++;
          actual = (await store.obtener(actual.jobId)) ?? actual;
        }
        if (!esTrabajoTerminal(actual.state) && actual.state === 'queued' && actual.availableAt <= ahora()) {
          avisar.push(actual);
          necesita.set(actual.jobId, actual.policy.attemptTimeoutMs);
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

  /* Los pósters delante: un fotograma no espera detrás de un montaje de veinte minutos. */
  for (const job of [...avisar.filter(esTrabajoDePoster), ...avisar.filter((j) => !esTrabajoDePoster(j))]) {
    try {
      await cola.enqueue(mensajeDeCola(job, ahora(), 'requeued'));
      informe.encolados++;
    } catch {
      informe.errores++;
    }
  }

  const deRender = deps.ejecutor ?? crearEjecutorDeRender({ ahora, limite: () => fin });
  const dePoster = deps.ejecutorDePoster ?? crearEjecutorDePoster({ ahora, limite: () => fin });
  /* Un solo puerto, dos ejecutores: cada despacho va al de su tarea. */
  const ejecutor: JobExecutor = {
    ejecutar: (dispatch, control) => (dispatch.task?.name === TAREA_DE_POSTER ? dePoster : deRender).ejecutar(dispatch, control),
  };
  const config = { worker, visibilityMs: POLITICA_DEL_RENDER.leaseMs, backpressureDelayMs: 30_000 };
  const elMasCorto = Math.min(POLITICA_DEL_POSTER.attemptTimeoutMs, POLITICA_DEL_RENDER.attemptTimeoutMs);
  while (ahora() + elMasCorto <= fin) {
    const entrega = await cola.claim({ worker, at: ahora(), visibilityMs: POLITICA_DEL_RENDER.leaseMs });
    if (!entrega) break;
    /*
     * ¿Le cabe SU intento entero? Si no, no se empieza: el aviso se da por visto
     * en esta cola —que se acaba con la invocación— y el trabajo sigue en cola en
     * el almacén, que es la verdad. La siguiente pasada lo encuentra.
     */
    const jobId = String((entrega.message as { jobId?: unknown } | undefined)?.jobId ?? '');
    if (ahora() + (necesita.get(jobId) ?? POLITICA_DEL_RENDER.attemptTimeoutMs) > fin) {
      await cola.ack(entrega.deliveryId);
      informe.aplazados++;
      continue;
    }
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
  if (!i.deRender && !i.dePoster && !i.errores) return;
  console.log(
    `WEË RENDER · mirados=${i.mirados} renders=${i.deRender} posters=${i.dePoster} recuperados=${i.recuperados} reconciliados=${i.reconciliados}`
    + ` encolados=${i.encolados} atendidos=${i.atendidos} completados=${i.completados} fallidos=${i.fallidos} aplazados=${i.aplazados} errores=${i.errores}`
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

  /*
   * FASE 14 (D8) · PUBLICAR EL MONTAJE. Solo con un gesto de la persona: el
   * montaje de un render HECHO, de la cuenta, con su archivo en su sitio y la
   * duración de su destino, como Weël o como vídeo del Home. Del cliente llegan
   * el montaje, el destino, la cara y el texto; lo demás lo comprueba el servidor.
   */
  if (op === 'render.publish') {
    const huella = typeof data.montage === 'string' && /^[0-9a-f]{64}$/.test(data.montage) ? data.montage : undefined;
    if (!huella) noVale();
    const r = await publicarMontaje(
      db,
      quien,
      { productionId: productionId as string, huella: huella as string, destino: data.destination, cara: data.face, texto: data.text },
      { almacen: almacenDelRenderDeWee() },
    );
    return r.ok
      ? { published: { postId: r.postId, destination: r.destino, alreadyPublished: r.yaEstaba } }
      : { refused: { reason: r.motivo, ...(r.estado ? { state: r.estado } : {}) } };
  }

  /*
   * FASE 11 · LOS PÓSTERS DE UNA PRODUCCIÓN: de los vídeos de sus planos y de sus
   * montajes. `poster.request` pide los que faltan —idempotente, con la puerta
   * del render— y contesta cómo va cada uno; `poster.list` solo contesta. Los que
   * están salen con su dirección, calculada aquí al leer y guardada en ningún
   * sitio. Del cliente solo llega la producción.
   */
  if (op === 'poster.request') {
    const r = await pedirPosters(db, quien, productionId as string, { at: Date.now(), almacen: almacenDelRenderDeWee() });
    return { posters: r.posters, requested: r.requested, ...(r.refused ? { refused: { reason: r.refused } } : {}) };
  }
  if (op === 'poster.list') {
    return { posters: await estadoDeLosPosters(db, quien, productionId as string, { at: Date.now(), almacen: almacenDelRenderDeWee() }) };
  }

  /*
   * FASE 19 · LAS VOCES DEL DIÁLOGO, SOLO MIRADAS: qué líneas de la producción
   * guardada necesitarían voz, de quién son y en qué idiomas, cuántas tienen voz
   * (ninguna) y por qué. Con `assign` ({ quien: voz }), comprueba cada asignación
   * sin guardar nada. Ni se sintetiza, ni se cobra, ni se llama a un proveedor.
   */
  if (op === 'voice.plan') {
    const revision = entero(data.revision);
    if (revision === undefined || revision < 0) noVale();
    const r = await planDeVoces(db, quien, { productionId: productionId as string, revision: revision as number, asignar: data.assign });
    return r.ok ? { voices: r.plan } : { refused: { reason: r.motivo } };
  }
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
