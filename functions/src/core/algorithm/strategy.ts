/**
 * WEE ALGORITHM ENGINE — UNA FORMA DE HACER EL TRABAJO.
 *
 * ── Lo que hoy no se puede decir ────────────────────────────────────────────
 *
 * Weë produce UN plan y lo ejecuta. No hay manera de escribir «esto también se
 * podría hacer así», y por tanto no hay manera de compararlo con nada. Una
 * estrategia es exactamente eso: una propuesta completa y alternativa, con lo
 * que se espera que cueste, tarde y valga, y con lo que hay que comprobar para
 * darla por buena.
 *
 * ── Qué NO es una estrategia ────────────────────────────────────────────────
 *
 * No es un plan. El Planner sigue siendo la autoridad de qué capacidades hacen
 * falta, y por eso una estrategia se escribe con SUS pasos (`PlanStep`, tal
 * cual, sin envolver): lo que aporta esta capa no son otros pasos, es otra
 * FORMA — qué va con qué, qué se comprueba, qué se hace si algo falla.
 *
 * No es un workflow. `WorkflowStep` ya tiene reintentos, plazos, condiciones y
 * aprobaciones, y construirlos aquí sería escribir un segundo Workflow Engine.
 * Una estrategia RECOMIENDA; el Workflow Engine y el Orchestrator ejecutan.
 *
 * No nombra a nadie. Ni proveedor, ni modelo, ni adaptador. Lo comprueba
 * `authority.ts` con el mismo predicado que usa el Planner.
 *
 * ── Los números que trae ────────────────────────────────────────────────────
 *
 * `expected` es lo que se cree que va a pasar, y va con su confianza SIEMPRE.
 * Una estrategia que promete «8 segundos» sin decir de dónde sale ese 8 es la
 * clase de dato que acaba en una pantalla como si fuera cierto.
 */

import { PlanStep } from '../planner';
import { QualityRequirement } from '../workflow';
import { Confidence, Uncertainty } from './signals';

/* ── Lo que puede ir a la vez ─────────────────────────────────────────────── */

/**
 * UN GRUPO DE PASOS INDEPENDIENTES.
 *
 * Representación, no ejecución. Quien pone cosas en paralelo de verdad es el
 * Orchestrator, que ya lo hace (`StepDispatch` despacha todo lo que está listo)
 * y al que esta capa no toca. Lo que falta hoy es poder DECIR «estos tres no se
 * necesitan entre sí» para poder estimar cuánto se ahorraría.
 */
export interface ParallelGroup {
  /** Ids de pasos que no dependen unos de otros. */
  steps: readonly string[];
  /** Cuántos a la vez como mucho. Ausente = los que quepan. */
  maxConcurrency?: number;
  /** Cuánto se cree que se ahorra frente a hacerlos en fila. */
  expectedSavingsMs?: number;
  /**
   * Qué puede salir mal por ir a la vez, 0–1.
   *
   * No es cero por defecto: lo simultáneo comparte cuota de proveedor, comparte
   * límites y multiplica el coste de un fallo a mitad de camino. Una
   * paralelización sin riesgo declarado es una que nadie ha pensado.
   */
  risk?: number;
}

/**
 * LOS NIVELES DE DEPENDENCIA: qué puede ir junto.
 *
 * Nivel 0 = lo que puede empezar ya; nivel n = lo que necesita algo del n−1.
 *
 * ── Por qué no reutiliza lo que ya hay ──────────────────────────────────────
 *
 * `ordenarPorDependencia` (`core/planner.ts`) responde otra pregunta —en qué
 * ORDEN, y sobre capacidades y modalidades, no sobre ids—. Y `pasosListos`
 * (`core/workflow.ts`) responde «qué puede ir AHORA» mirando un estado de
 * ejecución que aquí todavía no existe: esto se calcula ANTES de ejecutar nada.
 * Son tres preguntas distintas y se responden por separado a propósito.
 *
 * Lo que no encaja —un ciclo, una dependencia a un paso que no existe— se
 * devuelve aparte y NO se coloca a la fuerza, igual que hace el Planner. Un
 * paso mal atado no es un paso de nivel 0: es un error de la estrategia.
 */
export const nivelesDeDependencia = (
  steps: readonly PlanStep[],
): { niveles: readonly (readonly string[])[]; sinResolver: readonly string[] } => {
  const existentes = new Set(steps.map((s) => s.id));
  const pendientes = new Map(steps.map((s) => [s.id, (s.dependsOn ?? []).filter((d) => existentes.has(d))]));
  /* Una dependencia a un paso inexistente no se ignora: invalida ese paso. */
  const rotos = steps.filter((s) => (s.dependsOn ?? []).some((d) => !existentes.has(d))).map((s) => s.id);
  for (const id of rotos) pendientes.delete(id);

  const niveles: string[][] = [];
  const hechos = new Set<string>();
  while (pendientes.size) {
    const nivel = [...pendientes.entries()]
      .filter(([, deps]) => deps.every((d) => hechos.has(d)))
      .map(([id]) => id);
    /* Nadie puede avanzar: lo que queda es un ciclo. */
    if (!nivel.length) break;
    for (const id of nivel) { hechos.add(id); pendientes.delete(id); }
    niveles.push(nivel);
  }
  return { niveles, sinResolver: [...rotos, ...pendientes.keys()] };
};

/** Los grupos que salen de los niveles: los que tienen más de uno son los que ahorran. */
export const gruposDeNiveles = (niveles: readonly (readonly string[])[]): readonly ParallelGroup[] =>
  niveles.filter((n) => n.length > 1).map((steps) => ({ steps }));

/* ── Qué hay que comprobar ────────────────────────────────────────────────── */

/**
 * UN PUNTO DE COMPROBACIÓN.
 *
 * «¿Qué tiene que ser cierto para aceptar esto?», puesto donde toca en la
 * estrategia y no al final. Comprobar solo al final es descubrir en el paso
 * nueve que el paso dos ya estaba mal, habiendo pagado los siete de en medio.
 *
 * El requisito es `QualityRequirement` de `core/workflow.ts`, sin envolver: ya
 * tiene mínimo, comprobaciones y qué hacer por debajo. Lo que esta capa añade
 * es DÓNDE se comprueba, que es lo que allí no se podía decir.
 */
export interface Checkpoint {
  /** Después de qué paso se comprueba. */
  afterStepId: string;
  requirement: QualityRequirement;
  /** Qué se comprueba, en una frase, para el informe. */
  claim?: string;
}

/* ── Qué hacer si algo falla ──────────────────────────────────────────────── */

/**
 * UNA RECUPERACIÓN PROPUESTA. Propuesta, y esa palabra es el contrato entero.
 *
 * Los reintentos ya tienen dueño: `RetryPolicy` en el paso y el Job Engine
 * ejecutándolos. Esta capa no reintenta nada y no puede; lo que aporta es poder
 * RECOMENDAR qué tipo de recuperación tiene sentido para ESTE fallo, que hoy se
 * decide con una política fija igual para todos.
 */
export type RecoveryKind =
  /* Lo mismo otra vez. Lo ejecuta el Job Engine con su `RetryPolicy`. */
  | 'retry'
  /* Otra estrategia de las que ya se evaluaron. */
  | 'alternative_strategy'
  /* Quedarse con lo que sí salió y seguir sin el resto. */
  | 'partial'
  /* Volver a pensar con la evidencia nueva. */
  | 'replan'
  /* Pasárselo al algoritmo declarado como `fallback`. */
  | 'fallback'
  /* Parar. Con reembolso, que de eso ya sabe el Financial Core. */
  | 'abort';

export interface RecoveryProposal {
  kind: RecoveryKind;
  /** Por qué esta y no otra. */
  because: string;
  /** A qué estrategia ir, cuando `kind` es `alternative_strategy`. */
  strategyId?: string;
  /** Cuánto se cree que funcionará, con su base. */
  confidence?: Confidence;
}

/* ── Lo que se espera que pase ────────────────────────────────────────────── */

/**
 * LA PREVISIÓN, CON SU INCERTIDUMBRE PEGADA.
 *
 * Todos los campos opcionales porque casi nunca se saben todos, y ninguno vale
 * sin `confidence`: esta capa existe en parte para acabar con los números
 * sueltos que parecen medidos.
 *
 * `costUsd` es coste de proveedor, no Credits. Los Credits los calcula el
 * Financial Core con su margen y su suelo, y escribir uno aquí sería un precio
 * inventado — lo que Weë tiene prohibido.
 */
export interface StrategyExpectation {
  costUsd?: number;
  latencyMs?: number;
  /** 0–1, en la escala de `QualityRequirement.minScore`. */
  quality?: number;
  /** 0–1. Lo que puede salir mal. */
  risk?: number;
  /** 0–1. Que termine bien a la primera. */
  successProbability?: number;
  /** Cuánto de todo esto se sabe. Obligatoria: sin ella son números sueltos. */
  confidence: Confidence;
  /** El eje honesto: cuando no hay evidencia, se dice. */
  uncertainty: Uncertainty;
}

/* ── La estrategia ────────────────────────────────────────────────────────── */

/**
 * UNA FORMA COMPLETA DE HACER EL TRABAJO.
 *
 * `steps` son `PlanStep` del Core, tal cual. No se envuelven, no se extienden y
 * no se copian con otro nombre: si una estrategia necesitara un campo que un
 * paso no tiene, eso es una señal de que el campo pertenece al Planner.
 */
export interface Strategy {
  /** Único dentro de la decisión que la produjo. */
  id: string;
  /** Qué la distingue de las otras, en una frase: 'en paralelo', 'sin la ilustración'. */
  label: string;
  /** Qué algoritmo la propuso. `id@version`. */
  proposedBy: string;
  steps: readonly PlanStep[];
  /** Lo que puede ir junto. Derivable de `steps`, y explícito para poder acotarlo. */
  parallelGroups?: readonly ParallelGroup[];
  checkpoints?: readonly Checkpoint[];
  /** Qué hacer si falla, por tipo de fallo. */
  recovery?: readonly RecoveryProposal[];
  expected: StrategyExpectation;
}

/**
 * ¿ES COHERENTE CONSIGO MISMA?
 *
 * Solo lo que se puede afirmar mirando la estrategia: que los pasos existen,
 * que las dependencias apuntan a algo, que no hay ciclos, que los grupos y los
 * puntos de comprobación nombran pasos reales, y que nada va en paralelo con
 * algo de lo que depende.
 *
 * Lo que NO comprueba: si las capacidades existen —eso es del catálogo—, ni si
 * cabe en el presupuesto —eso necesita estimar—. Afirmar cualquiera de las dos
 * desde aquí sería inventar.
 *
 * Devuelve TODOS los problemas, como el resto del Core.
 */
export const problemasDeEstrategia = (s: Strategy): readonly string[] => {
  const malos: string[] = [];
  if (!s || typeof s !== 'object') return ['strategy'];
  if (!Array.isArray(s.steps) || s.steps.length === 0) return ['steps'];

  const ids = s.steps.map((p) => p.id);
  const unicos = new Set(ids);
  if (unicos.size !== ids.length) malos.push('steps:duplicated_id');

  const { niveles, sinResolver } = nivelesDeDependencia(s.steps);
  for (const id of sinResolver) malos.push(`steps:${id}:unresolvable`);

  /* En qué nivel está cada paso: lo que permite ver un paralelo imposible. */
  const nivelDe = new Map<string, number>();
  niveles.forEach((n, i) => n.forEach((id) => nivelDe.set(id, i)));

  for (const g of s.parallelGroups ?? []) {
    if (!Array.isArray(g.steps) || g.steps.length < 2) { malos.push('parallelGroups:too_small'); continue; }
    for (const id of g.steps) if (!unicos.has(id)) malos.push(`parallelGroups:${id}:unknown_step`);
    if (g.maxConcurrency !== undefined && (!Number.isFinite(g.maxConcurrency) || g.maxConcurrency < 1)) {
      malos.push('parallelGroups:maxConcurrency');
    }
    /*
     * Lo que de verdad importa comprobar: nada puede ir a la vez que algo de lo
     * que depende. Un grupo así se ejecutaría y daría un resultado incorrecto
     * sin fallar, que es la peor clase de error.
     */
    const dentro = new Set(g.steps);
    for (const paso of s.steps) {
      if (!dentro.has(paso.id)) continue;
      for (const dep of paso.dependsOn ?? []) {
        if (dentro.has(dep)) malos.push(`parallelGroups:${paso.id}:depends_on:${dep}`);
      }
    }
  }

  for (const c of s.checkpoints ?? []) {
    if (!unicos.has(c.afterStepId)) malos.push(`checkpoints:${c.afterStepId}:unknown_step`);
  }
  for (const r of s.recovery ?? []) {
    if (r.kind === 'alternative_strategy' && !r.strategyId) malos.push('recovery:alternative_strategy:no_target');
  }
  if (!s.expected || !s.expected.confidence) malos.push('expected:confidence');
  if (!s.expected?.uncertainty) malos.push('expected:uncertainty');
  if (!s.id) malos.push('id');
  if (!s.proposedBy) malos.push('proposedBy');
  return malos;
};

export const estrategiaCoherente = (s: Strategy): boolean => problemasDeEstrategia(s).length === 0;
