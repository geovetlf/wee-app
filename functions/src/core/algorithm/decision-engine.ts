/**
 * WEE ALGORITHM ENGINE — A1 · EL MOTOR DE DECISIÓN.
 *
 * El primer algoritmo real de Weë. Recibe alternativas y devuelve cuál conviene,
 * por qué, y qué pasó con las demás. No ejecuta nada, no elige proveedor y no
 * llama a ningún modelo: la inteligencia sale de la representación, no de un LLM.
 *
 * ── La tubería, y por qué está separada ─────────────────────────────────────
 *
 *   validar → restricciones duras → señales → evidencia → puntuar
 *           → confianza → Pareto → seleccionar → explicar → registrar
 *
 * Cada etapa es una función exportada y pura. No es una preferencia de estilo:
 * una decisión que sale de una función de trescientas líneas no se puede probar
 * por partes, y cuando falle nadie sabrá en cuál de las diez cosas falló.
 *
 * ── La regla que ordena todo lo demás ───────────────────────────────────────
 *
 * LAS RESTRICCIONES DURAS SE APLICAN ANTES DE PUNTUAR. Una opción que se sale
 * del presupuesto no compite: no «pierde puntos», queda fuera. Convertir un
 * límite en un peso es cómo una opción de 0,40 $ gana un presupuesto de 0,10 $
 * por tener mejor calidad, y eso no es una decisión: es un error con formato de
 * decisión.
 *
 * ── Lo que NO hace, y tiene dueño ───────────────────────────────────────────
 *
 * No elige proveedor, modelo ni adaptador: eso es del Router, que ya puntúa sus
 * siete ejes y no se copia aquí. Si una estrategia necesita saber algo del
 * Router, lo recibe como SEÑAL. Este archivo no lo importa y no puede.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import {
  AlgorithmBudgetLimits,
  AlgorithmDescriptor,
  AlgorithmFailureReason,
  referenciaDeAlgoritmo,
} from './types';
import {
  AlgorithmSpend, Contador, GASTO_CERO, crearContador, presupuestoEfectivo, problemasDelPresupuesto, topeDelContador,
} from './budget';
import {
  AlgorithmConstraints, EJES, Objective, ObjectiveAxis, conflictosDeRestricciones, ladoFundible, pesosNormalizados, problemasDeLosLados,
} from './objective';
import {
  Confidence, Evidence, Signal, Uncertainty, confianzaDeEvidencia, incertidumbreDe, resolverSenales, senalValida,
} from './signals';
import { Alternative, AxisValues, StrategyScore, ejesDeEstrategia, pareto, puntuar } from './scoring';
import { Strategy, problemasDeEstrategia } from './strategy';
import { violacionesDeEstrategia, violacionesEn } from './authority';
/* Solo la DEFINICIÓN de muestra de A7. Ni su motor ni el de A8: A1 no lee de ellos. */
import { POLITICA_MINIMA } from './feedback';
import {
  AlgorithmDecision,
  DecisionContext,
  DecisionWarning,
  HistoryWindow,
  JudgedOption,
  sinDecision,
} from './decision';

/* ── Quién es el motor ────────────────────────────────────────────────────── */

export const DECISION_ENGINE_ID = 'motor-de-decision';
/*
 * 2 desde S2-A (contrato 1.10): A1 rechaza la petición que nombra una
 * implementación y desempata las señales por contenido, así que cambia lo que
 * DECIDE, y esa es la regla de `AlgorithmDescriptor.version`. Las fases
 * anteriores no la aplicaron; el contrato sí subió con cada una.
 */
/* 3 desde S2-B (contrato 1.11): con entradas VÁLIDAS decide distinto —la evidencia de lo que se evalúa (B.4)—. */
export const DECISION_ENGINE_VERSION = 3;
export const DECISION_ENGINE_REF = referenciaDeAlgoritmo(DECISION_ENGINE_ID, DECISION_ENGINE_VERSION);

/**
 * Su ficha para el registro. Se registra como cualquier otro: no hay un camino
 * especial para «el primero».
 *
 * `experimental` y no `active` a propósito. Corre, se mide y se compara con la
 * línea base, pero NADIE lo elige solo — que es justo la diferencia entre
 * medirlo y confiar en él. Pasará a `active` cuando haya mediciones que lo
 * justifiquen, y eso es una decisión con datos delante, no un cambio de línea.
 */
export const DESCRIPTOR_DEL_MOTOR: AlgorithmDescriptor = Object.freeze({
  id: DECISION_ENGINE_ID,
  version: DECISION_ENGINE_VERSION,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'decision',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Elige entre alternativas según el objetivo, las restricciones y la evidencia disponible',
  optionalSignals: Object.freeze(['option.quality', 'option.cost', 'option.latency', 'option.reliability']),
});

/* ── La política ──────────────────────────────────────────────────────────── */

/**
 * QUÉ HACER CUANDO A UNA OPCIÓN LE FALTA EL DATO QUE UNA RESTRICCIÓN EXIGE.
 *
 * No es obvio y por eso se elige en vez de deducirse:
 *
 *   reject  lo que no se puede comprobar no compite. Es el defecto, porque un
 *           límite que admite lo incomprobable no es un límite — bastaría con
 *           omitir el coste para saltarse cualquier presupuesto.
 *   admit   entra, con su aviso. Tiene sentido cuando quien llama sabe que sus
 *           datos están incompletos y prefiere una respuesta con reservas.
 *
 * El Router eligió lo segundo para su presupuesto (`budget_not_checked`), y por
 * un motivo distinto: allí NO HAY con qué estimar. Aquí el dato falta en un
 * candidato concreto mientras otros sí lo traen, que es otra situación.
 */
export type PoliticaDeDatoAusente = 'reject' | 'admit';

/**
 * EL DESEMPATE, DECLARADO COMO DATOS.
 *
 * Dos opciones con la misma puntuación tienen que ordenarse igual en dos
 * ejecuciones distintas, siempre. Sin esto manda el orden en que llegó el array
 * —o peor, el del iterador de un objeto—, y entonces «la misma pregunta» puede
 * dar dos respuestas.
 *
 * El orden NO se presenta como universal: es una política, está aquí en una
 * lista para poder leerla, sustituirla y probarla, y la última regla es el `id`
 * porque un desempate tiene que terminar en algo que no empate nunca.
 */
export interface Comparador {
  nombre: string;
  comparar: (a: Juzgada, b: Juzgada) => number;
}

/**
 * COMPARAR DOS NÚMEROS QUE PUEDEN NO ESTAR.
 *
 * Escrito una vez, y no con restas sueltas, por un fallo concreto: comparar dos
 * valores ausentes tratándolos como `Infinity` da `Infinity - Infinity = NaN`,
 * `NaN !== 0` es cierto, y el desempate se DETIENE ahí — sin llegar nunca al
 * `id`, que es lo único que garantiza que dos ejecuciones iguales ordenen
 * igual. El resultado era un motor no determinista que parecía correcto.
 *
 * Regla: los dos ausentes empatan; el que falta va detrás; y nunca sale un NaN.
 */
const compara = (a: number | undefined, b: number | undefined, mayorEsMejor: boolean): number => {
  const ha = typeof a === 'number' && Number.isFinite(a);
  const hb = typeof b === 'number' && Number.isFinite(b);
  if (!ha && !hb) return 0;
  if (!ha) return 1;
  if (!hb) return -1;
  return mayorEsMejor ? (b as number) - (a as number) : (a as number) - (b as number);
};

export const COMPARADORES: readonly Comparador[] = Object.freeze([
  /* 1 · lo que dice el objetivo. Es la pregunta que se hizo. */
  { nombre: 'objective', comparar: (a, b) => compara(a.score?.total, b.score?.total, true) },
  /* 2 · cuánto se sabe. Entre dos iguales, gana la que se apoya en algo. */
  { nombre: 'confidence', comparar: (a, b) => compara(a.confidence?.value, b.confidence?.value, true) },
  /* 3 · cuánto se pudo medir. Empatar por no tener datos no es empatar. */
  { nombre: 'coverage', comparar: (a, b) => compara(a.score?.coverage, b.score?.coverage, true) },
  /* 4 · fiabilidad. */
  { nombre: 'reliability', comparar: (a, b) => compara(a.values?.reliability, b.values?.reliability, true) },
  /* 5 · lo más barato. Quien no lo diga va detrás, no delante. */
  { nombre: 'cost', comparar: (a, b) => compara(a.values?.cost, b.values?.cost, false) },
  /* 6 · lo más rápido, con el mismo criterio. */
  { nombre: 'latency', comparar: (a, b) => compara(a.values?.latency, b.values?.latency, false) },
  /* 7 · y el último, que no puede empatar: el nombre. */
  { nombre: 'id', comparar: (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) },
]);

export interface OpcionesDelMotor {
  /** Qué hacer con lo que no se puede comprobar. Por defecto, no compite. */
  datoAusente?: PoliticaDeDatoAusente;
  /** El reloj, por puerto. Sin él no se comprueban plazos y se dice. */
  ahora?: () => number;
  /** Cómo leer una estrategia dentro de una opción. Por defecto, la reconoce. */
  estrategiaDe?: (valor: unknown) => Strategy | undefined;
  /** El desempate. Por defecto, `COMPARADORES`. */
  comparadores?: readonly Comparador[];
}

/**
 * RECONOCE UNA `Strategy` SIN PEDIR QUE NADIE LA ANUNCIE.
 *
 * Mira `expected`, y no solo `id` + `steps`, por un fallo concreto: una
 * descomposición de A2 también tiene id y pasos, así que se la tomaba por una
 * estrategia mal formada y se rechazaba por «le falta la previsión» — cuando lo
 * que le faltaba era no ser una estrategia.
 *
 * `expected` es el campo que una `Strategy` tiene OBLIGATORIAMENTE y que no
 * tiene ninguna otra cosa de esta capa. Reconocer por lo obligatorio, no por lo
 * común, es lo que hace que el reconocimiento signifique algo.
 */
export const estrategiaPorDefecto = (valor: unknown): Strategy | undefined => {
  if (typeof valor !== 'object' || valor === null) return undefined;
  const v = valor as Partial<Strategy>;
  const tieneExpected = typeof v.expected === 'object' && v.expected !== null;
  return Array.isArray(v.steps) && typeof v.id === 'string' && tieneExpected ? (valor as Strategy) : undefined;
};

/* ── 1 · Validación ───────────────────────────────────────────────────────── */

/**
 * ¿TIENE CADA ALTERNATIVA SU IDENTIDAD? Contrato 1.8.
 *
 * Una decisión compara alternativas que se distinguen por su `id`: con él se
 * ordenan al entrar, se desempata, se encuentra su historial y se atribuye lo
 * que pase al ejecutarla. Dos con el mismo `id` no son dos alternativas, son una
 * ambigüedad, y cualquier forma de resolverla —quedarse con una, renombrar,
 * desempatar por el orden de llegada— sería decidir por quien pidió. Se dice y
 * no se decide.
 *
 * Mira TODAS, antes del tope de candidatos: un duplicado más allá del tope se
 * vería o no según el orden de llegada. Y lo que dice no depende de ese orden:
 * los ids repetidos van ordenados, y como mucho cinco.
 */
export const problemasDeIdentidad = (options: readonly unknown[]): readonly string[] => {
  let sinIdentidad = 0;
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const o of options) {
    const id = typeof o === 'object' && o !== null ? (o as { id?: unknown }).id : undefined;
    if (typeof id !== 'string' || !id) { sinIdentidad++; continue; }
    if (vistos.has(id)) repetidos.add(id); else vistos.add(id);
  }
  const malos: string[] = [];
  if (sinIdentidad) malos.push(`options: ${sinIdentidad} alternativa(s) sin identidad`);
  if (repetidos.size) {
    const lista = [...repetidos].sort();
    malos.push(`options: ids repetidos ${lista.slice(0, 5).map((id) => `«${id}»`).join(', ')}`
      + (lista.length > 5 ? ` y ${lista.length - 5} más` : ''));
  }
  return malos;
};

/**
 * ¿Se puede trabajar con este contexto?
 *
 * Devuelve todos los problemas, como el resto del Core. Un contexto sin
 * objetivo o sin traza no es un caso límite que haya que sortear: es una
 * petición que no se puede atender ni auditar después. Tampoco uno con
 * alternativas sin identidad (`problemasDeIdentidad`).
 */
export const problemasDelContexto = (ctx: DecisionContext<unknown> | undefined): readonly string[] => {
  const malos: string[] = [];
  if (!ctx || typeof ctx !== 'object') return ['context'];
  if (!ctx.objective || typeof ctx.objective !== 'object') malos.push('objective');
  if (!ctx.trace || typeof ctx.trace.traceId !== 'string' || typeof ctx.trace.requestId !== 'string') malos.push('trace');
  if (ctx.options !== undefined && !Array.isArray(ctx.options)) malos.push('options');
  else if (Array.isArray(ctx.options)) malos.push(...problemasDeIdentidad(ctx.options));
  if (ctx.signals !== undefined && !Array.isArray(ctx.signals)) malos.push('signals');
  if (ctx.replanCount !== undefined && (!Number.isInteger(ctx.replanCount) || ctx.replanCount < 0)) malos.push('replanCount');
  return malos;
};

/**
 * EL OBJETIVO QUE SE PUEDE DEVOLVER cuando la petición nombraba una
 * implementación: su nombre y sus pesos sobre ejes conocidos, nada más. Ni sus
 * restricciones ni ninguna clave de más, que es por donde venía lo que no cabe.
 */
export const objetivoSinImplementacion = (o: Objective | undefined): Objective => {
  const pesos: Partial<Record<ObjectiveAxis, number>> = {};
  for (const eje of EJES) {
    const v = o?.weights?.[eje];
    if (typeof v === 'number' && Number.isFinite(v)) pesos[eje] = v;
  }
  return Object.freeze({
    ...(typeof o?.label === 'string' ? { label: o.label } : {}),
    weights: Object.freeze(pesos),
  });
};

/**
 * Las restricciones que de verdad rigen: las del contexto y las del objetivo, juntas.
 *
 * Presupone lados VÁLIDOS (S2-B · B.1): A1 y A9 validan cada uno con
 * `problemasDeLosLados` antes de llamarla, y un lado mal formado es un
 * `constraint_conflict` que no llega a fundirse. Aun así, lo que devuelve nunca
 * lleva un número que no sea finito (`ladoFundible`): antes `Math.max(0.5, NaN)`
 * daba `NaN` y un lado roto borraba el valor válido del otro. Con lados válidos
 * el resultado es exactamente el de siempre, y un lado solo se devuelve tal cual.
 */
export const restriccionesEfectivas = (ctx: DecisionContext<unknown>): AlgorithmConstraints | undefined => {
  const a = ladoFundible(ctx.objective?.constraints);
  const b = ladoFundible(ctx.constraints);
  if (!a) return b;
  if (!b) return a;
  /* Se combinan quedándose con lo MÁS ESTRECHO: una restricción no se relaja por venir dos veces. */
  const menor = (x?: number, y?: number) => (typeof x === 'number' ? (typeof y === 'number' ? Math.min(x, y) : x) : y);
  const mayor = (x?: number, y?: number) => (typeof x === 'number' ? (typeof y === 'number' ? Math.max(x, y) : x) : y);
  return {
    ...a, ...b,
    budget: a.budget || b.budget ? {
      ...a.budget, ...b.budget,
      maxUsd: menor(a.budget?.maxUsd, b.budget?.maxUsd),
      maxCredits: menor(a.budget?.maxCredits, b.budget?.maxCredits),
    } : undefined,
    quality: a.quality || b.quality ? { ...a.quality, ...b.quality, minScore: mayor(a.quality?.minScore, b.quality?.minScore) } : undefined,
    maxLatencyMs: menor(a.maxLatencyMs, b.maxLatencyMs),
    maxSteps: menor(a.maxSteps, b.maxSteps),
    maxParallel: menor(a.maxParallel, b.maxParallel),
    maxRisk: menor(a.maxRisk, b.maxRisk),
    minConfidence: mayor(a.minConfidence, b.minConfidence),
    deadlineAt: menor(a.deadlineAt, b.deadlineAt),
    forbiddenCapabilities: Object.freeze([...(a.forbiddenCapabilities ?? []), ...(b.forbiddenCapabilities ?? [])]),
    requiredCapabilities: Object.freeze([...(a.requiredCapabilities ?? []), ...(b.requiredCapabilities ?? [])]),
  };
};

/* ── 2 · Restricciones duras, antes de puntuar ────────────────────────────── */

/** El veredicto de una opción antes de competir. */
export interface Veredicto {
  id: string;
  eligible: boolean;
  /** `selected` no se pone aquí: aquí solo se dice por qué NO, o `eligible`. */
  reason: string;
  /** La restricción no se pudo comprobar porque faltaba el dato. */
  unverifiable?: boolean;
}

const riesgoDe = (v: AxisValues): number | undefined =>
  typeof v.reliability === 'number' ? 1 - v.reliability : undefined;

/**
 * LO QUE NO CUMPLE, FUERA. Antes de puntuar y sin excepciones.
 *
 * `maxCredits` no se comprueba aquí y no es un olvido: los Credits los calcula
 * el Financial Core con el coste real y su margen, y estimarlos en esta capa
 * sería inventar un precio — lo que Weë tiene prohibido. Se avisa y no se
 * descarta a nadie por ello.
 */
export const filtrarPorRestricciones = <T>(
  opciones: readonly Alternative<T>[],
  constraints: AlgorithmConstraints | undefined,
  opts: Required<Pick<OpcionesDelMotor, 'datoAusente' | 'estrategiaDe'>> & { ahora?: () => number },
): readonly Veredicto[] =>
  opciones.map((o) => {
    const v = o.values ?? {};
    const fuera = (reason: string, unverifiable = false): Veredicto => ({ id: o.id, eligible: false, reason, unverifiable });

    /*
     * La frontera primero: una opción que nombra una implementación no compite,
     * valga lo que valga.
     *
     * Y se comprueba en TODAS, no solo en las que se reconocen como estrategia.
     * Reconocer primero y vigilar después dejaría una puerta abierta del tamaño
     * de «no parezcas una estrategia»: bastaría con omitir un campo para que
     * nadie mirase dentro.
     */
    const estrategia = opts.estrategiaDe(o.value);
    const violaciones = estrategia
      ? violacionesDeEstrategia(estrategia)
      : violacionesEn(o.value, `option:${o.id}`);
    if (violaciones.length) return fuera(`authority:${violaciones[0].clave}`);
    if (estrategia) {
      const incoherencias = problemasDeEstrategia(estrategia);
      if (incoherencias.length) return fuera(`incoherent:${incoherencias[0]}`);
    }
    if (!constraints) return { id: o.id, eligible: true, reason: 'eligible' };

    /* Un número declarado que no se puede comprobar: se decide por política, no por casualidad. */
    const limite = (
      campo: string,
      valor: number | undefined,
      tope: number | undefined,
      cumple: (x: number, t: number) => boolean,
    ): Veredicto | undefined => {
      if (typeof tope !== 'number') return undefined;
      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        return opts.datoAusente === 'reject' ? fuera(`unverifiable:${campo}`, true) : undefined;
      }
      return cumple(valor, tope) ? undefined : fuera(`constraint:${campo}`);
    };

    const cabe = (x: number, t: number) => x <= t;
    const alcanza = (x: number, t: number) => x >= t;
    const fallo =
      limite('budget.maxUsd', v.cost, constraints.budget?.maxUsd, cabe) ??
      limite('maxLatencyMs', v.latency, constraints.maxLatencyMs, cabe) ??
      limite('quality.minScore', v.quality, constraints.quality?.minScore, alcanza) ??
      limite('maxRisk', riesgoDe(v), constraints.maxRisk, cabe);
    if (fallo) return fallo;

    /* El plazo necesita saber qué hora es. Sin reloj no se comprueba y se dice. */
    if (typeof constraints.deadlineAt === 'number') {
      if (!opts.ahora) { if (opts.datoAusente === 'reject') return fuera('unverifiable:deadlineAt', true); }
      else if (typeof v.latency === 'number' && opts.ahora() + v.latency > constraints.deadlineAt) return fuera('constraint:deadlineAt');
    }

    /* Y lo que solo se puede exigir a una estrategia, porque solo ella tiene pasos. */
    if (estrategia) {
      if (typeof constraints.maxSteps === 'number' && estrategia.steps.length > constraints.maxSteps) return fuera('constraint:maxSteps');
      if (typeof constraints.maxParallel === 'number') {
        const mayor = Math.max(0, ...(estrategia.parallelGroups ?? []).map((g) => g.steps.length));
        if (mayor > constraints.maxParallel) return fuera('constraint:maxParallel');
      }
      const capacidades = new Set(estrategia.steps.map((s) => String(s.capability)));
      for (const prohibida of constraints.forbiddenCapabilities ?? []) {
        if (capacidades.has(prohibida)) return fuera(`constraint:forbiddenCapabilities:${prohibida}`);
      }
      for (const requerida of constraints.requiredCapabilities ?? []) {
        if (!capacidades.has(requerida)) return fuera(`constraint:requiredCapabilities:${requerida}`);
      }
    }
    return { id: o.id, eligible: true, reason: 'eligible' };
  });

/* ── 3 · Evidencia ────────────────────────────────────────────────────────── */

/**
 * QUÉ SOSTIENE LO QUE ESTA OPCIÓN DICE DE SÍ MISMA.
 *
 * Dos fuentes, y ninguna se inventa:
 *
 *   · las señales cuyo `subject` es esta opción — hechos medidos sobre ella;
 *   · si es una estrategia, la base de su propia previsión, que ya viene con
 *     la evidencia que la sostiene porque `StrategyExpectation` la exige.
 *
 * Lo que NO cuenta como evidencia son los números declarados de la opción. Que
 * alguien escriba `quality: 0.9` no es una medición, y tratarlo como tal es
 * exactamente cómo un dato sin origen acaba pareciendo un hecho.
 */
export const evidenciaDeOpcion = <T>(
  opcion: Alternative<T>,
  senales: readonly Signal[],
  estrategiaDe: (v: unknown) => Strategy | undefined,
): readonly Evidence[] => {
  const propias = (senales ?? [])
    .filter((s) => s.subject === opcion.id)
    .map<Evidence>((s) => ({ claim: `${opcion.id}:${s.key}`, signal: s, supports: true }));
  const estrategia = estrategiaDe(opcion.value);
  const suyas = estrategia?.expected?.confidence?.basis ?? [];
  return Object.freeze([...suyas, ...propias]);
};

/* ── 3b · Cuánta evidencia cabe (S2-B · B.4) ──────────────────────────────── */

/**
 * LO QUE TRAEN LAS SEÑALES, SIN RESOLVER NADA TODAVÍA (S2-B · B.4).
 *
 * Una pasada lineal y barata sobre TODAS: cuáles son válidas, qué claves traen,
 * qué grupos (clave, sujeto) forman y si en alguno se contradicen. Lo caro —el
 * desempate de B.3, con sus formas canónicas— se deja para las piezas que de
 * verdad se van a usar.
 *
 * El desacuerdo se mira con el mismo predicado que `resolverSenales`: un grupo
 * lo tiene si alguna señal dice otra cosa que la primera. Es lo mismo que «otra
 * cosa que la elegida», sea cual sea la elegida, y así el aviso `signal_conflict`
 * sigue saliendo por las mismas señales que antes, también por las que no son
 * evidencia de nadie.
 */
export interface InventarioDeSenales {
  /** Por sujeto (`''` sin sujeto, como agrupa `resolverSenales`) y por clave: las válidas, en su orden de llegada. */
  porSujeto: ReadonlyMap<string, ReadonlyMap<string, readonly Signal[]>>;
  /** Las claves de todas las válidas, ordenadas: lo que se miró (`signalKeys`). */
  claves: readonly string[];
  /** ¿Algún grupo, de cualquier sujeto, con valores distintos? */
  hayConflicto: boolean;
}

export const inventarioDeSenales = (senales: readonly unknown[] | undefined): InventarioDeSenales => {
  const porSujeto = new Map<string, Map<string, Signal[]>>();
  const claves = new Set<string>();
  let hayConflicto = false;
  for (const s of senales ?? []) {
    if (!senalValida(s)) continue;
    claves.add(s.key);
    const sujeto = s.subject ?? '';
    let porClave = porSujeto.get(sujeto);
    if (!porClave) { porClave = new Map(); porSujeto.set(sujeto, porClave); }
    const grupo = porClave.get(s.key);
    if (!grupo) porClave.set(s.key, [s]);
    else { if (s.value !== grupo[0].value) hayConflicto = true; grupo.push(s); }
  }
  return { porSujeto, claves: Object.freeze([...claves].sort()), hayConflicto };
};

/**
 * EN QUÉ ORDEN SE TOMAN LAS PIEZAS DE EVIDENCIA (S2-B · B.4).
 *
 * Una pieza es un grupo (clave, sujeto) cuyo sujeto es una alternativa que se
 * evalúa: lo que `evidenciaDeOpcion` convierte en su evidencia. Las de sujetos
 * que no se evalúan —ni `subject`, un paso, una alternativa que no compite— no
 * son evidencia de nadie y no entran aquí: no gastan el presupuesto.
 *
 * Por TURNOS entre las alternativas, en el orden en que llegan —el de su `id`—:
 * la primera clave de cada una, luego la segunda… y dentro de cada una por
 * clave. No «todo lo de la primera»: la evidencia es su confianza, y dársela
 * entera a unas y nada a otras las desempataría por su nombre. No es una
 * puntuación: es el orden en que se toma lo que cabe, y no depende del orden de
 * llegada de nada.
 */
export const piezasPorTurnos = (
  inventario: InventarioDeSenales,
  sujetos: readonly string[],
): readonly (readonly Signal[])[] => {
  const colas = sujetos.map((id) => {
    const porClave = inventario.porSujeto.get(id);
    return porClave ? [...porClave.keys()].sort().map((k) => porClave.get(k) as readonly Signal[]) : [];
  });
  const salida: (readonly Signal[])[] = [];
  for (let turno = 0; ; turno++) {
    let alguna = false;
    for (const cola of colas) if (turno < cola.length) { salida.push(cola[turno]); alguna = true; }
    if (!alguna) break;
  }
  return salida;
};

/* ── 4 · Confianza ────────────────────────────────────────────────────────── */

/**
 * CUÁNTO SE CREE ESTA PUNTUACIÓN. Que no es lo mismo que cuánto puntúa.
 *
 * Dos cosas la bajan, y son independientes:
 *
 *   · la EVIDENCIA. Sin nada que la sostenga, cero. No 0,5: cero.
 *   · la COBERTURA. Un total sacado de la mitad de los ejes con peso dice la
 *     mitad, por muy alto que salga.
 *
 * Se multiplican porque las dos tienen que darse: evidencia sólida sobre un eje
 * irrelevante no respalda el total, y medir todos los ejes sin decir de dónde
 * salen los números tampoco. El resultado es explicable y esa es la condición
 * que este archivo no negocia.
 */
export const confianzaDeOpcion = (score: StrategyScore | undefined, evidencia: readonly Evidence[]): Confidence => {
  const base = confianzaDeEvidencia(evidencia);
  const cobertura = typeof score?.coverage === 'number' ? Math.max(0, Math.min(1, score.coverage)) : 0;
  const valor = Math.max(0, Math.min(1, base.value * cobertura));
  const faltan = score?.missing ?? [];
  return {
    kind: 'algorithm',
    value: valor,
    basis: base.basis,
    because: `${base.because} · cobertura ${cobertura.toFixed(2)}${faltan.length ? ` · sin medir: ${faltan.join(', ')}` : ''}`,
  };
};

/* ── 5 · Selección ────────────────────────────────────────────────────────── */

/** Una opción ya evaluada del todo: lo que el desempate compara. */
export interface Juzgada {
  id: string;
  values: AxisValues;
  score?: StrategyScore;
  confidence?: Confidence;
}

/** Ordena aplicando la política, comparador a comparador, hasta que uno decida. */
export const ordenarPorPolitica = <J extends Juzgada>(
  juzgadas: readonly J[],
  comparadores: readonly Comparador[] = COMPARADORES,
): readonly J[] =>
  [...juzgadas].sort((a, b) => {
    for (const c of comparadores) {
      const r = c.comparar(a, b);
      /*
       * Un comparador que devuelve NaN no desempata: lo que hace es CORTAR la
       * cadena, porque `NaN !== 0`. La política se puede sustituir desde fuera,
       * así que aquí se ignora lo que no sea un número y se sigue bajando —
       * hasta el `id`, que siempre decide.
       */
      if (Number.isFinite(r) && r !== 0) return r;
    }
    return 0;
  });

/** Qué comparador desempató a estas dos. Para poder contarlo en la explicación. */
export const quienDesempato = (
  a: Juzgada,
  b: Juzgada,
  comparadores: readonly Comparador[] = COMPARADORES,
): string | undefined => comparadores.find((c) => c.comparar(a, b) !== 0)?.nombre;

/* ── 5b · Historial ───────────────────────────────────────────────────────── */

/**
 * ¿SE PUEDE LEER ESTA VENTANA? `undefined` si sí; el motivo si no.
 *
 * Forma y coherencia —una muestra entera y positiva, unos éxitos que caben en
 * ella—; la frontera de siempre: una ventana que nombra una implementación no
 * se lee, porque por ahí un historial se convertiría en una preferencia de
 * proveedor, que es del Router; y una MUESTRA de verdad. Por debajo del suelo
 * de A7 (`POLITICA_MINIMA.minSampleSize`) no hay muestra sino anécdota —un 1 de
 * 1 no es una probabilidad de éxito de 1—, y ese suelo no se inventa aquí: es
 * el que ninguna política de aprendizaje puede aflojar y el que A8 exige a todo
 * lo que admite. Sin muestra suficiente, A1 decide como sin historial.
 */
export const problemaDeHistorial = (h: unknown): string | undefined => {
  if (typeof h !== 'object' || h === null || Array.isArray(h)) return 'no es una ventana';
  const w = h as Partial<HistoryWindow>;
  if (typeof w.sampleSize !== 'number' || !Number.isInteger(w.sampleSize) || w.sampleSize <= 0) return 'sin muestra';
  if (typeof w.succeeded !== 'number' || !Number.isInteger(w.succeeded) || w.succeeded < 0 || w.succeeded > w.sampleSize) {
    return 'unos éxitos que no caben en la muestra';
  }
  for (const k of ['medianLatencyMs', 'medianCostUsd', 'since'] as const) {
    const v = w[k];
    if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return `${k} imposible`;
  }
  const cruces = violacionesEn(h, 'history');
  if (cruces.length) return `nombra una implementación (${cruces[0].clave})`;
  if (w.sampleSize < POLITICA_MINIMA.minSampleSize) {
    return `muestra de ${w.sampleSize}, por debajo de ${POLITICA_MINIMA.minSampleSize}: no es una muestra`;
  }
  return undefined;
};

/**
 * LA EVIDENCIA QUE APORTA EL HISTORIAL DE UNA ALTERNATIVA: su tasa de éxito
 * medida, con su muestra. `derived` porque es un cálculo sobre resultados
 * medidos, como todo lo que sale de A7. Ni medianas ni un número nuevo: la
 * ventana dice cuántas veces se hizo y cuántas salió bien, y eso es todo.
 */
export const evidenciaDeHistorial = (id: string, h: HistoryWindow): Evidence => Object.freeze({
  claim: `${id}:history.successRate`,
  supports: true,
  signal: Object.freeze({
    key: 'history.successRate', subject: id, value: h.succeeded / h.sampleSize,
    source: 'derived' as const, sampleSize: h.sampleSize,
  }),
});

/** Lo que el historial por alternativa hizo, alternativa a alternativa. */
export interface UsoDeHistorial {
  /** Las que lo usaron: su probabilidad de éxito salió de su historial. */
  usadas: readonly string[];
  /** Las que tenían historial y no lo usaron, con el porqué. */
  sinUsar: readonly { id: string; because: string }[];
  /** Los valores con los que puntúan las que lo usaron. */
  valores: ReadonlyMap<string, AxisValues>;
  evidencia: ReadonlyMap<string, Evidence>;
}

/**
 * EL HISTORIAL DE CADA ALTERNATIVA, aplicado con sus cinco reglas.
 *
 * Solo a las que YA compiten —pasaron las restricciones duras y la confianza
 * mínima sin él—; solo si el objetivo pondera `successProbability`; solo donde
 * la alternativa no trae ese valor; y con ventanas que se pueden leer. Recorre
 * las alternativas, no las claves que lleguen: el coste está acotado por el
 * número de candidatos, venga lo que venga en el mapa.
 */
export const usoDeHistorial = <T>(
  historial: DecisionContext<T>['historyByOption'],
  compiten: readonly Alternative<T>[],
  objective: Objective,
): UsoDeHistorial => {
  const usadas: string[] = [];
  const sinUsar: { id: string; because: string }[] = [];
  const valores = new Map<string, AxisValues>();
  const evidencia = new Map<string, Evidence>();
  const mapa = typeof historial === 'object' && historial !== null ? historial : undefined;
  const pondera = (pesosNormalizados(objective).successProbability ?? 0) > 0;
  for (const o of [...compiten].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (!mapa || !Object.prototype.hasOwnProperty.call(mapa, o.id)) continue;
    const h = mapa[o.id];
    const problema = problemaDeHistorial(h);
    if (problema) { sinUsar.push({ id: o.id, because: `su historial no se puede leer: ${problema}` }); continue; }
    if (!pondera) { sinUsar.push({ id: o.id, because: 'el objetivo no pondera la probabilidad de éxito' }); continue; }
    const suya = o.values?.successProbability;
    if (typeof suya === 'number' && Number.isFinite(suya)) {
      sinUsar.push({ id: o.id, because: 'trae su propia probabilidad de éxito, y el historial no la pisa' });
      continue;
    }
    const w = h as HistoryWindow;
    valores.set(o.id, Object.freeze({ ...(o.values ?? {}), successProbability: w.succeeded / w.sampleSize }));
    evidencia.set(o.id, evidenciaDeHistorial(o.id, w));
    usadas.push(o.id);
  }
  return { usadas: Object.freeze(usadas), sinUsar: Object.freeze(sinUsar), valores, evidencia };
};

/**
 * LO QUE EL HISTORIAL HIZO, en frases. Deterministas, y sacadas de lo que pasó.
 *
 * El del ámbito se declara siempre que llega, porque decir «lo leí y no cambia
 * el orden» es la diferencia entre no usarlo y no leerlo. Y lo que no compitió
 * se nombra: tenía historial y el historial no la rescató.
 */
export const explicarHistorial = (
  delAmbito: { ventana: HistoryWindow } | { problema: string } | undefined,
  uso: UsoDeHistorial,
  noCompiten: readonly string[],
): readonly string[] => {
  const frases: string[] = [];
  if (delAmbito && 'ventana' in delAmbito) {
    frases.push(`Historial del ámbito de la decisión: ${delAmbito.ventana.sampleSize} ejecución(es), `
      + `${delAmbito.ventana.succeeded} bien. Es de todas las alternativas a la vez, así que pesa igual sobre cada una `
      + 'y no cambia el orden.');
  } else if (delAmbito) {
    frases.push(`Llegó un historial del ámbito que no se puede leer (${delAmbito.problema}): no se tuvo en cuenta.`);
  }
  if (uso.usadas.length) {
    frases.push(`Historial propio usado como probabilidad de éxito: ${uso.usadas.map((id) => `«${id}»`).join(', ')}.`);
  }
  for (const s of uso.sinUsar) frases.push(`Historial de «${s.id}» sin usar: ${s.because}.`);
  if (noCompiten.length) {
    frases.push(`${noCompiten.length} alternativa(s) con historial no competían: el historial no rescata a nadie.`);
  }
  return Object.freeze(frases);
};

/* ── 6 · Explicación ──────────────────────────────────────────────────────── */

/**
 * POR QUÉ ESTA, en frases que se leen.
 *
 * Determinista y sacada de lo que de verdad pasó en la tubería. Nunca de un
 * modelo: una explicación generada es una explicación que puede no coincidir
 * con la decisión, y entonces es peor que no tenerla.
 */
export const explicar = (
  elegida: Juzgada,
  segunda: Juzgada | undefined,
  rechazadas: readonly Veredicto[],
  objective: Objective,
  constraints: AlgorithmConstraints | undefined,
  frente: readonly string[],
  comparadores: readonly Comparador[] = COMPARADORES,
): readonly string[] => {
  const frases: string[] = [];
  const pesos = pesosNormalizados(objective);
  const ejes = (Object.keys(pesos) as ObjectiveAxis[]).filter((e) => pesos[e] > 0);
  frases.push(`Se eligió «${elegida.id}» con ${(elegida.score?.total ?? 0).toFixed(3)} sobre ${ejes.join(', ')}.`);

  if (constraints) {
    const duras = rechazadas.filter((r) => r.reason.startsWith('constraint:'));
    frases.push(duras.length
      ? `Cumple las restricciones; ${duras.length} opción(es) quedaron fuera por no cumplirlas.`
      : 'Cumple las restricciones, y ninguna quedó fuera por ellas.');
  }
  /*
   * EL DESGLOSE, QUE CUADRA CON EL TOTAL (S2-B · B.2).
   *
   * Un eje con peso que no se pudo medir sale «sin medir», sin número: el `fit`
   * que guarda la puntuación es un 0 de relleno —`puntuar` lo nombra en
   * `missing`—, y escrito como «0.00×0.50» junto a un total que no lo contó, el
   * desglose no sumaba y parecía que lo ausente había puntuado 0. Un eje medido
   * sale con su número aunque valga 0: un 0 medido es un dato. Un eje sin peso no
   * sale. Y cuando falta algo se dice sobre qué se calculó el total: la suma de
   * lo medido entre el peso medido, con la cobertura. El total no cambia.
   */
  const score = elegida.score;
  if (score) {
    const faltan = new Set(score.missing);
    frases.push(`Desglose: ${ejes.map((e) => (faltan.has(e)
      ? `${e} sin medir`
      : `${e} ${score.fits[e].toFixed(2)}×${pesos[e].toFixed(2)}`)).join(' · ')}.`);
    const medidos = ejes.filter((e) => !faltan.has(e));
    if (medidos.length < ejes.length) {
      const pesoMedido = medidos.reduce((s, e) => s + pesos[e], 0);
      const aporta = medidos.reduce((s, e) => s + score.fits[e] * pesos[e], 0);
      frases.push(pesoMedido > 0
        ? `Total renormalizado sobre lo medido: ${aporta.toFixed(3)} ÷ ${pesoMedido.toFixed(2)} = ${score.total.toFixed(3)}; cobertura ${score.coverage.toFixed(2)}.`
        : 'Ningún eje con peso se pudo medir: el total vale 0 por convención, y la cobertura es 0.');
    }
  }

  if (segunda) {
    const quien = quienDesempato(elegida, segunda, comparadores);
    frases.push(`Por delante de «${segunda.id}» (${(segunda.score?.total ?? 0).toFixed(3)}) por ${quien ?? 'empate total'}.`);
  }
  if (frente.length > 1) frases.push(`No hay una ganadora objetiva: ${frente.join(', ')} están en el frente de Pareto.`);

  const c = elegida.confidence;
  frases.push(c && c.value > 0
    ? `Confianza ${c.value.toFixed(2)} — ${c.because}.`
    : 'Confianza 0: no hay evidencia que respalde estos números, así que la elección es la mejor de lo declarado, no un hecho medido.');
  const faltan = elegida.score?.missing ?? [];
  if (faltan.length) frases.push(`Sin medir: ${faltan.join(', ')}. Lo que falta NO se contó como malo.`);
  const incomprobables = rechazadas.filter((r) => r.unverifiable);
  if (incomprobables.length) frases.push(`${incomprobables.length} opción(es) fuera por no poder comprobar una restricción.`);
  return Object.freeze(frases);
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

/**
 * El motor, montado sobre una política.
 *
 * Devuelve una función pura: mismo contexto, misma decisión, siempre. No mira
 * el reloj salvo que se le dé uno, no usa azar y no guarda nada entre llamadas.
 */
export const crearMotorDeDecision = <T = unknown>(opciones: OpcionesDelMotor = {}) => {
  const politica = {
    datoAusente: opciones.datoAusente ?? ('reject' as PoliticaDeDatoAusente),
    estrategiaDe: opciones.estrategiaDe ?? estrategiaPorDefecto,
    ahora: opciones.ahora,
  };
  const comparadores = opciones.comparadores ?? COMPARADORES;

  const decidir = (ctx: DecisionContext<T>): AlgorithmDecision<T> => {
    const topes = presupuestoEfectivo(ctx?.budget, DESCRIPTOR_DEL_MOTOR.budget as AlgorithmBudgetLimits | undefined);
    const contador = crearContador(topes, politica.ahora);
    contador.gastar('algorithmCalls');
    const avisos = new Set<DecisionWarning>();

    /* 1 · Validación. Un contexto que no se puede leer no se sortea: se dice. */
    const malos = problemasDelContexto(ctx);
    if (malos.length) {
      return {
        ...sinDecision<T>(DECISION_ENGINE_REF, {
          objective: ctx?.objective ?? { weights: {} },
          trace: ctx?.trace ?? { traceId: '', requestId: '', userId: '' },
        }, 'algorithm_failure', contador.gasto()),
        explanation: Object.freeze([`El contexto no se puede leer: ${malos.join(', ')}.`]),
      };
    }

    const objective = ctx.objective;

    /*
     * LA FRONTERA TAMBIÉN EN LO QUE SE PIDE (S2-A).
     *
     * El objetivo y las restricciones son parte de la DECISIÓN —con ellos se
     * decidió, y con ellos viaja lo que se exige a quien ejecuta—, así que
     * tampoco pueden nombrar una implementación: eso lo elige el Router. Hasta
     * S2-A se ignoraban al decidir y se devolvían TAL CUAL en `objective` y
     * `constraints`, que es justo por donde un requisito llega a la ejecución.
     * Ahora la petición se rechaza y lo que traía no se repite.
     *
     * Desde S2-B se mira sobre los DOS lados tal como llegan —cada uno desde su
     * raíz, con las mismas claves que su fusión— y no sobre la fusión: así nada
     * se funde antes de validarlo, y la frontera sigue yendo primero.
     */
    const cruces = [
      ...violacionesEn(objective, 'objective'),
      ...violacionesEn(objective?.constraints, 'constraints'),
      ...violacionesEn(ctx.constraints, 'constraints'),
    ];
    if (cruces.length) {
      const claves = [...new Set(cruces.map((c) => c.clave))].sort();
      return {
        ...sinDecision<T>(DECISION_ENGINE_REF, { objective: objetivoSinImplementacion(objective), trace: ctx.trace },
          'authority_violation', contador.gasto(), { warnings: ['authority_violation'] }),
        status: 'invalid',
        explanation: Object.freeze([
          `La petición nombra una implementación en sus requisitos (${claves.join(', ')}): eso lo elige el Router, y no se decide sobre ella.`,
        ]),
      };
    }

    /*
     * LOS DOS LADOS, BIEN FORMADOS, ANTES DE FUNDIRLOS (S2-B · B.1).
     *
     * La petición y su objetivo se validan cada uno por su cuenta, con la regla
     * de `motivoDeNumeroInvalido`. Un lado roto no se funde: antes `Math.max(0.5,
     * NaN)` daba `NaN` y un `minConfidence` válido desaparecía; un `maxRisk: NaN`
     * dejaba fuera a todas diciendo que no cumplían. Ahora es un conflicto que
     * nombra el lado, el campo y el motivo, y lo roto no se repite: el objetivo
     * se devuelve sin sus restricciones y no hay `constraints` efectivas.
     */
    const malFormadas = problemasDeLosLados(objective?.constraints, ctx.constraints);
    /*
     * Y los topes de pensar que S2-B · B.4 lee —`maxEvidence`, `maxDepth`—, con
     * la MISMA regla y el mismo veredicto: uno roto ya no se ignora para que rija
     * el defecto sin decirlo. Van detrás de las restricciones.
     */
    const presupuestoMalFormado = problemasDelPresupuesto(ctx.budget);
    if (malFormadas.length || presupuestoMalFormado.length) {
      return {
        ...sinDecision<T>(DECISION_ENGINE_REF, { objective: objetivoSinImplementacion(objective), trace: ctx.trace },
          'constraint_conflict', contador.gasto()),
        explanation: Object.freeze([
          `Restricciones mal formadas, que ni se funden ni se usan para decidir: ${[...malFormadas, ...presupuestoMalFormado].join('; ')}.`,
        ]),
      };
    }
    const constraints = restriccionesEfectivas(ctx);
    const base = { objective, trace: ctx.trace };
    const cerrar = (fallo: AlgorithmFailureReason, frases: readonly string[], extra: Partial<AlgorithmDecision<T>> = {}) => ({
      ...sinDecision<T>(DECISION_ENGINE_REF, base, fallo, contador.gasto(), { warnings: [...avisos] }),
      constraints, explanation: Object.freeze(frases), ...extra,
    });

    /* Unas restricciones que se contradicen no se «resuelven»: no se puede cumplirlas. */
    const conflictos = conflictosDeRestricciones(constraints);
    if (conflictos.length) return cerrar('constraint_conflict', [`Restricciones imposibles de cumplir: ${conflictos.join(', ')}.`]);

    /*
     * En orden de `id`, no de llegada. Todo lo que sigue conserva el orden que
     * recibe —el tope de candidatos, las restricciones, la confianza mínima, el
     * frente de Pareto—, así que barajar las mismas alternativas cambiaba cuáles
     * se miraban bajo un tope, en qué orden salían las descartadas y la frase del
     * frente. Mismo contexto, misma decisión: también con el array barajado.
     */
    const todas = [...(ctx.options ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (!todas.length) return cerrar('insufficient_evidence', ['No llegó ninguna alternativa que evaluar.']);

    /*
     * 2 · Señales: lo que traen, SIN resolverlas todavía (S2-B · B.4).
     *
     * Hasta S2-B se resolvían TODAS aquí y cada una gastaba evidencia, fuera de
     * quien fuera. Con más que `maxEvidence` el contador se agotaba antes de mirar
     * una sola alternativa, `cabe('candidates')` decía que no, y salía «Ninguna de
     * las 0 alternativas cumple las restricciones» —también con 65 señales sobre
     * algo que ni era una alternativa—. Aquí solo se hace el inventario, que es
     * lineal y barato; qué evidencia cabe se decide después, sobre las
     * alternativas que de verdad se evalúan, y solo eso se resuelve.
     */
    const inventario = inventarioDeSenales(ctx.signals);
    if (inventario.hayConflicto) avisos.add('signal_conflict');

    /* 3 · Restricciones duras, ANTES de puntuar, y acotado por presupuesto. */
    const consideradas: Alternative<T>[] = [];
    for (const o of todas) {
      /*
       * Se pregunta ANTES de gastar. Gastar y mirar el resultado contaría el
       * candidato que no llegó a evaluarse, y entonces `spend` diría que se
       * pensó más de lo que se pensó — justo el número con el que después se
       * mide si esta capa sale a cuenta.
       */
      if (!contador.cabe('candidates')) { avisos.add('candidates_capped'); avisos.add('budget_exhausted'); break; }
      contador.gastar('candidates');
      consideradas.push(o);
    }
    /*
     * LLEGARON ALTERNATIVAS Y EL PRESUPUESTO NO DEJÓ MIRAR NINGUNA (S2-B · B.4).
     *
     * No es «ninguna cumple las restricciones»: no se llegó a mirarlas. Es el
     * único caso en que el presupuesto no deja nada que devolver, y para eso
     * está `budget_exceeded` («Fallar solo es correcto cuando NO hay nada que
     * devolver», `budget.ts`). Con el presupuesto de evidencia ya no pasa —se
     * gasta después, sobre lo que se evalúa—; queda para los topes que sí
     * cortan antes: `maxCandidates` o `maxAlgorithmCalls` a 0, o el reloj.
     */
    if (!consideradas.length) {
      const agotado = contador.agotado();
      const tope = agotado ? topeDelContador(agotado) : 'maxCandidates';
      return cerrar('budget_exceeded', [`Llegaron ${todas.length} alternativa(s), pero el presupuesto de pensar se agotó `
        + `(${tope} ${topes[tope]}) antes de evaluar ninguna: no es que no las haya, es que no se llegó a mirarlas.`]);
    }
    const veredictos = filtrarPorRestricciones(consideradas, constraints, politica);
    const porId = new Map(veredictos.map((v) => [v.id, v]));
    const admitidas = consideradas.filter((o) => porId.get(o.id)?.eligible);
    const rechazadas = veredictos.filter((v) => !v.eligible);
    if (rechazadas.some((r) => r.unverifiable)) avisos.add('constraint_unverifiable');
    if (typeof constraints?.budget?.maxCredits === 'number') avisos.add('constraint_unverifiable');

    const juzgadasDe = (lista: readonly JudgedOption<T>[]): readonly JudgedOption<T>[] => Object.freeze(lista);
    const rechazadasComoCandidatas = (): JudgedOption<T>[] =>
      rechazadas.map((v) => ({
        id: v.id, value: (consideradas.find((o) => o.id === v.id) as Alternative<T>).value, eligible: false, reason: v.reason,
      }));

    if (!admitidas.length) {
      /*
       * La distinción importa: «ninguna cumple» y «no pude comprobarlo» llevan a
       * cosas distintas. La primera se arregla cambiando las restricciones; la
       * segunda, midiendo. Fundirlas en un fallo genérico pierde justo eso.
       */
      const todasIncomprobables = rechazadas.length > 0 && rechazadas.every((r) => r.unverifiable);
      return cerrar(
        todasIncomprobables ? 'insufficient_evidence' : 'no_valid_strategy',
        [todasIncomprobables
          ? `Ninguna de las ${rechazadas.length} alternativas trae los datos que las restricciones exigen comprobar.`
          : `Ninguna de las ${rechazadas.length} alternativas cumple las restricciones.`],
        { candidates: juzgadasDe(rechazadasComoCandidatas()) },
      );
    }

    /*
     * 3b · EL PRESUPUESTO DE EVIDENCIA, SOBRE LO QUE SE EVALÚA (S2-B · B.4).
     *
     * `maxEvidence` es cuántas piezas de evidencia usa la evaluación: una pieza,
     * un grupo (clave, sujeto) cuyo sujeto es una alternativa admitida. Las
     * demás señales no son evidencia de nadie y no gastan nada. Se pregunta ANTES
     * de gastar, como con las candidatas, y lo que no cabe no se resuelve ni se
     * mira: se decide con lo que cupo —lo mejor encontrado, la regla de
     * `budget.ts`— y se dice con lo que el contrato ya tiene: `budget_exhausted`,
     * `spend.evidence` (las usadas) y una frase. Todas las admitidas se siguen
     * evaluando: un presupuesto de evidencia nunca deja «0 alternativas».
     */
    const turnos = piezasPorTurnos(inventario, admitidas.map((o) => o.id));
    const crudas: Signal[] = [];
    let usadas = 0;
    for (const grupo of turnos) {
      if (!contador.cabe('evidence')) break;
      contador.gastar('evidence');
      usadas++;
      for (const s of grupo) crudas.push(s);
    }
    const fraseDeEvidencia: readonly string[] = usadas < turnos.length
      ? [`Evidencia acotada por el presupuesto: se usaron ${usadas} de ${turnos.length} pieza(s) sobre las ${admitidas.length} `
        + `alternativa(s) evaluadas (${usadas >= topes.maxEvidence ? `maxEvidence ${topes.maxEvidence}` : `se agotó ${contador.agotado() ?? 'el presupuesto'}`}), `
        + 'por turnos entre ellas en orden de id; el resto no se miró.']
      : [];
    if (fraseDeEvidencia.length) avisos.add('budget_exhausted');
    /* Una por clave y sujeto, con la procedencia mandando: B.3, sobre lo que cupo. */
    const { resueltas } = resolverSenales(crudas);

    /* 4 · Evidencia y 5 · puntuación, SIN historial: así se decide quién compite. */
    const evidenciaPorId = new Map<string, readonly Evidence[]>();
    for (const o of admitidas) evidenciaPorId.set(o.id, evidenciaDeOpcion(o, resueltas, politica.estrategiaDe));
    contador.gastar('iterations');
    const puntuadas = puntuar(admitidas, objective);
    contador.gastar('iterations');

    /* 6 · Confianza mínima, también SIN historial: el historial no resucita a nadie. */
    const compiten = new Set<string>();
    const porConfianza: Veredicto[] = [];
    for (const p of puntuadas) {
      const confidence = confianzaDeOpcion(p.score, evidenciaPorId.get(p.id) ?? []);
      if (typeof constraints?.minConfidence === 'number' && confidence.value < constraints.minConfidence) {
        porConfianza.push({ id: p.id, eligible: false, reason: 'constraint:minConfidence' });
        continue;
      }
      compiten.add(p.id);
    }

    /*
     * 6b · EL HISTORIAL, y solo entre las que ya compiten.
     *
     * El del ÁMBITO se lee y se declara, pero no ordena: es de todas a la vez.
     * El de CADA alternativa entra como su probabilidad de éxito medida, con las
     * reglas de `usoDeHistorial`, y se vuelve a puntuar el MISMO conjunto para
     * que la normalización de los demás ejes no cambie por el camino.
     */
    const problemaDelAmbito = ctx.history === undefined ? undefined : problemaDeHistorial(ctx.history);
    const delAmbito = ctx.history === undefined ? undefined
      : problemaDelAmbito ? { problema: problemaDelAmbito } : { ventana: ctx.history as HistoryWindow };
    const uso = usoDeHistorial(ctx.historyByOption, admitidas.filter((o) => compiten.has(o.id)), objective);
    const conHistorial = uso.usadas.length
      ? puntuar(admitidas.map((o) => (uso.valores.has(o.id) ? { ...o, values: uso.valores.get(o.id) as AxisValues } : o)), objective)
      : puntuadas;
    if (uso.usadas.length) contador.gastar('iterations');
    const evidenciaFinal = (id: string): readonly Evidence[] => {
      const suya = uso.evidencia.get(id);
      return suya ? Object.freeze([...(evidenciaPorId.get(id) ?? []), suya]) : (evidenciaPorId.get(id) ?? []);
    };
    const mapaHistorial = typeof ctx.historyByOption === 'object' && ctx.historyByOption !== null ? ctx.historyByOption : {};
    const noCompiten = [...rechazadas, ...porConfianza]
      .map((v) => v.id).filter((id) => Object.prototype.hasOwnProperty.call(mapaHistorial, id));

    const juzgadas: Juzgada[] = [];
    for (const p of conHistorial) {
      if (!compiten.has(p.id)) continue;
      juzgadas.push({ id: p.id, values: p.values ?? {}, score: p.score, confidence: confianzaDeOpcion(p.score, evidenciaFinal(p.id)) });
    }
    if (!juzgadas.length) {
      /* Sin ninguna que compita, lo que el historial NO hizo también se dice: no rescató a nadie. */
      return cerrar('insufficient_evidence',
        [`Las ${porConfianza.length} alternativas viables se quedan por debajo de la confianza mínima (${constraints?.minConfidence}).`,
          ...explicarHistorial(delAmbito, uso, noCompiten), ...fraseDeEvidencia],
        { candidates: juzgadasDe([...rechazadasComoCandidatas(), ...porConfianza.map((v) => ({
          id: v.id, value: (admitidas.find((o) => o.id === v.id) as Alternative<T>).value, eligible: false, reason: v.reason,
        }))]) });
    }

    /* 7 · Pareto: si hay varias que nadie domina, se dice en vez de fingir un ganador. */
    const frente = pareto(conHistorial.filter((p) => juzgadas.some((j) => j.id === p.id)), objective).map((p) => p.id);
    if (frente.length > 1) avisos.add('no_dominant_option');

    /* 8 · Selección, con la política determinista. */
    const ordenadas = ordenarPorPolitica(juzgadas, comparadores);
    const elegida = ordenadas[0];
    const porIdAdmitida = new Map(admitidas.map((o) => [o.id, o]));
    const valorDe = (id: string) => (porIdAdmitida.get(id) as Alternative<T>).value;

    if (elegida.confidence && elegida.confidence.value === 0) avisos.add('low_confidence');
    if (typeof constraints?.minConfidence === 'number' && (elegida.confidence?.value ?? 0) < constraints.minConfidence) {
      avisos.add('below_min_confidence');
    }
    if (DESCRIPTOR_DEL_MOTOR.status === 'experimental') avisos.add('experimental_algorithm');
    if (contador.agotado()) avisos.add('budget_exhausted');

    const evidenciaElegida = evidenciaFinal(elegida.id);
    const uncertainty: Uncertainty = incertidumbreDe(elegida.confidence);
    const candidatos: JudgedOption<T>[] = [
      ...ordenadas.map((j, i) => ({
        id: j.id, value: valorDe(j.id), eligible: true,
        reason: i === 0 ? 'selected' : 'lower_score', score: j.score,
      })),
      ...porConfianza.map((v) => ({ id: v.id, value: valorDe(v.id), eligible: false, reason: v.reason })),
      ...rechazadasComoCandidatas(),
    ];

    return {
      contract: ALGORITHM_CONTRACT_VERSION,
      status: 'decided',
      algorithm: DECISION_ENGINE_REF,
      selected: valorDe(elegida.id),
      selectedScore: elegida.score,
      alternatives: Object.freeze(ordenadas.slice(1).map((j) => valorDe(j.id))),
      candidates: juzgadasDe(candidatos),
      confidence: elegida.confidence as Confidence,
      uncertainty,
      evidence: evidenciaElegida,
      warnings: Object.freeze([...avisos]),
      objective,
      constraints,
      /* Lo que se MIRÓ, también el historial: es la prueba de que se leyó. */
      signalKeys: Object.freeze([...new Set([
        ...inventario.claves,
        ...(delAmbito && 'ventana' in delAmbito ? ['history.decision'] : []),
        ...(uso.usadas.length ? ['history.successRate'] : []),
      ])].sort()),
      explanation: Object.freeze([
        ...explicar(elegida, ordenadas[1], [...rechazadas, ...porConfianza], objective, constraints, frente, comparadores),
        ...explicarHistorial(delAmbito, uso, noCompiten),
        ...fraseDeEvidencia,
      ]),
      paretoFront: frente.length > 1 ? Object.freeze(frente) : undefined,
      spend: contador.gasto(),
      trace: ctx.trace,
    };
  };

  return { descriptor: DESCRIPTOR_DEL_MOTOR, decidir };
};

/** Lo que el motor ESPERA del elegido. Para comparar con la línea base; no es lo medido. */
export const resultadoEsperado = <T>(d: AlgorithmDecision<T>, valores?: AxisValues): {
  quality?: number; costUsd?: number; latencyMs?: number;
} => {
  const v = valores ?? {};
  return {
    quality: typeof v.quality === 'number' ? v.quality : undefined,
    costUsd: typeof v.cost === 'number' ? v.cost : undefined,
    latencyMs: typeof v.latency === 'number' ? v.latency : undefined,
  };
};

/** Los ejes de una alternativa cuyo valor es una estrategia. Atajo sobre lo de A0. */
export const valoresDeEstrategia = (s: Strategy): AxisValues => ejesDeEstrategia(s);

/** Un gasto vacío, para quien tenga que construir una decisión sin haber pensado. */
export const SIN_GASTO: Readonly<AlgorithmSpend> = GASTO_CERO;

/** El contador, expuesto para que una prueba pueda construir el mismo que usa el motor. */
export const contadorDelMotor = (limites?: AlgorithmBudgetLimits, ahora?: () => number): Contador =>
  crearContador(presupuestoEfectivo(limites, DESCRIPTOR_DEL_MOTOR.budget as AlgorithmBudgetLimits | undefined), ahora);
