/**
 * WEE ALGORITHM ENGINE — LO QUE ENTRA Y LO QUE SALE.
 *
 * ── El modelo ───────────────────────────────────────────────────────────────
 *
 *   ENTRADA → CONTEXTO → OPCIONES → RESTRICCIONES → EVALUACIÓN → DECISIÓN
 *
 * `DecisionContext` es todo lo de la izquierda; `AlgorithmDecision` es lo de la
 * derecha. En medio hay una FUNCIÓN PURA, y esa es la propiedad que sostiene
 * todo lo demás: se puede llamar cuarenta veces sin que pase nada, se puede
 * probar con una tabla de casos, y se puede volver a ejecutar meses después
 * para saber por qué se decidió lo que se decidió.
 *
 * ── Por qué casi todo es opcional ───────────────────────────────────────────
 *
 * Porque Weë todavía no puede obtener casi nada de esto de forma fiable. Un
 * contexto con veinte campos obligatorios obligaría a rellenarlos, y rellenar
 * lo que no se sabe es inventar datos — que es exactamente lo que esta capa
 * existe para no hacer. Lo que falta, falta, y `Uncertainty` lo dice.
 *
 * Solo tres cosas son obligatorias: qué se intenta conseguir, de dónde viene la
 * petición, y cuánto se puede pensar. Sin objetivo no hay nada que optimizar,
 * sin traza no hay nada que auditar, y sin tope hay un bucle esperando su turno.
 *
 * ── La decisión se parece al Router a propósito ─────────────────────────────
 *
 * `RoutingDecision` ya resolvió cómo se cuenta una decisión auditable: el
 * elegido, su puntuación, las alternativas, TODOS los candidatos con su
 * veredicto, los avisos, y la política con la que se decidió —«una decisión sin
 * su política no se puede reproducir»—. Se copia esa forma porque es la
 * correcta, no porque sea la que había.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { WeeError } from '../errors';
import { TraceContext } from '../observability';
import { AlgorithmBudgetLimits, AlgorithmFailureReason } from './types';
import { AlgorithmSpend } from './budget';
import { AlgorithmConstraints, Objective } from './objective';
import { Confidence, Evidence, Signal, Uncertainty } from './signals';
import { Alternative, StrategyScore } from './scoring';

/**
 * LO QUE YA PASÓ, resumido y ACOTADO.
 *
 * Acotado no es un detalle de implementación: es la diferencia entre una
 * consulta y un scan. Con diez millones de cuentas, «dame el histórico» es una
 * pregunta que un día se come un servidor, así que aquí solo caben las últimas
 * N ejecuciones y quien lo rellene decide cuáles.
 *
 * No lleva lo que escribió nadie: son resultados, no contenido.
 */
export interface HistoryWindow {
  /** Cuántas ejecuciones se miraron. */
  sampleSize: number;
  /** Cuántas salieron bien. */
  succeeded: number;
  /** Mediana, no media: una cola lenta no debe mover el número entero. */
  medianLatencyMs?: number;
  medianCostUsd?: number;
  /** Desde cuándo, en epoch ms. Sin esto no se sabe si la ventana sigue valiendo. */
  since?: number;
}

/**
 * TODO LO QUE HACE FALTA PARA DECIDIR.
 *
 * `options` son las alternativas que YA trae quien llama, cuando las trae. Un
 * algoritmo de decisión (A1) las recibe; uno de estrategia (A3) las genera.
 * Por eso es opcional y por eso el tipo es genérico: esta capa no sabe sobre
 * qué se está decidiendo, y no tiene por qué saberlo.
 */
export interface DecisionContext<T = unknown> {
  contract: typeof ALGORITHM_CONTRACT_VERSION;
  /** Qué se intenta conseguir. Lo único que no puede faltar. */
  objective: Objective;
  /** El hilo de la operación. De aquí sale la correlación, nada más. */
  trace: TraceContext;
  /** Lo que hay que cumplir. Duplica lo de `objective.constraints` si ambos vienen: gana el más estrecho. */
  constraints?: AlgorithmConstraints;
  /** Lo que se sabe. Acotado por `maxEvidence`. */
  signals?: readonly Signal[];
  /** Las alternativas que ya hay sobre la mesa. */
  options?: readonly Alternative<T>[];
  /**
   * Lo que ya pasó en el ÁMBITO de esta decisión, resumido. Es de todas las
   * alternativas a la vez, así que A1 lo LEE y lo declara, pero no ordena con
   * él: pesa igual sobre todas. Ver `historyByOption`.
   */
  history?: HistoryWindow;
  /**
   * Lo que ya pasó con CADA alternativa, por su id. Lo único que puede ordenar.
   *
   * Contrato 1.7. La tasa de éxito medida entra como `successProbability` de la
   * alternativa —solo si el objetivo pondera ese eje, solo si ella no trae ya
   * ese valor, y siempre DESPUÉS de las restricciones duras y de la confianza
   * mínima—. Una ventana por debajo del suelo de muestra de A7
   * (`POLITICA_MINIMA.minSampleSize`) no se usa: A1 no inventa un mínimo, usa el
   * que ya rige para todo lo aprendido. Quien la entrega puede exigir más (A8,
   * `RequisitosDeEvidencia.minSampleSize`); menos, nadie.
   */
  historyByOption?: Readonly<Record<string, HistoryWindow>>;
  /** Cuánto se puede pensar. Se combina con lo del descriptor y con el techo. */
  budget?: AlgorithmBudgetLimits;
  /** En qué vuelta de replanificación va. 0 = la primera. */
  replanCount?: number;
  /**
   * Para reproducir: la semilla de cualquier desempate que no sea determinista.
   *
   * Hoy nada de esta capa usa azar —`ordenar` desempata por `id` justamente
   * para no necesitarlo— y el campo existe para que el día que un algoritmo lo
   * necesite no se cuele un `Math.random()` que haga irreproducible la decisión.
   */
  seed?: number;
}

/** Cómo acabó. Los mismos tres del Router, y por los mismos motivos. */
export type DecisionStatus =
  /* Hay recomendación. */
  | 'decided'
  /* Se pudo evaluar y NO hay nada que recomendar. No es un error. */
  | 'undecided'
  /* La petición no tiene forma. */
  | 'invalid';

/** Lo que hay que contar aunque haya decisión. */
export type DecisionWarning =
  /* Había más candidatos de los que el presupuesto permite evaluar. */
  | 'candidates_capped'
  /* Se acabó el presupuesto y se devuelve lo mejor encontrado hasta ahí. */
  | 'budget_exhausted'
  /* Faltaban señales que el algoritmo declara como opcionales. */
  | 'signals_missing'
  /* La evidencia no da para tanto como el total sugiere. */
  | 'low_confidence'
  /* No hay un ganador claro: varias están en el frente de Pareto. */
  | 'no_dominant_option'
  /* Algún candidato venía mal formado y se descartó. */
  | 'malformed_option'
  /* Se decidió con un algoritmo experimental. */
  | 'experimental_algorithm'
  /* Algún candidato intentaba nombrar una implementación y se descartó. */
  | 'authority_violation'
  /* Dos señales sobre lo mismo decían cosas distintas. Se resolvió y se cuenta. */
  | 'signal_conflict'
  /* Alguna restricción no se pudo comprobar porque al candidato le faltaba el dato. */
  | 'constraint_unverifiable'
  /* Se eligió algo cuya confianza no llega al mínimo pedido. */
  | 'below_min_confidence'
  /* Decidió el respaldo, no el algoritmo que se pidió. */
  | 'fallback_used';

/**
 * UN CANDIDATO, YA JUZGADO.
 *
 * Se guardan TODOS, incluidos los descartados y por qué. Es lo que convierte
 * «eligió esta» en «eligió esta y aquí están las otras siete con su motivo», y
 * sin eso no hay forma de saber si el motor está razonando o tropezando.
 */
export interface JudgedOption<T> {
  id: string;
  value: T;
  eligible: boolean;
  /** Por qué entró o se quedó fuera. `constraint:maxRisk`, `authority:provider`… */
  reason: string;
  score?: StrategyScore;
}

/**
 * LA DECISIÓN.
 *
 * `selected` es una RECOMENDACIÓN. Quien la reciba puede ignorarla, y el
 * sistema tiene que seguir funcionando exactamente igual si lo hace — esa es la
 * prueba de que esta capa no se ha convertido en una autoridad por la puerta
 * de atrás.
 */
export interface AlgorithmDecision<T = unknown> {
  contract: typeof ALGORITHM_CONTRACT_VERSION;
  status: DecisionStatus;
  /** Quién decidió. `id@version`. Sin esto no se puede reproducir. */
  algorithm: string;
  /** Lo recomendado. Ausente cuando `undecided` o `invalid`. */
  selected?: T;
  selectedScore?: StrategyScore;
  /** Las siguientes por puntuación. Nunca se ejecutan aquí. */
  alternatives: readonly T[];
  /** Todos los considerados, con su veredicto. Para auditar. */
  candidates: readonly JudgedOption<T>[];
  /** Cuánto se cree la decisión, con su base. */
  confidence: Confidence;
  uncertainty: Uncertainty;
  /** Lo que la sostiene. Puede estar vacío: eso también se dice. */
  evidence: readonly Evidence[];
  /** Por qué no hay decisión. Solo cuando `status !== 'decided'`. */
  failure?: AlgorithmFailureReason;
  /** El error del Core, cuando lo hay. Vocabulario compartido, no uno nuevo. */
  error?: WeeError;
  warnings: readonly DecisionWarning[];
  /** Con qué objetivo se decidió. Como la `policy` del Router: sin él no se reproduce. */
  objective: Objective;
  /**
   * CON QUÉ RESTRICCIONES se decidió. La otra mitad de la reproducibilidad.
   *
   * El objetivo dice qué se maximizaba; esto dice qué se exigía. Sin las dos no
   * se puede volver a ejecutar una decisión, y entonces «por qué eligió esto»
   * no tiene respuesta.
   */
  constraints?: AlgorithmConstraints;
  /**
   * Las CLAVES de las señales que se miraron. Nunca sus valores.
   *
   * Una decisión tiene que poder decir en qué se fijó. Los valores no entran:
   * pueden ser datos de una persona y esto se copia, se exporta y se pega.
   */
  signalKeys?: readonly string[];
  /**
   * POR QUÉ, en frases que se leen. Generadas de la evidencia, nunca por un modelo.
   *
   * «Selected B» no es una explicación. Esto es lo que convierte la decisión en
   * algo que alguien puede revisar sin leer el código.
   */
  explanation?: readonly string[];
  /**
   * Los que nadie domina, por id. Presente solo cuando hay más de uno: es la
   * forma de decir «aquí no hay un ganador objetivo» sin dejar de elegir.
   */
  paretoFront?: readonly string[];
  /** Qué algoritmo cedió el paso, cuando decidió un respaldo. `id@version`. */
  fallbackFrom?: string;
  /** Qué se gastó pensando. Lo que permite saber si esta capa sale a cuenta. */
  spend: Readonly<AlgorithmSpend>;
  trace: TraceContext;
}

/**
 * LO QUE IMPLEMENTA UN ALGORITMO. Una función, y a propósito.
 *
 * No es una clase, no tiene constructor y no guarda nada entre llamadas. Un
 * algoritmo con estado es un algoritmo que un día devuelve algo distinto con la
 * misma entrada, y entonces se acabó la reproducibilidad.
 *
 * Es SÍNCRONA a propósito. Nada de lo que A0 contempla necesita esperar a
 * nadie: pensar es local. El día que un algoritmo `effectful` necesite LEER
 * algo, entrará por un puerto en el contexto —como hace el Router con
 * `CostEstimatePort`—, y no convirtiendo a todos los demás en asíncronos.
 */
export type Algorithm<Entrada = unknown, Salida = unknown> = (
  context: DecisionContext<Entrada>,
) => AlgorithmDecision<Salida>;

/**
 * UNA DECISIÓN DE «NO SÉ», bien contada.
 *
 * Existe para que decir que no se sabe cueste una línea. Si lo honesto es más
 * trabajo que lo cómodo, alguien acabará devolviendo lo cómodo — y lo cómodo
 * aquí es una recomendación inventada con una confianza de 0,8.
 */
export const sinDecision = <T>(
  algorithm: string,
  context: Pick<DecisionContext, 'objective' | 'trace'>,
  failure: AlgorithmFailureReason,
  spend: Readonly<AlgorithmSpend>,
  extra?: { warnings?: readonly DecisionWarning[]; evidence?: readonly Evidence[]; error?: WeeError },
): AlgorithmDecision<T> => ({
  contract: ALGORITHM_CONTRACT_VERSION,
  status: failure === 'algorithm_failure' || failure === 'unknown_algorithm' ? 'invalid' : 'undecided',
  algorithm,
  alternatives: [],
  candidates: [],
  confidence: { kind: 'algorithm', value: 0, basis: extra?.evidence ?? [], because: failure },
  uncertainty: 'unknown',
  evidence: extra?.evidence ?? [],
  failure,
  error: extra?.error,
  warnings: extra?.warnings ?? [],
  objective: context.objective,
  spend,
  trace: context.trace,
});

/**
 * LO MÍNIMO QUE HAY QUE GUARDAR PARA VOLVER A EJECUTAR UNA DECISIÓN.
 *
 * Y ni un dato más. Guardar el contexto entero sería guardar señales sobre
 * personas indefinidamente para depurar algo que casi nunca se depura; guardar
 * solo el resultado no sirve de nada. Esto es el punto medio: quién, con qué
 * objetivo, sobre cuántos candidatos, con qué claves de señal —las CLAVES, no
 * los valores—, y qué salió.
 */
export interface DecisionRecord {
  algorithm: string;
  objective: Objective;
  /** Las claves de las señales usadas. Nunca sus valores. */
  signalKeys: readonly string[];
  candidateCount: number;
  selectedId?: string;
  total?: number;
  confidence: number;
  uncertainty: Uncertainty;
  failure?: AlgorithmFailureReason;
  spend: Readonly<AlgorithmSpend>;
  at: number;
}

/** El registro de una decisión, sin arrastrar nada que no haga falta. */
export const registroDeDecision = <T>(
  d: AlgorithmDecision<T>,
  context: DecisionContext,
  at: number,
  selectedId?: string,
): DecisionRecord => ({
  algorithm: d.algorithm,
  objective: d.objective,
  signalKeys: Object.freeze([...new Set((context.signals ?? []).map((s) => s.key))]),
  candidateCount: d.candidates.length,
  selectedId,
  total: d.selectedScore?.total,
  confidence: d.confidence.value,
  uncertainty: d.uncertainty,
  failure: d.failure,
  spend: d.spend,
  at,
});
