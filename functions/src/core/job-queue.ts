import { FORMA_DE_ETIQUETA_DE_TRAZA, esNumero, esObjetoPlano, esTexto } from './gateway';
import { AttemptReport, Job, JobCapacity, JobDispatch, JobLimits } from './job';

/**
 * WEE JOB ENGINE — LA COLA Y EL TRABAJADOR. LOS PUERTOS, Y SOLO LOS PUERTOS.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * El Job Engine (Fase 8, `job.ts`) ya sabe todo lo que hace falta para que
 * varios trabajadores compitan por un trabajo sin ejecutarlo dos veces:
 * concesiones con dueño, revisión para el compare-and-set, `marcarEnvio` antes
 * de salir hacia el proveedor, recuperación que CIERRA el intento muerto y
 * numera uno nuevo, y el desenlace `unknown` que impide el reintento ciego. Lo
 * que dejó sin nombrar es por dónde LLEGA el trabajo al trabajador. Su postura
 * fue «la cola ES el almacén con `availableAt`», y sigue siendo válida: se puede
 * servir todo Weë barriendo el almacén.
 *
 * Pero el día que haya una cola de verdad —la que sea— tiene que poder
 * enchufarse sin tocar el trabajo, el almacén, el Workflow ni el Orchestrator.
 * Eso son estos puertos.
 *
 * ── La regla, en seis líneas ────────────────────────────────────────────────
 *
 *     JobStore = la VERDAD del trabajo
 *     Queue    = transporte: avisa de que hay algo que mirar
 *     Worker   = ejecución
 *     Router   = elige con qué
 *     Gateway  = ejecuta contra el adaptador
 *     Provider = el de fuera
 *
 * Y ninguna hace el trabajo de otra.
 *
 * ── Un mensaje es un AVISO, no un trabajo ───────────────────────────────────
 *
 * Por la cola viaja el identificador del trabajo y tres datos de transporte.
 * Nada más, y por dos motivos. El primero: si el mensaje llevara el trabajo,
 * habría dos copias y la de la cola sería siempre la vieja. El segundo es de
 * seguridad: una cola es un sitio por el que puede entrar algo que Weë no
 * escribió. Un mensaje que NO PUEDE llevar proveedor, modelo, cuenta, entidad,
 * coste ni Credits no puede falsearlos: el trabajador lee el trabajo del
 * almacén, y lo que ejecuta sale de ahí. Lo peor que consigue un mensaje
 * inventado es que alguien mire un identificador que no existe.
 *
 * ── Lo que NO hay aquí ──────────────────────────────────────────────────────
 *
 * Ninguna cola. Ni en memoria: una cola en memoria dentro del código de
 * producción es un `Array` haciéndose pasar por infraestructura, y el día que
 * haya dos procesos deja de serlo. La de las pruebas vive en las pruebas.
 * Tampoco hay planificador, ni trabajadores permanentes, ni escalado: hay la
 * forma que tendrán que cumplir.
 */

export const JOB_QUEUE_CONTRACT_VERSION = '1.0' as const;

/* ── El mensaje ───────────────────────────────────────────────────────────── */

/** Por qué se avisó. Observabilidad; ninguna decisión depende de esto. */
export type MotivoDeEncolado = 'created' | 'retry' | 'recovered' | 'requeued';

export const MOTIVOS_DE_ENCOLADO: readonly MotivoDeEncolado[] = Object.freeze(['created', 'retry', 'recovered', 'requeued'] as const);

export interface QueueMessage {
  contract: typeof JOB_QUEUE_CONTRACT_VERSION;
  jobId: string;
  /** Cuándo se avisó. Para medir cuánto esperó en la cola. */
  enqueuedAt: number;
  reason: MotivoDeEncolado;
  /**
   * NO ANTES DE. Una PISTA para el transporte, copiada de `availableAt` al
   * encolar. No es la verdad: quien decide si ya toca es `reclamar`, contra el
   * trabajo guardado. Un transporte que la ignore no rompe nada; solo entrega
   * antes de tiempo algo que se le devolverá.
   */
  notBefore?: number;
}

/**
 * EL IDENTIFICADOR DE UN TRABAJO, TAL COMO EL JOB ENGINE LOS PRODUCE.
 *
 * El alfabeto es el de `FORMA_DE_ID` y el largo es el tope que el propio motor
 * declara para un trabajo: 400. Hoy ninguno llega —al crear, el motor exige que
 * la clave de proveedor derivada quepa en 160, así que un identificador pasa
 * poco de 140—, pero este lector NO PUEDE ser más estricto que quien crea. Si lo
 * fuera, el día que el motor admitiera uno más largo su aviso se tiraría como
 * «veneno», el barrido lo volvería a encolar para volver a tirarlo, y ese
 * trabajo no se ejecutaría nunca sin que nada fallara a la vista.
 *
 * Y una consecuencia que conviene saber: ese identificador derivado LLEVA DENTRO
 * la cuenta. No es autoridad —quién actúa se lee del trabajo guardado, nunca se
 * deduce del identificador—, pero sí es un dato que viajará por los registros de
 * la cola que se enchufe. Quien no lo quiera ahí da su propio `jobId` al crear.
 */
export const FORMA_DE_ID_DE_TRABAJO_EN_COLA = /^[A-Za-z0-9_.:-]{4,400}$/;

/** TODO lo que un mensaje puede llevar. Cualquier otra clave lo invalida entero. */
export const CAMPOS_DE_MENSAJE_DE_COLA: readonly string[] = Object.freeze(['contract', 'jobId', 'enqueuedAt', 'reason', 'notBefore']);

export type MensajeLeido =
  | { ok: true; mensaje: QueueMessage }
  | { ok: false; code: 'malformed' | 'unknown_field' | 'unsupported_contract' | 'invalid_job_id' | 'invalid_field'; field?: string };

/**
 * Lee lo que llegó por la cola como lo que es: algo de fuera.
 *
 * Estricto a propósito. `providerId`, `modelId`, `accountId`, `entityId`,
 * `cost` o `credits` en un mensaje no son un campo de más: son un intento de
 * decirle al trabajador qué ejecutar, a nombre de quién y cuánto cuesta. El
 * mensaje se rechaza entero, y el resultado es un objeto NUEVO construido campo
 * a campo: nada de lo que traía la entrada llega a nadie.
 */
export const leerMensajeDeCola = (v: unknown): MensajeLeido => {
  if (!esObjetoPlano(v)) return { ok: false, code: 'malformed' };
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return { ok: false, code: 'malformed' };
  for (const clave of Object.keys(v)) {
    if (!CAMPOS_DE_MENSAJE_DE_COLA.includes(clave)) return { ok: false, code: 'unknown_field', field: clave.slice(0, 40) };
  }
  const propio = (k: string): unknown => (Object.prototype.hasOwnProperty.call(v, k) ? v[k] : undefined);
  if (propio('contract') !== JOB_QUEUE_CONTRACT_VERSION) return { ok: false, code: 'unsupported_contract', field: 'contract' };
  const jobId = propio('jobId');
  if (!esTexto(jobId) || !FORMA_DE_ID_DE_TRABAJO_EN_COLA.test(jobId)) return { ok: false, code: 'invalid_job_id', field: 'jobId' };
  const enqueuedAt = propio('enqueuedAt');
  if (!esNumero(enqueuedAt) || enqueuedAt < 0) return { ok: false, code: 'invalid_field', field: 'enqueuedAt' };
  const reason = propio('reason');
  if (!esTexto(reason) || !(MOTIVOS_DE_ENCOLADO as readonly string[]).includes(reason)) return { ok: false, code: 'invalid_field', field: 'reason' };
  const notBefore = propio('notBefore');
  if (notBefore !== undefined && (!esNumero(notBefore) || notBefore < 0)) return { ok: false, code: 'invalid_field', field: 'notBefore' };
  return {
    ok: true,
    mensaje: Object.freeze({
      contract: JOB_QUEUE_CONTRACT_VERSION, jobId, enqueuedAt, reason: reason as MotivoDeEncolado,
      ...(notBefore !== undefined ? { notBefore } : {}),
    }),
  };
};

/**
 * El aviso de un trabajo, construido SOLO a partir del trabajo guardado.
 * Es la única forma de hacer un mensaje: no hay otra que acepte datos sueltos.
 */
export const mensajeDeCola = (job: Pick<Job, 'jobId' | 'availableAt'>, at: number, reason: MotivoDeEncolado): QueueMessage =>
  Object.freeze({
    contract: JOB_QUEUE_CONTRACT_VERSION,
    jobId: job.jobId,
    enqueuedAt: at,
    reason,
    ...(job.availableAt > at ? { notBefore: job.availableAt } : {}),
  });

/* ── El puerto de la cola ─────────────────────────────────────────────────── */

/** Un mensaje en la mano de un trabajador. Puede ser la segunda vez que se entrega. */
export interface QueueDelivery {
  /** El recibo de ESTA entrega. Con él se confirma o se devuelve; no identifica al trabajo. */
  deliveryId: string;
  /** Tal cual llegó: sin leer todavía. Quien lo recibe lo pasa por `leerMensajeDeCola`. */
  message: unknown;
  /** Cuántas veces se ha entregado este mensaje, contando esta. 1 la primera. */
  deliveryCount: number;
  receivedAt: number;
}

/**
 * LA COLA. Transporta avisos y no sabe nada más.
 *
 * No conoce proveedores, ni el Router, ni el Gateway, ni Credits: no tiene por
 * dónde. Lo ÚNICO que promete es «al menos una vez», y eso significa que puede
 * entregar dos veces, a dos trabajadores, o después de que el trabajo terminó.
 * No es un defecto que haya que esconder: es la promesa que cualquier cola real
 * puede cumplir, y todo lo demás —que no se ejecute dos veces, que no se cobre
 * dos veces— lo garantiza el trabajo guardado, no ella.
 *
 * `exactly_once` no existe, igual que en los eventos del Core.
 */
export interface QueuePort {
  readonly guarantee: 'at_least_once';
  enqueue(message: QueueMessage): Promise<void>;
  /**
   * Coge uno, si lo hay, y lo esconde de los demás durante `visibilityMs`. Si en
   * ese tiempo no se confirma ni se devuelve —el trabajador se murió—, vuelve a
   * entregarse solo. `undefined` = ahora no hay nada.
   */
  claim(options: { worker: string; at: number; visibilityMs: number }): Promise<QueueDelivery | undefined>;
  /** Visto: no volver a entregar. */
  ack(deliveryId: string): Promise<void>;
  /** No pude, o todavía no toca: devolver, opcionalmente para más tarde. */
  nack(deliveryId: string, options?: { delayMs?: number }): Promise<void>;
}

/* ── El contrato del trabajador ───────────────────────────────────────────── */

/**
 * LO QUE EJECUTA. El único puerto del trabajador que toca el mundo.
 *
 * Recibe el paquete que el Job Engine armó DESDE EL TRABAJO GUARDADO —nunca
 * desde el mensaje— y cuenta cómo terminó. Para una operación de IA, quien lo
 * implemente será la composición Router → Gateway; para una tarea general, otro
 * ejecutor. Este contrato no sabe cuál es, y así tiene que seguir.
 *
 * `renovar` es el «sigo vivo»: una ejecución larga lo llama antes de que caduque
 * su concesión. Si devuelve `false`, la concesión ya no es suya —se la llevó la
 * recuperación— y lo honesto es parar: lo que termine ya no podrá informarlo.
 */
export interface JobExecutor {
  ejecutar(dispatch: JobDispatch, control: { renovar(): Promise<boolean> }): Promise<AttemptReport>;
}

/** Cuánto hay en marcha, para que `reclamar` pueda decir «no cabe». Lo cuenta quien guarda. */
export interface ContadorDeCapacidad {
  capacidad(job: Job): Promise<JobCapacity | undefined>;
}

/** Con qué identidad y con qué topes trabaja un trabajador. Sin estado: todo esto es configuración. */
export interface WorkerConfig {
  /** Opaco. Ni nombre de máquina, ni región: lo que el Job Engine guarda como dueño de la concesión. */
  worker: string;
  /** Los topes. Ausente = no se comprueba, y `reclamar` avisa de que no se comprobó. */
  limits?: JobLimits;
  /** Cuánto esconde la cola un mensaje mientras se atiende. */
  visibilityMs: number;
  /** Cuánto esperar antes de volver a mirar algo que no cabía. */
  backpressureDelayMs: number;
}

export const workerValido = (c: WorkerConfig | undefined): boolean =>
  !!c && esTexto(c.worker) && FORMA_DE_ETIQUETA_DE_TRAZA.test(c.worker)
  && esNumero(c.visibilityMs) && c.visibilityMs > 0
  && esNumero(c.backpressureDelayMs) && c.backpressureDelayMs >= 0;

/**
 * QUÉ PASÓ CON UNA ENTREGA. Una palabra, y los campos para seguirle la pista.
 *
 *   executed   se ejecutó y se informó.
 *   skipped    no había nada que hacer: ya terminó, lo tiene otro a punto de
 *              acabar, se agotaron los intentos. Una entrega repetida cae aquí.
 *   deferred   todavía no toca, no cabe, o lo tiene otro: vuelve más tarde.
 *   dropped    el mensaje no vale o el trabajo no existe. No se reintenta: un
 *              mensaje venenoso que vuelve siempre es una cola parada.
 *   lost       otro trabajador ganó la carrera, o la concesión se perdió por el
 *              camino. No es un error: es el compare-and-set funcionando.
 */
export type DesenlaceDeEntrega = 'executed' | 'skipped' | 'deferred' | 'dropped' | 'lost';

export interface ResultadoDeEntrega {
  outcome: DesenlaceDeEntrega;
  /** Por qué, en una palabra. Diagnóstico, no bifurcación. */
  detail: string;
  deliveryId: string;
  deliveryCount: number;
  jobId?: string;
  attemptId?: string;
  attempt?: number;
  worker: string;
  /** La cuenta dueña del trabajo, leída del almacén. Para atribuir, nunca del mensaje. */
  accountId?: string;
  requestId?: string;
  traceId?: string;
  operationId?: string;
  appId?: string;
  /** Cuándo se encoló, cuándo se recibió, cuándo empezó y acabó la ejecución. */
  enqueuedAt?: number;
  receivedAt: number;
  startedAt?: number;
  endedAt?: number;
  /** Cuánto esperó en la cola y cuánto tardó en ejecutarse. */
  queueLatencyMs?: number;
  executionMs?: number;
  /** Cómo acabó el intento, y en qué estado quedó el trabajo. */
  attemptOutcome?: AttemptReport['outcome'];
  jobState?: Job['state'];
  /** Si se volvió a encolar, para cuándo. */
  requeuedFor?: number;
  errorCode?: string;
}
