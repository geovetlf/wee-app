/**
 * WEE ALGORITHM ENGINE — ¿MEJORÓ ALGO?
 *
 * ── La pregunta que casi nunca se hace ──────────────────────────────────────
 *
 * «El algoritmo corrió» no es una métrica: es un latido. Lo que hay que poder
 * responder es si Weë entrega MEJOR, MÁS BARATO o MÁS RÁPIDO por tenerlo, y
 * eso obliga a algo incómodo: saber qué habría pasado sin él.
 *
 * Por eso aquí todo se mide CONTRA UNA LÍNEA BASE. Un motor que solo se mide a
 * sí mismo siempre parece que funciona.
 *
 * ── Lo que esto NO es ───────────────────────────────────────────────────────
 *
 * No es un sistema de analíticas. No guarda nada, no agrega nada y no conoce
 * ninguna base de datos: son funciones puras sobre dos números. Quien quiera
 * persistirlo usará `Tracer` (`core/observability.ts`), que ya existe y ya sabe
 * lo que nunca debe escribirse en un registro.
 *
 * No es experimentación. No hay asignación de cohortes, ni significancia, ni
 * test estadístico. Eso llega con A7 y necesitará datos que hoy no hay;
 * escribirlo ahora sería construir el aparato antes que la medición.
 */

import { ObjectiveAxis, seMaximiza } from './objective';
import { AlgorithmSpend } from './budget';

/**
 * LO QUE COSTÓ UN CAMINO, sea el del algoritmo o el de siempre.
 *
 * Los mismos ejes con los que se decide, para que comparar previsión y realidad
 * sea restar y no traducir. Todos opcionales: se mide lo que se puede medir.
 */
export interface Outcome {
  quality?: number;
  costUsd?: number;
  latencyMs?: number;
  /** ¿Terminó bien? Lo más importante y lo más fácil de olvidar. */
  succeeded?: boolean;
  /** Cuántas veces hubo que reintentar. */
  attempts?: number;
}

/** Cuánto mejoró un eje, en absoluto y en relativo. */
export interface AxisDelta {
  axis: ObjectiveAxis;
  baseline: number;
  actual: number;
  /** Positivo = mejor. Ya tiene en cuenta si el eje se maximiza o se minimiza. */
  absolute: number;
  /** Lo mismo, de 0 a 1 sobre la base. `undefined` si la base era 0: no se divide. */
  relative?: number;
}

/**
 * EL VALOR APORTADO.
 *
 * `improved` no es «alguna mejoró»: es que el balance sea positivo. Un
 * algoritmo que baja el coste un 5 % y la calidad un 30 % no ha mejorado nada,
 * y una métrica que dijera que sí sería peor que ninguna.
 */
export interface AlgorithmValue {
  algorithm: string;
  deltas: readonly AxisDelta[];
  /** Cuánto costó PENSARLO. Una mejora que cuesta más latencia de la que ahorra no es mejora. */
  spend: Readonly<AlgorithmSpend>;
  improved: boolean;
  /** Los ejes que empeoraron. Se nombran siempre, también cuando `improved`. */
  regressions: readonly ObjectiveAxis[];
}

const delta = (axis: ObjectiveAxis, baseline: number, actual: number): AxisDelta => {
  /* Positivo = mejor, se maximice o se minimice el eje. Se dice una vez. */
  const absolute = seMaximiza(axis) ? actual - baseline : baseline - actual;
  const relative = baseline !== 0 ? absolute / Math.abs(baseline) : undefined;
  return { axis, baseline, actual, absolute, relative };
};

const EJE_DE: readonly (readonly [keyof Outcome, ObjectiveAxis])[] = Object.freeze([
  ['quality', 'quality'],
  ['costUsd', 'cost'],
  ['latencyMs', 'latency'],
]);

/**
 * COMPARAR DOS CAMINOS.
 *
 * Solo se comparan los ejes que AMBOS midieron. Comparar contra un hueco es
 * inventar la mitad de la resta, y es la forma más fácil de que un algoritmo
 * parezca que mejora porque la línea base no se midió.
 *
 * La latencia de pensar entra en la cuenta de la latencia: si el algoritmo
 * ahorra 400 ms de ejecución y tarda 600 en decidirlo, ha empeorado, y esa es
 * exactamente la trampa que esta capa tiene que ser capaz de detectar en sí
 * misma.
 */
export const valorAportado = (
  algorithm: string,
  baseline: Outcome,
  actual: Outcome,
  spend: Readonly<AlgorithmSpend>,
): AlgorithmValue => {
  const deltas: AxisDelta[] = [];
  for (const [campo, eje] of EJE_DE) {
    const b = baseline?.[campo];
    const a = actual?.[campo];
    if (typeof b !== 'number' || typeof a !== 'number') continue;
    /* Pensar también tarda, y se paga en el mismo eje. */
    const real = eje === 'latency' ? a + (spend?.latencyMs ?? 0) : a;
    deltas.push(delta(eje, b, real));
  }
  /* Terminar o no terminar es el eje que manda: no hay calidad sin resultado. */
  if (typeof baseline?.succeeded === 'boolean' && typeof actual?.succeeded === 'boolean') {
    deltas.push(delta('successProbability', baseline.succeeded ? 1 : 0, actual.succeeded ? 1 : 0));
  }

  const regressions = deltas.filter((d) => d.absolute < 0).map((d) => d.axis);
  /*
   * El balance en RELATIVO y no en absoluto: sumar 0,3 de calidad con 0,02 de
   * dólar no significa nada, porque no están en la misma escala. Sin base para
   * relativizar, ese eje no vota — mejor un balance con menos ejes que uno con
   * una suma sin sentido.
   */
  const relativos = deltas.map((d) => d.relative).filter((r): r is number => typeof r === 'number');
  const balance = relativos.reduce((t, r) => t + r, 0);

  return {
    algorithm,
    deltas: Object.freeze(deltas),
    spend,
    improved: relativos.length > 0 && balance > 0,
    regressions: Object.freeze([...new Set(regressions)]),
  };
};

/**
 * LO QUE SE ANOTA DE UNA EJECUCIÓN DEL MOTOR.
 *
 * Cabe entero en `OperationTrace` salvo lo que es propio de esta capa, y por
 * eso se declara aparte en vez de ensanchar la traza del Core: la traza es de
 * todos y crecerla para un caso es cómo acaba siendo de nadie.
 *
 * Ni una clave de señal con datos de nadie, ni un texto de la persona. Lo que
 * no está no se filtra.
 */
export interface AlgorithmMetric {
  algorithm: string;
  category: string;
  status: 'decided' | 'undecided' | 'invalid';
  failure?: string;
  candidateCount: number;
  selectedTotal?: number;
  confidence: number;
  uncertainty: string;
  replans: number;
  spend: Readonly<AlgorithmSpend>;
  /** Si se pudo comparar con la línea base. Ausente = todavía no se sabe. */
  improved?: boolean;
  at: number;
}
