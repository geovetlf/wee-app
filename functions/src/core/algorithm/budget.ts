/**
 * WEE ALGORITHM ENGINE — CUÁNTO PUEDE PENSAR ANTES DE TENER QUE CONTESTAR.
 *
 * ── El riesgo real de esta capa ─────────────────────────────────────────────
 *
 * Un algoritmo inteligente y lento no sirve. Weë atiende a gente que está
 * mirando una pantalla, y la diferencia entre una decisión buena en 80 ms y una
 * decisión perfecta en 6 s es que la segunda nunca llega a usarse.
 *
 * Peor: casi todo lo que esta capa querrá hacer —combinar pasos, permutar
 * órdenes, explorar alternativas— es combinatorio por naturaleza. Sin un tope,
 * el primer algoritmo de descomposición decente convierte una petición en un
 * recorrido de un espacio que crece factorialmente, y nadie lo nota hasta que
 * es un incidente.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * TODO consumo pasa por aquí, y cuando se acaba NO se falla: se devuelve lo
 * mejor que se haya encontrado. Un motor de optimización que lanza una
 * excepción cuando se queda sin tiempo es peor que no tenerlo, porque convierte
 * «no pude mejorarlo» en «rompí tu petición».
 *
 * Fallar solo es correcto cuando NO hay nada que devolver, y entonces la razón
 * es `budget_exceeded` y quien llamó sigue teniendo su camino de siempre.
 *
 * ── Lo que esto NO es ───────────────────────────────────────────────────────
 *
 * No es `Budget` de `core/cost.ts`. Aquel es el dinero de la persona —Credits y
 * USD— y lo gobierna el Financial Core. Esto es tiempo de CPU y número de
 * candidatos, no lo paga nadie, y confundirlos sería cobrarle a alguien por
 * pensar.
 */

import { AlgorithmBudgetLimits, TOPES_MAXIMOS, TOPES_POR_DEFECTO } from './types';
import { RangoDeRestriccion, motivoDeNumeroInvalido } from './objective';

/** Lo que se lleva gastado. Las mismas claves que los topes, para poder comparar. */
export interface AlgorithmSpend {
  latencyMs: number;
  candidates: number;
  iterations: number;
  depth: number;
  replans: number;
  evidence: number;
  algorithmCalls: number;
  checks: number;
  evaluators: number;
}

export const GASTO_CERO: Readonly<AlgorithmSpend> = Object.freeze({
  latencyMs: 0, candidates: 0, iterations: 0, depth: 0, replans: 0, evidence: 0, algorithmCalls: 0,
  checks: 0, evaluators: 0,
});

/** Qué tope corresponde a cada contador. Escrito una vez para que nadie lo empareje mal. */
const TOPE_DE: Readonly<Record<keyof AlgorithmSpend, keyof AlgorithmBudgetLimits>> = Object.freeze({
  latencyMs: 'maxLatencyMs',
  candidates: 'maxCandidates',
  iterations: 'maxIterations',
  depth: 'maxDepth',
  replans: 'maxReplans',
  evidence: 'maxEvidence',
  algorithmCalls: 'maxAlgorithmCalls',
  checks: 'maxChecks',
  evaluators: 'maxEvaluators',
});

export const CONTADORES: readonly (keyof AlgorithmSpend)[] = Object.freeze(
  Object.keys(TOPE_DE) as (keyof AlgorithmSpend)[],
);

/** El tope que vigila un contador: para NOMBRAR el presupuesto que se agotó (S2-B · B.4). */
export const topeDelContador = (contador: keyof AlgorithmSpend): keyof AlgorithmBudgetLimits => TOPE_DE[contador];

/**
 * EL TOPE QUE DE VERDAD RIGE.
 *
 * Tres reglas, en este orden:
 *
 *   1. Si NADIE lo declara, rige el valor por defecto. «Sin declarar» no puede
 *      significar «sin límite»: así es como estos sistemas se caen.
 *   2. Si varios lo declaran, rige el MÁS ESTRECHO. Un algoritmo no se concede
 *      más de lo que le dio quien llama, ni al revés.
 *   3. Y en todo caso, nunca por encima del techo absoluto.
 *
 * ── Por qué el defecto no entra en el mínimo ────────────────────────────────
 *
 * Porque entonces nadie podría pedir más de lo que trae de fábrica, y el techo
 * sería inalcanzable —código muerto—. Un algoritmo de descomposición que
 * legítimamente necesite evaluar 64 candidatos tiene que poder declararlo; lo
 * que no puede es concederse 100 000, y para eso está la regla 3.
 *
 * Lo encontró una prueba de esta misma fase: el techo estaba escrito, exportado
 * y era imposible de alcanzar.
 */
export const presupuestoEfectivo = (
  ...capas: readonly (AlgorithmBudgetLimits | undefined)[]
): Required<AlgorithmBudgetLimits> => {
  const salida = {} as Required<AlgorithmBudgetLimits>;
  for (const clave of Object.keys(TOPES_POR_DEFECTO) as (keyof AlgorithmBudgetLimits)[]) {
    const declarados = capas
      .map((capa) => capa?.[clave])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const valor = declarados.length ? Math.min(...declarados) : TOPES_POR_DEFECTO[clave];
    salida[clave] = Math.min(valor, TOPES_MAXIMOS[clave]);
  }
  return Object.freeze(salida);
};

/**
 * LOS TOPES DE PENSAR QUE SE VALIDAN, CON SU RANGO DE SIEMPRE (S2-B · B.4).
 *
 * `maxEvidence` y `maxDepth`: los dos a los que S2-B · B.4 les da significado.
 * Su rango NO es nuevo: es el que `presupuestoEfectivo` ya exigía para tenerlos
 * en cuenta —un número finito y no negativo—. Lo que cambia es qué pasa con uno
 * que no lo cumple: ya no se ignora en silencio para que rija el defecto, sino
 * que se rechaza con la regla de las restricciones (`motivoDeNumeroInvalido`,
 * S2-B · B.1), la misma función y el mismo veredicto. El resto de topes sigue,
 * por ahora, con la regla de `presupuestoEfectivo`.
 */
export const RANGO_DEL_PRESUPUESTO: Readonly<Partial<Record<keyof AlgorithmBudgetLimits, RangoDeRestriccion>>> = Object.freeze({
  maxEvidence: 'noNegativo',
  maxDepth: 'noNegativo',
});

/**
 * LO MAL FORMADO DE UN PRESUPUESTO DE PENSAR, como `budget.<campo>: motivo`.
 *
 * Ausente (`undefined`, o `null` como con un lado de restricciones) es no
 * declarar nada. Un `budget` que no es un objeto sí es un problema: sus topes no
 * se podrían leer, y callarlo sería perderlos sin decirlo. El motivo dice el
 * tipo, nunca el valor.
 */
export const problemasDelPresupuesto = (budget: unknown): readonly string[] => {
  if (budget === undefined || budget === null) return Object.freeze([]);
  if (typeof budget !== 'object' || Array.isArray(budget)) {
    return Object.freeze([`budget: no es un objeto de presupuesto (${Array.isArray(budget) ? 'array' : typeof budget})`]);
  }
  const malas: string[] = [];
  for (const [campo, rango] of Object.entries(RANGO_DEL_PRESUPUESTO) as [keyof AlgorithmBudgetLimits, RangoDeRestriccion][]) {
    const v = (budget as Record<string, unknown>)[campo];
    if (v === undefined) continue;
    const motivo = motivoDeNumeroInvalido(rango, v);
    if (motivo) malas.push(`budget.${campo}: ${motivo}`);
  }
  return Object.freeze(malas);
};

/** ¿Se pasó algún contador? Devuelve cuál, para poder decirlo; `undefined` si cabe. */
export const contadorAgotado = (
  gasto: AlgorithmSpend,
  topes: Required<AlgorithmBudgetLimits>,
): keyof AlgorithmSpend | undefined =>
  CONTADORES.find((c) => gasto[c] > topes[TOPE_DE[c]]);

export const dentroDelPresupuesto = (gasto: AlgorithmSpend, topes: Required<AlgorithmBudgetLimits>): boolean =>
  contadorAgotado(gasto, topes) === undefined;

/**
 * EL CONTADOR.
 *
 * Un objeto pequeño y mutable, y es la única mutación de toda esta capa. Se
 * eligió a conciencia frente a pasar el gasto por parámetro en cada llamada:
 * ese estilo obliga a que cada función devuelva su gasto, y basta con que UNA
 * se le olvide para que el tope deje de contar sin que nada lo avise.
 *
 * Es local a una decisión, nace y muere con ella, y nunca se comparte entre
 * peticiones: no es estado de módulo, que es lo que el Core sí prohíbe.
 */
export interface Contador {
  /** Suma y dice si TODAVÍA cabe. `false` = se acabó, devuelve lo que tengas. */
  gastar(que: keyof AlgorithmSpend, cuanto?: number): boolean;
  /** Lo hace sin sumar: para preguntar antes de empezar algo caro. */
  cabe(que: keyof AlgorithmSpend, cuanto?: number): boolean;
  /** El nivel de anidamiento, que no se acumula: sube y baja. */
  profundidad(nivel: number): boolean;
  gasto(): Readonly<AlgorithmSpend>;
  topes(): Required<AlgorithmBudgetLimits>;
  /** Qué contador se agotó, si alguno. */
  agotado(): keyof AlgorithmSpend | undefined;
}

/**
 * Un contador sobre unos topes ya resueltos.
 *
 * `ahora` entra como puerto y no se llama a `Date.now()` aquí dentro: el Core
 * es puro, y una función que mira el reloj no se puede probar dos veces con el
 * mismo resultado. Es el mismo criterio que ya usa el Router con `deps.now`.
 */
export const crearContador = (
  topes: Required<AlgorithmBudgetLimits>,
  ahora?: () => number,
): Contador => {
  const gasto: AlgorithmSpend = { ...GASTO_CERO };
  const inicio = ahora ? ahora() : undefined;

  const sincronizarReloj = (): void => {
    if (ahora && inicio !== undefined) gasto.latencyMs = Math.max(0, ahora() - inicio);
  };

  const cabe = (que: keyof AlgorithmSpend, cuanto = 1): boolean => {
    sincronizarReloj();
    if (contadorAgotado(gasto, topes) !== undefined) return false;
    return gasto[que] + cuanto <= topes[TOPE_DE[que]];
  };

  return {
    cabe,
    gastar(que, cuanto = 1) {
      sincronizarReloj();
      gasto[que] += cuanto;
      return contadorAgotado(gasto, topes) === undefined;
    },
    profundidad(nivel) {
      sincronizarReloj();
      /* La profundidad no se acumula: es dónde estás, no cuánto has bajado. */
      gasto.depth = Math.max(gasto.depth, Math.max(0, nivel));
      return contadorAgotado(gasto, topes) === undefined;
    },
    gasto() {
      sincronizarReloj();
      return Object.freeze({ ...gasto });
    },
    topes: () => topes,
    agotado() {
      sincronizarReloj();
      return contadorAgotado(gasto, topes);
    },
  };
};

/**
 * EL PARACAÍDAS.
 *
 * Lo que hace un algoritmo cuando se le acaba el presupuesto. Los tres son
 * legítimos y la diferencia importa, así que se elige y no se deduce:
 *
 *   best_effort  devuelve lo mejor encontrado. El correcto casi siempre.
 *   fallback     se lo pasa a otro algoritmo, el declarado en el descriptor.
 *   delegate     se lo devuelve a quien llamó, que ya tiene su camino de
 *                siempre. Weë funcionaba antes de esta capa y tiene que
 *                seguir funcionando cuando esta capa no llegue a tiempo.
 *
 * No hay una cuarta opción que sea «fallar». Cuando no hay nada que devolver no
 * es una estrategia de agotamiento: es `no_valid_strategy`, y se dice así.
 */
export type FailSafe = 'best_effort' | 'fallback' | 'delegate';

export const FAIL_SAFE_POR_DEFECTO: FailSafe = 'best_effort';
