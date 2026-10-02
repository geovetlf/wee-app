import { FieldPath } from 'firebase-admin/firestore';
import type { DocumentReference, DocumentSnapshot, Firestore, Query } from 'firebase-admin/firestore';
import {
  ContadorDeCapacidad,
  Job,
  JobCapacity,
  JobLimits,
  JobStore,
  JobTransition,
  Principal,
  Workflow,
  WorkflowRun,
  claveDeIdempotencia,
  esTrabajoTerminal,
} from '../core';
import type { AlmacenDeEjecuciones, EjecucionGuardada } from './conductor';
import type { FuenteDeTrabajosPorLiquidar } from './barrendero';
import { reservaDe } from './liquidacion';
import { BusquedaPorOperacion, claveDeOperacion, clavesDeOperacionDe, intentoDeLaOperacion } from './proveedor';

/**
 * WEË RUNTIME — DÓNDE VIVEN LOS TRABAJOS Y LAS EJECUCIONES.
 *
 * `JobStore` lleva desde la Fase 8 siendo un puerto que solo implementaban las
 * pruebas. Esta es su implementación de verdad, sobre Firestore, y cumple las
 * dos garantías que el contrato pide sin rodeos:
 *
 *   CREAR SOLO SI NO ESTÁ, en UNA operación. La identidad de idempotencia ES el
 *   identificador del documento —que es «el camino natural» que el propio
 *   contrato señala— y se crea con `create()`, que falla si ya existe. No hay
 *   un «si no existe, crea»: eso es una carrera.
 *
 *   ESCRIBIR SOLO SI NADIE ESCRIBIÓ ANTES. `aplicar` compara la revisión dentro
 *   de una transacción. Si ya no es la esperada, no escribe, y no es un error:
 *   es la carrera convirtiéndose en una repetición inofensiva.
 *
 * ── Por qué el trabajo se guarda como texto ─────────────────────────────────
 *
 * Un `Job` es un objeto que el motor produce y vuelve a leer TAL CUAL. Firestore
 * no guarda cualquier objeto: rechaza `undefined` (y el motor los deja: los
 * campos opcionales de la traza, la concesión de un intento cerrado), rechaza
 * listas dentro de listas y nombres de campo con puntos —y la entrada de un
 * trabajo, ya saneada por el motor, puede traer las tres cosas—. Traducirlo
 * campo a campo sería mantener una segunda definición de `Job` que un día
 * dejaría de coincidir con la primera.
 *
 * Así que el trabajo entero va en `json`, y a su lado, como campos de verdad,
 * SOLO lo que hace falta para buscar: estado, dueño, fechas. Esos campos son
 * una proyección —se reescriben con cada cambio— y nunca se leen como verdad.
 *
 * ── Lo que NO hace, a propósito ─────────────────────────────────────────────
 *
 * `aplicar` NO da por buena una escritura «porque el documento ya está como yo
 * lo iba a dejar». Parecería una mejora —cubre el reintento de una transacción
 * cuyo primer intento sí llegó— pero dos trabajadores con la misma identidad y
 * el mismo milisegundo producen el mismo documento, y los dos creerían haber
 * reclamado: doble ejecución, doble coste. Un compare-and-set estricto puede
 * costar un intento perdido; el atajo puede costar dinero. Se elige lo primero.
 *
 * El barrido NO necesita índice compuesto: filtra por una igualdad y ordena por
 * el identificador del documento, que todo índice ya lleva al final.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA, y las colecciones `jobs` y
 * `workflowRuns` no existen en producción.
 */

export const COLECCION_DE_TRABAJOS = 'jobs';
export const COLECCION_DE_EJECUCIONES = 'workflowRuns';

const VERSION_DEL_DOCUMENTO = 1;
/** Lo que el motor produce para un ámbito o una clave. Cualquier otra cosa no puede ser de ningún trabajo. */
const FORMA_BUSCABLE = /^[A-Za-z0-9_.:-]{1,400}$/;
/** `already-exists`, en los dos dialectos en que lo dice el SDK. */
const yaExiste = (e: unknown): boolean => {
  const code = (e as { code?: unknown } | undefined)?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
};

/**
 * EL IDENTIFICADOR DEL DOCUMENTO DE UN TRABAJO: su identidad de idempotencia.
 *
 * Con un prefijo, porque la forma que el motor admite para un identificador
 * deja pasar `__x__`, que Firestore reserva para sí.
 */
const idDeTrabajo = (scope: string, key: string): string => `j.${claveDeIdempotencia(scope, key)}`;

const proyeccionDe = (job: Job): Record<string, unknown> => ({
  v: VERSION_DEL_DOCUMENTO,
  jobId: job.jobId,
  revision: job.revision,
  state: job.state,
  terminal: esTrabajoTerminal(job.state),
  ownerUserId: job.owner.userId,
  ...(job.context.appId ? { appId: job.context.appId } : {}),
  ...(job.context.workspaceId ? { workspaceId: job.context.workspaceId } : {}),
  ...(job.context.operationId ? { operationId: job.context.operationId } : {}),
  ...(job.context.workflowRunId ? { workflowRunId: job.context.workflowRunId } : {}),
  ...(job.context.stepId ? { stepId: job.context.stepId } : {}),
  ...(job.capability ? { capability: job.capability } : {}),
  ...(job.implementation ? { providerId: job.implementation.providerId, modelId: job.implementation.modelId } : {}),
  ...(job.task ? { task: job.task.name } : {}),
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  availableAt: job.availableAt,
  deadlineAt: job.deadlineAt,
  attemptCount: job.attemptCount,
  /*
   * ¿ESTE TRABAJO DECLARA DINERO RESERVADO? Solo es un campo de BÚSQUEDA, para
   * que el barrendero pueda encontrar lo que se quedó sin cerrar sin recorrer
   * la colección entera. No es la verdad de si está liquidado —esa la tiene la
   * transacción del Credit Engine, que es idempotente— y por eso volver a
   * escribirlo no rompe nada: como mucho hace mirar dos veces.
   */
  ...(reservaDe(job) ? { liquidacion: 'pendiente' } : {}),
  /*
   * CÓMO LLAMA EL PROVEEDOR A LO QUE ESTE TRABAJO LE MANDÓ.
   *
   * Cuando una tarea sigue viva del otro lado, un aviso del proveedor llega
   * diciendo `cgt-123` y nada más: ni de quién es, ni a qué intento pertenece.
   * Sin este campo no hay forma de encontrar su trabajo, porque la referencia
   * vive dentro del `json`, que es texto y no se consulta.
   *
   * Es una lista porque un trabajo puede haber intentado dos veces y tener dos
   * tareas distintas: un aviso sobre la primera tiene que encontrar su sitio
   * igual que uno sobre la segunda.
   */
  ...(clavesDeOperacionDe(job).length ? { providerOps: [...clavesDeOperacionDe(job)] } : {}),
  /* La verdad. Todo lo de arriba se deduce de esto y existe solo para poder buscar. */
  json: JSON.stringify(job),
});

const trabajoDe = (snap: DocumentSnapshot): Job | undefined => {
  const json = snap.exists ? snap.get('json') : undefined;
  if (typeof json !== 'string') return undefined;
  try {
    const job = JSON.parse(json) as Job;
    return job && typeof job === 'object' && typeof job.jobId === 'string' ? job : undefined;
  } catch {
    /* Un documento que no se puede leer no es un trabajo. El motor ya desconfía de lo que sale de un almacén; aquí no se inventa nada. */
    return undefined;
  }
};

/**
 * El almacén de Weë: el `JobStore` que pide la Fase 8, y además lo que el
 * barrendero necesita para encontrar lo que se quedó sin cerrar. Son dos
 * papeles del MISMO almacén, no dos almacenes.
 */
export type AlmacenDeTrabajosDeWee = JobStore & FuenteDeTrabajosPorLiquidar & {
  /** Busca el trabajo y el intento a los que pertenece una operación del proveedor. */
  porReferenciaDeProveedor(providerId: string, operationId: string): Promise<BusquedaPorOperacion>;
};

export const almacenDeTrabajos = (db: Firestore): AlmacenDeTrabajosDeWee => {
  const coleccion = db.collection(COLECCION_DE_TRABAJOS);
  const refDe = (job: Job): DocumentReference => coleccion.doc(idDeTrabajo(job.idempotency.scope, job.idempotency.key));

  return {
    async crearSiAusente(job) {
      const ref = refDe(job);
      try {
        await ref.create(proyeccionDe(job));
        return { created: true, job };
      } catch (e) {
        if (!yaExiste(e)) throw e;
        const ganador = trabajoDe(await ref.get());
        if (!ganador) throw e;
        return { created: false, job: ganador };
      }
    },

    async obtener(jobId) {
      if (typeof jobId !== 'string' || !FORMA_BUSCABLE.test(jobId)) return undefined;
      /* Lo normal: el identificador del trabajo ES su identidad de idempotencia, así que el documento se llama como él. */
      const directo = trabajoDe(await coleccion.doc(`j.${jobId}`).get());
      if (directo && directo.jobId === jobId) return directo;
      /* Quien creó el trabajo le puso nombre propio: entonces se busca por el campo. */
      const porCampo = await coleccion.where('jobId', '==', jobId).limit(1).get();
      return porCampo.empty ? undefined : trabajoDe(porCampo.docs[0]);
    },

    async porIdempotencia(scope, key) {
      /* Llega SIN validar —se pregunta antes de que el motor revise la petición—, así que no puede ni lanzar ni construir una ruta rara. */
      if (typeof scope !== 'string' || typeof key !== 'string' || !FORMA_BUSCABLE.test(scope) || !FORMA_BUSCABLE.test(key)) return undefined;
      return trabajoDe(await coleccion.doc(idDeTrabajo(scope, key)).get());
    },

    async aplicar(transition: JobTransition) {
      const ref = refDe(transition.job);
      return db.runTransaction(async (tx) => {
        const actual = trabajoDe(await tx.get(ref));
        /*
         * El contrato declara `job: Job`, pero de un trabajo que no existe no hay
         * ninguno que devolver. Los dos almacenes de referencia contestan lo mismo
         * aquí, y nadie lee `job` cuando `applied` es `false`.
         */
        if (!actual) return { applied: false, job: undefined as unknown as Job };
        if (actual.revision !== transition.expectedRevision) return { applied: false, job: actual };
        tx.set(ref, proyeccionDe(transition.job));
        return { applied: true, job: transition.job };
      });
    },

    async recuperables({ before, limit, cursor }) {
      const tope = Math.max(1, Math.min(Math.floor(limit), 500));
      let consulta = coleccion.where('terminal', '==', false).orderBy(FieldPath.documentId()).limit(tope);
      if (typeof cursor === 'string' && cursor.startsWith('j.')) consulta = consulta.startAfter(cursor);
      const pagina = await consulta.get();
      const jobs = pagina.docs.map(trabajoDe).filter((j): j is Job => !!j && j.updatedAt <= before);
      /* El cursor es del DOCUMENTO, no del último trabajo que pasó el filtro: si no, un filtrado al final de página repetiría la página. */
      return { jobs, ...(pagina.size === tope ? { cursor: pagina.docs[pagina.size - 1].id } : {}) };
    },

    /**
     * Lo que declara dinero reservado y todavía no consta cerrado. Misma forma
     * que `recuperables`: un campo único más el orden por identificador, que
     * Firestore sirve con su índice automático (docs/RUNTIME.md § 12.2).
     */
    async porLiquidar({ limit, cursor }) {
      const tope = Math.max(1, Math.min(Math.floor(limit), 500));
      let consulta = coleccion.where('liquidacion', '==', 'pendiente').orderBy(FieldPath.documentId()).limit(tope);
      if (typeof cursor === 'string' && cursor.startsWith('j.')) consulta = consulta.startAfter(cursor);
      const pagina = await consulta.get();
      const jobs = pagina.docs.map(trabajoDe).filter((j): j is Job => !!j);
      return { jobs, ...(pagina.size === tope ? { cursor: pagina.docs[pagina.size - 1].id } : {}) };
    },

    /**
     * DE «LA TAREA `cgt-123`» A «ESTE TRABAJO Y ESTE INTENTO».
     *
     * Una sola consulta por un campo de lista, que Firestore sirve con su
     * índice automático. Se piden DOS para poder detectar lo que no puede
     * pasar: si dos trabajos declararan la misma operación, no se elige uno
     * —elegir sería inventarse de quién es el dinero—, se dice que es ambigua.
     *
     * La cuenta NO sale de aquí: sale del trabajo que se devuelve
     * (`job.owner.userId`). Quien pregunte por una operación ajena recibe
     * exactamente lo mismo que quien pregunte por una que no existe.
     */
    async porReferenciaDeProveedor(providerId: string, operationId: string): Promise<BusquedaPorOperacion> {
      const clave = claveDeOperacion(providerId, operationId);
      if (!clave) return { ok: false, motivo: 'no_encontrada' };
      const pagina = await coleccion.where('providerOps', 'array-contains', clave).limit(2).get();
      if (pagina.empty) return { ok: false, motivo: 'no_encontrada' };
      if (pagina.size > 1) return { ok: false, motivo: 'ambigua' };
      const job = trabajoDe(pagina.docs[0]);
      if (!job) return { ok: false, motivo: 'no_encontrada' };
      const intento = intentoDeLaOperacion(job, { providerId, operationId });
      if (!intento) return { ok: false, motivo: 'intento_no_encontrado' };
      return { ok: true, job, intento };
    },

    /**
     * «De este ya no hace falta volver a mirar». Escribe UN campo de búsqueda y
     * no toca `json`, que es la verdad del motor: esto no es una transición y
     * no compite con el CAS. Si una transición posterior lo devuelve a
     * `pendiente`, el barrendero lo mirará otra vez y el Credit Engine le dirá
     * que ya estaba: cuesta una lectura, no un cobro.
     */
    async marcarLiquidado(jobId: string) {
      if (typeof jobId !== 'string' || !FORMA_BUSCABLE.test(jobId)) return;
      /* El mismo camino que `obtener`: lo normal es que el documento se llame como el trabajo; si no, se busca por el campo. */
      const directo = coleccion.doc(`j.${jobId}`);
      const snap = await directo.get();
      const ref = snap.exists && snap.get('jobId') === jobId
        ? directo
        : (await coleccion.where('jobId', '==', jobId).limit(1).get()).docs[0]?.ref;
      if (ref) await ref.update({ liquidacion: 'hecha' }).catch(() => undefined);
    },
  };
};

/* ── Las ejecuciones ──────────────────────────────────────────────────────── */

/** Un `runId` puede llevar barras y un documento no. `~` no es un carácter válido de ningún identificador, así que no puede chocar. */
const idDeEjecucion = (runId: string): string => `r.${runId.replace(/\//g, '~')}`;

const ejecucionDe = (snap: DocumentSnapshot): EjecucionGuardada | undefined => {
  if (!snap.exists) return undefined;
  const runJson = snap.get('runJson');
  const workflowJson = snap.get('workflowJson');
  const revision = snap.get('revision');
  if (typeof runJson !== 'string' || typeof workflowJson !== 'string' || typeof revision !== 'number') return undefined;
  try {
    return { run: JSON.parse(runJson) as WorkflowRun, workflow: JSON.parse(workflowJson) as Workflow, revision };
  } catch {
    return undefined;
  }
};

export const almacenDeEjecuciones = (db: Firestore, ahora: () => number): AlmacenDeEjecuciones => {
  const coleccion = db.collection(COLECCION_DE_EJECUCIONES);
  const cabecera = (run: WorkflowRun, revision: number): Record<string, unknown> => ({
    v: VERSION_DEL_DOCUMENTO,
    runId: run.id,
    workflowId: run.workflowId,
    userId: run.userId,
    state: run.state,
    revision,
    updatedAt: ahora(),
    runJson: JSON.stringify(run),
  });

  return {
    async crearSiAusente({ run, workflow }) {
      const ref = coleccion.doc(idDeEjecucion(run.id));
      try {
        await ref.create({ ...cabecera(run, 0), createdAt: ahora(), workflowJson: JSON.stringify(workflow) });
        return { created: true, guardada: { run, workflow, revision: 0 } };
      } catch (e) {
        if (!yaExiste(e)) throw e;
        const ganadora = ejecucionDe(await ref.get());
        if (!ganadora) throw e;
        return { created: false, guardada: ganadora };
      }
    },

    async obtener(runId) {
      if (typeof runId !== 'string' || !runId.length || runId.length > 400) return undefined;
      return ejecucionDe(await coleccion.doc(idDeEjecucion(runId)).get());
    },

    async guardar(run, expectedRevision) {
      const ref = coleccion.doc(idDeEjecucion(run.id));
      return db.runTransaction(async (tx) => {
        const actual = ejecucionDe(await tx.get(ref));
        if (!actual || actual.revision !== expectedRevision) return { saved: false, ...(actual ? { guardada: actual } : {}) };
        tx.update(ref, cabecera(run, expectedRevision + 1));
        return { saved: true, guardada: { run, workflow: actual.workflow, revision: expectedRevision + 1 } };
      });
    },
  };
};

/* ── Cuánto hay en marcha ─────────────────────────────────────────────────── */

/**
 * CUENTA SOLO LO QUE ALGUIEN VA A COMPARAR.
 *
 * Cada recuento es una consulta de agregación, y cuesta. Si un tope no está
 * puesto, su número no se pide: el Job Engine no lo mira (`ausente significa
 * «no se comprueba»`). «En marcha» es `running`: un intento con concesión viva.
 */
export const contadorDeCapacidad = (db: Firestore, limites: JobLimits): ContadorDeCapacidad & { alCrear(principal: Principal): Promise<JobCapacity | undefined> } => {
  const coleccion = db.collection(COLECCION_DE_TRABAJOS);
  const contar = async (filtros: readonly [string, string][]): Promise<number> => {
    let q: Query = coleccion;
    for (const [campo, valor] of filtros) q = q.where(campo, '==', valor);
    return (await q.count().get()).data().count;
  };
  const puesto = (n: number | undefined): boolean => typeof n === 'number';

  return {
    async capacidad(job) {
      const c: JobCapacity = {};
      if (puesto(limites.maxRunning)) c.running = await contar([['state', 'running']]);
      if (puesto(limites.maxRunningPerAccount)) c.runningForAccount = await contar([['state', 'running'], ['ownerUserId', job.owner.userId]]);
      if (puesto(limites.maxRunningPerProvider) && job.implementation) {
        c.runningForProvider = await contar([['state', 'running'], ['providerId', job.implementation.providerId]]);
      }
      return Object.keys(c).length ? c : undefined;
    },
    /** La contrapresión de verdad va al CREAR: lo único que impide que una cuenta llene el sistema es no aceptarle el trabajo. */
    async alCrear(principal) {
      if (!puesto(limites.maxQueuedPerAccount)) return undefined;
      return { queuedForAccount: await contar([['state', 'queued'], ['ownerUserId', principal.userId]]) };
    },
  };
};
