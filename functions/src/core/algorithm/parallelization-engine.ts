/**
 * WEE ALGORITHM ENGINE — A4 · EL MOTOR DE PARALELIZACIÓN.
 *
 * ── Qué añade sobre A2 y A3 ─────────────────────────────────────────────────
 *
 * A2 dijo qué puede ir junto. A3 dijo qué se espera de una disposición. A4
 * contesta la pregunta que faltaba: **¿cuánto paralelismo conviene, y cuánto
 * vale de verdad?**
 *
 * No es «si hay dos tareas, paralelo». Es recorrer la curva —uno a la vez, dos,
 * tres…—, ver cuánto ahorra cada escalón, y encontrar dónde deja de compensar.
 * Con tres tareas de 5, 5 y 5 000 ms, la respuesta correcta es que paralelizar
 * ahorra 10 ms de 5 010: técnicamente se puede, y prácticamente da igual.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No ejecuta. No hay `Promise.all`, ni workers, ni colas, ni despacho: el
 * Orchestrator ya ejecuta `ParallelGroup` y no se toca. No estima por su cuenta
 * coste ni calidad: para eso está A3, y A4 le DELEGA construyendo las variantes
 * y pasándoselas. Y no elige: eso es A1.
 *
 * ── Y de dónde salen las tandas ─────────────────────────────────────────────
 *
 * De `tandasAcotadas`, que es de A2. Repartir niveles en tandas de como mucho
 * `k` ya estaba resuelto y reescribirlo aquí daría dos respuestas para la misma
 * pregunta.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { PlanStep } from '../planner';
import { AlgorithmBudgetLimits, AlgorithmDescriptor, referenciaDeAlgoritmo } from './types';
import { Contador, crearContador, presupuestoEfectivo, problemasDelPresupuesto } from './budget';
import { AlgorithmConstraints, problemasDeLosLados } from './objective';
import { Signal, SignalSource, confianzaDeSenal, resolverSenales } from './signals';
import { ParallelGroup, RiesgoEstructural, nivelesDeDependencia } from './strategy';
import { Descomposicion, tandasAcotadas } from './decomposition-engine';
import { MedidasDeDescomposicion, TareaADescomponer, medidasDe, validarDAG } from './decomposition';
import { datoDePaso } from './strategy-engine';
import {
  AhorroEsperado, CuelloDeBotella, DuracionDe, PuntoDeAbanico, PuntoDeCurva,
  abanicoDeEntrada, abanicoDeSalida, aceleracionDe, ahorroDe, anchoPosible,
  cuellosDeBotella, dondeDejaDeCompensar, duracionDeDisposicion, duracionSecuencial,
  duracionValida, razonDeAhorro, riesgosDeParalelizar,
} from './parallelization';

export const PARALLELIZATION_ENGINE_ID = 'motor-de-paralelizacion';
export const PARALLELIZATION_ENGINE_VERSION = 1;
export const PARALLELIZATION_ENGINE_REF = referenciaDeAlgoritmo(PARALLELIZATION_ENGINE_ID, PARALLELIZATION_ENGINE_VERSION);

export const DESCRIPTOR_DE_PARALELIZACION: AlgorithmDescriptor = Object.freeze({
  id: PARALLELIZATION_ENGINE_ID,
  version: PARALLELIZATION_ENGINE_VERSION,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'parallelization',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Recorre la curva de paralelismo y dice cuánto ahorra cada escalón y dónde deja de compensar',
  optionalSignals: Object.freeze(['step.latencyMs', 'resource.availableWorkers']),
  /* Ocho escalones de curva bastan: más allá, la propia curva dice que da igual. */
  budget: Object.freeze({ maxCandidates: 8 }),
});

/* ── Lo que devuelve ──────────────────────────────────────────────────────── */

export interface AnalisisDeParalelizacion {
  /** Lo que el grafo permite de verdad, sin tocar ningún límite. */
  anchoPosible: number;
  /** Hasta dónde se pudo mirar: el mínimo entre lo posible, el límite y el presupuesto. */
  anchoExplorado: number;
  niveles: readonly (readonly string[])[];
  fanOut: readonly PuntoDeAbanico[];
  fanIn: readonly PuntoDeAbanico[];
  bottlenecks: readonly CuelloDeBotella[];
  /** Uno por nivel de paralelismo. Ordenada, y siempre empieza en 1. */
  curva: readonly PuntoDeCurva[];
  /** Dónde deja de compensar. Ausente cuando no hay duraciones con que decirlo. */
  recomendado?: { parallelism: number; because: string };
  risks: readonly RiesgoEstructural[];
  /** Lo previsto para el punto recomendado. Solo si se pudo medir. */
  esperado?: AhorroEsperado;
  /**
   * Lo que estaba mal en la tarea o en lo que se pidió —restricciones y topes de
   * pensar, con la regla de A1 (S2-C)—. Con algo aquí, no hay curva.
   */
  problemas: readonly string[];
  metricas: MetricasDeParalelizacion;
}

export interface MetricasDeParalelizacion {
  groupsAnalyzed: number;
  candidates: number;
  variants: number;
  rejectedVariants: number;
  duplicates: number;
  bottlenecks: number;
  baselineDurationMs?: number;
  expectedParallelDurationMs?: number;
  expectedSavingsMs?: number;
  confidence: number;
  budgetExhausted: boolean;
}

const METRICAS_CERO: MetricasDeParalelizacion = Object.freeze({
  groupsAnalyzed: 0, candidates: 0, variants: 0, rejectedVariants: 0, duplicates: 0,
  bottlenecks: 0, confidence: 0, budgetExhausted: false,
});

export interface OpcionesDelParalelizador {
  /** El reloj, por puerto. Solo para contar cuánto se tardó en pensar. */
  ahora?: () => number;
  /** Cuántos dependientes hacen un fan-out. Acotado y configurable, no mágico. */
  minFanOut?: number;
  /** Cuántas dependencias hacen un punto de sincronización. */
  minFanIn?: number;
}

/**
 * LAS SEÑALES DE RECURSOS, leídas y no consultadas.
 *
 * A4 es puro: no pregunta cuántos workers hay: se lo dicen. Si nadie se lo dice,
 * no afirma que haya presión — no saber no es lo mismo que estar bien.
 */
export const recursosDeSenales = (senales: readonly Signal[]): { availableWorkers?: number } => {
  const s = senales.find((x) => x.key === 'resource.availableWorkers' && typeof x.value === 'number');
  return s && duracionValida(s.value as number) ? { availableWorkers: s.value as number } : {};
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export const crearMotorDeParalelizacion = (opciones: OpcionesDelParalelizador = {}) => {
  const minFanOut = Math.max(2, opciones.minFanOut ?? 4);
  const minFanIn = Math.max(2, opciones.minFanIn ?? 2);

  const analizar = (
    tarea: TareaADescomponer,
    senalesCrudas: readonly Signal[] = [],
    constraints?: AlgorithmConstraints,
    limites?: AlgorithmBudgetLimits,
  ): AnalisisDeParalelizacion => {
    const topes = presupuestoEfectivo(limites, DESCRIPTOR_DE_PARALELIZACION.budget);
    const contador: Contador = crearContador(topes, opciones.ahora);
    contador.gastar('algorithmCalls');
    const m: MetricasDeParalelizacion = { ...METRICAS_CERO };

    /*
     * El grafo se valida con el de A2. No hay una segunda validación aquí.
     *
     * (S2-C) Y lo que se pide, con la regla de A1 (S2-B · B.1, B.4, B.5): unas
     * restricciones o unos topes de pensar mal formados no se reinterpretan —un
     * `maxParallel` de 0 o de -1 no es «uno a la vez», y un `NaN` no es «nada»—:
     * se dicen aquí, detrás de los del grafo, y sin ellos no hay curva. En el
     * ciclo no llegan: A9 se para antes.
     */
    const problemas = [
      ...validarDAG(tarea).map((p) => `${p.ref}:${p.reason}`),
      ...problemasDeLosLados(undefined, constraints),
      ...problemasDelPresupuesto(limites),
    ];
    if (problemas.length) {
      return {
        anchoPosible: 0, anchoExplorado: 0, niveles: [], fanOut: [], fanIn: [], bottlenecks: [],
        curva: [], risks: [], problemas: Object.freeze(problemas), metricas: m,
      };
    }

    const steps = tarea.steps;
    const { resueltas } = resolverSenales(senalesCrudas);
    const { niveles } = nivelesDeDependencia(steps);
    const posible = anchoPosible(steps);
    const recursos = recursosDeSenales(resueltas);

    /* Las duraciones salen de la MISMA clave que lee A3. Una sola fuente. */
    const cache = new Map<string, number | undefined>();
    for (const p of steps) {
      const d = datoDePaso('step.latencyMs', p, resueltas);
      cache.set(p.id, d && duracionValida(d.value) ? d.value : undefined);
    }
    const dur: DuracionDe = (id) => cache.get(id);
    const datos = steps.map((p) => datoDePaso('step.latencyMs', p, resueltas));
    const todasMedidas = datos.every((d) => !!d);
    const procedencia: SignalSource = todasMedidas
      ? datos.reduce<SignalSource>((peor, d) =>
        (confianzaDeSenal(d!.signal) < confianzaDeSenal({ key: 'x.y', value: 1, source: peor }) ? d!.source : peor), 'measured')
      : 'default';
    const confianza = todasMedidas
      ? Math.min(...datos.map((d) => confianzaDeSenal(d!.signal)))
      : 0;

    const baseline = duracionSecuencial(steps, dur);

    /*
     * Hasta dónde explorar. Tres topes, y el más estrecho manda: lo que el grafo
     * permite, lo que las restricciones admiten, y lo que el presupuesto deja
     * pensar. Explorar más allá de `anchoPosible` no daría puntos nuevos.
     */
    const porRestriccion = typeof constraints?.maxParallel === 'number' ? Math.max(1, constraints.maxParallel) : posible;
    const explorado = Math.max(1, Math.min(posible, porRestriccion, topes.maxCandidates));

    const curva: PuntoDeCurva[] = [];
    let anterior: number | undefined;
    for (let k = 1; k <= explorado; k++) {
      if (!contador.cabe('candidates')) { m.budgetExhausted = true; break; }
      contador.gastar('candidates');
      m.candidates++;
      const tandas = tandasAcotadas(niveles, k);
      const paralelo = duracionDeDisposicion(tandas, dur);
      const ahorro = ahorroDe(baseline, paralelo);
      const marginal = duracionValida(anterior) && duracionValida(paralelo) ? Math.max(0, anterior - paralelo) : undefined;
      curva.push({
        parallelism: k,
        tandas,
        depth: tandas.length,
        actualWidth: tandas.length ? Math.max(...tandas.map((t) => t.length)) : 0,
        ...(duracionValida(baseline) ? { baselineDurationMs: baseline } : {}),
        ...(duracionValida(paralelo) ? { parallelDurationMs: paralelo } : {}),
        ...(ahorro !== undefined ? { savingsMs: ahorro } : {}),
        ...(razonDeAhorro(baseline, paralelo) !== undefined ? { savingsRatio: razonDeAhorro(baseline, paralelo) } : {}),
        ...(aceleracionDe(baseline, paralelo) !== undefined ? { speedup: aceleracionDe(baseline, paralelo) } : {}),
        ...(marginal !== undefined ? { marginalSavingsMs: marginal } : {}),
        confidence: confianza,
        provenance: procedencia,
      });
      if (duracionValida(paralelo)) anterior = paralelo;
    }
    contador.gastar('iterations');

    const recomendado = dondeDejaDeCompensar(curva);
    const puntoRec = recomendado ? curva.find((p) => p.parallelism === recomendado.parallelism) : undefined;
    const tandasRec = puntoRec?.tandas ?? (curva[curva.length - 1]?.tandas ?? niveles);
    const cuellos = cuellosDeBotella(steps, tandasRec, dur);
    const risks = riesgosDeParalelizar(steps, tandasRec, recursos);

    m.groupsAnalyzed = tandasRec.filter((t) => t.length > 1).length;
    m.bottlenecks = cuellos.length;
    m.confidence = confianza;
    if (duracionValida(baseline)) m.baselineDurationMs = baseline;
    if (duracionValida(puntoRec?.parallelDurationMs)) m.expectedParallelDurationMs = puntoRec?.parallelDurationMs;
    if (duracionValida(puntoRec?.savingsMs)) m.expectedSavingsMs = puntoRec?.savingsMs;

    const esperado: AhorroEsperado | undefined =
      puntoRec && duracionValida(puntoRec.baselineDurationMs) && duracionValida(puntoRec.parallelDurationMs)
      && duracionValida(puntoRec.savingsMs)
        ? {
          baselineDurationMs: puntoRec.baselineDurationMs,
          parallelDurationMs: puntoRec.parallelDurationMs,
          savingsMs: puntoRec.savingsMs,
          ...(puntoRec.savingsRatio !== undefined ? { savingsRatio: puntoRec.savingsRatio } : {}),
          ...(puntoRec.speedup !== undefined ? { speedup: puntoRec.speedup } : {}),
          confidence: confianza,
          provenance: procedencia,
        }
        : undefined;

    return {
      anchoPosible: posible,
      anchoExplorado: explorado,
      niveles,
      fanOut: abanicoDeSalida(steps, minFanOut),
      fanIn: abanicoDeEntrada(steps, minFanIn),
      bottlenecks: cuellos,
      curva: Object.freeze(curva),
      ...(recomendado ? { recomendado } : {}),
      risks,
      ...(esperado ? { esperado } : {}),
      problemas: [],
      metricas: m,
    };
  };

  /**
   * LAS VARIANTES, listas para que A3 las convierta en estrategias.
   *
   * Cada punto de la curva es una disposición distinta del MISMO trabajo, con
   * los mismos pasos. Se entregan como `Descomposicion` —el tipo de A2— para
   * que A3 las estime sin traducir nada y sin que A4 tenga que estimar por su
   * cuenta: si A4 calculara coste o calidad, habría dos motores haciendo lo
   * mismo con dos resultados posibles.
   *
   * Los duplicados se colapsan: una cadena lineal da la misma disposición para
   * cualquier `k`, y entregarla ocho veces no son ocho opciones.
   */
  const variantes = (
    tarea: TareaADescomponer,
    senales: readonly Signal[] = [],
    constraints?: AlgorithmConstraints,
    limites?: AlgorithmBudgetLimits,
  ): { variantes: readonly Descomposicion[]; analisis: AnalisisDeParalelizacion } => {
    const analisis = analizar(tarea, senales, constraints, limites);
    if (analisis.problemas.length) return { variantes: [], analisis };

    const vistas = new Map<string, string>();
    const salida: Descomposicion[] = [];
    for (const punto of analisis.curva) {
      const huella = punto.tandas.map((t) => t.join(',')).join('|');
      if (vistas.has(huella)) { analisis.metricas.duplicates++; continue; }
      vistas.set(huella, String(punto.parallelism));
      const medidas: MedidasDeDescomposicion = medidasDe(tarea.steps, punto.tandas);
      const grupos: ParallelGroup[] = punto.tandas
        .filter((t) => t.length > 1)
        .map((t) => ({
          steps: t,
          maxConcurrency: punto.parallelism,
          /* El ahorro que A3 dejó esperando. Solo cuando de verdad se sabe. */
          ...(duracionValida(punto.savingsMs) ? { expectedSavingsMs: punto.savingsMs } : {}),
        }));
      salida.push({
        id: `${tarea.id}:par${punto.parallelism}`,
        label: punto.parallelism === 1
          ? `en fila, ${medidas.steps} pasos`
          : `hasta ${punto.actualWidth} a la vez${duracionValida(punto.savingsMs) ? ` · ahorra ~${Math.round(punto.savingsMs)} ms` : ''}`,
        heuristica: punto.parallelism === 1 ? 'secuencial' : 'acotada',
        proposedBy: PARALLELIZATION_ENGINE_REF,
        steps: tarea.steps,
        tandas: punto.tandas,
        parallelGroups: grupos,
        medidas,
      });
      analisis.metricas.variants++;
    }
    return { variantes: Object.freeze(salida), analisis };
  };

  return { descriptor: DESCRIPTOR_DE_PARALELIZACION, analizar, variantes };
};

/** Un paso con su duración, para construir una tabla de pruebas o un informe. */
export const conDuracion = (steps: readonly PlanStep[], dur: DuracionDe): readonly { id: string; ms?: number }[] =>
  steps.map((s) => ({ id: s.id, ...(duracionValida(dur(s.id)) ? { ms: dur(s.id) as number } : {}) }));
