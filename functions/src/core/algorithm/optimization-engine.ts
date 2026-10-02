/**
 * WEE ALGORITHM ENGINE — A5 · EL MOTOR DE OPTIMIZACIÓN.
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Dado un conjunto de candidatos y un objetivo, encuentra los cambios que
 * ofrecen una mejora JUSTIFICABLE dentro de las restricciones — y se calla
 * cuando no los hay, que es la mitad del trabajo.
 *
 * ── El orden, que no se negocia ─────────────────────────────────────────────
 *
 *   1. FACTIBILIDAD. Lo que se sale de una restricción dura queda fuera. No
 *      compite, no puntúa y no domina a nadie.
 *   2. FRENTE. Sobre lo factible, quién no está dominado por nadie.
 *   3. TRANSFORMACIÓN. Operadores declarados, aplicados solo donde son
 *      aplicables, y acotados por el presupuesto.
 *   4. ACEPTACIÓN. Una mejora que no se puede demostrar no se propone.
 *
 * ── Por qué los operadores son DATOS ────────────────────────────────────────
 *
 * Cada operador declara qué necesita y qué ejes espera mover. La aplicabilidad
 * se comprueba contra esos datos, nunca con `if (capability === …)`. Eso es lo
 * que permite que un operador nuevo entre sin tocar el bucle, y que el bucle
 * funcione sobre una capacidad que no existía cuando se escribió.
 *
 * ── Y lo que NO hace ────────────────────────────────────────────────────────
 *
 * No elige —eso es A1—, no ejecuta, no cobra, no llama a nadie y no conoce
 * ninguna capacidad, modelo ni proveedor. No inventa métricas: si el delta no
 * se puede medir, la propuesta no se acepta.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { AlgorithmBudgetLimits, AlgorithmDescriptor, referenciaDeAlgoritmo } from './types';
import { Contador, GASTO_CERO, crearContador, presupuestoEfectivo, problemasDelPresupuesto } from './budget';
import { AlgorithmConstraints, ObjectiveAxis, problemasDeLosLados } from './objective';
import {
  Confidence, Evidence, Signal, Uncertainty, confianzaDeEvidencia, incertidumbreDe, resolverSenales,
} from './signals';
import { Alternative, AxisValues, ejesDeEstrategia } from './scoring';
import { Strategy } from './strategy';
import { violacionesEn } from './authority';
import { violaRestricciones } from './strategy-engine';
import { recursosDeSenales } from './parallelization-engine';
import {
  CondicionDeParada, DeltaDeEje, Inviabilidad, MetricasDeOptimizacion, METRICAS_DE_OPTIMIZACION_CERO,
  OptimizationOutcome, OptimizationProblem, OptimizationProposal, Viabilidad,
  deltasDe, frenteFactible, gananciaDe, mereceLaPena,
} from './optimization';

export const OPTIMIZATION_ENGINE_ID = 'motor-de-optimizacion';
export const OPTIMIZATION_ENGINE_VERSION = 1;
export const OPTIMIZATION_ENGINE_REF = referenciaDeAlgoritmo(OPTIMIZATION_ENGINE_ID, OPTIMIZATION_ENGINE_VERSION);

export const DESCRIPTOR_DE_OPTIMIZACION: AlgorithmDescriptor = Object.freeze({
  id: OPTIMIZATION_ENGINE_ID,
  version: OPTIMIZATION_ENGINE_VERSION,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'optimization',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Encuentra mejoras justificables sobre un conjunto de candidatos, dentro de lo factible',
  budget: Object.freeze({ maxCandidates: 64, maxIterations: 6 }),
});

/* ── El contexto ──────────────────────────────────────────────────────────── */

/** Lo que un operador necesita saber. Metadata, nada de infraestructura. */
export interface ContextoDeOptimizacion {
  objective: OptimizationProblem['objective'];
  constraints?: AlgorithmConstraints;
  /** Ya resueltas por procedencia con las reglas de A0. */
  signals: readonly Signal[];
  /** Lo que los recursos declaran, leído de las señales. Nunca consultado. */
  resources: { availableWorkers?: number };
  topes: Required<AlgorithmBudgetLimits>;
}

/**
 * UN OPERADOR: un cambio posible, declarado como dato.
 *
 * `affects` es lo que el operador ESPERA mover, y es una declaración, no una
 * promesa: el delta real se mide después comparando con la referencia. Sirve
 * para no aplicar un operador que mueve ejes que al objetivo le dan igual.
 *
 * `requires` se comprueba contra nombres disponibles —igual que la
 * aplicabilidad de una estrategia en A4—, nunca contra una capacidad concreta.
 */
export interface OperadorDeOptimizacion<T = unknown> {
  id: string;
  label: string;
  affects: readonly ObjectiveAxis[];
  requires?: readonly string[];
  aplicable(c: Alternative<T>, ctx: ContextoDeOptimizacion): boolean;
  /**
   * Devuelve el candidato transformado, VARIOS, o `undefined` si no hay cambio.
   *
   * Varios porque una transformación como «esto se puede hacer en paralelo»
   * no tiene una respuesta: tiene una curva —de uno en uno, de dos en dos, de
   * tres— y quedarse con un punto de ella es decidir, que no es de esta capa.
   * A5 las evalúa TODAS y propone las que merecen la pena; A1 elige.
   */
  aplicar(c: Alternative<T>, ctx: ContextoDeOptimizacion): Alternative<T> | readonly Alternative<T>[] | undefined;
}

/* ── Viabilidad ───────────────────────────────────────────────────────────── */

/** Cómo se juzga si un candidato es viable. Un puerto: A5 no asume la forma. */
export type JuezDeViabilidad<T> = (
  c: Alternative<T>,
  ctx: ContextoDeOptimizacion,
) => Inviabilidad | undefined;

/**
 * EL JUEZ POR DEFECTO.
 *
 * La frontera de autoridad para cualquier candidato —nombrar una
 * implementación descalifica, sea lo que sea el candidato— y, cuando resulta
 * ser una estrategia, las restricciones duras con `violaRestricciones` de A3.
 * No se reescribe esa comprobación: tenerla dos veces es tenerla una y un
 * descuido.
 */
export const juezPorDefecto = <T>(c: Alternative<T>, ctx: ContextoDeOptimizacion): Inviabilidad | undefined => {
  if (!c || typeof c.id !== 'string') return { reason: 'malformed' };
  const violaciones = violacionesEn(c.value, `candidate:${c.id}`);
  if (violaciones.length) return { reason: 'authority', detail: violaciones[0].clave };

  const s = c.value as Partial<Strategy> | undefined;
  const esEstrategia = !!s && Array.isArray(s.steps) && typeof s.expected === 'object' && s.expected !== null;
  if (esEstrategia) {
    const fuera = violaRestricciones(s as Strategy, c.values ?? {}, ctx.constraints, ctx.topes);
    if (fuera) return { reason: 'constraint', detail: fuera };
  } else if (ctx.constraints) {
    /* Para un candidato cualquiera solo se puede comprobar lo que trae en los ejes. */
    const v = c.values ?? {};
    const tope = (campo: string, valor: number | undefined, max: number | undefined, cabe = true): Inviabilidad | undefined => {
      if (typeof max !== 'number') return undefined;
      if (typeof valor !== 'number') return { reason: 'unverifiable', detail: campo };
      return (cabe ? valor <= max : valor >= max) ? undefined : { reason: 'constraint', detail: campo };
    };
    const fallo = tope('budget.maxUsd', v.cost, ctx.constraints.budget?.maxUsd)
      ?? tope('maxLatencyMs', v.latency, ctx.constraints.maxLatencyMs)
      ?? tope('quality.minScore', v.quality, ctx.constraints.quality?.minScore, false);
    if (fallo) return fallo;
  }
  /* Los recursos: se comparan con lo DECLARADO. Sin declaración, no se afirma. */
  if (typeof ctx.resources.availableWorkers === 'number' && typeof c.values?.parallelism === 'number'
    && c.values.parallelism > ctx.resources.availableWorkers) {
    return { reason: 'resource', detail: `pide ${c.values.parallelism} y hay ${ctx.resources.availableWorkers}` };
  }
  return undefined;
};

/* ── Operadores genéricos sobre estrategias ───────────────────────────────── */

const esEstrategia = (v: unknown): v is Strategy => {
  const s = v as Partial<Strategy> | null;
  return !!s && typeof s === 'object' && Array.isArray(s.steps) && typeof s.expected === 'object' && s.expected !== null;
};

/** Reconstruye la alternativa después de tocar la estrategia, con sus ejes al día. */
const rehacer = (id: string, s: Strategy, valuesBase: AxisValues): Alternative<Strategy> => ({
  id, value: s, values: { ...valuesBase, ...ejesDeEstrategia(s) },
});

/**
 * EL PUERTO DE LAS FORMAS ALTERNATIVAS.
 *
 * Hay transformaciones que A5 NO PUEDE HACER SOLO, y la de secuencial a
 * paralelo es la primera: saber qué pasos pueden ir juntos exige el grafo de
 * dependencias (A2), y saber cuánto cuesta cada forma exige recalcular la
 * previsión entera —camino crítico, coste, calidad, riesgo— (A3). Reimplementar
 * cualquiera de las dos aquí daría un segundo cálculo que discreparía del
 * primero el día que uno de los dos cambie.
 *
 * Así que no se reimplementa: entra como PUERTO. Quien tenga A2, A4 y A3 los
 * enchufa; A5 solo sabe que algo le devuelve otras formas del mismo candidato,
 * y las trata como trata cualquier otra transformación —factibilidad, frente,
 * aceptación—. Sin puerto, el operador sencillamente no es aplicable, que es
 * la respuesta honesta y no un cero.
 */
export type FuenteDeAlternativas<T> = (
  c: Alternative<T>,
  ctx: ContextoDeOptimizacion,
) => readonly Alternative<T>[];

/**
 * Construye el operador que explora las formas que da el puerto.
 *
 * Nada aquí nombra paralelismo: el puerto decide QUÉ formas hay. Si un día
 * alguien enchufa uno que devuelve variantes de otra cosa, el operador vale
 * igual — por eso `affects` es un parámetro y no una constante.
 */
export const operadorDeFormas = <T>(
  fuente: FuenteDeAlternativas<T>,
  opciones: { id?: string; label?: string; affects?: readonly ObjectiveAxis[]; requires?: readonly string[] } = {},
): OperadorDeOptimizacion<T> => {
  const affects = Object.freeze(opciones.affects ?? (['latency', 'cost', 'parallelism'] as const));
  const op: OperadorDeOptimizacion<T> = {
    id: opciones.id ?? 'explorar-formas',
    label: opciones.label ?? 'explorar las otras formas del mismo trabajo',
    affects,
    ...(opciones.requires ? { requires: Object.freeze([...opciones.requires]) } : {}),
    aplicable: (c: Alternative<T>, ctx: ContextoDeOptimizacion) => {
      if (!c || typeof c.id !== 'string') return false;
      try { return fuente(c, ctx).length > 0; } catch { return false; }
    },
    aplicar: (c: Alternative<T>, ctx: ContextoDeOptimizacion) => {
      let formas: readonly Alternative<T>[];
      try { formas = fuente(c, ctx); } catch { return undefined; }
      /* Orden canónico y sin la de partida: devolver el mismo candidato sería un bucle. */
      const otras = formas
        .filter((f) => !!f && typeof f.id === 'string' && f.id !== c.id)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return otras.length ? Object.freeze(otras) : undefined;
    },
  };
  return Object.freeze(op);
};

/**
 * LOS OPERADORES QUE HOY SABEN APLICARSE A UNA ESTRATEGIA.
 *
 * Ninguno conoce una capacidad: miran la FORMA —tandas, grupos, puntos de
 * comprobación, respaldo— y las señales de recursos. Una estrategia de una
 * capacidad que no existe se transforma exactamente igual.
 *
 * Los que NO están, y por qué: «fundir pasos» y «quitar trabajo innecesario»
 * cambiarían QUÉ se ejecuta, y decidir eso es del Planner. Un operador que
 * junta pasos estaría planificando con otro nombre.
 */
export const OPERADORES_DE_ESTRATEGIA: readonly OperadorDeOptimizacion<Strategy>[] = Object.freeze([
  {
    id: 'acotar-paralelismo',
    label: 'ajustar la simultaneidad a los recursos declarados',
    affects: ['parallelism', 'reliability'],
    aplicable: (c, ctx) => esEstrategia(c.value)
      && typeof ctx.resources.availableWorkers === 'number'
      && (c.value.parallelGroups ?? []).some((g) => g.steps.length > (ctx.resources.availableWorkers as number)),
    aplicar: (c, ctx) => {
      if (!esEstrategia(c.value)) return undefined;
      const tope = ctx.resources.availableWorkers as number;
      const grupos = (c.value.parallelGroups ?? []).map((g) =>
        (g.steps.length > tope ? { ...g, steps: [...g.steps].sort().slice(0, tope), maxConcurrency: tope } : g));
      const s: Strategy = { ...c.value, id: `${c.value.id}+acotada`, parallelGroups: grupos };
      return rehacer(`${c.id}+acotar-paralelismo`, s, c.values ?? {});
    },
  },
  {
    id: 'quitar-comprobaciones',
    label: 'retirar puntos de comprobación por encima del tope',
    affects: ['latency', 'cost'],
    aplicable: (c, ctx) => esEstrategia(c.value)
      && (c.value.checkpoints ?? []).length > 1
      && typeof ctx.constraints?.maxLatencyMs === 'number',
    aplicar: (c) => {
      if (!esEstrategia(c.value) || !(c.value.checkpoints ?? []).length) return undefined;
      /* Se conserva el primero: comprobar en el punto donde más cuelga sigue siendo lo que más protege. */
      const s: Strategy = { ...c.value, id: `${c.value.id}+sinExtras`, checkpoints: (c.value.checkpoints ?? []).slice(0, 1) };
      return rehacer(`${c.id}+quitar-comprobaciones`, s, c.values ?? {});
    },
  },
  {
    id: 'preferir-respaldo',
    label: 'cambiar a la forma más simple cuando el riesgo pesa',
    affects: ['reliability'],
    requires: ['fallback'],
    aplicable: (c) => esEstrategia(c.value) && !c.value.isFallback && (c.value.expected.risks ?? []).length >= 3,
    aplicar: (c) => {
      if (!esEstrategia(c.value)) return undefined;
      /* La forma más simple: sin paralelismo. Se marca como respaldo, nunca como la mejor. */
      const s: Strategy = {
        ...c.value, id: `${c.value.id}+simple`, parallelGroups: [],
        isFallback: true, fallbackFrom: c.value.id,
      };
      return rehacer(`${c.id}+preferir-respaldo`, s, { ...(c.values ?? {}), parallelism: 1 });
    },
  },
]);

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelOptimizador<T> {
  operadores?: readonly OperadorDeOptimizacion<T>[];
  juez?: JuezDeViabilidad<T>;
  /** El reloj, por puerto. Solo para contar cuánto se tardó en pensar. */
  ahora?: () => number;
}

export const crearMotorDeOptimizacion = <T = Strategy>(opciones: OpcionesDelOptimizador<T> = {}) => {
  const operadores = opciones.operadores
    ?? (OPERADORES_DE_ESTRATEGIA as unknown as readonly OperadorDeOptimizacion<T>[]);
  const juez = opciones.juez ?? (juezPorDefecto as JuezDeViabilidad<T>);

  const optimizar = (problema: OptimizationProblem<T>): OptimizationOutcome<T> => {
    const topes = presupuestoEfectivo(problema?.budget, DESCRIPTOR_DE_OPTIMIZACION.budget);
    const contador: Contador = crearContador(topes, opciones.ahora);
    contador.gastar('algorithmCalls');
    const m: MetricasDeOptimizacion = { ...METRICAS_DE_OPTIMIZACION_CERO, attempts: 1 };
    const vacio = (por: CondicionDeParada): OptimizationOutcome<T> => ({
      feasible: [], rejected: [], pareto: [], proposals: [], discarded: [],
      stoppedBecause: por, spend: contador.gasto(), metricas: m,
    });

    const entrada = Array.isArray(problema?.candidates) ? problema.candidates : [];
    if (!entrada.length) return vacio('no_candidates');

    const { resueltas } = resolverSenales(problema.evidence
      ? problema.evidence.map((e) => e.signal).concat(problema.candidates ? [] : [])
      : []);
    const ctx: ContextoDeOptimizacion = {
      objective: problema.objective,
      constraints: problema.constraints,
      signals: resueltas,
      resources: recursosDeSenales(resueltas),
      topes,
    };

    /*
     * (S2-B · B.1) Unas restricciones mal formadas, con la regla de A1. Antes
     * cada camino las leía a su manera: una estrategia pasaba por
     * `violaRestricciones` (`riesgo > NaN` es falso: pasa) y cualquier otra cosa
     * por su tope (`coste <= NaN` es falso: fuera). Ahora nada es factible sobre
     * ellas y cada candidato dice cuál está mal; lo demás del juez —la frontera,
     * la forma, los recursos— va antes, como siempre. En el ciclo no llegan: A9
     * se para antes.
     *
     * (S2-C) Y los topes de pensar, con la misma regla y el mismo veredicto que
     * A1 y A9 desde S2-B.4/B.5. Van detrás de las restricciones.
     */
    const malFormadas = [...problemasDeLosLados(undefined, problema.constraints), ...problemasDelPresupuesto(problema.budget)];

    /* 1 · FACTIBILIDAD. Antes de puntuar, comparar o transformar nada. */
    const factibles: (Alternative<T> & { feasible: boolean })[] = [];
    const rechazados: Viabilidad[] = [];
    for (const c of entrada) {
      if (!contador.cabe('candidates')) { m.budgetExhausted = true; break; }
      contador.gastar('candidates');
      m.candidatesEvaluated++;
      const why = malFormadas.length
        ? (juez(c, { ...ctx, constraints: undefined })
          ?? { reason: 'constraint' as const, detail: `constraint_conflict · ${malFormadas.join('; ')}` })
        : juez(c, ctx);
      if (why) { rechazados.push({ id: c?.id ?? '?', feasible: false, why }); m.constraintsRejected++; continue; }
      factibles.push({ ...c, feasible: true });
    }
    if (!factibles.length) {
      return { ...vacio('infeasible'), rejected: Object.freeze(rechazados), metricas: { ...m } };
    }

    /* Orden canónico: sin él, dos ejecuciones con la misma entrada barajada difieren. */
    factibles.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    /* 2 · La referencia. Declarada, o la primera factible en orden. Nunca «la peor». */
    const baseline = factibles.find((c) => c.id === problema.baselineId) ?? factibles[0];

    /* 3 · El frente, SOBRE LO FACTIBLE. */
    const frente = frenteFactible(factibles, problema.objective);
    m.paretoSize = frente.length;

    /* 4 · El bucle. Acotado por vueltas, candidatos y reloj, y con detección de bucles. */
    const propuestas: OptimizationProposal<T>[] = [];
    const descartadas: { id: string; transformation: string; because: string }[] = [];
    const huellas = new Set<string>(factibles.map((c) => huellaDeCandidato(c)));
    const memo = new Map<string, Alternative<T> | readonly Alternative<T>[] | undefined>();
    let parada: CondicionDeParada = 'no_improvement';
    let trabajando: readonly (Alternative<T> & { feasible: boolean })[] = frente.map((c) => ({ ...c, feasible: true }));

    for (let vuelta = 0; vuelta < topes.maxIterations; vuelta++) {
      if (!contador.gastar('iterations')) { parada = 'budget_exhausted'; m.budgetExhausted = true; break; }
      m.iterations++;
      const nuevas: (Alternative<T> & { feasible: boolean })[] = [];

      for (const c of trabajando) {
        for (const op of operadores) {
          if (!contador.cabe('candidates')) { m.budgetExhausted = true; parada = 'budget_exhausted'; break; }
          /* Un operador que mueve ejes que el objetivo no pondera no se aplica: sería trabajo perdido. */
          if (!mueveAlgoQueImporta(op, problema)) continue;
          if (!op.aplicable(c, ctx)) continue;

          const clave = `${c.id}\0${op.id}`;
          let salida: Alternative<T> | readonly Alternative<T>[] | undefined;
          if (memo.has(clave)) { salida = memo.get(clave); m.memoHits++; }
          else {
            contador.gastar('candidates');
            salida = op.aplicar(c, ctx);
            memo.set(clave, salida);
          }
          if (!salida) continue;
          /* Una o varias: el bucle trata igual las dos, y cada forma cuesta presupuesto. */
          for (const resultado of (Array.isArray(salida) ? salida : [salida]) as readonly Alternative<T>[]) {
            if (!resultado) continue;
            if (!contador.cabe('candidates')) { m.budgetExhausted = true; parada = 'budget_exhausted'; break; }
            contador.gastar('candidates');
            m.candidatesEvaluated++;

            /* Un resultado que ya se ha visto es un bucle: A → B → A. */
            const huella = huellaDeCandidato(resultado);
            if (huellas.has(huella)) {
              m.loopsDetected++;
              descartadas.push({ id: resultado.id, transformation: op.id, because: 'vuelve a una forma ya evaluada' });
              continue;
            }
            huellas.add(huella);

            const why = juez(resultado, ctx);
            if (why) {
              m.constraintsRejected++;
              descartadas.push({ id: resultado.id, transformation: op.id, because: `${why.reason}${why.detail ? ':' + why.detail : ''}` });
              continue;
            }

            const propuesta = evaluarPropuesta(baseline, resultado, op, problema, ctx);
            if ('rechazada' in propuesta) {
              m.proposalsRejected++;
              descartadas.push({ id: resultado.id, transformation: op.id, because: propuesta.because });
              continue;
            }
            propuestas.push(propuesta);
            m.proposalsGenerated++;
            nuevas.push({ ...resultado, feasible: true });
          }
          if (parada === 'budget_exhausted') break;
        }
        if (parada === 'budget_exhausted') break;
      }
      if (parada === 'budget_exhausted') break;
      if (!nuevas.length) { parada = vuelta === 0 ? 'no_improvement' : 'converged'; break; }
      /* Todos los de aquí pasaron el juez, así que `feasible` es cierto por construcción. */
      trabajando = frenteFactible([...trabajando, ...nuevas], problema.objective)
        .map((c) => ({ ...c, feasible: true }));
      if (vuelta === topes.maxIterations - 1) parada = 'iteration_limit';
    }

    /* Mejor ganancia primero; a igualdad, el id — para que el orden sea reproducible. */
    propuestas.sort((a, b) => (b.expectedGain ?? 0) - (a.expectedGain ?? 0) || (a.id < b.id ? -1 : 1));
    m.bestGain = propuestas.length ? propuestas[0].expectedGain : undefined;
    m.confidence = propuestas.length ? propuestas[0].confidence.value : 0;

    return {
      feasible: Object.freeze(factibles),
      rejected: Object.freeze(rechazados),
      pareto: Object.freeze(frente.map((c) => c.id)),
      proposals: Object.freeze(propuestas),
      discarded: Object.freeze(descartadas),
      baselineId: baseline.id,
      stoppedBecause: parada,
      spend: contador.gasto(),
      metricas: m,
    };
  };

  return { descriptor: DESCRIPTOR_DE_OPTIMIZACION, optimizar };
};

/* ── Piezas sueltas, exportadas para poder probarlas ──────────────────────── */

/**
 * LA HUELLA DE UN CANDIDATO: qué lo hace el mismo que otro.
 *
 * Los ejes y la forma, nunca el id. Sin esto, un operador que devuelve algo
 * equivalente con otro nombre parecería una mejora nueva cada vuelta — que es
 * exactamente cómo se construye un bucle de optimización.
 */
export const huellaDeCandidato = <T>(c: Alternative<T>): string => {
  const v = c?.values ?? {};
  const s = c?.value as Partial<Strategy> | undefined;
  return JSON.stringify([
    (s?.steps ?? []).map((p) => p.id),
    (s?.parallelGroups ?? []).map((g) => [...g.steps].sort()),
    (s?.checkpoints ?? []).map((x) => String(x.afterStepId)).sort(),
    s?.isFallback ?? false,
    v.cost ?? null, v.latency ?? null, v.quality ?? null, v.reliability ?? null,
    v.steps ?? null, v.depth ?? null, v.parallelism ?? null,
  ]);
};

/** ¿El objetivo pondera algún eje que este operador dice mover? */
export const mueveAlgoQueImporta = <T>(op: OperadorDeOptimizacion<T>, p: OptimizationProblem<T>): boolean => {
  const pesos = (p?.objective?.weights ?? {}) as Partial<Record<ObjectiveAxis, number>>;
  if (!op.affects?.length) return true;
  return op.affects.some((e) => (pesos[e] ?? 0) > 0);
};

/**
 * ¿ESTA TRANSFORMACIÓN MERECE UNA PROPUESTA?
 *
 * Mide contra la REFERENCIA, no contra el candidato del que salió: lo que
 * importa es si el conjunto mejora, no si un paso intermedio mejoró otro.
 *
 * La confianza sale de la evidencia que respalda los ejes que cambiaron, y de
 * ninguna otra parte. Sin evidencia, la propuesta se descarta con su motivo —
 * no se propone con confianza cero, que sería proponer una esperanza.
 */
export const evaluarPropuesta = <T>(
  baseline: Alternative<T>,
  resultado: Alternative<T>,
  op: OperadorDeOptimizacion<T>,
  problema: OptimizationProblem<T>,
  ctx: ContextoDeOptimizacion,
): OptimizationProposal<T> | { rechazada: true; because: string } => {
  const s = resultado.value as Partial<Strategy> | undefined;
  const procedencia: Partial<Record<ObjectiveAxis, import('./signals').SignalSource>> = {};
  for (const [eje, p] of Object.entries(s?.expected?.porEje ?? {})) {
    if (p?.source) procedencia[eje as ObjectiveAxis] = p.source;
  }
  const expectedDelta: readonly DeltaDeEje[] = deltasDe(baseline.values, resultado.values, procedencia);
  const expectedGain = gananciaDe(expectedDelta, problema.objective);

  /* La evidencia del resultado, tal cual viene: no se fabrica ni se hereda. */
  const evidencia: readonly Evidence[] = (s?.evidence ?? []) as readonly Evidence[];
  const confidence: Confidence = evidencia.length
    ? confianzaDeEvidencia(evidencia)
    : { kind: 'algorithm', value: 0, basis: [], because: 'la transformación no aporta evidencia nueva' };
  const uncertainty: Uncertainty = incertidumbreDe(confidence);

  const veredicto = mereceLaPena(expectedDelta, expectedGain, confidence, problema.acceptance, problema.objective);
  if (!veredicto.ok) return { rechazada: true, because: veredicto.because };

  const tradeoffs = expectedDelta.filter((d) => d.absolute < 0).map((d) => d.axis);
  const because: string[] = [
    `${op.label}: ${expectedDelta.filter((d) => d.absolute > 0).map((d) => d.axis).join(', ') || 'sin eje al alza'} mejora frente a «${baseline.id}».`,
    `Ganancia ponderada ${(((expectedGain as number)) * 100).toFixed(1)} % sobre los ejes que el objetivo pondera.`,
  ];
  if (tradeoffs.length) because.push(`A cambio empeora: ${tradeoffs.join(', ')}.`);
  because.push(confidence.value > 0
    ? `Confianza ${confidence.value.toFixed(2)} — ${confidence.because}.`
    : 'Sin evidencia nueva: el delta sale de lo que los candidatos declaran, no de una medición de esta transformación.');
  if (typeof ctx.resources.availableWorkers === 'number') {
    because.push(`Recursos declarados: ${ctx.resources.availableWorkers} simultáneos.`);
  }

  return {
    id: resultado.id,
    baseId: baseline.id,
    transformation: op.id,
    result: resultado,
    expectedDelta,
    ...(expectedGain !== undefined ? { expectedGain } : {}),
    confidence,
    uncertainty,
    evidence: evidencia,
    tradeoffs: Object.freeze(tradeoffs),
    because: Object.freeze(because),
  };
};

/** Un gasto vacío, para quien construya un resultado sin haber optimizado. */
export const SIN_OPTIMIZAR = GASTO_CERO;
