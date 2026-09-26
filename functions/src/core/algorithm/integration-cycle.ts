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
import { Evidence, Signal, resolverSenales } from './signals';
import { AlgorithmDecision, DecisionContext } from './decision';
import { crearMotorDeDecision, restriccionesEfectivas } from './decision-engine';
import { problemasDeLosLados } from './objective';
import { presupuestoEfectivo, problemasDelPresupuesto } from './budget';
import { PuertosDeCapacidad, TareaADescomponer } from './decomposition';
import { Descomposicion, crearMotorDeDescomposicion } from './decomposition-engine';
import { crearMotorDeParalelizacion } from './parallelization-engine';
import { Strategy, nivelesDeDependencia } from './strategy';
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

/** Cuántos de cada motivo, en orden fijo: `max_steps_exceeded ×2, constraint:maxLatencyMs ×1`. */
const cuentaDeMotivos = (motivos: readonly string[]): string => {
  const n = new Map<string, number>();
  for (const m of motivos) n.set(m, (n.get(m) ?? 0) + 1);
  return [...n.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([m, k]) => `${m} ×${k}`).join(', ');
};
const esDeRestriccion = (motivo: string): boolean => motivo === 'max_steps_exceeded' || motivo === 'max_parallel_exceeded'
  || motivo.startsWith('constraint:') || motivo === 'constraint' || motivo === 'unverifiable' || motivo === 'resource';

/**
 * POR QUÉ LA COMPOSICIÓN SE QUEDÓ SIN ALTERNATIVAS ANTES DE A1 (S2-B.5).
 *
 * Solo lee lo que cada autoridad ya devolvió —los descartes de A2, A4, A3 y A5
 * con sus motivos de siempre, y sus marcas de presupuesto—, del camino que de
 * verdad alimentó la decisión: A2 sin `paralelizar`, A4 con él. No decide nada ni
 * cambia nada: A1 sigue recibiendo la lista vacía y sigue diciendo lo que ve
 * («No llegó ninguna alternativa que evaluar»); esto dice en el `because` del
 * ciclo lo que pasó antes, que A1 no puede saber. `maxDepth` no llega aquí: el
 * ciclo ya se paró (S2-B.4).
 */
const porQueSeVacio = (paralelizar: boolean, r: Pick<AlgorithmDecisionResult, 'decomposition' | 'parallelization' | 'strategies' | 'optimization'>): string => {
  const partes: string[] = [];
  const di = (quien: string, que: string, motivos: readonly string[]): void => {
    if (!motivos.length) return;
    const todas = motivos.every(esDeRestriccion);
    partes.push(`${quien} descartó ${motivos.length} ${que}${todas ? ' por restricciones' : ''} (${cuentaDeMotivos(motivos)})`);
  };
  if (!paralelizar) {
    di('A2', 'disposición(es)', (r.decomposition?.rechazadas ?? []).map((x) => x.reason));
    if (r.decomposition?.metricas.optionLimitReached && !(r.decomposition.opciones.length)) {
      partes.push('el presupuesto de pensar no dejó a A2 proponer ninguna disposición (`optionLimitReached`)');
    }
  } else if (r.parallelization?.metricas.budgetExhausted && !r.parallelization.metricas.variants) {
    partes.push('el presupuesto de pensar no dejó a A4 proponer ninguna variante (`budgetExhausted`)');
  }
  di('A3', 'estrategia(s)', (r.strategies?.rechazadas ?? []).map((x) => x.reason));
  if (r.strategies?.metricas.budgetExhausted && !r.strategies.estrategias.length) {
    partes.push('el presupuesto de pensar no dejó a A3 construir ninguna estrategia (`budgetExhausted`)');
  }
  di('A5', 'candidata(s) por inviables', (r.optimization?.rejected ?? []).map((x) => x.why?.reason ?? 'malformed'));
  return `La composición se quedó sin alternativas antes de A1 —no es que no llegara ninguna—: ${partes.join('; ') || 'sin un motivo que lo explique'}.`;
};

/**
 * (1.12 · S2-C.1 · V) ¿SE VACIÓ POR EL PRESUPUESTO DE PENSAR? Las mismas marcas que usa
 * `porQueSeVacio` —A2 sin opciones por `optionLimitReached`, A4 sin variantes por
 * `budgetExhausted`, A3 sin estrategias por `budgetExhausted`—, del camino que alimentó la
 * decisión. Si alguna está, la parada es `budget_exceeded`; si no, `composition_emptied`.
 */
const porElPresupuesto = (paralelizar: boolean, r: Pick<AlgorithmDecisionResult, 'decomposition' | 'parallelization' | 'strategies'>): boolean =>
  (!paralelizar && !!r.decomposition?.metricas.optionLimitReached && !r.decomposition.opciones.length)
  || (paralelizar && !!r.parallelization?.metricas.budgetExhausted && !r.parallelization.metricas.variants)
  || (!!r.strategies?.metricas.budgetExhausted && !r.strategies.estrategias.length);

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
      /*
       * Las EFECTIVAS (S2-A): las de la petición y las de su objetivo, con lo
       * más estrecho mandando —las mismas con las que decidió A1—. Antes viajaban
       * solo las de la petición, y un requisito escrito en el objetivo obligaba
       * a decidir pero no llegaba a quien ejecuta.
       */
      const exigido = restriccionesEfectivas(peticion.decision);
      const entrega: EntregaDeEjecucion = Object.freeze({
        ...parte,
        ...(exigido ? { constraints: exigido } : {}),
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
    if (peticion.aprendido && (d.history !== undefined || d.historyByOption !== undefined)) {
      porque.push('Declara un historial y pide a A8 que lo seleccione: dos fuentes para lo mismo, y no se elige una.');
      return fin('invalid', 'history_twice');
    }

    /*
     * 0b · LA FRONTERA EN LO QUE SE PIDE (S2-A). Lo que rige es la suma del
     * objetivo y de las restricciones, con lo más estrecho mandando: lo mismo
     * que usa A1, lo mismo que recibe cada autoridad y lo mismo que viaja en la
     * entrega. Si nombra una implementación no se piensa nada: la entrega
     * llevaría un requisito que elige con qué hacerlo, y eso es del Router.
     *
     * Desde S2-B la frontera se mira sobre los DOS lados tal como llegan —cada
     * uno desde su raíz, las mismas claves que su suma— y la suma se hace
     * DESPUÉS de validarlos: nada se funde antes de saber que se puede fundir.
     *
     * Y el ÁMBITO en que se pide decidir. Un ámbito que nombra una implementación
     * condiciona la decisión a algo que el Router todavía no ha elegido: A8 sirve
     * el historial de ese ámbito exacto y el cierre aprendería dentro de él.
     * Medido: con el mismo aprendido, `providerId` en el ámbito cambiaba la
     * alternativa elegida. Lo aprendido (`learned`) sí puede DESCRIBIR
     * implementaciones —es lo que pasó, y A8 no se lo sirve a una decisión de
     * otro ámbito—; lo que se PIDE, no.
     */
    const pedidoDeContexto = peticion.aprendido ? { ...peticion.aprendido, learned: undefined } : undefined;
    const cruzan = [
      ...violacionesEn(d.objective, 'objective'),
      ...violacionesEn(d.objective?.constraints, 'constraints'),
      ...violacionesEn(d.constraints, 'constraints'),
      ...violacionesEn(pedidoDeContexto, 'aprendido'),
    ];
    if (cruzan.length) {
      porque.push(`La petición nombra una implementación en sus requisitos o en su ámbito (${[...new Set(cruzan.map((c) => c.clave))].sort().join(', ')}): eso lo elige el Router.`);
      return fin('invalid', 'authority_violation');
    }

    /*
     * 0b · Y LAS RESTRICCIONES, BIEN FORMADAS, ANTES DE COMPONER NADA (S2-B · B.1).
     *
     * Cada lado con la regla de A1 (`problemasDeLosLados`). Antes, un `NaN` o un
     * infinito cruzaban A2–A5 sin que nadie los mirara —solo A1 valida, y es la
     * última— y cada autoridad lo leía a su manera: `maxRisk: NaN` no excluía
     * nada en A3 y excluía todo en A1. Ahora el ciclo se para aquí, antes del
     * contexto y de A2, y quien lo dice es A1, la dueña de ese veredicto: se le
     * pregunta, contesta `constraint_conflict` nombrando lado, campo y motivo, y
     * no se compone nada.
     */
    /* (S2-B · B.4) Con los topes de pensar que se leen —`maxEvidence`, `maxDepth`—: la misma regla, y A1 lo dice igual. */
    const malFormadas = [...problemasDeLosLados(d.objective?.constraints, d.constraints), ...problemasDelPresupuesto(d.budget)];
    if (malFormadas.length) {
      recorrido.push('decision');
      const decision = a1.decidir(d as DecisionContext<unknown>) as AlgorithmDecision<T | Strategy>;
      salida = { ...salida, decision };
      porque.push(`Restricciones mal formadas (${malFormadas.join('; ')}): se para antes de componer, y A1 lo dice como conflicto de restricciones.`);
      return fin(decision.status === 'decided' ? 'undecided' : decision.status, 'undecided');
    }
    const restricciones = restriccionesEfectivas(d);

    /* 1 · CONTEXTO. A8 selecciona lo aprendido; A1 lo recibe por su puerto: el del
     * ámbito y el de cada alternativa, los dos de A8 y ninguno fabricado aquí. */
    let history = d.history;
    let historyByOption = d.historyByOption;
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
      const paraA1 = paraDecision(context);
      history = paraA1.history;
      historyByOption = paraA1.historyByOption;
    }
    const base: DecisionContext<unknown> = {
      ...(d as DecisionContext<unknown>),
      ...(history ? { history } : {}),
      ...(historyByOption ? { historyByOption } : {}),
    };
    /* Lo que A1 va a recibir, leído de SU contexto y no de una variable aparte. */
    if (base.history) salida = { ...salida, historial: base.history };
    if (base.historyByOption) salida = { ...salida, historialPorAlternativa: base.historyByOption };

    /* 2 · SIN TAREA: la decisión es entre lo que ya hay. */
    if (!tarea && !enfoques) {
      recorrido.push('decision');
      const decision = a1.decidir(base) as AlgorithmDecision<T | Strategy>;
      salida = { ...salida, decision };
      if (decision.status !== 'decided') {
        porque.push('A1 no eligió entre las alternativas dadas.');
        /* (1.12) Si fue el presupuesto el que no dejó mirar ninguna, la parada lo dice con el nombre del fallo de A1. */
        return fin(decision.status, decision.failure === 'budget_exceeded' ? 'budget_exceeded' : 'undecided');
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
    const decomposition = a2.descomponer(t, restricciones, d.budget);
    salida = { ...salida, decomposition };
    if (decomposition.problemas.length) {
      porque.push(`A2 rechazó la tarea: ${decomposition.problemas.map((p) => p.reason).join(', ')}.`);
      return fin('invalid', 'invalid_task');
    }
    let formas: readonly Descomposicion[] = decomposition.opciones.map((o) => o.value);

    /*
     * (S2-B · B.3) LAS SEÑALES DE LA PETICIÓN, RESUELTAS UNA VEZ para A4, A3 y A5.
     * Cada una las resolvía por su cuenta —el mismo trabajo tres veces— y ninguna
     * usa otra cosa que lo resuelto; resolver lo ya resuelto da lo mismo (una por
     * clave y sujeto, todas válidas, en su orden), así que lo que componen es
     * idéntico. A1 no: por el camino de opciones y de enfoques recibe las de la
     * petición tal cual, porque sus conflictos son parte de lo que dice.
     */
    const senales = resolverSenales(d.signals ?? []).resueltas;

    /* 5 · PARALELISMO, si se pidió. A4 es la autoridad sobre la forma paralela. */
    if (peticion.componer?.paralelizar) {
      recorrido.push('parallelization');
      const p = a4.variantes(t, senales, restricciones, d.budget);
      salida = { ...salida, parallelization: p.analisis };
      formas = p.variantes;
    }

    /* 6 · ESTRATEGIAS. Solo A3 las genera. */
    recorrido.push('strategy');
    const strategies = a3.proponer(formas, senales, restricciones, d.budget);
    salida = { ...salida, strategies };
    let candidatas = strategies.estrategias;

    /*
     * 6b · EL PLAN EXISTE Y NO CABE EN `maxDepth` (S2-B · B.4).
     *
     * `maxDepth` es un tope de PENSAR: cuántas tandas en secuencia puede tener una
     * disposición para que A2 y A3 la analicen. Cuando alguna cabe, las demás se
     * quedan fuera con su motivo y se decide entre las que caben, como siempre.
     * Cuando NINGUNA cabe —el plan tiene más niveles de dependencia que el tope—,
     * la composición se queda vacía, y hasta S2-B se le pasaba a A1 una lista
     * vacía para que dijera «No llegó ninguna alternativa que evaluar»: como si
     * el plan no existiera. Ahora el ciclo se para aquí y lo dice: el plan
     * existe, con sus pasos y sus niveles, y no cabe en el tope. No se inventa
     * una alternativa, no se le pide a A1 que elija entre nada y no se ejecuta
     * nada. La razón estructurada ya viaja en el resultado: `max_depth_exceeded`
     * en A2 y `constraint:maxDepth` en A3, con sus nombres de siempre.
     *
     * Hasta 1.11 la parada era `undecided`; desde 1.12 (S2-C.1 · V) es su motivo
     * propio, `max_depth_exceeded` —el mismo nombre que en A2—, y el recorrido sin
     * `decision` sigue diciendo que A1 no llegó a correr.
     *
     * Solo cuando el tope cortó ALGO: si la composición se vació por otras
     * razones —restricciones—, el ciclo sigue como siempre.
     */
    if (!candidatas.length) {
      const deA2 = peticion.componer?.paralelizar ? [] : decomposition.rechazadas;
      const porProfundidad = deA2.filter((r) => r.reason === 'max_depth_exceeded').length
        + strategies.rechazadas.filter((r) => r.reason === 'constraint:maxDepth').length;
      if (porProfundidad) {
        const otras = deA2.length + strategies.rechazadas.length - porProfundidad;
        porque.push(`El plan existe —${t.steps.length} paso(s), ${nivelesDeDependencia(t.steps).niveles.length} nivel(es) de dependencia— `
          + `pero ninguna de sus disposiciones cabe en el presupuesto de profundidad (maxDepth ${presupuestoEfectivo(d.budget).maxDepth}): `
          + `fuera por él, ${porProfundidad} disposición(es)${otras ? `; por otros motivos, ${otras}` : ''}. `
          + 'Se para aquí: ni se inventa una alternativa ni se le pide a A1 que elija entre nada.');
        return fin('undecided', 'max_depth_exceeded');
      }
    }

    /* 7 · OPTIMIZACIÓN, si se pidió. A5 dice qué es factible y qué mejora; no elige. */
    if (peticion.componer?.optimizar) {
      recorrido.push('optimization');
      const baseline = candidatas.find((c) => c.value.isBaseline);
      const optimization = a5.optimizar({
        candidates: candidatas,
        objective: d.objective,
        ...(restricciones ? { constraints: restricciones } : {}),
        ...(d.budget ? { budget: d.budget } : {}),
        evidence: comoEvidencia(senales),
        ...(baseline ? { baselineId: baseline.id } : {}),
        ...(typeof d.seed === 'number' ? { seed: d.seed } : {}),
      });
      salida = { ...salida, optimization };
      candidatas = [...optimization.feasible, ...optimization.proposals.map((p) => p.result)];
    }

    /*
     * 7b · (S2-B.5) Si la composición se quedó sin alternativas por otra cosa que
     * `maxDepth` —restricciones, el presupuesto de candidatas—, el ciclo lo dice
     * con lo que las autoridades devolvieron. La decisión no cambia: A1 corre
     * igual, sobre la lista vacía.
     */
    const vaciada = !candidatas.length;
    if (vaciada) porque.push(porQueSeVacio(peticion.componer?.paralelizar === true, salida));

    /* 8 · DECISIÓN. A1, entre lo que A3 generó y A5 dejó en pie o propuso. */
    recorrido.push('decision');
    const decision = a1.decidir({ ...base, options: candidatas, signals: strategies.signals }) as AlgorithmDecision<T | Strategy>;
    salida = { ...salida, decision };
    if (decision.status !== 'decided' || !decision.selected) {
      porque.push('A1 no eligió entre las estrategias.');
      /*
       * (1.12 · S2-C.1 · V) La parada dice POR QUÉ con un motivo propio: una composición
       * vaciada por el presupuesto de pensar es `budget_exceeded` —el mismo nombre que el
       * fallo de A1 por opciones—, y por lo demás, `composition_emptied`. A1 corrió igual:
       * la decisión es la de siempre, solo cambia el nombre de la parada.
       */
      const parada: MotivoDeParada = vaciada
        ? (porElPresupuesto(peticion.componer?.paralelizar === true, salida) ? 'budget_exceeded' : 'composition_emptied')
        : decision.failure === 'budget_exceeded' ? 'budget_exceeded' : 'undecided';
      return fin(decision.status === 'decided' ? 'undecided' : decision.status, parada);
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

    /*
     * (S2-C.1 · D3) LO OBSERVADO DEL RESULTADO: las señales cuyo `subject` es el `id` de
     * lo que salió. Es la evidencia que A6 necesita para comprobar los topes —hasta 1.11
     * no se le pasaba, y cerraba `unknown`— y lo medido que A7 aprende de este resultado.
     * Lo de un paso, lo de otro resultado o una `result.*` sin sujeto no es suyo: ni se
     * le atribuye ni se mezcla. Quien ejecuta lo produce con su sujeto, y quien llama a
     * `cerrar` lo entrega en la observación.
     */
    const delResultado = (observacion.signals ?? []).filter((s) => !!s && s.subject === observacion.actual.id);

    /* A6 verifica lo que salió contra lo esperado. A9 no dice si pasó. */
    const verification = a6.verificar({
      expected: entrega.expected ?? [],
      actual: observacion.actual,
      ...(entrega.constraints ? { constraints: entrega.constraints } : {}),
      ...(delResultado.length ? { evidence: comoEvidencia(delResultado) } : {}),
    });
    /* Y propone qué hacer si no pasó, con lo que la decisión ya sabía. Nada se ejecuta. */
    const decision = resultado.decision;
    const contexto: ContextoDeRecuperacion = {
      ...(decision ? { alternatives: decision.alternatives.map((v) => idDe(decision, v)).filter((x): x is string => !!x) } : {}),
      hasFallback: (resultado.strategies?.estrategias ?? []).some((c) => c.value.isFallback === true),
    };
    const recovery = a6r.analizar(verification, contexto);

    /*
     * El resultado de la decisión, en el vocabulario de A7, en el ámbito en que se
     * decidió y con la IDENTIDAD de lo que se entregó (1.8): el `id` del plan o de
     * la opción elegida. Sale de la entrega de A9 —lo que A1 eligió—, nunca de la
     * observación: quien ejecuta no puede atribuir su resultado a otra alternativa.
     */
    const identidad = entrega.plan?.id ?? entrega.elegida;
    const scope = resultado.ambito || identidad
      ? Object.freeze({ ...(resultado.ambito ?? {}), ...(identidad ? { strategyId: identidad } : {}) })
      : undefined;
    const outcome: ResultadoDeDecision = Object.freeze({
      id: observacion.actual.id,
      kind: observacion.kind,
      at: observacion.at,
      ...(scope ? { scope } : {}),
      /* Con sus hallazgos (1.9): sin ellos A7 no separa lo que A6 miró del RESULTADO
       * de su puerta de ejecución, y no aprendería el veredicto como verificación. */
      verification: Object.freeze({
        status: verification.status, passed: verification.passed, confidence: verification.confidence,
        findings: verification.findings,
      }),
      ...(observacion.recovery ? { recovery: observacion.recovery } : {}),
      ...(observacion.signals ? { signals: Object.freeze(delResultado) } : {}),
    });
    porque.push(`A6: ${verification.status}. Resultado: ${outcome.kind}.`);

    /* A7 aprende, si se le da con qué reloj. */
    const learning = aprendizaje
      ? a7.aprender({ ahora: aprendizaje.ahora, previo: aprendizaje.previo, policy: aprendizaje.policy, outcomes: [outcome] })
      : undefined;
    /* Lo que dijo A7, y no lo que se esperaba que dijera: un resultado que su puerta
     * no admite —p. ej. una identidad con el separador de su clave— no se aprendió. */
    if (learning) {
      porque.push(learning.rechazo ? `A7 rechazó el aprendizaje (${learning.rechazo}).`
        : learning.metricas.resultadosAdmitidos ? 'A7 acumuló el resultado.'
          : 'A7 no admitió el resultado: no se aprendió nada de él.');
    }

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
