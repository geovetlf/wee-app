/**
 * WEE ALGORITHM ENGINE — A9 · LA FRONTERA DE INTEGRACIÓN.
 *
 * ── Qué es, en una frase ────────────────────────────────────────────────────
 *
 * El sitio donde A0–A8 se encadenan en un ciclo —contexto, decisión,
 * estructura, estrategias, optimización, plan, verificación, resultado y
 * aprendizaje— SIN que ninguno pierda su autoridad y sin que aparezca otra.
 *
 * ── Lo que A9 NO es ─────────────────────────────────────────────────────────
 *
 * No es un algoritmo: no elige nada, y por eso no se registra ni tiene
 * categoría —`AlgorithmCategory` es cerrada, y añadir una sería inventar una
 * familia de algoritmos que no existe—. No es un Brain, ni un Planner, ni un
 * Router, ni un Orchestrator, ni un Job Engine, ni otro verificador, ni otro
 * aprendiz. COMPONE: a cada autoridad le pasa lo que su contrato pide, y
 * recoge lo que su contrato devuelve sin traducirlo ni resumirlo.
 *
 * ── El orden, y por qué no es el del dibujo ─────────────────────────────────
 *
 * El dibujo conceptual pone DECISIÓN antes de DESCOMPOSICIÓN. Los contratos,
 * no: A1 RECIBE alternativas y A3 las GENERA (`DecisionContext.options`), A5
 * «no elige: eso es A1», y A4 construye sus variantes con las primitivas de A2.
 * Así que, cuando la decisión es entre formas de hacer una tarea:
 *
 *   A8 → A2 → A4 → A3 → A5 → A1
 *
 * El «A1 → A2» del dibujo existe, pero UN NIVEL MÁS ARRIBA: cuando lo primero
 * que hay que decidir es el ENFOQUE —qué tarea—, A1 elige el enfoque, A2
 * descompone el elegido y A1 vuelve a decidir entre sus estrategias. Dos
 * decisiones, cada una entre alternativas que ya existen.
 *
 * ── Dónde acaba ─────────────────────────────────────────────────────────────
 *
 * En la ENTREGA: el plan elegido, sus restricciones y lo que se espera de la
 * salida. Lo siguiente es del Workflow, del Orchestrator y, paso a paso, del
 * Router —la política define la frontera, la puntuación ordena dentro de
 * ella—. A9 no construye una petición al Router, y no podría: ese contrato ni
 * siquiera se importa desde aquí.
 *
 * Entre `decidir` y `cerrar` pasa la ejecución, y pasa FUERA. A9 no ejecuta
 * nada: recibe lo que se observó.
 */

import { Signal } from './signals';
import { AlgorithmConstraints } from './objective';
import { Alternative } from './scoring';
import { AlgorithmDecision, DecisionContext, DecisionStatus, HistoryWindow } from './decision';
import { TareaADescomponer } from './decomposition';
import { ResultadoDeDescomposicion } from './decomposition-engine';
import { AnalisisDeParalelizacion } from './parallelization-engine';
import { Strategy } from './strategy';
import { ResultadoDeEstrategias } from './strategy-engine';
import { OptimizationOutcome } from './optimization';
import { OutputExpectation, ResultadoAVerificar, VerificationResult } from './verification';
import { AnalisisDeRecuperacion } from './recovery';
import {
  AmbitoDeEvento, ClaseDeResultado, PoliticaDeAprendizaje, ResultadoDeDecision, instanteValido,
} from './feedback';
import { AgregadoDeAprendizaje } from './learning';
import { SalidaDeAprendizaje } from './feedback-engine';
import { ConjuntoDeSenales, PeticionDeContexto } from './context-engine';

/* ── Lo que se le pide al ciclo ───────────────────────────────────────────── */

/**
 * QUÉ PASOS DE COMPOSICIÓN SE PIDEN.
 *
 * Ninguno corre porque sí. Una decisión trivial no necesita paralelismo ni
 * optimización, y ejecutarlos «por si acaso» sería gastar y, peor, meter en la
 * decisión alternativas que nadie pidió.
 */
export interface ComposicionDelCiclo {
  /**
   * Explorar el paralelismo de la tarea con A4. Sin él, A3 recibe las
   * descomposiciones de A2; con él, las variantes de A4, que son la autoridad
   * sobre la forma paralela y ya incluyen la secuencial.
   */
  paralelizar?: boolean;
  /**
   * Pasar las estrategias por A5 antes de decidir. A5 dice qué es FACTIBLE y
   * propone mejoras; A1 decide entre lo factible y lo propuesto.
   */
  optimizar?: boolean;
}

/**
 * LA PETICIÓN ALGORÍTMICA.
 *
 * Casi toda es el contrato de A1: `DecisionContext` ya lleva el objetivo, la
 * traza, las restricciones —que son los requisitos de ejecución: presupuesto,
 * calidad, plazo, paralelismo, capacidades exigidas o prohibidas—, las señales,
 * el presupuesto de cálculo y, cuando ya las hay, las alternativas. A9 no tiene
 * otra forma de decir lo mismo.
 *
 * Lo que añade es solo lo que A1 no lleva y otro necesita: la TAREA para A2, los
 * ENFOQUES cuando hay que elegir tarea, lo ESPERADO para A6 y lo APRENDIDO para
 * A8. Ni proveedor, ni modelo, ni cuenta, ni prompt: no son de esta capa.
 */
export interface PeticionAlgoritmica<T = unknown> {
  /** La decisión, con el contrato de A1. */
  decision: DecisionContext<T>;
  /** Cuando las alternativas hay que GENERARLAS: la tarea, con los pasos del Planner. */
  tarea?: TareaADescomponer;
  /** Cuando antes hay que elegir ENFOQUE: varias tareas posibles, con sus valores. */
  enfoques?: readonly Alternative<TareaADescomponer>[];
  /** Lo que se espera de la salida. Lo comprueba A6 cuando vuelva la ejecución. */
  expected?: readonly OutputExpectation[];
  /**
   * Lo aprendido y de qué va la decisión, para A8. El objetivo y el
   * presupuesto son los de la decisión: no se declaran dos veces.
   */
  aprendido?: Omit<PeticionDeContexto, 'objective' | 'budget'>;
  componer?: ComposicionDelCiclo;
}

/* ── Lo que devuelve ──────────────────────────────────────────────────────── */

/** Qué autoridad actuó. El recorrido dice cuáles, y en qué orden. */
export type PasoDelCiclo =
  | 'context' | 'approach' | 'decomposition' | 'parallelization'
  | 'strategy' | 'optimization' | 'decision' | 'handoff';

/**
 * POR QUÉ SE PARÓ EL CICLO ANTES DE ENTREGAR.
 *
 * Cerrada, como el resto de vocabularios de parada del motor: cada motivo lleva
 * a una acción distinta de quien pidió, y un motivo que nadie contempla acaba
 * en el `default` que lo trata como bueno.
 */
export type MotivoDeParada =
  /* La petición no tiene la forma mínima. */
  | 'malformed_request'
  /* Trae alternativas por más de un camino: no se elige cuál vale. */
  | 'ambiguous_alternatives'
  /* Declara un historial —del ámbito o por alternativa— Y pide a A8 que lo seleccione: dos fuentes para lo mismo. */
  | 'history_twice'
  /* A8 rechazó la petición de contexto: sin reloj no se sabe qué sigue valiendo. */
  | 'context_rejected'
  /* A8 no contesta para ese ámbito —una cuenta, un campo de persona—. */
  | 'context_refused'
  /* A1 no eligió enfoque. */
  | 'approach_undecided'
  /* A2 encontró la tarea mal formada: ciclos, dependencias rotas… */
  | 'invalid_task'
  /* A1 no eligió. No es un error: puede no haber nada que recomendar. */
  | 'undecided'
  /* La entrega nombraba una implementación: eso es del Router. */
  | 'authority_violation';

/**
 * LO QUE CRUZA LA FRONTERA: la entrega a quien ejecuta.
 *
 * El plan son los pasos del Planner, TAL CUAL, con la estructura que eligió A1
 * sobre lo que propusieron A3, A4 y A5. Las restricciones son los requisitos de
 * ejecución de la petición —calidad, presupuesto, plazo—, que es lo que el
 * Router puede leer de ellos. Nada de proveedor ni de modelo: lo comprueba
 * `violacionesEn` antes de entregar, y es la única guarda que mira lo que la
 * petición trae en `constraints` y en `expected`.
 */
export interface EntregaDeEjecucion {
  /** El plan elegido, cuando la decisión fue entre planes. */
  plan?: Strategy;
  /** La alternativa elegida, por su id, cuando la decisión fue entre opciones ya dadas. */
  elegida?: string;
  constraints?: AlgorithmConstraints;
  expected?: readonly OutputExpectation[];
}

/**
 * EL RESULTADO DEL CICLO DE DECISIÓN.
 *
 * Un sobre, no un resumen. Cada autoridad está aquí con SU salida, sin copiar
 * ni recalcular nada: la confianza, la incertidumbre, la evidencia y la
 * explicación de la decisión están en `decision`, que es de A1; el plan
 * elegido es `entrega.plan`; las propuestas de recuperación del plan van en él
 * (A3), y las de un resultado verificado, en el cierre (A6).
 *
 * No lleva secretos, ni Credits, ni materiales, ni respuestas de proveedor: no
 * hay de dónde sacarlos, porque ninguna autoridad de A0–A8 los produce.
 */
export interface AlgorithmDecisionResult<T = unknown> {
  contract: string;
  status: DecisionStatus;
  /** Qué autoridades actuaron, en orden. */
  recorrido: readonly PasoDelCiclo[];
  /** Por qué se paró, cuando se paró antes de entregar. */
  parada?: MotivoDeParada;
  context?: ConjuntoDeSenales;
  /**
   * EL HISTORIAL DEL ÁMBITO QUE RECIBIÓ A1, leído del mismo contexto que se le
   * pasó: la prueba de que lo aprendido LLEGA. Desde 1.7 A1 lo lee, lo declara
   * y no ordena con él, porque es de todas las alternativas a la vez.
   */
  historial?: HistoryWindow;
  /**
   * EL HISTORIAL DE CADA ALTERNATIVA QUE RECIBIÓ A1 (1.8), por su identidad: el
   * que entregó A8, o el que declaró la petición cuando no hay A8. Es lo único
   * que puede ordenar, y lo ordena A1 con sus reglas.
   */
  historialPorAlternativa?: Readonly<Record<string, HistoryWindow>>;
  approach?: AlgorithmDecision<TareaADescomponer>;
  decomposition?: ResultadoDeDescomposicion;
  parallelization?: AnalisisDeParalelizacion;
  strategies?: ResultadoDeEstrategias;
  optimization?: OptimizationOutcome<Strategy>;
  decision?: AlgorithmDecision<T | Strategy>;
  entrega?: EntregaDeEjecucion;
  /** De qué iba la decisión, según A8: donde se aprenderá su resultado. */
  ambito?: AmbitoDeEvento;
  because: readonly string[];
}

/* ── Lo que vuelve de la ejecución ────────────────────────────────────────── */

/**
 * LO QUE SE OBSERVÓ AL EJECUTAR. Lo dice quien ejecutó, no A9.
 *
 * `kind` es cómo acabó la ejecución, en el vocabulario de A7; `actual` es lo
 * que salió, en el de A6. Son dos hechos distintos y los dos importan: una
 * ejecución puede terminar bien y no cumplir lo esperado.
 */
export interface ObservacionDeEjecucion {
  kind: ClaseDeResultado;
  actual: ResultadoAVerificar;
  /** Cuándo acabó. Epoch ms. */
  at: number;
  /** Lo medido —latencia, coste—, con su procedencia. */
  signals?: readonly Signal[];
  /** Si se ejecutó una recuperación, y cómo fue. Solo de lo ejecutado se aprende. */
  recovery?: { kind: string; executed?: boolean; succeeded?: boolean };
}

/** Con qué reloj y sobre qué estado se aprende. El reloj es obligatorio para A7. */
export interface OpcionesDeAprendizaje {
  ahora: number;
  previo?: readonly AgregadoDeAprendizaje[];
  policy?: Partial<PoliticaDeAprendizaje>;
}

export type MotivoDeCierreInvalido =
  /* No hubo decisión que entregar, así que no hay nada que cerrar. */
  | 'not_decided'
  /* La observación no tiene forma: sin clase conocida, sin resultado o sin fecha. */
  | 'malformed_observation';

/**
 * EL CIERRE: lo que dijeron A6 y A7 de lo que pasó.
 *
 * El resultado se aprende en el ámbito en que se DECIDIÓ —el de A8— más la
 * IDENTIDAD de la alternativa que se entregó (`strategyId`, contrato 1.8): el
 * `id` del plan elegido o de la opción elegida, que es lo que se ejecutó. Así
 * A7 aprende por alternativa y A8 lo devuelve como historial de ESA alternativa
 * la próxima vez que se decida en ese ámbito. La identidad la pone quien
 * entregó, no quien ejecuta: una observación no puede atribuirse a otra. Lo de
 * la implementación —con qué proveedor o modelo se hizo— lo sabe quien ejecuta
 * y se aprendería en SU ámbito: no es de A9.
 */
export interface CierreDelCiclo {
  contract: string;
  status: 'closed' | 'invalid';
  parada?: MotivoDeCierreInvalido;
  verification?: VerificationResult;
  recovery?: AnalisisDeRecuperacion;
  outcome?: ResultadoDeDecision;
  learning?: SalidaDeAprendizaje;
  because: readonly string[];
}

/* ── La forma de una observación ──────────────────────────────────────────── */

/**
 * LAS CLASES DE RESULTADO, tal como A7 las declara.
 *
 * Un `Record` sobre su tipo y no una lista suelta: si A7 añade una clase, esto
 * deja de compilar hasta contemplarla —la misma técnica que A6 usa con los
 * códigos de error del Core—. Una clase inventada que entrara aquí, A7 la
 * contaría como un fracaso: dato falso.
 */
export const CLASES_DE_RESULTADO: Readonly<Record<ClaseDeResultado, true>> = Object.freeze({
  success: true, partial_success: true, failure: true, cancelled: true, unknown: true,
});

/** ¿Qué le falta a esta observación? `undefined` si nada. */
export const problemaDeObservacion = (o: unknown): string | undefined => {
  if (typeof o !== 'object' || o === null) return 'no es una observación';
  const x = o as Partial<ObservacionDeEjecucion>;
  if (typeof x.kind !== 'string' || !Object.prototype.hasOwnProperty.call(CLASES_DE_RESULTADO, x.kind)) {
    return `clase de resultado desconocida: ${String(x.kind)}`;
  }
  if (typeof x.actual !== 'object' || x.actual === null || typeof x.actual.id !== 'string' || !x.actual.id) {
    return 'sin resultado que verificar';
  }
  if (!instanteValido(x.at)) return 'sin fecha válida';
  return undefined;
};
