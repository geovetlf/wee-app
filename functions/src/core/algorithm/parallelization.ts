/**
 * WEE ALGORITHM ENGINE — A4 · CUÁNTO VALE PARALELIZAR.
 *
 * ── La pregunta, que no es la obvia ─────────────────────────────────────────
 *
 * A2 contestó «¿qué puede ir junto?». Aquí la pregunta es otra y es la que de
 * verdad importa: **¿cuánto valor aporta hacerlo?**
 *
 * Porque «se puede» y «conviene» son cosas distintas. Con tres tareas
 * independientes de 5 ms, 5 ms y 5 000 ms, ponerlas en paralelo no divide la
 * duración por tres: la tanda dura lo que dura la más lenta, así que se ahorran
 * 10 ms de 5 010. Un motor que dijera «paralelismo 3, tres veces más rápido»
 * estaría mintiendo con una fórmula.
 *
 * ── Lo que NO se hace ───────────────────────────────────────────────────────
 *
 * No se ejecuta nada. No hay `Promise.all`, ni workers, ni colas: quien ejecuta
 * grupos es el Orchestrator y ya lo hace. A4 devuelve números y grupos.
 *
 * Y no se inventa ni una duración. Sin `step.latencyMs` medido no hay
 * baseline, no hay ahorro y no hay aceleración — hay estructura, que también
 * vale, pero dicha como lo que es.
 *
 * ── Aritmética con red ──────────────────────────────────────────────────────
 *
 * Todo lo que se divide comprueba el divisor, todo lo que se resta comprueba el
 * signo, y nada puede salir `NaN`, `Infinity` ni negativo. Una aceleración
 * infinita es siempre un error de división, nunca un resultado.
 */

import { PlanStep } from '../planner';
import { SignalSource } from './signals';
import { ClaseDeRiesgo, RiesgoEstructural, Severidad, nivelesDeDependencia } from './strategy';

/* ── Duraciones ───────────────────────────────────────────────────────────── */

/** Cuánto dura un paso, cuando se sabe. `undefined` = no se sabe, y se dice. */
export type DuracionDe = (id: string) => number | undefined;

/** Una duración solo vale si es un número finito y no negativa. El resto no existe. */
export const duracionValida = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * LO QUE DURA UNA TANDA: lo que dura su paso más lento.
 *
 * No la suma —van a la vez— y no la media, que no significa nada aquí. Si a UN
 * paso de la tanda le falta la duración, la tanda no se sabe: un máximo parcial
 * presentado como máximo es un dato inventado con aspecto de medición.
 */
export const duracionDeTanda = (tanda: readonly string[], dur: DuracionDe): number | undefined => {
  if (!tanda.length) return 0;
  let mayor = 0;
  for (const id of tanda) {
    const d = dur(id);
    if (!duracionValida(d)) return undefined;
    if (d > mayor) mayor = d;
  }
  return mayor;
};

/** Lo que dura una disposición entera: la suma de lo que dura cada tanda. */
export const duracionDeDisposicion = (
  tandas: readonly (readonly string[])[],
  dur: DuracionDe,
): number | undefined => {
  let total = 0;
  for (const t of tandas) {
    const d = duracionDeTanda(t, dur);
    if (!duracionValida(d)) return undefined;
    total += d;
  }
  return total;
};

/** Lo que duraría en fila, una cosa detrás de otra. La referencia contra la que se mide. */
export const duracionSecuencial = (steps: readonly PlanStep[], dur: DuracionDe): number | undefined => {
  let total = 0;
  for (const s of steps) {
    const d = dur(s.id);
    if (!duracionValida(d)) return undefined;
    total += d;
  }
  return total;
};

/* ── Ahorro y aceleración, con red ────────────────────────────────────────── */

/**
 * CUÁNTO SE AHORRA. `baseline − paralelo`, y nunca negativo.
 *
 * Que salga negativo significaría que paralelizar tarda MÁS que ir en fila, y
 * eso no puede pasar con esta aritmética: una tanda dura como mucho la suma de
 * sus pasos. Si pasara, es un error de cálculo y se devuelve `undefined` en vez
 * de un número que nadie sabría interpretar.
 */
export const ahorroDe = (baselineMs: number | undefined, paraleloMs: number | undefined): number | undefined => {
  if (!duracionValida(baselineMs) || !duracionValida(paraleloMs)) return undefined;
  const ahorro = baselineMs - paraleloMs;
  return ahorro >= 0 ? ahorro : undefined;
};

/** Qué fracción del total se ahorra, 0–1. Sin baseline no hay fracción. */
export const razonDeAhorro = (baselineMs: number | undefined, paraleloMs: number | undefined): number | undefined => {
  const a = ahorroDe(baselineMs, paraleloMs);
  if (a === undefined || !duracionValida(baselineMs) || baselineMs <= 0) return undefined;
  return Math.min(1, a / baselineMs);
};

/**
 * CUÁNTAS VECES MÁS RÁPIDO. `baseline / paralelo`.
 *
 * Con el divisor comprobado, porque una aceleración infinita SIEMPRE es una
 * división por cero disfrazada. Si la versión paralela dura 0 —lo que solo pasa
 * cuando no hay nada que hacer—, no hay aceleración que contar.
 */
export const aceleracionDe = (baselineMs: number | undefined, paraleloMs: number | undefined): number | undefined => {
  if (!duracionValida(baselineMs) || !duracionValida(paraleloMs)) return undefined;
  if (paraleloMs <= 0) return undefined;
  const s = baselineMs / paraleloMs;
  return Number.isFinite(s) && s >= 0 ? s : undefined;
};

/* ── La forma del grafo ───────────────────────────────────────────────────── */

/** Un punto del grafo donde se abre o se cierra el abanico. */
export interface PuntoDeAbanico {
  stepId: string;
  /** Cuántos salen de él (fan-out) o cuántos esperan a él (fan-in). */
  count: number;
}

/** De cuántos pasos sale cada uno. Abrir mucho concentra el fallo en un punto. */
export const abanicoDeSalida = (steps: readonly PlanStep[], minimo = 4): readonly PuntoDeAbanico[] => {
  const existe = new Set(steps.map((s) => s.id));
  const cuenta = new Map<string, number>();
  for (const s of steps) for (const d of s.dependsOn ?? []) if (existe.has(d)) cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
  return Object.freeze([...cuenta.entries()]
    .filter(([, n]) => n >= minimo)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([stepId, count]) => ({ stepId, count })));
};

/**
 * A cuántos espera cada paso. Un fan-in es un PUNTO DE SINCRONIZACIÓN: no se
 * avanza hasta que termine el más lento de los que entran, así que ahí es
 * exactamente donde se pierde lo que se ganó paralelizando.
 */
export const abanicoDeEntrada = (steps: readonly PlanStep[], minimo = 2): readonly PuntoDeAbanico[] => {
  const existe = new Set(steps.map((s) => s.id));
  return Object.freeze(steps
    .map((s) => ({ stepId: s.id, count: (s.dependsOn ?? []).filter((d) => existe.has(d)).length }))
    .filter((x) => x.count >= minimo)
    .sort((a, b) => b.count - a.count || (a.stepId < b.stepId ? -1 : 1)));
};

/* ── Cuellos de botella ───────────────────────────────────────────────────── */

export type ClaseDeCuello =
  /* El paso que más dura de todo el trabajo. */
  | 'longest_task'
  /* Un paso que espera a varios: hasta que no acaban todos, no sigue nadie. */
  | 'join'
  /* Una tanda de uno solo en medio: ahí el paralelismo no existe. */
  | 'sequential'
  /* La tanda que más pesa en la duración total. */
  | 'critical_group';

export interface CuelloDeBotella {
  kind: ClaseDeCuello;
  stepId?: string;
  /** Qué tanda, cuando el cuello es de una tanda entera. */
  tanda?: readonly string[];
  durationMs?: number;
  because: string;
}

/**
 * DÓNDE SE ATASCA. Lo que hay que mirar antes de intentar acelerar nada.
 *
 * No se recalcula el camino crítico: A3 ya lo tiene y esto es otra pregunta
 * —dónde está el problema, no cuál es la cadena—. Sin duraciones se detectan
 * igual los cuellos ESTRUCTURALES (join, tanda de uno); los que dependen del
 * tiempo, no, y no se inventan.
 */
export const cuellosDeBotella = (
  steps: readonly PlanStep[],
  tandas: readonly (readonly string[])[],
  dur: DuracionDe,
): readonly CuelloDeBotella[] => {
  const salida: CuelloDeBotella[] = [];

  /* El paso más largo, si se sabe. Con empate manda el id: reproducible. */
  const conDuracion = steps
    .map((s) => ({ id: s.id, d: dur(s.id) }))
    .filter((x): x is { id: string; d: number } => duracionValida(x.d))
    .sort((a, b) => b.d - a.d || (a.id < b.id ? -1 : 1));
  if (conDuracion.length === steps.length && conDuracion.length > 1) {
    const top = conDuracion[0];
    salida.push({
      kind: 'longest_task', stepId: top.id, durationMs: top.d,
      because: `es el paso más largo (${top.d} ms de ${conDuracion.reduce((t, x) => t + x.d, 0)})`,
    });
  }

  /* Los puntos de sincronización: se ven sin duraciones. */
  for (const j of abanicoDeEntrada(steps, 2)) {
    salida.push({ kind: 'join', stepId: j.stepId, because: `espera a ${j.count}: no avanza hasta que acabe el más lento` });
  }

  /* Una tanda de uno en medio: ahí no hay paralelismo que valga. */
  tandas.forEach((t, i) => {
    if (t.length === 1 && i > 0 && i < tandas.length - 1) {
      salida.push({ kind: 'sequential', stepId: t[0], durationMs: dur(t[0]), because: 'va solo en su tanda: el paralelismo no lo alcanza' });
    }
  });

  /* Y la tanda que más pesa, cuando se puede medir. */
  const pesos = tandas.map((t) => ({ t, d: duracionDeTanda(t, dur) }));
  if (pesos.every((p) => duracionValida(p.d)) && pesos.length > 1) {
    const peor = pesos.reduce((a, b) => ((b.d as number) > (a.d as number) ? b : a));
    salida.push({
      kind: 'critical_group', tanda: peor.t, durationMs: peor.d,
      because: `esta tanda fija ${peor.d} ms de la duración total`,
    });
  }
  return Object.freeze(salida);
};

/* ── La curva ─────────────────────────────────────────────────────────────── */

/** Un punto de la curva: qué pasa si como mucho van `parallelism` cosas a la vez. */
export interface PuntoDeCurva {
  parallelism: number;
  tandas: readonly (readonly string[])[];
  /** Cuántas tandas: la profundidad de ESTA disposición. */
  depth: number;
  /** Lo que de verdad va a la vez como mucho aquí. Puede ser menor que `parallelism`. */
  actualWidth: number;
  baselineDurationMs?: number;
  parallelDurationMs?: number;
  savingsMs?: number;
  savingsRatio?: number;
  speedup?: number;
  /** Lo que se gana respecto al punto anterior de la curva. El número clave. */
  marginalSavingsMs?: number;
  /** Cuánto se cree la duración: 0 sin mediciones, y se dice. */
  confidence: number;
  provenance: SignalSource;
}

/**
 * CUÁNTO SE AHORRA RENDIMIENTO A RENDIMIENTO.
 *
 * El umbral es una fracción del BASELINE, no del ahorro máximo, y esa
 * diferencia es todo el asunto. Contra el ahorro máximo, el «mejor» punto sería
 * siempre el último —aunque ganara un milisegundo—; contra el baseline, ganar
 * 5 ms de 3 000 deja de contar, que es lo que significa que los rendimientos
 * decrecen.
 */
export const UMBRAL_MARGINAL = 0.01;

/**
 * DÓNDE DEJA DE COMPENSAR.
 *
 * El primer punto a partir del cual subir el paralelismo aporta menos del 1 %
 * del baseline. Si nada se sabe —sin duraciones— NO se recomienda nada:
 * recomendar sin datos es exactamente lo que esta capa no hace.
 */
export const dondeDejaDeCompensar = (
  curva: readonly PuntoDeCurva[],
  umbral = UMBRAL_MARGINAL,
): { parallelism: number; because: string } | undefined => {
  const medibles = curva.filter((p) => duracionValida(p.parallelDurationMs) && duracionValida(p.baselineDurationMs));
  if (medibles.length < 2) return undefined;
  const base = medibles[0].baselineDurationMs as number;
  if (base <= 0) return undefined;
  const minimo = base * umbral;
  for (let i = 1; i < medibles.length; i++) {
    const marginal = medibles[i].marginalSavingsMs;
    if (duracionValida(marginal) && marginal < minimo) {
      return {
        parallelism: medibles[i - 1].parallelism,
        because: `subir a ${medibles[i].parallelism} solo ahorraría ${Math.round(marginal)} ms de ${Math.round(base)}`,
      };
    }
  }
  const ultimo = medibles[medibles.length - 1];
  return { parallelism: ultimo.parallelism, because: 'cada escalón sigue aportando por encima del umbral' };
};

/* ── Riesgos propios de paralelizar ───────────────────────────────────────── */

const riesgo = (kind: ClaseDeRiesgo, severity: Severidad, because: string, steps?: readonly string[]): RiesgoEstructural =>
  (steps ? { kind, severity, because, steps } : { kind, severity, because });

/**
 * LO QUE PARALELIZAR AÑADE, y que en fila no existía.
 *
 * Ninguno es una probabilidad. `availableWorkers` es la única entrada externa y
 * llega como SEÑAL: A4 no consulta infraestructura, la recibe. Sin esa señal no
 * se afirma que haya presión — no saber no es lo mismo que estar bien.
 */
export const riesgosDeParalelizar = (
  steps: readonly PlanStep[],
  tandas: readonly (readonly string[])[],
  recursos: { availableWorkers?: number } = {},
): readonly RiesgoEstructural[] => {
  const salida: RiesgoEstructural[] = [];
  const ancho = tandas.length ? Math.max(...tandas.map((t) => t.length)) : 0;

  if (typeof recursos.availableWorkers === 'number' && ancho > recursos.availableWorkers) {
    salida.push(riesgo('concurrency_pressure', ancho >= recursos.availableWorkers * 2 ? 'alto' : 'medio',
      `se piden ${ancho} a la vez y hay ${recursos.availableWorkers} disponibles`));
  }
  for (const f of abanicoDeSalida(steps, 4)) {
    salida.push(riesgo('fan_out', f.count >= 8 ? 'alto' : 'medio',
      `de «${f.stepId}» salen ${f.count}: si falla, se pierde todo lo que arrancó con él`, [f.stepId]));
  }
  for (const j of abanicoDeEntrada(steps, 3)) {
    salida.push(riesgo('synchronization_bottleneck', j.count >= 5 ? 'alto' : 'medio',
      `«${j.stepId}» espera a ${j.count}: no se avanza hasta el más lento`, [j.stepId]));
  }
  if (ancho >= 3) {
    salida.push(riesgo('failure_amplification', ancho >= 6 ? 'alto' : 'medio',
      `con ${ancho} a la vez, basta que falle una para tirar la tanda`));
    salida.push(riesgo('recovery_complexity', 'bajo',
      'recuperarse de un fallo a medio paralelo cuesta más que en fila'));
  }
  /* Demasiado colgando del mismo sitio: no es lo mismo que abrir mucho. */
  const existe = new Set(steps.map((s) => s.id));
  const cuelgan = new Map<string, number>();
  for (const s of steps) for (const d of s.dependsOn ?? []) if (existe.has(d)) cuelgan.set(d, (cuelgan.get(d) ?? 0) + 1);
  const concentrado = [...cuelgan.entries()].filter(([, n]) => steps.length > 3 && n >= steps.length - 1);
  for (const [id, n] of concentrado.sort()) {
    salida.push(riesgo('dependency_concentration', 'alto', `${n} de ${steps.length} pasos cuelgan de «${id}»`, [id]));
  }
  return Object.freeze(salida);
};

/* ── Lo previsto frente a lo que pase ─────────────────────────────────────── */

/** Lo que A4 espera. Todo previsión: nada de esto se ha ejecutado. */
export interface AhorroEsperado {
  baselineDurationMs: number;
  parallelDurationMs: number;
  savingsMs: number;
  savingsRatio?: number;
  speedup?: number;
  confidence: number;
  provenance: SignalSource;
}

/** Lo que pasó de verdad. Lo rellenará quien ejecute; A4 nunca lo escribe. */
export interface AhorroObservado {
  parallelDurationMs: number;
  baselineDurationMs?: number;
}

/**
 * LO PREVISTO CONTRA LO OCURRIDO.
 *
 * Es lo único que permitirá saber, en A7, si A4 acierta. Y no se compara contra
 * lo que no se midió: sin baseline observado se usa el previsto y SE DICE, en
 * vez de fingir una comparación limpia.
 */
export const compararAhorro = (
  esperado: AhorroEsperado,
  observado: AhorroObservado,
): { savingsDeltaMs?: number; speedupDelta?: number; baselineAsumido: boolean } | undefined => {
  if (!esperado || !duracionValida(observado?.parallelDurationMs)) return undefined;
  const baselineAsumido = !duracionValida(observado.baselineDurationMs);
  const base = baselineAsumido ? esperado.baselineDurationMs : (observado.baselineDurationMs as number);
  const ahorroReal = ahorroDe(base, observado.parallelDurationMs);
  const aceleracionReal = aceleracionDe(base, observado.parallelDurationMs);
  return {
    ...(ahorroReal !== undefined ? { savingsDeltaMs: ahorroReal - esperado.savingsMs } : {}),
    ...(aceleracionReal !== undefined && esperado.speedup !== undefined
      ? { speedupDelta: aceleracionReal - esperado.speedup } : {}),
    baselineAsumido,
  };
};

/** El paralelismo que el grafo permite de verdad. Reutiliza los niveles de A0. */
export const anchoPosible = (steps: readonly PlanStep[]): number => {
  const { niveles } = nivelesDeDependencia(steps);
  return niveles.length ? Math.max(...niveles.map((n) => n.length)) : 0;
};
