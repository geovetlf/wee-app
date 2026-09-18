import { ActualCost, Budget } from './cost';
import { ORCHESTRATOR_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import { ExecutionHints, FORMA_DE_ETIQUETA_DE_TRAZA, FORMA_DE_ID, esNumero, esObjetoPlano, esTexto, leerTraza, nombreDeCampo } from './gateway';
import { LanguageContext } from './language';
import { TraceContext } from './observability';
import { Modality } from './capability';
import { CoreCapabilityId } from './registry';
import {
  AppliedTransition,
  PreparedWorkflow,
  QualityRequirement,
  RunClosure,
  StepRun,
  StepState,
  WorkflowRun,
  WorkflowStep,
} from './workflow';

/**
 * WEE ORCHESTRATOR — QUIÉN DICE «AHORA ESTO».
 *
 * ── Dónde encaja ────────────────────────────────────────────────────────────
 *
 *   BRAIN entiende → PLANNER planifica → WORKFLOW estructura y gobierna el
 *   estado → ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta →
 *   ADAPTADOR traduce → PROVEEDOR produce
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Mira una ejecución, ve qué puede empezar, lo marca como empezado y entrega
 * un paquete por paso con TODO lo necesario para ejecutarlo menos una cosa:
 * con qué. Después recoge lo que pasó y hace avanzar la ejecución.
 *
 * ── La costura, dicha con precisión ─────────────────────────────────────────
 *
 * `StepDispatch` es un `GatewayRequest` SIN `implementation`. Ese hueco, y
 * solo ese, es el del Router (Fase 7): capacidad, entrada, traza, idioma,
 * clave de idempotencia y opciones ya están; falta el proveedor y el modelo,
 * que aquí no se pueden saber ni elegir. Cuando el Router exista, rellenará
 * el hueco y el Gateway ejecutará. Nada de esto se adelanta.
 *
 * ── Lo que NO hace, y por qué importa ───────────────────────────────────────
 *
 * No ejecuta, no elige proveedor ni modelo, no cobra, no guarda, no reintenta,
 * no espera, no mira el reloj y no aborta nada. Tampoco vuelve a decidir lo
 * que ya decidió el Workflow: los estados, las transiciones válidas, las
 * dependencias, las condiciones, la propagación de un fallo y el cierre son
 * suyos, y AQUÍ SE LE PREGUNTAN. Por eso el motor de la Fase 5 entra como
 * dependencia y no como copia: si hubiera dos máquinas de estados, algún día
 * se contradirían y ganaría el error.
 *
 * ── Y no lleva Tracer, a propósito ──────────────────────────────────────────
 *
 * El Gateway, Brain, el Planner y el Workflow lo llevan porque cada uno
 * termina una operación que hay que anotar. El Orchestrator no ejecuta
 * ninguna: solo dice cuál toca. Lo que hay que anotar es la ejecución de cada
 * paso, y para eso cada despacho baja con su propia traza —hilo, ejecución y
 * paso— y la anota quien de verdad la realiza. Un registro de decisiones que
 * no cuestan nada ensuciaría justo el libro donde se mira lo que sí cuesta.
 */

/* ── Identidad frente a contexto ──────────────────────────────────────────── */

/**
 * QUIÉN PIDE, SEGÚN QUIEN PUEDE SABERLO.
 *
 * Esto NO lo declara el cliente: lo pone la capa de identidad, que es la única
 * que puede afirmarlo. La distinción es toda la seguridad de esta capa: una
 * ejecución lleva dentro un `userId`, pero ese `userId` es un DATO que viajó
 * con ella, no una prueba de quién la está pidiendo ahora. Si se confundieran,
 * mandar la ejecución de otra persona sería suficiente para operar en su
 * nombre.
 *
 * Aquí no se implementa autenticación: se implementa que el contrato no
 * permita confundirlas.
 */
export interface Principal {
  /**
   * La cuenta Weë. UNA sola para todos los productos: quien entra en la app
   * principal y quien entra en una app independiente son la misma cuenta, el
   * mismo saldo y el mismo material.
   */
  userId: string;
  /**
   * Desde qué producto se está pidiendo AHORA. Es contexto, no autoridad, y
   * no decide absolutamente nada: ni el proveedor, ni el modelo, ni el
   * permiso, ni el saldo. Una persona puede continuar desde otro producto y
   * el trabajo sigue siendo el mismo.
   */
  appId?: string;
}

/* ── Lo que se entrega para ejecutar ──────────────────────────────────────── */

/**
 * EL MATERIAL QUE DEJÓ UNA DEPENDENCIA.
 *
 * Referencias, nunca contenido: lo que produjo un paso vive donde viva
 * (Fase 11), y aquí solo se dice de qué paso salió, qué capacidad lo hizo y
 * qué modalidad es. Resolver CUÁL material le toca a cada paso es coordinar;
 * decidir con qué nombre lo espera un adaptador concreto no lo es, y por eso
 * esto viaja aparte de `input` en vez de mezclarse dentro.
 */
export interface UpstreamMaterial {
  stepId: string;
  capability: CoreCapabilityId;
  produces?: Modality;
  outputRefs: readonly string[];
}

/**
 * TODO LO QUE HACE FALTA PARA EJECUTAR UN PASO, MENOS CON QUÉ.
 *
 * Compáralo con `GatewayRequest` y verás que falta exactamente un campo:
 * `implementation`. Ese es el sitio del Router.
 */
export interface StepDispatch {
  runId: string;
  stepId: string;
  capability: CoreCapabilityId;
  /** Para qué está este paso, en una frase. Acaba en el progreso que se ve. */
  purpose: string;
  /** Lo que el plan declaró para este paso. No se toca ni se rellena. */
  input: Readonly<Record<string, unknown>>;
  /** El material de sus dependencias, en el orden del grafo. */
  upstream: readonly UpstreamMaterial[];
  /**
   * El hilo, con la ejecución y el paso ya puestos, y con el `requestId` DE
   * ESTA OPERACIÓN: el contrato de la Fase 0 dice que `traceId` es único por
   * petición de la persona y `requestId` único por operación, y un paso es una
   * operación. Con esto se anota lo que cueste.
   */
  trace: TraceContext;
  language?: LanguageContext;
  /** Lo que acota el resultado, del workflow. Escalares; nunca una implementación. */
  constraints?: Readonly<Record<string, string | number | boolean>>;
  /**
   * La misma operación, la misma clave. Se deriva de la ejecución, el paso y
   * el intento, así que es determinista y no hace falta guardarla: dos
   * servidores que despachen lo mismo producen la misma, y quien ejecute
   * podrá reconocer el duplicado.
   */
  idempotencyKey: string;
  attempt: number;
  /** Cuánto puede tardar. Del paso; quien ejecute aplicará el suyo si no viene. */
  timeoutMs?: number;
  /** Requisitos abstractos del resultado. Nunca una implementación. */
  hints?: ExecutionHints;
  /** Lo que se le exigirá a la salida. Lo evaluará la Fase 14. Se transporta. */
  quality?: QualityRequirement;
  /**
   * El tope aplicable a este paso: lo MÁS RESTRICTIVO entre el suyo y el del
   * workflow, porque el del workflow manda por encima. Cuánto queda del tope
   * del trabajo entero después de lo ya gastado lo sabe quien lleva la cuenta
   * (Fase 9); aquí es una cota superior, no un saldo.
   */
  budget?: Budget;
}

/* ── Lo que se recoge ─────────────────────────────────────────────────────── */

/**
 * CÓMO TERMINÓ UN PASO, o qué decidió una persona sobre él.
 *
 * Es deliberadamente más estrecho que `StepTransition`: quien orquesta informa
 * de lo que PASÓ, no elige a qué estado va. La traducción a estado la hace
 * esta capa contra la tabla del Workflow, que sigue siendo quien decide si esa
 * transición vale.
 */
export type StepOutcomeKind =
  /* Terminó bien y dejó lo que dejó. */
  | 'succeeded'
  /* Terminó con un error ya normalizado. */
  | 'failed'
  /* Se cortó mientras corría. */
  | 'cancelled'
  /* Una persona dijo que sí a un paso que lo requería. */
  | 'approved'
  /* Una persona dijo que no. */
  | 'rejected';

export interface StepOutcome {
  stepId: string;
  kind: StepOutcomeKind;
  /** Cuándo. Lo pone quien llama: aquí no se lee el reloj. */
  at: number;
  /** Al terminar bien: referencias al material producido. */
  outputRefs?: readonly string[];
  /** Al terminar: lo que costó de verdad. Se transporta, no se calcula. */
  actual?: ActualCost;
  /** Obligatorio al fallar. Ya normalizado, sin mensaje crudo ni traza. */
  error?: WeeError;
}

/* ── La decisión ──────────────────────────────────────────────────────────── */

export type OrchestrationStatus =
  /* Hay pasos listos: van marcados como empezados y se entregan para ejecutar. */
  | 'dispatch'
  /* No hay nada que empezar, pero algo sigue en marcha o espera una aprobación. */
  | 'waiting'
  /* La ejecución está pausada: nada nuevo empieza hasta reanudarla. */
  | 'paused'
  /* Se acabó: `done`, `failed` o `cancelled`. El cierre dice cuál y por qué. */
  | 'finished'
  /* La petición no tiene forma, la ejecución no es de este workflow, o quien la hace no es quien dice ser. */
  | 'invalid';

export type OrchestratorWarning =
  /* Se llegó al tope de pasos a la vez: quedan listos sin lanzar. */
  | 'dispatch_capped'
  /* Un paso listo espera aprobación: se marcó, pero no se ejecuta hasta que alguien diga que sí. */
  | 'awaiting_approval';

export interface OrchestratorDecision {
  contract: typeof ORCHESTRATOR_CONTRACT_VERSION;
  status: OrchestrationStatus;
  /**
   * La ejecución después de coordinar. En una consulta, la misma que entró.
   * Ausente cuando la petición no se pudo leer: entonces no hay ninguna
   * ejecución que devolver, y decir que la hay sería mentir en el tipo.
   */
  run?: WorkflowRun;
  /** Lo que hay que ejecutar ahora. Vacío salvo en `dispatch`. */
  dispatch: readonly StepDispatch[];
  /** Pasos que necesitan que una persona diga que sí. Ya marcados, sin ejecutar. */
  approvals: readonly StepDispatch[];
  /**
   * Lo que ya estaba en marcha antes de esta llamada, con su paquete entero.
   *
   * Existe para poder RETOMAR: si el proceso que ejecutaba se cayó, la
   * ejecución guardada tiene pasos en `running` y nadie sabía con qué se
   * lanzaron. Aquí se reconstruye, con la misma clave de idempotencia, para
   * que el Job Engine (Fase 8) decida si los reanuda o los da por perdidos.
   */
  inFlight: readonly StepDispatch[];
  /** Qué sigue en marcha. Sale del cierre del Workflow, no de contar pasos por cuenta propia. */
  waiting: { running: readonly string[]; awaitingApproval: readonly string[] };
  /** Si se puede cerrar y por qué. Lo dice el Workflow, no esta capa. */
  closure: RunClosure;
  /** Lo que el Workflow aplicó, incluida la propagación, con su causa y su instante. */
  applied: readonly AppliedTransition[];
  error?: WeeError;
  trace: TraceContext;
  warnings: readonly OrchestratorWarning[];
}

export interface OrchestratorRequest {
  contract: string;
  /** Quién lo pide de verdad. No es lo que declare la ejecución. */
  principal: Principal;
  run: WorkflowRun;
  /** Cuándo. Aquí no se lee el reloj. */
  at: number;
  /**
   * Cuántos pasos puede haber CORRIENDO A LA VEZ como mucho, contando los que
   * ya estaban. No es el tamaño del lote: si fuera eso, llamar dos veces
   * pondría el doble en vuelo y el tope no serviría para nada.
   */
  maxConcurrent?: number;
}

export interface OutcomeRequest extends OrchestratorRequest {
  outcome: StepOutcome;
}

export interface Orchestrator {
  /** Mira, decide y MARCA: lo listo pasa a empezado y se entrega para ejecutar. */
  avanzar(request: OrchestratorRequest): OrchestratorDecision;
  /** Un paso terminó, o alguien aprobó o rechazó: se anota y la ejecución avanza. */
  informar(request: OutcomeRequest): OrchestratorDecision;
  /** Solo mirar. No cambia nada, y por eso dos servidores pueden hacerlo a la vez. */
  estado(request: OrchestratorRequest): OrchestratorDecision;
  /**
   * Cancelar la ejecución entera, o un solo paso. Lo decide el Workflow; lo
   * que añade esta capa es comprobar que quien cancela es su dueño, que es
   * justo lo que falta si se llama al motor por debajo.
   */
  cancelar(request: OrchestratorRequest & { stepId?: string }): OrchestratorDecision;
  /** Nada nuevo empieza hasta reanudar. Lo que corre termina y se anota. */
  pausar(request: OrchestratorRequest): OrchestratorDecision;
  reanudar(request: OrchestratorRequest): OrchestratorDecision;
}

/* ── Límites ──────────────────────────────────────────────────────────────── */

const MAX_A_LA_VEZ = 256;
const CLAVES_DE_PETICION = ['contract', 'principal', 'run', 'at', 'maxConcurrent', 'outcome', 'stepId'];
const CLAVES_DE_PRINCIPAL = ['userId', 'appId'];
const CLAVES_DE_RESULTADO = ['stepId', 'kind', 'at', 'outputRefs', 'actual', 'error'];
const RESULTADOS: readonly StepOutcomeKind[] = ['succeeded', 'failed', 'cancelled', 'approved', 'rejected'];

/* ── Piezas ───────────────────────────────────────────────────────────────── */

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'orchestrator', { details: { reason, ...extra } });

const TRAZA_VACIA: TraceContext = Object.freeze({ traceId: '', requestId: '', userId: '' });

const CIERRE_VACIO: RunClosure = Object.freeze({
  state: 'open' as const,
  pending: Object.freeze([]),
  active: Object.freeze([]),
  unsatisfied: Object.freeze([]),
});

const VACIO: readonly never[] = Object.freeze([]);

/**
 * LA CLAVE DE IDEMPOTENCIA DE UN PASO.
 *
 * Determinista y derivada: ejecución, paso e intento. El intento va dentro
 * para que un reintento del futuro Job Engine sea una operación NUEVA y no un
 * duplicado que alguien descarte.
 *
 * Va con la LONGITUD de cada parte por delante, y no simplemente separada por
 * dos puntos, porque los dos puntos son legales dentro de un identificador:
 * `run:a` + `b` y `run` + `a:b` daban exactamente la misma clave, y entonces
 * dos operaciones distintas parecían la misma. Con la longitud delante eso no
 * puede pasar.
 *
 * Y tiene la FORMA que el Credit Engine exige a un `requestId`, porque es
 * justo eso lo que va a ser: la identidad de esta operación.
 */
export const claveDePaso = (runId: string, stepId: string, attempt: number): string =>
  `${runId.length}.${runId}:${stepId.length}.${stepId}:${attempt}`;

/**
 * EL TOPE QUE SE LE ENTREGA A UN PASO.
 *
 * El del paso NO sustituye al del workflow: el contrato de la Fase 0 dice que
 * «el del workflow sigue mandando por encima», así que lo que baja es lo MÁS
 * RESTRICTIVO de los dos. Un paso que pidiera más que el trabajo entero no
 * puede ampliarlo por su cuenta.
 *
 * Y lo que el trabajo prefiere —rápido, barato, bueno— sobrevive aunque el
 * paso ponga su propio número: antes se perdía entero al sustituir el objeto.
 *
 * Ojo con lo que esto NO dice: el tope del workflow es del TRABAJO ENTERO, y
 * cuánto queda después de lo ya gastado lo sabe quien lleva la cuenta (Fase
 * 9), no esta capa. Aquí es una cota superior para este paso, nada más.
 */
const presupuestoDe = (step: WorkflowStep, delWorkflow?: Budget): Budget | undefined => {
  const suyo = step.budget;
  if (!suyo && !delWorkflow) return undefined;
  const menor = (a?: number, b?: number): number | undefined => {
    const hay = [a, b].filter((n): n is number => typeof n === 'number');
    return hay.length ? Math.min(...hay) : undefined;
  };
  const maxCredits = menor(suyo?.maxCredits, delWorkflow?.maxCredits);
  const maxUsd = menor(suyo?.maxUsd, delWorkflow?.maxUsd);
  const prefer = suyo?.prefer ?? delWorkflow?.prefer;
  const onExceed = suyo?.onExceed ?? delWorkflow?.onExceed;
  return Object.freeze({
    ...(maxCredits !== undefined ? { maxCredits } : {}),
    ...(maxUsd !== undefined ? { maxUsd } : {}),
    ...(prefer !== undefined ? { prefer } : {}),
    ...(onExceed !== undefined ? { onExceed } : {}),
  });
};

/**
 * LAS PISTAS QUE SE LE ENTREGAN A UN PASO.
 *
 * Se JUNTAN, clave a clave, y la del paso gana donde la haya. Sustituir el
 * objeto entero perdía en silencio lo que el workflow había dicho: un paso
 * que solo fija la calidad se quedaba sin la duración del trabajo.
 */
const pistasDe = (step: WorkflowStep, delWorkflow?: ExecutionHints): ExecutionHints | undefined => {
  if (!step.hints && !delWorkflow) return undefined;
  const juntas = { ...delWorkflow, ...step.hints };
  const limpias = Object.fromEntries(Object.entries(juntas).filter(([, v]) => v !== undefined));
  return Object.keys(limpias).length ? Object.freeze(limpias) as ExecutionHints : undefined;
};

/* ── Lectura de la petición ───────────────────────────────────────────────── */

type Invalida = { ok: false; error: WeeError };
const invalida = (field: string, reason = 'invalid_request', code: WeeErrorCode = 'INVALID_REQUEST'): Invalida =>
  ({ ok: false, error: fallo(code, reason, { field }) });

const leerPrincipal = (crudo: unknown): { ok: true; principal: Principal } | Invalida => {
  if (!esObjetoPlano(crudo)) return invalida('principal');
  for (const clave of Object.keys(crudo)) {
    if (!CLAVES_DE_PRINCIPAL.includes(clave)) return invalida(`principal.${nombreDeCampo(clave)}`);
  }
  if (!esTexto(crudo.userId) || !FORMA_DE_ID.test(crudo.userId)) return invalida('principal.userId');
  if (crudo.appId !== undefined && (!esTexto(crudo.appId) || !FORMA_DE_ETIQUETA_DE_TRAZA.test(crudo.appId))) return invalida('principal.appId');
  return { ok: true, principal: Object.freeze({ userId: crudo.userId, ...(crudo.appId !== undefined ? { appId: crudo.appId } : {}) }) };
};

const leerResultado = (crudo: unknown): { ok: true; outcome: StepOutcome } | Invalida => {
  if (!esObjetoPlano(crudo)) return invalida('outcome');
  for (const clave of Object.keys(crudo)) {
    if (!CLAVES_DE_RESULTADO.includes(clave)) return invalida(`outcome.${nombreDeCampo(clave)}`);
  }
  if (!esTexto(crudo.stepId) || !FORMA_DE_ETIQUETA_DE_TRAZA.test(crudo.stepId)) return invalida('outcome.stepId');
  if (!esTexto(crudo.kind) || !RESULTADOS.includes(crudo.kind as StepOutcomeKind)) return invalida('outcome.kind');
  if (!esNumero(crudo.at) || crudo.at < 0) return invalida('outcome.at');
  const kind = crudo.kind as StepOutcomeKind;
  /*
   * Lo que acompaña a cada desenlace se exige aquí, y lo que no toca se
   * rechaza en vez de ignorarse. El CONTENIDO de `error`, `outputRefs` y
   * `actual` lo revisa el Workflow con sus propios lectores cuando se le
   * pasa la transición: no se duplica esa validación, se delega.
   */
  if (kind === 'failed' && crudo.error === undefined) return invalida('outcome.error');
  if (kind !== 'failed' && crudo.error !== undefined) return invalida('outcome.error');
  if (kind !== 'succeeded' && crudo.outputRefs !== undefined) return invalida('outcome.outputRefs');
  if (crudo.actual !== undefined && kind !== 'succeeded' && kind !== 'failed' && kind !== 'cancelled') return invalida('outcome.actual');
  return { ok: true, outcome: crudo as unknown as StepOutcome };
};

/* ── El coordinador ───────────────────────────────────────────────────────── */

/**
 * EL ORCHESTRATOR, SOBRE UN WORKFLOW YA PREPARADO.
 *
 * El motor de la Fase 5 entra como dependencia: es quien sabe qué está listo,
 * qué transición vale y cuándo se acabó. Aquí no se reimplementa ninguna de
 * esas tres cosas, se le preguntan.
 *
 * Sin estado, sin reloj, sin temporizadores y sin memoria: recibe una
 * ejecución y devuelve otra. Dos servidores pueden coordinar la misma sin
 * ponerse de acuerdo, porque quien intente empezar un paso ya empezado se lo
 * encontrará rechazado por la máquina de estados.
 */
export const crearOrchestrator = (prepared: PreparedWorkflow): Orchestrator => {
  const workflow = prepared.workflow;
  /*
   * La posición de cada paso, calculada UNA vez. Buscar con `find` en cada
   * consulta parecía inocente y no lo era: se consulta por cada paso listo y
   * por cada dependencia suya, así que en un workflow largo el coste crecía
   * con el cuadrado.
   */
  const posicion = new Map(workflow.steps.map((s, i) => [s.id, i]));
  const pasoDe = (id: string): WorkflowStep | undefined => {
    const i = posicion.get(id);
    return i === undefined ? undefined : workflow.steps[i];
  };
  /* El id más largo del workflow: con él se sabe de antemano si alguna clave no cabría. */
  const idMasLargo = workflow.steps.reduce((n, s) => Math.max(n, s.id.length), 0);

  /** Una ejecución LEÍDA: sus pasos indexados y su hilo ya validado. Se lee una vez y se usa esa. */
  interface Leida {
    run: WorkflowRun;
    trace: TraceContext;
    porPaso: ReadonlyMap<string, StepRun>;
  }

  const runDe = (leida: Leida, id: string): StepRun | undefined => leida.porPaso.get(id);

  /** El material que dejaron las dependencias de un paso, EN EL ORDEN DEL GRAFO. */
  const materialDe = (leida: Leida, step: WorkflowStep): readonly UpstreamMaterial[] => {
    const material: UpstreamMaterial[] = [];
    /*
     * Ordenado por posición en el workflow y no por cómo se escribió
     * `dependsOn`: el mismo plan tiene que dar el mismo material en el mismo
     * orden, y el orden de una lista escrita a mano no es una propiedad del
     * grafo.
     */
    const deps = [...(step.dependsOn ?? [])].sort((a, b) => (posicion.get(a) ?? 0) - (posicion.get(b) ?? 0));
    for (const id of deps) {
      const r = runDe(leida, id);
      const s = pasoDe(id);
      if (!r || !s || !r.outputRefs?.length) continue;
      material.push(Object.freeze({
        stepId: id,
        capability: s.capability,
        ...(s.produces ? { produces: s.produces } : {}),
        /* Copiado: el despacho es una instantánea y no comparte lista con la ejecución. */
        outputRefs: Object.freeze([...r.outputRefs]),
      }));
    }
    return Object.freeze(material);
  };

  /** El paquete de un paso, listo para que el Router le ponga el «con qué». */
  const despachoDe = (leida: Leida, step: WorkflowStep, attempt: number): StepDispatch => {
    const clave = claveDePaso(leida.run.id, step.id, attempt);
    const budget = presupuestoDe(step, workflow.budget);
    const hints = pistasDe(step, workflow.hints);
    return Object.freeze({
      runId: leida.run.id,
      stepId: step.id,
      capability: step.capability,
      purpose: step.purpose,
      input: Object.freeze({ ...(step.input ?? {}) }),
      upstream: materialDe(leida, step),
      /*
       * El hilo, reconstruido desde la LECTURA validada —no desde el objeto
       * crudo— y con el `requestId` DE ESTA OPERACIÓN. El contrato de la Fase
       * 0 dice que `traceId` es único por petición de la persona y
       * `requestId` único por operación; un paso es una operación, y darles a
       * todos el mismo `requestId` hacía que el Credit Engine viera cobros
       * duplicados donde había trabajos distintos.
       */
      trace: Object.freeze({ ...leida.trace, requestId: clave, runId: leida.run.id, stepId: step.id }),
      ...(workflow.language ? { language: workflow.language } : {}),
      ...(workflow.constraints ? { constraints: workflow.constraints } : {}),
      idempotencyKey: clave,
      attempt,
      ...(step.timeoutMs !== undefined ? { timeoutMs: step.timeoutMs } : {}),
      ...(hints ? { hints } : {}),
      ...(step.quality ? { quality: step.quality } : {}),
      ...(budget ? { budget } : {}),
    });
  };

  const decidir = (
    leida: Leida,
    extra: Partial<OrchestratorDecision> = {},
  ): OrchestratorDecision => {
    const cierre = prepared.cierre(leida.run);
    /*
     * Lo que está en marcha sale del CIERRE del Workflow, que es quien lo
     * sabe. Contarlo aquí leyendo `run.steps` era una segunda proyección del
     * estado, y llegó a informar como «corriendo» pasos que el Workflow ni
     * siquiera reconocía.
     */
    const activos = cierre.active;
    const espera = Object.freeze({
      running: Object.freeze(activos.filter((id) => runDe(leida, id)?.state === 'running')),
      awaitingApproval: Object.freeze(activos.filter((id) => runDe(leida, id)?.state === 'awaiting_approval')),
    });
    const dispatch = extra.dispatch ?? VACIO;
    const status: OrchestrationStatus = dispatch.length ? 'dispatch'
      : cierre.state !== 'open' ? 'finished'
        : leida.run.state === 'paused' ? 'paused'
          : 'waiting';
    return Object.freeze({
      contract: ORCHESTRATOR_CONTRACT_VERSION,
      status,
      run: leida.run,
      dispatch,
      approvals: VACIO,
      inFlight: Object.freeze(activos.map((id) => {
        const s = pasoDe(id) as WorkflowStep;
        const r = runDe(leida, id) as StepRun;
        return despachoDe(leida, s, r.state === 'awaiting_approval' ? r.attempt + 1 : r.attempt);
      })),
      waiting: espera,
      closure: cierre,
      applied: VACIO,
      trace: leida.trace,
      warnings: VACIO,
      ...extra,
    });
  };

  const rechazar = (error: WeeError, trace: TraceContext = TRAZA_VACIA): OrchestratorDecision => Object.freeze({
    contract: ORCHESTRATOR_CONTRACT_VERSION,
    status: 'invalid' as const,
    dispatch: VACIO,
    approvals: VACIO,
    inFlight: VACIO,
    waiting: Object.freeze({ running: VACIO, awaitingApproval: VACIO }),
    closure: CIERRE_VACIO,
    applied: VACIO,
    error,
    trace,
    warnings: VACIO,
  });

  /**
   * LA PETICIÓN, LEÍDA, Y LA EJECUCIÓN CON ELLA.
   *
   * Se lee TODO una vez y se usa esa lectura: el hilo, los pasos, el dueño.
   * Releer el objeto de entrada en cada sitio dejaba una ventana por la que
   * lo comprobado y lo usado podían ser cosas distintas.
   *
   * El orden de las comprobaciones importa: primero que la petición tenga
   * forma, después QUIÉN es —para no contar nada de una ejecución ajena— y
   * solo entonces si esa ejecución es de este workflow.
   */
  const leer = (request: unknown, conResultado: boolean): { ok: true; leida: Leida; at: number; max: number } | Invalida => {
    if (!esObjetoPlano(request)) return invalida('request');
    for (const clave of Object.keys(request)) {
      if (!CLAVES_DE_PETICION.includes(clave)) return invalida(nombreDeCampo(clave));
      if (!conResultado && clave === 'outcome') return invalida('outcome');
    }
    if (!esTexto(request.contract) || !contratoCompatible(request.contract, ORCHESTRATOR_CONTRACT_VERSION)) {
      return invalida('contract', 'contract_incompatible');
    }
    const principal = leerPrincipal(request.principal);
    if (!principal.ok) return principal;
    if (!esNumero(request.at) || request.at < 0) return invalida('at');
    if (request.maxConcurrent !== undefined && (!esNumero(request.maxConcurrent) || request.maxConcurrent < 1 || !Number.isInteger(request.maxConcurrent))) {
      return invalida('maxConcurrent');
    }

    const run = request.run as WorkflowRun;
    if (!esObjetoPlano(run) || !esTexto(run.id) || !esTexto(run.workflowId) || !esTexto(run.userId)) return invalida('run');
    /*
     * Los pasos, comprobados ANTES de tocarlos. Que no fueran una lista hacía
     * que un `TypeError` escapara de una capa que es pura y síncrona, o sea
     * que quien llamara se llevaba una excepción en vez de una respuesta.
     */
    if (!Array.isArray(run.steps)) return invalida('run.steps');
    for (const r of run.steps) {
      if (!esObjetoPlano(r) || !esTexto(r.stepId)) return invalida('run.steps');
    }
    /*
     * Y el hilo, leído con el lector del Core. Antes viajaba crudo hasta el
     * despacho: una traza con `apiKey`, `stack` o `__proto__` llegaba entera
     * al paquete que baja al Router y al Gateway.
     */
    const trace = leerTraza(run);
    if (!trace) return invalida('run.trace');

    /* QUIÉN, antes que nada de la ejecución: de una ajena no se cuenta ni que esté rota. */
    if (run.userId !== principal.principal.userId || trace.userId !== principal.principal.userId) {
      return invalida('principal.userId', 'not_owner', 'AUTH_ERROR');
    }
    if (run.workflowId !== workflow.id) return invalida('run.workflowId', 'inconsistent');
    /*
     * Y si es de ESTE workflow, se lo preguntamos al motor. `listos` y
     * `cierre` degradan en silencio cuando no reconocen una ejecución —no
     * tienen canal de error—, así que sin esto una ejecución que el motor
     * repudia se contestaba como «tranquilo, sigue en marcha» y quien
     * coordinara esperaría para siempre. El discriminador es exacto: para una
     * ejecución reconocida, `open` con nada pendiente y nada activo no ocurre.
     */
    const cierre = prepared.cierre(run);
    if (cierre.state === 'open' && !cierre.pending.length && !cierre.active.length) return invalida('run', 'inconsistent');
    /* Y que la clave de cada operación quepa donde tiene que caber. */
    if (!FORMA_DE_ID.test(claveDePaso(run.id, 'x'.repeat(idMasLargo), 1))) return invalida('run.id', 'id_too_long');

    return {
      ok: true,
      leida: { run, trace, porPaso: new Map(run.steps.map((r) => [r.stepId, r])) },
      at: request.at,
      max: Math.min(request.maxConcurrent ?? MAX_A_LA_VEZ, MAX_A_LA_VEZ),
    };
  };

  /** Una lectura nueva sobre la misma petición, para la ejecución que acaba de salir del motor. */
  const releer = (anterior: Leida, run: WorkflowRun): Leida =>
    ({ run, trace: anterior.trace, porPaso: new Map(run.steps.map((r) => [r.stepId, r])) });

  /* ── Mirar ─────────────────────────────────────────────────────────────── */

  const estado = (request: OrchestratorRequest): OrchestratorDecision => {
    const leida = leer(request, false);
    return leida.ok ? decidir(leida.leida) : rechazar(leida.error);
  };

  /* ── Coordinar ─────────────────────────────────────────────────────────── */

  const avanzar = (request: OrchestratorRequest): OrchestratorDecision => {
    const leido = leer(request, false);
    if (!leido.ok) return rechazar(leido.error);
    const { at, max } = leido;
    let leida = leido.leida;

    const listos = prepared.listos(leida.run);
    if (!listos.length) return decidir(leida);

    /*
     * El tope cuenta lo que YA está corriendo, no el tamaño del lote. Si
     * contara el lote, llamar cinco veces con un tope de dos pondría diez
     * pasos en vuelo y el tope no serviría para nada.
     */
    const enVuelo = leida.run.steps.filter((r) => r.state === 'running').length;
    const hueco = Math.max(0, max - enVuelo);
    const warnings: OrchestratorWarning[] = [];
    /* El orden es el del workflow, que es el que ya usa el motor: el tope corta, no reordena. */
    const elegidos = listos.slice(0, hueco);
    if (listos.length > elegidos.length) warnings.push('dispatch_capped');

    const dispatch: StepDispatch[] = [];
    const approvals: StepDispatch[] = [];
    const applied: AppliedTransition[] = [];
    for (const step of elegidos) {
      /*
       * Marcar y entregar, en ese orden. El paso pasa a `running` —o a
       * `awaiting_approval` si lo requiere— ANTES de entregarse, y el que
       * haga la transición primero gana: así dos coordinadores sobre la
       * misma ejecución no despachan el mismo trabajo dos veces. Quien lo
       * impide es la máquina de estados de la Fase 5, no un candado de aquí.
       */
      const destino: StepState = step.requiresApproval ? 'awaiting_approval' : 'running';
      const t = prepared.transitar(leida.run, { stepId: step.id, to: destino, at });
      /* Si el motor lo rechaza, no es un fallo de la petición: es que ese paso ya no estaba libre. Se sigue con los demás. */
      if (!t.ok) continue;
      leida = releer(leida, t.run);
      applied.push(...t.transitions);
      const marcado = runDe(leida, step.id) as StepRun;
      /*
       * Un paquete que espera aprobación describe la operación que VA A
       * correr, no una que corrió: por eso lleva el intento que tendrá, no el
       * que tiene ahora —esperar no consume ninguno—. Así la clave de
       * idempotencia es la MISMA antes y después de que alguien diga que sí.
       */
      const paquete = despachoDe(leida, step, destino === 'awaiting_approval' ? marcado.attempt + 1 : marcado.attempt);
      if (destino === 'awaiting_approval') approvals.push(paquete);
      else dispatch.push(paquete);
    }
    if (approvals.length) warnings.push('awaiting_approval');

    /*
     * El `status` NO se fuerza: lo deduce `decidir` de lo que hay. Pasarlo
     * como `undefined` para «que lo calcule él» lo pisaba con `undefined`,
     * porque un spread con la clave presente gana aunque su valor no exista.
     */
    return decidir(leida, {
      dispatch: Object.freeze(dispatch),
      approvals: Object.freeze(approvals),
      applied: Object.freeze(applied),
      warnings: Object.freeze(warnings),
    });
  };

  /* ── Recoger ───────────────────────────────────────────────────────────── */

  /** De lo que PASÓ al estado al que va. La tabla del Workflow decide si vale. */
  const transicionDe = (outcome: StepOutcome): { to: StepState; extra: Record<string, unknown> } => {
    switch (outcome.kind) {
      case 'succeeded':
        return { to: 'done', extra: { ...(outcome.outputRefs !== undefined ? { outputRefs: outcome.outputRefs } : {}), ...(outcome.actual !== undefined ? { actual: outcome.actual } : {}) } };
      case 'failed':
        return { to: 'failed', extra: { error: outcome.error, ...(outcome.actual !== undefined ? { actual: outcome.actual } : {}) } };
      case 'cancelled':
        return { to: 'cancelled', extra: { ...(outcome.actual !== undefined ? { actual: outcome.actual } : {}) } };
      /* Aprobar es dejar empezar lo que ya estaba esperando: no es un estado nuevo. */
      case 'approved':
        return { to: 'running', extra: {} };
      /* Rechazar es cancelar. La CAUSA la deriva el Workflow de que venía esperando: no se le impone. */
      default:
        return { to: 'cancelled', extra: {} };
    }
  };

  const informar = (request: OutcomeRequest): OrchestratorDecision => {
    const leido = leer(request, true);
    if (!leido.ok) return rechazar(leido.error);
    const leida = leido.leida;
    const resultado = leerResultado((request as { outcome?: unknown }).outcome);
    if (!resultado.ok) return rechazar(resultado.error, leida.trace);
    const { outcome } = resultado;

    const suyo = runDe(leida, outcome.stepId);
    if (!suyo) return rechazar(fallo('INVALID_REQUEST', 'unknown_step', { field: 'outcome.stepId' }), leida.trace);
    /* Aprobar o rechazar solo tiene sentido sobre algo que está esperando: si no, se dice, en vez de traducirlo a otra cosa. */
    if ((outcome.kind === 'approved' || outcome.kind === 'rejected') && suyo.state !== 'awaiting_approval') {
      return rechazar(fallo('INVALID_REQUEST', 'not_awaiting_approval', { field: 'outcome.kind', stepId: outcome.stepId, state: suyo.state }), leida.trace);
    }

    const { to, extra } = transicionDe(outcome);
    const t = prepared.transitar(leida.run, { stepId: outcome.stepId, to, at: outcome.at, ...extra } as never);
    if (!t.ok) return rechazar(t.error, leida.trace);
    const despues = releer(leida, t.run);

    /* Aprobado es empezar: se entrega el paquete, igual que en un despacho normal. */
    const dispatch: StepDispatch[] = [];
    if (outcome.kind === 'approved') {
      const step = pasoDe(outcome.stepId);
      const ahora = runDe(despues, outcome.stepId);
      if (step && ahora) dispatch.push(despachoDe(despues, step, ahora.attempt));
    }

    return decidir(despues, { dispatch: Object.freeze(dispatch), applied: Object.freeze([...t.transitions]) });
  };

  /* ── Cancelar, pausar, reanudar: del Workflow, con el dueño comprobado ──── */

  const cancelar = (request: OrchestratorRequest & { stepId?: string }): OrchestratorDecision => {
    const leido = leer(request, false);
    if (!leido.ok) return rechazar(leido.error);
    const stepId = (request as { stepId?: unknown }).stepId;
    if (stepId !== undefined && (!esTexto(stepId) || !runDe(leido.leida, stepId))) {
      return rechazar(fallo('INVALID_REQUEST', 'unknown_step', { field: 'stepId' }), leido.leida.trace);
    }
    const t = prepared.cancelar(leido.leida.run, leido.at, stepId as string | undefined);
    if (!t.ok) return rechazar(t.error, leido.leida.trace);
    return decidir(releer(leido.leida, t.run), { applied: Object.freeze([...t.transitions]) });
  };

  const pausarOReanudar = (request: OrchestratorRequest, cual: 'pausar' | 'reanudar'): OrchestratorDecision => {
    const leido = leer(request, false);
    if (!leido.ok) return rechazar(leido.error);
    const r = cual === 'pausar' ? prepared.pausar(leido.leida.run) : prepared.reanudar(leido.leida.run);
    if (!r.ok) return rechazar(r.error, leido.leida.trace);
    return decidir(releer(leido.leida, r.run));
  };

  return Object.freeze({
    avanzar,
    informar,
    estado,
    cancelar,
    pausar: (request: OrchestratorRequest) => pausarOReanudar(request, 'pausar'),
    reanudar: (request: OrchestratorRequest) => pausarOReanudar(request, 'reanudar'),
  });
};
