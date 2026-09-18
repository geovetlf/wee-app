import { CapabilityId } from './capability';
import { ActualCost, Budget, CostEstimate } from './cost';
import { WeeError } from './errors';
import { WORKFLOW_CONTRACT_VERSION } from './contracts';

/**
 * WEE CORE — WORKFLOW. El contrato, no el motor.
 *
 * ── Lo que hay hoy, dicho sin adornos ───────────────────────────────────────
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
 * Declara la FORMA de un workflow para que el motor de la Fase 5 tenga dónde
 * encajar. No ejecuta nada, no toca Firestore y no sustituye al `while` actual,
 * que sigue funcionando igual hasta que haya con qué reemplazarlo.
 *
 * ── Una decisión que conviene entender ──────────────────────────────────────
 *
 * El paralelismo NO se declara: se DEDUCE de `dependsOn`. Dos pasos sin
 * dependencia entre ellos pueden ir a la vez, y punto. Un campo `parallel: true`
 * sería una segunda fuente de verdad que puede contradecir al grafo, y cuando se
 * contradigan ganará el bug.
 */

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
  capability: CapabilityId;
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
}

/**
 * UN WORKFLOW.
 *
 * `version` va dentro porque un trabajo puede tardar y quedarse a medias: cuando
 * se reanude, quien lo lea tiene que saber con qué reglas se escribió. Un
 * workflow guardado es un dato con vida propia, no una variable de la ejecución.
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
}

export type RunState = 'pending' | 'running' | 'paused' | 'awaiting_approval' | 'done' | 'failed' | 'cancelled';

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
