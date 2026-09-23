/**
 * WEE ALGORITHM ENGINE — A3 · EL MOTOR DE ESTRATEGIAS.
 *
 * ── Qué añade sobre A2 ──────────────────────────────────────────────────────
 *
 * A2 contesta «¿qué formas estructurales válidas hay?». A3 contesta «¿qué
 * esperamos de cada una?». Y esa segunda pregunta no se responde contando
 * nodos: hace falta saber cuál es la cadena que fija la duración, dónde está el
 * paso del que depende todo, qué números tienen evidencia detrás y cuáles son
 * una suposición con aspecto de dato.
 *
 * ── La regla que lo ordena todo ─────────────────────────────────────────────
 *
 * NO SE INVENTA NI UN NÚMERO. Una previsión existe cuando hay señales que la
 * sostengan y, si no, NO EXISTE — no vale cero, ni un valor por defecto, ni una
 * media razonable. Cada previsión que sí existe dice de dónde salió, con qué
 * confianza y sobre cuántas observaciones.
 *
 * Por eso A3 puede devolver una estrategia perfectamente válida sin coste, sin
 * latencia y sin calidad: es lo correcto cuando nadie ha medido nada todavía.
 * Lo que no puede es rellenarlas «para que el objeto esté completo».
 *
 * ── Y lo que NO hace ────────────────────────────────────────────────────────
 *
 * No elige: eso es A1, y aquí no hay pesos ni puntuación. No ejecuta, no
 * reintenta y no verifica: propone dónde verificar y qué recuperación tendría
 * sentido, y A6 decidirá. No toca los pasos: no los funde, no los reordena por
 * su cuenta y no les mete un proveedor dentro.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { PlanStep } from '../planner';
import { AlgorithmBudgetLimits, AlgorithmDescriptor, referenciaDeAlgoritmo } from './types';
import { Contador, crearContador, presupuestoEfectivo } from './budget';
import { AlgorithmConstraints, ObjectiveAxis } from './objective';
import {
  Confidence, Evidence, PESO_DE_FUENTE, Signal, SignalSource, Uncertainty,
  confianzaDeEvidencia, incertidumbreDe, resolverSenales,
} from './signals';
import { Alternative, AxisValues, ejesDeEstrategia } from './scoring';
import {
  Checkpoint, ProcedenciaDeEje, RecoveryProposal, RiesgoEstructural, Severidad, Strategy,
  VALOR_DE_SEVERIDAD, ciclosDeRespaldo, nivelesDeDependencia, problemasDeEstrategia,
} from './strategy';
import { violacionesDeEstrategia } from './authority';
import { Descomposicion } from './decomposition-engine';

export const STRATEGY_ENGINE_ID = 'motor-de-estrategias';
export const STRATEGY_ENGINE_VERSION = 1;
export const STRATEGY_ENGINE_REF = referenciaDeAlgoritmo(STRATEGY_ENGINE_ID, STRATEGY_ENGINE_VERSION);

export const DESCRIPTOR_DE_ESTRATEGIAS: AlgorithmDescriptor = Object.freeze({
  id: STRATEGY_ENGINE_ID,
  version: STRATEGY_ENGINE_VERSION,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'strategy',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Convierte una descomposición en una estrategia con previsiones, riesgos y evidencia',
  optionalSignals: Object.freeze(['step.latencyMs', 'step.costUsd', 'step.quality', 'step.reliability']),
  budget: Object.freeze({ maxCandidates: 8, maxEvidence: 256 }),
});

/* ── De dónde sale un número ──────────────────────────────────────────────── */

/** Un dato de un paso, con su procedencia. `undefined` = no se sabe, y eso se dice. */
export interface DatoDePaso {
  value: number;
  source: SignalSource;
  sampleSize?: number;
  signal: Signal;
}

/**
 * EL DATO DE UN PASO, BUSCADO DONDE PUEDE ESTAR.
 *
 * Primero lo específico —una señal sobre ESTE paso— y después lo general —una
 * sobre su capacidad—. No al revés: lo medido sobre el caso concreto vale más
 * que la media de su familia, y a igualdad de procedencia lo específico manda.
 *
 * `resolverSenales` ya resolvió los desacuerdos por procedencia antes de llegar
 * aquí, así que esta función no vuelve a decidir: solo busca.
 */
export const datoDePaso = (
  clave: string,
  paso: PlanStep,
  senales: readonly Signal[],
): DatoDePaso | undefined => {
  const busca = (subject: string): Signal | undefined =>
    senales.find((s) => s.key === clave && s.subject === subject && typeof s.value === 'number');
  const s = busca(paso.id) ?? busca(String(paso.capability));
  if (!s) return undefined;
  return { value: s.value as number, source: s.source, sampleSize: s.sampleSize, signal: s };
};

/**
 * AGREGAR LO DE CADA PASO EN UN NÚMERO PARA EL TRABAJO ENTERO.
 *
 * Y la regla que más importa: si a UN paso le falta el dato, no hay total. Una
 * suma parcial presentada como total es la peor clase de dato inventado, porque
 * parece completo. `undefined` es la respuesta correcta.
 */
const agregar = (
  steps: readonly PlanStep[],
  clave: string,
  senales: readonly Signal[],
  combinar: (valores: readonly number[]) => number,
): { value: number; porPaso: readonly DatoDePaso[] } | undefined => {
  const datos: DatoDePaso[] = [];
  for (const p of steps) {
    const d = datoDePaso(clave, p, senales);
    if (!d) return undefined;
    datos.push(d);
  }
  if (!datos.length) return undefined;
  return { value: combinar(datos.map((d) => d.value)), porPaso: datos };
};

/** La procedencia de un agregado: la MÁS DÉBIL de las que lo componen. */
const procedenciaDe = (datos: readonly DatoDePaso[]): ProcedenciaDeEje => {
  const peor = datos.reduce((p, d) => ((PESO_DE_FUENTE[d.source] ?? 0) < (PESO_DE_FUENTE[p.source] ?? 0) ? d : p), datos[0]);
  const muestras = datos.map((d) => d.sampleSize).filter((x): x is number => typeof x === 'number');
  const basis: Evidence[] = datos.map((d) => ({ claim: `${d.signal.key}:${d.signal.subject}`, signal: d.signal, supports: true }));
  return {
    confidence: confianzaDeEvidencia(basis).value,
    source: peor.source,
    ...(muestras.length === datos.length ? { sampleSize: Math.min(...muestras) } : {}),
    basis,
  };
};

/* ── El camino crítico ────────────────────────────────────────────────────── */

/**
 * LA CADENA QUE FIJA CUÁNTO DURA EL TRABAJO.
 *
 * Acortar cualquier otra cosa no cambia la duración; acortar esto sí. Es la
 * primera pregunta que hay que poder responder para optimizar, y sin ella
 * «hacerlo más rápido» es adivinar dónde tocar.
 *
 * Dada una DISPOSICIÓN —las tandas que A2 ya calculó—, el trabajo dura la suma
 * de lo que dura la tanda más lenta de cada escalón, y el camino crítico es el
 * paso más lento de cada tanda. No se recalculan los niveles: A2 ya los tiene, y
 * rehacerlos aquí sería tener dos respuestas para la misma pregunta.
 *
 * Sin duraciones medidas sigue habiendo camino —el primero de cada tanda, por
 * id— pero NO hay duración: se devuelve `undefined`, no un cero.
 */
export const caminoCritico = (
  tandas: readonly (readonly string[])[],
  duracionDe: (id: string) => number | undefined,
): { path: readonly string[]; durationMs?: number } => {
  const path: string[] = [];
  let total = 0;
  let todasConocidas = true;
  for (const tanda of tandas) {
    const orden = [...tanda].sort();
    let mejor = orden[0];
    let mejorD = duracionDe(mejor);
    for (const id of orden.slice(1)) {
      const d = duracionDe(id);
      /* Empate o dato ausente: manda el id, para que el camino sea reproducible. */
      if (typeof d === 'number' && (typeof mejorD !== 'number' || d > mejorD)) { mejor = id; mejorD = d; }
    }
    path.push(mejor);
    if (typeof mejorD === 'number') total += mejorD; else todasConocidas = false;
  }
  return todasConocidas && tandas.length ? { path, durationMs: total } : { path };
};

/* ── Los riesgos ──────────────────────────────────────────────────────────── */

/**
 * LO QUE PUEDE SALIR MAL POR CÓMO ESTÁ MONTADO EL TRABAJO.
 *
 * Todo lo de aquí se VE mirando el grafo y la evidencia. Ninguno es una
 * probabilidad y ninguno se convierte en una: el número que lleva cada uno es
 * una escala ordinal declarada (`VALOR_DE_SEVERIDAD`) para poder ordenarlos, y
 * llamar a eso «probabilidad de fallo» sería inventar una medición.
 */
export const riesgosDe = (
  steps: readonly PlanStep[],
  tandas: readonly (readonly string[])[],
  opciones: { sinEvidencia: readonly ObjectiveAxis[]; esFallback: boolean; sinVerificar: readonly string[]; maxParallel?: number },
): readonly RiesgoEstructural[] => {
  const riesgos: RiesgoEstructural[] = [];

  /* Un paso del que cuelga todo lo que viene después. Si cae, cae el trabajo. */
  const dependientes = new Map<string, number>();
  const cuenta = (id: string, visto = new Set<string>()): number => {
    if (visto.has(id)) return 0;
    visto.add(id);
    let n = 0;
    for (const s of steps) if ((s.dependsOn ?? []).includes(id)) n += 1 + cuenta(s.id, visto);
    return n;
  };
  for (const s of steps) dependientes.set(s.id, cuenta(s.id));
  const solos = tandas.filter((t) => t.length === 1).map((t) => t[0]);
  const criticos = solos.filter((id) => (dependientes.get(id) ?? 0) >= Math.max(2, steps.length - 2));
  if (criticos.length) {
    riesgos.push({
      kind: 'single_point_of_failure', severity: 'alto', steps: criticos,
      because: `de ${criticos.join(', ')} depende prácticamente todo lo demás`,
    });
  }

  /* Una cadena larga: cada escalón es otra oportunidad de que algo falle. */
  if (tandas.length >= 6) {
    riesgos.push({
      kind: 'dependency_depth', severity: tandas.length >= 10 ? 'alto' : 'medio',
      because: `${tandas.length} escalones encadenados`,
    });
  }

  /* Mucho a la vez: más cuota del proveedor, más límites, más que puede romperse. */
  const ancho = tandas.length ? Math.max(...tandas.map((t) => t.length)) : 0;
  if (ancho >= 4) {
    riesgos.push({
      kind: 'excessive_parallelism', severity: ancho >= 8 ? 'alto' : 'medio',
      because: `hasta ${ancho} operaciones simultáneas`,
    });
  }

  /* Los números en los que se apoyaría una decisión no los sostiene nada. */
  if (opciones.sinEvidencia.length) {
    riesgos.push({
      kind: 'insufficient_evidence', severity: opciones.sinEvidencia.length >= 3 ? 'alto' : 'medio',
      because: `sin evidencia para: ${[...opciones.sinEvidencia].sort().join(', ')}`,
      confidence: 1,
    });
  }
  if (opciones.esFallback) {
    riesgos.push({ kind: 'fallback_dependence', severity: 'medio', because: 'esta estrategia es un respaldo, no la propuesta principal' });
  }
  if (opciones.sinVerificar.length) {
    riesgos.push({
      kind: 'unverified_capability', severity: 'medio', steps: opciones.sinVerificar,
      because: `capacidades sin verificación: ${[...new Set(opciones.sinVerificar)].sort().join(', ')}`,
    });
  }
  return Object.freeze(riesgos);
};

/** La severidad mayor, en la escala ordinal. Para ordenar, nunca como probabilidad. */
export const severidadMaxima = (riesgos: readonly RiesgoEstructural[]): Severidad | undefined => {
  if (!riesgos.length) return undefined;
  return riesgos.reduce<Severidad>((p, r) => (VALOR_DE_SEVERIDAD[r.severity] > VALOR_DE_SEVERIDAD[p] ? r.severity : p), 'bajo');
};

/* ── Dónde conviene comprobar ─────────────────────────────────────────────── */

/**
 * DÓNDE PONER UN PUNTO DE COMPROBACIÓN, Y POR QUÉ AHÍ.
 *
 * Después de un paso del que cuelgan VARIOS: si ese sale mal y nadie mira, se
 * paga todo lo que venga detrás para descubrirlo al final. Comprobar solo al
 * final es enterarse en el paso nueve de que el dos ya estaba mal.
 *
 * Acotado a propósito: un punto de comprobación por paso convertiría un trabajo
 * de veinte pasos en cuarenta operaciones. Se ordenan por cuántos dependen y se
 * corta; el resto son oportunidades que se dejan pasar, no un olvido.
 */
export const puntosDeComprobacion = (
  steps: readonly PlanStep[],
  requisito: Checkpoint['requirement'],
  maximo = 3,
): readonly Checkpoint[] => {
  const cuelgan = new Map<string, number>();
  for (const s of steps) for (const d of s.dependsOn ?? []) cuelgan.set(d, (cuelgan.get(d) ?? 0) + 1);
  return Object.freeze(
    [...cuelgan.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, Math.max(0, maximo))
      .map(([afterStepId, n]) => ({
        afterStepId, requirement: requisito,
        claim: `de este paso dependen ${n}: comprobarlo aquí evita pagar lo que venga detrás`,
      })),
  );
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelEstratega {
  /** Lo que se le exigirá a un punto de comprobación. Del contrato del Core. */
  requisitoDeCalidad?: Checkpoint['requirement'];
  /** Cuántos puntos de comprobación como mucho. */
  maxCheckpoints?: number;
  /** Qué capacidades están verificadas hoy. Sin puerto, no se afirma que falten. */
  verificada?: (capability: string) => boolean;
  /** El reloj, por puerto. Solo para contar cuánto se tardó en pensar. */
  ahora?: () => number;
}

export interface MetricasDeEstrategia {
  candidates: number;
  valid: number;
  rejected: number;
  duplicates: number;
  fallbacks: number;
  baselines: number;
  validationFailures: number;
  /** Cuántos ejes se pudieron prever de verdad, sumando todas las estrategias. */
  expectedAxes: number;
  /** Cuántos se quedaron sin evidencia. */
  unknownAxes: number;
  budgetExhausted: boolean;
}

export interface EstrategiaRechazada {
  id: string;
  reason: string;
  detail?: string;
}

export interface ResultadoDeEstrategias {
  /** Listas para A1, sin traducir nada. */
  estrategias: readonly Alternative<Strategy>[];
  rechazadas: readonly EstrategiaRechazada[];
  /** Las señales que A3 midió sobre las estrategias, para el contexto de A1. */
  signals: readonly Signal[];
  metricas: MetricasDeEstrategia;
}

/** Qué claves de señal lee A3 de cada paso, y a qué eje alimentan. */
const FUENTES: readonly { clave: string; eje: ObjectiveAxis; combinar: (v: readonly number[]) => number; porque: string }[] = Object.freeze([
  /* El coste del trabajo entero es la suma: se paga cada paso. */
  { clave: 'step.costUsd', eje: 'cost', combinar: (v) => v.reduce((a, b) => a + b, 0), porque: 'suma' },
  /* La calidad de una cadena es la de su eslabón más débil, no la media. */
  { clave: 'step.quality', eje: 'quality', combinar: (v) => Math.min(...v), porque: 'el eslabón más débil' },
  /* Que todo salga bien es que salga bien cada uno: se multiplican. */
  { clave: 'step.reliability', eje: 'reliability', combinar: (v) => v.reduce((a, b) => a * b, 1), porque: 'producto' },
]);

export const crearMotorDeEstrategias = (opciones: OpcionesDelEstratega = {}) => {
  const requisito = opciones.requisitoDeCalidad ?? { checks: ['prompt_adherence'] as const, onBelow: 'regenerate' as const };
  const maxCheckpoints = opciones.maxCheckpoints ?? 3;

  /** Una descomposición de A2 → una estrategia con todo lo que se pueda saber. */
  const construir = (
    d: Descomposicion,
    senales: readonly Signal[],
    esBaseline: boolean,
  ): { estrategia: Strategy; values: AxisValues; signals: readonly Signal[] } => {
    const steps = d.steps;
    const sinEvidencia: ObjectiveAxis[] = [];
    const porEje: Partial<Record<ObjectiveAxis, ProcedenciaDeEje>> = {};
    const evidencia: Evidence[] = [];
    const expected: Record<string, number> = {};

    for (const f of FUENTES) {
      const a = agregar(steps, f.clave, senales, f.combinar);
      if (!a) { sinEvidencia.push(f.eje); continue; }
      const p = procedenciaDe(a.porPaso);
      porEje[f.eje] = p;
      evidencia.push(...(p.basis ?? []));
      if (f.eje === 'cost') expected.costUsd = a.value;
      if (f.eje === 'quality') expected.quality = a.value;
      /* La fiabilidad medida es lo ÚNICO que se convierte en `risk`. Lo estructural no. */
      if (f.eje === 'reliability') expected.risk = Math.max(0, Math.min(1, 1 - a.value));
    }

    /* Latencia: NO es la suma. Es el camino crítico de ESTA disposición. */
    const duracion = new Map<string, number | undefined>(
      steps.map((p) => [p.id, datoDePaso('step.latencyMs', p, senales)?.value]));
    const critico = caminoCritico(d.tandas, (id) => duracion.get(id));
    if (typeof critico.durationMs === 'number') {
      expected.latencyMs = critico.durationMs;
      const datos = steps.map((p) => datoDePaso('step.latencyMs', p, senales)).filter((x): x is DatoDePaso => !!x);
      const p = procedenciaDe(datos);
      porEje.latency = p;
      evidencia.push(...(p.basis ?? []));
    } else {
      sinEvidencia.push('latency');
    }

    const sinVerificar = opciones.verificada
      ? [...new Set(steps.map((s) => String(s.capability)).filter((c) => !(opciones.verificada as (c: string) => boolean)(c)))]
      : [];
    const risks = riesgosDe(steps, d.tandas, { sinEvidencia, esFallback: !!d.esFallback, sinVerificar });

    const confidence: Confidence = confianzaDeEvidencia(evidencia);
    const uncertainty: Uncertainty = incertidumbreDe(confidence);
    const id = `${d.id}:estrategia`;
    const estrategia: Strategy = {
      id,
      contract: ALGORITHM_CONTRACT_VERSION,
      label: `${d.label}${typeof expected.latencyMs === 'number' ? ` · ~${Math.round(expected.latencyMs)} ms` : ''}`,
      proposedBy: STRATEGY_ENGINE_REF,
      fromDecomposition: d.id,
      steps,
      parallelGroups: d.parallelGroups,
      checkpoints: puntosDeComprobacion(steps, requisito, maxCheckpoints),
      recovery: recuperacionPara(risks),
      criticalPath: critico.path,
      evidence: Object.freeze(evidencia),
      expected: { ...expected, confidence, uncertainty, porEje, risks },
      ...(esBaseline ? { isBaseline: true } : {}),
      ...(d.esFallback ? { isFallback: true, fallbackFrom: `${d.id.replace(/:[^:]+$/, '')}:por-niveles:estrategia` } : {}),
    };

    /* Los ejes: los estructurales de A2 SIEMPRE, y los previstos solo si se saben. */
    const values: AxisValues = {
      steps: d.medidas.steps, depth: d.medidas.depth, parallelism: d.medidas.parallelism,
      ...ejesDeEstrategia(estrategia),
    };
    const severidad = severidadMaxima(risks);
    const propias: Signal[] = [
      { key: 'strategy.criticalPathLength', subject: id, value: critico.path.length, source: 'measured' },
      { key: 'strategy.riskCount', subject: id, value: risks.length, source: 'measured' },
      { key: 'strategy.unknownAxes', subject: id, value: sinEvidencia.length, source: 'measured' },
      /*
       * La severidad estructural sale como SEÑAL, no como `expected.risk`.
       * `risk` está reservado para lo medido; esto es una lectura del grafo, y
       * mezclarlas convertiría una escala ordinal en una probabilidad.
       */
      ...(severidad ? [{ key: 'strategy.structuralRisk', subject: id, value: VALOR_DE_SEVERIDAD[severidad], source: 'derived' as SignalSource }] : []),
    ];
    return { estrategia, values, signals: propias };
  };

  const proponer = (
    descomposiciones: readonly Descomposicion[],
    senalesCrudas: readonly Signal[] = [],
    constraints?: AlgorithmConstraints,
    limites?: AlgorithmBudgetLimits,
  ): ResultadoDeEstrategias => {
    const topes = presupuestoEfectivo(limites, DESCRIPTOR_DE_ESTRATEGIAS.budget);
    const contador: Contador = crearContador(topes, opciones.ahora);
    contador.gastar('algorithmCalls');
    const m: MetricasDeEstrategia = {
      candidates: 0, valid: 0, rejected: 0, duplicates: 0, fallbacks: 0, baselines: 0,
      validationFailures: 0, expectedAxes: 0, unknownAxes: 0, budgetExhausted: false,
    };
    const { resueltas } = resolverSenales(senalesCrudas);

    const construidas: { alt: Alternative<Strategy>; signals: readonly Signal[] }[] = [];
    const rechazadas: EstrategiaRechazada[] = [];
    const huellas = new Map<string, string>();

    /*
     * La entrada se normaliza UNA vez, arriba. Antes el bucle sí se protegía y
     * el cálculo de la referencia no, así que `proponer(undefined)` reventaba:
     * dos guardas para la misma entrada son una guarda y un descuido.
     */
    const entrada: readonly Descomposicion[] = Array.isArray(descomposiciones) ? descomposiciones : [];
    /* La secuencial es la referencia. Determinista y declarada, no «la primera». */
    const idBaseline = entrada.filter((d) => d?.heuristica === 'secuencial').map((d) => d.id).sort()[0];

    for (const d of entrada) {
      if (!contador.cabe('candidates')) { m.budgetExhausted = true; break; }
      contador.gastar('candidates');
      m.candidates++;
      const { estrategia, values, signals } = construir(d, resueltas, d.id === idBaseline);

      /* 1 · La frontera, antes que nada: nombrar una implementación descalifica. */
      const violaciones = violacionesDeEstrategia(estrategia);
      if (violaciones.length) {
        rechazadas.push({ id: estrategia.id, reason: 'authority', detail: violaciones[0].clave });
        m.rejected++; continue;
      }
      /* 2 · Coherencia: el contrato del Core, sin una segunda validación paralela. */
      const problemas = problemasDeEstrategia(estrategia);
      if (problemas.length) {
        rechazadas.push({ id: estrategia.id, reason: 'incoherent', detail: problemas[0] });
        m.rejected++; m.validationFailures++; continue;
      }
      /* 3 · Las restricciones duras. Ninguna puntuación las compensa. */
      const fuera = violaRestricciones(estrategia, values, constraints, topes);
      if (fuera) { rechazadas.push({ id: estrategia.id, reason: fuera }); m.rejected++; continue; }

      /* 4 · Duplicados SEMÁNTICOS: misma forma y mismas previsiones es la misma. */
      const huella = huellaDe(estrategia, values);
      if (huellas.has(huella)) { m.duplicates++; continue; }
      huellas.set(huella, estrategia.id);

      construidas.push({ alt: { id: estrategia.id, value: estrategia, values }, signals });
      m.valid++;
      if (estrategia.isFallback) m.fallbacks++;
      if (estrategia.isBaseline) m.baselines++;
      m.expectedAxes += Object.keys(estrategia.expected.porEje ?? {}).length;
      m.unknownAxes += (estrategia.expected.risks ?? [])
        .filter((r) => r.kind === 'insufficient_evidence').length ? 1 : 0;
      for (let i = 0; i < signals.length; i++) contador.gastar('evidence');
    }

    /* 5 · Un bucle de respaldos dejaría al sistema dando vueltas. Se detecta y se corta. */
    const bucles = ciclosDeRespaldo(construidas.map((c) => c.alt.value));
    const enBucle = new Set(bucles.flat());
    const finales = construidas.filter((c) => {
      if (!enBucle.has(c.alt.value.id)) return true;
      rechazadas.push({ id: c.alt.value.id, reason: 'fallback_cycle', detail: bucles.find((b) => b.includes(c.alt.value.id))?.join(' → ') });
      m.rejected++; m.valid--;
      return false;
    });

    finales.sort((a, b) => ordenCanonicoDeEstrategias(a.alt, b.alt));
    return {
      estrategias: Object.freeze(finales.map((c) => c.alt)),
      rechazadas: Object.freeze(rechazadas),
      signals: Object.freeze(finales.flatMap((c) => c.signals)),
      metricas: m,
    };
  };

  return { descriptor: DESCRIPTOR_DE_ESTRATEGIAS, proponer, construir };
};

/* ── Piezas sueltas, exportadas para poder probarlas por separado ─────────── */

/**
 * QUÉ RECUPERACIÓN TENDRÍA SENTIDO PARA LO QUE SE HA ENCONTRADO.
 *
 * PROPUESTA, y esa palabra es el contrato entero: los reintentos son del Job
 * Engine con su `RetryPolicy`, y A6 decidirá. Lo que aporta esto es que la
 * recuperación deje de ser una política fija igual para todos y responda a lo
 * que de verdad tiene este trabajo delante.
 */
export const recuperacionPara = (riesgos: readonly RiesgoEstructural[]): readonly RecoveryProposal[] => {
  const salida: RecoveryProposal[] = [];
  for (const r of [...riesgos].sort((a, b) => (a.kind < b.kind ? -1 : 1))) {
    if (r.kind === 'single_point_of_failure') {
      salida.push({ kind: 'retry', because: `${r.because}: reintentar ahí cuesta menos que rehacer el trabajo` });
    } else if (r.kind === 'insufficient_evidence' || r.kind === 'high_uncertainty') {
      salida.push({ kind: 'replan', because: `${r.because}: con lo que se aprenda ejecutando se puede volver a decidir` });
    } else if (r.kind === 'excessive_parallelism') {
      salida.push({ kind: 'partial', because: `${r.because}: quedarse con lo que sí salió evita repetirlo entero` });
    } else if (r.kind === 'fallback_dependence') {
      salida.push({ kind: 'alternative_strategy', because: r.because, strategyId: 'la principal, si vuelve a estar disponible' });
    }
  }
  return Object.freeze(salida);
};

/** ¿Se sale de alguna restricción dura? Devuelve cuál, o `undefined`. */
export const violaRestricciones = (
  s: Strategy,
  values: AxisValues,
  c: AlgorithmConstraints | undefined,
  topes: Required<AlgorithmBudgetLimits>,
): string | undefined => {
  const profundidad = s.parallelGroups && s.criticalPath ? s.criticalPath.length : nivelesDeDependencia(s.steps).niveles.length;
  if (profundidad > topes.maxDepth) return `constraint:maxDepth`;
  if (!c) return undefined;
  if (typeof c.maxSteps === 'number' && s.steps.length > c.maxSteps) return 'constraint:maxSteps';
  if (typeof c.maxParallel === 'number') {
    const ancho = Math.max(0, ...(s.parallelGroups ?? []).map((g) => g.steps.length));
    if (ancho > c.maxParallel) return 'constraint:maxParallel';
  }
  /* Solo se comprueba lo que se SABE. Lo que no se sabe no se inventa ni se castiga. */
  if (typeof c.budget?.maxUsd === 'number' && typeof values.cost === 'number' && values.cost > c.budget.maxUsd) return 'constraint:budget.maxUsd';
  if (typeof c.maxLatencyMs === 'number' && typeof values.latency === 'number' && values.latency > c.maxLatencyMs) return 'constraint:maxLatencyMs';
  if (typeof c.quality?.minScore === 'number' && typeof values.quality === 'number' && values.quality < c.quality.minScore) return 'constraint:quality.minScore';
  if (typeof c.maxRisk === 'number' && typeof s.expected.risk === 'number' && s.expected.risk > c.maxRisk) return 'constraint:maxRisk';
  const capacidades = new Set(s.steps.map((x) => String(x.capability)));
  for (const p of c.forbiddenCapabilities ?? []) if (capacidades.has(p)) return `constraint:forbiddenCapabilities:${p}`;
  for (const r of c.requiredCapabilities ?? []) if (!capacidades.has(r)) return `constraint:requiredCapabilities:${r}`;
  return undefined;
};

/**
 * LA HUELLA SEMÁNTICA: qué hace a dos estrategias LA MISMA.
 *
 * La disposición y lo que se espera de ella. La etiqueta no entra, ni el id, ni
 * de qué descomposición vino: dos estrategias que se ejecutan igual y prometen
 * lo mismo son una, y entregar las dos infla el recuento de candidatos sin
 * añadir ni una opción real.
 */
export const huellaDe = (s: Strategy, values: AxisValues): string => JSON.stringify([
  s.steps.map((p) => p.id),
  (s.parallelGroups ?? []).map((g) => [...g.steps].sort()),
  (s.checkpoints ?? []).map((c) => c.afterStepId).sort(),
  values.cost ?? null, values.latency ?? null, values.quality ?? null, values.reliability ?? null,
  values.steps ?? null, values.depth ?? null, values.parallelism ?? null,
]);

/**
 * EL ORDEN CANÓNICO. No decide nada: hace que la lista sea la misma siempre.
 *
 * La referencia primero —para que se lea antes que lo que se compara con ella—,
 * el respaldo el último, y en medio lo que se pueda medir. Elegir es de A1.
 */
export const ordenCanonicoDeEstrategias = (a: Alternative<Strategy>, b: Alternative<Strategy>): number => {
  const rango = (x: Alternative<Strategy>) => (x.value.isBaseline ? 0 : x.value.isFallback ? 2 : 1);
  const num = (v: number | undefined, siFalta: number) => (typeof v === 'number' && Number.isFinite(v) ? v : siFalta);
  return (rango(a) - rango(b))
    || (num(a.values.depth, Infinity) - num(b.values.depth, Infinity))
    || (num(a.values.steps, Infinity) - num(b.values.steps, Infinity))
    || (num(b.values.parallelism, -1) - num(a.values.parallelism, -1))
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};

/**
 * LO QUE SE ESPERA GANAR FRENTE A LA REFERENCIA.
 *
 * Solo para los ejes que LAS DOS tengan medidos: comparar contra un hueco es
 * inventar la mitad de la resta, y es la forma más fácil de que una estrategia
 * parezca mejor porque la referencia no se midió.
 */
export const deltaFrenteALaBase = (
  base: Alternative<Strategy>,
  otra: Alternative<Strategy>,
): Partial<Record<ObjectiveAxis, number>> => {
  const salida: Partial<Record<ObjectiveAxis, number>> = {};
  for (const eje of ['cost', 'latency', 'quality', 'reliability'] as const) {
    const b = base.values[eje]; const o = otra.values[eje];
    if (typeof b !== 'number' || typeof o !== 'number') continue;
    /* Positivo = mejor, se maximice o se minimice. Se dice una vez. */
    salida[eje] = eje === 'cost' || eje === 'latency' ? b - o : o - b;
  }
  return salida;
};
