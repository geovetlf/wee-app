/**
 * WEE ALGORITHM ENGINE — A2 · EL GRAFO DE UNA DESCOMPOSICIÓN.
 *
 * ── Qué es una descomposición aquí, y qué NO es ─────────────────────────────
 *
 * Es una FORMA de organizar un trabajo que ya se sabe qué exige: qué va antes,
 * qué va después y qué puede ir a la vez. Nada más.
 *
 * NO decide qué capacidades hacen falta. Eso es del Planner, y confundirlo es
 * el error que convierte esta capa en un segundo planificador. Por eso una
 * subtarea es un `PlanStep` del Core, importado tal cual: si a A2 le hiciera
 * falta un campo que un paso no tiene, sería señal de que ese campo pertenece
 * al Planner.
 *
 * ── Por qué el grafo vive en su propio archivo ──────────────────────────────
 *
 * Porque validar un DAG es una pregunta cerrada —¿hay ciclos? ¿apunta alguien a
 * algo que no existe? ¿cuántos niveles hay?— y tiene respuesta sin saber nada de
 * objetivos, presupuestos ni decisiones. Separarlo permite probarlo con una
 * tabla de casos y reutilizarlo desde donde haga falta.
 *
 * `nivelesDeDependencia` NO se reescribe aquí: ya existe en `strategy.ts` y se
 * importa. Lo que sí faltaba —y por eso nace este archivo— es saber CUÁL es el
 * ciclo cuando lo hay. Los niveles te dicen quién no se pudo colocar; para
 * arreglarlo hace falta saber quién apunta a quién.
 */

import { PlanStep } from '../planner';
import { nivelesDeDependencia } from './strategy';

/* ── Lo que entra ─────────────────────────────────────────────────────────── */

/**
 * EL TRABAJO A ORGANIZAR.
 *
 * `steps` son `PlanStep`, sin envolver. `dependsOn` es lo declarado por quien
 * conoce el trabajo; A2 no lo deduce del catálogo —eso ya lo hace el Planner con
 * `ordenarPorDependencia`, que mira qué produce cada capacidad—, aquí se
 * RESPETA lo que viene y se comprueba que sea coherente.
 */
export interface TareaADescomponer {
  id: string;
  /** En una frase, para el informe. Nunca se usa para decidir. */
  goal?: string;
  steps: readonly PlanStep[];
}

/* ── Lo que puede estar mal ───────────────────────────────────────────────── */

/**
 * POR QUÉ UNA DESCOMPOSICIÓN NO VALE.
 *
 * Cerrado, y con la misma forma que el resto del Core (`MotivoDeSkillInvalido`,
 * `MotivoDeAlgoritmoInvalido`): un motivo por el que actuar sin leer castellano.
 * No es un sistema de errores nuevo — los fallos de la DECISIÓN siguen siendo
 * los `AlgorithmFailureReason` de A0, y estos son los de una opción concreta.
 */
export type MotivoDeDescomposicionInvalida =
  /* No hay nada que organizar. */
  | 'empty_decomposition'
  /* Dos subtareas con el mismo id: cualquier dependencia sería ambigua. */
  | 'duplicate_step'
  /* Una subtarea depende de sí misma. */
  | 'self_dependency'
  /* Depende de algo que no está en la tarea. */
  | 'invalid_dependency'
  /* La misma dependencia declarada dos veces. */
  | 'duplicate_dependency'
  /* A → B → … → A. */
  | 'decomposition_cycle'
  /* Nadie puede empezar: no hay ni una subtarea sin dependencias. */
  | 'invalid_root'
  /* Pide una capacidad que el catálogo no conoce. */
  | 'unknown_capability'
  /* La capacidad existe, pero hoy no la sirve nadie. */
  | 'missing_capability'
  /* Más niveles de los permitidos. */
  | 'max_depth_exceeded'
  /* Más subtareas de las permitidas. */
  | 'max_steps_exceeded'
  /* Pediría más cosas a la vez de las permitidas. */
  | 'max_parallel_exceeded';

export interface ProblemaDeDescomposicion {
  /** Qué subtarea, o `'*'` cuando el problema es de la tarea entera. */
  ref: string;
  reason: MotivoDeDescomposicionInvalida;
  /** Lo que hace falta para entenderlo: el ciclo, la dependencia que falta… */
  detail?: string;
}

const problema = (ref: string, reason: MotivoDeDescomposicionInvalida, detail?: string): ProblemaDeDescomposicion =>
  detail === undefined ? { ref, reason } : { ref, reason, detail };

/* ── Ciclos ───────────────────────────────────────────────────────────────── */

/**
 * QUIÉN FORMA EL CICLO, no solo que lo hay.
 *
 * `nivelesDeDependencia` ya detecta que algo no se puede colocar, y con eso
 * basta para no ejecutarlo. Pero para ARREGLARLO hace falta el nombre de los
 * implicados, y eso es lo que falta hoy en todo el Core.
 *
 * Es un recorrido en profundidad con pila de color, el clásico, y está ACOTADO:
 * lo que se inspecciona aquí puede haberlo construido un algoritmo —código que
 * todavía no existe—, así que un grafo patológico no puede convertir la
 * comprobación de seguridad en la caída que venía a evitar.
 *
 * Cada ciclo se devuelve en su ORDEN CANÓNICO —rotado para empezar por el id
 * menor— para que dos ejecuciones den exactamente la misma lista. Sin eso, el
 * mismo grafo describiría su ciclo de dos maneras según por dónde se empezara.
 */
export const detectarCiclos = (
  steps: readonly PlanStep[],
  maxPasos = 50_000,
): readonly (readonly string[])[] => {
  const existe = new Set(steps.map((s) => s.id));
  /* Se recorre en orden de id: el resultado no puede depender del orden del array. */
  const vecinos = new Map<string, string[]>();
  for (const s of steps) {
    const previos = vecinos.get(s.id) ?? [];
    vecinos.set(s.id, previos);
    /*
     * La autodependencia NO entra: ya tiene su propio motivo
     * (`self_dependency`), y contarla además como ciclo de uno es decir dos
     * veces lo mismo. Un problema que es consecuencia de otro no es un problema
     * más, es ruido — el mismo criterio que con la raíz.
     */
    for (const d of s.dependsOn ?? []) if (existe.has(d) && d !== s.id) previos.push(d);
  }
  for (const lista of vecinos.values()) lista.sort();

  const BLANCO = 0; const GRIS = 1; const NEGRO = 2;
  const color = new Map<string, number>([...existe].map((id) => [id, BLANCO]));
  const encontrados = new Map<string, readonly string[]>();
  let restantes = maxPasos;

  /* Iterativo y no recursivo: una cadena de diez mil pasos no puede reventar la pila. */
  for (const raiz of [...existe].sort()) {
    if (color.get(raiz) !== BLANCO) continue;
    const pila: { id: string; i: number }[] = [{ id: raiz, i: 0 }];
    color.set(raiz, GRIS);
    while (pila.length) {
      if (restantes-- <= 0) return Object.freeze([...encontrados.values()]);
      const cima = pila[pila.length - 1];
      const hijos = vecinos.get(cima.id) ?? [];
      if (cima.i >= hijos.length) { color.set(cima.id, NEGRO); pila.pop(); continue; }
      const hijo = hijos[cima.i++];
      const c = color.get(hijo);
      if (c === GRIS) {
        /* El ciclo es el tramo de la pila desde `hijo` hasta la cima. */
        const desde = pila.findIndex((x) => x.id === hijo);
        const ciclo = pila.slice(desde).map((x) => x.id);
        const menor = ciclo.indexOf([...ciclo].sort()[0]);
        const canonico = [...ciclo.slice(menor), ...ciclo.slice(0, menor)];
        encontrados.set(canonico.join('>'), Object.freeze(canonico));
      } else if (c === BLANCO) {
        color.set(hijo, GRIS);
        pila.push({ id: hijo, i: 0 });
      }
    }
  }
  return Object.freeze([...encontrados.keys()].sort().map((k) => encontrados.get(k) as readonly string[]));
};

/* ── Validación ───────────────────────────────────────────────────────────── */

/**
 * LO QUE HACE FALTA SABER DE FUERA PARA JUZGAR LAS CAPACIDADES.
 *
 * Los dos puertos toman un `string`, no la unión cerrada del catálogo de hoy, y
 * la diferencia no es cosmética: `CoreCapabilityId` son 38 identificadores
 * concretos, así que tipar aquí con esa unión significaría que una capacidad
 * que no existía cuando se escribió esto NI SIQUIERA COMPILA. Un motor de
 * inteligencia algorítmica no puede depender de conocer el catálogo.
 *
 * `CoreCapabilityId` es asignable a `string`, así que quien ya pasaba una
 * función tipada con la unión sigue funcionando igual.
 *
 * Y los dos son OPCIONALES, con el mismo criterio: sin puerto NO se afirma
 * nada. No saber si una capacidad existe no es lo mismo que saber que no
 * existe, y tratar lo primero como lo segundo es lo que impedía razonar sobre
 * cualquier capacidad futura.
 */
export interface PuertosDeCapacidad {
  /** ¿Existe? Sin puerto, no se afirma que no: se razona igual. */
  conocida?: (c: string) => boolean;
  /** ¿La sirve alguien HOY? Sin puerto, no se afirma que falte: no se sabe. */
  disponible?: (c: string) => boolean;
}

/**
 * EL DAG, REVISADO ENTERO.
 *
 * Devuelve TODOS los problemas y no el primero, como el resto del Core.
 *
 * Lo que NO comprueba: si la tarea tiene sentido, si el orden es el mejor, o si
 * cabe en un presupuesto. Lo primero es del Planner, lo segundo es lo que A2
 * propone de varias maneras, y lo tercero necesita estimar. Afirmar cualquiera
 * de las tres desde aquí sería inventar.
 */
export const validarDAG = (
  tarea: TareaADescomponer | undefined,
  puertos: PuertosDeCapacidad = {},
): readonly ProblemaDeDescomposicion[] => {
  const p: ProblemaDeDescomposicion[] = [];
  const steps = tarea?.steps;
  if (!Array.isArray(steps) || steps.length === 0) return [problema('*', 'empty_decomposition')];

  const vistos = new Set<string>();
  for (const s of steps) {
    if (!s || typeof s.id !== 'string' || !s.id) { p.push(problema('?', 'duplicate_step', 'id vacío')); continue; }
    if (vistos.has(s.id)) p.push(problema(s.id, 'duplicate_step'));
    vistos.add(s.id);
  }

  for (const s of steps) {
    const deps = s?.dependsOn ?? [];
    const contadas = new Set<string>();
    for (const d of deps) {
      if (d === s.id) { p.push(problema(s.id, 'self_dependency')); continue; }
      if (!vistos.has(d)) { p.push(problema(s.id, 'invalid_dependency', d)); continue; }
      if (contadas.has(d)) p.push(problema(s.id, 'duplicate_dependency', d));
      contadas.add(d);
    }
  }

  for (const ciclo of detectarCiclos(steps)) {
    p.push(problema(ciclo[0], 'decomposition_cycle', ciclo.join(' → ')));
  }

  /*
   * Sin raíz no hay por dónde empezar. Un grafo con ciclos tampoco la tiene, así
   * que solo se dice cuando no se ha dicho ya lo otro: un problema que es
   * consecuencia de otro no es un problema más, es ruido.
   */
  const conRaiz = steps.some((s) => !(s.dependsOn ?? []).some((d: string) => vistos.has(d)));
  if (!conRaiz && !p.some((x) => x.reason === 'decomposition_cycle')) p.push(problema('*', 'invalid_root'));

  /* Capacidades: se PREGUNTA, no se asume. Sin puerto de disponibilidad, no se afirma. */
  const conocida = puertos.conocida;
  for (const s of steps) {
    const c = s?.capability;
    if (!c) continue;
    if (conocida && !conocida(c)) { p.push(problema(s.id, 'unknown_capability', String(c))); continue; }
    if (puertos.disponible && !puertos.disponible(c)) p.push(problema(s.id, 'missing_capability', String(c)));
  }
  return Object.freeze(p);
};

export const dagValido = (t: TareaADescomponer, puertos?: PuertosDeCapacidad): boolean =>
  validarDAG(t, puertos).length === 0;

/* ── Medidas ──────────────────────────────────────────────────────────────── */

/**
 * LO QUE SE PUEDE MEDIR DE LA ESTRUCTURA, y solo eso.
 *
 * Ni coste, ni latencia, ni calidad. Esos números salen de medir ejecuciones
 * reales, y escribirlos aquí porque «hacen falta para comparar» es exactamente
 * cómo un dato inventado acaba decidiendo. Lo que A2 sabe de verdad es cuántos
 * pasos hay, cuántos niveles, cuántas dependencias y cuánto puede ir a la vez.
 */
export interface MedidasDeDescomposicion {
  /** Subtareas que forman parte de esta descomposición. Trabajo real, no candidatos. */
  steps: number;
  /** Niveles de dependencia: la longitud del camino crítico, en pasos. */
  depth: number;
  /** Cuántas cosas como mucho irían a la vez en ESTA disposición. */
  parallelism: number;
  /** Aristas del grafo. */
  dependencies: number;
  /** Aristas por nodo. Cuánto se ramifica. */
  branchingFactor: number;
  /**
   * Nodos + aristas: el tamaño del grafo, que es la medida estándar y no una
   * fórmula inventada para que salga bonito. Se usa como primer criterio del
   * orden canónico, nunca como una puntuación de calidad.
   */
  complexity: number;
}

/** Las medidas de una disposición concreta, dados sus grupos. */
export const medidasDe = (
  steps: readonly PlanStep[],
  grupos: readonly (readonly string[])[],
): MedidasDeDescomposicion => {
  const existe = new Set(steps.map((s) => s.id));
  const dependencies = steps.reduce((t, s) => t + (s.dependsOn ?? []).filter((d: string) => existe.has(d)).length, 0);
  const n = steps.length;
  return {
    steps: n,
    depth: grupos.length,
    parallelism: grupos.length ? Math.max(...grupos.map((g) => g.length)) : 0,
    dependencies,
    branchingFactor: n > 0 ? dependencies / n : 0,
    complexity: n + dependencies,
  };
};

/**
 * EL PARALELISMO QUE LAS DEPENDENCIAS PERMITEN, sin tocar ningún límite.
 *
 * Es el techo: lo máximo que se podría hacer a la vez si nadie lo acotara. Se
 * separa de `medidasDe` a propósito, porque una cosa es lo que una disposición
 * HACE y otra lo que el grafo PERMITE, y confundirlas es cómo se acaba creyendo
 * que un límite no se está aplicando.
 */
export const paralelismoPosible = (steps: readonly PlanStep[]): number => {
  const { niveles } = nivelesDeDependencia(steps);
  return niveles.length ? Math.max(...niveles.map((n) => n.length)) : 0;
};
