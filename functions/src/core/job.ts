import { BrainAttachment } from './brain';
import { JOB_ENGINE_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import {
  ExecutionHints,
  ExecutionMode,
  FORMA_DE_ETIQUETA_DE_TRAZA,
  FORMA_DE_ID,
  FORMA_DE_REFERENCIA,
  GatewayMetadata,
  GatewayUsage,
  ImplementationRef,
  claveProhibida,
  esNumero,
  esObjetoPlano,
  esTexto,
  leerHints,
  leerIdioma,
  leerMetadata,
  leerTraza,
  nombreDeCampo,
  sanearMeta,
} from './gateway';
import { LanguageContext } from './language';
import { TraceContext } from './observability';
import { Principal } from './orchestrator';
import { CoreCapabilityId } from './registry';

/**
 * WEE JOB ENGINE — QUIÉN SE ACUERDA DE UN TRABAJO CUANDO TODO SE CAE.
 *
 * ── Dónde encaja ────────────────────────────────────────────────────────────
 *
 *   BRAIN entiende → PLANNER planifica → WORKFLOW estructura → ORCHESTRATOR
 *   coordina → ROUTER elige → JOB ENGINE administra la ejecución →
 *   GATEWAY ejecuta → ADAPTADOR traduce → PROVEEDOR produce
 *
 * El Job Engine no se salta a nadie. El Orchestrator dice qué paso toca, el
 * Router dice con qué se atiende, y en ese punto hay una operación completa
 * lista para ejecutarse. Lo que falta es lo que nadie hace todavía: que esa
 * ejecución SOBREVIVA. Que si el servidor se muere a mitad, el trabajo no se
 * evapore. Que si se reintenta, no se haga dos veces. Que si tarda una hora,
 * se sepa dónde está. Eso es esta capa.
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Convierte una operación ejecutable en un TRABAJO DURABLE y gobierna su ciclo
 * de vida: encolar, reclamar, ejecutar, esperar, reintentar, vencer, cancelar y
 * recuperar. Sin ejecutar nada.
 *
 * ── LO QUE NO ES, Y ES LA MITAD DEL DISEÑO ──────────────────────────────────
 *
 * No es el Gateway: aquí no se llama a nadie. Se entrega un paquete y quien
 * ejecuta es el Gateway, igual que el Orchestrator entrega un paquete y quien
 * elige es el Router. No es el Router: la implementación LLEGA elegida y aquí
 * no hay puntuación, ni candidatos, ni un `if` por proveedor. No es el Workflow
 * Engine: un trabajo no tiene dependencias, ni grafo, ni pasos, y su máquina de
 * estados es la de UNA ejecución, no la de un plan. No es el Orchestrator: aquí
 * no se decide qué toca, solo cómo termina lo que ya tocaba. Y no es el
 * Financial Core: no cobra, no reserva, no descuenta, no calcula márgenes y no
 * escribe ningún libro. Transporta lo que costó para que la Fase 9 lo lea.
 *
 * ── Por qué es una función pura y no un bucle ───────────────────────────────
 *
 * Un motor de trabajos parece que tiene que ser un proceso que da vueltas:
 * mirar la cola, coger uno, ejecutarlo, dormir, repetir. Ese proceso existirá,
 * pero no aquí. Aquí está lo que ese proceso NECESITA SABER, y está en forma de
 * funciones puras sobre el estado guardado:
 *
 *   ¿qué trabajo debería existir para esta petición?   → `crear`
 *   ¿puede este trabajador coger este trabajo?          → `reclamar`
 *   ¿qué se le entrega para ejecutar?                   → `despachar`
 *   ¿qué pasa ahora que el intento terminó así?         → `informar`
 *   ¿qué pasa ahora que ha pasado el tiempo?            → `evaluar`
 *   ¿qué pasa con lo que acaba de contar el proveedor?  → `recibirEvento`
 *   ¿se puede cancelar, y qué significa eso?            → `cancelar`
 *
 * Cada una devuelve una TRANSICIÓN con la revisión que esperaba encontrar. El
 * almacén la aplica con compare-and-set. Esa separación es lo que hace que dos
 * trabajadores no puedan ejecutar lo mismo, que una cancelación y una
 * finalización no puedan ganar las dos, y que todo esto se pueda probar con una
 * tabla de casos en vez de con un servidor encendido.
 *
 * ── El reloj entra por la puerta ────────────────────────────────────────────
 *
 * Igual que en el Orchestrator: `at` viaja en cada petición y aquí no se lee
 * `Date.now`. No es purismo — es que sin eso no hay forma de probar que una
 * concesión caducó, que un plazo venció o que una carrera la ganó quien debía.
 * El tiempo de las pruebas es un número que sube cuando ellas quieren.
 */

/* ── Identidad ────────────────────────────────────────────────────────────── */

/**
 * DÓNDE VIVE EL PROVEEDOR EN TODO ESTO.
 *
 * Un proveedor casi nunca llama a las cosas como Weë: tiene su `taskId`, su
 * `generationId`, su `operationId`. Nunca se asume que el identificador de Weë
 * sea el suyo ni al revés; se guarda la RELACIÓN, y el identificador externo no
 * es jamás la fuente de verdad de nada. Si el proveedor pierde su tarea, el
 * trabajo de Weë sigue existiendo y sigue sabiendo en qué estado está.
 */
export interface ProviderOperationRef {
  providerId: string;
  /** Como lo llama el proveedor. Opaco: no se interpreta, no se compara por partes. */
  operationId: string;
}

/**
 * LO QUE UN TRABAJO DEJA, SIN LLEVARLO DENTRO.
 *
 * Referencias, nunca contenido. Un vídeo dentro de un documento de trabajo es
 * un documento que no se puede guardar, ni leer, ni migrar. El sistema de
 * material es la Fase 11; hasta entonces esto es lo que hay: dónde quedó y qué
 * contó el proveedor, acotado.
 */
export interface JobResultRef {
  outputRefs: readonly string[];
  /** Lo que el proveedor declaró haber consumido. Se transporta; no se convierte en dinero. */
  usage?: GatewayUsage;
  /** Metadatos escalares del resultado, ya saneados y acotados. */
  metadata?: GatewayMetadata;
}

/* ── Estados ──────────────────────────────────────────────────────────────── */

/**
 * LOS ESTADOS DE UN TRABAJO. Ocho, y cada uno se produce de verdad.
 *
 *   queued            existe y espera a que alguien lo coja
 *   running           un trabajador lo tiene, con concesión, y está ejecutando
 *   waiting           el proveedor lo aceptó y Weë no está haciendo nada: espera
 *   cancel_requested  alguien pidió pararlo mientras algo seguía en marcha
 *   completed         terminó bien
 *   failed            terminó mal y no quedan intentos
 *   timed_out         se acabó el plazo
 *   cancelled         se paró
 *
 * ── Los que NO existen, y por qué ───────────────────────────────────────────
 *
 * No hay `retry_pending`. Un reintento programado vuelve a `queued` con la hora
 * a partir de la cual se puede coger, y ya está. Tenerlo como estado propio
 * obligaría a que ALGO lo promoviera a `queued` —un planificador, otro proceso,
 * otra cosa que se cae—, y a cambio no dice nada que la lista de intentos no
 * diga mejor. Es el mismo criterio con el que el Workflow se quitó de encima
 * `step_cancelled`: un valor declarado que no hace falta es una promesa que
 * alguien programará contra ella.
 *
 * No hay `ready`. Poder cogerse se DEDUCE —estar en `queued` y haber llegado su
 * hora—, y un estado guardado que se puede deducir es un estado que algún día
 * contradirá a lo que se deduce.
 *
 * No hay `unknown`. Lo que no se sabe no es un estado del trabajo: es una
 * propiedad del INTENTO, y vive ahí (`outcome: 'unknown'`). Un trabajo cuyo
 * intento acabó sin saberse está `waiting` —esperando a averiguarlo— o vencido,
 * pero nunca «en desconocido», que no es un sitio del que se pueda salir.
 *
 * No hay `paused`. Pausar un trabajo que ya está en manos de un proveedor no
 * existe físicamente, y fingirlo sería mentir sobre el estado. Pausar es del
 * Workflow (Fase 5): allí se deja de empezar cosas nuevas, que es lo que de
 * verdad se puede hacer.
 */
export type JobState =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'cancel_requested'
  | 'completed'
  | 'failed'
  | 'timed_out'
  | 'cancelled';

/** De aquí no se sale. Nunca. Ni con un evento, ni con un reintento, ni con una carrera. */
export const ESTADOS_FINALES_DE_TRABAJO: readonly JobState[] = Object.freeze(['completed', 'failed', 'timed_out', 'cancelled']);

export const esTrabajoTerminal = (estado: JobState): boolean => ESTADOS_FINALES_DE_TRABAJO.includes(estado);

/**
 * LA TABLA. Explícita, y lo que no está no pasa.
 *
 * Cada flecha de aquí la produce una operación concreta de este motor, y hay
 * una prueba que lo comprueba: una transición declarada que nadie produce es
 * una puerta que alguien intentará abrir.
 *
 *   queued → running             un trabajador la reclamó
 *   queued → cancelled           se canceló sin que hubiera nada que parar
 *   queued → timed_out           se acabó el plazo esperando en la cola
 *   running → waiting            el proveedor la aceptó y contestará luego
 *   running → queued             el intento falló y se puede reintentar
 *   running → completed          salió bien
 *   running → failed             salió mal y no quedan intentos
 *   running → timed_out          se acabó el plazo
 *   running → cancel_requested   alguien pidió pararla mientras corría
 *   waiting → queued             se supo que aquel intento falló, y se repite
 *   waiting → completed          llegó el aviso de que terminó
 *   waiting → failed             llegó el aviso de que falló y no quedan intentos
 *   waiting → timed_out          se acabó el plazo esperando al proveedor
 *   waiting → cancel_requested   alguien pidió pararla mientras el proveedor la tenía
 *   cancel_requested → cancelled la parada se consumó
 *   cancel_requested → completed llegó antes el final bueno: gana el final
 *   cancel_requested → timed_out venció antes el plazo
 *
 * ── Las dos que NO están, y costó verlo ─────────────────────────────────────
 *
 * No hay `waiting → running`. Parece que tendría que haberla —alguien vuelve a
 * coger el trabajo para preguntarle al proveedor cómo va—, pero preguntar no es
 * ejecutar: no consume un intento, no manda nada y no necesita concesión. Quien
 * pregunta informa del resultado, y es el informe el que mueve el trabajo.
 * Dejarla habría hecho que reclamar un trabajo en espera abriera un intento
 * NUEVO mientras el proveedor seguía con el anterior, que es exactamente pagar
 * dos veces.
 *
 * No hay `cancel_requested → failed`. Cuando alguien ya ha pedido parar, que el
 * intento acabe mal no es un fallo del trabajo: es la parada. Va a `cancelled`.
 * Lo que sí se respeta es el final BUENO: si el resultado ya existe, tirarlo
 * por una cancelación que llegó después sería tirar algo que ya costó dinero.
 */
export const TRANSICIONES_DE_TRABAJO: Readonly<Record<JobState, readonly JobState[]>> = Object.freeze({
  queued: Object.freeze(['running', 'cancelled', 'timed_out'] as JobState[]),
  running: Object.freeze(['waiting', 'queued', 'completed', 'failed', 'timed_out', 'cancel_requested'] as JobState[]),
  waiting: Object.freeze(['queued', 'completed', 'failed', 'timed_out', 'cancel_requested'] as JobState[]),
  cancel_requested: Object.freeze(['cancelled', 'completed', 'timed_out'] as JobState[]),
  completed: Object.freeze([] as JobState[]),
  failed: Object.freeze([] as JobState[]),
  timed_out: Object.freeze([] as JobState[]),
  cancelled: Object.freeze([] as JobState[]),
});

/**
 * ¿Vale esta transición?
 *
 * Con `hasOwnProperty` y no con `TRANSICIONES_DE_TRABAJO[desde]`: un estado inventado que
 * se llamara `constructor` encontraría algo en el prototipo y la comprobación
 * diría que sí. Es la misma cautela que en el Workflow, y por el mismo motivo.
 */
export const puedeTransitarTrabajo = (desde: JobState, hacia: JobState): boolean =>
  Object.prototype.hasOwnProperty.call(TRANSICIONES_DE_TRABAJO, desde) && TRANSICIONES_DE_TRABAJO[desde].includes(hacia);

/* ── Intentos ─────────────────────────────────────────────────────────────── */

/**
 * CÓMO TERMINÓ UN INTENTO.
 *
 * `unknown` es el importante y el que casi nadie modela: el trabajador mandó la
 * operación, se cayó la red, y nadie sabe si el proveedor la hizo. No es un
 * fallo —decir que falló es inventar—, no es un éxito, y sobre todo NO es algo
 * que se pueda reintentar alegremente, porque reintentar puede ser pagar dos
 * veces por dos vídeos. Es lo que es: no se sabe.
 */
export type JobAttemptOutcome = 'succeeded' | 'failed' | 'timed_out' | 'cancelled' | 'unknown';

/**
 * LA CONCESIÓN DE UN TRABAJADOR.
 *
 * Mientras esté vigente, ese trabajo es suyo y nadie más lo coge. Cuando
 * caduca, el trabajo vuelve a estar disponible: es la única forma de que la
 * muerte de un proceso no deje un trabajo colgado para siempre. No hay latido
 * obligatorio; un trabajador largo renueva la concesión reclamándola otra vez.
 */
export interface JobLease {
  /** Quién la tiene. Opaco para el Core: ni nombre de máquina, ni región, ni nada de infraestructura. */
  owner: string;
  until: number;
}

export interface JobAttempt {
  /** Derivado del trabajo y del número: dos servidores calculan el mismo. */
  attemptId: string;
  /** 1, 2, 3… Nunca 0, y nunca se reutiliza. */
  number: number;
  startedAt: number;
  endedAt?: number;
  /**
   * SE MARCÓ ANTES DE SALIR HACIA EL PROVEEDOR.
   *
   * Este booleano es lo que permite distinguir «se cayó antes de pedir nada»
   * de «se cayó sin saber qué contestaron», que es la diferencia entre poder
   * reintentar tranquilo y no poder. Se guarda ANTES de la llamada, a
   * propósito: si se guardara después, justo el caso que importa —caerse
   * durante la llamada— quedaría registrado como si nunca hubiera salido.
   */
  dispatched: boolean;
  /**
   * La clave que se le entregó al proveedor para ESTE intento.
   *
   * Reanudar el MISMO intento repite la clave, que es lo que hace que un
   * proveedor con deduplicación no lo haga dos veces. Un intento NUEVO lleva
   * otra, porque es otra ejecución y sí queremos que ocurra.
   */
  providerKey: string;
  providerRef?: ProviderOperationRef;
  outcome?: JobAttemptOutcome;
  error?: WeeError;
  /** Lo que el proveedor dijo haber consumido. Para la Fase 9; aquí no vale dinero. */
  usage?: GatewayUsage;
  lease?: JobLease;
  /**
   * El número de orden más alto que ha contado el proveedor PARA ESTE INTENTO.
   *
   * Vivía en el trabajo, y eso lo rompía: un intento nuevo es otra operación
   * del proveedor —otra clave, otra numeración, que vuelve a empezar por uno—
   * y la marca del intento anterior descartaba todos sus avisos por «viejos».
   * El orden de unos avisos solo tiene sentido dentro de la operación que los
   * emite.
   */
  lastEventSequence?: number;
}

/* ── Política ─────────────────────────────────────────────────────────────── */

/**
 * CUÁNTAS VECES, CADA CUÁNTO, Y HASTA CUÁNDO.
 *
 * Sin azar. Un `jitter` repartiría mejor la carga de un pico, pero haría que la
 * misma situación diera dos decisiones distintas y eso es justo lo que aquí no
 * puede pasar. Repartir el pico es de quien despierta a los trabajadores —puede
 * mirar la cola cuando quiera—, no de quien decide si toca reintentar.
 */
export interface JobRetryPolicy {
  /** Intentos TOTALES, no reintentos: 1 significa «una vez y ya». */
  maxAttempts: number;
  backoffMs: number;
  backoffFactor: number;
  maxBackoffMs: number;
}

export interface JobPolicy {
  retry: JobRetryPolicy;
  /** Lo que puede tardar UN intento. */
  attemptTimeoutMs: number;
  /** Lo que puede durar el trabajo ENTERO, reintentos incluidos. */
  maxLifetimeMs: number;
  /** Cuánto dura una concesión antes de caducar sola. */
  leaseMs: number;
  /** Cuántos intentos se guardan. Un trabajo no puede crecer sin fin. */
  maxAttemptsStored: number;
}

/**
 * La de siempre, cuando nadie dice otra cosa.
 *
 * Tres intentos porque el segundo arregla casi todo lo que el primero rompió y
 * el tercero es la red de seguridad; más que eso es insistir. Y una vida máxima
 * de diez minutos, que es lo que la persona tolera mirando una pantalla.
 */
export const POLITICA_DE_TRABAJO: JobPolicy = Object.freeze({
  retry: Object.freeze({ maxAttempts: 3, backoffMs: 2_000, backoffFactor: 2, maxBackoffMs: 60_000 }),
  attemptTimeoutMs: 120_000,
  maxLifetimeMs: 10 * 60_000,
  leaseMs: 60_000,
  maxAttemptsStored: 16,
});

/* ── El trabajo ───────────────────────────────────────────────────────────── */

/**
 * QUIÉN ES SU DUEÑO. Autoridad, y solo autoridad.
 *
 * Una cuenta y nada más. `appId` y `workspaceId` NO están aquí a propósito:
 * son contexto declarado, viajan aparte, y meterlos en el dueño convertiría un
 * dato en un permiso. La regla de la Fase 6 escrita en otro sitio: lo que
 * autoriza no puede ser lo que la petición dice de sí misma.
 */
export interface JobOwner {
  userId: string;
}

/**
 * ── UNA TAREA GENERAL: trabajo que no es de IA ──────────────────────────────
 *
 * Hasta la Fase 11 este motor solo sabía modelar UNA cosa: una operación de IA
 * que un Router ya había adjudicado a un proveedor y un modelo. `capability` e
 * `implementation` eran obligatorios, y `implementation` exigía `providerId` y
 * `modelId`. Una miniatura la hace el propio servidor; no tiene proveedor ni
 * modelo, así que no cabía — y el resto del motor (estados, concesiones,
 * plazos, idempotencia, reintentos, recuperación) es justo lo que una
 * transcodificación necesita.
 *
 * Esto es el cambio mínimo: un trabajo es O una operación de IA O una tarea
 * con nombre. Nunca las dos; nunca ninguna. Todo lo demás del motor no sabe
 * cuál de las dos es, y así tiene que seguir: no hay un segundo motor, hay un
 * segundo tipo de paquete.
 *
 * El nombre tiene la forma de las capacidades —`media.thumbnail`,
 * `media.transcode`— pero NO está en el catálogo de capacidades ni puede
 * estarlo: el catálogo es de lo que un proveedor de IA sabe hacer.
 */
export interface JobTask {
  name: string;
}

export const FORMA_DE_TAREA = /^[a-z0-9]+\.[a-z0-9_]+$/;

/** ¿Es este trabajo una tarea general, y no una operación de IA? */
export const esTareaGeneral = (job: Pick<Job, 'task' | 'capability'>): boolean =>
  job.task !== undefined && job.capability === undefined;

/**
 * DESDE DÓNDE SE PIDIÓ. Correlación, y solo correlación.
 *
 * Ninguno de estos campos decide nada: ni el proveedor, ni el modelo, ni el
 * reintento, ni el plazo. Existen para que el día que haya que atribuir una
 * ejecución —qué producto, qué Workplace, qué operación, qué paso— no falte la
 * mitad de la respuesta. Hay una prueba que comprueba que dos trabajos
 * idénticos pedidos desde productos distintos se ejecutan exactamente igual.
 */
export interface JobContext {
  appId?: string;
  workspaceId?: string;
  operationId?: string;
  workflowId?: string;
  workflowRunId?: string;
  stepId?: string;
}

/** Lo que se guarda de un trabajo. Todo lo demás se deduce de esto. */
export interface Job {
  contract: typeof JOB_ENGINE_CONTRACT_VERSION;
  jobId: string;
  /**
   * Sube en CADA cambio. Es lo que hace que dos escrituras simultáneas no se
   * pisen: quien escribe dice con qué revisión leyó, y si ya no es esa, no
   * escribe. Sin esto, cancelar y terminar podrían ganar los dos.
   */
  revision: number;
  state: JobState;
  owner: JobOwner;
  context: JobContext;
  /** Operación de IA: qué capacidad. Ausente en una tarea general. */
  capability?: CoreCapabilityId;
  /** La que eligió el Router. Aquí no se vuelve a elegir. Ausente en una tarea general. */
  implementation?: ImplementationRef;
  /** Tarea general: qué hay que hacer, sin proveedor ni modelo. Ausente en una operación de IA. */
  task?: JobTask;
  input: Readonly<Record<string, unknown>>;
  /** Los recursos del paso, tal como los eligió el Orchestrator. Solo se transportan. */
  references?: readonly BrainAttachment[];
  trace: TraceContext;
  language?: LanguageContext;
  hints?: ExecutionHints;
  metadata?: GatewayMetadata;
  mode: ExecutionMode;
  policy: JobPolicy;
  /** Identidad lógica de la operación: con qué clave se deduplica y qué operación es. */
  idempotency: { key: string; scope: string; fingerprint: string };
  createdAt: number;
  updatedAt: number;
  /** Cuándo deja de tener sentido seguir. Nunca se alarga. */
  deadlineAt: number;
  /** A partir de cuándo se puede coger. Sube con cada reintento. */
  availableAt: number;
  attempts: readonly JobAttempt[];
  /** Cuántos intentos hubo de verdad, aunque la lista guardada se haya recortado. */
  attemptCount: number;
  result?: JobResultRef;
  error?: WeeError;
  /** Alguien pidió pararlo. Se recuerda aunque el estado todavía no lo refleje. */
  cancelRequestedAt?: number;
  /** Identidades de eventos de proveedor ya procesados. Acotada. */
  seenEvents: readonly string[];
}

/* ── La petición ──────────────────────────────────────────────────────────── */

/**
 * CUÁNTOS RECURSOS COMO MUCHO TRANSPORTA UN TRABAJO.
 *
 * El mismo tope que el plan, y por el mismo motivo: lo que cabe aquí es lo que
 * una persona adjuntó a un mensaje. El trabajo se guarda y se lee muchas veces;
 * una lista sin fin la pagaría cada lectura.
 */
export const MAX_RECURSOS_DEL_TRABAJO = 8;

export interface JobRequest {
  contract: string;
  /** Quién lo pide de verdad. No es lo que diga el contexto. */
  principal: Principal;
  /** Cuándo. Aquí no se lee el reloj. */
  at: number;
  /** Operación de IA: qué capacidad. Con `task`, no se manda. */
  capability?: CoreCapabilityId;
  /** Ya elegida por el Router. Si es una operación de IA y falta, no hay trabajo que crear. */
  implementation?: ImplementationRef;
  /** Tarea general. Con `capability`/`implementation`, no se manda: es una u otra. */
  task?: JobTask;
  input: Readonly<Record<string, unknown>>;
  /**
   * LOS RECURSOS QUE ESTE PASO NECESITA, ya elegidos por el Orchestrator.
   *
   * El mismo `BrainAttachment` que viene del entendimiento, con su `assetId`.
   * Va por su propio canal y NO dentro de `input` a propósito: `input` son
   * parámetros de la tarea y esto es material del que alguien es dueño, y
   * mezclarlos habría hecho que la autorización dependiera de mirar las claves
   * de un objeto libre.
   *
   * El trabajo solo lo TRANSPORTA. No lo elige, no lo resuelve, no lo firma y
   * no sabe de quién es: eso sigue siendo de la puerta de C8.
   */
  references?: readonly BrainAttachment[];
  trace: TraceContext;
  language?: LanguageContext;
  hints?: ExecutionHints;
  metadata?: GatewayMetadata;
  mode?: ExecutionMode;
  /** Con qué clave se deduplica. Sin ella, la del `requestId` de la traza. */
  idempotencyKey?: string;
  /** Si ya se sabe cómo se llama. Sin él, se deriva de la identidad. */
  jobId?: string;
  /** Un plazo de quien llama. Nunca alarga el de la política: se coge el más corto. */
  deadlineAt?: number;
  policy?: Partial<JobPolicy>;
  context?: JobContext;
  /**
   * CUÁNTOS HAY YA, Y CUÁNTOS CABEN. La contrapresión va AQUÍ.
   *
   * Y no al reclamar, que fue el primer sitio donde la puse. Negarse a coger
   * un trabajo no acota nada: lo deja en la cola, y la cola sigue creciendo.
   * Lo único que impide que una cuenta llene la memoria del sistema es no
   * ACEPTARLE el trabajo número mil uno. Quien cuenta es el almacén; aquí solo
   * se decide, y si nadie dice cuántos hay se avisa en vez de suponerlo.
   */
  capacity?: JobCapacity;
  limits?: JobLimits;
}

/* ── Eventos ──────────────────────────────────────────────────────────────── */

/** Lo que pasó, en un vocabulario estable. Cada uno lo produce alguna operación. */
export type JobEventKind =
  | 'job_created'
  | 'job_queued'
  | 'job_started'
  | 'job_waiting'
  | 'job_retry_scheduled'
  | 'job_completed'
  | 'job_failed'
  | 'job_timed_out'
  | 'job_cancel_requested'
  | 'job_cancelled'
  | 'job_recovered';

export interface JobEvent {
  kind: JobEventKind;
  jobId: string;
  at: number;
  attempt?: number;
  /** Diagnóstico acotado. Ni secretos, ni respuestas crudas, ni texto de nadie. */
  detail?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * LO QUE CUENTA UN PROVEEDOR, YA NORMALIZADO POR SU ADAPTADOR.
 *
 * El Core no sabe qué forma tiene el webhook de nadie y no va a inventarla: el
 * adaptador traduce lo suyo a esto, y a partir de aquí el motor razona igual
 * venga de donde venga. `eventId` es la identidad del aviso —para no procesar
 * el mismo dos veces— y `sequence`, cuando el proveedor lo dé, es el orden.
 */
export interface ProviderEvent {
  eventId: string;
  jobId: string;
  /** A qué intento se refiere. Un aviso de un intento viejo no mueve el actual. */
  attemptId: string;
  kind: 'accepted' | 'progress' | 'succeeded' | 'failed';
  at: number;
  providerRef?: ProviderOperationRef;
  sequence?: number;
  outputRefs?: readonly string[];
  usage?: GatewayUsage;
  error?: WeeError;
  metadata?: GatewayMetadata;
}

/* ── Lo que se entrega para ejecutar ──────────────────────────────────────── */

/**
 * EL PAQUETE DE UN INTENTO.
 *
 * Compáralo con `GatewayRequest`: está todo, con la identidad del trabajo y del
 * intento encima. Esto es lo que el Job Engine entrega, y quien lo convierte en
 * una petición del Gateway es la composición — igual que el Orchestrator
 * entrega un `StepDispatch` y quien lo completa es el Router. Que el paquete
 * viaje en vez de ejecutarse aquí es lo que impide que este motor se convierta
 * en un segundo Gateway.
 */
export interface JobDispatch {
  jobId: string;
  attemptId: string;
  attempt: number;
  /** Operación de IA. Ausentes en una tarea general, que lleva `task`. */
  capability?: CoreCapabilityId;
  implementation?: ImplementationRef;
  task?: JobTask;
  input: Readonly<Record<string, unknown>>;
  /** Los recursos del paso. Se transportan tal cual; aquí no se resuelve ninguno. */
  references?: readonly BrainAttachment[];
  trace: TraceContext;
  language?: LanguageContext;
  hints?: ExecutionHints;
  metadata?: GatewayMetadata;
  mode: ExecutionMode;
  /** La del intento. Un reintento del MISMO intento la repite; uno nuevo no. */
  idempotencyKey: string;
  /** Lo que puede tardar: lo más corto entre el intento y lo que queda de plazo. */
  timeoutMs: number;
  deadlineAt: number;
}

/* ── Cómo terminó un intento ──────────────────────────────────────────────── */

/**
 * LO QUE CUENTA QUIEN EJECUTÓ.
 *
 * Deliberadamente más estrecho que un estado: quien ejecuta informa de lo que
 * PASÓ, no elige a qué estado va el trabajo. La traducción la hace este motor
 * contra su tabla, que es la única que sabe si quedan intentos, si el plazo
 * llegó o si alguien había pedido parar mientras tanto.
 */
export interface AttemptReport {
  attemptId: string;
  outcome: JobAttemptOutcome;
  /** Obligatorio al fallar y al vencer. Ya normalizado. */
  error?: WeeError;
  result?: JobResultRef;
  usage?: GatewayUsage;
  providerRef?: ProviderOperationRef;
  /** ¿Salió de verdad hacia el proveedor? Lo sabe quien ejecutó, y cambia si se puede repetir. */
  dispatched?: boolean;
}

/* ── La decisión ──────────────────────────────────────────────────────────── */

export type JobDecisionStatus =
  /* Hay que escribir: la transición va dentro. */
  | 'transition'
  /* No hay nada que cambiar, y está bien así. */
  | 'noop'
  /* No se puede hacer lo que se pide, y se dice por qué. */
  | 'refused'
  /* La petición no tiene forma, o no es de quien dice. */
  | 'invalid';

export type JobRefusal =
  /* Otro trabajador la tiene y su concesión sigue viva. */
  | 'leased'
  /* Todavía no le toca: su hora no ha llegado. */
  | 'not_available_yet'
  /* Está en un estado del que no se sale hacia donde se pide. */
  | 'terminal'
  | 'invalid_transition'
  /* No caben más a la vez. */
  | 'at_capacity'
  /* La misma clave con otra operación dentro. */
  | 'idempotency_conflict'
  /* Se acabaron los intentos. */
  | 'attempts_exhausted'
  /* Se mandó al proveedor y no se sabe en qué quedó: repetirlo podría duplicarlo. */
  | 'unsafe_to_retry';
/*
 * NO hay `deadline_reached`. Llegó a estar, y no lo producía nadie: un trabajo
 * al que se le pasó el plazo no se RECHAZA, se VENCE —reclamarlo lo lleva a
 * `timed_out` en vez de devolverlo a la cola—, que es una respuesta y no una
 * negativa. Un valor declarado que ninguna ruta produce es una promesa contra
 * la que alguien programará, y en este proyecto ya ha aparecido en cuatro
 * fases seguidas. Ahora hay una prueba que recorre TODOS los valores de TODAS
 * estas uniones y falla si alguno no se produce.
 */

export type JobWarning =
  /* Se aceptó sin poder comprobar cuántos hay en marcha: nadie dijo cuántos. */
  | 'capacity_not_checked'
  /* Hubo que recortar o limpiar algo antes de guardarlo. */
  | 'payload_trimmed'
  /* La lista de intentos guardados llegó a su tope y se olvidó el más viejo. */
  | 'attempts_truncated'
  /* Este intento salió hacia el proveedor y no se sabe cómo acabó. */
  | 'outcome_unknown'
  /* El aviso del proveedor ya se había procesado. */
  | 'event_duplicate'
  /* El aviso llegó después de otro más nuevo. */
  | 'event_out_of_order'
  /* El aviso es de un intento que ya no es el actual. */
  | 'event_stale_attempt';

/**
 * LO QUE HAY QUE ESCRIBIR, Y SOBRE QUÉ.
 *
 * `expectedRevision` es la mitad del contrato: el almacén solo debe aplicar
 * esto si el trabajo sigue en esa revisión. Si alguien escribió mientras tanto,
 * no se aplica y quien llamó vuelve a leer y a decidir. Eso es lo que convierte
 * una carrera en una repetición inofensiva.
 */
export interface JobTransition {
  jobId: string;
  from: JobState;
  to: JobState;
  at: number;
  expectedRevision: number;
  /** El trabajo tal como queda. Congelado. */
  job: Job;
  /** Por qué, en una palabra del vocabulario. Diagnóstico, no bifurcación. */
  reason: JobTransitionReason;
}

export type JobTransitionReason =
  | 'created'
  | 'claimed'
  | 'dispatched'
  | 'lease_renewed'
  | 'provider_accepted'
  | 'attempt_succeeded'
  | 'attempt_failed'
  | 'retry_scheduled'
  | 'attempts_exhausted'
  | 'deadline_passed'
  | 'lease_expired'
  | 'cancel_requested'
  | 'cancelled'
  | 'provider_event';

export interface JobDecision {
  contract: typeof JOB_ENGINE_CONTRACT_VERSION;
  status: JobDecisionStatus;
  /** Solo en `transition`. */
  transition?: JobTransition;
  /** El trabajo tal como está, cuando se pudo leer. */
  job?: Job;
  /** Lo que hay que ejecutar ahora, cuando la decisión lo produce. */
  dispatch?: JobDispatch;
  /** Cuándo volver a mirar, cuando la decisión lo sabe. */
  retryAt?: number;
  refusal?: JobRefusal;
  error?: WeeError;
  events: readonly JobEvent[];
  warnings: readonly JobWarning[];
}

/* ── Puertos ──────────────────────────────────────────────────────────────── */

/**
 * CUÁNTOS HAY EN MARCHA. Lo cuenta quien guarda; aquí solo se decide.
 *
 * El Core no puede contar nada: no tiene estado y no ve la base de datos. Quien
 * llama pasa los números que sepa y este motor dice si cabe. Si no los pasa, se
 * avisa con `capacity_not_checked` en vez de dar por hecho que cabía — el mismo
 * criterio que el Router con un tope que no pudo comprobar.
 */
export interface JobCapacity {
  running?: number;
  runningForAccount?: number;
  runningForProvider?: number;
  queuedForAccount?: number;
}

/** Topes. Cero significa cero, y ausente significa «no se comprueba». */
export interface JobLimits {
  maxRunning?: number;
  maxRunningPerAccount?: number;
  maxRunningPerProvider?: number;
  maxQueuedPerAccount?: number;
}

/**
 * EL ALMACÉN. Un contrato, no una implementación.
 *
 * Aquí no hay Firestore, ni Redis, ni una cola de nadie, y no los va a haber:
 * el Core no sabe guardar. Lo que sí sabe es QUÉ hace falta que el almacén
 * garantice, y lo importante son dos cosas:
 *
 *   `crearSiAusente` tiene que ser UNA operación atómica. No `si no existe,
 *   crea`: eso es una carrera con dos peticiones simultáneas y la misma clave,
 *   y el resultado son dos trabajos para una sola operación. El camino natural
 *   es que la identidad de idempotencia SEA el identificador del documento
 *   —`claveDeIdempotencia()` la construye sin colisiones posibles— y que
 *   crearlo falle si ya está.
 *
 *   `aplicar` solo debe escribir si el trabajo sigue en `expectedRevision`. Sin
 *   eso, cancelar y terminar pueden ganar los dos y el trabajo acaba en un
 *   estado que nunca se decidió.
 *
 * Lo demás es lectura. `recuperables` va paginado a propósito: cargar todos los
 * trabajos en marcha de un sistema con un millón de personas no es una
 * recuperación, es una caída.
 */
export interface JobStore {
  crearSiAusente(job: Job): Promise<{ created: boolean; job: Job }>;
  obtener(jobId: string): Promise<Job | undefined>;
  porIdempotencia(scope: string, key: string): Promise<Job | undefined>;
  aplicar(transition: JobTransition): Promise<{ applied: boolean; job: Job }>;
  /** Paginado y acotado. Devuelve el cursor para seguir, nunca todo de golpe. */
  recuperables(consulta: { before: number; limit: number; cursor?: string }): Promise<{ jobs: readonly Job[]; cursor?: string }>;
}

/* ── Límites ──────────────────────────────────────────────────────────────── */

const MAX_INPUT_BYTES = 128 * 1024;
const MAX_TEXTO_DE_ENTRADA = 32 * 1024;
const MAX_CLAVES_DE_ENTRADA = 128;
const MAX_PROFUNDIDAD_DE_ENTRADA = 8;
const MAX_OUTPUT_REFS = 64;
const MAX_REF_LARGO = 512;
const MAX_EVENTOS_RECORDADOS = 64;
const MAX_VIDA_MS = 24 * 60 * 60 * 1000;
const MAX_INTENTOS = 16;
const MAX_ID = 400;

const CLAVES_DE_PETICION = [
  'contract', 'principal', 'at', 'capability', 'implementation', 'input', 'trace', 'language',
  'hints', 'metadata', 'mode', 'idempotencyKey', 'jobId', 'deadlineAt', 'policy', 'context',
  'capacity', 'limits', 'task',
];
const CLAVES_DE_PRINCIPAL = ['userId', 'appId'];
const CLAVES_DE_REFERENCIA = ['providerId', 'modelId', 'adapterId'];
const CLAVES_DE_CONTEXTO = ['appId', 'workspaceId', 'operationId', 'workflowId', 'workflowRunId', 'stepId'];
const CLAVES_DE_POLITICA = ['retry', 'attemptTimeoutMs', 'maxLifetimeMs', 'leaseMs', 'maxAttemptsStored'];
const CLAVES_DE_REINTENTO = ['maxAttempts', 'backoffMs', 'backoffFactor', 'maxBackoffMs'];
const CLAVES_DE_EVENTO = ['eventId', 'jobId', 'attemptId', 'kind', 'at', 'providerRef', 'sequence', 'outputRefs', 'usage', 'error', 'metadata'];
const CLAVES_DE_INFORME = ['attemptId', 'outcome', 'error', 'result', 'usage', 'providerRef', 'dispatched'];
const MODOS: readonly ExecutionMode[] = ['sync', 'async'];
const DESENLACES: readonly JobAttemptOutcome[] = ['succeeded', 'failed', 'timed_out', 'cancelled', 'unknown'];
const AVISOS_DE_PROVEEDOR: readonly ProviderEvent['kind'][] = ['accepted', 'progress', 'succeeded', 'failed'];

const VACIO: readonly never[] = Object.freeze([]);

/* ── Piezas ───────────────────────────────────────────────────────────────── */

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'job', { details: { reason, ...extra } });

const congelarError = (e: WeeError): WeeError =>
  Object.freeze({ ...e, ...(e.details ? { details: Object.freeze({ ...e.details }) } : {}) });

const decision = (parcial: Partial<JobDecision> & { status: JobDecisionStatus }): JobDecision =>
  Object.freeze({
    contract: JOB_ENGINE_CONTRACT_VERSION,
    events: VACIO,
    warnings: VACIO,
    ...parcial,
    ...(parcial.error ? { error: congelarError(parcial.error) } : {}),
    ...(parcial.events ? { events: Object.freeze([...parcial.events]) } : {}),
    ...(parcial.warnings ? { warnings: Object.freeze([...parcial.warnings]) } : {}),
  });

const invalido = (reason: string, field?: string): JobDecision =>
  decision({ status: 'invalid', error: fallo('INVALID_REQUEST', reason, field ? { field: nombreDeCampo(field) } : {}) });

const rechazo = (refusal: JobRefusal, job?: Job, extra: Partial<JobDecision> = {}): JobDecision =>
  decision({ status: 'refused', refusal, ...(job ? { job } : {}), ...extra });

/**
 * UNA CLAVE COMPUESTA QUE NO PUEDE COLISIONAR.
 *
 * Con la LONGITUD de cada parte por delante, como la del paso en la Fase 6 y
 * por el mismo motivo: los dos puntos son legales dentro de un identificador,
 * así que `a:b` + `c` y `a` + `b:c` daban exactamente la misma clave y dos
 * cosas distintas parecían la misma. Aquí eso importa el doble, porque esta
 * clave es lo que decide si dos peticiones son la misma operación.
 */
const compuesta = (...partes: readonly string[]): string =>
  partes.map((p) => `${p.length}.${p}`).join(':');

/** El ámbito de una clave de idempotencia: la CUENTA. Ver `crear` para el porqué. */
export const alcanceDeIdempotencia = (userId: string): string => compuesta('u', userId);

/** La identidad con la que el almacén deduplica. Sin colisiones por construcción. */
export const claveDeIdempotencia = (scope: string, key: string): string => compuesta(scope, key);

/** La identidad de un intento. Derivada: dos servidores calculan la misma. */
export const claveDeIntento = (jobId: string, numero: number): string => compuesta(jobId, String(numero));

/**
 * LA CLAVE QUE BAJA AL PROVEEDOR.
 *
 * Es la del INTENTO, no la del trabajo. Si fuera la del trabajo, un proveedor
 * con deduplicación devolvería el resultado del primer intento cuando lo que
 * queremos del segundo es justamente que vuelva a intentarlo. Y si fuera nueva
 * cada vez que se llama, reanudar un intento que se quedó a medias pediría el
 * trabajo dos veces. Por intento es lo único que cumple las dos cosas.
 */
export const claveDeProveedor = (jobId: string, numero: number): string => compuesta('a', jobId, String(numero));

/**
 * LA HUELLA DE UNA OPERACIÓN.
 *
 * Responde a una sola pregunta: ¿estas dos peticiones con la misma clave piden
 * LO MISMO? Si no lo piden, es un conflicto y no se ejecuta ninguna, porque
 * devolver el trabajo de otra operación porque compartían clave es peor que
 * fallar.
 *
 * Se construye de forma canónica —claves ordenadas, formas explícitas— para que
 * el orden en que alguien escribió el objeto no cambie la huella. Y lleva
 * delante la longitud de lo que resume, más un dígito de control, para que
 * recortarla por tamaño no convierta dos operaciones distintas en la misma.
 */
export const huellaDeOperacion = (
  capability: string,
  implementation: ImplementationRef | undefined,
  input: unknown,
): string => {
  const canonico = (v: unknown, profundidad = 0): string => {
    if (v === null) return 'n';
    if (v === undefined) return 'u';
    if (typeof v === 'string') return `s${v.length}.${v}`;
    if (typeof v === 'number') return Number.isFinite(v) ? `d${v}` : 'd!';
    if (typeof v === 'boolean') return v ? 'b1' : 'b0';
    if (profundidad >= 8) return 'x';
    if (Array.isArray(v)) return `[${v.slice(0, 256).map((x) => canonico(x, profundidad + 1)).join(',')}]`;
    if (esObjetoPlano(v)) {
      return `{${Object.keys(v).sort().slice(0, 256)
        .map((k) => `${canonico(k, profundidad + 1)}=${canonico((v as Record<string, unknown>)[k], profundidad + 1)}`)
        .join(',')}}`;
    }
    /* Funciones, símbolos, instancias: no describen una operación y no entran. */
    return 'x';
  };
  const texto = compuesta(
    capability,
    implementation?.providerId ?? '',
    implementation?.modelId ?? '',
    implementation?.adapterId ?? '',
    canonico(input),
  );
  /*
   * Dos recorridos con semillas distintas. Uno solo de 32 bits colisiona antes
   * de lo que parece, y una colisión aquí significa aceptar como «la misma
   * operación» una que no lo era.
   */
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b + c + i, 0x85ebca6b) >>> 0;
  }
  return `${texto.length}.${a.toString(36)}.${b.toString(36)}.${texto.slice(0, 96)}`;
};

/* ── Lectores ─────────────────────────────────────────────────────────────── */

const soloClaves = (o: Record<string, unknown>, permitidas: readonly string[], prefijo: string): string | null => {
  /* En ORDEN FIJO: qué campo se nombra al rechazar no puede depender de cómo se escribió la petición. */
  for (const clave of Object.keys(o).sort()) {
    if (claveProhibida(clave)) return `${prefijo}${clave}`;
    if (!permitidas.includes(clave)) return `${prefijo}${clave}`;
  }
  return null;
};

const esEntero = (v: unknown, min: number, max: number): v is number =>
  esNumero(v) && Number.isInteger(v) && v >= min && v <= max;

const acotado = (v: unknown, forma: RegExp): v is string => esTexto(v) && forma.test(v);

const bytesDe = (v: unknown): number => {
  let total = 0;
  const medir = (x: unknown, profundidad: number): void => {
    if (total > MAX_INPUT_BYTES || profundidad > 12) return;
    if (esTexto(x)) { total += x.length; return; }
    if (typeof x === 'number' || typeof x === 'boolean' || x === null || x === undefined) { total += 8; return; }
    if (Array.isArray(x)) { for (const e of x) medir(e, profundidad + 1); return; }
    if (esObjetoPlano(x)) { for (const k of Object.keys(x)) { total += k.length; medir(x[k], profundidad + 1); } }
  };
  medir(v, 0);
  return total;
};

/**
 * REFERENCIAS DE SALIDA: SE RECORTA, NO SE TIRA EL RESULTADO.
 *
 * Antes bastaba una referencia demasiado larga para que el aviso ENTERO se
 * rechazara como inválido — y con él, la noticia de que el proveedor había
 * terminado. El trabajo volvía a la cola y se ejecutaba otra vez algo que ya
 * estaba hecho y pagado. Entre perder una referencia rara y pagar dos veces un
 * vídeo, se pierde la referencia y se avisa. Lo que sí sigue siendo un rechazo
 * es que `outputRefs` no sea una lista: eso no es un resultado recortable, es
 * un resultado que no tiene forma.
 */
const leerRefs = (v: unknown): { refs: readonly string[]; trimmed: boolean } | null => {
  if (!Array.isArray(v)) return null;
  const limpias: string[] = [];
  let trimmed = v.length > MAX_OUTPUT_REFS;
  for (const r of v.slice(0, MAX_OUTPUT_REFS)) {
    if (!esTexto(r) || r.length === 0 || r.length > MAX_REF_LARGO) { trimmed = true; continue; }
    limpias.push(r);
  }
  return { refs: Object.freeze(limpias), trimmed };
};

/**
 * Una tarea general, o nada, o basura. Tres respuestas distintas: `undefined`
 * es «no se pidió», `null` es «se pidió mal», y las dos se tratan al revés.
 */
const leerTarea = (v: unknown): JobTask | null | undefined => {
  if (v === undefined) return undefined;
  if (!esObjetoPlano(v)) return null;
  if (soloClaves(v, ['name'], '')) return null;
  if (!acotado(v.name, FORMA_DE_TAREA)) return null;
  return Object.freeze({ name: v.name as string });
};

const leerImplementacion = (v: unknown): ImplementationRef | null => {
  if (!esObjetoPlano(v)) return null;
  if (soloClaves(v, CLAVES_DE_REFERENCIA, '')) return null;
  /* La MISMA forma que exige el Gateway a una referencia. Barra incluida: el registro real la usa. */
  if (!acotado(v.providerId, FORMA_DE_REFERENCIA) || !acotado(v.modelId, FORMA_DE_REFERENCIA)) return null;
  if (v.adapterId !== undefined && !acotado(v.adapterId, FORMA_DE_REFERENCIA)) return null;
  return Object.freeze({
    providerId: v.providerId,
    modelId: v.modelId,
    ...(esTexto(v.adapterId) ? { adapterId: v.adapterId } : {}),
  });
};

const leerContexto = (v: unknown): { ok: true; context: JobContext } | { ok: false; field: string } => {
  if (v === undefined) return { ok: true, context: Object.freeze({}) };
  if (!esObjetoPlano(v)) return { ok: false, field: 'context' };
  const sobra = soloClaves(v, CLAVES_DE_CONTEXTO, 'context.');
  if (sobra) return { ok: false, field: sobra };
  const limpio: Record<string, string> = {};
  for (const clave of CLAVES_DE_CONTEXTO) {
    const valor = v[clave];
    if (valor === undefined) continue;
    if (!acotado(valor, FORMA_DE_ETIQUETA_DE_TRAZA)) return { ok: false, field: `context.${clave}` };
    limpio[clave] = valor;
  }
  return { ok: true, context: Object.freeze(limpio) };
};

/**
 * LA POLÍTICA, FUSIONADA CON CUIDADO.
 *
 * Una clave ausente y una presente valiendo `undefined` no son lo mismo, pero
 * un spread las trata igual, y eso convertía «la de siempre pero con más
 * intentos» en una política sin plazo. Lo que no tiene forma vuelve a su valor
 * por defecto en vez de gobernar. Es la misma lección de la Fase 7, aprendida a
 * base de que un peso negativo decidiera.
 */
const leerPolitica = (v: unknown, base: JobPolicy = POLITICA_DE_TRABAJO): { ok: true; policy: JobPolicy } | { ok: false; field: string } => {
  if (v === undefined) return { ok: true, policy: base };
  if (!esObjetoPlano(v)) return { ok: false, field: 'policy' };
  const sobra = soloClaves(v, CLAVES_DE_POLITICA, 'policy.');
  if (sobra) return { ok: false, field: sobra };
  let reintento = base.retry;
  if (v.retry !== undefined) {
    if (!esObjetoPlano(v.retry)) return { ok: false, field: 'policy.retry' };
    const sobraR = soloClaves(v.retry, CLAVES_DE_REINTENTO, 'policy.retry.');
    if (sobraR) return { ok: false, field: sobraR };
    const r = v.retry;
    reintento = Object.freeze({
      maxAttempts: esEntero(r.maxAttempts, 1, MAX_INTENTOS) ? r.maxAttempts : base.retry.maxAttempts,
      backoffMs: esEntero(r.backoffMs, 0, MAX_VIDA_MS) ? r.backoffMs : base.retry.backoffMs,
      backoffFactor: esNumero(r.backoffFactor) && r.backoffFactor >= 1 && r.backoffFactor <= 16
        ? r.backoffFactor : base.retry.backoffFactor,
      maxBackoffMs: esEntero(r.maxBackoffMs, 0, MAX_VIDA_MS) ? r.maxBackoffMs : base.retry.maxBackoffMs,
    });
  }
  return {
    ok: true,
    policy: Object.freeze({
      retry: reintento,
      attemptTimeoutMs: esEntero(v.attemptTimeoutMs, 1, MAX_VIDA_MS) ? v.attemptTimeoutMs : base.attemptTimeoutMs,
      maxLifetimeMs: esEntero(v.maxLifetimeMs, 1, MAX_VIDA_MS) ? v.maxLifetimeMs : base.maxLifetimeMs,
      leaseMs: esEntero(v.leaseMs, 1, MAX_VIDA_MS) ? v.leaseMs : base.leaseMs,
      maxAttemptsStored: esEntero(v.maxAttemptsStored, 1, MAX_INTENTOS) ? v.maxAttemptsStored : base.maxAttemptsStored,
    }),
  };
};

const leerPrincipal = (v: unknown): { ok: true; principal: Principal } | { ok: false; field: string } => {
  if (!esObjetoPlano(v)) return { ok: false, field: 'principal' };
  const sobra = soloClaves(v, CLAVES_DE_PRINCIPAL, 'principal.');
  if (sobra) return { ok: false, field: sobra };
  if (!acotado(v.userId, FORMA_DE_ID)) return { ok: false, field: 'principal.userId' };
  if (v.appId !== undefined && !acotado(v.appId, FORMA_DE_ETIQUETA_DE_TRAZA)) return { ok: false, field: 'principal.appId' };
  return { ok: true, principal: Object.freeze({ userId: v.userId, ...(esTexto(v.appId) ? { appId: v.appId } : {}) }) };
};

/**
 * LO QUE NUNCA ES MATERIAL DE TRABAJO.
 *
 * Y por qué NO es la misma lista que la de una traza. Una traza no puede llevar
 * el texto de la persona —los registros se copian, se exportan y se pegan en un
 * chat de soporte—, pero el material de un trabajo ES ese texto: quitar
 * `prompt` de aquí sería mandar a generar una imagen sin decir de qué. Dos
 * destinos distintos, dos reglas distintas, y confundirlas rompe una de las
 * dos. Lo que no entra es lo que nunca es material: credenciales, que un
 * trabajo no necesita y que un almacén no debe guardar jamás, y las claves con
 * las que un objeto deja de ser un objeto plano.
 *
 * Se RECHAZA, no se quita. Quitar una credencial en silencio deja a quien la
 * mandó creyendo que viajó, y la próxima vez la manda igual.
 */
const CLAVES_FUERA_DEL_MATERIAL: readonly string[] = [
  'apikey', 'apisecret', 'accesstoken', 'refreshtoken', 'authtoken', 'idtoken', 'authorization',
  'bearer', 'token', 'secret', 'password', 'credential', 'credentials', 'clientsecret',
  'privatekey', 'cookie', 'setcookie',
  '__proto__', 'constructor', 'prototype',
];

/**
 * Se comprueba la clave TAL CUAL y también normalizada, y las dos hacen falta:
 * normalizar atrapa `x-api-key` y `API_KEY`, pero se come los guiones bajos y
 * convertiría `__proto__` en `proto`, que sí es un nombre legítimo.
 */
const fueraDelMaterial = (clave: string): boolean =>
  CLAVES_FUERA_DEL_MATERIAL.includes(clave)
  || CLAVES_FUERA_DEL_MATERIAL.includes(clave.toLowerCase().replace(/[-_]/g, ''));

/**
 * El material de entrada: acotado, sin credenciales y sin nada que no sea un
 * dato. Lo que no cabe se dice; lo que no se puede guardar —una función, una
 * instancia— se quita y se avisa.
 */
const leerEntrada = (v: unknown): { ok: true; input: Readonly<Record<string, unknown>>; trimmed: boolean } | { ok: false; field: string } => {
  if (!esObjetoPlano(v)) return { ok: false, field: 'input' };

  /*
   * SE LEE UNA SOLA VEZ, Y SE MIDE MIENTRAS SE LEE.
   *
   * Antes eran dos recorridos: `bytesDe` medía y luego `limpiar` copiaba. Con
   * un getter que devuelve una cadena vacía la primera vez y treinta mil
   * caracteres la segunda, el tope medía cero y se guardaban tres megas y
   * medio —veintisiete veces el máximo— sin un solo aviso. Es la misma trampa
   * que la auditoría de la Fase 7 encontró con la capacidad, del otro lado:
   * medir una cosa y usar otra. Ahora lo medido ES lo guardado.
   */
  let bytes = 0;
  let alterado = false;
  let prohibida: string | null = null;
  let pasado = false;
  const limpiar = (valor: unknown, profundidad: number, ruta: string): unknown => {
    if (prohibida || pasado) return undefined;
    if (valor === null) { bytes += 8; return null; }
    if (esTexto(valor)) {
      /*
       * UN TEXTO QUE NO CABE SE RECHAZA. No se recorta.
       *
       * Recortarlo parecía prudente y era lo contrario: el texto de la entrada
       * de un trabajo es lo que la persona PIDIÓ, y dejarlo a la mitad manda a
       * generar otra cosa —sin decírselo a nadie, y cobrándolo—. Que no quepa
       * es un error de quien pide, y se le dice.
       */
      if (valor.length > MAX_TEXTO_DE_ENTRADA) { pasado = true; return undefined; }
      bytes += valor.length;
      if (bytes > MAX_INPUT_BYTES) { pasado = true; return undefined; }
      return valor;
    }
    if (typeof valor === 'number') { bytes += 8; if (!Number.isFinite(valor)) { alterado = true; return null; } return valor; }
    if (typeof valor === 'boolean' || valor === undefined) return valor;
    if (profundidad >= MAX_PROFUNDIDAD_DE_ENTRADA) { alterado = true; return '[…]'; }
    if (Array.isArray(valor)) {
      if (valor.length > MAX_CLAVES_DE_ENTRADA) alterado = true;
      return valor.slice(0, MAX_CLAVES_DE_ENTRADA).map((x) => limpiar(x, profundidad + 1, ruta));
    }
    if (esObjetoPlano(valor)) {
      const limpio: Record<string, unknown> = {};
      const claves = Object.keys(valor).sort();
      if (claves.length > MAX_CLAVES_DE_ENTRADA) alterado = true;
      for (const clave of claves.slice(0, MAX_CLAVES_DE_ENTRADA)) {
        if (fueraDelMaterial(clave)) { prohibida = ruta ? `${ruta}.${clave}` : clave; return undefined; }
        bytes += clave.length;
        if (bytes > MAX_INPUT_BYTES) { pasado = true; return undefined; }
        const limpio_ = limpiar(valor[clave], profundidad + 1, ruta ? `${ruta}.${clave}` : clave);
        if (prohibida) return undefined;
        /* Se define, no se asigna: asignar dispararía el setter heredado en vez de crear la clave. */
        if (limpio_ !== undefined) Object.defineProperty(limpio, clave, { value: limpio_, enumerable: true, writable: true, configurable: true });
      }
      return limpio;
    }
    /* Funciones, símbolos, bigint, instancias: no son material y no se guardan. */
    alterado = true;
    return undefined;
  };

  const limpio = limpiar(v, 0, '');
  if (prohibida) return { ok: false, field: `input.${prohibida}` };
  if (pasado) return { ok: false, field: 'input' };
  if (!esObjetoPlano(limpio)) return { ok: false, field: 'input' };
  return { ok: true, input: Object.freeze(limpio), trimmed: alterado };
};

const leerResultado = (v: unknown): { ok: true; result?: JobResultRef; trimmed: boolean } | { ok: false; field: string } => {
  if (v === undefined) return { ok: true, trimmed: false };
  if (!esObjetoPlano(v)) return { ok: false, field: 'result' };
  const sobra = soloClaves(v, ['outputRefs', 'usage', 'metadata'], 'result.');
  if (sobra) return { ok: false, field: sobra };
  const refs = leerRefs(v.outputRefs);
  if (!refs) return { ok: false, field: 'result.outputRefs' };
  const meta = leerMetadata(v.metadata);
  if (!meta.ok) return { ok: false, field: `result.${meta.field}` };
  const uso = leerUso(v.usage);
  if (!uso.ok) return { ok: false, field: 'result.usage' };
  return {
    ok: true,
    trimmed: refs.trimmed,
    result: Object.freeze({
      outputRefs: refs.refs,
      ...(uso.usage ? { usage: uso.usage } : {}),
      ...(meta.metadata ? { metadata: meta.metadata } : {}),
    }),
  };
};

/**
 * EL USO, TAL COMO LO DIJO EL PROVEEDOR.
 *
 * Números y nada más: se transporta para que la Fase 9 pueda leerlo, y aquí no
 * vale dinero, no se suma a nada y no se convierte en Credits. Cualquier clave
 * que no sea un número se descarta en vez de viajar, porque lo que llega de un
 * adaptador llega de fuera.
 */
const leerUso = (v: unknown): { ok: true; usage?: GatewayUsage } | { ok: false } => {
  if (v === undefined) return { ok: true };
  if (!esObjetoPlano(v)) return { ok: false };
  const limpio: Record<string, unknown> = {};
  let hay = false;
  for (const clave of Object.keys(v).sort().slice(0, 32)) {
    if (claveProhibida(clave)) continue;
    const valor = v[clave];
    if (clave === 'raw' && esObjetoPlano(valor)) {
      const raw: Record<string, number> = {};
      for (const k of Object.keys(valor).sort().slice(0, 32)) {
        if (!claveProhibida(k) && esNumero(valor[k])) raw[k] = valor[k] as number;
      }
      if (Object.keys(raw).length) { limpio.raw = Object.freeze(raw); hay = true; }
      continue;
    }
    if (esNumero(valor)) { limpio[clave] = valor; hay = true; }
  }
  return { ok: true, ...(hay ? { usage: Object.freeze(limpio) as GatewayUsage } : {}) };
};

const leerRefDeProveedor = (v: unknown): { ok: true; ref?: ProviderOperationRef } | { ok: false } => {
  if (v === undefined) return { ok: true };
  if (!esObjetoPlano(v)) return { ok: false };
  if (soloClaves(v, ['providerId', 'operationId'], '')) return { ok: false };
  if (!acotado(v.providerId, FORMA_DE_REFERENCIA)) return { ok: false };
  if (!esTexto(v.operationId) || v.operationId.length === 0 || v.operationId.length > MAX_REF_LARGO) return { ok: false };
  return { ok: true, ref: Object.freeze({ providerId: v.providerId, operationId: v.operationId }) };
};

/**
 * LO QUE NO SE GUARDA DE UN ERROR, POR ENCIMA DE LO QUE YA QUITA EL SANEADO.
 *
 * `sanearMeta` quita credenciales con nombre y acota tamaños, pero no conoce
 * `stack` — y un rastro de pila es peor que un secreto con nombre: lleva rutas
 * del servidor, nombres de módulo y a veces el trozo de petición que reventó,
 * y todo eso acaba en un documento que se guarda, se exporta y se pega en un
 * chat de soporte. La respuesta cruda del proveedor tampoco: entera no cabe, y
 * lo que hace falta para diagnosticar ya viaja en `providerCode`.
 */
const CLAVES_FUERA_DE_UN_ERROR: readonly string[] = [
  'stack', 'stacktrace', 'raw', 'rawresponse', 'response', 'body', 'request', 'headers',
];

const sinRastro = (valor: unknown, profundidad = 0): unknown => {
  if (profundidad > 6 || !esObjetoPlano(valor)) return valor;
  const limpio: Record<string, unknown> = {};
  for (const clave of Object.keys(valor)) {
    if (CLAVES_FUERA_DE_UN_ERROR.includes(clave.toLowerCase().replace(/[-_]/g, ''))) continue;
    Object.defineProperty(limpio, clave, {
      value: sinRastro(valor[clave], profundidad + 1), enumerable: true, writable: true, configurable: true,
    });
  }
  return limpio;
};

/**
 * EL VOCABULARIO DE FALLO DE LA FASE 0, Y NINGÚN OTRO.
 *
 * `code` se copiaba con solo comprobar que era texto, así que un adaptador
 * podía meter en un trabajo durable un código que ninguna capa sabe leer —y
 * `esReintentable` diría que no ante algo que sí lo era—. Si el error no habla
 * el idioma del Core, no entra.
 */
const CODIGOS: readonly string[] = [
  'INVALID_REQUEST', 'AUTH_ERROR', 'CAPABILITY_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'MODEL_UNAVAILABLE',
  'PROVIDER_ERROR', 'RATE_LIMIT', 'TIMEOUT', 'DUPLICATE_REQUEST', 'INSUFFICIENT_CREDITS', 'BUDGET_EXCEEDED',
  'UNSUPPORTED_LANGUAGE', 'UNSUPPORTED_MODALITY', 'CONTENT_POLICY', 'INTERNAL_ERROR',
];
const MAX_ORIGEN = 120;
const MAX_DETALLES_BYTES = 8 * 1024;

/** Un error que llega de fuera: se acepta su forma o no se acepta, pero no se deja pasar crudo. */
const leerError = (v: unknown): { ok: true; error?: WeeError } | { ok: false } => {
  if (v === undefined) return { ok: true };
  if (!esObjetoPlano(v)) return { ok: false };
  if (!esTexto(v.code) || !CODIGOS.includes(v.code)) return { ok: false };
  /* `source` dice QUÉ pieza falló: un nombre, no un sitio donde meter cinco megas. */
  if (!esTexto(v.source) || v.source.length === 0 || v.source.length > MAX_ORIGEN) return { ok: false };
  const saneados = esObjetoPlano(v.details) ? sinRastro(sanearMeta(v.details).valor) : undefined;
  /*
   * Y se miden BYTES, que es lo que el otro saneado no hace: acota la FORMA
   * —profundidad, número de claves, largo de cada texto— pero no el total. Un
   * trabajo rechazaba una entrada de 200.000 bytes y aceptaba un `details` de
   * 295.000, guardado además una vez por intento.
   */
  const detalles = esObjetoPlano(saneados) && bytesDe(saneados) <= MAX_DETALLES_BYTES ? saneados : undefined;
  return {
    ok: true,
    error: congelarError({
      code: v.code as WeeErrorCode,
      source: v.source,
      ...(esTexto(v.providerCode) ? { providerCode: v.providerCode.slice(0, MAX_ORIGEN) } : {}),
      ...(esObjetoPlano(detalles) ? { details: detalles as Record<string, unknown> } : {}),
    }),
  };
};

/* ── Cálculos ─────────────────────────────────────────────────────────────── */

/** Exponencial, acotada y sin dados. La misma situación da siempre la misma espera. */
export const esperaDeReintento = (retry: JobRetryPolicy, intento: number): number => {
  const factor = Math.pow(retry.backoffFactor, Math.max(0, intento - 1));
  const bruto = retry.backoffMs * (Number.isFinite(factor) ? factor : 1);
  return Math.min(retry.maxBackoffMs, Number.isFinite(bruto) ? Math.round(bruto) : retry.maxBackoffMs);
};

/**
 * ¿SE PUEDE REPETIR ESTE INTENTO SIN HACER EL TRABAJO DOS VECES?
 *
 * La pregunta que separa un motor de trabajos serio de uno que duplica cobros.
 *
 *   No salió hacia el proveedor          → sí, seguro: no pasó nada.
 *   Salió y se sabe cómo acabó           → sí: es un intento nuevo y consciente.
 *   Salió, no se sabe, y hay referencia  → NO todavía: primero se pregunta.
 *   Salió, no se sabe, y no hay nada     → NO: repetirlo puede duplicarlo.
 *
 * El último caso es el incómodo, y es el que casi todo el mundo resuelve
 * reintentando «porque seguramente no llegó». Aquí no: no se inventa certeza.
 */
export const seguroReintentar = (intento: JobAttempt | undefined): boolean => {
  if (!intento) return true;
  if (!intento.dispatched) return true;
  return intento.outcome !== undefined && intento.outcome !== 'unknown';
};

/**
 * ── EL PRESUPUESTO DE UN INTENTO ───────────────────────────────────────────
 *
 * CUÁNTO PUEDE TARDAR ESTO, DE VERDAD.
 *
 * Es la regla que `paqueteDe` ya aplicaba dentro del motor —«lo más corto entre
 * lo que puede tardar un intento y lo que queda de plazo»— sacada a una función
 * para que la pueda usar también quien todavía no ejecuta sobre este motor.
 *
 * ── Por qué es una función y no un número en una tabla ─────────────────────
 *
 * Porque un plazo por modalidad —«un vídeo puede tardar veinte minutos»— es una
 * afirmación sobre el PROVEEDOR, y lo que hace falta saber es otra cosa: cuánto
 * tiempo QUEDA. Las dos se parecen lo suficiente como para confundirlas, y
 * confundirlas tiene una consecuencia concreta y cara: si el plazo del
 * proveedor es más largo que lo que le queda de vida al proceso que lo espera,
 * el proceso muere primero. Y cuando muere sin pasar por su propio manejo de
 * errores, lo que quedó a medias no se liquida: el trabajo se queda en marcha
 * para siempre y los Credits, retenidos.
 *
 * Por eso esto resta. Y por eso reserva: liquidar también tarda, y un plazo que
 * consume hasta el último milisegundo no deja tiempo para cerrar el libro, que
 * es justo lo que no puede faltar.
 *
 * Devuelve 0 cuando ya no queda nada. Cero significa «no empieces»: empezar un
 * intento sin tiempo gasta una llamada de proveedor —que se paga— para fallar.
 */
export const presupuestoDeIntento = (
  deadlineAt: number,
  at: number,
  maximoDelIntento: number,
  reservaParaLiquidar = 0,
): number => {
  if (!esNumero(deadlineAt) || !esNumero(at) || !esNumero(maximoDelIntento)) return 0;
  if (maximoDelIntento <= 0) return 0;
  const reserva = esNumero(reservaParaLiquidar) && reservaParaLiquidar > 0 ? reservaParaLiquidar : 0;
  const restante = deadlineAt - at - reserva;
  if (restante <= 0) return 0;
  return Math.min(maximoDelIntento, restante);
};

/**
 * ¿SE QUEDÓ ESTO ABIERTO?
 *
 * Una operación que sigue diciendo que está en marcha después de su plazo no
 * está en marcha: está abandonada. La diferencia importa porque las dos se ven
 * igual desde fuera —un documento que dice `running`— y se tratan al revés. A
 * una en marcha hay que dejarla trabajar; a una abandonada hay que cerrarla y
 * devolver lo que retuvo.
 *
 * No decide QUÉ hacer —eso depende de quién la tenga— y no sabe de dinero.
 * Solo contesta la pregunta, que es lo que hoy nadie se hace.
 */
export const operacionAbandonada = (
  enMarcha: boolean,
  deadlineAt: number | undefined,
  at: number,
): boolean => enMarcha && esNumero(deadlineAt) && esNumero(at) && at >= (deadlineAt as number);

const ultimoIntento = (job: Job): JobAttempt | undefined => job.attempts[job.attempts.length - 1];

/**
 * ¿SE SABE YA CÓMO ACABÓ ESTE INTENTO?
 *
 * `unknown` NO es saberlo: es justo lo contrario, y por eso no cuenta como
 * concluido. Si contara, un aviso del proveedor que llega tarde —el webhook que
 * se perdió y reapareció a los dos minutos— se descartaría por «duplicado» y se
 * perdería la única forma que quedaba de resolver la incertidumbre. Un intento
 * en `unknown` sigue abierto a que alguien cuente qué pasó de verdad.
 */
const concluido = (intento: JobAttempt): boolean =>
  intento.outcome !== undefined && intento.outcome !== 'unknown';

const concesionViva = (job: Job, at: number): boolean => {
  const lease = ultimoIntento(job)?.lease;
  return !!lease && lease.until > at;
};

const congelarIntento = (a: JobAttempt): JobAttempt => Object.freeze({
  ...a,
  ...(a.lease ? { lease: Object.freeze({ ...a.lease }) } : {}),
  ...(a.error ? { error: congelarError(a.error) } : {}),
  ...(a.providerRef ? { providerRef: Object.freeze({ ...a.providerRef }) } : {}),
  ...(a.usage ? { usage: congelarHondo(a.usage) } : {}),
});

/**
 * CONGELAR DE VERDAD, HASTA EL FONDO.
 *
 * Enumerar a mano lo que se congela tiene un problema: lo que se olvida no
 * avisa. Se olvidaron `hints`, `language`, `metadata` y el INTERIOR de `input`,
 * así que un trabajo salía con `Object.isFrozen(job) === true` y por dentro
 * seguía siendo el objeto de quien llamó —el mismo, no una copia— y se podía
 * cambiar después de decidir. Esto recorre lo que haya, sin lista que
 * mantener.
 */
const congelarHondo = <T>(v: T, profundidad = 0): T => {
  /*
   * Ojo con la tentación de salir pronto si `Object.isFrozen(v)`: estaba, y
   * era justo el fallo. `leerEntrada` congela el objeto de arriba, así que
   * esta función lo veía congelado y se daba por satisfecha sin bajar — y todo
   * lo de dentro seguía siendo mutable. Congelado por arriba no es congelado.
   */
  if (profundidad > 12 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return Object.freeze(v.map((x) => congelarHondo(x, profundidad + 1))) as unknown as T;
  const copia: Record<string, unknown> = {};
  for (const clave of Object.keys(v as Record<string, unknown>)) {
    Object.defineProperty(copia, clave, {
      value: congelarHondo((v as Record<string, unknown>)[clave], profundidad + 1),
      enumerable: true, writable: false, configurable: false,
    });
  }
  return Object.freeze(copia) as unknown as T;
};

const congelarTrabajo = (job: Job): Job => Object.freeze({
  ...job,
  owner: Object.freeze({ ...job.owner }),
  context: Object.freeze({ ...job.context }),
  ...(job.implementation ? { implementation: Object.freeze({ ...job.implementation }) } : {}),
  ...(job.task ? { task: Object.freeze({ ...job.task }) } : {}),
  trace: Object.freeze({ ...job.trace }),
  policy: Object.freeze({ ...job.policy, retry: Object.freeze({ ...job.policy.retry }) }),
  idempotency: Object.freeze({ ...job.idempotency }),
  attempts: Object.freeze(job.attempts.map(congelarIntento)),
  seenEvents: Object.freeze([...job.seenEvents]),
  input: congelarHondo(job.input),
  ...(job.references?.length ? { references: Object.freeze(job.references.map((r) => Object.freeze({ ...r }))) } : {}),
  ...(job.hints ? { hints: Object.freeze({ ...job.hints }) } : {}),
  ...(job.language ? { language: Object.freeze({ ...job.language }) } : {}),
  ...(job.metadata ? { metadata: congelarHondo(job.metadata) } : {}),
  ...(job.result ? {
    result: Object.freeze({
      ...job.result,
      outputRefs: Object.freeze([...job.result.outputRefs]),
      ...(job.result.usage ? { usage: congelarHondo(job.result.usage) } : {}),
      ...(job.result.metadata ? { metadata: congelarHondo(job.result.metadata) } : {}),
    }),
  } : {}),
  ...(job.error ? { error: congelarError(job.error) } : {}),
});

const evento = (kind: JobEventKind, job: Job, at: number, extra: Partial<JobEvent> = {}): JobEvent =>
  Object.freeze({
    kind,
    jobId: job.jobId,
    at,
    ...(extra.attempt !== undefined ? { attempt: extra.attempt } : {}),
    ...(extra.detail ? { detail: Object.freeze({ ...extra.detail }) } : {}),
  });

/**
 * LA TRANSICIÓN, CON LA REVISIÓN QUE ESPERA ENCONTRAR.
 *
 * Aquí se comprueba la tabla una última vez. Que las operaciones no puedan
 * producir una transición que la tabla no admita no es redundancia: es que la
 * tabla sea la única autoridad, en vez de estar repetida en siete sitios.
 */
const transitar = (
  job: Job,
  to: JobState,
  at: number,
  reason: JobTransitionReason,
  cambios: Partial<Job> = {},
): JobTransition | null => {
  if (!puedeTransitarTrabajo(job.state, to)) return null;
  const siguiente = congelarTrabajo({
    ...job,
    ...cambios,
    state: to,
    revision: job.revision + 1,
    updatedAt: at,
  });
  return Object.freeze({
    jobId: job.jobId,
    from: job.state,
    to,
    at,
    expectedRevision: job.revision,
    job: siguiente,
    reason,
  });
};

/**
 * ESCRIBIR SIN CAMBIAR DE ESTADO.
 *
 * Anotar la referencia de una operación del proveedor, o su número de orden, no
 * mueve el trabajo de sitio pero sí hay que guardarlo — y hay que guardarlo con
 * la misma protección que todo lo demás, porque dos avisos simultáneos también
 * se pisan. `from` y `to` son el mismo estado a propósito: es una escritura, no
 * una transición, y decir lo contrario haría que la tabla mintiera.
 */
const anotar = (
  job: Job,
  at: number,
  reason: JobTransitionReason,
  cambios: Partial<Job>,
): { job: Job; transition: JobTransition } => {
  const siguiente = congelarTrabajo({ ...job, ...cambios, revision: job.revision + 1, updatedAt: at });
  return {
    job: siguiente,
    transition: Object.freeze({
      jobId: job.jobId,
      from: job.state,
      to: job.state,
      at,
      expectedRevision: job.revision,
      job: siguiente,
      reason,
    }),
  };
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface ClaimRequest {
  principal: Principal;
  at: number;
  /** Quién reclama. Opaco: aquí no entra nada de infraestructura. */
  worker: string;
  capacity?: JobCapacity;
  limits?: JobLimits;
}

export interface ReportRequest {
  principal: Principal;
  at: number;
  report: AttemptReport;
  /** Quién informa. Si el intento tiene concesión, tiene que ser su dueño. */
  worker?: string;
}

/** Lo que hace falta para decir «esto ya sale hacia el proveedor». */
export interface DispatchMarkRequest {
  principal: Principal;
  at: number;
  worker: string;
  attemptId: string;
  /** Si el proveedor ya dio un identificador antes de empezar, se guarda aquí. */
  providerRef?: ProviderOperationRef;
}

export interface JobEngine {
  /** ¿Qué trabajo debería existir para esta petición? El almacén lo crea si no está. */
  crear(request: JobRequest, existente?: Job): JobDecision;
  /** ¿Puede este trabajador cogerlo? Si sí, aquí está el paquete. */
  reclamar(job: Job, request: ClaimRequest): JobDecision;
  /**
   * ESTO YA SALE. Se guarda ANTES de llamar al proveedor.
   *
   * La operación que faltaba, y sin ella toda la maquinaria de incertidumbre
   * era decorativa. `reclamar` abre el intento con `dispatched: false` y nada
   * lo ponía a `true` hasta que el proveedor contestaba — así que un
   * trabajador que muriese DURANTE la llamada dejaba un intento marcado como
   * «nunca salió», y la recuperación lo volvía a mandar. Exactamente el doble
   * cobro que esta capa existe para impedir. Lo encontraron cuatro lentes de
   * la auditoría por separado.
   *
   * No cambia de estado: escribe. Quien ejecuta hace `reclamar` → guardar →
   * `marcarEnvio` → guardar → llamar al Gateway.
   */
  marcarEnvio(job: Job, request: DispatchMarkRequest): JobDecision;
  /**
   * SIGO VIVO. Alarga la concesión sin volver a empezar nada.
   *
   * Un vídeo tarda minutos y una concesión dura uno. Sin esto, la recuperación
   * le quitaba el trabajo por debajo a un trabajador que seguía ejecutando, y
   * salía dos veces hacia el proveedor. Solo puede renovar quien la tiene.
   */
  renovar(job: Job, request: ClaimRequest): JobDecision;
  /** El paquete del intento en curso, sin cambiar nada. Para retomar lo que ya estaba en marcha. */
  despachar(job: Job): JobDecision;
  /** El intento terminó así. ¿Y ahora? */
  informar(job: Job, request: ReportRequest): JobDecision;
  /**
   * Ha pasado el tiempo. ¿Venció, caducó una concesión, hay que recuperarlo?
   *
   * NO lleva principal, y es deliberado: recuperar no lo pide una persona, lo
   * hace el sistema al barrer lo que se quedó a medias, y exigir un dueño
   * significaría que la muerte de un trabajador deja su trabajo sin nadie que
   * pueda rescatarlo. Quien autoriza es la lectura del almacén: aquí el trabajo
   * ya está en la mano. Lo mismo vale para `despachar` y `recibirEvento`, que
   * tampoco vienen de una persona sino del propio sistema y del proveedor.
   */
  evaluar(job: Job, at: number): JobDecision;
  /** Alguien quiere pararlo. */
  cancelar(job: Job, principal: Principal, at: number): JobDecision;
  /** Contó algo el proveedor. */
  recibirEvento(job: Job, event: ProviderEvent, at: number): JobDecision;
}

/**
 * ¿ES SUYO?
 *
 * De un trabajo ajeno no se dice ni que exista. Contestar «existe pero no es
 * tuyo» convierte el motor en un buscador de trabajos de otros: con una
 * colección de identificadores se puede averiguar qué hizo alguien. La misma
 * regla que el Orchestrator aplica a una ejecución ajena.
 */
const esSuyo = (job: Job, principal: Principal): boolean =>
  /*
   * Con `esObjetoPlano` delante porque el trabajo viene de un ALMACÉN, y un
   * almacén devuelve lo que tenga guardado: una escritura a medias, una
   * migración incompleta, un documento de otra versión. Sin esto, un trabajo
   * sin `owner` no fallaba la comprobación de dueño — lanzaba un `TypeError`
   * desde una capa pura y síncrona, que es el fallo que nadie captura.
   */
  esObjetoPlano(job) && esObjetoPlano(job.owner) && esTexto(job.owner.userId)
  && job.owner.userId === principal.userId;

/**
 * @param porDefecto La política que rige cuando la petición no trae la suya.
 *   Existe porque la composición tiene que poder fijar la de Weë: antes se le
 *   pasaba una y el motor la ignoraba en silencio, así que configurarlo no
 *   servía de nada y nadie se enteraba.
 */
export const crearJobEngine = (porDefecto: JobPolicy = POLITICA_DE_TRABAJO): JobEngine => {
  /* La de quien compone, ya saneada contra la de siempre: una política rota no puede gobernar. */
  const lecturaBase = leerPolitica(porDefecto);
  const BASE: JobPolicy = lecturaBase.ok ? lecturaBase.policy : POLITICA_DE_TRABAJO;
  /* ── Crear ───────────────────────────────────────────────────────────────── */
  const crear = (peticion: JobRequest, existente?: Job): JobDecision => {
    /*
     * UNA FOTO DE LA PETICIÓN AL ENTRAR.
     *
     * Releer el objeto que llega deja una ventana entre lo que se comprobó y lo
     * que se usa: con un getter, la capacidad se validaba una y se guardaba
     * otra. Lo encontró la auditoría de la Fase 7 y aquí no se vuelve a hacer.
     */
    const request: JobRequest = esObjetoPlano(peticion) ? { ...(peticion as object) } as JobRequest : peticion;
    if (!esObjetoPlano(request)) return invalido('invalid_request', 'request');

    const sobra = soloClaves(request as unknown as Record<string, unknown>, CLAVES_DE_PETICION, '');
    if (sobra) return invalido('unknown_field', sobra);
    if (!esTexto(request.contract) || !contratoCompatible(request.contract, JOB_ENGINE_CONTRACT_VERSION)) {
      return invalido('contract_incompatible', 'contract');
    }
    const quien = leerPrincipal(request.principal);
    if (!quien.ok) return invalido('invalid_principal', quien.field);
    if (!esNumero(request.at)) return invalido('invalid_request', 'at');
    const at = request.at;

    const traza = leerTraza(request);
    if (!traza) return invalido('invalid_request', 'trace');
    const trace = Object.freeze(traza);

    /*
     * OPERACIÓN DE IA O TAREA GENERAL. Una de las dos; nunca las dos; nunca
     * ninguna. Una tarea no lleva capacidad ni implementación, y una operación
     * de IA las lleva las dos, como siempre. Lo que ya valía sigue valiendo.
     */
    const tarea = leerTarea(request.task);
    if (tarea === null) return invalido('invalid_request', 'task');
    if (tarea && (request.capability !== undefined || request.implementation !== undefined)) {
      return invalido('invalid_request', 'task');
    }
    if (!tarea && !acotado(request.capability, /^[a-z0-9]+\.[a-z0-9_]+$/)) return invalido('invalid_request', 'capability');
    const implementation = tarea ? undefined : leerImplementacion(request.implementation);
    if (!tarea && !implementation) return invalido('invalid_request', 'implementation');

    const entrada = leerEntrada(request.input);
    if (!entrada.ok) return invalido('input_too_large', entrada.field);

    const pistas = leerHints(request.hints, 'hints');
    if (!pistas.ok) return invalido(pistas.reason, pistas.field);
    const idioma = leerIdioma(request.language);
    if (!idioma.ok) return invalido(idioma.reason, idioma.field);
    const meta = leerMetadata(request.metadata);
    if (!meta.ok) return invalido(meta.reason, meta.field);

    if (request.mode !== undefined && !MODOS.includes(request.mode)) return invalido('invalid_request', 'mode');
    const mode: ExecutionMode = request.mode ?? 'async';

    const politica = leerPolitica(request.policy, BASE);
    if (!politica.ok) return invalido('invalid_request', politica.field);
    const policy = politica.policy;

    const contexto = leerContexto(request.context);
    if (!contexto.ok) return invalido('invalid_request', contexto.field);

    /*
     * EL ÁMBITO ES LA CUENTA, Y ESO ES UNA DECISIÓN.
     *
     * No el producto, no el Workplace. La Fase 6 lo dejó escrito: hay UNA
     * cuenta Weë, y una persona que sigue el mismo trabajo desde otro producto
     * está siguiendo el mismo trabajo. Si el producto entrara en el ámbito,
     * abrir la app de escritorio duplicaría lo que ya estaba corriendo en el
     * móvil. Y al revés: la clave de una cuenta no puede alcanzar jamás el
     * trabajo de otra, porque el ámbito la separa por construcción.
     */
    const scope = alcanceDeIdempotencia(quien.principal.userId);
    const clave = esTexto(request.idempotencyKey) ? request.idempotencyKey : trace.requestId;
    if (!acotado(clave, FORMA_DE_ID)) return invalido('invalid_request', 'idempotencyKey');

    /* La huella de una tarea lleva su nombre donde la de IA lleva la capacidad: dos tareas distintas no pueden coincidir. */
    const fingerprint = huellaDeOperacion(tarea ? `task:${tarea.name}` : (request.capability as string), implementation ?? undefined, entrada.input);
    /*
     * EL IDENTIFICADOR, CON FORMA. Solo se comprobaba su LONGITUD.
     *
     * Todos los demás identificadores que entran de fuera pasan por una forma
     * —la clave, la cuenta, el trabajador, el evento, el contexto, el
     * proveedor— y este no. Con él se nombra un documento, así que una cadena
     * con barras y puntos puede apuntar a donde no debe y una cuenta puede
     * ocupar la identidad de otra. Ahora tiene la misma forma que la clave.
     */
    const jobId = esTexto(request.jobId) ? request.jobId : claveDeIdempotencia(scope, clave);
    if (esTexto(request.jobId) && !FORMA_DE_ID.test(request.jobId)) return invalido('invalid_request', 'jobId');
    if (jobId.length < 4 || jobId.length > MAX_ID) return invalido('invalid_request', 'jobId');
    /*
     * Y tiene que caber DERIVADO. La clave que baja al proveedor se construye
     * a partir de él y el Gateway exige 160 caracteres como mucho: sin esta
     * comprobación, una clave de idempotencia larga pero legal producía un
     * trabajo que el Gateway rechazaría al primer intento, y no se sabría por
     * qué hasta llegar allí.
     */
    if (claveDeProveedor(jobId, MAX_INTENTOS).length > 160) return invalido('invalid_request', 'idempotencyKey');

    /*
     * LA MISMA CLAVE CON OTRA OPERACIÓN DENTRO ES UN CONFLICTO.
     *
     * No se ejecuta ninguna de las dos. Devolver el trabajo que ya había
     * porque compartían clave haría que alguien esperase un vídeo y recibiera
     * una imagen; crear otro haría que la clave no sirviera para nada.
     */
    if (existente !== undefined) {
      /* Lo que devuelve el almacén es dato, no verdad: si no tiene forma de trabajo, no se compara con nada. */
      if (!esObjetoPlano(existente) || !esObjetoPlano(existente.idempotency) || !esObjetoPlano(existente.owner)) {
        return invalido('invalid_request', 'existente');
      }
      if (!esSuyo(existente, quien.principal)) {
        return decision({ status: 'refused', refusal: 'idempotency_conflict' });
      }
      if (existente.idempotency.fingerprint !== fingerprint) {
        return decision({
          status: 'refused',
          refusal: 'idempotency_conflict',
          job: existente,
          error: fallo('DUPLICATE_REQUEST', 'idempotency_conflict', { jobId: existente.jobId }),
        });
      }
      /* La misma operación otra vez: el trabajo que ya existe, sin tocarlo. */
      return decision({ status: 'noop', job: existente });
    }

    const avisos: JobWarning[] = [];
    if (entrada.trimmed) avisos.push('payload_trimmed');

    /*
     * LA COLA NO ES INFINITA. Aquí es donde se dice que no.
     *
     * Antes de crear nada, porque después ya es tarde: un trabajo aceptado es
     * un documento guardado, y un millón de documentos aceptados es el sistema
     * caído. Se mira lo que ya tiene encolado ESTA cuenta, para que nadie llene
     * el sitio de todos los demás.
     */
    if (esObjetoPlano(request.limits)) {
      const tope = request.limits.maxQueuedPerAccount;
      const hay = esObjetoPlano(request.capacity) ? request.capacity.queuedForAccount : undefined;
      if (esNumero(tope) && !esNumero(hay)) avisos.push('capacity_not_checked');
      if (esNumero(tope) && esNumero(hay) && hay >= tope) {
        return decision({ status: 'refused', refusal: 'at_capacity', warnings: avisos });
      }
    }

    /*
     * EL PLAZO NO SE ALARGA NUNCA.
     *
     * Lo más corto entre lo que pidió quien llama y lo que permite la política.
     * Un trabajo de diez minutos con tres reintentos de diez minutos cada uno
     * son treinta minutos, y entonces el plazo no era un plazo.
     */
    /*
     * LOS RECURSOS, REVISADOS COMO TODO LO QUE ENTRA.
     *
     * La FORMA, no la propiedad: de quién es cada material lo dirá quien tenga
     * permiso para leerlo, y eso no pasa en el Job Engine, que no lee nada. Lo
     * que sí se exige es que no llegue un objeto con claves de más disfrazado
     * de adjunto, ni una lista sin fin.
     */
    const recursos: BrainAttachment[] = [];
    if (request.references !== undefined) {
      if (!Array.isArray(request.references) || request.references.length > MAX_RECURSOS_DEL_TRABAJO) {
        return invalido('invalid_request', 'references');
      }
      for (const [i, ref] of request.references.entries()) {
        if (!esObjetoPlano(ref) || !esTexto((ref as Record<string, unknown>).kind)) return invalido('invalid_request', `references[${i}]`);
        for (const clave of Object.keys(ref)) {
          if (!['kind', 'url', 'assetId', 'name'].includes(clave)) return invalido('invalid_request', `references[${i}]`);
        }
        recursos.push(Object.freeze({ ...ref } as unknown as BrainAttachment));
      }
    }

    const porPolitica = at + policy.maxLifetimeMs;
    const pedido = esNumero(request.deadlineAt) ? request.deadlineAt : undefined;
    const deadlineAt = pedido !== undefined ? Math.min(pedido, porPolitica) : porPolitica;
    if (deadlineAt <= at) return invalido('deadline_passed', 'deadlineAt');

    const job = congelarTrabajo({
      contract: JOB_ENGINE_CONTRACT_VERSION,
      jobId,
      revision: 0,
      state: 'queued',
      owner: { userId: quien.principal.userId },
      context: contexto.context,
      ...(tarea
        ? { task: tarea }
        : { capability: request.capability as CoreCapabilityId, implementation: implementation as ImplementationRef }),
      input: entrada.input,
      ...(recursos.length ? { references: recursos } : {}),
      trace,
      ...(idioma.language ? { language: idioma.language } : {}),
      ...(pistas.hints ? { hints: pistas.hints } : {}),
      ...(meta.metadata ? { metadata: meta.metadata } : {}),
      mode,
      policy,
      idempotency: { key: clave, scope, fingerprint },
      createdAt: at,
      updatedAt: at,
      deadlineAt,
      availableAt: at,
      attempts: [],
      attemptCount: 0,
      seenEvents: [],
    });

    return decision({
      status: 'transition',
      job,
      warnings: avisos,
      events: [evento('job_created', job, at, { detail: { mode } })],
      transition: Object.freeze({
        jobId,
        from: 'queued' as JobState,
        to: 'queued' as JobState,
        at,
        /* Revisión -1: no hay nada que sustituir. El almacén crea si no está. */
        expectedRevision: -1,
        job,
        reason: 'created' as JobTransitionReason,
      }),
    });
  };

  /* ── Reclamar ────────────────────────────────────────────────────────────── */
  const reclamar = (job: Job, request: ClaimRequest): JobDecision => {
    if (!esObjetoPlano(job) || !esObjetoPlano(request)) return invalido('invalid_request', 'request');
    const quien = leerPrincipal(request.principal);
    if (!quien.ok) return invalido('invalid_principal', quien.field);
    if (!esSuyo(job, quien.principal)) return invalido('not_found', 'jobId');
    if (!esNumero(request.at)) return invalido('invalid_request', 'at');
    if (!acotado(request.worker, FORMA_DE_ETIQUETA_DE_TRAZA)) return invalido('invalid_request', 'worker');
    const at = request.at;

    if (esTrabajoTerminal(job.state)) return rechazo('terminal', job);
    /*
     * UNA CONCESIÓN VIVA ES DE QUIEN LA TIENE, y esa es la respuesta exacta.
     *
     * Se mira ANTES que el estado porque «lo tiene otro» es más útil que «no se
     * puede»: quien pregunta sabe entonces que no hay nada roto, solo alguien
     * delante. Esto y el compare-and-set son las dos mitades de que dos
     * trabajadores no ejecuten lo mismo: la concesión evita que lo intenten, la
     * revisión evita que lo consigan si lo intentan a la vez.
     */
    if (concesionViva(job, at)) return rechazo('leased', job);
    /* Solo desde la cola. Preguntarle al proveedor cómo va no es reclamar: ver la tabla. */
    if (job.state !== 'queued') return rechazo('invalid_transition', job);

    /*
     * EL PLAZO SE MIRA ANTES QUE NADA.
     *
     * Coger un trabajo vencido para ejecutarlo y que venza a los dos
     * milisegundos es gastar una llamada de proveedor para nada. Si venció,
     * vence aquí.
     */
    if (at >= job.deadlineAt) return vencer(job, at);

    if (at < job.availableAt) return rechazo('not_available_yet', job, { retryAt: job.availableAt });

    const limites = esObjetoPlano(request.limits) ? request.limits : undefined;
    const cupo = esObjetoPlano(request.capacity) ? request.capacity : undefined;
    const avisos: JobWarning[] = [];
    /*
     * EL AVISO ES POR TOPE, NO POR OBJETO.
     *
     * Decía `if (limites && !cupo)`, así que bastaba con que `capacity`
     * existiera —aunque no trajera justo el número que ese tope necesita— para
     * que el aviso se callara y el tope no se aplicara. Quien llamaba no podía
     * distinguir «comprobado y cabe» de «no lo pude comprobar». `crear` ya lo
     * hacía bien; ahora los dos sitios usan el mismo criterio.
     */
    let lleno = false;
    for (const [tope, cuenta] of [
      [limites?.maxRunning, cupo?.running],
      [limites?.maxRunningPerAccount, cupo?.runningForAccount],
      [limites?.maxRunningPerProvider, cupo?.runningForProvider],
    ] as const) {
      if (!esNumero(tope)) continue;
      if (!esNumero(cuenta)) { if (!avisos.includes('capacity_not_checked')) avisos.push('capacity_not_checked'); continue; }
      if (cuenta >= tope) lleno = true;
    }
    if (lleno) return rechazo('at_capacity', job, { warnings: avisos });

    const previo = ultimoIntento(job);

    /*
     * LO PRIMERO: ¿PUEDE REPETIRSE LO ANTERIOR SIN HACERLO DOS VECES?
     *
     * Si el intento de antes salió hacia el proveedor y no se sabe cómo acabó,
     * aquí no se coge nada. Ni para retomarlo, ni para empezar otro. Preguntar
     * primero, que es lo que hacen el aviso del proveedor y el plazo.
     */
    if (previo && !seguroReintentar(previo)) {
      return rechazo('unsafe_to_retry', job, { warnings: [...avisos, 'outcome_unknown'] });
    }

    /*
     * ¿ES ESTE UN INTENTO NUEVO O SE RETOMA EL DE ANTES?
     *
     * Si el último no llegó a tener desenlace —el trabajador se murió con él en
     * la mano antes de mandar nada— se RETOMA: mismo número, mismo
     * identificador, misma clave de proveedor. Repetir la clave es lo que hace
     * que un proveedor con deduplicación no cobre dos veces. Empezar uno nuevo
     * aquí sería fabricar una segunda ejecución de algo que quizá ya se hizo.
     */
    const retomar = !!previo && previo.outcome === undefined;

    if (!retomar && job.attemptCount >= job.policy.retry.maxAttempts) {
      return rechazo('attempts_exhausted', job, { warnings: avisos });
    }

    const numero = retomar ? previo.number : job.attemptCount + 1;
    const attemptId = claveDeIntento(job.jobId, numero);
    const lease: JobLease = { owner: request.worker, until: at + job.policy.leaseMs };

    const intento: JobAttempt = retomar
      ? { ...previo, lease }
      : {
        attemptId,
        number: numero,
        startedAt: at,
        dispatched: false,
        providerKey: claveDeProveedor(job.jobId, numero),
        lease,
      };

    const anteriores = retomar ? job.attempts.slice(0, -1) : job.attempts;
    const todos = [...anteriores, intento];
    const truncado = todos.length > job.policy.maxAttemptsStored;
    const attempts = truncado ? todos.slice(todos.length - job.policy.maxAttemptsStored) : todos;
    if (truncado) avisos.push('attempts_truncated');

    const transicion = transitar(job, 'running', at, 'claimed', {
      attempts,
      attemptCount: retomar ? job.attemptCount : job.attemptCount + 1,
    });
    if (!transicion) return rechazo('invalid_transition', job);

    return decision({
      status: 'transition',
      job: transicion.job,
      transition: transicion,
      dispatch: paqueteDe(transicion.job, intento, at),
      warnings: avisos,
      events: [evento('job_started', transicion.job, at, { attempt: numero, detail: { resumed: retomar } })],
    });
  };

  /* ── El paquete ──────────────────────────────────────────────────────────── */
  const paqueteDe = (job: Job, intento: JobAttempt, at: number): JobDispatch => {
    /* Lo más corto entre lo que puede tardar un intento y lo que queda de plazo. */
    const restante = presupuestoDeIntento(job.deadlineAt, at, job.deadlineAt - at);
    return Object.freeze({
      jobId: job.jobId,
      attemptId: intento.attemptId,
      attempt: intento.number,
      ...(job.task
        ? { task: job.task }
        : { capability: job.capability as CoreCapabilityId, implementation: job.implementation as ImplementationRef }),
      input: job.input,
      ...(job.references?.length ? { references: job.references } : {}),
      trace: job.trace,
      ...(job.language ? { language: job.language } : {}),
      ...(job.hints ? { hints: job.hints } : {}),
      ...(job.metadata ? { metadata: job.metadata } : {}),
      mode: job.mode,
      idempotencyKey: intento.providerKey,
      timeoutMs: Math.min(job.policy.attemptTimeoutMs, restante),
      deadlineAt: job.deadlineAt,
    });
  };

  const despachar = (job: Job): JobDecision => {
    if (!esObjetoPlano(job)) return invalido('invalid_request', 'job');
    const intento = ultimoIntento(job);
    if (!intento || intento.outcome !== undefined) return rechazo('invalid_transition', job);
    return decision({ status: 'noop', job, dispatch: paqueteDe(job, intento, job.updatedAt) });
  };

  /* ── Vencer ──────────────────────────────────────────────────────────────── */
  const vencer = (job: Job, at: number): JobDecision => {
    const intento = ultimoIntento(job);
    const avisos: JobWarning[] = [];
    /*
     * UN INTENTO QUE SE QUEDÓ SIN SABER CÓMO ACABÓ SE ANOTA COMO TAL.
     *
     * No como fallido. Decir que falló algo que quizá salió bien —y que quizá
     * costó dinero— es inventar, y la Fase 9 leerá esto para decidir si cobra.
     */
    const attempts = intento && intento.outcome === undefined
      ? [...job.attempts.slice(0, -1), { ...intento, outcome: 'unknown' as JobAttemptOutcome, endedAt: at, lease: undefined }]
      : job.attempts;
    if (intento && intento.outcome === undefined && intento.dispatched) avisos.push('outcome_unknown');

    const transicion = transitar(job, 'timed_out', at, 'deadline_passed', {
      attempts,
      error: fallo('TIMEOUT', 'deadline_passed', { deadlineAt: job.deadlineAt }),
    });
    if (!transicion) return rechazo('invalid_transition', job);
    return decision({
      status: 'transition',
      job: transicion.job,
      transition: transicion,
      warnings: avisos,
      events: [evento('job_timed_out', transicion.job, at, { attempt: intento?.number })],
    });
  };

  /* ── Informar ────────────────────────────────────────────────────────────── */
  const informar = (job: Job, request: ReportRequest): JobDecision => {
    if (!esObjetoPlano(job) || !esObjetoPlano(request)) return invalido('invalid_request', 'request');
    const quien = leerPrincipal(request.principal);
    if (!quien.ok) return invalido('invalid_principal', quien.field);
    if (!esSuyo(job, quien.principal)) return invalido('not_found', 'jobId');
    if (!esNumero(request.at)) return invalido('invalid_request', 'at');
    if (!esObjetoPlano(request.report)) return invalido('invalid_request', 'report');
    if (request.worker !== undefined && !acotado(request.worker, FORMA_DE_ETIQUETA_DE_TRAZA)) {
      return invalido('invalid_request', 'worker');
    }
    const at = request.at;

    const informe = request.report;
    const sobra = soloClaves(informe as unknown as Record<string, unknown>, CLAVES_DE_INFORME, 'report.');
    if (sobra) return invalido('unknown_field', sobra);
    if (!esTexto(informe.attemptId)) return invalido('invalid_request', 'report.attemptId');
    if (!DESENLACES.includes(informe.outcome)) return invalido('invalid_request', 'report.outcome');
    if (informe.dispatched !== undefined && typeof informe.dispatched !== 'boolean') {
      return invalido('invalid_request', 'report.dispatched');
    }

    /*
     * DE UN ESTADO TERMINAL NO SE SALE, Y UN SEGUNDO FINAL NO EXISTE.
     *
     * Esta línea y la de abajo son las que hacen imposible la doble
     * finalización: si el trabajo ya terminó, informar otra vez no hace nada;
     * si el intento ya tiene desenlace, tampoco. No hace falta un candado.
     */
    if (esTrabajoTerminal(job.state)) return decision({ status: 'noop', job, warnings: ['event_duplicate'] });

    const intento = ultimoIntento(job);
    if (!intento || intento.attemptId !== informe.attemptId) {
      /* Un informe de un intento que ya no es el actual no mueve nada. */
      return decision({ status: 'noop', job, warnings: ['event_stale_attempt'] });
    }
    if (concluido(intento)) return decision({ status: 'noop', job, warnings: ['event_duplicate'] });
    /*
     * SI LO ESTÁ EJECUTANDO ALGUIEN, QUIEN CIERRA ES ESE ALGUIEN.
     *
     * Quien informa se identifica, y si el intento tiene concesión viva tiene
     * que ser su dueño. La comprobación de arriba dice que el trabajo es de
     * esta CUENTA; esta dice que el intento es de este TRABAJADOR, que no es
     * lo mismo. Sin ella, cualquiera con la petición del dueño podía cerrar el
     * intento que otro estaba ejecutando. Quien no se identifica —el camino de
     * un aviso del proveedor, que no es un trabajador— pasa, porque el
     * proveedor sí sabe cómo acabó lo suyo.
     */
    if (esTexto(request.worker) && intento.lease && intento.lease.owner !== request.worker) {
      return rechazo('leased', job);
    }

    const uso = leerUso(informe.usage);
    if (!uso.ok) return invalido('invalid_request', 'report.usage');
    const ref = leerRefDeProveedor(informe.providerRef);
    if (!ref.ok) return invalido('invalid_request', 'report.providerRef');
    const err = leerError(informe.error);
    if (!err.ok) return invalido('invalid_request', 'report.error');
    const res = leerResultado(informe.result);
    if (!res.ok) return invalido('invalid_request', res.field);

    if ((informe.outcome === 'failed' || informe.outcome === 'timed_out') && !err.error) {
      return invalido('invalid_request', 'report.error');
    }

    const cerrado: JobAttempt = {
      ...intento,
      outcome: informe.outcome,
      endedAt: at,
      lease: undefined,
      dispatched: informe.dispatched ?? intento.dispatched,
      ...(err.error ? { error: err.error } : {}),
      ...(uso.usage ? { usage: uso.usage } : {}),
      ...(ref.ref ? { providerRef: ref.ref } : {}),
    };
    const attempts = [...job.attempts.slice(0, -1), cerrado];

    if (informe.outcome === 'succeeded') {
      const transicion = transitar(job, 'completed', at, 'attempt_succeeded', {
        attempts,
        ...(res.result ? { result: res.result } : {}),
      });
      if (!transicion) return rechazo('invalid_transition', job);
      return decision({
        status: 'transition',
        job: transicion.job,
        transition: transicion,
        /* Si hubo que descartar alguna referencia, se dice: el resultado se guarda igual. */
        ...(res.trimmed ? { warnings: ['payload_trimmed' as JobWarning] } : {}),
        events: [evento('job_completed', transicion.job, at, { attempt: cerrado.number })],
      });
    }

    if (informe.outcome === 'cancelled') return consumarCancelacion(job, at, attempts);

    /*
     * SE HABÍA PEDIDO PARAR: NO SE REINTENTA LO QUE ALGUIEN MANDÓ DETENER.
     *
     * Un intento que falla después de una petición de cancelación no abre otro
     * intento. La parada se consuma y ya está. Sin esto, cancelar un trabajo
     * que estaba fallando lo dejaba dando vueltas hasta agotar los intentos —y
     * el único final posible era `cancel_requested → queued`, que la tabla no
     * admite, así que el trabajo se quedaba clavado.
     */
    if (job.state === 'cancel_requested') return consumarCancelacion(job, at, attempts);

    /*
     * ¿TOCA REINTENTAR? Cuatro condiciones, y todas tienen que decir que sí.
     *
     * Que quede algún intento, que el error admita otro, que quepa dentro del
     * plazo, y que repetirlo no pueda duplicar lo que ya se hizo. Fallar
     * cualquiera de ellas no es un error del sistema: es que ya no toca.
     */
    const avisos: JobWarning[] = [];
    if (informe.outcome === 'unknown') avisos.push('outcome_unknown');

    const quedan = job.attemptCount < job.policy.retry.maxAttempts;
    const reintentable = informe.outcome === 'unknown'
      ? false
      : !err.error || esReintentable(err.error.code);
    const seguro = seguroReintentar(cerrado);
    const espera = esperaDeReintento(job.policy.retry, job.attemptCount);
    const cuando = at + espera;
    const cabe = cuando < job.deadlineAt;

    if (quedan && reintentable && seguro && cabe) {
      const transicion = transitar(job, 'queued', at, 'retry_scheduled', { attempts, availableAt: cuando });
      if (!transicion) return rechazo('invalid_transition', job);
      return decision({
        status: 'transition',
        job: transicion.job,
        transition: transicion,
        retryAt: cuando,
        warnings: avisos,
        events: [
          evento('job_retry_scheduled', transicion.job, at, { attempt: cerrado.number, detail: { retryAt: cuando } }),
          evento('job_queued', transicion.job, at, { attempt: cerrado.number }),
        ],
      });
    }

    /*
     * NO SE REINTENTA. Y ahora hay que decir la verdad sobre por qué.
     *
     * Un intento cuyo desenlace no se sabe NO se declara fallido: se deja
     * `waiting` si todavía se puede averiguar —hay referencia del proveedor y
     * queda plazo— y si no, el trabajo vence, que es lo honesto. Declararlo
     * fallido sería afirmar que no se hizo, y nadie lo sabe.
     */
    if (informe.outcome === 'unknown') {
      /*
       * NO SABER NO ES HABER TERMINADO, Y TAMPOCO ES HABER VENCIDO.
       *
       * Aquí exigía `providerRef` para esperar, y sin ella vencía el trabajo
       * en el acto aunque le quedaran diez minutos de plazo. Es el camino
       * normal del vídeo: el Gateway contesta `accepted`, la composición lo
       * informa como desconocido, y la referencia del proveedor es OPCIONAL.
       * Resultado: la operación larga se declaraba vencida a los diez
       * milisegundos de empezar. Lo que decide es el PLAZO, no si tenemos con
       * qué preguntar: repetirlo no es seguro en ninguno de los dos casos, así
       * que lo único sensato es esperar. Con referencia se puede preguntar y
       * se vuelve a mirar pronto; sin ella solo queda esperar al aviso o al
       * plazo, y se anota para cuándo.
       */
      if (at < job.deadlineAt) {
        const cuandoMirar = cerrado.providerRef ? Math.min(cuando, job.deadlineAt) : job.deadlineAt;
        const cambios = { attempts, availableAt: cuandoMirar };
        /*
         * Si ya estaba esperando, esto es una ESCRITURA, no una transición: un
         * sondeo que vuelve a no saber nada tiene que poder decirlo. Antes se
         * rechazaba con `invalid_transition` —la tabla no admite
         * `waiting → waiting`—, no se escribía nada, y el trabajo se quedaba
         * sin ninguna hora a la que volver hasta que venciera.
         */
        if (job.state === 'waiting') {
          const r = anotar(job, at, 'provider_accepted', cambios);
          return decision({
            status: 'transition', job: r.job, transition: r.transition,
            retryAt: cuandoMirar, warnings: avisos,
            events: [evento('job_waiting', r.job, at, { attempt: cerrado.number, detail: { uncertain: true } })],
          });
        }
        const transicion = transitar(job, 'waiting', at, 'provider_accepted', cambios);
        if (!transicion) return rechazo('invalid_transition', job);
        return decision({
          status: 'transition',
          job: transicion.job,
          transition: transicion,
          retryAt: cuandoMirar,
          warnings: avisos,
          events: [evento('job_waiting', transicion.job, at, { attempt: cerrado.number, detail: { uncertain: true } })],
        });
      }
      return vencerConIntentos(job, at, attempts, avisos);
    }

    if (informe.outcome === 'timed_out' && !quedan) {
      return vencerConIntentos(job, at, attempts, avisos);
    }

    const transicion = transitar(job, 'failed', at, quedan ? 'attempt_failed' : 'attempts_exhausted', {
      attempts,
      error: err.error ?? fallo('INTERNAL_ERROR', 'attempt_failed'),
    });
    if (!transicion) return rechazo('invalid_transition', job);
    return decision({
      status: 'transition',
      job: transicion.job,
      transition: transicion,
      warnings: avisos,
      events: [evento('job_failed', transicion.job, at, {
        attempt: cerrado.number,
        detail: { exhausted: !quedan, retryable: reintentable && seguro },
      })],
    });
  };

  const vencerConIntentos = (job: Job, at: number, attempts: readonly JobAttempt[], avisos: readonly JobWarning[]): JobDecision => {
    const transicion = transitar(job, 'timed_out', at, 'deadline_passed', {
      attempts,
      error: fallo('TIMEOUT', 'deadline_passed', { deadlineAt: job.deadlineAt }),
    });
    if (!transicion) return rechazo('invalid_transition', job);
    return decision({
      status: 'transition',
      job: transicion.job,
      transition: transicion,
      warnings: avisos,
      events: [evento('job_timed_out', transicion.job, at, { attempt: attempts[attempts.length - 1]?.number })],
    });
  };

  const consumarCancelacion = (job: Job, at: number, attempts: readonly JobAttempt[]): JobDecision => {
    const transicion = transitar(job, 'cancelled', at, 'cancelled', {
      attempts,
      error: fallo('INVALID_REQUEST', 'cancelled_by_request'),
    });
    if (!transicion) return rechazo('invalid_transition', job);
    return decision({
      status: 'transition',
      job: transicion.job,
      transition: transicion,
      events: [evento('job_cancelled', transicion.job, at, { attempt: attempts[attempts.length - 1]?.number })],
    });
  };

  /* ── Evaluar ─────────────────────────────────────────────────────────────── */
  const evaluar = (job: Job, at: number): JobDecision => {
    if (!esObjetoPlano(job)) return invalido('invalid_request', 'job');
    if (!esNumero(at)) return invalido('invalid_request', 'at');
    if (esTrabajoTerminal(job.state)) return decision({ status: 'noop', job });

    if (at >= job.deadlineAt) return vencer(job, at);

    /*
     * UNA CANCELACIÓN SE CONSUMA CUANDO YA NO PUEDE VOLVER NADA.
     *
     * Y «no queda concesión» NO significa eso. Un trabajo en espera no tiene
     * concesión por construcción —el proveedor lo tiene, no un trabajador
     * nuestro—, así que la condición anterior consumaba la parada en el
     * siguiente barrido con la operación todavía ejecutándose al otro lado:
     * se declaraba `cancelled`, y el resultado bueno que llegaba después se
     * tiraba por la única puerta que la tabla había dejado abierta a
     * propósito (`cancel_requested → completed`). Lo que de verdad hay que
     * mirar es si queda algo en vuelo: un intento que salió y del que todavía
     * no se sabe nada. Mientras lo haya, se espera; y si nunca vuelve, lo
     * cierra el plazo, que es lo honesto.
     */
    const enVuelo = ultimoIntento(job);
    const puedeVolverAlgo = !!enVuelo && enVuelo.dispatched && !concluido(enVuelo);
    if (job.state === 'cancel_requested' && !concesionViva(job, at) && !puedeVolverAlgo) {
      const attempts = enVuelo && enVuelo.outcome === undefined
        ? [...job.attempts.slice(0, -1), { ...enVuelo, outcome: 'cancelled' as JobAttemptOutcome, endedAt: at, lease: undefined }]
        : job.attempts;
      return consumarCancelacion(job, at, attempts);
    }

    /*
     * LA CONCESIÓN CADUCADA: AQUÍ ES DONDE UN TRABAJO NO SE PIERDE.
     *
     * El trabajador se murió. Nadie va a informar de ese intento nunca. Lo que
     * decide qué hacer es si aquel intento llegó a salir hacia el proveedor:
     * si no salió, se repite sin más; si salió y no se sabe cómo acabó,
     * repetirlo podría hacer el trabajo dos veces, así que no se repite.
     */
    if (job.state === 'running' && !concesionViva(job, at)) {
      const intento = ultimoIntento(job);
      const avisos: JobWarning[] = [];
      if (!intento) return rechazo('invalid_transition', job);

      if (!intento.dispatched) {
        /*
         * NUNCA SALIÓ: se puede repetir sin miedo. Pero el intento SE CIERRA y
         * el número NO se devuelve.
         *
         * Antes se borraba el intento y se bajaba `attemptCount`, para no
         * gastar un intento por una muerte que no llegó a pedir nada. Suena
         * generoso y es peligroso: el siguiente reclamo volvía a numerar desde
         * el mismo sitio y producía el MISMO `attemptId`, así que el
         * trabajador zombi —el que se creía vivo— podía cerrar con su informe
         * el intento de otro y tirar un resultado ya pagado. Un identificador
         * que se reutiliza deja de identificar. Gastar un intento de tres es
         * un precio bajo, y un trabajador que se cae una y otra vez es un
         * fallo que merece estar acotado.
         */
        const cerrado: JobAttempt = {
          ...intento,
          outcome: 'failed',
          endedAt: at,
          lease: undefined,
          error: fallo('INTERNAL_ERROR', 'lease_expired'),
        };
        const attempts = [...job.attempts.slice(0, -1), cerrado];
        const quedan = job.attemptCount < job.policy.retry.maxAttempts;
        const transicion = quedan
          ? transitar(job, 'queued', at, 'lease_expired', { attempts, availableAt: at })
          : transitar(job, 'failed', at, 'attempts_exhausted', { attempts, error: fallo('INTERNAL_ERROR', 'lease_expired') });
        if (!transicion) return rechazo('invalid_transition', job);
        return decision({
          status: 'transition',
          job: transicion.job,
          transition: transicion,
          events: [evento('job_recovered', transicion.job, at, { attempt: intento.number, detail: { dispatched: false, quedan } })],
        });
      }

      avisos.push('outcome_unknown');
      const marcado: JobAttempt = { ...intento, outcome: 'unknown', endedAt: at, lease: undefined };
      const attempts = [...job.attempts.slice(0, -1), marcado];

      /* Salió y hay con qué preguntar: se espera y se reconcilia, no se repite. */
      if (intento.providerRef) {
        const transicion = transitar(job, 'waiting', at, 'lease_expired', {
          attempts,
          availableAt: Math.min(at + esperaDeReintento(job.policy.retry, intento.number), job.deadlineAt),
        });
        if (!transicion) return rechazo('invalid_transition', job);
        return decision({
          status: 'transition',
          job: transicion.job,
          transition: transicion,
          retryAt: transicion.job.availableAt,
          warnings: avisos,
          events: [evento('job_recovered', transicion.job, at, { attempt: intento.number, detail: { uncertain: true } })],
        });
      }

      /*
       * Salió, no se sabe, y no hay con qué preguntar. Aquí es donde casi todo
       * el mundo reintenta «porque seguramente no llegó». No se reintenta: el
       * trabajo espera a que venza el plazo con la incertidumbre anotada, y la
       * Fase 9 decidirá qué hacer con un intento del que no se sabe nada.
       */
      const transicion = transitar(job, 'waiting', at, 'lease_expired', { attempts, availableAt: job.deadlineAt });
      if (!transicion) return rechazo('invalid_transition', job);
      return decision({
        status: 'transition',
        job: transicion.job,
        transition: transicion,
        retryAt: job.deadlineAt,
        warnings: avisos,
        events: [evento('job_recovered', transicion.job, at, { attempt: intento.number, detail: { unsafe: true } })],
      });
    }

    return decision({ status: 'noop', job, ...(job.availableAt > at ? { retryAt: job.availableAt } : {}) });
  };

  /* ── Cancelar ────────────────────────────────────────────────────────────── */
  const cancelar = (job: Job, peticion: Principal, at: number): JobDecision => {
    if (!esObjetoPlano(job)) return invalido('invalid_request', 'job');
    const quien = leerPrincipal(peticion);
    if (!quien.ok) return invalido('invalid_principal', quien.field);
    if (!esSuyo(job, quien.principal)) return invalido('not_found', 'jobId');
    if (!esNumero(at)) return invalido('invalid_request', 'at');

    /*
     * LO QUE YA TERMINÓ NO SE CANCELA.
     *
     * Y no es un error: es que llegó tarde. Quien pidió parar tiene que poder
     * distinguir «lo paré» de «ya había terminado», y eso se lee en el estado
     * que se devuelve, no en una excepción.
     */
    if (esTrabajoTerminal(job.state)) return decision({ status: 'noop', job });
    if (job.state === 'cancel_requested') return decision({ status: 'noop', job });

    /* Nada en marcha: la parada es inmediata y real. */
    if (job.state === 'queued') {
      return consumarCancelacion(job, at, job.attempts);
    }

    /*
     * ALGO ESTÁ EN MARCHA: SE PIDE PARAR, QUE NO ES LO MISMO QUE PARAR.
     *
     * Un proveedor puede no admitir cancelación, ignorarla o contestar tarde.
     * Marcar `cancelled` aquí sería mentir sobre algo que sigue ejecutándose y
     * consumiendo. Se registra la petición, y la parada se consuma cuando de
     * verdad no quede nadie ejecutando.
     */
    const transicion = transitar(job, 'cancel_requested', at, 'cancel_requested', { cancelRequestedAt: at });
    if (!transicion) return rechazo('invalid_transition', job);
    return decision({
      status: 'transition',
      job: transicion.job,
      transition: transicion,
      events: [evento('job_cancel_requested', transicion.job, at, { attempt: ultimoIntento(job)?.number })],
    });
  };

  /* ── Eventos del proveedor ───────────────────────────────────────────────── */
  const recibirEvento = (job: Job, aviso: ProviderEvent, at: number): JobDecision => {
    if (!esObjetoPlano(job) || !esObjetoPlano(aviso)) return invalido('invalid_request', 'event');
    if (!esNumero(at)) return invalido('invalid_request', 'at');
    const sobra = soloClaves(aviso as unknown as Record<string, unknown>, CLAVES_DE_EVENTO, 'event.');
    if (sobra) return invalido('unknown_field', sobra);
    if (!acotado(aviso.eventId, FORMA_DE_ETIQUETA_DE_TRAZA)) return invalido('invalid_request', 'event.eventId');
    if (!esTexto(aviso.attemptId)) return invalido('invalid_request', 'event.attemptId');
    if (!AVISOS_DE_PROVEEDOR.includes(aviso.kind)) return invalido('invalid_request', 'event.kind');
    if (aviso.jobId !== job.jobId) return invalido('invalid_request', 'event.jobId');
    if (aviso.sequence !== undefined && !esNumero(aviso.sequence)) return invalido('invalid_request', 'event.sequence');

    /* Un aviso sobre algo que ya terminó no lo desentierra. */
    if (esTrabajoTerminal(job.state)) return decision({ status: 'noop', job, warnings: ['event_duplicate'] });

    /* El mismo aviso otra vez: los webhooks se repiten, y repetirse no puede costar nada. */
    if (job.seenEvents.includes(aviso.eventId)) return decision({ status: 'noop', job, warnings: ['event_duplicate'] });

    const intento = ultimoIntento(job);
    if (!intento || intento.attemptId !== aviso.attemptId) {
      return decision({ status: 'noop', job, warnings: ['event_stale_attempt'] });
    }
    /* Un aviso sobre un intento ya cerrado tampoco: su desenlace ya se decidió. */
    if (concluido(intento)) return decision({ status: 'noop', job, warnings: ['event_duplicate'] });

    /*
     * FUERA DE ORDEN: `failed` después de `succeeded` no es una corrección.
     *
     * Los avisos llegan por la red y la red no conserva el orden. Cuando el
     * proveedor numera sus avisos, uno con número menor o igual al último visto
     * se descarta; sin numeración, lo que protege es que el intento ya tenga
     * desenlace, que es la comprobación de arriba.
     */
    if (esNumero(aviso.sequence) && esNumero(intento.lastEventSequence) && aviso.sequence <= intento.lastEventSequence) {
      return decision({ status: 'noop', job, warnings: ['event_out_of_order'] });
    }
    const orden = esNumero(aviso.sequence) ? { lastEventSequence: aviso.sequence } : {};

    const ref = leerRefDeProveedor(aviso.providerRef);
    if (!ref.ok) return invalido('invalid_request', 'event.providerRef');
    const err = leerError(aviso.error);
    if (!err.ok) return invalido('invalid_request', 'event.error');
    const uso = leerUso(aviso.usage);
    if (!uso.ok) return invalido('invalid_request', 'event.usage');

    const vistos = [...job.seenEvents, aviso.eventId].slice(-MAX_EVENTOS_RECORDADOS);
    /*
     * El aviso deja tres cosas en el intento: cómo llama el proveedor a la
     * operación, su número de orden, y —lo importante— que SALIÓ. Un webhook
     * es la prueba de que el proveedor lo tiene; sin marcarlo, un trabajo que
     * venciera después se guardaba como si nunca hubiera llegado a pedirse.
     */
    const conRef: JobAttempt = {
      ...intento,
      dispatched: true,
      ...(ref.ref ? { providerRef: ref.ref } : {}),
      ...orden,
    };

    /*
     * `accepted` y `progress` NO terminan nada. Lo único que hacen es dejar
     * anotado cómo llama el proveedor a esta operación, que es justo lo que
     * hará falta para preguntarle si un día no se sabe cómo acabó.
     */
    if (aviso.kind === 'accepted' || aviso.kind === 'progress') {
      if (job.state !== 'running' && job.state !== 'waiting') {
        return decision({ status: 'noop', job, warnings: ['event_out_of_order'] });
      }
      const attempts = [...job.attempts.slice(0, -1), { ...conRef, lease: undefined }];
      const cambios = { attempts, seenEvents: vistos };
      /*
       * Ya estaba esperando: no hay cambio de estado, solo se anota. Se escribe
       * igual —con su revisión— porque anotar la referencia del proveedor es
       * justo lo que hará falta para preguntarle si un día no se sabe cómo
       * acabó, y perderlo por no ser «una transición» sería perder la única
       * pista.
       */
      if (job.state === 'waiting') {
        return decision({ status: 'transition', ...anotar(job, at, 'provider_event', cambios) });
      }
      const transicion = transitar(job, 'waiting', at, 'provider_accepted', cambios);
      if (!transicion) return rechazo('invalid_transition', job);
      return decision({
        status: 'transition',
        job: transicion.job,
        transition: transicion,
        events: [evento('job_waiting', transicion.job, at, { attempt: intento.number })],
      });
    }

    /*
     * Un final que llega por aviso se trata EXACTAMENTE igual que uno que llega
     * por informe: misma tabla, mismo reintento, mismo plazo. Dos caminos que
     * decidieran distinto serían dos motores.
     */
    const informe: AttemptReport = {
      attemptId: aviso.attemptId,
      outcome: aviso.kind === 'succeeded' ? 'succeeded' : 'failed',
      dispatched: true,
      ...(err.error ? { error: err.error } : { ...(aviso.kind === 'failed' ? { error: fallo('PROVIDER_ERROR', 'provider_event') } : {}) }),
      ...(uso.usage ? { usage: uso.usage } : {}),
      ...(ref.ref ? { providerRef: ref.ref } : {}),
      ...(aviso.kind === 'succeeded' ? { result: { outputRefs: aviso.outputRefs ?? [], ...(uso.usage ? { usage: uso.usage } : {}) } } : {}),
    };
    /*
     * El número de orden se guarda TAMBIÉN cuando el aviso es un final. Solo se
     * guardaba en los de avance, así que un `succeeded` con número 7 no dejaba
     * rastro y un `failed` con número 3 que llegara detrás ya no se reconocía
     * como viejo. Que el trabajo quedara terminal lo tapaba casi siempre, pero
     * «casi siempre» no es una garantía de orden.
     */
    const conVistos: Job = { ...job, attempts: [...job.attempts.slice(0, -1), conRef], seenEvents: vistos };
    return informar(conVistos, { principal: { userId: job.owner.userId }, at, report: informe });
  };

  /* ── Marcar el envío y renovar la concesión ─────────────────────────────── */

  /** Lo común a las dos: es mío, está corriendo, y el intento es el que digo. */
  const enMiIntento = (
    job: Job,
    principal: Principal,
    at: unknown,
    worker: unknown,
    attemptId?: string,
  ): { ok: true; intento: JobAttempt } | { ok: false; decision: JobDecision } => {
    if (!esObjetoPlano(job)) return { ok: false, decision: invalido('invalid_request', 'job') };
    const quien = leerPrincipal(principal);
    if (!quien.ok) return { ok: false, decision: invalido('invalid_principal', quien.field) };
    if (!esSuyo(job, quien.principal)) return { ok: false, decision: invalido('not_found', 'jobId') };
    if (!esNumero(at)) return { ok: false, decision: invalido('invalid_request', 'at') };
    if (!acotado(worker, FORMA_DE_ETIQUETA_DE_TRAZA)) return { ok: false, decision: invalido('invalid_request', 'worker') };
    if (esTrabajoTerminal(job.state)) return { ok: false, decision: rechazo('terminal', job) };
    if (job.state !== 'running') return { ok: false, decision: rechazo('invalid_transition', job) };
    const intento = ultimoIntento(job);
    if (!intento || intento.outcome !== undefined) return { ok: false, decision: rechazo('invalid_transition', job) };
    if (attemptId !== undefined && intento.attemptId !== attemptId) {
      return { ok: false, decision: decision({ status: 'noop', job, warnings: ['event_stale_attempt'] }) };
    }
    /* La concesión es de quien la tiene. Otro no marca ni renueva lo que no está ejecutando. */
    if (intento.lease && intento.lease.owner !== worker) return { ok: false, decision: rechazo('leased', job) };
    return { ok: true, intento };
  };

  const marcarEnvio = (job: Job, request: DispatchMarkRequest): JobDecision => {
    if (!esObjetoPlano(request)) return invalido('invalid_request', 'request');
    const previo = enMiIntento(job, request.principal, request.at, request.worker, request.attemptId);
    if (!previo.ok) return previo.decision;
    const ref = leerRefDeProveedor(request.providerRef);
    if (!ref.ok) return invalido('invalid_request', 'providerRef');
    /* Ya estaba marcado: repetirlo no cuesta nada y no vuelve a escribir. */
    if (previo.intento.dispatched && !ref.ref) return decision({ status: 'noop', job });
    const marcado: JobAttempt = {
      ...previo.intento,
      dispatched: true,
      ...(ref.ref ? { providerRef: ref.ref } : {}),
    };
    const r = anotar(job, request.at, 'dispatched', {
      attempts: [...job.attempts.slice(0, -1), marcado],
    });
    return decision({ status: 'transition', job: r.job, transition: r.transition });
  };

  const renovar = (job: Job, request: ClaimRequest): JobDecision => {
    if (!esObjetoPlano(request)) return invalido('invalid_request', 'request');
    const previo = enMiIntento(job, request.principal, request.at, request.worker);
    if (!previo.ok) return previo.decision;
    const at = request.at;
    /* Renovar no alarga el plazo del trabajo: si ya venció, vence. */
    if (at >= job.deadlineAt) return vencer(job, at);
    const renovado: JobAttempt = { ...previo.intento, lease: { owner: request.worker, until: at + job.policy.leaseMs } };
    const r = anotar(job, at, 'lease_renewed', { attempts: [...job.attempts.slice(0, -1), renovado] });
    return decision({ status: 'transition', job: r.job, transition: r.transition });
  };

  return Object.freeze({ crear, reclamar, marcarEnvio, renovar, despachar, informar, evaluar, cancelar, recibirEvento });
};

/**
 * ¿ADMITE ESTE ERROR OTRO INTENTO?
 *
 * Reutiliza el vocabulario de la Fase 0 y no inventa otro. Lo importante son
 * los que dicen que no: una petición mal formada saldrá igual de mal la
 * segunda vez, una política de contenido no cambia de opinión, y reintentar sin
 * saldo es gastar el dinero de alguien dos veces. Ningún nombre de proveedor
 * entra aquí: si hiciera falta un `if` por proveedor, el sitio sería el
 * adaptador, que es quien traduce.
 */
export const esReintentable = (code: WeeErrorCode): boolean =>
  code === 'PROVIDER_UNAVAILABLE'
  || code === 'MODEL_UNAVAILABLE'
  || code === 'PROVIDER_ERROR'
  || code === 'TIMEOUT'
  || code === 'RATE_LIMIT';
