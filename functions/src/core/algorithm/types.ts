/**
 * WEE ALGORITHM ENGINE — EL VOCABULARIO.
 *
 * ── Qué es esta capa y, sobre todo, qué NO es ───────────────────────────────
 *
 * Weë ya sabe DECIDIR en un sitio: el Router elige proveedor y modelo, puntúa
 * siete ejes y explica por qué. Eso no se toca y no se copia. Lo que Weë no
 * sabe hacer es preguntarse **si hay otra forma de hacer el trabajo entero**.
 * Hoy el Planner produce UN plan, y ese plan es la única verdad: nadie compara
 * dos maneras de conseguir lo mismo, nadie mide si una sale más barata, nadie
 * se da cuenta de que tres pasos podrían ir a la vez.
 *
 * El Algorithm Engine es la capa que razona sobre ESTRATEGIAS. El Router razona
 * sobre IMPLEMENTACIONES. Tienen la misma forma matemática —candidatos, pesos,
 * puntuación, descartes explicados— y son objetos distintos, así que se
 * escriben dos veces a propósito y no se funden nunca.
 *
 *     Router:    ¿con QUÉ hago este paso?      → proveedor, modelo, adaptador
 *     Algorithm: ¿de qué FORMA hago el trabajo? → qué pasos, en qué orden,
 *                                                  cuáles a la vez, qué
 *                                                  verificar, qué hacer si falla
 *
 * ── La frontera que no se cruza ─────────────────────────────────────────────
 *
 * El Engine EVALÚA y RECOMIENDA. No ejecuta, no cobra, no crea materiales, no
 * elige proveedor y no se salta a nadie. Eso no es una promesa escrita en un
 * comentario: `authority.ts` lo convierte en una comprobación que usa el MISMO
 * predicado con el que el Planner rechaza que un plan nombre una implementación
 * (`claveDeImplementacion`). Si una estrategia intenta decir «usa ElevenLabs»,
 * se rechaza igual que se rechazó en B3.15.2.
 *
 * ── Por qué está en el Core ─────────────────────────────────────────────────
 *
 * Porque no tiene infraestructura: son tipos y funciones puras. No lee
 * Firestore, no llama a nadie, no guarda estado de módulo. Un algoritmo que
 * necesite hablar con el mundo lo hará por un puerto, desde fuera, igual que
 * hacen el Router y el Planner.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';

/** Un algoritmo, por su nombre. Minúsculas, guiones: `decomposicion-por-modalidad`. */
export type AlgorithmId = string;

/** `id@version`. Lo que se guarda cuando hay que poder reproducir una decisión. */
export const referenciaDeAlgoritmo = (id: AlgorithmId, version: number): string => `${id}@${version}`;

/**
 * LAS FAMILIAS.
 *
 * Cerrada a propósito: un registro tiene que poder responder «qué hay de esta
 * clase» sin recorrerlo entero, y una categoría libre convierte esa pregunta en
 * una búsqueda de texto. Crece añadiendo un nombre y subiendo el menor del
 * contrato, que es exactamente lo que el Core hace con todo lo demás.
 *
 * Los nombres son los de las fases A1–A7 para que no haya que traducir entre lo
 * que se planeó y lo que existe.
 */
export type AlgorithmCategory =
  /* A1 · Elegir entre alternativas dado un objetivo. */
  | 'decision'
  /* A2 · Partir un trabajo en piezas que alguien sepa ejecutar. */
  | 'decomposition'
  /* A3 · Proponer formas completas de hacer el trabajo. */
  | 'strategy'
  /* A4 · Encontrar qué puede ir a la vez sin romper dependencias. */
  | 'parallelization'
  /* A5 · Mejorar una estrategia sin cambiar lo que entrega. */
  | 'optimization'
  /* Producir SEÑALES que otras capas puedan consumir. Nunca decidir por ellas. */
  | 'routing-signals'
  /* A6 · Decir qué tiene que ser cierto para dar algo por bueno. */
  | 'verification'
  /* A6 · Proponer qué hacer cuando algo falló. */
  | 'recovery'
  /* Proponer una estrategia nueva cuando aparece evidencia que la anterior no tenía. */
  | 'replanning'
  /* A7 · Convertir lo que pasó en señales. */
  | 'feedback'
  /* A7 · Convertir señales acumuladas en mejores decisiones. */
  | 'learning'
  /* Ajustar a quien pide, dentro de lo medible y explicable. */
  | 'personalization'
  /* Encontrar candidatos que nadie pidió explícitamente. */
  | 'discovery'
  /* Decir cuánto se sabe, y cuánto no. */
  | 'confidence'
  /* El compromiso entre coste, calidad y latencia. */
  | 'cost-quality-latency'
  /* Comparar alternativas entre sí. */
  | 'alternative-evaluation';

export const CATEGORIAS: readonly AlgorithmCategory[] = Object.freeze([
  'decision', 'decomposition', 'strategy', 'parallelization', 'optimization',
  'routing-signals', 'verification', 'recovery', 'replanning', 'feedback',
  'learning', 'personalization', 'discovery', 'confidence',
  'cost-quality-latency', 'alternative-evaluation',
]);

/**
 * EN QUÉ ESTADO ESTÁ.
 *
 * Mismo vocabulario que los Skills, más `experimental`, que los Skills no
 * necesitaban y un algoritmo sí: se puede medir contra la línea base sin que
 * nadie lo elija solo. Es la diferencia entre «todavía no vale» y «vale, pero
 * queremos comprobar que mejora algo antes de dejarle decidir».
 */
export type AlgorithmStatus =
  /* Existe y se puede escribir contra él. No resuelve nada. */
  | 'draft'
  /* Corre, se mide, y NO se elige automáticamente. */
  | 'experimental'
  /* En uso. */
  | 'active'
  /* Se resuelve si te lo piden por versión exacta; ya no se elige solo. */
  | 'deprecated';

/**
 * PURO O CON EFECTOS. La distinción más importante de A0.
 *
 * Evaluar no es ejecutar. Un algoritmo puede comparar cuarenta estrategias sin
 * llamar a un proveedor ni una vez, y esa es justo la propiedad que hace que
 * valga la pena: pensar es barato, ejecutar no.
 *
 * `pure` significa literalmente que la misma entrada da la misma salida y que
 * no pasa nada más. `effectful` existe porque algún día un algoritmo necesitará
 * LEER algo —el histórico de una cuenta, la salud de un proveedor— y hay que
 * poder decirlo en voz alta. Ni siquiera entonces podrá escribir: lo que un
 * algoritmo nunca puede hacer está en `authority.ts` y no depende de esto.
 */
export type AlgorithmPurity = 'pure' | 'effectful';

/**
 * POR QUÉ NO HAY DECISIÓN.
 *
 * Cerrado, y ni uno de estos significa «me rindo». Cada uno lleva a una salida
 * distinta de quien llama, y por eso no se funden en un `failed` genérico: un
 * presupuesto agotado se reintenta con más, unas restricciones que se
 * contradicen hay que arreglarlas, y falta de evidencia significa que lo
 * honesto es no decidir.
 *
 * `insufficient_evidence` es el que de verdad importa. Un motor que siempre
 * contesta algo es un motor que inventa cuando no sabe, y eso es peor que no
 * tenerlo: nadie duda de una respuesta segura.
 */
export type AlgorithmFailureReason =
  /* No hay con qué decidir. No es un fallo: es la respuesta correcta. */
  | 'insufficient_evidence'
  /* Había alternativas, pero ninguna cumple las restricciones. */
  | 'no_valid_strategy'
  /* Se acabó el presupuesto COMPUTACIONAL antes de terminar. */
  | 'budget_exceeded'
  /* Dos restricciones no pueden cumplirse a la vez. */
  | 'constraint_conflict'
  /* El algoritmo se rompió. Nunca se usa para tapar uno de los de arriba. */
  | 'algorithm_failure'
  /* Se pidió un algoritmo que no está en el registro. */
  | 'unknown_algorithm'
  /* Está, pero su estado no permite elegirlo. */
  | 'algorithm_disabled'
  /* Lo que se propuso nombra una implementación. La frontera de `authority.ts`. */
  | 'authority_violation';

/** Lo que un algoritmo declara de sí mismo. El registro lo valida antes de admitirlo. */
export interface AlgorithmDescriptor {
  id: AlgorithmId;
  /** Entero, desde 1. Sube cuando cambia lo que el algoritmo DECIDE. */
  version: number;
  contract: typeof ALGORITHM_CONTRACT_VERSION;
  category: AlgorithmCategory;
  status: AlgorithmStatus;
  purity: AlgorithmPurity;
  /** Para qué está, en una frase. Se lee en los informes, no en la interfaz. */
  purpose: string;
  /**
   * QUÉ SEÑALES NECESITA PARA TRABAJAR.
   *
   * Claves de señal, no valores. Si falta una obligatoria, el algoritmo no
   * corre y la razón es `insufficient_evidence` — no una decisión a ciegas.
   */
  requiredSignals?: readonly string[];
  /** Las que mejoran la decisión pero no la impiden. */
  optionalSignals?: readonly string[];
  /** Sus topes propios. El del contexto manda cuando es más estrecho. */
  budget?: AlgorithmBudgetLimits;
  /**
   * A QUIÉN DELEGA SI NO PUEDE.
   *
   * `id@version`, o ausente para decir «devuélvele el trabajo a quien llamó».
   * Un algoritmo sin salida es un algoritmo que un día bloquea a Weë.
   */
  fallback?: string;
  /** De qué otros algoritmos depende para componerse. `id@version`. */
  dependsOn?: readonly string[];
}

/**
 * LOS TOPES COMPUTACIONALES. No confundir con `Budget` (`core/cost.ts`).
 *
 * `Budget` es el dinero de la persona: Credits y USD. Esto es cuánto puede
 * PENSAR el motor antes de tener que contestar con lo mejor que haya
 * encontrado. Son dos ejes que no se tocan, y mezclarlos sería exactamente el
 * error que el brief llama «Algorithm budget ≠ Credits Wallet».
 *
 * Todos son opcionales porque no todos aplican a todos los algoritmos, pero el
 * contexto SIEMPRE trae un tope efectivo: `presupuestoEfectivo` se encarga de
 * que «sin declarar» nunca signifique «sin límite».
 */
export interface AlgorithmBudgetLimits {
  /** Cuánto puede tardar en decidir. */
  maxLatencyMs?: number;
  /** Cuántas alternativas evalúa como mucho. El tope contra la explosión combinatoria. */
  maxCandidates?: number;
  /** Cuántas vueltas de refinamiento. */
  maxIterations?: number;
  /** Cuánto puede anidar una descomposición. */
  maxDepth?: number;
  /** Cuántas veces puede replanificarse el mismo trabajo. */
  maxReplans?: number;
  /** Cuántas piezas de evidencia acumula. Un contexto sin tope acaba siendo un scan. */
  maxEvidence?: number;
  /** Cuántos algoritmos puede invocar la composición entera. */
  maxAlgorithmCalls?: number;
}

/**
 * LOS TOPES DE VERDAD, cuando nadie dijo nada.
 *
 * Existen porque «sin declarar» no puede significar «sin límite»: un algoritmo
 * sin tope es un bucle esperando su turno, y Weë atiende a gente que está
 * mirando una pantalla. Los números son conservadores a propósito —es más fácil
 * subirlos con una medición delante que explicar una caída—, y `maxCandidates`
 * se queda MUY por debajo de los 256 del Router porque aquí cada candidato es
 * una estrategia entera y no una fila de un catálogo.
 */
export const TOPES_POR_DEFECTO: Required<AlgorithmBudgetLimits> = Object.freeze({
  maxLatencyMs: 250,
  maxCandidates: 32,
  maxIterations: 8,
  maxDepth: 6,
  maxReplans: 2,
  maxEvidence: 64,
  maxAlgorithmCalls: 16,
});

/**
 * TOPES DE LOS TOPES.
 *
 * Nadie puede pedir más que esto, ni el descriptor ni el contexto. Sin un techo
 * absoluto, «configurable» acaba significando «configurable hasta tumbarlo», y
 * el día que alguien escriba `maxCandidates: 100000` no habrá nadie mirando.
 */
export const TOPES_MAXIMOS: Required<AlgorithmBudgetLimits> = Object.freeze({
  maxLatencyMs: 5_000,
  maxCandidates: 256,
  maxIterations: 64,
  maxDepth: 16,
  maxReplans: 5,
  maxEvidence: 512,
  maxAlgorithmCalls: 64,
});

/** Cuántos algoritmos caben en el registro. Como `MAX_SKILLS`, y por lo mismo. */
export const MAX_ALGORITMOS = 200;

/** La forma de un nombre: minúsculas, dígitos y guiones. Ni espacios ni puntos. */
export const FORMA_DE_NOMBRE_DE_ALGORITMO = /^[a-z][a-z0-9-]{2,63}$/;
