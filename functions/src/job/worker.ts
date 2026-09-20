import {
  AttemptReport,
  ContadorDeCapacidad,
  Job,
  JobDecision,
  JobEngine,
  JobExecutor,
  JobStore,
  Principal,
  QueueDelivery,
  QueuePort,
  ResultadoDeEntrega,
  WorkerConfig,
  errorDelCore,
  esTrabajoTerminal,
  leerMensajeDeCola,
  mensajeDeCola,
  workerValido,
} from '../core';

/**
 * WEE JOB ENGINE — UN TRABAJADOR ATIENDE UNA ENTREGA.
 *
 * El Job Engine decide y no ejecuta; la cola avisa y no sabe; el almacén guarda
 * y no decide. Esto es lo que las junta, y es lo único que hace: el ORDEN.
 *
 *   mensaje → leer el TRABAJO del almacén → recuperar si alguien murió →
 *   reclamar → GUARDAR → marcar que sale → GUARDAR → ejecutar → informar →
 *   GUARDAR → volver a encolar si toca → confirmar la entrega
 *
 * El orden es el contrato. Casi todos los dobles cobros de un sistema de
 * trabajos nacen de hacer dos de esos pasos al revés: ejecutar antes de guardar
 * que se reclamó, llamar al proveedor antes de guardar que sale, confirmar la
 * entrega antes de guardar el resultado. El Job Engine lo decía en un
 * comentario; aquí está escrito una vez, para que nadie lo vuelva a ordenar.
 *
 * ── Sin estado ──────────────────────────────────────────────────────────────
 *
 * No hay nada a nivel de módulo, ni una variable que sobreviva a una entrega.
 * Todo lo que un trabajador sabe lo acaba de leer del almacén. Por eso un
 * trabajador nuevo —otro proceso, otra máquina— puede coger un trabajo que creó
 * otro, y por eso matar uno a mitad no pierde nada: lo que llevaba en la mano
 * estaba guardado.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un bucle: atiende UNA entrega y devuelve qué pasó. Quién lo llama, cada
 * cuánto y en cuántos procesos es infraestructura, y no está aquí. No elige
 * proveedor ni llama a ninguno: eso es del ejecutor que se le enchufe. No cobra,
 * no reserva y no reembolsa: lo que costó viaja en el informe y lo lee quien
 * tenga que leerlo, exactamente como antes de que existiera la cola.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA. No hay almacén de Firestore, ni
 * cola, ni quien llame a esta función fuera de las pruebas.
 */

export interface WorkerDeps {
  store: JobStore;
  queue: QueuePort;
  engine: JobEngine;
  executor: JobExecutor;
  config: WorkerConfig;
  /** El reloj entra por la puerta, como en todo el Job Engine. */
  now: () => number;
  /** Cuánto hay en marcha. Sin él, los topes no se pueden comprobar y `reclamar` lo avisa. */
  capacity?: ContadorDeCapacidad;
}

const desenlaceDe = (d: JobDecision): string => d.refusal ?? d.error?.details?.reason?.toString() ?? d.status;

/**
 * Aplica una decisión que trae transición. `undefined` = alguien escribió antes:
 * la revisión ya no era la esperada y el almacén no aplicó nada. No es un error.
 */
const guardar = async (store: JobStore, d: JobDecision): Promise<Job | undefined> => {
  if (d.status !== 'transition' || !d.transition) return undefined;
  const r = await store.aplicar(d.transition);
  return r.applied ? r.job : undefined;
};

export const atenderEntrega = async (deps: WorkerDeps, delivery: QueueDelivery): Promise<ResultadoDeEntrega> => {
  const { store, queue, engine, executor, config, now } = deps;
  if (!workerValido(config)) throw new Error('atenderEntrega: la configuración del trabajador no es válida');
  const base = { deliveryId: delivery.deliveryId, deliveryCount: delivery.deliveryCount, worker: config.worker, receivedAt: delivery.receivedAt };

  /* 1 · El mensaje es de fuera. Si no vale, se confirma para que no vuelva: un veneno que reintenta para la cola. */
  const leido = leerMensajeDeCola(delivery.message);
  if (!leido.ok) {
    await queue.ack(delivery.deliveryId);
    return { ...base, outcome: 'dropped', detail: `message_${leido.code}` };
  }
  const { mensaje } = leido;

  /* 2 · LA VERDAD ES EL ALMACÉN. Del mensaje solo sale el identificador. */
  let job = await store.obtener(mensaje.jobId);
  if (!job) {
    await queue.ack(delivery.deliveryId);
    return { ...base, outcome: 'dropped', detail: 'job_not_found', jobId: mensaje.jobId, enqueuedAt: mensaje.enqueuedAt };
  }
  const rastro = (j: Job) => ({
    jobId: j.jobId, accountId: j.owner.userId, requestId: j.trace.requestId, traceId: j.trace.traceId,
    operationId: j.context.operationId, appId: j.context.appId, enqueuedAt: mensaje.enqueuedAt,
    queueLatencyMs: Math.max(0, delivery.receivedAt - mensaje.enqueuedAt), jobState: j.state,
  });

  /* 3 · Ya terminó: una entrega repetida después del final no hace nada. */
  if (esTrabajoTerminal(job.state)) {
    await queue.ack(delivery.deliveryId);
    return { ...base, ...rastro(job), outcome: 'skipped', detail: 'terminal' };
  }

  /*
   * 4 · ¿SE MURIÓ QUIEN LO TENÍA? Recuperar es de quien llega, no de un proceso
   * aparte: si la concesión caducó, `evaluar` cierra aquel intento —que no
   * vuelve a usarse jamás— y devuelve el trabajo a la cola, o lo deja esperando
   * si había salido hacia el proveedor y no se sabe cómo acabó.
   */
  const evaluado = engine.evaluar(job, now());
  if (evaluado.status === 'transition') {
    const tras = await guardar(store, evaluado);
    if (!tras) { await queue.nack(delivery.deliveryId, { delayMs: 0 }); return { ...base, ...rastro(job), outcome: 'lost', detail: 'recovery_race' }; }
    job = tras;
    if (esTrabajoTerminal(job.state)) { await queue.ack(delivery.deliveryId); return { ...base, ...rastro(job), outcome: 'skipped', detail: desenlaceDe(evaluado) }; }
  }

  /* 5 · Quien actúa es el dueño del trabajo, LEÍDO del almacén. El mensaje no dice quién es nadie. */
  const principal: Principal = { userId: job.owner.userId, ...(job.context.appId ? { appId: job.context.appId } : {}) };
  const capacidad = deps.capacity ? await deps.capacity.capacidad(job) : undefined;
  const reclamo = engine.reclamar(job, { principal, at: now(), worker: config.worker, ...(capacidad ? { capacity: capacidad } : {}), ...(config.limits ? { limits: config.limits } : {}) });

  if (reclamo.status !== 'transition' || !reclamo.dispatch) {
    const por = desenlaceDe(reclamo);
    /* No toca todavía, no cabe, o lo tiene otro con la concesión viva: vuelve más tarde. Esto ES la contrapresión. */
    if (reclamo.refusal === 'not_available_yet' || reclamo.refusal === 'at_capacity' || reclamo.refusal === 'leased') {
      const hasta = reclamo.refusal === 'not_available_yet' ? (reclamo.retryAt ?? job.availableAt)
        : reclamo.refusal === 'leased' ? Math.max(...job.attempts.map((a) => a.lease?.until ?? 0), now())
          : now() + config.backpressureDelayMs;
      const delayMs = Math.max(0, hasta - now());
      await queue.nack(delivery.deliveryId, { delayMs });
      return { ...base, ...rastro(job), outcome: 'deferred', detail: por, requeuedFor: now() + delayMs };
    }
    /* Vencido al reclamar: `reclamar` devuelve la transición a `timed_out`, y hay que guardarla. */
    if (reclamo.status === 'transition') { const tras = await guardar(store, reclamo); if (tras) job = tras; }
    await queue.ack(delivery.deliveryId);
    return { ...base, ...rastro(job), outcome: 'skipped', detail: por };
  }

  /* 6 · GUARDAR QUE ES MÍO, antes de hacer nada con ello. Si otro escribió primero, es suyo. */
  const reclamado = await guardar(store, reclamo);
  if (!reclamado) {
    await queue.ack(delivery.deliveryId);
    return { ...base, ...rastro(job), outcome: 'lost', detail: 'claim_race' };
  }
  job = reclamado;
  const { dispatch } = reclamo;

  /* 7 · GUARDAR QUE SALE, antes de salir. Es lo que separa «se cayó sin pedir nada» de «se cayó sin saber qué contestaron». */
  const marca = engine.marcarEnvio(job, { principal, at: now(), worker: config.worker, attemptId: dispatch.attemptId });
  const marcado = await guardar(store, marca);
  if (!marcado) {
    await queue.ack(delivery.deliveryId);
    return { ...base, ...rastro(job), outcome: 'lost', detail: 'dispatch_mark_race', attemptId: dispatch.attemptId, attempt: dispatch.attempt };
  }
  job = marcado;

  /* 8 · EJECUTAR. Lo único que toca el mundo, y lo hace con el paquete que salió del trabajo guardado. */
  const startedAt = now();
  const renovar = async (): Promise<boolean> => {
    const actual = await store.obtener(dispatch.jobId);
    if (!actual) return false;
    const r = engine.renovar(actual, { principal, at: now(), worker: config.worker });
    return !!(await guardar(store, r));
  };
  let informe: AttemptReport;
  try {
    informe = await executor.ejecutar(dispatch, { renovar });
  } catch {
    /* Salió y no se sabe cómo acabó. Decir que falló sería inventar, y repetirlo podría cobrarse dos veces. */
    informe = { attemptId: dispatch.attemptId, outcome: 'unknown', dispatched: true, error: errorDelCore('INTERNAL_ERROR', 'job', { details: { reason: 'executor_threw' } }) };
  }
  const endedAt = now();
  const ejecucion = { attemptId: dispatch.attemptId, attempt: dispatch.attempt, startedAt, endedAt, executionMs: Math.max(0, endedAt - startedAt), attemptOutcome: informe.outcome, ...(informe.error ? { errorCode: informe.error.code } : {}) };

  /* 9 · INFORMAR Y GUARDAR. Se relee: mientras se ejecutaba pudieron cancelar, o quitarle la concesión. */
  const vigente = (await store.obtener(dispatch.jobId)) ?? job;
  const cierre = engine.informar(vigente, { principal, at: now(), worker: config.worker, report: informe });
  const cerrado = await guardar(store, cierre);
  if (!cerrado) {
    /* Un zombi: la concesión ya era de otro, o el intento ya no es el actual. Su informe no mueve nada, y está bien. */
    await queue.ack(delivery.deliveryId);
    return { ...base, ...rastro(vigente), ...ejecucion, outcome: 'lost', detail: cierre.status === 'transition' ? 'report_race' : desenlaceDe(cierre) };
  }
  job = cerrado;

  /* 10 · Si queda otro intento, se AVISA ANTES de confirmar esta entrega: caerse entre medias deja un aviso de más, nunca uno de menos. */
  let requeuedFor: number | undefined;
  if (job.state === 'queued') {
    await queue.enqueue(mensajeDeCola(job, now(), 'retry'));
    requeuedFor = job.availableAt;
  }
  await queue.ack(delivery.deliveryId);
  return { ...base, ...rastro(job), ...ejecucion, outcome: 'executed', detail: desenlaceDe(cierre), ...(requeuedFor !== undefined ? { requeuedFor } : {}) };
};

/**
 * EL BARRIDO. La otra mitad de que la cola no sea la verdad.
 *
 * Una cola puede perder un mensaje, y un trabajador puede morirse sin devolver
 * nada. Lo que NO puede pasar es que el trabajo se quede sin nadie: esto
 * recorre lo que el almacén dice que sigue a medias, recupera lo que tenga la
 * concesión caducada y vuelve a avisar. Paginado, como exige el almacén.
 */
export const barrerRecuperables = async (
  deps: Pick<WorkerDeps, 'store' | 'queue' | 'engine' | 'now'>,
  opciones: { limit: number; cursor?: string },
): Promise<{ revisados: number; recuperados: number; avisados: number; cursor?: string }> => {
  const at = deps.now();
  const pagina = await deps.store.recuperables({ before: at, limit: opciones.limit, ...(opciones.cursor ? { cursor: opciones.cursor } : {}) });
  let recuperados = 0, avisados = 0;
  for (const job of pagina.jobs) {
    if (esTrabajoTerminal(job.state)) continue;
    const d = deps.engine.evaluar(job, at);
    const tras = d.status === 'transition' ? await guardar(deps.store, d) : undefined;
    if (tras) recuperados++;
    const actual = tras ?? job;
    if (actual.state === 'queued') { await deps.queue.enqueue(mensajeDeCola(actual, at, tras ? 'recovered' : 'requeued')); avisados++; }
  }
  return { revisados: pagina.jobs.length, recuperados, avisados, ...(pagina.cursor ? { cursor: pagina.cursor } : {}) };
};
