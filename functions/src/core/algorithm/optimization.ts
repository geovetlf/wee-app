/**
 * WEE ALGORITHM ENGINE — A5 · EL MODELO DE OPTIMIZACIÓN.
 *
 * ── La regla que ordena esta capa entera ────────────────────────────────────
 *
 *   LAS RESTRICCIONES DEFINEN LO FACTIBLE.
 *   LOS OBJETIVOS OPTIMIZAN DENTRO DE LO FACTIBLE.
 *
 * En ese orden y sin excepciones. Una solución que se sale del presupuesto no
 * es «una solución cara»: no es una solución. Y no compite, por muy alta que
 * sea su puntuación — porque puntuar algo inviable y dejarlo ganar es cómo una
 * optimización acaba proponiendo lo que no se puede hacer.
 *
 * ── Qué contesta A5, y qué NO ───────────────────────────────────────────────
 *
 * Contesta: «dado un conjunto de candidatos y un objetivo, ¿qué cambio ofrece
 * una mejora JUSTIFICABLE dentro de las restricciones?».
 *
 * No contesta cómo se ejecuta nada. No elige —eso es A1— y no ejecuta —eso es
 * el Orchestrator—. Y no sabe sobre qué está optimizando: una capacidad que no
 * existía cuando se escribió esto se optimiza igual, porque aquí solo hay ejes,
 * números y procedencia.
 *
 * ── Y una cosa que se dice ahora para no repetirla ──────────────────────────
 *
 * Una mejora sin evidencia no es una mejora: es una esperanza. Cuando los
 * números de un candidato no los sostiene nada, A5 puede proponerlo, pero el
 * delta se queda SIN DECIR — no en cero, no estimado, ausente.
 */

import { AlgorithmBudgetLimits } from './types';
import { AlgorithmSpend } from './budget';
import { AlgorithmConstraints, EJES, Objective, ObjectiveAxis, motivoDeNumeroInvalido, pesosNormalizados, seMaximiza } from './objective';
import { Confidence, Evidence, SignalSource, Uncertainty } from './signals';
import { Alternative, AxisValues } from './scoring';

/* ── Lo factible ──────────────────────────────────────────────────────────── */

/**
 * POR QUÉ UN CANDIDATO NO ES VIABLE.
 *
 * Cerrado, y con la misma forma que el resto del Core. `unverifiable` merece
 * su propio motivo: no es lo mismo saber que algo incumple que no poder
 * comprobarlo, y fundirlos pierde justo lo que hace falta para arreglarlo.
 */
export type MotivoDeInviabilidad =
  /* Se sale de una restricción dura. El detalle dice de cuál. */
  | 'constraint'
  /* No se pudo comprobar una restricción porque falta el dato. */
  | 'unverifiable'
  /* Pide más recursos de los que hay declarados. */
  | 'resource'
  /* Nombra una implementación. La frontera de `authority.ts`. */
  | 'authority'
  /* No tiene forma de candidato. */
  | 'malformed';

export interface Inviabilidad {
  reason: MotivoDeInviabilidad;
  detail?: string;
}

/** El veredicto de viabilidad de un candidato. */
export interface Viabilidad {
  id: string;
  feasible: boolean;
  /** Solo cuando `feasible` es falso. */
  why?: Inviabilidad;
}

/* ── Dominancia ───────────────────────────────────────────────────────────── */

/**
 * ¿A DOMINA A B?
 *
 * Tres condiciones, y la primera es la que más importa:
 *
 *   1. LAS DOS TIENEN QUE SER FACTIBLES. Un candidato inviable no domina a
 *      nadie ni es dominado por nadie: está fuera del juego, no perdiendo.
 *   2. A no es peor en NINGÚN eje que las dos hayan medido.
 *   3. A es mejor en al menos uno.
 *
 * Y solo se comparan los ejes CON PESO que AMBAS midieron. Comparar por un eje
 * que a una le falta convertiría «no lo sé» en «es peor», que es exactamente el
 * error que `missing` existe para evitar desde A0.
 */
export const domina = (
  a: { values?: AxisValues; feasible?: boolean },
  b: { values?: AxisValues; feasible?: boolean },
  objective?: Objective,
): boolean => {
  if (a?.feasible === false || b?.feasible === false) return false;
  const pesos = pesosNormalizados(objective);
  const activos = EJES.filter((e) => (pesos[e] ?? 0) > 0);
  let alMenosUno = false;
  let comparables = 0;
  for (const eje of activos) {
    const va = a?.values?.[eje];
    const vb = b?.values?.[eje];
    if (typeof va !== 'number' || typeof vb !== 'number') continue;
    comparables++;
    const mejor = (x: number, y: number) => (seMaximiza(eje) ? x > y : x < y);
    if (mejor(vb, va)) return false;
    if (mejor(va, vb)) alMenosUno = true;
  }
  return comparables > 0 && alMenosUno;
};

/**
 * EL FRENTE, SOBRE LO FACTIBLE.
 *
 * `pareto` de A0 opera sobre alternativas sin saber de viabilidad. Esto no lo
 * reemplaza: lo APLICA después de filtrar, que es la única forma de que el
 * frente signifique algo. Un frente que incluye lo imposible es una lista de
 * deseos.
 */
export const frenteFactible = <T>(
  candidatos: readonly (Alternative<T> & { feasible?: boolean })[],
  objective?: Objective,
): readonly (Alternative<T> & { feasible?: boolean })[] => {
  const viables = candidatos.filter((c) => c.feasible !== false);
  return Object.freeze(viables.filter((c) => !viables.some((otro) => otro.id !== c.id && domina(otro, c, objective))));
};

/* ── Cuánto se gana ───────────────────────────────────────────────────────── */

/** Lo que cambia en un eje, con el signo puesto: positivo = mejor. */
export interface DeltaDeEje {
  axis: ObjectiveAxis;
  baseline: number;
  candidate: number;
  /** Positivo = mejor, se maximice o se minimice el eje. */
  absolute: number;
  /** Sobre la base. Ausente si la base era 0: no se divide. */
  relative?: number;
  /** De dónde salen los dos números. La más débil de las dos. */
  provenance?: SignalSource;
}

/**
 * QUÉ CAMBIA FRENTE A LA REFERENCIA, eje a eje.
 *
 * Solo los ejes que LAS DOS midieron. Comparar contra un hueco es inventar la
 * mitad de la resta, y es la forma más fácil de que una «optimización» parezca
 * una mejora porque la referencia no se midió.
 */
export const deltasDe = (
  base: AxisValues | undefined,
  candidato: AxisValues | undefined,
  procedencia?: Partial<Record<ObjectiveAxis, SignalSource>>,
): readonly DeltaDeEje[] => {
  const salida: DeltaDeEje[] = [];
  for (const axis of EJES) {
    const b = base?.[axis];
    const c = candidato?.[axis];
    if (typeof b !== 'number' || typeof c !== 'number' || !Number.isFinite(b) || !Number.isFinite(c)) continue;
    const absolute = seMaximiza(axis) ? c - b : b - c;
    salida.push({
      axis, baseline: b, candidate: c, absolute,
      ...(b !== 0 ? { relative: absolute / Math.abs(b) } : {}),
      ...(procedencia?.[axis] ? { provenance: procedencia[axis] as SignalSource } : {}),
    });
  }
  return Object.freeze(salida);
};

/**
 * CUÁNTO SE GANA EN TOTAL, en relativo y ponderado por el objetivo.
 *
 * En relativo porque sumar 0,3 de calidad con 0,02 de dólar no significa nada:
 * no están en la misma escala. Y ponderado porque mejorar un eje que a nadie le
 * importa no es mejorar. Sin ejes comparables devuelve `undefined` —no cero—,
 * que es la diferencia entre «no mejora» y «no se sabe».
 */
export const gananciaDe = (deltas: readonly DeltaDeEje[], objective?: Objective): number | undefined => {
  const pesos = pesosNormalizados(objective);
  let suma = 0;
  let peso = 0;
  for (const d of deltas) {
    const p = pesos[d.axis] ?? 0;
    if (p <= 0 || typeof d.relative !== 'number') continue;
    suma += d.relative * p;
    peso += p;
  }
  return peso > 0 ? suma / peso : undefined;
};

/* ── Cuándo deja de merecer la pena ───────────────────────────────────────── */

/**
 * LA GANANCIA MÍNIMA PARA QUE UNA OPTIMIZACIÓN VALGA LA PENA.
 *
 * Un 2 % por defecto, y no es un número mágico: es el umbral por debajo del
 * cual el cambio entra dentro del ruido de las propias estimaciones. Quien
 * tenga una medición mejor lo declara en `acceptance.minGain`.
 */
export const GANANCIA_MINIMA = 0.02;

/**
 * LO QUE HAY QUE CUMPLIR PARA ACEPTAR UNA MEJORA.
 *
 * Es lo que impide que A5 optimice por optimizar. Una propuesta que gana un
 * 0,3 % y añade un riesgo no es una mejora: es movimiento.
 */
export interface CriterioDeAceptacion {
  /** Mínimo relativo ponderado. Por defecto, `GANANCIA_MINIMA`. */
  minGain?: number;
  /**
   * Ejes que NO pueden empeorar, pase lo que pase.
   *
   * Es distinto de una restricción dura: aquí no se exige un valor, se exige
   * no retroceder. «Más barato pero peor» puede ser legítimo, y a veces no.
   */
  noRegression?: readonly ObjectiveAxis[];
  /** Ejes que la propuesta DEBE poder medir; sin ellos, no se acepta. */
  requireEvidence?: readonly ObjectiveAxis[];
  /** Confianza mínima de la propuesta, 0–1. */
  minConfidence?: number;
}

/**
 * ¿MERECE LA PENA ESTE CAMBIO?
 *
 * Devuelve el motivo del rechazo, no solo un no. Un optimizador que descarta en
 * silencio es indistinguible de uno que no encuentra nada.
 */
export const mereceLaPena = (
  deltas: readonly DeltaDeEje[],
  ganancia: number | undefined,
  confidence: Confidence | undefined,
  acceptance: CriterioDeAceptacion | undefined,
  objective?: Objective,
): { ok: true } | { ok: false; because: string } => {
  const minimo = typeof acceptance?.minGain === 'number' ? acceptance.minGain : GANANCIA_MINIMA;
  const medidos = new Set(deltas.map((d) => d.axis));

  for (const eje of acceptance?.requireEvidence ?? []) {
    if (!medidos.has(eje)) return { ok: false, because: `sin evidencia en ${eje}` };
  }
  for (const eje of acceptance?.noRegression ?? []) {
    const d = deltas.find((x) => x.axis === eje);
    if (d && d.absolute < 0) return { ok: false, because: `retrocede en ${eje}` };
  }
  if (acceptance?.minConfidence !== undefined) {
    /*
     * (S2-B · B.1) La regla de las restricciones: un mínimo que no es un número
     * finito entre 0 y 1 no se apaga en silencio —con `NaN`, `valor < NaN` era
     * falso y pasaba cualquier propuesta—. No se acepta ninguna con él, y se dice.
     */
    const malo = motivoDeNumeroInvalido('fraccion', acceptance.minConfidence);
    if (malo) return { ok: false, because: `acceptance.minConfidence: ${malo}` };
    if ((confidence?.value ?? 0) < acceptance.minConfidence) {
      return { ok: false, because: `confianza ${(confidence?.value ?? 0).toFixed(2)} por debajo de ${acceptance.minConfidence}` };
    }
  }
  if (ganancia === undefined) return { ok: false, because: 'no hay ejes comparables: la mejora no se puede demostrar' };
  if (ganancia < minimo) {
    return { ok: false, because: `gana ${(ganancia * 100).toFixed(1)} % y el mínimo es ${(minimo * 100).toFixed(1)} %` };
  }
  /* Y si el objetivo no pondera ningún eje de los que cambian, no hay mejora que valga. */
  const pesos = pesosNormalizados(objective);
  if (!deltas.some((d) => (pesos[d.axis] ?? 0) > 0)) {
    return { ok: false, because: 'cambia ejes que el objetivo no pondera' };
  }
  return { ok: true };
};

/* ── El problema ──────────────────────────────────────────────────────────── */

/**
 * LO QUE HAY QUE OPTIMIZAR.
 *
 * Genérico en `T` a propósito: A5 no sabe si optimiza estrategias,
 * disposiciones o cualquier otra cosa que venga. Lo único que necesita es que
 * cada candidato traiga sus ejes.
 *
 * `baseline` es la referencia contra la que se mide, y viene de fuera —A3 ya
 * marca la suya— porque elegir la referencia no es optimizar.
 */
export interface OptimizationProblem<T = unknown> {
  candidates: readonly Alternative<T>[];
  objective: Objective;
  constraints?: AlgorithmConstraints;
  /** Cuánto puede PENSAR el optimizador. El de A0, no uno nuevo. */
  budget?: AlgorithmBudgetLimits;
  /** Lo que se sabe. Se resuelven conflictos con las reglas de A0. */
  evidence?: readonly Evidence[];
  /** La referencia. Si falta, se toma el primer candidato factible en orden canónico. */
  baselineId?: string;
  acceptance?: CriterioDeAceptacion;
  /** Para reproducir un desempate que algún día no sea determinista. Hoy no hace falta. */
  seed?: number;
}

/* ── Lo que A5 propone ────────────────────────────────────────────────────── */

/**
 * UNA MEJORA PROPUESTA. Propuesta, y esa palabra es el contrato entero.
 *
 * A5 no cambia nada: describe un cambio, de dónde sale, qué mueve y qué cuesta.
 * Quien decide es A1 y quien ejecuta es el Orchestrator.
 */
export interface OptimizationProposal<T = unknown> {
  id: string;
  /** Sobre qué candidato se aplicó. */
  baseId: string;
  /** Qué operador lo produjo. Su id, para poder reproducirlo. */
  transformation: string;
  /** El candidato resultante. Es el MISMO tipo que entró. */
  result: Alternative<T>;
  /** Qué cambia, eje a eje, solo donde los dos midieron. */
  expectedDelta: readonly DeltaDeEje[];
  /** La ganancia ponderada. Ausente cuando no se puede demostrar. */
  expectedGain?: number;
  confidence: Confidence;
  uncertainty: Uncertainty;
  evidence: readonly Evidence[];
  /** Qué se empeora a cambio. Se nombra siempre, también cuando conviene. */
  tradeoffs: readonly ObjectiveAxis[];
  /** En una frase, por qué era elegible y qué mejora. Determinista, nunca de un modelo. */
  because: readonly string[];
}

/* ── Cuándo parar ─────────────────────────────────────────────────────────── */

/**
 * POR QUÉ SE DEJÓ DE BUSCAR.
 *
 * Cerrado, y ninguno significa «se rindió». Cada uno lleva a una acción
 * distinta de quien llama: sin mejora se acepta lo que hay, sin presupuesto se
 * puede reintentar con más, y un problema inviable hay que arreglarlo.
 */
export type CondicionDeParada =
  /* Ninguna transformación aportó lo suficiente. La parada normal. */
  | 'no_improvement'
  /* Se agotó el presupuesto COMPUTACIONAL. */
  | 'budget_exhausted'
  /* Se llegó al tope de vueltas. */
  | 'iteration_limit'
  /* Dos vueltas seguidas dieron lo mismo. */
  | 'converged'
  /* Ninguna candidata cumple las restricciones. */
  | 'infeasible'
  /* No llegó nada que optimizar. */
  | 'no_candidates'
  /* Se volvió a una forma ya vista: un bucle de optimización. */
  | 'loop_detected';

export interface MetricasDeOptimizacion {
  attempts: number;
  candidatesEvaluated: number;
  constraintsRejected: number;
  paretoSize: number;
  proposalsGenerated: number;
  proposalsRejected: number;
  iterations: number;
  loopsDetected: number;
  /** Aciertos de la memoria local: transformaciones que no hubo que recalcular. */
  memoHits: number;
  budgetExhausted: boolean;
  /** La mejor ganancia encontrada. Ausente si no se pudo demostrar ninguna. */
  bestGain?: number;
  confidence: number;
}

export const METRICAS_DE_OPTIMIZACION_CERO: MetricasDeOptimizacion = Object.freeze({
  attempts: 0, candidatesEvaluated: 0, constraintsRejected: 0, paretoSize: 0,
  proposalsGenerated: 0, proposalsRejected: 0, iterations: 0, loopsDetected: 0,
  memoHits: 0, budgetExhausted: false, confidence: 0,
});

/** Lo que A5 devuelve. Alternativas y motivos; nunca una orden. */
export interface OptimizationOutcome<T = unknown> {
  /** Los factibles, en orden canónico. Con su veredicto. */
  feasible: readonly (Alternative<T> & { feasible: boolean })[];
  /** Los que no, con su motivo. Nada se cae en silencio. */
  rejected: readonly Viabilidad[];
  /** El frente, sobre lo factible. Más de uno = no hay ganador objetivo. */
  pareto: readonly string[];
  /** Las mejoras que merecen la pena, mejor primero. */
  proposals: readonly OptimizationProposal<T>[];
  /** Las que se evaluaron y no llegaron, con su motivo. */
  discarded: readonly { id: string; transformation: string; because: string }[];
  baselineId?: string;
  stoppedBecause: CondicionDeParada;
  spend: Readonly<AlgorithmSpend>;
  metricas: MetricasDeOptimizacion;
}
