/**
 * WEE ALGORITHM ENGINE — QUÉ SE INTENTA CONSEGUIR, Y DENTRO DE QUÉ LÍMITES.
 *
 * ── Por qué objetivo y restricción son cosas distintas ──────────────────────
 *
 * Porque se comportan al revés. Un OBJETIVO se maximiza: más calidad siempre es
 * mejor, y si no se alcanza del todo la respuesta sigue valiendo. Una
 * RESTRICCIÓN se cumple o no: 31 Credits cuando el tope era 30 no es «casi»,
 * es que no.
 *
 * Mezclarlas es el error clásico —meter el coste como un peso más y confiar en
 * que el número salga—, y produce exactamente el fallo que nadie ve venir: una
 * estrategia preciosa que se pasa del presupuesto gana porque su calidad
 * compensaba. Aquí las restricciones FILTRAN antes de que nadie puntúe.
 *
 * ── Lo que se reutiliza ─────────────────────────────────────────────────────
 *
 * `Budget` (`core/cost.ts`) es el dinero, con su `maxCredits`, su `maxUsd` y su
 * `prefer`. `QualityRequirement` (`core/workflow.ts`) es lo que se le exige al
 * resultado. Los dos ya existen, los dos se usan tal cual, y ninguno se copia:
 * lo que este archivo añade es poder decir «maximiza esto SUJETO A aquello»,
 * que es justo lo que no se podía expresar.
 */

import { Budget } from '../cost';
import { QualityRequirement } from '../workflow';

/**
 * LOS EJES SOBRE LOS QUE SE OPTIMIZA.
 *
 * Cerrado, y corto. Un eje que no se puede medir no sirve para decidir, así que
 * aquí solo están los que Weë YA sabe medir o podrá medir con lo que tiene:
 * el libro guarda coste y latencia, el Router guarda fiabilidad, y la calidad
 * la exige `QualityRequirement`.
 *
 * `userValue` está a propósito sin implementación. Es el eje que de verdad
 * importa y el único que Weë todavía no sabe medir; declararlo aquí, vacío y
 * con este comentario, es mejor que fingir una fórmula. Cuando exista feedback
 * real (A7) tendrá con qué llenarse.
 */
export type ObjectiveAxis =
  | 'quality'
  | 'cost'
  | 'latency'
  | 'reliability'
  /* La probabilidad de que el trabajo termine bien a la primera. */
  | 'successProbability'
  /* Lo que la persona valora. Sin medición todavía; ver arriba. */
  | 'userValue';

export const EJES: readonly ObjectiveAxis[] = Object.freeze([
  'quality', 'cost', 'latency', 'reliability', 'successProbability', 'userValue',
]);

/** Para `cost` y `latency`, menos es mejor. Se dice una vez y nadie lo reinventa al revés. */
export const SE_MINIMIZA: readonly ObjectiveAxis[] = Object.freeze(['cost', 'latency']);

export const seMaximiza = (eje: ObjectiveAxis): boolean => !SE_MINIMIZA.includes(eje);

/**
 * QUÉ PESA CUÁNTO.
 *
 * Números sueltos, 0–1, que se normalizan al sumar. No se guardan normalizados
 * a propósito: quien escribe `{ quality: 1, cost: 0.5 }` está diciendo algo
 * legible, y obligarle a que sumen 1 convierte una intención en aritmética.
 *
 * Los ejes que no aparecen no cuentan. No es lo mismo que pesar 0 en el
 * resultado —lo es—, pero sí en lo que se lee: un eje ausente es un eje que no
 * interesa, y un eje a 0 es uno que se consideró y se descartó.
 */
export type ObjectiveWeights = Partial<Readonly<Record<ObjectiveAxis, number>>>;

/**
 * UN OBJETIVO, CON SUS CONDICIONES.
 *
 * La forma que el brief pedía poder expresar:
 *
 *     maximizar calidad
 *     sujeto a:  coste ≤ presupuesto
 *                latencia ≤ límite
 *                riesgo ≤ umbral
 *
 * `weights` es la parte que se maximiza; `constraints` es la que se cumple. Un
 * objetivo sin pesos es válido y significa «me da igual cómo, con que cumpla».
 */
export interface Objective {
  /** Un nombre para el informe: 'rápido y barato', 'lo mejor posible'. */
  label?: string;
  weights: ObjectiveWeights;
  constraints?: AlgorithmConstraints;
}

/**
 * LO QUE HAY QUE CUMPLIR SÍ O SÍ.
 *
 * Datos, nunca `if` repartidos. Es la diferencia entre poder explicar por qué
 * se descartó una estrategia y tener que leer código para averiguarlo, y es
 * literalmente lo que el brief pide en su punto 6.
 *
 * Nada de esto es obligatorio: un contexto sin restricciones es un contexto en
 * el que todo cabe, que es un caso legítimo y frecuente.
 */
export interface AlgorithmConstraints {
  /** El dinero. El de `core/cost.ts`, sin envolver. */
  budget?: Budget;
  /** Lo que se le exigirá al resultado. El de `core/workflow.ts`, sin envolver. */
  quality?: QualityRequirement;
  /** Tope de reloj para el TRABAJO, no para pensarlo. Lo otro es `AlgorithmBudgetLimits`. */
  maxLatencyMs?: number;
  /** Cuándo deja de valer la pena, en epoch ms. */
  deadlineAt?: number;
  /** Cuántos pasos puede tener la estrategia. */
  maxSteps?: number;
  /** Cuántos pueden ir a la vez. Lo ejecuta el Orchestrator; aquí solo se acota. */
  maxParallel?: number;
  /** Riesgo máximo admisible, 0–1. Por encima, se descarta. */
  maxRisk?: number;
  /**
   * CUÁNTO HAY QUE SABER PARA PODER ELEGIR ALGO, 0–1.
   *
   * No hay un umbral universal y no se inventa uno: una recomendación de qué
   * ver puede decidirse con poco, y un trabajo que cuesta dinero no. Quien pide
   * lo declara, y si no lo declara, la confianza se informa pero no descarta.
   *
   * Se comprueba DESPUÉS de puntuar, porque la confianza depende de la
   * cobertura y la cobertura no existe hasta que hay puntuación. Sigue siendo
   * una restricción dura: lo que no llega, se rechaza con su motivo.
   */
  minConfidence?: number;
  /**
   * CAPACIDADES QUE NO SE PUEDEN USAR. Del catálogo del Core.
   *
   * Sirve para lo que hoy no se puede decir: «hazlo sin música» porque
   * `music.generate` está pendiente. Son CAPACIDADES —lo que hay que hacer—,
   * jamás proveedores ni modelos: elegir con qué no es de esta capa y
   * `authority.ts` lo impide.
   */
  forbiddenCapabilities?: readonly string[];
  /** Las que tienen que aparecer sí o sí. Mismo criterio. */
  requiredCapabilities?: readonly string[];
}

/**
 * EL OBJETIVO POR DEFECTO, y por qué es este.
 *
 * Los mismos valores que la política del Router traduce a esta escala: calidad
 * por delante, coste que pesa pero no manda, y fiabilidad que solo desempata.
 * No se inventa una jerarquía nueva porque Weë ya tomó esa decisión una vez
 * (`POLITICA_POR_DEFECTO`), y tener dos jerarquías distintas en dos capas es
 * cómo un sistema acaba contradiciéndose consigo mismo.
 */
export const OBJETIVO_POR_DEFECTO: Objective = Object.freeze({
  label: 'equilibrado',
  weights: Object.freeze({ quality: 0.45, cost: 0.25, latency: 0.2, reliability: 0.1 }),
});

/**
 * Los pesos, sumando 1. Lo que de verdad se usa al puntuar.
 *
 * Un objetivo con todos los pesos a 0 —o sin pesos— no se convierte en «nada
 * importa»: eso haría que cualquier estrategia empatase con cualquier otra y
 * que el desempate lo decidiera el orden de la lista, en silencio. Devuelve el
 * reparto por defecto, que es una decisión declarada y auditable.
 */
export const pesosNormalizados = (objective: Objective | undefined): Readonly<Record<ObjectiveAxis, number>> => {
  const crudos = objective?.weights ?? {};
  const limpios: Partial<Record<ObjectiveAxis, number>> = {};
  let total = 0;
  for (const eje of EJES) {
    const v = crudos[eje];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      limpios[eje] = v;
      total += v;
    }
  }
  if (total <= 0) return pesosNormalizados(OBJETIVO_POR_DEFECTO);
  const salida = {} as Record<ObjectiveAxis, number>;
  for (const eje of EJES) salida[eje] = (limpios[eje] ?? 0) / total;
  return Object.freeze(salida);
};

/**
 * ¿SE CONTRADICEN LAS RESTRICCIONES?
 *
 * Devuelve los conflictos, no el primero: arreglarlos de uno en uno es lo que
 * convierte una validación en un castigo, y ese criterio ya es el del Core
 * (`validarSkill`, `validarRegistro`).
 *
 * Solo detecta lo que se puede afirmar SIN estimar nada. Un «este presupuesto
 * no alcanza para esta calidad» necesita saber lo que cuestan las cosas, y eso
 * es del estimador, no de aquí: decirlo sin datos sería inventar.
 */
export const conflictosDeRestricciones = (c: AlgorithmConstraints | undefined): readonly string[] => {
  if (!c) return [];
  const malas: string[] = [];
  const positivo = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;

  if (c.maxSteps !== undefined && !positivo(c.maxSteps)) malas.push('maxSteps');
  if (c.maxParallel !== undefined && !positivo(c.maxParallel)) malas.push('maxParallel');
  if (c.maxLatencyMs !== undefined && !positivo(c.maxLatencyMs)) malas.push('maxLatencyMs');
  if (c.maxRisk !== undefined && (typeof c.maxRisk !== 'number' || c.maxRisk < 0 || c.maxRisk > 1)) malas.push('maxRisk');
  if (c.minConfidence !== undefined && (typeof c.minConfidence !== 'number' || c.minConfidence < 0 || c.minConfidence > 1)) malas.push('minConfidence');
  if (c.budget?.maxCredits !== undefined && c.budget.maxCredits < 0) malas.push('budget.maxCredits');
  if (c.budget?.maxUsd !== undefined && c.budget.maxUsd < 0) malas.push('budget.maxUsd');
  if (c.quality?.minScore !== undefined && (c.quality.minScore < 0 || c.quality.minScore > 1)) malas.push('quality.minScore');

  /* Pedir y prohibir la misma capacidad no se puede cumplir de ninguna manera. */
  const prohibidas = new Set(c.forbiddenCapabilities ?? []);
  for (const req of c.requiredCapabilities ?? []) {
    if (prohibidas.has(req)) malas.push(`requiredCapabilities:${req}`);
  }
  /* Más paralelo que pasos no es un error, pero maxParallel > maxSteps sí es incoherente. */
  if (positivo(c.maxSteps) && positivo(c.maxParallel) && (c.maxParallel as number) > (c.maxSteps as number)) {
    malas.push('maxParallel>maxSteps');
  }
  return malas;
};
