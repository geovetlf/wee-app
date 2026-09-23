/**
 * WEE ALGORITHM ENGINE — A2 · EL MOTOR DE DESCOMPOSICIÓN.
 *
 * ── La única cosa que hace ──────────────────────────────────────────────────
 *
 * Coge un trabajo cuyas subtareas ya se conocen y propone VARIAS FORMAS de
 * organizarlo: en fila, con todo lo que las dependencias permitan a la vez, o
 * acotado a cuántas cosas se admitan simultáneamente. Nada más.
 *
 *     A2 genera opciones. A1 decide.
 *
 * Y esa relación no se invierte: aquí no hay `elegirLaMejor()`, no hay
 * puntuación, no hay pesos y no hay preferencia. Si un día apareciera una
 * función que devuelve UNA descomposición, A2 se habría convertido en un
 * segundo motor de decisión.
 *
 * ── Lo que NO inventa ───────────────────────────────────────────────────────
 *
 * Ni subtareas ni capacidades: qué hace falta hacer lo decide el Planner, y
 * añadir o fundir pasos aquí sería planificar. Por eso todas las opciones
 * llevan EXACTAMENTE los mismos pasos y lo único que cambia es su disposición.
 *
 * Ni coste, ni latencia, ni calidad. A2 mide lo que se puede contar sobre el
 * grafo —pasos, niveles, paralelismo, dependencias— y lo que no sabe se queda
 * sin decir. Un `latency: 100` puesto «para completar el objeto» es un dato
 * inventado que después decide.
 *
 * ── Por qué `maxCandidates` y no un `maxOptions` nuevo ──────────────────────
 *
 * Porque es el mismo eje con otro nombre: `AlgorithmBudgetLimits.maxCandidates`
 * ya significa «cuántas alternativas como mucho», con su valor por defecto, su
 * techo absoluto y su contador. Añadir `maxOptions` sería un segundo sistema de
 * configuración para la misma pregunta, y entonces habría dos topes que pueden
 * discrepar.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { CAPABILITY_CATALOG } from '../registry/capabilities';
import { PlanStep } from '../planner';
import { AlgorithmBudgetLimits, AlgorithmDescriptor, referenciaDeAlgoritmo } from './types';
import { Contador, crearContador, presupuestoEfectivo } from './budget';
import { AlgorithmConstraints } from './objective';
import { Signal } from './signals';
import { Alternative, AxisValues } from './scoring';
import { ParallelGroup, nivelesDeDependencia } from './strategy';
import {
  MedidasDeDescomposicion,
  MotivoDeDescomposicionInvalida,
  ProblemaDeDescomposicion,
  PuertosDeCapacidad,
  TareaADescomponer,
  medidasDe,
  paralelismoPosible,
  validarDAG,
} from './decomposition';

export const DECOMPOSITION_ENGINE_ID = 'motor-de-descomposicion';
export const DECOMPOSITION_ENGINE_VERSION = 1;
export const DECOMPOSITION_ENGINE_REF = referenciaDeAlgoritmo(DECOMPOSITION_ENGINE_ID, DECOMPOSITION_ENGINE_VERSION);

/**
 * Su ficha. `experimental`, igual que el motor de decisión: corre, se mide, y
 * el registro no deja que nadie lo elija solo.
 *
 * Declara `maxCandidates: 8` porque no necesita más: hoy genera tres
 * disposiciones y el día que tenga más heurísticas seguirán siendo un puñado.
 * Un tope estrecho declarado por quien conoce el algoritmo es mejor que uno
 * generoso heredado.
 */
export const DESCRIPTOR_DE_DESCOMPOSICION: AlgorithmDescriptor = Object.freeze({
  id: DECOMPOSITION_ENGINE_ID,
  version: DECOMPOSITION_ENGINE_VERSION,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'decomposition',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Propone formas de organizar un trabajo ya definido, para que el motor de decisión elija entre ellas',
  budget: Object.freeze({ maxCandidates: 8 }),
});

/* ── Las heurísticas ──────────────────────────────────────────────────────── */

/**
 * CÓMO SE ORGANIZA UN TRABAJO. Tres formas, deterministas y acotadas.
 *
 *   secuencial   una cosa detrás de otra. Siempre válida si el grafo lo es, y
 *                la más profunda de todas.
 *   por-niveles  todo lo que las dependencias permitan a la vez. La más plana
 *                posible: si esta no cabe en `maxDepth`, ninguna cabe.
 *   acotada      los niveles partidos en tandas de `maxParallel`. Solo aparece
 *                cuando de verdad cambia algo respecto a `por-niveles`.
 *
 * Y no hay una cuarta. «Reducir la profundidad» o «agrupar tareas» exigiría
 * FUNDIR pasos, y decidir qué pasos hacen falta es del Planner: una heurística
 * que los junta estaría planificando con otro nombre. Se dice aquí en voz alta
 * porque la tentación de añadirla es real.
 */
export type Heuristica = 'secuencial' | 'por-niveles' | 'acotada' | (string & {});

export const HEURISTICAS: readonly Heuristica[] = Object.freeze(['secuencial', 'por-niveles', 'acotada']);

/* ── Lo que produce ──────────────────────────────────────────────────────── */

/** Una forma concreta de organizar el trabajo. */
export interface Descomposicion {
  /** Único dentro del resultado. Deriva de la heurística: determinista. */
  id: string;
  /** Qué la distingue, en una frase. */
  label: string;
  heuristica: Heuristica;
  /** Quién la propuso. `id@version`. */
  proposedBy: string;
  /** Los MISMOS pasos siempre; lo que cambia es cómo se disponen. */
  steps: readonly PlanStep[];
  /** Las tandas, en orden de ejecución. Cada una es un grupo de cosas simultáneas. */
  tandas: readonly (readonly string[])[];
  /** Solo las tandas con más de uno: lo que de verdad va en paralelo. */
  parallelGroups: readonly ParallelGroup[];
  medidas: MedidasDeDescomposicion;
  /**
   * Es el respaldo, no una propuesta en igualdad de condiciones.
   *
   * Existe para que nadie pueda presentar un fallback como la mejor
   * descomposición: va marcado, y quien lo reciba puede tratarlo distinto.
   */
  esFallback?: boolean;
  /** Qué heurística no se pudo aplicar, cuando esto es un respaldo. */
  fallbackFrom?: Heuristica;
}

/** Una opción descartada, con su motivo. Nada se cae en silencio. */
export interface DescomposicionRechazada {
  id: string;
  heuristica: Heuristica;
  reason: MotivoDeDescomposicionInvalida;
  detail?: string;
}

/**
 * LO QUE A2 DEVUELVE.
 *
 * `opciones` son `Alternative<Descomposicion>`, la misma forma que consume A1
 * sin traducir nada. `values` lleva SOLO los tres ejes estructurales; el resto
 * se queda sin decir, que es lo honesto.
 */
export interface ResultadoDeDescomposicion {
  opciones: readonly Alternative<Descomposicion>[];
  rechazadas: readonly DescomposicionRechazada[];
  /** Lo que estaba mal en la tarea misma. Si hay algo aquí, no hay opciones. */
  problemas: readonly ProblemaDeDescomposicion[];
  /** Las señales medidas de cada opción, listas para el contexto de A1. */
  signals: readonly Signal[];
  metricas: MetricasDeDescomposicion;
}

/**
 * LAS MÉTRICAS DE LA CORRIDA. Contadores, ni un dato de nadie.
 *
 * Sirven para responder «¿está esta capa haciendo algo útil?» sin guardar lo
 * que la persona escribió: son números sobre la estructura, no sobre contenido.
 */
export interface MetricasDeDescomposicion {
  attempts: number;
  success: number;
  failures: number;
  optionsGenerated: number;
  optionsRejected: number;
  cyclesDetected: number;
  maxDepthRejections: number;
  maxStepsRejections: number;
  maxParallelRejections: number;
  capabilityRejections: number;
  optionLimitReached: boolean;
  /** Cuántas salieron idénticas a otra y no se duplicaron. */
  duplicatesCollapsed: number;
}

const METRICAS_CERO: MetricasDeDescomposicion = Object.freeze({
  attempts: 0, success: 0, failures: 0, optionsGenerated: 0, optionsRejected: 0,
  cyclesDetected: 0, maxDepthRejections: 0, maxStepsRejections: 0,
  maxParallelRejections: 0, capabilityRejections: 0, optionLimitReached: false,
  duplicatesCollapsed: 0,
});

/* ── Disponer ─────────────────────────────────────────────────────────────── */

/**
 * LOS NIVELES, PARTIDOS EN TANDAS DE COMO MUCHO `tope`.
 *
 * Determinista: dentro de cada nivel los ids se ordenan y se reparten en el
 * orden resultante. Sin ese `sort`, dos ejecuciones del mismo grafo repartirían
 * distinto según cómo llegara el array.
 *
 * Partir un nivel AÑADE profundidad, y eso es correcto y hay que verlo: cuatro
 * cosas a la vez en un nivel se convierten en dos niveles de dos, así que un
 * `maxParallel` estrecho puede hacer que la descomposición ya no quepa en
 * `maxDepth`. Es una consecuencia real, no un efecto secundario que tapar.
 */
export const tandasAcotadas = (
  niveles: readonly (readonly string[])[],
  tope: number,
): readonly (readonly string[])[] => {
  if (!Number.isFinite(tope) || tope < 1) return niveles.map((n) => [...n].sort());
  const salida: string[][] = [];
  for (const nivel of niveles) {
    const ordenado = [...nivel].sort();
    for (let i = 0; i < ordenado.length; i += tope) salida.push(ordenado.slice(i, i + tope));
  }
  return salida;
};

/** Todo en fila, respetando dependencias y desempatando por id. La más profunda. */
export const tandasSecuenciales = (niveles: readonly (readonly string[])[]): readonly (readonly string[])[] =>
  niveles.flatMap((n) => [...n].sort().map((id) => [id]));

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelDescompositor {
  /** Cómo saber qué capacidades existen y quién las sirve. */
  capacidades?: PuertosDeCapacidad;
  /** El reloj, por puerto. Solo para contar la latencia de pensar. */
  ahora?: () => number;
}

/**
 * LOS PUERTOS DE WEË, QUE SON OPCIONALES Y NO EL COMPORTAMIENTO POR DEFECTO.
 *
 * Preguntan al catálogo del Core —no lo copian—, y existen para que quien SÍ
 * quiera exigir el catálogo de hoy pueda hacerlo en una línea.
 *
 * Lo que NO hacen es venir puestos. Atarlos por defecto significaba que el
 * motor rechazaba cualquier capacidad que no estuviera ya en la lista de 38, y
 * entonces razonar sobre una capacidad futura era imposible sin tocar esta
 * capa — exactamente lo que esta capa no puede exigir.
 *
 * Toman `string`: una capacidad futura no tiene por qué caber en la unión
 * cerrada de hoy para poder preguntarse por ella.
 */
export const capacidadDelCatalogo = (c: string): boolean =>
  CAPABILITY_CATALOG.some((e) => String(e.id) === c);

/** Y las que hoy puede servir alguien: `ROUTABLE`, según el mismo catálogo. */
export const capacidadEnrutable = (c: string): boolean =>
  CAPABILITY_CATALOG.some((e) => String(e.id) === c && e.status === 'ROUTABLE');

/**
 * EL ORDEN CANÓNICO.
 *
 * `complejidad → profundidad → pasos → paralelismo → id`, como pide el brief.
 * NO es una preferencia y no decide nada: es que el mismo trabajo tiene que
 * devolver la misma lista en el mismo orden, siempre. Elegir es de A1, y por
 * eso el orden acaba en el `id`, que nunca empata.
 */
export const ordenCanonico = (a: Alternative<Descomposicion>, b: Alternative<Descomposicion>): number => {
  const ma = a.value.medidas; const mb = b.value.medidas;
  return (ma.complexity - mb.complexity)
    || (ma.depth - mb.depth)
    || (ma.steps - mb.steps)
    || (mb.parallelism - ma.parallelism)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};

const senal = (key: string, subject: string, value: number): Signal =>
  ({ key, subject, value, source: 'measured' });

export const crearMotorDeDescomposicion = (opciones: OpcionesDelDescompositor = {}) => {
  const puertos: PuertosDeCapacidad = {
    /*
     * Sin puerto NO se afirma que una capacidad no exista. Antes el defecto era
     * el catálogo de Weë, así que `future.unknown.capability.v42` se rechazaba
     * de entrada y el motor no podía razonar sobre nada que no conociera ya.
     * Quien quiera exigir el catálogo pasa `capacidadDelCatalogo`.
     */
    conocida: opciones.capacidades?.conocida,
    /*
     * Sin puerto de disponibilidad NO se afirma que falte: «no lo sé» y «no
     * está» son cosas distintas, y tratar la primera como la segunda descarta
     * trabajo perfectamente válido. Quien sepa, lo pasa.
     */
    disponible: opciones.capacidades?.disponible,
  };

  const descomponer = (
    tarea: TareaADescomponer,
    constraints?: AlgorithmConstraints,
    limites?: AlgorithmBudgetLimits,
  ): ResultadoDeDescomposicion => {
    const topes = presupuestoEfectivo(limites, DESCRIPTOR_DE_DESCOMPOSICION.budget);
    const contador: Contador = crearContador(topes, opciones.ahora);
    contador.gastar('algorithmCalls');
    const m = { ...METRICAS_CERO, attempts: 1 };

    /* 1 · La tarea entera, antes de proponer nada. */
    const problemas = validarDAG(tarea, puertos);
    if (problemas.length) {
      return {
        opciones: [], rechazadas: [], problemas, signals: [],
        metricas: {
          ...m, failures: 1,
          cyclesDetected: problemas.filter((p) => p.reason === 'decomposition_cycle').length,
          capabilityRejections: problemas.filter((p) => p.reason === 'unknown_capability' || p.reason === 'missing_capability').length,
        },
      };
    }

    const steps = tarea.steps;
    const { niveles, sinResolver } = nivelesDeDependencia(steps);
    const posible = paralelismoPosible(steps);
    const topeParalelo = typeof constraints?.maxParallel === 'number' ? constraints.maxParallel : undefined;

    /*
     * `sinResolver` no debería tener nada: `validarDAG` ya rechaza ciclos y
     * dependencias inventadas. Si aun así lo tiene, es un estado que no se
     * entiende, y entonces lo correcto NO es seguir como si nada: se devuelve
     * la disposición más simple que existe, MARCADA COMO RESPALDO.
     */
    const dudoso = sinResolver.length > 0;

    /* 2 · Las disposiciones candidatas, en orden fijo. */
    const candidatas: { heuristica: Heuristica; tandas: readonly (readonly string[])[] }[] = [];
    const meter = (heuristica: Heuristica, tandas: readonly (readonly string[])[]): void => {
      if (!contador.cabe('candidates')) { m.optionLimitReached = true; return; }
      contador.gastar('candidates');
      candidatas.push({ heuristica, tandas });
    };
    meter('secuencial', tandasSecuenciales(niveles));
    if (!dudoso) {
      meter('por-niveles', niveles.map((n) => [...n].sort()));
      if (typeof topeParalelo === 'number' && topeParalelo >= 1 && topeParalelo < posible) {
        meter('acotada', tandasAcotadas(niveles, topeParalelo));
      }
    }
    contador.gastar('iterations');

    /* 3 · Cada una contra los límites. Nada se cae en silencio. */
    const aceptadas: Alternative<Descomposicion>[] = [];
    const rechazadas: DescomposicionRechazada[] = [];
    const vistas = new Map<string, string>();
    const signals: Signal[] = [];

    for (const c of candidatas) {
      const grupos = c.tandas.filter((t) => t.length > 1);
      const medidas = medidasDe(steps, c.tandas);
      const id = `${tarea.id}:${c.heuristica}`;
      const fuera = (reason: MotivoDeDescomposicionInvalida, detail?: string): void => {
        rechazadas.push(detail === undefined ? { id, heuristica: c.heuristica, reason } : { id, heuristica: c.heuristica, reason, detail });
        m.optionsRejected++;
        if (reason === 'max_depth_exceeded') m.maxDepthRejections++;
        if (reason === 'max_steps_exceeded') m.maxStepsRejections++;
        if (reason === 'max_parallel_exceeded') m.maxParallelRejections++;
      };

      /* `maxDepth` vive en el presupuesto porque es donde A0 lo declaró, con ese mismo sentido. */
      if (medidas.depth > topes.maxDepth) { fuera('max_depth_exceeded', `${medidas.depth} > ${topes.maxDepth}`); continue; }
      if (typeof constraints?.maxSteps === 'number' && medidas.steps > constraints.maxSteps) {
        fuera('max_steps_exceeded', `${medidas.steps} > ${constraints.maxSteps}`); continue;
      }
      if (typeof topeParalelo === 'number' && medidas.parallelism > topeParalelo) {
        fuera('max_parallel_exceeded', `${medidas.parallelism} > ${topeParalelo}`); continue;
      }

      /*
       * Dos heurísticas pueden dar LA MISMA disposición —una cadena lineal se
       * ordena igual en fila que por niveles—, y entregar la misma dos veces
       * haría creer a A1 que hay dos formas de hacerlo cuando hay una.
       */
      const huella = c.tandas.map((t) => t.join(',')).join('|');
      const yaEsta = vistas.get(huella);
      if (yaEsta) { m.duplicatesCollapsed++; continue; }
      vistas.set(huella, id);

      const valor: Descomposicion = {
        id, label: etiquetaDe(c.heuristica, medidas), heuristica: c.heuristica,
        proposedBy: DECOMPOSITION_ENGINE_REF, steps,
        tandas: c.tandas, parallelGroups: grupos.map((t) => ({ steps: t })),
        medidas,
        ...(dudoso && c.heuristica === 'secuencial' ? { esFallback: true, fallbackFrom: 'por-niveles' as Heuristica } : {}),
      };
      /* SOLO los tres ejes estructurales. Lo que no se sabe, no se dice. */
      const values: AxisValues = { steps: medidas.steps, depth: medidas.depth, parallelism: medidas.parallelism };
      aceptadas.push({ id, value: valor, values });
      m.optionsGenerated++;

      signals.push(
        senal('decomposition.steps', id, medidas.steps),
        senal('decomposition.depth', id, medidas.depth),
        senal('decomposition.parallelism', id, medidas.parallelism),
        senal('decomposition.dependencies', id, medidas.dependencies),
        senal('decomposition.complexity', id, medidas.complexity),
        senal('decomposition.capabilities', id, new Set(steps.map((s) => String(s.capability))).size),
      );
      for (let i = 0; i < 6; i++) contador.gastar('evidence');
    }

    aceptadas.sort(ordenCanonico);
    return {
      opciones: Object.freeze(aceptadas),
      rechazadas: Object.freeze(rechazadas),
      problemas: [],
      signals: Object.freeze(signals),
      metricas: { ...m, success: aceptadas.length > 0 ? 1 : 0, failures: aceptadas.length > 0 ? 0 : 1 },
    };
  };

  return { descriptor: DESCRIPTOR_DE_DESCOMPOSICION, descomponer };
};

const etiquetaDe = (h: Heuristica, m: MedidasDeDescomposicion): string =>
  h === 'secuencial' ? `en fila, ${m.steps} pasos`
    : h === 'por-niveles' ? `${m.depth} tandas, hasta ${m.parallelism} a la vez`
      : `${m.depth} tandas acotadas a ${m.parallelism}`;
