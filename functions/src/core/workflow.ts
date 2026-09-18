import { Modality } from './capability';
import { ActualCost, Budget, CostEstimate } from './cost';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import { PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { CAPABILITY_CATALOG, CoreCapabilityId } from './registry';
import {
  ExecutionHints,
  FORMA_DE_ETIQUETA_DE_TRAZA,
  FORMA_DE_ID,
  claveProhibida,
  esNumero,
  esObjetoPlano,
  esTexto,
  leerHints,
  leerIdioma,
  leerTraza,
  nombreDeCampo,
} from './gateway';
import { BrainIntent, INTENCIONES } from './brain';
import { Plan, PlanWarning, claveDeImplementacion } from './planner';
import { LanguageContext } from './language';
import { OperationTrace, TraceContext, Tracer, trazaLimpia } from './observability';

/**
 * WEE CORE — WORKFLOW. El contrato (Fase 0) y el motor (Fase 5).
 *
 * ── Lo que había, dicho sin adornos ─────────────────────────────────────────
 *
 * Un `while` dentro del propio callable (`creator/index.ts:355-464`). Ejecuta un
 * paso cada vez, respeta `dependsOn` y nada más:
 *
 *   · sin paralelismo — tres imágenes independientes se hacen en fila;
 *   · sin reintento de paso — cualquier fallo reembolsa el trabajo ENTERO;
 *   · sin reanudación — si se agotan los 900 s, el trabajo queda en `running`
 *     para siempre y una segunda llamada la rechaza como duplicada;
 *   · `cancelled` está declarado en el tipo y no se escribe nunca.
 *
 * Funciona para planes de cuatro pasos. No llega a «genera un anuncio de quince
 * segundos»: eso son doce pasos, varios paralelos, con material intermedio que
 * hay que conservar aunque uno falle.
 *
 * ── Qué hace este archivo, y qué NO ─────────────────────────────────────────
 *
 * La Fase 0 declaró la FORMA de un workflow. La Fase 5 añade el MOTOR: cómo un
 * plan se convierte en workflow, qué estados tiene cada paso, qué transiciones
 * valen, cómo se propaga un fallo y cuándo se puede dar por cerrado.
 *
 * Sigue sin ejecutar nada, sin tocar Firestore y sin sustituir al `while`
 * actual. Quien ejecute será el Orchestrator (Fase 6); quien elija con qué, el
 * Router (Fase 7); quien persista y reanude, el Job Engine (Fase 8). Este
 * archivo les da la estructura y el estado; no hace su trabajo.
 *
 *   BRAIN entiende → PLANNER planifica → WORKFLOW estructura y gobierna el
 *   estado → ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta
 *
 * ── Una decisión que conviene entender ──────────────────────────────────────
 *
 * El paralelismo NO se declara: se DEDUCE de `dependsOn`. Dos pasos sin
 * dependencia entre ellos pueden ir a la vez, y punto. Un campo `parallel: true`
 * sería una segunda fuente de verdad que puede contradecir al grafo, y cuando se
 * contradigan ganará el bug.
 *
 * Lo mismo con «listo»: no es un estado que se guarde, es lo que se deduce de
 * un paso pendiente cuyas dependencias terminaron. Guardarlo sería tener dos
 * verdades sobre lo mismo.
 */

/* ── El contrato (Fase 0) ─────────────────────────────────────────────────── */

/** Qué hacer cuando un paso falla. Por defecto, lo de hoy: cae todo. */
export type StepFailurePolicy =
  /* El trabajo entero falla. Es el comportamiento actual. */
  | 'fail_workflow'
  /* Se salta y los que dependían de él también. El resto sigue. */
  | 'skip_dependents'
  /* Se continúa sin él: era opcional. */
  | 'continue';

export interface RetryPolicy {
  /** Cuántas veces reintentar ESTE paso. 0 = ninguna, que es lo de hoy. */
  maxAttempts: number;
  /** Espera inicial entre intentos, en ms. Se dobla en cada intento. */
  backoffMs?: number;
  /** Solo reintentar estos fallos. Vacío = los que `sePuedeReintentarConOtro` permita. */
  onlyOn?: readonly WeeError['code'][];
}

/**
 * La condición que decide si un paso corre.
 *
 * Deliberadamente NO es una expresión ni un trocito de código: es una referencia
 * a una salida anterior y una comprobación cerrada. Un lenguaje de expresiones
 * dentro del workflow es una puerta trasera para ejecutar cualquier cosa, y un
 * plan lo puede escribir un modelo.
 */
export interface StepCondition {
  /** Paso cuya salida se mira. */
  stepId: string;
  check: 'succeeded' | 'failed' | 'produced_output' | 'skipped';
}

/** Lo que se le exige a la salida de un paso para darla por buena. */
export interface QualityRequirement {
  /** Mínimo aceptable, 0–1. Lo evaluará el Quality Engine de la Fase 14. */
  minScore?: number;
  /** Qué mirar: que se parezca a lo pedido, que sea coherente con los otros pasos… */
  checks?: readonly ('prompt_adherence' | 'consistency' | 'technical' | 'brand')[];
  /** Si no llega al mínimo: reintentar, aceptar igualmente, o fallar. */
  onBelow?: 'regenerate' | 'accept' | 'fail';
}

/**
 * UN PASO.
 *
 * Extiende lo que ya existe (`PlanStep`: id, capability, purpose, dependsOn,
 * input) con lo que le falta para ser profesional. Todo lo añadido es OPCIONAL:
 * un plan de hoy es un workflow válido de mañana sin tocar una línea.
 */
export interface WorkflowStep {
  id: string;
  /**
   * Del CATÁLOGO, como el plan del que sale. Es un ensanchamiento compatible:
   * `CapabilityId` está contenida por construcción, y así un paso puede nombrar
   * una capacidad declarada que todavía no tiene matriz. Que no se pueda servir
   * lo dirá el Router cuando toque, que es donde se debe saber.
   */
  capability: CoreCapabilityId;
  /** Para qué está este paso, en una frase. Va al progreso que ve la persona. */
  purpose: string;
  /** Pasos que deben terminar antes. Vacío o ausente = puede empezar ya. */
  dependsOn?: readonly string[];
  input?: Record<string, unknown>;
  /** Solo corre si se cumple. Ausente = corre siempre. */
  when?: StepCondition;
  retry?: RetryPolicy;
  onFailure?: StepFailurePolicy;
  timeoutMs?: number;
  /** Este paso necesita que una persona diga que sí antes de seguir. */
  requiresApproval?: boolean;
  quality?: QualityRequirement;
  /** Tope propio de este paso. El del workflow sigue mandando por encima. */
  budget?: Budget;
  /** Qué deja disponible este paso. Viene del plan, que lo leyó del catálogo. (Fase 5) */
  produces?: Modality;
  /** Requisitos abstractos del resultado. Nunca una implementación. (Fase 5) */
  hints?: ExecutionHints;
}

export type StepState =
  | 'pending'
  | 'blocked'
  | 'running'
  | 'awaiting_approval'
  | 'done'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/**
 * POR QUÉ UN PASO ESTÁ COMO ESTÁ, cuando no fue por su propia ejecución.
 *
 * Un paso bloqueado porque su dependencia falló no es un paso fallido, y un
 * paso cancelado porque el workflow entero se vino abajo no es lo mismo que uno
 * cancelado a petición. La causa conserva esa diferencia, y `stepId` señala
 * siempre al paso RAÍZ —el que falló o se canceló de verdad—, no al vecino.
 */
export type StepCauseReason =
  | 'dependency_failed'
  | 'dependency_cancelled'
  | 'condition_not_met'
  | 'workflow_failed'
  | 'workflow_cancelled'
  | 'cancelled_by_request'
  | 'approval_rejected';

export interface StepCause {
  reason: StepCauseReason;
  /** El paso que lo decidió, si lo hubo. */
  stepId?: string;
}

/** Lo que se sabe de un paso mientras corre y cuando termina. */
export interface StepRun {
  stepId: string;
  state: StepState;
  attempt: number;
  estimate?: CostEstimate;
  actual?: ActualCost;
  error?: WeeError;
  /** Referencia al material que produjo. El contenido vive en el Asset Engine. */
  outputRefs?: readonly string[];
  startedAt?: number;
  finishedAt?: number;
  /** Por qué quedó bloqueado, saltado o cancelado. (Fase 5) */
  cause?: StepCause;
}

/**
 * Lo que hay que saber DEL WORKFLOW. Viaja dentro de él y se guarda con él,
 * así que aquí solo cabe lo que sigue siendo cierto mañana.
 */
export type WorkflowWarning =
  /* El plan se hizo con una confianza que no da para prometer nada. */
  | 'low_confidence'
  /* El plan traía suposiciones; van en el workflow y se ven. */
  | 'assumptions_carried';

/**
 * Y lo que hay que saber de la OPERACIÓN de construirlo, que es otra cosa: que
 * no se pudiera anotar la traza no es una propiedad del workflow. Tenerlos en
 * un solo tipo hacía que `Workflow.warnings` admitiera un valor que su propio
 * lector rechazaba. Lo encontró la auditoría.
 */
export type WorkflowResponseWarning = WorkflowWarning | 'trace_not_recorded';

/**
 * UN WORKFLOW.
 *
 * `version` va dentro porque un trabajo puede tardar y quedarse a medias: cuando
 * se reanude, quien lo lea tiene que saber con qué reglas se escribió. Un
 * workflow guardado es un dato con vida propia, no una variable de la ejecución.
 *
 * Los campos de la Fase 5 son todos opcionales y vienen del plan: el workflow
 * es el plan más lo que hace falta para gobernar su ejecución. `planId` es una
 * referencia; lo demás se copia porque el workflow tiene que poder ejecutarse
 * sin ir a buscar el plan.
 */
export interface Workflow {
  id: string;
  contract: typeof WORKFLOW_CONTRACT_VERSION;
  /** Qué quiere conseguir la persona, en sus palabras. */
  goal: string;
  /** Workplace desde el que se pidió: 'design', 'studio'… */
  workplace?: string;
  steps: readonly WorkflowStep[];
  /** Tope del trabajo entero. Manda sobre el de cada paso. */
  budget?: Budget;
  /** Lo que se le cuenta a la persona de lo que se va a hacer. */
  explainToUser?: string;
  metadata?: Record<string, unknown>;
  /** El plan del que salió. (Fase 5) */
  planId?: string;
  intent?: BrainIntent;
  projectId?: string;
  language?: LanguageContext;
  /** Lo que acota el resultado. Escalares que vinieron del entendimiento. */
  constraints?: Readonly<Record<string, string | number | boolean>>;
  hints?: ExecutionHints;
  /** Lo que se dio por supuesto. Viaja explícito desde el plan. */
  assumptions?: readonly string[];
  warnings?: readonly WorkflowWarning[];
}

export type RunState = 'pending' | 'running' | 'paused' | 'awaiting_approval' | 'done' | 'failed' | 'cancelled';

/**
 * Por qué una ejecución terminó como terminó, cuando no fue bien. Señala el
 * paso RAÍZ: si lo que quedó sin hacer fue un paso bloqueado, la causa es el
 * que falló o se canceló antes, no el bloqueado.
 *
 * Solo dos, y son las dos que se producen. Hubo un tercero —`step_cancelled`,
 * para una cancelación arrastrada— y la auditoría demostró que no ocurría
 * nunca: una cancelación que arrastra otro paso lo deja `blocked`, y la que
 * viene de un fallo deja la ejecución en `failed`. Un valor declarado que no
 * se produce es una promesa que alguien programará y nunca verá cumplirse.
 */
export type RunCauseReason = 'step_failed' | 'cancelled_by_request';

export interface RunCause {
  reason: RunCauseReason;
  stepId?: string;
}

/**
 * UNA EJECUCIÓN.
 *
 * Separada del workflow a propósito: el mismo plan puede correr dos veces, y hoy
 * no puede porque el estado vive mezclado dentro del trabajo. Separarlos es lo
 * que permite reanudar, repetir un paso o comparar dos intentos.
 *
 * `cursor` es lo que hoy solo existe en la memoria del proceso, y por eso un
 * `creatorRun` que agota su tiempo no se puede retomar: nadie sabía por dónde
 * iba. Persistirlo es la diferencia entre reanudar y volver a empezar.
 */
export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;
  state: RunState;
  steps: readonly StepRun[];
  /** Pasos corriendo ahora mismo. Más de uno cuando hay paralelismo. */
  cursor?: readonly string[];
  estimatedCredits?: number;
  chargedCredits?: number;
  error?: WeeError;
  startedAt?: number;
  finishedAt?: number;
  /** Con qué reglas se escribió. (Fase 5) */
  contract?: typeof WORKFLOW_CONTRACT_VERSION;
  /** El hilo de la petición que lo lanzó: de aquí sale la traza de cada paso. (Fase 5) */
  trace?: TraceContext;
  /** Qué lo decidió, cuando terminó mal. (Fase 5) */
  cause?: RunCause;
}

/**
 * QUÉ PASOS PUEDEN CORRER AHORA.
 *
 * El corazón del planificador de ejecución, y una función pura: entra el
 * workflow y lo hecho, salen los pasos listos. Sin E/S, sin proveedores, sin
 * reloj — se prueba con una tabla de casos.
 *
 * Devuelve una LISTA, no un paso. Ahí está toda la diferencia con el `while` de
 * hoy: el motor de la Fase 5 podrá lanzar los que vengan juntos, y mientras
 * tanto quien quiera seguir yendo de uno en uno coge el primero y se comporta
 * exactamente igual que ahora.
 */
export const pasosListos = (workflow: Workflow, runs: readonly StepRun[]): readonly WorkflowStep[] => {
  const estado = new Map(runs.map((r) => [r.stepId, r.state]));
  const terminado = (id: string) => {
    const s = estado.get(id);
    return s === 'done' || s === 'skipped';
  };
  return workflow.steps.filter((step) => {
    const suyo = estado.get(step.id) ?? 'pending';
    if (suyo !== 'pending' && suyo !== 'blocked') return false;
    return (step.dependsOn ?? []).every(terminado);
  });
};

/**
 * ¿Se acabó?
 *
 * Terminado no es «todos hechos»: es que no queda nada que pueda avanzar. Un
 * paso bloqueado para siempre porque su dependencia falló también cuenta, y
 * confundirlo con «sigue corriendo» es como se quedan trabajos colgados.
 */
export const ejecucionTerminada = (workflow: Workflow, runs: readonly StepRun[]): boolean => {
  if (pasosListos(workflow, runs).length > 0) return false;
  const estado = new Map(runs.map((r) => [r.stepId, r.state]));
  return !workflow.steps.some((s) => {
    const e = estado.get(s.id) ?? 'pending';
    return e === 'running' || e === 'awaiting_approval';
  });
};

/**
 * ¿Tiene sentido el grafo?
 *
 * Un plan lo puede escribir un modelo, y un modelo puede inventarse una
 * dependencia a un paso que no existe o cerrar un ciclo. Eso no se descubre
 * ejecutando: se descubre antes de cobrar nada.
 */
export const validarWorkflow = (workflow: Workflow): readonly string[] => {
  const problemas: string[] = [];
  const ids = new Set<string>();
  for (const s of workflow.steps) {
    if (ids.has(s.id)) problemas.push(`paso repetido: ${s.id}`);
    ids.add(s.id);
  }
  for (const s of workflow.steps) {
    for (const dep of s.dependsOn ?? []) {
      if (!ids.has(dep)) problemas.push(`${s.id} depende de un paso que no existe: ${dep}`);
    }
    if (s.when && !ids.has(s.when.stepId)) {
      problemas.push(`${s.id} se condiciona a un paso que no existe: ${s.when.stepId}`);
    }
  }
  /* Ciclos: se van quitando los que ya no dependen de nadie pendiente. Lo que
   * sobra al final es, por definición, un ciclo. */
  const pendientes = new Map(workflow.steps.map((s) => [s.id, new Set(s.dependsOn ?? [])]));
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const [id, deps] of pendientes) {
      if ([...deps].every((d) => !pendientes.has(d))) {
        pendientes.delete(id);
        cambio = true;
      }
    }
  }
  if (pendientes.size) problemas.push(`hay un ciclo entre: ${[...pendientes.keys()].join(', ')}`);
  return problemas;
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  EL MOTOR (Fase 5)
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ── La máquina de estados ────────────────────────────────────────────────── */

/**
 * QUÉ TRANSICIONES EXISTEN. Es una tabla y no un `switch` para que se pueda
 * leer entera de un vistazo y probar como una tabla.
 *
 *   pending ──▶ running ──▶ done
 *      │            │  └───▶ failed
 *      │            └──────▶ cancelled
 *      ├─▶ awaiting_approval ──▶ running | cancelled
 *      ├─▶ blocked      (una dependencia falló o se canceló)
 *      ├─▶ skipped      (su condición no se cumplió, o su dependencia falló y la política dice saltar)
 *      └─▶ cancelled    (a petición, o porque el workflow entero cayó)
 *
 * `blocked`, `done`, `failed`, `skipped` y `cancelled` son finales. Un paso
 * fallido no vuelve a `running` desde aquí: reintentar un paso ya terminado es
 * reanudar, y eso es del Job Engine (Fase 8), que traerá su propia operación
 * cuando exista. Añadirla será una línea en esta tabla.
 */
const TRANSICIONES: Readonly<Record<StepState, readonly StepState[]>> = {
  pending: ['running', 'awaiting_approval', 'blocked', 'skipped', 'cancelled'],
  awaiting_approval: ['running', 'cancelled'],
  running: ['done', 'failed', 'cancelled'],
  blocked: [],
  done: [],
  failed: [],
  skipped: [],
  cancelled: [],
};

/**
 * Las que puede PEDIR quien orquesta. `blocked` y `skipped` las decide el
 * motor por propagación: nadie las pide, se derivan del estado de otro paso.
 */
const POR_PETICION: readonly StepState[] = ['running', 'awaiting_approval', 'done', 'failed', 'cancelled'];

const FINALES: readonly StepState[] = ['blocked', 'done', 'failed', 'skipped', 'cancelled'];

/*
 * `hasOwnProperty` y no `TRANSICIONES[from]`: un estado leído de donde se
 * guardó puede llamarse `constructor`, y entonces el índice devuelve una
 * función del prototipo en vez de `undefined`, el `?? []` no salta y
 * `.includes` revienta. Es público, así que tiene que aguantar cualquier
 * cadena.
 */
export const puedeTransitar = (from: StepState, to: StepState): boolean =>
  Object.prototype.hasOwnProperty.call(TRANSICIONES, from) && TRANSICIONES[from].includes(to);

export const esEstadoFinal = (state: StepState): boolean => FINALES.includes(state);

/** Una causa, congelada al nacer: el mismo objeto viaja en el paso, en la transición y en el resumen. */
const causa = (reason: StepCauseReason, stepId?: string): StepCause =>
  Object.freeze(stepId === undefined ? { reason } : { reason, stepId });

const RUN_FINALES: readonly RunState[] = ['done', 'failed', 'cancelled'];

/* ── Formas ───────────────────────────────────────────────────────────────── */

export interface WorkflowRequest {
  contract: string;
  trace: TraceContext;
  plan: Plan;
  /** Identificadores propios, si quien llama ya los tiene. Sin ellos, se derivan de la traza. */
  ids?: { workflowId?: string };
}

export type WorkflowBuildStatus = 'ready' | 'invalid' | 'failed';

export interface WorkflowResponse {
  contract: typeof WORKFLOW_CONTRACT_VERSION;
  status: WorkflowBuildStatus;
  workflow?: Workflow;
  error?: WeeError;
  trace: TraceContext;
  timing: { startedAt: number; finishedAt: number };
  warnings: readonly WorkflowResponseWarning[];
}

/** Lo que quien orquesta le cuenta al motor: a qué estado pasa un paso, y con qué. */
export interface StepTransition {
  stepId: string;
  to: StepState;
  /** Cuándo. Lo pone quien llama: el motor no lee el reloj. */
  at: number;
  /** Obligatorio al fallar. Nunca lleva mensaje crudo ni traza. */
  error?: WeeError;
  /** Al terminar bien: referencias al material producido. */
  outputRefs?: readonly string[];
  /** Al terminar: lo que costó de verdad. Se transporta, no se calcula. */
  actual?: ActualCost;
  /** Al cancelar a petición: por qué. */
  cause?: StepCause;
}

/** Una transición ya aplicada. Las propagadas las decidió el motor, no quien pidió. */
export interface AppliedTransition {
  stepId: string;
  from: StepState;
  to: StepState;
  at: number;
  cause?: StepCause;
  propagated: boolean;
}

export type TransitionResult =
  | {
      ok: true;
      run: WorkflowRun;
      transitions: readonly AppliedTransition[];
      /** Pasos que quedaron listos POR esta transición. Un subconjunto de `listos(run)`, sin recorrer el grafo entero. */
      nowReady: readonly string[];
    }
  | { ok: false; error: WeeError };

export type RunResult = { ok: true; run: WorkflowRun } | { ok: false; error: WeeError };

/**
 * ¿SE PUEDE CERRAR?
 *
 * `open` mientras quede algo que pueda avanzar. Cuando no queda nada, el estado
 * final no es «todos hechos»: es si lo OBLIGATORIO quedó hecho. Un paso
 * obligatorio fallido, bloqueado o saltado por un fallo deja el workflow en
 * `failed` con la causa raíz; uno cancelado lo deja en `cancelled`.
 */
export interface RunClosure {
  state: 'open' | RunState;
  cause?: RunCause;
  /** Pasos obligatorios que todavía no terminaron. */
  pending: readonly string[];
  /** Pasos corriendo o esperando aprobación. */
  active: readonly string[];
  /** Pasos obligatorios que terminaron sin cumplir. */
  unsatisfied: readonly string[];
}

/** Cuántos pasos hay en cada estado, más los que están listos, que no es un estado sino una deducción. */
export type RunSummary = Readonly<Record<StepState | 'ready', readonly string[]>>;

/**
 * UN WORKFLOW PREPARADO PARA GOBERNAR EJECUCIONES.
 *
 * Es el workflow más un índice —posición de cada paso, quién depende de quién,
 * quién se condiciona a quién— calculado UNA vez. Con él, una transición cuesta
 * lo que toca a ese paso y a sus dependientes, no recorrer el grafo entero.
 *
 * No guarda ninguna ejecución: cada operación recibe el `run` y devuelve otro.
 * Dos preparaciones del mismo workflow son intercambiables.
 */
export interface PreparedWorkflow {
  workflow: Workflow;
  /** Una ejecución nueva, con todos los pasos pendientes. */
  iniciar(trace: TraceContext, ids?: { runId?: string }): RunResult;
  /** Los pasos que pueden empezar ahora. Deducido, nunca guardado. */
  listos(run: WorkflowRun): readonly WorkflowStep[];
  /** Un paso cambia de estado; el motor propaga lo que toque y devuelve la ejecución nueva. */
  transitar(run: WorkflowRun, transition: StepTransition): TransitionResult;
  /** Cancelar la ejecución entera, o un solo paso. Lo que ya corre sigue hasta que quien lo corre informe. */
  cancelar(run: WorkflowRun, at: number, stepId?: string): TransitionResult;
  /** Nada nuevo empieza hasta reanudar. Lo que corre termina y se anota. */
  pausar(run: WorkflowRun): RunResult;
  reanudar(run: WorkflowRun): RunResult;
  cierre(run: WorkflowRun): RunClosure;
  resumen(run: WorkflowRun): RunSummary;
  /** La traza con la que un paso baja al Router y al Gateway: el hilo de la petición más el run y el paso. */
  trazaDelPaso(run: WorkflowRun, stepId: string): TraceContext | undefined;
}

export type PrepareResult = { ok: true; prepared: PreparedWorkflow } | { ok: false; error: WeeError };

export interface WorkflowEnginePorts {
  /** Obligatorio, como en el Gateway, Brain y el Planner: lo que va a costar dinero deja rastro. */
  tracer: Tracer;
  now: () => number;
}

export interface WorkflowEngine {
  /** De un plan a un workflow. Valida, copia, anota. */
  construir(request: WorkflowRequest): Promise<WorkflowResponse>;
  /** De un workflow —recién construido o leído de donde se guardó— a algo que gobierna ejecuciones. */
  preparar(workflow: Workflow): PrepareResult;
}

/* ── Límites ──────────────────────────────────────────────────────────────── */

/**
 * Acotado a propósito: un workflow es una estructura que se guarda, se copia y
 * se recorre, y todo eso tiene que caber. Mil pasos son órdenes de magnitud
 * más que cualquier plan de hoy; el día que no basten, es un número.
 */
const MAX_PASOS = 1_000;
const MAX_DEPENDENCIAS = 256;
const MAX_REFERENCIAS = 256;
const MAX_TEXTO = 4_000;
const MAX_LISTA = 256;
const MAX_PROFUNDIDAD = 8;
const MAX_CLAVES = 256;
const MAX_ELEMENTOS = 1_024;
const MAX_DATOS_BYTES = 2 * 1024 * 1024;

const CLAVES_DE_PETICION = ['contract', 'trace', 'plan', 'ids'];
const CLAVES_DE_PLAN = ['id', 'contract', 'goal', 'intent', 'steps', 'capabilities', 'language', 'workplace', 'projectId', 'constraints', 'hints', 'explainToUser', 'assumptions', 'warnings'];
const CLAVES_DE_PASO_DE_PLAN = ['id', 'capability', 'purpose', 'dependsOn', 'input', 'produces', 'hints'];
const CLAVES_DE_WORKFLOW = ['id', 'contract', 'goal', 'workplace', 'steps', 'budget', 'explainToUser', 'metadata', 'planId', 'intent', 'projectId', 'language', 'constraints', 'hints', 'assumptions', 'warnings'];
const CLAVES_DE_PASO = ['id', 'capability', 'purpose', 'dependsOn', 'input', 'when', 'retry', 'onFailure', 'timeoutMs', 'requiresApproval', 'quality', 'budget', 'produces', 'hints'];
const CLAVES_DE_TRANSICION = ['stepId', 'to', 'at', 'error', 'outputRefs', 'actual', 'cause'];
const CLAVES_DE_PRESUPUESTO = ['maxCredits', 'maxUsd', 'prefer', 'onExceed'];
const CLAVES_DE_REINTENTO = ['maxAttempts', 'backoffMs', 'onlyOn'];
const CLAVES_DE_CALIDAD = ['minScore', 'checks', 'onBelow'];
const CLAVES_DE_ERROR = ['code', 'source', 'providerCode', 'details'];
const POLITICAS: readonly StepFailurePolicy[] = ['fail_workflow', 'skip_dependents', 'continue'];
const PREFERENCIAS: readonly string[] = ['quality', 'speed', 'cost'];
const AL_EXCEDER: readonly string[] = ['fail', 'degrade'];
const COMPROBACIONES_DE_CALIDAD: readonly string[] = ['prompt_adherence', 'consistency', 'technical', 'brand'];
const AL_NO_LLEGAR: readonly string[] = ['regenerate', 'accept', 'fail'];
const ESTADOS_DE_PASO: readonly StepState[] = ['pending', 'blocked', 'running', 'awaiting_approval', 'done', 'failed', 'skipped', 'cancelled'];
const COMPROBACIONES: readonly StepCondition['check'][] = ['succeeded', 'failed', 'produced_output', 'skipped'];
const AVISOS_DEL_PLAN: readonly WorkflowWarning[] = ['low_confidence', 'assumptions_carried'];
const CAUSAS_POR_PETICION: readonly StepCauseReason[] = ['cancelled_by_request', 'approval_rejected'];
/**
 * Un id de paso acaba en `TraceContext.stepId`, así que tiene la forma que la
 * traza exige y no otra: la misma expresión, importada, para que no deriven.
 * Lo mismo vale para el id del workflow y el de la ejecución, que acaban en
 * `runId`. `FORMA_DE_ID` (la del Credit Engine) queda para el id del plan,
 * que es del Planner.
 */
const FORMA_DE_ETIQUETA = FORMA_DE_ETIQUETA_DE_TRAZA;

/** El catálogo, como conjunto: se consulta por cada paso y la lista es larga. */
const CATALOGO = new Map(CAPABILITY_CATALOG.map((c) => [c.id, c]));

/* ── Lectura de datos ─────────────────────────────────────────────────────── */

type Fallo = { ok: false; field: string; reason: string };
type Lectura<T> = { ok: true; valor: T } | Fallo;

const invalido = (field: string, reason = 'invalid_request'): Fallo => ({ ok: false, field, reason });

/** Un objeto de DATOS: literal o de JSON. Ni una fecha, ni un mapa, ni una instancia de nada. */
const esObjetoDeDatos = (v: unknown): v is Record<string, unknown> => {
  if (!esObjetoPlano(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Las claves con las que viaja lo que la persona escribió. La lista de la
 * Fase 0 las prohíbe EN LAS TRAZAS —un registro no lleva texto de nadie—,
 * pero en el `input` de un paso son suyas de pleno derecho: un paso que
 * genera texto entra con un `prompt`. Lo que sigue sin caber en un input son
 * las credenciales y las claves con las que un objeto deja de ser un objeto.
 */
const CLAVES_DE_CONTENIDO = ['prompt', 'message', 'content'];
/**
 * Y las que delatan de dónde vino un fallo. No están en la lista de la Fase 0
 * porque allí se prohíbe lo que es SECRETO; estas no lo son, pero un `stack`
 * lleva rutas del servidor y un `message` el texto crudo del proveedor, y los
 * dos acaban en un registro que alguien pega en un chat de soporte.
 */
const CLAVES_DE_DIAGNOSTICO = ['stack', 'trace', 'stacktrace', 'errormessage'];
const claveProhibidaEnDatos = (clave: string, paraTraza: boolean): boolean => {
  const normal = clave.toLowerCase().replace(/[-_]/g, '');
  if (paraTraza && CLAVES_DE_DIAGNOSTICO.includes(normal)) return true;
  return claveProhibida(clave) && (paraTraza || !CLAVES_DE_CONTENIDO.includes(clave.toLowerCase()));
};

/**
 * REVISAR DATOS QUE BAJAN HACIA LA EJECUCIÓN.
 *
 * `input`, `metadata`, `constraints`: todo lo que un paso lleva consigo hacia
 * el Router y el Gateway. Se rechaza, no se sanea: quitar una clave en silencio
 * daría un paso distinto del que se pidió sin que nadie se enterase.
 *
 *   · ninguna clave prohibida (`__proto__`, credenciales; y en lo que va a
 *     una traza, tampoco contenido);
 *   · ninguna clave de implementación: un `providerId` dentro de `input` es
 *     una orden de usar tal proveedor disfrazada de dato;
 *   · solo escalares, listas y objetos de datos, con profundidad y tamaño
 *     acotados. Ni funciones, ni símbolos, ni instancias.
 */
const revisarDatos = (valor: unknown, campo: string, paraTraza: boolean, profundidad = 0): Lectura<unknown> => {
  if (valor === null || valor === undefined) return { ok: true, valor };
  if (esTexto(valor)) return { ok: true, valor };
  if (typeof valor === 'number') return Number.isFinite(valor) ? { ok: true, valor } : invalido(campo);
  if (typeof valor === 'boolean') return { ok: true, valor };
  if (profundidad >= MAX_PROFUNDIDAD) return invalido(campo, 'too_deep');
  if (Array.isArray(valor)) {
    if (valor.length > MAX_ELEMENTOS) return invalido(campo, 'too_large');
    const copia: unknown[] = [];
    for (let i = 0; i < valor.length; i++) {
      const r = revisarDatos(valor[i], `${campo}[${i}]`, paraTraza, profundidad + 1);
      if (!r.ok) return r;
      copia.push(r.valor);
    }
    return { ok: true, valor: Object.freeze(copia) };
  }
  if (esObjetoDeDatos(valor)) {
    /*
     * UNA sola lectura por propiedad, y la copia se construye AQUÍ. Revisar el
     * original y copiarlo después son dos lecturas, y entre las dos un getter
     * o un Proxy puede devolver cosas distintas: se aprobaba una cosa y
     * viajaba otra, con `providerId` dentro. Lo encontró la auditoría.
     *
     * Se cierra con `fromEntries`, que DEFINE las propiedades en vez de
     * asignarlas: aunque la revisión ya rechazó `__proto__`, la garantía no
     * depende de que esa lista esté completa.
     */
    const entradas = Object.entries(valor);
    if (entradas.length > MAX_CLAVES) return invalido(campo, 'too_large');
    const pares: [string, unknown][] = [];
    for (const [clave, v] of entradas) {
      const nombre = `${campo}.${nombreDeCampo(clave)}`;
      if (claveProhibidaEnDatos(clave, paraTraza)) return invalido(nombre);
      if (claveDeImplementacion(clave)) return invalido(nombre, 'implementation_not_allowed');
      const r = revisarDatos(v, nombre, paraTraza, profundidad + 1);
      if (!r.ok) return r;
      if (r.valor !== undefined) pares.push([clave, r.valor]);
    }
    return { ok: true, valor: Object.freeze(Object.fromEntries(pares)) };
  }
  return invalido(campo);
};

/**
 * COPIAR DATOS YA REVISADOS.
 *
 * Copia profunda y CONGELADA: el workflow y la ejecución son instantáneas, y
 * nada de lo que devuelve el motor comparte un objeto con lo que recibió. Se
 * crea con `fromEntries`, que define propiedades en vez de asignarlas: aunque
 * la revisión ya rechazó `__proto__`, la garantía no depende de ella.
 */
const copiar = <T>(valor: T, profundidad = 0): T => {
  /* La cota es la misma que la de la revisión, y está aquí para que copiar nunca pueda desbordar la pila por su cuenta. */
  if (profundidad > MAX_PROFUNDIDAD + 4) return undefined as unknown as T;
  if (Array.isArray(valor)) return Object.freeze(valor.map((v) => copiar(v, profundidad + 1))) as unknown as T;
  if (esObjetoDeDatos(valor)) {
    return Object.freeze(Object.fromEntries(Object.entries(valor).filter(([, v]) => v !== undefined).map(([k, v]) => [k, copiar(v, profundidad + 1)]))) as T;
  }
  return valor;
};

const tamañoDe = (valor: unknown): number => {
  try {
    return JSON.stringify(valor)?.length ?? 0;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

/** `paraTraza`: los metadatos acaban en resultados y registros; el input de un paso, en el proveedor. La regla no es la misma. */
const leerDatos = (crudo: unknown, campo: string, paraTraza: boolean): Lectura<Record<string, unknown> | undefined> => {
  if (crudo === undefined) return { ok: true, valor: undefined };
  if (!esObjetoDeDatos(crudo)) return invalido(campo);
  const r = revisarDatos(crudo, campo, paraTraza);
  if (!r.ok) return r;
  /* Se mide lo REVISADO, que es lo que se va a guardar, no el original. */
  if (tamañoDe(r.valor) > MAX_DATOS_BYTES) return invalido(campo, 'too_large');
  return { ok: true, valor: r.valor as Record<string, unknown> };
};

const leerTextoCorto = (crudo: unknown, campo: string, obligatorio: boolean): Lectura<string | undefined> => {
  if (crudo === undefined) return obligatorio ? invalido(campo) : { ok: true, valor: undefined };
  if (!esTexto(crudo) || (obligatorio && !crudo.trim()) || crudo.length > MAX_TEXTO) return invalido(campo);
  return { ok: true, valor: crudo };
};

const leerEtiqueta = (crudo: unknown, campo: string): Lectura<string | undefined> => {
  if (crudo === undefined) return { ok: true, valor: undefined };
  if (!esTexto(crudo) || !FORMA_DE_ETIQUETA.test(crudo)) return invalido(campo);
  return { ok: true, valor: crudo };
};

const leerListaDeTextos = (crudo: unknown, campo: string, forma?: RegExp, max = MAX_LISTA): Lectura<readonly string[] | undefined> => {
  if (crudo === undefined) return { ok: true, valor: undefined };
  if (!Array.isArray(crudo) || crudo.length > max) return invalido(campo);
  for (let i = 0; i < crudo.length; i++) {
    const v = crudo[i];
    if (!esTexto(v) || v.length > MAX_TEXTO || (forma && !forma.test(v))) return invalido(`${campo}[${i}]`);
  }
  return { ok: true, valor: Object.freeze([...(crudo as string[])]) };
};

/** Escalares que acotan el resultado. Sin implementación y sin las claves con las que un objeto deja de serlo. */
const leerRestricciones = (crudo: unknown, campo: string): Lectura<Readonly<Record<string, string | number | boolean>> | undefined> => {
  if (crudo === undefined) return { ok: true, valor: undefined };
  if (!esObjetoDeDatos(crudo)) return invalido(campo);
  /* Una sola lectura, y la copia se construye con ella: ver `revisarDatos`. */
  const entradas = Object.entries(crudo);
  if (entradas.length > MAX_CLAVES) return invalido(campo, 'too_large');
  const pares: [string, string | number | boolean][] = [];
  for (const [clave, v] of entradas) {
    const nombre = `${campo}.${nombreDeCampo(clave)}`;
    if (claveDeImplementacion(clave)) return invalido(nombre, 'implementation_not_allowed');
    if (claveProhibida(clave)) return invalido(nombre);
    if (!(esTexto(v) && v.length <= MAX_TEXTO) && !esNumero(v) && typeof v !== 'boolean') return invalido(nombre);
    pares.push([clave, v as string | number | boolean]);
  }
  return { ok: true, valor: Object.freeze(Object.fromEntries(pares)) };
};

/** Las pistas, con el mismo lector que el Gateway, Brain y el Planner. Primero la implementación, para dar el motivo exacto. */
const leerPistas = (crudo: unknown, campo: string): Lectura<ExecutionHints | undefined> => {
  if (crudo === undefined) return { ok: true, valor: undefined };
  if (esObjetoPlano(crudo)) {
    for (const clave of Object.keys(crudo)) {
      if (claveDeImplementacion(clave)) return invalido(`${campo}.${nombreDeCampo(clave)}`, 'implementation_not_allowed');
    }
  }
  const leidas = leerHints(crudo, campo);
  if (!leidas.ok) return invalido(leidas.field);
  const limpias = Object.fromEntries(Object.entries(leidas.hints ?? {}).filter(([, v]) => v !== undefined)) as ExecutionHints;
  return { ok: true, valor: Object.keys(limpias).length ? Object.freeze(limpias) : undefined };
};

const leerIdiomaDelWorkflow = (crudo: unknown): Lectura<LanguageContext | undefined> => {
  const r = leerIdioma(crudo);
  return r.ok ? { ok: true, valor: r.language ? copiar(r.language) : undefined } : invalido(r.field);
};

/**
 * EL TOPE QUE PUSO LA PERSONA, con forma de tope.
 *
 * El motor no calcula ni cobra nada: lo TRANSPORTA hasta quien sí lo hará
 * (Fase 9). Por eso mismo tiene que llegar con forma: `prefer` es una
 * INSTRUCCIÓN que el Router leerá —«rápido aunque cueste más»— y un valor
 * inventado ahí no se descubre hasta que alguien decide con él.
 */
const presupuestoValido = (v: unknown): boolean =>
  esObjetoDeDatos(v)
  && !leerClaves(v, CLAVES_DE_PRESUPUESTO, 'budget')
  && (v.maxCredits === undefined || (esNumero(v.maxCredits) && v.maxCredits >= 0 && Number.isInteger(v.maxCredits)))
  && (v.maxUsd === undefined || (esNumero(v.maxUsd) && v.maxUsd >= 0))
  && (v.prefer === undefined || (esTexto(v.prefer) && PREFERENCIAS.includes(v.prefer)))
  && (v.onExceed === undefined || (esTexto(v.onExceed) && AL_EXCEDER.includes(v.onExceed)));

/** Lo que se le exigirá a la salida. Lo evaluará el Quality Engine (Fase 14); aquí solo se comprueba que sea del vocabulario. */
const calidadValida = (v: unknown): boolean =>
  esObjetoDeDatos(v)
  && !leerClaves(v, CLAVES_DE_CALIDAD, 'quality')
  && (v.minScore === undefined || (esNumero(v.minScore) && v.minScore >= 0 && v.minScore <= 1))
  && (v.checks === undefined || (Array.isArray(v.checks) && v.checks.length <= COMPROBACIONES_DE_CALIDAD.length && v.checks.every((c: unknown) => esTexto(c) && COMPROBACIONES_DE_CALIDAD.includes(c))))
  && (v.onBelow === undefined || (esTexto(v.onBelow) && AL_NO_LLEGAR.includes(v.onBelow)));

const leerClaves = (crudo: Record<string, unknown>, permitidas: readonly string[], campo: string): Fallo | null => {
  for (const clave of Object.keys(crudo)) {
    const nombre = campo ? `${campo}.${nombreDeCampo(clave)}` : nombreDeCampo(clave);
    if (claveDeImplementacion(clave)) return invalido(nombre, 'implementation_not_allowed');
    if (claveProhibida(clave)) return invalido(nombre);
    if (!permitidas.includes(clave)) return invalido(nombre);
  }
  return null;
};

/**
 * Un error tal como lo informa quien orquesta: forma de `WeeError`, sin mensaje
 * crudo, sin traza, sin secretos.
 *
 * `details` se revisa EN PROFUNDIDAD con el mismo lector que todo lo demás y en
 * modo traza. Mirar solo el primer nivel dejaba pasar un `{ d: { apiKey, stack } }`
 * entero, que es exactamente la forma en que un adaptador envuelve el error del
 * proveedor. Lo encontró la auditoría.
 */
const leerError = (crudo: unknown, campo: string): Lectura<WeeError> => {
  if (!esObjetoDeDatos(crudo)) return invalido(campo);
  for (const clave of Object.keys(crudo)) {
    if (!CLAVES_DE_ERROR.includes(clave)) return invalido(`${campo}.${nombreDeCampo(clave)}`);
  }
  if (!esTexto(crudo.code) || !/^[A-Z_]{3,40}$/.test(crudo.code)) return invalido(`${campo}.code`);
  if (!esTexto(crudo.source) || !FORMA_DE_ETIQUETA.test(crudo.source)) return invalido(`${campo}.source`);
  if (crudo.providerCode !== undefined && (!esTexto(crudo.providerCode) || crudo.providerCode.length > 160)) return invalido(`${campo}.providerCode`);
  let details: unknown;
  if (crudo.details !== undefined) {
    if (!esObjetoDeDatos(crudo.details)) return invalido(`${campo}.details`);
    const r = revisarDatos(crudo.details, `${campo}.details`, true);
    if (!r.ok) return r;
    if (tamañoDe(r.valor) > 16 * 1024) return invalido(`${campo}.details`, 'too_large');
    details = r.valor;
  }
  return {
    ok: true,
    valor: Object.freeze({
      code: crudo.code as WeeError['code'],
      source: crudo.source,
      ...(crudo.providerCode !== undefined ? { providerCode: crudo.providerCode as string } : {}),
      ...(details !== undefined ? { details: details as Record<string, unknown> } : {}),
    }) as WeeError,
  };
};

/**
 * El coste real, tal como lo informa quien orquesta. Es un REGISTRO de lo que
 * pasó, no una instrucción: por eso aquí sí puede venir con qué se hizo
 * (`provider`, `model`), que es exactamente lo que el contrato de coste de la
 * Fase 0 reserva «para auditar, no para decidir».
 */
const leerCosteReal = (crudo: unknown, campo: string): Lectura<ActualCost> => {
  if (!esObjetoDeDatos(crudo) || !esObjetoDeDatos(crudo.provider)) return invalido(campo);
  /*
   * NO SE CALCULA NADA: solo se comprueba que un registro de dinero tenga
   * forma de registro de dinero. Nada negativo —ni dinero, ni tiempo—, y los
   * Credits enteros, que es lo que dice el contrato de coste de la Fase 0:
   * «los Credits no se parten». Un importe con signo cambiado en un libro es
   * peor que un importe ausente, porque suma.
   */
  if (!esNumero(crudo.latencyMs) || crudo.latencyMs < 0) return invalido(`${campo}.latencyMs`);
  if (!Array.isArray(crudo.provider.lines) || !esNumero(crudo.provider.usd) || crudo.provider.usd < 0) return invalido(`${campo}.provider`);
  if (crudo.creditsCharged !== undefined && (!esNumero(crudo.creditsCharged) || crudo.creditsCharged < 0 || !Number.isInteger(crudo.creditsCharged))) return invalido(`${campo}.creditsCharged`);
  /*
   * La profundidad se acota como en todo lo demás. Sin cota, un coste anidado
   * treinta mil niveles desbordaba la pila y la excepción escapaba de
   * `transitar`, que es una función pura y no tiene dónde capturarla.
   */
  const revisar = (v: unknown, c: string, profundidad = 0): Fallo | null => {
    if (v === null || v === undefined || esTexto(v) || typeof v === 'boolean') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? null : invalido(c);
    if (profundidad >= MAX_PROFUNDIDAD) return invalido(c, 'too_deep');
    if (Array.isArray(v)) return v.length > MAX_ELEMENTOS ? invalido(c, 'too_large') : v.map((x, i) => revisar(x, `${c}[${i}]`, profundidad + 1)).find(Boolean) ?? null;
    if (esObjetoDeDatos(v)) {
      const claves = Object.keys(v);
      if (claves.length > MAX_CLAVES) return invalido(c, 'too_large');
      for (const k of claves) {
        if (claveProhibida(k)) return invalido(`${c}.${nombreDeCampo(k)}`);
        const f = revisar(v[k], `${c}.${nombreDeCampo(k)}`, profundidad + 1);
        if (f) return f;
      }
      return null;
    }
    return invalido(c);
  };
  const f = revisar(crudo, campo);
  if (f) return f;
  if (tamañoDe(crudo) > 64 * 1024) return invalido(campo, 'too_large');
  return { ok: true, valor: copiar(crudo) as unknown as ActualCost };
};

/* ── Del plan al workflow ─────────────────────────────────────────────────── */

/**
 * LEER UN PLAN Y CONVERTIRLO EN WORKFLOW.
 *
 * Llega del Planner, que ya lo validó, pero el motor no da eso por supuesto:
 * un plan se puede guardar, editar y volver a mandar, y este es el último
 * sitio donde una selección de proveedor disfrazada de dato puede pararse
 * antes de que alguien la ejecute.
 *
 * Se copia lo que el workflow necesita para ejecutarse sin ir a buscar el
 * plan, y se referencia el plan por `planId`. No se inventa nada: lo que el
 * plan no trae, el workflow no lo tiene.
 */
const leerPlan = (crudo: unknown, workflowId: string): Lectura<{ workflow: Workflow; warnings: readonly WorkflowWarning[] }> => {
  if (!esObjetoDeDatos(crudo)) return invalido('plan');
  const claves = leerClaves(crudo, CLAVES_DE_PLAN, 'plan');
  if (claves) return claves;
  if (!esTexto(crudo.contract) || !contratoCompatible(PLANNER_CONTRACT_VERSION, crudo.contract)) return invalido('plan.contract', 'contract_incompatible');
  if (!esTexto(crudo.id) || !FORMA_DE_ID.test(crudo.id)) return invalido('plan.id');
  const goal = leerTextoCorto(crudo.goal, 'plan.goal', true);
  if (!goal.ok) return goal;
  if (!esTexto(crudo.intent) || !INTENCIONES.includes(crudo.intent as BrainIntent)) return invalido('plan.intent');
  if (!Array.isArray(crudo.steps)) return invalido('plan.steps');
  if (crudo.steps.length === 0) return invalido('plan.steps', 'empty_workflow');
  if (crudo.steps.length > MAX_PASOS) return invalido('plan.steps', 'too_many_steps');
  if (!Array.isArray(crudo.capabilities)) return invalido('plan.capabilities');
  if (!Array.isArray(crudo.assumptions)) return invalido('plan.assumptions');
  if (!Array.isArray(crudo.warnings)) return invalido('plan.warnings');

  const steps: WorkflowStep[] = [];
  for (let i = 0; i < crudo.steps.length; i++) {
    const paso = crudo.steps[i];
    const campo = `plan.steps[${i}]`;
    if (!esObjetoDeDatos(paso)) return invalido(campo);
    const suyas = leerClaves(paso, CLAVES_DE_PASO_DE_PLAN, campo);
    if (suyas) return suyas;
    if (!esTexto(paso.id) || !FORMA_DE_ETIQUETA.test(paso.id)) return invalido(`${campo}.id`);
    const entrada = esTexto(paso.capability) ? CATALOGO.get(paso.capability as CoreCapabilityId) : undefined;
    if (!entrada) return invalido(`${campo}.capability`, 'unknown_capability');
    const purpose = leerTextoCorto(paso.purpose, `${campo}.purpose`, true);
    if (!purpose.ok) return purpose;
    const dependsOn = leerListaDeTextos(paso.dependsOn, `${campo}.dependsOn`, FORMA_DE_ETIQUETA, MAX_DEPENDENCIAS);
    if (!dependsOn.ok) return dependsOn;
    const input = leerDatos(paso.input, `${campo}.input`, false);
    if (!input.ok) return input;
    /* Lo que produce lo dice el catálogo. Si el plan lo trae, tiene que coincidir; si no, se completa. */
    if (paso.produces !== undefined && paso.produces !== entrada.produces) return invalido(`${campo}.produces`);
    const hints = leerPistas(paso.hints, `${campo}.hints`);
    if (!hints.ok) return hints;
    steps.push({
      id: paso.id,
      capability: entrada.id,
      purpose: purpose.valor as string,
      ...(dependsOn.valor?.length ? { dependsOn: dependsOn.valor } : {}),
      ...(input.valor ? { input: input.valor } : {}),
      produces: entrada.produces,
      ...(hints.valor ? { hints: hints.valor } : {}),
    });
  }

  /* La lista de capacidades del plan tiene que ser la de sus pasos: dos verdades sobre lo mismo no viajan. */
  const delPlan = crudo.capabilities;
  const deLosPasos = new Set(steps.map((s) => s.capability));
  if (delPlan.length !== deLosPasos.size || !delPlan.every((c: unknown) => esTexto(c) && deLosPasos.has(c as CoreCapabilityId))) {
    return invalido('plan.capabilities', 'inconsistent');
  }

  const language = leerIdiomaDelWorkflow(crudo.language);
  if (!language.ok) return language;
  const workplace = leerEtiqueta(crudo.workplace, 'plan.workplace');
  if (!workplace.ok) return workplace;
  const projectId = leerEtiqueta(crudo.projectId, 'plan.projectId');
  if (!projectId.ok) return projectId;
  const constraints = leerRestricciones(crudo.constraints, 'plan.constraints');
  if (!constraints.ok) return constraints;
  const hints = leerPistas(crudo.hints, 'plan.hints');
  if (!hints.ok) return hints;
  const explainToUser = leerTextoCorto(crudo.explainToUser, 'plan.explainToUser', false);
  if (!explainToUser.ok) return explainToUser;
  const assumptions = leerListaDeTextos(crudo.assumptions, 'plan.assumptions');
  if (!assumptions.ok) return assumptions;
  const avisos = leerListaDeTextos(crudo.warnings, 'plan.warnings');
  if (!avisos.ok) return avisos;
  /* Del plan solo interesan los avisos que describen al plan; los de su operación ya se anotaron allí. */
  const warnings = (avisos.valor ?? []).filter((w): w is WorkflowWarning => (AVISOS_DEL_PLAN as readonly string[]).includes(w as PlanWarning));

  const workflow: Workflow = {
    id: workflowId,
    contract: WORKFLOW_CONTRACT_VERSION,
    goal: goal.valor as string,
    ...(workplace.valor ? { workplace: workplace.valor } : {}),
    steps: Object.freeze(steps.map((s) => Object.freeze(s))),
    ...(explainToUser.valor ? { explainToUser: explainToUser.valor } : {}),
    planId: crudo.id,
    intent: crudo.intent as BrainIntent,
    ...(projectId.valor ? { projectId: projectId.valor } : {}),
    ...(language.valor ? { language: language.valor } : {}),
    ...(constraints.valor ? { constraints: constraints.valor } : {}),
    ...(hints.valor ? { hints: hints.valor } : {}),
    assumptions: assumptions.valor ?? Object.freeze([]),
    warnings: Object.freeze(warnings),
  };
  return { ok: true, valor: { workflow: Object.freeze(workflow), warnings } };
};

/* ── Revisión de un workflow ──────────────────────────────────────────────── */

/**
 * LEER UN WORKFLOW, venga de donde venga.
 *
 * El que acaba de construirse ya está limpio, pero el que se lee de donde se
 * guardó no tiene por qué estarlo, y es el mismo lector para los dos: la
 * confianza no depende de por dónde entró.
 */
const leerWorkflow = (crudo: unknown): Lectura<Workflow> => {
  if (!esObjetoDeDatos(crudo)) return invalido('workflow');
  const claves = leerClaves(crudo, CLAVES_DE_WORKFLOW, 'workflow');
  if (claves) return claves;
  if (!esTexto(crudo.id) || !FORMA_DE_ETIQUETA.test(crudo.id)) return invalido('workflow.id');
  if (!esTexto(crudo.contract) || !contratoCompatible(WORKFLOW_CONTRACT_VERSION, crudo.contract)) return invalido('workflow.contract', 'contract_incompatible');
  const goal = leerTextoCorto(crudo.goal, 'workflow.goal', true);
  if (!goal.ok) return goal;
  if (!Array.isArray(crudo.steps)) return invalido('workflow.steps');
  if (crudo.steps.length === 0) return invalido('workflow.steps', 'empty_workflow');
  if (crudo.steps.length > MAX_PASOS) return invalido('workflow.steps', 'too_many_steps');

  const steps: WorkflowStep[] = [];
  for (let i = 0; i < crudo.steps.length; i++) {
    const paso = crudo.steps[i];
    const campo = `workflow.steps[${i}]`;
    if (!esObjetoDeDatos(paso)) return invalido(campo);
    const suyas = leerClaves(paso, CLAVES_DE_PASO, campo);
    if (suyas) return suyas;
    if (!esTexto(paso.id) || !FORMA_DE_ETIQUETA.test(paso.id)) return invalido(`${campo}.id`);
    const entrada = esTexto(paso.capability) ? CATALOGO.get(paso.capability as CoreCapabilityId) : undefined;
    if (!entrada) return invalido(`${campo}.capability`, 'unknown_capability');
    const purpose = leerTextoCorto(paso.purpose, `${campo}.purpose`, true);
    if (!purpose.ok) return purpose;
    const dependsOn = leerListaDeTextos(paso.dependsOn, `${campo}.dependsOn`, FORMA_DE_ETIQUETA, MAX_DEPENDENCIAS);
    if (!dependsOn.ok) return dependsOn;
    const input = leerDatos(paso.input, `${campo}.input`, false);
    if (!input.ok) return input;
    if (paso.produces !== undefined && paso.produces !== entrada.produces) return invalido(`${campo}.produces`);
    const hints = leerPistas(paso.hints, `${campo}.hints`);
    if (!hints.ok) return hints;
    if (paso.when !== undefined) {
      if (!esObjetoDeDatos(paso.when) || !esTexto(paso.when.stepId) || !FORMA_DE_ETIQUETA.test(paso.when.stepId)
        || !COMPROBACIONES.includes(paso.when.check as StepCondition['check'])
        || Object.keys(paso.when).some((k) => k !== 'stepId' && k !== 'check')) {
        return invalido(`${campo}.when`);
      }
    }
    if (paso.onFailure !== undefined && !POLITICAS.includes(paso.onFailure as StepFailurePolicy)) return invalido(`${campo}.onFailure`);
    if (paso.timeoutMs !== undefined && (!esNumero(paso.timeoutMs) || paso.timeoutMs <= 0)) return invalido(`${campo}.timeoutMs`);
    if (paso.requiresApproval !== undefined && typeof paso.requiresApproval !== 'boolean') return invalido(`${campo}.requiresApproval`);
    if (paso.retry !== undefined) {
      if (!esObjetoDeDatos(paso.retry) || leerClaves(paso.retry, CLAVES_DE_REINTENTO, `${campo}.retry`)
        || !esNumero(paso.retry.maxAttempts) || paso.retry.maxAttempts < 0 || !Number.isInteger(paso.retry.maxAttempts)
        || (paso.retry.backoffMs !== undefined && (!esNumero(paso.retry.backoffMs) || paso.retry.backoffMs < 0))
        || (paso.retry.onlyOn !== undefined && !leerListaDeTextos(paso.retry.onlyOn, `${campo}.retry.onlyOn`, /^[A-Z_]{3,40}$/).ok)) {
        return invalido(`${campo}.retry`);
      }
    }
    if (paso.quality !== undefined && !calidadValida(paso.quality)) return invalido(`${campo}.quality`);
    if (paso.budget !== undefined && !presupuestoValido(paso.budget)) return invalido(`${campo}.budget`);
    steps.push(copiar({
      id: paso.id,
      capability: entrada.id,
      purpose: purpose.valor as string,
      ...(dependsOn.valor?.length ? { dependsOn: dependsOn.valor } : {}),
      ...(input.valor ? { input: input.valor } : {}),
      ...(paso.when !== undefined ? { when: paso.when } : {}),
      ...(paso.retry !== undefined ? { retry: paso.retry } : {}),
      ...(paso.onFailure !== undefined ? { onFailure: paso.onFailure } : {}),
      ...(paso.timeoutMs !== undefined ? { timeoutMs: paso.timeoutMs } : {}),
      ...(paso.requiresApproval !== undefined ? { requiresApproval: paso.requiresApproval } : {}),
      ...(paso.quality !== undefined ? { quality: paso.quality } : {}),
      ...(paso.budget !== undefined ? { budget: paso.budget } : {}),
      produces: entrada.produces,
      ...(hints.valor ? { hints: hints.valor } : {}),
    }) as WorkflowStep);
  }

  const workplace = leerEtiqueta(crudo.workplace, 'workflow.workplace');
  if (!workplace.ok) return workplace;
  const planId = leerEtiqueta(crudo.planId, 'workflow.planId');
  if (!planId.ok) return planId;
  const projectId = leerEtiqueta(crudo.projectId, 'workflow.projectId');
  if (!projectId.ok) return projectId;
  if (crudo.intent !== undefined && (!esTexto(crudo.intent) || !INTENCIONES.includes(crudo.intent as BrainIntent))) return invalido('workflow.intent');
  const language = leerIdiomaDelWorkflow(crudo.language);
  if (!language.ok) return language;
  const constraints = leerRestricciones(crudo.constraints, 'workflow.constraints');
  if (!constraints.ok) return constraints;
  const hints = leerPistas(crudo.hints, 'workflow.hints');
  if (!hints.ok) return hints;
  const explainToUser = leerTextoCorto(crudo.explainToUser, 'workflow.explainToUser', false);
  if (!explainToUser.ok) return explainToUser;
  const assumptions = leerListaDeTextos(crudo.assumptions, 'workflow.assumptions');
  if (!assumptions.ok) return assumptions;
  const warnings = leerListaDeTextos(crudo.warnings, 'workflow.warnings');
  if (!warnings.ok) return warnings;
  if (warnings.valor?.some((w) => !(AVISOS_DEL_PLAN as readonly string[]).includes(w))) return invalido('workflow.warnings');
  const metadata = leerDatos(crudo.metadata, 'workflow.metadata', true);
  if (!metadata.ok) return metadata;
  if (crudo.budget !== undefined && !presupuestoValido(crudo.budget)) return invalido('workflow.budget');

  const workflow: Workflow = copiar({
    id: crudo.id,
    contract: WORKFLOW_CONTRACT_VERSION,
    goal: goal.valor as string,
    ...(workplace.valor ? { workplace: workplace.valor } : {}),
    steps,
    ...(crudo.budget !== undefined ? { budget: crudo.budget } : {}),
    ...(explainToUser.valor ? { explainToUser: explainToUser.valor } : {}),
    ...(metadata.valor ? { metadata: metadata.valor } : {}),
    ...(planId.valor ? { planId: planId.valor } : {}),
    ...(crudo.intent !== undefined ? { intent: crudo.intent } : {}),
    ...(projectId.valor ? { projectId: projectId.valor } : {}),
    ...(language.valor ? { language: language.valor } : {}),
    ...(constraints.valor ? { constraints: constraints.valor } : {}),
    ...(hints.valor ? { hints: hints.valor } : {}),
    ...(assumptions.valor ? { assumptions: assumptions.valor } : {}),
    ...(warnings.valor ? { warnings: warnings.valor } : {}),
  }) as Workflow;
  return { ok: true, valor: workflow };
};

/* ── El grafo ─────────────────────────────────────────────────────────────── */

/**
 * El índice de un workflow: lo que hace falta saber de su grafo, calculado una
 * vez. `dependientes` es el grafo al revés —quién necesita a quién—, que es la
 * dirección en la que se propaga un fallo. `condicionados` es quién mira a
 * quién con un `when`.
 */
interface IndiceDeWorkflow {
  posicion: ReadonlyMap<string, number>;
  dependientes: ReadonlyMap<string, readonly string[]>;
  condicionados: ReadonlyMap<string, readonly string[]>;
}

/**
 * VALIDAR EL GRAFO, con causa estructurada.
 *
 * Es lo mismo que comprueba `validarWorkflow` (Fase 0) y algo más —dependencia
 * de sí mismo, dependencia repetida—, pero devuelve un campo y un motivo en
 * vez de una frase: el Orchestrator y el Job Engine tienen que poder actuar
 * sobre esto sin leer castellano. No se arregla nada: una dependencia repetida
 * o un ciclo se rechazan, porque quitarlos en silencio sería decidir por quien
 * escribió el plan.
 */
const revisarGrafo = (steps: readonly WorkflowStep[]): Fallo | null => {
  const ids = new Set<string>();
  for (let i = 0; i < steps.length; i++) {
    if (ids.has(steps[i].id)) return { ok: false, field: `steps[${i}].id`, reason: 'duplicate_step' };
    ids.add(steps[i].id);
  }
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const vistas = new Set<string>();
    for (const dep of s.dependsOn ?? []) {
      if (dep === s.id) return { ok: false, field: `steps[${i}].dependsOn`, reason: 'self_dependency' };
      if (!ids.has(dep)) return { ok: false, field: `steps[${i}].dependsOn`, reason: 'unknown_dependency' };
      if (vistas.has(dep)) return { ok: false, field: `steps[${i}].dependsOn`, reason: 'duplicate_dependency' };
      vistas.add(dep);
    }
    if (s.when) {
      if (s.when.stepId === s.id) return { ok: false, field: `steps[${i}].when`, reason: 'self_dependency' };
      if (!ids.has(s.when.stepId)) return { ok: false, field: `steps[${i}].when`, reason: 'unknown_condition_target' };
    }
  }
  /*
   * Ciclos, en tiempo lineal: se cuentan las dependencias de cada paso y se
   * van liberando los que llegan a cero. Lo que nunca llega a cero está en un
   * ciclo o cuelga de uno. `when` cuenta como dependencia: un paso no puede
   * decidir si corre mirando a uno que, a su vez, espera por él.
   */
  const grado = new Map<string, number>();
  const salientes = new Map<string, string[]>();
  for (const s of steps) {
    const entrantes = new Set<string>([...(s.dependsOn ?? []), ...(s.when ? [s.when.stepId] : [])]);
    grado.set(s.id, entrantes.size);
    for (const d of entrantes) {
      const lista = salientes.get(d);
      if (lista) lista.push(s.id);
      else salientes.set(d, [s.id]);
    }
  }
  const cola = steps.filter((s) => grado.get(s.id) === 0).map((s) => s.id);
  for (let i = 0; i < cola.length; i++) {
    for (const sig of salientes.get(cola[i]) ?? []) {
      const g = (grado.get(sig) ?? 0) - 1;
      grado.set(sig, g);
      if (g === 0) cola.push(sig);
    }
  }
  if (cola.length !== steps.length) return { ok: false, field: 'steps', reason: 'cycle' };
  return null;
};

const indexar = (workflow: Workflow): IndiceDeWorkflow => {
  const posicion = new Map<string, number>();
  const dependientes = new Map<string, string[]>();
  const condicionados = new Map<string, string[]>();
  workflow.steps.forEach((s, i) => posicion.set(s.id, i));
  for (const s of workflow.steps) {
    for (const d of s.dependsOn ?? []) {
      const lista = dependientes.get(d);
      if (lista) lista.push(s.id);
      else dependientes.set(d, [s.id]);
    }
    if (s.when) {
      const lista = condicionados.get(s.when.stepId);
      if (lista) lista.push(s.id);
      else condicionados.set(s.when.stepId, [s.id]);
    }
  }
  return { posicion, dependientes, condicionados };
};

/* ── La ejecución ─────────────────────────────────────────────────────────── */

const errorDelMotor = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'workflow', { details: { reason, ...extra } });

const fallo = (f: Fallo): { ok: false; error: WeeError } => ({
  ok: false,
  error: errorDelMotor('INVALID_REQUEST', f.reason, { field: f.field }),
});

/** ¿Este paso ya terminó? Bloqueado cuenta: no va a moverse más. */
const terminado = (r: StepRun): boolean => esEstadoFinal(r.state);

/** ¿Dejó lo que sus dependientes necesitan? Hecho, o saltado, que es «hecho con nada» y así lo lee `pasosListos`. */
const satisfaceDependencia = (r: StepRun): boolean => r.state === 'done' || r.state === 'skipped';

/** ¿Es obligatorio? Todo lo que no se declaró opcional. */
const esObligatorio = (s: WorkflowStep): boolean => s.onFailure !== 'continue';

/**
 * ¿Cumplió lo que se le pedía? Hecho, o saltado porque su condición dijo que
 * no hacía falta. Saltado porque su dependencia falló NO cumple: no se hizo
 * lo que había que hacer, aunque fuera por culpa de otro.
 */
const cumplido = (r: StepRun): boolean =>
  r.state === 'done' || (r.state === 'skipped' && r.cause?.reason === 'condition_not_met');

/** El paso que de verdad decidió el estado de este: la causa apunta siempre a la raíz. */
const raizDe = (r: StepRun): string => r.cause?.stepId ?? r.stepId;

/** Evaluar una condición cerrada contra lo que ya se sabe. `undefined` = todavía no se puede saber. */
export const evaluarCondicion = (condicion: StepCondition, objetivo: StepRun | undefined): boolean | undefined => {
  if (!objetivo || !terminado(objetivo)) return undefined;
  switch (condicion.check) {
    case 'succeeded': return objetivo.state === 'done';
    case 'failed': return objetivo.state === 'failed';
    case 'produced_output': return objetivo.state === 'done' && (objetivo.outputRefs?.length ?? 0) > 0;
    case 'skipped': return objetivo.state === 'skipped';
    default: return false;
  }
};

/** Todos los pasos que, directa o transitivamente, necesitan a este. */
const descendientesDe = (indice: IndiceDeWorkflow, stepId: string): readonly string[] => {
  const vistos = new Set<string>();
  const cola = [...(indice.dependientes.get(stepId) ?? [])];
  for (let i = 0; i < cola.length; i++) {
    const id = cola[i];
    if (vistos.has(id)) continue;
    vistos.add(id);
    cola.push(...(indice.dependientes.get(id) ?? []));
  }
  return [...vistos];
};

/**
 * PREPARAR UN WORKFLOW PARA GOBERNAR EJECUCIONES.
 *
 * Aquí vive el motor de verdad. Todo lo de dentro es puro: recibe una
 * ejecución, devuelve otra, y no toca la que recibió. El índice se calcula
 * una vez al preparar y es lo que hace que una transición no recorra el grafo.
 */
const prepararLeido = (workflow: Workflow): PreparedWorkflow => {
  const indice = indexar(workflow);
  const pasoDe = (id: string): WorkflowStep | undefined => {
    const i = indice.posicion.get(id);
    return i === undefined ? undefined : workflow.steps[i];
  };
  const runDe = (run: WorkflowRun, id: string): StepRun | undefined => {
    const i = indice.posicion.get(id);
    return i === undefined ? undefined : run.steps[i];
  };

  /** ¿Puede empezar este paso, mirando solo su grafo? Sus dependencias cumplieron y su condición, si la tiene, se cumplió. */
  const listoPorGrafo = (run: WorkflowRun, step: WorkflowStep): boolean => {
    const suyo = runDe(run, step.id);
    if (!suyo || suyo.state !== 'pending') return false;
    for (const d of step.dependsOn ?? []) {
      const r = runDe(run, d);
      if (!r || !satisfaceDependencia(r)) return false;
    }
    if (step.when && evaluarCondicion(step.when, runDe(run, step.when.stepId)) !== true) return false;
    return true;
  };

  /** ¿Deja la ejecución que empiece algo? Pausada o terminada, no. */
  const admiteArranques = (run: WorkflowRun): boolean => run.state !== 'paused' && !RUN_FINALES.includes(run.state);

  /**
   * ¿Es una ejecución DE ESTE workflow? Mismo id, un paso por paso y en el
   * mismo orden. Mezclar el run de un workflow con el índice de otro daría
   * respuestas que parecen correctas y no lo son; se rechaza antes.
   */
  const deEsteWorkflow = (run: unknown): run is WorkflowRun =>
    esObjetoDeDatos(run) && run.workflowId === workflow.id && Array.isArray(run.steps) && run.steps.length === workflow.steps.length
    && run.steps.every((r: unknown, i: number) =>
      esObjetoDeDatos(r) && r.stepId === workflow.steps[i].id
      /*
       * Y con un estado del vocabulario. Una ejecución vuelve de donde se
       * guardó, así que su `state` es texto hasta que se comprueba: con
       * `constructor` ahí dentro, indexar la tabla de transiciones devolvía
       * una función del prototipo y el motor reventaba con un TypeError en
       * vez de contestar. Lo encontró la auditoría.
       */
      && esTexto(r.state) && (ESTADOS_DE_PASO as readonly string[]).includes(r.state)
      && esNumero(r.attempt) && r.attempt >= 0 && Number.isInteger(r.attempt));

  /** Las consultas sobre una ejecución ajena no contestan nada: no hay canal de error y no se inventa una respuesta. */
  const listos = (run: WorkflowRun): readonly WorkflowStep[] =>
    deEsteWorkflow(run) && admiteArranques(run) ? workflow.steps.filter((s) => listoPorGrafo(run, s)) : [];

  const activos = (steps: readonly StepRun[]): readonly string[] =>
    steps.filter((r) => r.state === 'running' || r.state === 'awaiting_approval').map((r) => r.stepId);

  /**
   * EL ESTADO DE LA EJECUCIÓN, DEDUCIDO.
   *
   * Una decisión ya tomada —falló, se canceló— se conserva; lo demás se deduce
   * de los pasos cada vez. Guardar el estado es una comodidad para quien lo
   * lee; la verdad está en los pasos, y una prueba comprueba que coinciden.
   */
  const enPasos = (steps: readonly StepRun[], id: string): StepRun => steps[indice.posicion.get(id) as number];

  const cierreDe = (steps: readonly StepRun[]): { state: RunState | 'open'; cause?: RunCause; pending: string[]; active: string[]; unsatisfied: string[] } => {
    const active = [...activos(steps)];
    const pending: string[] = [];
    const unsatisfied: string[] = [];
    for (const s of workflow.steps) {
      const r = enPasos(steps, s.id);
      /*
       * CUALQUIER paso sin terminar mantiene la ejecución abierta, obligatorio
       * u opcional: cerrar `done` con un paso todavía lanzable es decidir por
       * el Orchestrator que no vale la pena hacerlo. Lo que distingue a un
       * opcional es que su INCUMPLIMIENTO no cuenta, no que se pueda ignorar
       * mientras está vivo. Lo encontró la auditoría.
       */
      if (!terminado(r)) pending.push(s.id);
      else if (esObligatorio(s) && !cumplido(r)) unsatisfied.push(s.id);
    }
    if (active.length || pending.length) return { state: 'open', pending, active, unsatisfied };
    if (!unsatisfied.length) return { state: 'done', pending, active, unsatisfied };
    /* La raíz del primer obligatorio incumplido, en el orden del workflow, decide cómo termina. */
    const primero = enPasos(steps, unsatisfied[0]);
    const raiz = enPasos(steps, raizDe(primero));
    /* Si la raíz se canceló, se canceló porque alguien lo pidió: es el único camino que deja un paso en `cancelled` sin que la ejecución ya estuviera decidida. */
    if (raiz.state === 'cancelled') {
      return { state: 'cancelled', cause: Object.freeze({ reason: 'cancelled_by_request' as const, stepId: raiz.stepId }), pending, active, unsatisfied };
    }
    return { state: 'failed', cause: Object.freeze({ reason: 'step_failed' as const, stepId: raiz.stepId }), pending, active, unsatisfied };
  };

  const estadoDeducido = (anterior: WorkflowRun, steps: readonly StepRun[], decidido?: { state: RunState; cause?: RunCause }): { state: RunState; cause?: RunCause } => {
    const cierre = cierreDe(steps);
    /* Una decisión ya tomada se conserva: un `failed` no vuelve a `running` porque un paralelo termine bien. */
    if (decidido) return { state: decidido.state, ...(decidido.cause ? { cause: decidido.cause } : {}) };
    if (RUN_FINALES.includes(anterior.state)) return { state: anterior.state, ...(anterior.cause ? { cause: anterior.cause } : {}) };
    if (cierre.state !== 'open') return { state: cierre.state, ...(cierre.cause ? { cause: cierre.cause } : {}) };
    if (anterior.state === 'paused') return { state: 'paused' };
    if (steps.some((r) => r.state === 'awaiting_approval')) return { state: 'awaiting_approval' };
    if (steps.some((r) => r.state === 'running')) return { state: 'running' };
    return { state: anterior.startedAt === undefined ? 'pending' : 'running' };
  };

  const armarRun = (anterior: WorkflowRun, steps: readonly StepRun[], at: number, decidido?: { state: RunState; cause?: RunCause }): WorkflowRun => {
    const deducido = estadoDeducido(anterior, steps, decidido);
    const cursor = activos(steps);
    const terminada = RUN_FINALES.includes(deducido.state) && cursor.length === 0;
    const nuevo: WorkflowRun = {
      ...anterior,
      state: deducido.state,
      steps: Object.freeze(steps),
      cursor: Object.freeze(cursor),
      ...(deducido.cause ? { cause: deducido.cause } : {}),
      ...(terminada && anterior.finishedAt === undefined ? { finishedAt: at } : {}),
    };
    return Object.freeze(nuevo);
  };

  /**
   * UNA TRANSICIÓN Y TODO LO QUE ARRASTRA.
   *
   * Se aplica la pedida y después se propaga: al terminar un paso se miran los
   * que se condicionan a él; al fallar, sus descendientes según su política; y
   * si el workflow cae, el resto. Cada paso que cambia queda en la lista de
   * transiciones con su causa y marcado como propagado. Nada se muta: los
   * `StepRun` que no cambian se reutilizan tal cual.
   */
  const transitar = (run: WorkflowRun, transition: StepTransition): TransitionResult => {
    if (!esObjetoDeDatos(transition)) return fallo(invalido('transition'));
    const claves = leerClaves(transition, CLAVES_DE_TRANSICION, 'transition');
    if (claves) return fallo(claves);
    const { stepId, to, at } = transition;
    if (!esTexto(stepId) || indice.posicion.get(stepId) === undefined) return fallo(invalido('transition.stepId', 'unknown_step'));
    if (!esTexto(to) || !POR_PETICION.includes(to as StepState)) {
      return fallo(invalido('transition.to', esTexto(to) && (ESTADOS_DE_PASO as readonly string[]).includes(to) ? 'engine_only' : 'invalid_request'));
    }
    if (!esNumero(at) || at < 0) return fallo(invalido('transition.at'));
    if (!deEsteWorkflow(run)) return fallo(invalido('run', 'inconsistent'));
    const step = pasoDe(stepId) as WorkflowStep;
    const actual = runDe(run, stepId) as StepRun;

    if (!puedeTransitar(actual.state, to)) {
      return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'invalid_transition', { stepId, from: actual.state, to }) };
    }
    /*
     * Empezar exige que la ejecución admita arranques y —desde pendiente— que
     * el paso esté listo. Cancelar un pendiente no exige nada de eso, e
     * informar de algo que ya corre se admite siempre: lo que pasó, pasó.
     */
    const arranca = to === 'running' || to === 'awaiting_approval';
    if (arranca && !admiteArranques(run)) {
      return { ok: false, error: errorDelMotor('INVALID_REQUEST', run.state === 'paused' ? 'run_paused' : 'run_finished', { stepId, runState: run.state }) };
    }
    if (arranca && actual.state === 'pending') {
      if (!listoPorGrafo(run, step)) return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'not_ready', { stepId }) };
      if (to === 'awaiting_approval' && !step.requiresApproval) return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'approval_not_required', { stepId }) };
      if (to === 'running' && step.requiresApproval) return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'approval_required', { stepId }) };
    }

    /* Lo que acompaña a cada destino, revisado. Lo que no toca, se rechaza en vez de ignorarse. */
    let error: WeeError | undefined;
    let outputRefs: readonly string[] | undefined;
    let coste: ActualCost | undefined;
    let cause: StepCause | undefined;
    if (to === 'failed') {
      if (transition.error === undefined) return fallo(invalido('transition.error'));
      const e = leerError(transition.error, 'transition.error');
      if (!e.ok) return fallo(e);
      error = e.valor;
    } else if (transition.error !== undefined) return fallo(invalido('transition.error'));
    if (to === 'done') {
      const refs = leerListaDeTextos(transition.outputRefs, 'transition.outputRefs', FORMA_DE_ETIQUETA, MAX_REFERENCIAS);
      if (!refs.ok) return fallo(refs);
      outputRefs = refs.valor;
    } else if (transition.outputRefs !== undefined) return fallo(invalido('transition.outputRefs'));
    /*
     * También al cancelar: un paso que se cancela MIENTRAS CORRE ya gastó
     * dinero, y no dejarle declararlo pierde el registro de ese gasto. Un
     * pendiente que se cancela no gastó nada, así que ahí no cabe.
     */
    const puedeDeclararCoste = to === 'done' || to === 'failed' || (to === 'cancelled' && actual.state === 'running');
    if (puedeDeclararCoste) {
      if (transition.actual !== undefined) {
        const c = leerCosteReal(transition.actual, 'transition.actual');
        if (!c.ok) return fallo(c);
        coste = c.valor;
      }
    } else if (transition.actual !== undefined) return fallo(invalido('transition.actual'));
    if (to === 'cancelled') {
      if (transition.cause !== undefined) {
        if (!esObjetoDeDatos(transition.cause) || !CAUSAS_POR_PETICION.includes(transition.cause.reason as StepCauseReason)
          || Object.keys(transition.cause).some((k) => k !== 'reason')) {
          return fallo(invalido('transition.cause'));
        }
        cause = causa(transition.cause.reason as StepCauseReason);
      } else {
        cause = causa(actual.state === 'awaiting_approval' ? 'approval_rejected' : 'cancelled_by_request');
      }
    } else if (transition.cause !== undefined) return fallo(invalido('transition.cause'));

    const steps = [...run.steps];
    const transiciones: AppliedTransition[] = [];
    const poner = (id: string, nuevo: StepRun, propagated: boolean): void => {
      const i = indice.posicion.get(id) as number;
      transiciones.push(Object.freeze({ stepId: id, from: steps[i].state, to: nuevo.state, at, ...(nuevo.cause ? { cause: nuevo.cause } : {}), propagated }));
      steps[i] = Object.freeze(nuevo);
    };

    const propio: StepRun = {
      ...actual,
      state: to,
      ...(to === 'running' ? { attempt: actual.attempt + 1, startedAt: at } : {}),
      ...(to === 'done' || to === 'failed' || to === 'cancelled' ? { finishedAt: at } : {}),
      ...(error ? { error } : {}),
      ...(outputRefs ? { outputRefs } : {}),
      ...(coste ? { actual: coste } : {}),
      ...(cause ? { cause } : {}),
    };
    poner(stepId, propio, false);

    /* ── Propagación ─────────────────────────────────────────────────────── */
    let decidido: { state: RunState; cause?: RunCause } | undefined;
    const pendientes = (ids: readonly string[]): readonly string[] => ids.filter((id) => (steps[indice.posicion.get(id) as number].state === 'pending'));

    /*
     * Los que se condicionan a este ya pueden saber si corren. Con COLA y no
     * recursión: una cadena de condiciones puede ser tan larga como el
     * workflow, y a los pocos miles la recursión desbordaba la pila, que es
     * una excepción escapando de una función pura. Lo encontró la auditoría.
     */
    const resolverCondicionados = (desde: string): void => {
      const cola = [desde];
      for (let i = 0; i < cola.length; i++) {
        const deId = cola[i];
        for (const id of pendientes(indice.condicionados.get(deId) ?? [])) {
          const s = pasoDe(id) as WorkflowStep;
          const r = steps[indice.posicion.get(id) as number];
          if (evaluarCondicion(s.when as StepCondition, steps[indice.posicion.get(deId) as number]) === false) {
            poner(id, { ...r, state: 'skipped', finishedAt: at, cause: causa('condition_not_met', deId) }, true);
            cola.push(id);
          }
        }
      }
    };

    if (esEstadoFinal(to)) resolverCondicionados(stepId);

    if (to === 'failed' || to === 'cancelled') {
      const razon: StepCauseReason = to === 'failed' ? 'dependency_failed' : 'dependency_cancelled';
      const politica: StepFailurePolicy = to === 'failed' ? (step.onFailure ?? 'fail_workflow') : 'continue';
      /* Los descendientes, en el orden del workflow para que el resultado no dependa de cómo se recorrió el grafo. */
      const descendientes = [...descendientesDe(indice, stepId)].sort((a, b) => (indice.posicion.get(a) as number) - (indice.posicion.get(b) as number));
      for (const id of pendientes(descendientes)) {
        const r = steps[indice.posicion.get(id) as number];
        const estado: StepState = politica === 'skip_dependents' ? 'skipped' : 'blocked';
        poner(id, { ...r, state: estado, finishedAt: at, cause: causa(razon, stepId) }, true);
        resolverCondicionados(id);
      }
      if (politica === 'fail_workflow') {
        decidido = { state: 'failed', cause: Object.freeze({ reason: 'step_failed' as const, stepId }) };
        for (const s of workflow.steps) {
          const r = steps[indice.posicion.get(s.id) as number];
          if (r.state === 'pending' || r.state === 'awaiting_approval') {
            poner(s.id, { ...r, state: 'cancelled', finishedAt: at, cause: causa('workflow_failed', stepId) }, true);
          }
        }
      }
    }

    const startedAt = run.startedAt ?? (to === 'running' ? at : undefined);
    const conArranque: WorkflowRun = startedAt !== undefined && run.startedAt === undefined ? { ...run, startedAt } : run;
    const nuevo = armarRun(conArranque, steps, at, decidido);

    /* Los que quedaron listos POR esto: solo los dependientes y condicionados de lo que cambió. */
    const afectados = new Set<string>();
    for (const t of transiciones) {
      for (const id of indice.dependientes.get(t.stepId) ?? []) afectados.add(id);
      for (const id of indice.condicionados.get(t.stepId) ?? []) afectados.add(id);
    }
    const nowReady = admiteArranques(nuevo)
      ? [...afectados].filter((id) => listoPorGrafo(nuevo, pasoDe(id) as WorkflowStep)).sort((a, b) => (indice.posicion.get(a) as number) - (indice.posicion.get(b) as number))
      : [];
    return { ok: true, run: nuevo, transitions: Object.freeze(transiciones), nowReady: Object.freeze(nowReady) };
  };

  const iniciar = (trace: TraceContext, ids: { runId?: string } = {}): RunResult => {
    const traza = leerTraza({ trace });
    if (!traza) return fallo(invalido('trace'));
    if (ids.runId !== undefined && (!esTexto(ids.runId) || !FORMA_DE_ETIQUETA.test(ids.runId))) return fallo(invalido('ids.runId'));
    const id = ids.runId ?? `run_${traza.requestId}`;
    if (!FORMA_DE_ETIQUETA.test(id)) return fallo(invalido(ids.runId ? 'ids.runId' : 'trace.requestId', 'id_too_long'));
    const run: WorkflowRun = {
      id,
      workflowId: workflow.id,
      userId: traza.userId,
      state: 'pending',
      steps: Object.freeze(workflow.steps.map((s) => Object.freeze({ stepId: s.id, state: 'pending' as StepState, attempt: 0 }))),
      cursor: Object.freeze([]),
      contract: WORKFLOW_CONTRACT_VERSION,
      /* Sin claves a `undefined`: la ejecución se va a guardar tal cual, y hay almacenes que las rechazan. */
      trace: copiar({ ...traza, runId: id }),
    };
    return { ok: true, run: Object.freeze(run) };
  };

  const cancelar = (run: WorkflowRun, at: number, stepId?: string): TransitionResult => {
    if (stepId !== undefined) return transitar(run, { stepId, to: 'cancelled', at, cause: { reason: 'cancelled_by_request' } });
    if (!deEsteWorkflow(run)) return fallo(invalido('run', 'inconsistent'));
    if (!esNumero(at) || at < 0) return fallo(invalido('at'));
    if (RUN_FINALES.includes(run.state)) return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'run_finished', { runState: run.state }) };
    const steps = [...run.steps];
    const transiciones: AppliedTransition[] = [];
    for (const s of workflow.steps) {
      const i = indice.posicion.get(s.id) as number;
      const r = steps[i];
      if (r.state === 'pending' || r.state === 'awaiting_approval') {
        const nuevo: StepRun = { ...r, state: 'cancelled', finishedAt: at, cause: causa('workflow_cancelled') };
        transiciones.push(Object.freeze({ stepId: s.id, from: r.state, to: 'cancelled' as StepState, at, cause: nuevo.cause, propagated: true }));
        steps[i] = Object.freeze(nuevo);
      }
    }
    const nuevo = armarRun(run, steps, at, { state: 'cancelled', cause: Object.freeze({ reason: 'cancelled_by_request' as const }) });
    return { ok: true, run: nuevo, transitions: Object.freeze(transiciones), nowReady: Object.freeze([]) };
  };

  const pausar = (run: WorkflowRun): RunResult => {
    if (!deEsteWorkflow(run)) return fallo(invalido('run', 'inconsistent'));
    if (run.state === 'paused') return { ok: true, run };
    if (RUN_FINALES.includes(run.state)) return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'run_finished', { runState: run.state }) };
    return { ok: true, run: Object.freeze({ ...run, state: 'paused' as RunState }) };
  };

  const reanudar = (run: WorkflowRun): RunResult => {
    if (!deEsteWorkflow(run)) return fallo(invalido('run', 'inconsistent'));
    if (run.state !== 'paused') return { ok: false, error: errorDelMotor('INVALID_REQUEST', 'run_not_paused', { runState: run.state }) };
    /* Se vuelve al estado que los pasos digan: si mientras tanto terminó todo, ya no es «en marcha». */
    return { ok: true, run: Object.freeze({ ...run, ...estadoDeducido({ ...run, state: 'running' }, run.steps) }) };
  };

  const cierre = (run: WorkflowRun): RunClosure => {
    if (!deEsteWorkflow(run)) return Object.freeze({ state: 'open' as const, pending: Object.freeze([]), active: Object.freeze([]), unsatisfied: Object.freeze([]) });
    const c = cierreDe(run.steps);
    const state: RunClosure['state'] = RUN_FINALES.includes(run.state) ? run.state : c.state;
    const cause = RUN_FINALES.includes(run.state) ? run.cause : c.cause;
    return Object.freeze({ state, ...(cause ? { cause } : {}), pending: Object.freeze(c.pending), active: Object.freeze(c.active), unsatisfied: Object.freeze(c.unsatisfied) });
  };

  const resumen = (run: WorkflowRun): RunSummary => {
    /* Sin prototipo: `grupos[r.state]` se indexa con lo que traiga la ejecución, y ahí no puede haber nada heredado. */
    const grupos = Object.assign(Object.create(null), {
      pending: [], blocked: [], running: [], awaiting_approval: [], done: [], failed: [], skipped: [], cancelled: [], ready: [],
    }) as Record<StepState | 'ready', string[]>;
    if (deEsteWorkflow(run)) for (const r of run.steps) grupos[r.state].push(r.stepId);
    grupos.ready = listos(run).map((s) => s.id);
    return Object.freeze(Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, Object.freeze(v)]))) as RunSummary;
  };

  const trazaDelPaso = (run: WorkflowRun, stepId: string): TraceContext | undefined => {
    if (!deEsteWorkflow(run) || !run.trace || indice.posicion.get(stepId) === undefined) return undefined;
    return copiar({ ...run.trace, runId: run.id, stepId });
  };

  return Object.freeze({ workflow, iniciar, listos, transitar, cancelar, pausar, reanudar, cierre, resumen, trazaDelPaso });
};

/** Un workflow leído y revisado, o el motivo. Función pura: no anota nada. */
export const prepararWorkflow = (crudo: unknown): PrepareResult => {
  const leido = leerWorkflow(crudo);
  if (!leido.ok) return fallo(leido);
  const grafo = revisarGrafo(leido.valor.steps);
  if (grafo) return fallo({ ...grafo, field: `workflow.${grafo.field}` });
  return { ok: true, prepared: prepararLeido(leido.valor) };
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export const crearWorkflowEngine = (ports: WorkflowEnginePorts): WorkflowEngine => {
  const construir = async (request: WorkflowRequest): Promise<WorkflowResponse> => {
    const startedAt = ports.now();
    const trazaVacia: TraceContext = { traceId: '', requestId: '', userId: '' };
    const trace = leerTraza(request);
    let capacidadPrincipal: CoreCapabilityId | undefined;

    const anotar = async (respuesta: WorkflowResponse): Promise<WorkflowResponse> => {
      if (!trace) return respuesta;
      const operacion: OperationTrace = {
        ...trace,
        capability: respuesta.workflow?.steps[0]?.capability ?? capacidadPrincipal ?? ('text.generate' as CoreCapabilityId),
        status: respuesta.status === 'ready' ? 'ok' : 'error',
        errorCode: respuesta.error?.code,
        latencyMs: respuesta.timing.finishedAt - respuesta.timing.startedAt,
        attempt: 1,
        at: respuesta.timing.finishedAt,
      };
      try {
        if (!trazaLimpia(operacion as unknown as Record<string, unknown>)) throw new Error('traza sucia');
        await ports.tracer.record(operacion);
        return respuesta;
      } catch {
        return { ...respuesta, warnings: [...respuesta.warnings, 'trace_not_recorded'] };
      }
    };

    const terminar = (status: WorkflowBuildStatus, extra: Partial<WorkflowResponse> = {}): Promise<WorkflowResponse> =>
      anotar({
        contract: WORKFLOW_CONTRACT_VERSION,
        status,
        trace: trace ?? trazaVacia,
        timing: { startedAt, finishedAt: ports.now() },
        warnings: [],
        ...extra,
      });

    const invalida = (f: Fallo): Promise<WorkflowResponse> =>
      terminar('invalid', { error: errorDelMotor('INVALID_REQUEST', f.reason, { field: f.field }) });

    try {
      if (!esObjetoDeDatos(request)) return invalida(invalido('request'));
      const claves = leerClaves(request, CLAVES_DE_PETICION, '');
      if (claves) return invalida(claves);
      if (!trace) return invalida(invalido('trace'));
      if (!esTexto(request.contract) || !contratoCompatible(request.contract, WORKFLOW_CONTRACT_VERSION)) return invalida(invalido('contract', 'contract_incompatible'));
      if (request.ids !== undefined) {
        if (!esObjetoDeDatos(request.ids) || Object.keys(request.ids).some((k) => k !== 'workflowId')) return invalida(invalido('ids'));
        if (request.ids.workflowId !== undefined && (!esTexto(request.ids.workflowId) || !FORMA_DE_ETIQUETA.test(request.ids.workflowId))) return invalida(invalido('ids.workflowId'));
      }
      /*
       * Identificadores distintos para cosas distintas, y todos atados a la
       * misma petición: se sigue el hilo por el sufijo. El derivado se
       * comprueba con la MISMA forma que exige el lector, porque un
       * `requestId` en el límite hacía que el motor construyera un workflow
       * que su propio `preparar` rechazaba. Lo encontró la auditoría.
       */
      const workflowId = request.ids?.workflowId ?? `wf_${trace.requestId}`;
      if (!FORMA_DE_ETIQUETA.test(workflowId)) return invalida(invalido(request.ids?.workflowId ? 'ids.workflowId' : 'trace.requestId', 'id_too_long'));

      if (esObjetoDeDatos(request.plan) && Array.isArray(request.plan.capabilities) && esTexto(request.plan.capabilities[0]) && CATALOGO.has(request.plan.capabilities[0] as CoreCapabilityId)) {
        capacidadPrincipal = request.plan.capabilities[0] as CoreCapabilityId;
      }
      const leido = leerPlan(request.plan, workflowId);
      if (!leido.ok) return invalida(leido);
      const grafo = revisarGrafo(leido.valor.workflow.steps);
      if (grafo) return invalida({ ...grafo, field: `plan.${grafo.field}` });
      return terminar('ready', { workflow: leido.valor.workflow, warnings: leido.valor.warnings });
    } catch {
      /* Un fallo de Weë, no de quien pidió. Se responde, queda en la traza, y no se cuenta el motivo: un mensaje de excepción lleva rutas y datos. */
      return terminar('failed', { error: errorDelMotor('INTERNAL_ERROR', 'workflow_failed') });
    }
  };

  return { construir, preparar: prepararWorkflow };
};
