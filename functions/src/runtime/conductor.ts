import {
  CanonicalResponse,
  ContadorDeCapacidad,
  FORMA_DE_ETIQUETA_DE_TRAZA,
  GatewayMetadata,
  GatewayUsage,
  ImplementationRef,
  JOB_ENGINE_CONTRACT_VERSION,
  Job,
  JobCapacity,
  JobEngine,
  JobLimits,
  JobRequest,
  JobStore,
  ORCHESTRATOR_CONTRACT_VERSION,
  Orchestrator,
  OrchestratorRequest,
  PreparedWorkflow,
  Principal,
  QueuePort,
  ResultadoDeEntrega,
  RunClosure,
  StepDispatch,
  StepOutcome,
  TraceContext,
  WeeError,
  WeeErrorCode,
  Workflow,
  WorkflowRun,
  WorkerConfig,
  alcanceDeIdempotencia,
  claveDePaso,
  errorDelCore,
  esEstadoFinal,
  esTrabajoTerminal,
  mensajeDeCola,
} from '../core';
import { crearTrabajo } from '../job';
import { atenderEntrega } from '../job/worker';
import { orquestadorDeWee } from '../orchestrator';
import { EjecutorDelConductor } from './ejecutor';
import { PreferenciasDeRuteo, Resolucion, ResolutorDeImplementacion } from './resolucion';

/**
 * WEË RUNTIME — EL CONDUCTOR.
 *
 * ── La pieza que faltaba ────────────────────────────────────────────────────
 *
 * Las Fases 3 a 8 dejaron seis motores terminados y probados, y ninguno llama
 * a otro: el Orchestrator dice qué paso toca y no ejecuta; el Router elige y no
 * ejecuta; el Job Engine administra intentos y no guarda ni ejecuta; el
 * trabajador atiende una entrega y no sabe de dónde sale; el Gateway ejecuta lo
 * que le mandan y no elige. Cada uno lo dice en su cabecera: «no hay quien…».
 *
 * Esto es ese «quien». Y es SOLO eso: mueve lo que un motor devuelve hasta la
 * puerta del siguiente, y guarda entre medias.
 *
 *   Workflow preparado
 *     → Orchestrator.avanzar()      qué pasos tocan            (decide él)
 *     → Router                      con qué se atiende cada uno (decide él)
 *     → Job Engine.crear()          un trabajo por paso         (decide él)
 *     → almacén                     GUARDAR
 *     → cola                        avisar
 *     → trabajador                  reclamar · marcar · ejecutar · informar
 *         → Gateway → adaptador → proveedor
 *     → Orchestrator.informar()     el paso terminó así
 *     → … hasta que el Workflow diga que se acabó
 *
 * ── El orden Router → trabajo, y por qué no es al revés ─────────────────────
 *
 * El Router va ANTES de crear el trabajo, no después del trabajador. No es una
 * preferencia de este archivo: es el contrato del Job Engine, que exige la
 * implementación para crear una operación de IA («Ya elegida por el Router. Si
 * falta, no hay trabajo que crear») y la mete en la huella de idempotencia. Y
 * es lo que sostiene una garantía de dinero: el modelo que se le cotizó a la
 * persona es el que se ejecuta, también en el tercer intento.
 *
 * ── Lo que NO decide ────────────────────────────────────────────────────────
 *
 * Nada. Ni qué paso toca, ni con qué proveedor, ni si se reintenta, ni cuándo,
 * ni si algo se puede repetir sin pagar dos veces. Cada una de esas preguntas
 * tiene dueño y aquí se le hace. Cuando este archivo tenga un `if` que elija
 * entre dos proveedores o que decida reintentar, habrá dejado de ser un
 * conductor y será un séptimo motor.
 *
 * No cobra, no reserva y no reembolsa. Los Credits los mueve quien llama, antes
 * y después, exactamente como hoy.
 *
 * ── Sin estado ──────────────────────────────────────────────────────────────
 *
 * Nada a nivel de módulo. Un conductor se construye por ejecución, y todo lo
 * que sabe lo lee del almacén. Por eso llamar dos veces con la misma operación
 * no ejecuta dos veces: retoma. Y por eso otro proceso puede seguir lo que
 * dejó a medias uno que murió.
 *
 * ── Lo que pasa cuando no se sabe ───────────────────────────────────────────
 *
 * Si un intento salió hacia el proveedor y no se sabe cómo acabó, el trabajo
 * queda esperando y el paso sigue `running`. El conductor NO le inventa un
 * final y NO lo relanza: devuelve `en_curso` y dice por qué. Decir «falló»
 * sería mentir, y repetirlo sería pagar dos veces.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA. Ningún callable lo importa.
 */

/* ── Lo que entra ─────────────────────────────────────────────────────────── */

/** Una ejecución del workflow tal como está guardada, con la revisión para escribir sin pisarse. */
export interface EjecucionGuardada {
  run: WorkflowRun;
  /** El workflow con el que se preparó. Hace falta para volver a montar el coordinador en otro proceso. */
  workflow: Workflow;
  revision: number;
}

/**
 * DÓNDE VIVE LA EJECUCIÓN DE UN WORKFLOW. Un puerto, como `JobStore`.
 *
 * El Orchestrator es puro: recibe una ejecución y devuelve otra. Alguien tiene
 * que guardarla, y tiene que hacerlo igual que el almacén de trabajos: crear
 * solo si no está, y escribir solo si nadie escribió antes.
 */
export interface AlmacenDeEjecuciones {
  crearSiAusente(nueva: { run: WorkflowRun; workflow: Workflow }): Promise<{ created: boolean; guardada: EjecucionGuardada }>;
  obtener(runId: string): Promise<EjecucionGuardada | undefined>;
  guardar(run: WorkflowRun, expectedRevision: number): Promise<{ saved: boolean; guardada?: EjecucionGuardada }>;
}

/**
 * DEL RESULTADO DE UN PROVEEDOR AL MATERIAL DE WEË.
 *
 *   resultado del proveedor → trabajo → MATERIAL → contenido → publicación
 *
 * Un paso no le pasa a otro una URL: le pasa la referencia de un material que
 * ya es de la cuenta. El Workflow lo exige —una URL con `?token=` ni siquiera
 * cabe en `outputRefs`— y es lo que impide que un paso dependa de un enlace que
 * caduca. Quien sabe crear material es el Content Core; aquí solo se le pide.
 */
export interface PuertoDeMaterial {
  registrar(datos: {
    principal: Principal;
    dispatch: StepDispatch;
    job: Job;
    respuesta?: CanonicalResponse;
  }): Promise<readonly string[]>;
}

export interface PuertosDelConductor {
  /** La verdad de los trabajos. */
  trabajos: JobStore;
  /** La verdad de la ejecución del workflow. */
  ejecuciones: AlmacenDeEjecuciones;
  /**
   * Transporte. No es la verdad de nada, y por eso entra por el PUERTO: el
   * conductor no sabe —ni tiene por qué— si los avisos viven en la memoria de
   * esta invocación o en una colección que sobrevive al proceso. Lo único que
   * pide es `QueuePort`, y cualquier transporte que lo cumpla vale.
   */
  cola: QueuePort;
  motor: JobEngine;
  /** El Router, por su composición. */
  resolver: ResolutorDeImplementacion;
  /** El Gateway, por su composición. */
  ejecutor: EjecutorDelConductor;
  material?: PuertoDeMaterial;
  trabajador: WorkerConfig;
  /** Cuánto hay en marcha, para que el Job Engine pueda decir «no cabe». */
  capacidad?: ContadorDeCapacidad;
  /** Cuánto tiene ya encolado esta cuenta. La contrapresión de verdad va al CREAR. */
  capacidadAlCrear?: (principal: Principal) => Promise<JobCapacity | undefined>;
  limites?: JobLimits;
  ahora: () => number;
  /** Para respetar la espera de un reintento dentro de la misma invocación. Sin él, no se espera: se devuelve `en_curso`. */
  esperar?: (ms: number) => Promise<void>;
  /** Cuántas entregas se atienden a la vez. 1 = una detrás de otra, que es lo que hace el bucle de hoy. */
  paralelismo?: number;
  /** Una línea por entrega, para quien quiera seguirla. Nunca lleva secretos ni texto de nadie. */
  observar?: (entrega: ResultadoDeEntrega) => void;
}

export interface EjecucionPreparada {
  /** QUIÉN, según la capa de identidad. No lo declara el cliente. */
  principal: Principal;
  /** El workflow. Se revisa con el lector de la Fase 5 venga de donde venga. */
  workflow: unknown;
  trace: TraceContext;
  /** La misma operación, el mismo `runId`: así una segunda llamada RETOMA en vez de repetir. */
  runId?: string;
  /**
   * Correlación que acompaña al trabajo. Va aquí —y no solo en la traza—
   * porque el contexto del trabajo se GUARDA: sobrevive a la invocación que lo
   * creó, y es lo que permite saber de dónde salió una operación al recuperarla.
   */
  contexto?: { appId?: string; workspaceId?: string; operationId?: string };
  /** Por paso. Lo que el SERVIDOR ya tiene decidido sobre con qué atenderlo. */
  ruteo?: Readonly<Record<string, PreferenciasDeRuteo>>;
  /** Por paso. Escalares que viajan con el trabajo hasta el libro: servicio, transacción de Credits, lo que vale. */
  contabilidad?: Readonly<Record<string, GatewayMetadata>>;
  maxConcurrent?: number;
  /** Cuándo muere la invocación que aloja al conductor. Ningún trabajo vive más, y no se espera más allá. */
  deadlineAt?: number;
}

/* ── Lo que sale ──────────────────────────────────────────────────────────── */

export interface PasoDelConductor {
  stepId: string;
  capability: string;
  jobId?: string;
  estadoDelTrabajo?: Job['state'];
  intentos: number;
  implementation?: ImplementationRef;
  /** Quién puso el orden de los candidatos: la puntuación del Router o la cadena de producto. */
  origenDeLaRuta?: 'router' | 'cadena';
  /** Lo que contestó el proveedor. SOLO en la invocación que lo ejecutó: no se guarda en ningún sitio. */
  respuesta?: CanonicalResponse;
  /** Lo sirvió un proveedor INTERNO: es una muestra, no un resultado. Lo dice el registro, no quien lo pide. */
  sintetico?: boolean;
  usage?: GatewayUsage;
  outputRefs: readonly string[];
  error?: WeeError;
}

export type AvisoDelConductor =
  /* Un intento salió hacia el proveedor y no se sabe cómo acabó. No se repite. */
  | 'outcome_unknown'
  /* Queda un reintento programado y esta invocación no puede esperarlo. */
  | 'retry_pending'
  /* Otro proceso tiene el trabajo con la concesión viva. */
  | 'leased_elsewhere'
  /* Alguien pidió parar y todavía hay algo en vuelo. */
  | 'cancel_pending'
  /* El proveedor dejó referencias que no son material de Weë: no se le pasan a ningún paso. */
  | 'output_refs_dropped'
  /* El almacén o la cola fallaron a media ejecución. Nada se pierde: lo guardado sigue guardado. */
  | 'delivery_failed'
  /* Se agotó el margen de la invocación. */
  | 'invocation_deadline';

export interface ResultadoDelConductor {
  /** `terminada`: el Workflow cerró. `en_curso`: queda algo que esta invocación no puede resolver. `invalida`: no se pudo ni empezar. */
  estado: 'terminada' | 'en_curso' | 'invalida';
  runId?: string;
  run?: WorkflowRun;
  cierre?: RunClosure;
  pasos: readonly PasoDelConductor[];
  entregas: readonly ResultadoDeEntrega[];
  error?: WeeError;
  avisos: readonly AvisoDelConductor[];
}

export interface Conductor {
  ejecutar(preparada: EjecucionPreparada): Promise<ResultadoDelConductor>;
  /** Seguir una ejecución guardada, con el workflow con el que se guardó. */
  retomar(peticion: Omit<EjecucionPreparada, 'workflow' | 'runId'> & { runId: string }): Promise<ResultadoDelConductor>;
  /** Pedir que pare. Lo que ya salió hacia un proveedor termina y se anota: cancelar es una petición, no un corte. */
  cancelar(peticion: { principal: Principal; runId: string }): Promise<ResultadoDelConductor>;
}

/* ── Piezas ───────────────────────────────────────────────────────────────── */

const MAX_CARRERAS = 8;
const MAX_ESPERAS = 8;
/** Margen para poder guardar y contestar antes de que muera la invocación. */
const MARGEN_DE_CIERRE_MS = 5_000;

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'runtime', { details: { reason, ...extra } });

interface EnMano {
  dispatch: StepDispatch;
  jobId?: string;
  implementation?: ImplementationRef;
  origen?: 'router' | 'cadena';
  /** Ya se le contó al Orchestrator cómo acabó. */
  anotado: boolean;
  /** Si no llegó a haber trabajo: por qué. */
  error?: WeeError;
}

/** Cómo le cuenta el conductor al Orchestrator que un trabajo terminó. Traduce; no decide. */
const desenlaceDe = (job: Job): 'succeeded' | 'failed' | 'cancelled' | undefined => {
  if (job.state === 'completed') return 'succeeded';
  if (job.state === 'failed' || job.state === 'timed_out') return 'failed';
  if (job.state === 'cancelled') return 'cancelled';
  return undefined;
};

export const crearConductor = (puertos: PuertosDelConductor): Conductor => {
  const { trabajos, ejecuciones, cola, motor, resolver, ejecutor, ahora } = puertos;
  const paralelismo = Math.max(1, Math.floor(puertos.paralelismo ?? 1));

  /** No se pudo ni empezar, o no es de quien pregunta. Sin ejecución, sin pasos, sin identificador: solo el porqué. */
  const sinEmpezar = (error: WeeError): ResultadoDelConductor =>
    ({ estado: 'invalida', pasos: [], entregas: [], avisos: [], error });

  const correr = async (
    preparada: Omit<EjecucionPreparada, 'workflow'>,
    prepared: PreparedWorkflow,
    orchestrator: Orchestrator,
    inicial: EjecucionGuardada,
  ): Promise<ResultadoDelConductor> => {
    let guardada = inicial;
    const runId = inicial.run.id;
    const enMano = new Map<string, EnMano>();
    const entregas: ResultadoDeEntrega[] = [];
    const avisos = new Set<AvisoDelConductor>();
    const limite = preparada.deadlineAt !== undefined ? preparada.deadlineAt - MARGEN_DE_CIERRE_MS : undefined;
    const sinTiempo = (): boolean => limite !== undefined && ahora() >= limite;

    const pet = (run: WorkflowRun): OrchestratorRequest => ({
      contract: ORCHESTRATOR_CONTRACT_VERSION,
      principal: preparada.principal,
      run,
      at: ahora(),
      ...(preparada.maxConcurrent !== undefined ? { maxConcurrent: preparada.maxConcurrent } : {}),
    });

    const recargar = async (): Promise<boolean> => {
      const fresca = await ejecuciones.obtener(runId);
      if (!fresca) return false;
      guardada = fresca;
      return true;
    };

    /** Guarda lo que el Orchestrator acaba de decidir. `false` = alguien escribió antes: se relee y se vuelve a preguntar. */
    const persistir = async (run: WorkflowRun): Promise<boolean> => {
      const r = await ejecuciones.guardar(run, guardada.revision);
      if (r.saved && r.guardada) { guardada = r.guardada; return true; }
      await recargar();
      return false;
    };

    /** Le cuenta al Orchestrator cómo acabó un paso, y lo guarda. Si otro conductor ya lo había contado, está bien. */
    const anotar = async (outcome: StepOutcome): Promise<boolean> => {
      for (let i = 0; i < MAX_CARRERAS; i++) {
        const d = orchestrator.informar({ ...pet(guardada.run), outcome });
        if (d.status === 'invalid' || !d.run) {
          const paso = guardada.run.steps.find((s) => s.stepId === outcome.stepId);
          return !!paso && esEstadoFinal(paso.state);
        }
        if (await persistir(d.run)) return true;
      }
      return false;
    };

    /** Router → Job Engine → almacén → aviso. Un paso, de principio a fin. */
    const lanzar = async (dispatch: StepDispatch): Promise<void> => {
      const mano: EnMano = { dispatch, anotado: false };
      enMano.set(dispatch.stepId, mano);

      /*
       * ¿YA EXISTE SU TRABAJO? Entonces NO se vuelve a enrutar.
       *
       * Al retomar, preguntarle otra vez al Router podría dar otra respuesta
       * —cambió la salud de un proveedor, alguien apagó un modelo—, y la huella
       * de idempotencia del trabajo INCLUYE la implementación: el Job Engine lo
       * rechazaría como «la misma clave con otra operación dentro». Y tendría
       * razón. El trabajo ya lleva la que eligió el Router, y es la que vale.
       */
      const existente = await trabajos.porIdempotencia(alcanceDeIdempotencia(preparada.principal.userId), dispatch.idempotencyKey);
      if (existente) {
        mano.jobId = existente.jobId;
        if (existente.implementation) mano.implementation = existente.implementation;
        if (existente.metadata?.routeOrigin === 'router' || existente.metadata?.routeOrigin === 'cadena') mano.origen = existente.metadata.routeOrigin;
        /*
         * SE AVISA SOLO DE LO QUE UN TRABAJADOR PUEDE MOVER. Uno en cola, o uno
         * «en marcha» cuyo dueño pudo morir: ese aviso es el que lo rescata, y de
         * más nunca sobra. Pero uno que ESPERA —salió y no se sabe cómo acabó— no
         * lo mueve ningún trabajador: lo cierra el aviso del proveedor o su plazo.
         * Avisar de él era encolar algo «para cuando venza», y el conductor se
         * quedaba esperando ese plazo dentro de la invocación. Solo se avisa si
         * el plazo YA pasó, que es cuando mirar sirve para algo: vencerlo.
         */
        const loMueveUnTrabajador = existente.state === 'queued' || existente.state === 'running' || existente.state === 'cancel_requested'
          || (existente.state === 'waiting' && ahora() >= existente.deadlineAt);
        if (loMueveUnTrabajador) await cola.enqueue(mensajeDeCola(existente, ahora(), 'requeued'));
        return;
      }

      const resolucion: Resolucion = await resolver.resolver({
        peticion: {
          capability: dispatch.capability,
          trace: dispatch.trace,
          ...(dispatch.language ? { language: dispatch.language } : {}),
          ...(dispatch.hints ? { hints: dispatch.hints } : {}),
          ...(dispatch.budget || dispatch.quality
            ? { constraints: { ...(dispatch.budget ? { budget: dispatch.budget } : {}), ...(dispatch.quality ? { quality: dispatch.quality } : {}) } }
            : {}),
          ...(preparada.contexto?.appId ?? preparada.principal.appId ? { appId: preparada.contexto?.appId ?? preparada.principal.appId } : {}),
          ...(preparada.contexto?.workspaceId ? { workspaceId: preparada.contexto.workspaceId } : {}),
          ...(preparada.contexto?.operationId ? { operationId: preparada.contexto.operationId } : {}),
        },
        input: dispatch.input,
        ...(preparada.ruteo?.[dispatch.stepId] ? { preferencias: preparada.ruteo[dispatch.stepId] } : {}),
      });
      if (!resolucion.ok) {
        mano.error = resolucion.decision.error
          ?? fallo(resolucion.reason === 'invalid' ? 'INVALID_REQUEST' : 'PROVIDER_UNAVAILABLE', resolucion.reason);
        return;
      }
      mano.implementation = resolucion.implementation;
      mano.origen = resolucion.origen;

      const capacidad = puertos.capacidadAlCrear ? await puertos.capacidadAlCrear(preparada.principal) : undefined;
      const peticion: JobRequest = {
        contract: JOB_ENGINE_CONTRACT_VERSION,
        principal: preparada.principal,
        at: ahora(),
        capability: dispatch.capability,
        implementation: resolucion.implementation,
        /* Lo que dejaron las dependencias viaja como REFERENCIAS, aparte de lo que el plan declaró. */
        input: dispatch.upstream.length ? { ...dispatch.input, upstream: dispatch.upstream } : dispatch.input,
        trace: dispatch.trace,
        ...(dispatch.language ? { language: dispatch.language } : {}),
        ...(dispatch.hints ? { hints: dispatch.hints } : {}),
        metadata: {
          ...(preparada.contabilidad?.[dispatch.stepId] ?? {}),
          ...(resolucion.estimado?.usd !== undefined ? { estimatedUsd: resolucion.estimado.usd } : {}),
          ...(resolucion.estimado?.credits !== undefined ? { estimatedCredits: resolucion.estimado.credits } : {}),
          routeOrigin: resolucion.origen,
        },
        /* Quien lo pidió está esperando el resultado en esta misma invocación. */
        mode: 'sync',
        idempotencyKey: dispatch.idempotencyKey,
        ...(preparada.deadlineAt !== undefined ? { deadlineAt: preparada.deadlineAt } : {}),
        ...(dispatch.timeoutMs !== undefined ? { policy: { attemptTimeoutMs: dispatch.timeoutMs } } : {}),
        context: {
          ...(preparada.contexto?.appId ?? preparada.principal.appId ? { appId: preparada.contexto?.appId ?? preparada.principal.appId } : {}),
          ...(preparada.contexto?.workspaceId ? { workspaceId: preparada.contexto.workspaceId } : {}),
          ...(preparada.contexto?.operationId ? { operationId: preparada.contexto.operationId } : {}),
          workflowId: guardada.run.workflowId,
          workflowRunId: dispatch.runId,
          stepId: dispatch.stepId,
        },
        ...(capacidad ? { capacity: capacidad } : {}),
        ...(puertos.limites ? { limits: puertos.limites } : {}),
      };

      const creado = await crearTrabajo(trabajos, motor, peticion);
      if (!creado.ok) {
        const { decision } = creado;
        mano.error = decision.refusal === 'at_capacity' ? fallo('RATE_LIMIT', 'at_capacity')
          : decision.refusal === 'idempotency_conflict' ? fallo('DUPLICATE_REQUEST', 'idempotency_conflict')
            : decision.error ?? fallo('INVALID_REQUEST', 'job_not_created');
        return;
      }
      mano.jobId = creado.job.jobId;
      /* `created: false` aquí es una carrera: otro conductor lo creó entre la búsqueda y la creación. Es el mismo trabajo, y se avisa igual. */
      if (!esTrabajoTerminal(creado.job.state)) await cola.enqueue(mensajeDeCola(creado.job, ahora(), creado.created ? 'created' : 'requeued'));
    };

    /** Atiende lo que haya en la cola. El trabajador hace el trabajo; esto solo le da entregas. */
    const vaciarCola = async (): Promise<boolean> => {
      const deps = {
        store: trabajos, queue: cola, engine: motor, executor: ejecutor, config: puertos.trabajador, now: ahora,
        ...(puertos.capacidad ? { capacity: puertos.capacidad } : {}),
      };
      const enCurso = new Set<Promise<void>>();
      let roto = false;
      for (;;) {
        while (!roto && enCurso.size < paralelismo && !sinTiempo()) {
          const entrega = await cola.claim({ worker: puertos.trabajador.worker, at: ahora(), visibilityMs: puertos.trabajador.visibilityMs });
          if (!entrega) break;
          const tarea: Promise<void> = atenderEntrega(deps, entrega)
            .then((r) => { entregas.push(r); puertos.observar?.(r); })
            /* El almacén o la cola fallaron. La entrega no se confirmó, así que volverá; el trabajo sigue guardado. */
            .catch(() => { roto = true; avisos.add('delivery_failed'); })
            .finally(() => { enCurso.delete(tarea); });
          enCurso.add(tarea);
        }
        if (!enCurso.size) break;
        await Promise.race(enCurso);
      }
      return !roto;
    };

    /**
     * Mira cómo quedó cada trabajo y se lo cuenta al Orchestrator. Devuelve
     * cuántos pasos cerró y si alguno se quedó EN OTRAS MANOS —en marcha, con la
     * concesión de otro proceso—, que es lo único que no tiene sentido esperar.
     */
    const recoger = async (): Promise<{ cerrados: number; enOtrasManos: boolean }> => {
      let cerrados = 0;
      let enOtrasManos = false;
      for (const mano of enMano.values()) {
        if (mano.anotado) continue;
        const { dispatch } = mano;

        if (mano.error) {
          mano.anotado = await anotar({ stepId: dispatch.stepId, kind: 'failed', at: ahora(), error: mano.error });
          if (mano.anotado) cerrados++;
          continue;
        }
        if (!mano.jobId) continue;
        const job = await trabajos.obtener(mano.jobId);
        if (!job) continue;

        const kind = desenlaceDe(job);
        if (!kind) {
          if (job.state === 'waiting') avisos.add('outcome_unknown');
          else if (job.state === 'queued') avisos.add('retry_pending');
          else if (job.state === 'cancel_requested') avisos.add('cancel_pending');
          else {
            /*
             * Sigue EN MARCHA después de que esta invocación vaciara su cola: no
             * es nuestro. O lo tiene otro proceso con la concesión viva, o lo
             * tuvo y todavía no ha escrito el desenlace. En cualquiera de los dos
             * casos, aquí no hay nada que hacer ni nada que esperar.
             */
            avisos.add('leased_elsewhere');
            enOtrasManos = true;
          }
          continue;
        }

        const ultimo = job.attempts[job.attempts.length - 1];
        const respuesta = ultimo ? ejecutor.resultadoDe(ultimo.attemptId)?.response : undefined;
        let outputRefs: readonly string[] = [];
        if (kind === 'succeeded') {
          const crudas = puertos.material
            ? await puertos.material.registrar({ principal: preparada.principal, dispatch, job, ...(respuesta ? { respuesta } : {}) })
            : job.result?.outputRefs ?? [];
          outputRefs = crudas.filter((r) => FORMA_DE_ETIQUETA_DE_TRAZA.test(r));
          if (outputRefs.length !== crudas.length) avisos.add('output_refs_dropped');
        }

        mano.anotado = await anotar({
          stepId: dispatch.stepId,
          kind,
          at: ahora(),
          ...(kind === 'succeeded' && outputRefs.length ? { outputRefs } : {}),
          ...(respuesta?.actual && kind !== 'cancelled' ? { actual: respuesta.actual } : {}),
          ...(kind === 'failed' ? { error: job.error ?? fallo(job.state === 'timed_out' ? 'TIMEOUT' : 'INTERNAL_ERROR', `job_${job.state}`) } : {}),
        });
        if (mano.anotado) cerrados++;
      }
      return { cerrados, enOtrasManos };
    };

    const resultado = async (estado: ResultadoDelConductor['estado'], extra: Partial<ResultadoDelConductor> = {}): Promise<ResultadoDelConductor> => {
      /*
       * LOS PASOS SALEN DE LO GUARDADO, no de lo que esta invocación tuvo en la
       * mano. Una operación repetida sobre una ejecución ya terminada no lanza
       * nada, y aun así tiene que poder decir qué trabajo hizo cada paso: la
       * clave de cada uno es determinista, así que se busca. Lo único que no
       * puede devolver es el contenido, que nunca se guardó.
       */
      const pasos: PasoDelConductor[] = [];
      const scope = alcanceDeIdempotencia(preparada.principal.userId);
      for (const paso of guardada.run.steps) {
        const mano = enMano.get(paso.stepId);
        if (!mano && paso.attempt < 1) continue;
        const job = mano?.jobId ? await trabajos.obtener(mano.jobId)
          : mano ? undefined : await trabajos.porIdempotencia(scope, claveDePaso(runId, paso.stepId, paso.attempt));
        const ultimo = job?.attempts[job.attempts.length - 1];
        const gateway = ultimo ? ejecutor.resultadoDe(ultimo.attemptId) : undefined;
        const implementation = mano?.implementation ?? job?.implementation;
        const origen = mano?.origen ?? (job?.metadata?.routeOrigin === 'router' || job?.metadata?.routeOrigin === 'cadena' ? job.metadata.routeOrigin : undefined);
        const error = mano?.error ?? job?.error ?? paso.error;
        pasos.push({
          stepId: paso.stepId,
          capability: mano?.dispatch.capability ?? job?.capability ?? prepared.workflow.steps.find((s) => s.id === paso.stepId)?.capability ?? '',
          ...(job ? { jobId: job.jobId, estadoDelTrabajo: job.state } : {}),
          intentos: job?.attemptCount ?? 0,
          ...(implementation ? { implementation } : {}),
          ...(origen ? { origenDeLaRuta: origen } : {}),
          ...(gateway?.response ? { respuesta: gateway.response } : {}),
          ...(gateway?.implementation.type === 'internal' ? { sintetico: true } : {}),
          ...(gateway?.usage ?? ultimo?.usage ? { usage: gateway?.usage ?? ultimo?.usage } : {}),
          outputRefs: paso.outputRefs ?? [],
          ...(error ? { error } : {}),
        });
      }
      return {
        estado,
        runId,
        run: guardada.run,
        cierre: prepared.cierre(guardada.run),
        pasos,
        entregas,
        avisos: [...avisos],
        ...extra,
      };
    };

    /* ── El bucle. Cada vuelta: preguntar, lanzar, atender, recoger. ───────── */
    const maxVueltas = prepared.workflow.steps.length * 4 + 16;
    let esperas = 0;
    for (let vuelta = 0; vuelta < maxVueltas; vuelta++) {
      const d = orchestrator.avanzar(pet(guardada.run));
      /*
       * RECHAZADA: NO SE CUENTA NADA DE ELLA. El Orchestrator comprueba quién pide
       * antes de mirar la ejecución, y «no es tuya» llega por aquí. Devolver sus
       * pasos, su cierre o su identificador sería convertir esto en un buscador
       * de ejecuciones ajenas: con el error basta.
       */
      if (d.status === 'invalid' || !d.run) return sinEmpezar(d.error ?? fallo('INVALID_REQUEST', 'orchestrator_rejected'));

      /* MARCAR Y GUARDAR antes de crear nada: si otro conductor marcó primero, los pasos son suyos y aquí se vuelve a preguntar. */
      if (d.applied.length && !(await persistir(d.run))) continue;

      /*
       * Lo que acaba de salir, MÁS lo que ya estaba en marcha y nadie de esta
       * invocación tiene en la mano: eso es retomar. El trabajo de cada uno ya
       * existe —la clave es determinista— y crearlo otra vez devuelve el mismo.
       */
      const corriendo = new Set(d.waiting.running);
      const aLanzar = [...d.dispatch, ...d.inFlight.filter((f) => corriendo.has(f.stepId))]
        .filter((p, i, todos) => !enMano.has(p.stepId) && todos.findIndex((q) => q.stepId === p.stepId) === i);
      for (const dispatch of aLanzar) await lanzar(dispatch);

      const colaSana = await vaciarCola();
      const { cerrados, enOtrasManos } = await recoger();

      const ahoraMismo = orchestrator.estado(pet(guardada.run));
      if (ahoraMismo.status === 'finished' && !ahoraMismo.waiting.running.length) return resultado('terminada');
      if (!colaSana) return resultado('en_curso');
      if (sinTiempo()) { avisos.add('invocation_deadline'); return resultado('en_curso'); }
      if (aLanzar.length || cerrados) continue;

      /*
       * ── LO QUE TIENE OTRO NO SE ESPERA ───────────────────────────────────────
       *
       * Nada se movió, y lo que falta lo está ejecutando otro proceso con la
       * concesión viva. Esperar a que caduque es esperar un minuto para no hacer
       * nada: esta invocación no puede tocar ese trabajo mientras la concesión
       * esté viva, y cuando caduque lo que habrá es el resultado del otro, no una
       * oportunidad. La espera existe para un reintento que llegará; esto no es
       * un reintento.
       *
       * Así que se contesta ya, y se contesta la verdad: EN CURSO, en otras manos.
       * No es un fallo del proveedor, ni del trabajo, ni algo que reintentar, ni
       * un desenlace desconocido —eso es solo cuando SÍ se salió y no se sabe cómo
       * acabó—. Quien llama no crea un intento, no llama a ningún proveedor y,
       * sobre todo, no toca el dinero de la invocación que sí está trabajando.
       */
      if (enOtrasManos) { avisos.add('leased_elsewhere'); return resultado('en_curso'); }

      /*
       * Si lo único que falta es la hora de un reintento y se puede esperar, se
       * espera; si no, se dice.
       *
       * Preguntar es OPCIONAL y el silencio es una respuesta válida: un
       * transporte durable no contesta —no debe dormir dentro de una Function—
       * y entonces esto sale por `en_curso`, que es exactamente lo correcto: el
       * aviso sigue guardado con su hora, y otra entrega lo recogerá cuando
       * toque. Nada se pierde por no esperar.
       */
      const proximo = cola.proximoVisible?.(ahora());
      const cabe = proximo !== undefined && (limite === undefined || proximo < limite);
      if (!puertos.esperar || !cabe || esperas >= MAX_ESPERAS) return resultado('en_curso');
      esperas++;
      await puertos.esperar(Math.max(0, proximo - ahora()));
    }
    return resultado('en_curso');
  };

  const montar = (workflow: unknown): { ok: true; prepared: PreparedWorkflow; orchestrator: Orchestrator } | { ok: false; error: WeeError } =>
    orquestadorDeWee(workflow);

  return {
    async ejecutar(preparada): Promise<ResultadoDelConductor> {
      const montado = montar(preparada.workflow);
      if (!montado.ok) return sinEmpezar(montado.error);
      const inicio = montado.prepared.iniciar(preparada.trace, preparada.runId ? { runId: preparada.runId } : undefined);
      if (!inicio.ok) return sinEmpezar(inicio.error);
      /* La misma operación, la misma ejecución: si ya existe, se sigue la que hay. Así una petición repetida no ejecuta dos veces. */
      const { guardada } = await ejecuciones.crearSiAusente({ run: inicio.run, workflow: montado.prepared.workflow });
      return correr(preparada, montado.prepared, montado.orchestrator, guardada);
    },

    async retomar(peticion): Promise<ResultadoDelConductor> {
      const guardada = await ejecuciones.obtener(peticion.runId);
      /* De una ejecución ajena no se dice ni que exista: el Orchestrator comprueba el dueño antes de contar nada. */
      if (!guardada) return sinEmpezar(fallo('INVALID_REQUEST', 'run_not_found'));
      const montado = montar(guardada.workflow);
      if (!montado.ok) return sinEmpezar(montado.error);
      return correr(peticion, montado.prepared, montado.orchestrator, guardada);
    },

    async cancelar({ principal, runId }): Promise<ResultadoDelConductor> {
      let guardada = await ejecuciones.obtener(runId);
      if (!guardada) return sinEmpezar(fallo('INVALID_REQUEST', 'run_not_found'));
      const montado = montar(guardada.workflow);
      if (!montado.ok) return sinEmpezar(montado.error);
      const { orchestrator, prepared } = montado;

      for (let i = 0; i < MAX_CARRERAS; i++) {
        /* Primero lo decide el Workflow, que comprueba además que quien cancela es el dueño. */
        const d = orchestrator.cancelar({ contract: ORCHESTRATOR_CONTRACT_VERSION, principal, run: guardada.run, at: ahora() });
        if (d.status === 'invalid' || !d.run) return sinEmpezar(d.error ?? fallo('INVALID_REQUEST', 'cancel_rejected'));
        const r = await ejecuciones.guardar(d.run, guardada.revision);
        if (r.saved && r.guardada) {
          guardada = r.guardada;
          /* Y a cada trabajo en vuelo se le PIDE parar. Decide el Job Engine: uno en cola se cancela; uno que ya salió termina y se anota. */
          for (const enVuelo of d.inFlight) {
            const job = await trabajos.porIdempotencia(alcanceDeIdempotencia(principal.userId), enVuelo.idempotencyKey);
            if (!job || esTrabajoTerminal(job.state)) continue;
            const c = motor.cancelar(job, principal, ahora());
            if (c.status === 'transition' && c.transition) await trabajos.aplicar(c.transition);
          }
          /* Lo que ya quedó cerrado se le cuenta al Orchestrator por el camino de siempre: el mismo que al retomar. */
          return correr({ principal, trace: guardada.run.trace ?? { traceId: '', requestId: '', userId: principal.userId } }, prepared, orchestrator, guardada);
        }
        const fresca = await ejecuciones.obtener(runId);
        if (!fresca) break;
        guardada = fresca;
      }
      return sinEmpezar(fallo('INTERNAL_ERROR', 'cancel_not_saved'));
    },
  };
};
