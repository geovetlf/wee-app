/**
 * WEE ALGORITHM ENGINE — COMPARAR ESTRATEGIAS.
 *
 * ── Por qué esto no es el scoring del Router ────────────────────────────────
 *
 * Tienen la misma forma —componentes 0–1, pesos, media ponderada, el total y
 * sus partes guardadas para poder auditar— y puntúan cosas distintas:
 *
 *     RoutingScore   ¿qué implementación sirve mejor ESTE paso?
 *     StrategyScore  ¿qué FORMA de hacer el trabajo entero sale mejor?
 *
 * Se escriben dos veces a propósito. Fundirlos obligaría a que uno de los dos
 * supiera del otro, y el día que alguien metiera un eje de proveedor aquí, esta
 * capa habría empezado a enrutar sin que nadie lo decidiera.
 *
 * ── Lo relativo y lo absoluto ───────────────────────────────────────────────
 *
 * La calidad es absoluta: 0,8 es 0,8. El coste no: treinta céntimos son caros o
 * baratos según con qué se comparen. Por eso los ejes que se minimizan se
 * normalizan CONTRA EL CONJUNTO de candidatos, exactamente como hace el Router
 * con `costFit`, y por eso puntuar un candidato solo no significa nada.
 *
 * ── Y cuando no hay un ganador ──────────────────────────────────────────────
 *
 * A veces no lo hay: una es mejor en calidad y otra en coste, y elegir depende
 * de algo que esta capa no sabe. `pareto` devuelve las que nadie domina en
 * lugar de fingir un orden total. Un número que resuelve un empate real es un
 * número que esconde una decisión.
 */

import { EJES, Objective, ObjectiveAxis, pesosNormalizados, seMaximiza } from './objective';
import { Strategy } from './strategy';

/** Lo que se midió de un candidato, por eje. Todo 0–1 salvo lo que se normaliza después. */
export type AxisValues = Partial<Readonly<Record<ObjectiveAxis, number>>>;

/**
 * UNA PUNTUACIÓN, DESGLOSADA.
 *
 * Se guardan las partes y no solo el total, por lo mismo que el Router: una
 * decisión que solo dice «0,82» no se puede auditar, y esta capa existe para
 * que las decisiones de Weë se puedan revisar.
 *
 * `missing` es lo que no se pudo medir. Sin él, un eje ausente y un eje que
 * salió 0 se leen igual, y son cosas opuestas: uno es «no lo sé» y el otro «es
 * malo». Confundirlos es cómo una estrategia sin datos gana por no tener malos.
 */
export interface StrategyScore {
  /** Por eje, ya normalizado a «más es mejor». */
  fits: Readonly<Record<ObjectiveAxis, number>>;
  /** Media ponderada de los ejes que SÍ se pudieron medir. */
  total: number;
  /** Los ejes con peso que no se pudieron medir. */
  missing: readonly ObjectiveAxis[];
  /** Cuánto del peso total se pudo aplicar, 0–1. Bajo = el total dice poco. */
  coverage: number;
}

/** Un candidato: algo que comparar, con lo que se midió de él. */
export interface Alternative<T> {
  id: string;
  /** Qué es. Una estrategia, un reparto, un orden… */
  value: T;
  values: AxisValues;
  score?: StrategyScore;
}

/** Los ejes que trae una estrategia, leídos de su previsión. */
export const ejesDeEstrategia = (s: Strategy): AxisValues => {
  const e = s?.expected ?? ({} as Strategy['expected']);
  const v: Partial<Record<ObjectiveAxis, number>> = {};
  if (typeof e.quality === 'number') v.quality = e.quality;
  if (typeof e.costUsd === 'number') v.cost = e.costUsd;
  if (typeof e.latencyMs === 'number') v.latency = e.latencyMs;
  if (typeof e.successProbability === 'number') v.successProbability = e.successProbability;
  /* Fiabilidad y riesgo son el mismo eje visto del derecho y del revés. */
  if (typeof e.risk === 'number') v.reliability = Math.max(0, Math.min(1, 1 - e.risk));
  return v;
};

/**
 * NORMALIZAR UN EJE CONTRA EL CONJUNTO.
 *
 * Para lo que se maximiza, el valor se acota a 0–1 y ya está: es una escala que
 * ya significa algo. Para lo que se minimiza —coste, latencia— se reparte entre
 * el mejor y el peor del conjunto, porque no hay una escala absoluta.
 *
 * Cuando todos valen lo mismo, todos sacan 1. No 0, y no 0,5: si el coste no
 * distingue a nadie, no debe penalizar a nadie, y ponerlo a la mitad haría que
 * un eje irrelevante arrastrara el total hacia abajo por igual.
 */
const normalizar = (eje: ObjectiveAxis, valores: readonly number[], valor: number): number => {
  if (seMaximiza(eje)) return Math.max(0, Math.min(1, valor));
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 1;
  return Math.max(0, Math.min(1, 1 - (valor - min) / (max - min)));
};

/**
 * PUNTUAR UN CONJUNTO. Nunca uno solo, y ese es el punto.
 *
 * Devuelve los mismos candidatos con su `score`, en el MISMO orden en que
 * llegaron: ordenar es otra operación y mezclarlas hace que quien recibe no
 * sepa si el orden significa algo.
 *
 * Un candidato al que le falta un eje con peso no se descarta y no se le pone
 * un 0 inventado: se le baja la `coverage` y se dice qué falta. Así una
 * estrategia bien medida gana a una a medias sin que nadie tenga que fingir
 * datos.
 */
export const puntuar = <T>(
  candidatos: readonly Alternative<T>[],
  objective?: Objective,
): readonly Alternative<T>[] => {
  if (!candidatos?.length) return [];
  const pesos = pesosNormalizados(objective);

  /* Los valores de cada eje en todo el conjunto: lo que permite normalizar. */
  const porEje = {} as Record<ObjectiveAxis, number[]>;
  for (const eje of EJES) {
    porEje[eje] = candidatos
      .map((c) => c.values?.[eje])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  }

  return candidatos.map((c) => {
    const fits = {} as Record<ObjectiveAxis, number>;
    const missing: ObjectiveAxis[] = [];
    let suma = 0;
    let pesoAplicado = 0;
    let pesoTotal = 0;

    for (const eje of EJES) {
      const peso = pesos[eje] ?? 0;
      pesoTotal += peso;
      const valor = c.values?.[eje];
      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        fits[eje] = 0;
        if (peso > 0) missing.push(eje);
        continue;
      }
      const fit = normalizar(eje, porEje[eje], valor);
      fits[eje] = fit;
      if (peso > 0) { suma += fit * peso; pesoAplicado += peso; }
    }

    const score: StrategyScore = {
      fits: Object.freeze(fits),
      total: pesoAplicado > 0 ? suma / pesoAplicado : 0,
      missing: Object.freeze(missing),
      coverage: pesoTotal > 0 ? pesoAplicado / pesoTotal : 0,
    };
    return { ...c, score };
  });
};

/**
 * ORDENAR: por total, y desempatando por cobertura.
 *
 * El desempate no es un detalle. Entre dos que puntúan igual, gana la que se
 * pudo medir mejor — porque la otra puede estar empatando por casualidad. Y a
 * igualdad de las dos cosas manda el `id`, para que el orden sea DETERMINISTA:
 * dos ejecuciones con la misma entrada tienen que dar el mismo resultado o no
 * se puede reproducir nada.
 */
export const ordenar = <T>(candidatos: readonly Alternative<T>[]): readonly Alternative<T>[] =>
  [...candidatos].sort((a, b) => {
    const ta = a.score?.total ?? 0;
    const tb = b.score?.total ?? 0;
    if (ta !== tb) return tb - ta;
    const ca = a.score?.coverage ?? 0;
    const cb = b.score?.coverage ?? 0;
    if (ca !== cb) return cb - ca;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

/**
 * LOS QUE NADIE DOMINA.
 *
 * A domina a B si no es peor en ningún eje medido y es mejor en al menos uno.
 * Lo que queda es el frente: las opciones entre las que elegir es una decisión
 * de verdad y no una cuenta.
 *
 * Solo se comparan los ejes CON PESO y que los dos hayan medido. Comparar por
 * un eje que a uno le falta convertiría «no lo sé» en «es peor», que es
 * justamente lo que `missing` existe para evitar.
 */
export const pareto = <T>(
  candidatos: readonly Alternative<T>[],
  objective?: Objective,
): readonly Alternative<T>[] => {
  const pesos = pesosNormalizados(objective);
  const activos = EJES.filter((e) => (pesos[e] ?? 0) > 0);
  const mejor = (eje: ObjectiveAxis, a: number, b: number) => (seMaximiza(eje) ? a > b : a < b);

  const domina = (a: Alternative<T>, b: Alternative<T>): boolean => {
    let alMenosUno = false;
    let comparables = 0;
    for (const eje of activos) {
      const va = a.values?.[eje];
      const vb = b.values?.[eje];
      if (typeof va !== 'number' || typeof vb !== 'number') continue;
      comparables++;
      if (mejor(eje, vb, va)) return false;
      if (mejor(eje, va, vb)) alMenosUno = true;
    }
    return comparables > 0 && alMenosUno;
  };

  return candidatos.filter((c) => !candidatos.some((otro) => otro.id !== c.id && domina(otro, c)));
};
