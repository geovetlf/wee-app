/**
 * WEE ALGORITHM ENGINE — A9 · EL CICLO.
 *
 * Dos funciones puras y nada más:
 *
 *   decidir(petición)                 A8 → [A1 enfoque] → A2 → [A4] → A3 → [A5] → A1 → entrega
 *   cerrar(resultado, observación)    A6 → A6 recuperación → resultado → [A7]
 *
 * Entre las dos pasa la ejecución, y pasa FUERA: Workflow, Orchestrator, Router
 * paso a paso, Job Engine, Gateway. A9 no ejecuta, no elige implementación, no
 * verifica por su cuenta y no aprende por su cuenta: cada una de esas cosas
 * tiene dueño, y aquí solo se le pasa lo suyo.
 *
 * ── La regla que se comprueba en cada línea ─────────────────────────────────
 *
 * Si una línea de este archivo DECIDE algo sobre el contenido —qué alternativa
 * es mejor, qué plan vale, qué pasó—, está mal. Lo único que se decide aquí es
 * la COMPOSICIÓN, y la declara quien pide.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { Evidence, Signal } from './signals';
import { AlgorithmDecision, DecisionContext } from './decision';
import { crearMotorDeDecision } from './decision-engine';
import { PuertosDeCapacidad, TareaADescomponer } from './decomposition';
import { Descomposicion, crearMotorDeDescomposicion } from './decomposition-engine';
import { crearMotorDeParalelizacion } from './parallelization-engine';
import { Strategy } from './strategy';
import { crearMotorDeEstrategias } from './strategy-engine';
import { crearMotorDeOptimizacion } from './optimization-engine';
import { VerificationEvaluator } from './verification';
import { crearMotorDeVerificacion } from './verification-engine';
import { ContextoDeRecuperacion } from './recovery';
import { crearMotorDeRecuperacion } from './recovery-engine';
import { ResultadoDeDecision } from './feedback';
import { DescriptorDeMetrica, crearMotorDeFeedback } from './feedback-engine';
import { crearMotorDeContexto, paraDecision } from './context-engine';
import { violacionesEn } from './authority';
import {
  AlgorithmDecisionResult, CierreDelCiclo, EntregaDeEjecucion, MotivoDeCierreInvalido, MotivoDeParada,
  ObservacionDeEjecucion, OpcionesDeAprendizaje, PasoDelCiclo, PeticionAlgoritmica, problemaDeObservacion,
} from './integration';

/**
 * LOS PUERTOS DEL CICLO: los de los motores que tienen puertos, tal cual.
 *
 * El ciclo no añade ninguno propio. Los evaluadores de calidad son el puerto de
 * A6 —el Quality Engine el día que exista—; las métricas, el de A7 y A8; los
 * puertos de capacidad, el de A2.
 */
export interface OpcionesDelCiclo {
  evaluadores?: readonly VerificationEvaluator[];
  metricas?: readonly DescriptorDeMetrica[];
  capacidades?: PuertosDeCapacidad;
}

/** La alternativa elegida, por su id: A1 devuelve el valor, y el id está en sus candidatos. */
const idDe = <T>(d: AlgorithmDecision<T>, valor: T | undefined): string | undefined =>
  (valor === undefined ? undefined : d.candidates.find((c) => c.value === valor)?.id);

/** Una señal medida es evidencia de su propia afirmación: lo que A5 sabe leer. */
const comoEvidencia = (senales: readonly Signal[]): readonly Evidence[] =>
  Object.freeze(senales.map((s) => Object.freeze({ claim: s.key, signal: s, supports: true })));

export const crearCicloAlgoritmico = (opciones: OpcionesDelCiclo = {}) => {
  const a1 = crearMotorDeDecision<unknown>();
  const a2 = crearMotorDeDescomposicion(opciones.capacidades ? { capacidades: opciones.capacidades } : {});
  const a3 = crearMotorDeEstrategias();
  const a4 = crearMotorDeParalelizacion();
  const a5 = crearMotorDeOptimizacion<Strategy>();
  const a6 = crearMotorDeVerificacion(opciones.evaluadores ? { evaluadores: opciones.evaluadores } : {});
  const a6r = crearMotorDeRecuperacion();
  const a7 = crearMotorDeFeedback(opciones.metricas ? { metricas: opciones.metricas } : {});
  const a8 = crearMotorDeContexto(opciones.metricas ? { metricas: opciones.metricas } : {});

  /* ── DECIDIR ────────────────────────────────────────────────────────────── */

  const decidir = <T = unknown>(peticion: PeticionAlgoritmica<T>): AlgorithmDecisionResult<T> => {
    const recorrido: PasoDelCiclo[] = [];
    const porque: string[] = [];
    let salida: Omit<AlgorithmDecisionResult<T>, 'contract' | 'status' | 'recorrido' | 'because'> = {};
    const fin = (status: AlgorithmDecisionResult['status'], parada?: MotivoDeParada): AlgorithmDecisionResult<T> =>
      Object.freeze({
        contract: ALGORITHM_CONTRACT_VERSION, status, recorrido: Object.freeze([...recorrido]),
        ...(parada ? { parada } : {}), ...salida, because: Object.freeze([...porque]),
      }) as AlgorithmDecisionResult<T>;

    /*
     * LA ENTREGA, y la guarda que solo existe aquí.
     *
     * El plan ya pasó por A3 y por A1, que rechazan lo que nombra una
     * implementación. Lo que NINGUNA autoridad mira antes de este punto es lo
     * que la petición trae en `constraints` y en `expected`, y eso también
     * cruza la frontera. Por eso la comprobación va aquí, sobre la entrega
     * ENTERA, con el mismo predicado del Planner.
     */
    const entregar = (parte: Pick<EntregaDeEjecucion, 'plan' | 'elegida'>): AlgorithmDecisionResult<T> => {
      const entrega: EntregaDeEjecucion = Object.freeze({
        ...parte,
        ...(peticion.decision.constraints ? { constraints: peticion.decision.constraints } : {}),
        ...(peticion.expected ? { expected: peticion.expected } : {}),
      });
      const cruces = violacionesEn(entrega, 'entrega');
      if (cruces.length) {
        porque.push(`La entrega nombraba una implementación (${cruces.map((c) => c.clave).join(', ')}): eso lo elige el Router.`);
        return fin('invalid', 'authority_violation');
      }
      recorrido.push('handoff');
      salida = { ...salida, entrega };
      porque.push(parte.plan
        ? `Plan entregado: ${parte.plan.steps.length} paso(s). La implementación de cada uno la elige el Router.`
        : `Alternativa entregada: ${parte.elegida ?? 'sin id'}.`);
      return fin('decided');
    };

    /* 0 · LA FORMA. Solo la mínima: lo demás lo juzga cada autoridad. */
    const d = peticion?.decision;
    if (typeof d !== 'object' || d === null) {
      porque.push('La petición no trae la decisión: no hay objetivo que perseguir.');
      return fin('invalid', 'malformed_request');
    }
    const opcionesDadas = Array.isArray(d.options) && d.options.length ? d.options : undefined;
    const enfoques = Array.isArray(peticion.enfoques) && peticion.enfoques.length ? peticion.enfoques : undefined;
    const tarea = peticion.tarea;
    if ([opcionesDadas, enfoques, tarea].filter((x) => x !== undefined).length > 1) {
      porque.push('Trae alternativas por más de un camino —opciones, enfoques o tarea—: elegir cuál vale sería decidir por quien pide.');
      return fin('invalid', 'ambiguous_alternatives');
    }
    if (peticion.aprendido && d.history) {
      porque.push('Declara un historial y pide a A8 que lo seleccione: dos fuentes para lo mismo, y no se elige una.');
      return fin('invalid', 'history_twice');
    }

    /* 1 · CONTEXTO. A8 selecciona lo aprendido; A1 lo recibe por su puerto. */
    let history = d.history;
    if (peticion.aprendido) {
      recorrido.push('context');
      const context = a8.seleccionar({ ...peticion.aprendido, objective: d.objective, budget: d.budget });
      salida = { ...salida, context, ...(peticion.aprendido.scope ? { ambito: peticion.aprendido.scope } : {}) };
      if (context.rechazo) {
        porque.push(`A8 rechazó el contexto (${context.rechazo}): sin él no se decide como si lo hubiera.`);
        return fin('invalid', 'context_rejected');
      }
      /* Sin ninguna admisión y cerrado en `unknown`: A8 no contesta para ese
       * ámbito. Seguir sin contexto sería contestar a otra pregunta. */
      if (context.cierre === 'unknown' && context.admisiones.length === 0) {
        porque.push('A8 no contesta para el ámbito de esta decisión: no se decide en su lugar con otro.');
        return fin('invalid', 'context_refused');
      }
      history = paraDecision(context).history;
    }
    const base: DecisionContext<unknown> = {
      ...(d as DecisionContext<unknown>),
      ...(history ? { history } : {}),
    };
    /* Lo que A1 va a recibir, leído de SU contexto y no de una variable aparte. */
    if (base.history) salida = { ...salida, historial: base.history };

    /* 2 · SIN TAREA: la decisión es entre lo que ya hay. */
    if (!tarea && !enfoques) {
      recorrido.push('decision');
      const decision = a1.decidir(base) as AlgorithmDecision<T | Strategy>;
      salida = { ...salida, decision };
      if (decision.status !== 'decided') {
        porque.push('A1 no eligió entre las alternativas dadas.');
        return fin(decision.status, 'undecided');
      }
      return entregar({ elegida: idDe(decision, decision.selected) });
    }

    /* 3 · ENFOQUE. Cuando lo primero es elegir qué tarea, lo elige A1. */
    let tareaElegida: TareaADescomponer | undefined = tarea;
    if (enfoques) {
      recorrido.push('approach');
      const approach = a1.decidir({ ...base, options: enfoques }) as AlgorithmDecision<TareaADescomponer>;
      salida = { ...salida, approach };
      if (approach.status !== 'decided' || !approach.selected) {
        porque.push('A1 no eligió enfoque: no hay tarea que estructurar.');
        return fin(approach.status === 'decided' ? 'undecided' : approach.status, 'approach_undecided');
      }
      tareaElegida = approach.selected;
    }
    const t = tareaElegida as TareaADescomponer;

    /* 4 · ESTRUCTURA. A2 es la autoridad sobre la tarea: si la rechaza, se para. */
    recorrido.push('decomposition');
    const decomposition = a2.descomponer(t, d.constraints, d.budget);
    salida = { ...salida, decomposition };
    if (decomposition.problemas.length) {
      porque.push(`A2 rechazó la tarea: ${decomposition.problemas.map((p) => p.reason).join(', ')}.`);
      return fin('invalid', 'invalid_task');
    }
    let formas: readonly Descomposicion[] = decomposition.opciones.map((o) => o.value);

    /* 5 · PARALELISMO, si se pidió. A4 es la autoridad sobre la forma paralela. */
    if (peticion.componer?.paralelizar) {
      recorrido.push('parallelization');
      const p = a4.variantes(t, d.signals ?? [], d.constraints, d.budget);
      salida = { ...salida, parallelization: p.analisis };
      formas = p.variantes;
    }

    /* 6 · ESTRATEGIAS. Solo A3 las genera. */
    recorrido.push('strategy');
    const strategies = a3.proponer(formas, d.signals ?? [], d.constraints, d.budget);
    salida = { ...salida, strategies };
    let candidatas = strategies.estrategias;

    /* 7 · OPTIMIZACIÓN, si se pidió. A5 dice qué es factible y qué mejora; no elige. */
    if (peticion.componer?.optimizar) {
      recorrido.push('optimization');
      const baseline = candidatas.find((c) => c.value.isBaseline);
      const optimization = a5.optimizar({
        candidates: candidatas,
        objective: d.objective,
        ...(d.constraints ? { constraints: d.constraints } : {}),
        ...(d.budget ? { budget: d.budget } : {}),
        evidence: comoEvidencia(d.signals ?? []),
        ...(baseline ? { baselineId: baseline.id } : {}),
        ...(typeof d.seed === 'number' ? { seed: d.seed } : {}),
      });
      salida = { ...salida, optimization };
      candidatas = [...optimization.feasible, ...optimization.proposals.map((p) => p.result)];
    }

    /* 8 · DECISIÓN. A1, entre lo que A3 generó y A5 dejó en pie o propuso. */
    recorrido.push('decision');
    const decision = a1.decidir({ ...base, options: candidatas, signals: strategies.signals }) as AlgorithmDecision<T | Strategy>;
    salida = { ...salida, decision };
    if (decision.status !== 'decided' || !decision.selected) {
      porque.push('A1 no eligió entre las estrategias.');
      return fin(decision.status === 'decided' ? 'undecided' : decision.status, 'undecided');
    }
    return entregar({ plan: decision.selected as Strategy });

  };

  /* ── CERRAR ─────────────────────────────────────────────────────────────── */

  const cerrar = (
    resultado: AlgorithmDecisionResult,
    observacion: ObservacionDeEjecucion,
    aprendizaje?: OpcionesDeAprendizaje,
  ): CierreDelCiclo => {
    const porque: string[] = [];
    const invalido = (parada: MotivoDeCierreInvalido): CierreDelCiclo =>
      Object.freeze({ contract: ALGORITHM_CONTRACT_VERSION, status: 'invalid' as const, parada, because: Object.freeze(porque) });

    const entrega = resultado?.status === 'decided' ? resultado.entrega : undefined;
    if (!entrega) {
      porque.push('No hubo decisión entregada: no hay nada que cerrar.');
      return invalido('not_decided');
    }
    const malo = problemaDeObservacion(observacion);
    if (malo) {
      porque.push(`La observación no vale: ${malo}.`);
      return invalido('malformed_observation');
    }

    /* A6 verifica lo que salió contra lo esperado. A9 no dice si pasó. */
    const verification = a6.verificar({
      expected: entrega.expected ?? [],
      actual: observacion.actual,
      ...(entrega.constraints ? { constraints: entrega.constraints } : {}),
    });
    /* Y propone qué hacer si no pasó, con lo que la decisión ya sabía. Nada se ejecuta. */
    const decision = resultado.decision;
    const contexto: ContextoDeRecuperacion = {
      ...(decision ? { alternatives: decision.alternatives.map((v) => idDe(decision, v)).filter((x): x is string => !!x) } : {}),
      hasFallback: (resultado.strategies?.estrategias ?? []).some((c) => c.value.isFallback === true),
    };
    const recovery = a6r.analizar(verification, contexto);

    /* El resultado de la decisión, en el vocabulario de A7, en el ámbito en que se decidió. */
    const outcome: ResultadoDeDecision = Object.freeze({
      id: observacion.actual.id,
      kind: observacion.kind,
      at: observacion.at,
      ...(resultado.ambito ? { scope: resultado.ambito } : {}),
      verification: Object.freeze({ status: verification.status, passed: verification.passed, confidence: verification.confidence }),
      ...(observacion.recovery ? { recovery: observacion.recovery } : {}),
      ...(observacion.signals ? { signals: observacion.signals } : {}),
    });
    porque.push(`A6: ${verification.status}. Resultado: ${outcome.kind}.`);

    /* A7 aprende, si se le da con qué reloj. */
    const learning = aprendizaje
      ? a7.aprender({ ahora: aprendizaje.ahora, previo: aprendizaje.previo, policy: aprendizaje.policy, outcomes: [outcome] })
      : undefined;
    if (learning) porque.push(learning.rechazo ? `A7 rechazó el aprendizaje (${learning.rechazo}).` : 'A7 acumuló el resultado.');

    return Object.freeze({
      contract: ALGORITHM_CONTRACT_VERSION,
      status: 'closed' as const,
      verification,
      recovery,
      outcome,
      ...(learning ? { learning } : {}),
      because: Object.freeze(porque),
    });
  };

  return { decidir, cerrar };
};
