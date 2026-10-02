/**
 * WEE ALGORITHM ENGINE — QUÉ SE INTENTA CONSEGUIR, Y DENTRO DE QUÉ LÍMITES.
 *
 * ── Por qué objetivo y restricción son cosas distintas ──────────────────────
 *
 * Porque se comportan al revés. Un OBJETIVO se maximiza: más calidad siempre es
 * mejor, y si no se alcanza del todo la respuesta sigue valiendo. Una
 * RESTRICCIÓN se cumple o no: 31 Credits cuando el tope era 30 no es «casi»,
 * es que no.
 *
 * Mezclarlas es el error clásico —meter el coste como un peso más y confiar en
 * que el número salga—, y produce exactamente el fallo que nadie ve venir: una
 * estrategia preciosa que se pasa del presupuesto gana porque su calidad
 * compensaba. Aquí las restricciones FILTRAN antes de que nadie puntúe.
 *
 * ── Lo que se reutiliza ─────────────────────────────────────────────────────
 *
 * `Budget` (`core/cost.ts`) es el dinero, con su `maxCredits`, su `maxUsd` y su
 * `prefer`. `QualityRequirement` (`core/workflow.ts`) es lo que se le exige al
 * resultado. Los dos ya existen, los dos se usan tal cual, y ninguno se copia:
 * lo que este archivo añade es poder decir «maximiza esto SUJETO A aquello»,
 * que es justo lo que no se podía expresar.
 */

import { Budget } from '../cost';
import { QualityRequirement } from '../workflow';

/**
 * LOS EJES SOBRE LOS QUE SE OPTIMIZA.
 *
 * Cerrado, y corto. Un eje que no se puede medir no sirve para decidir, así que
 * aquí solo están los que Weë YA sabe medir o podrá medir con lo que tiene:
 * el libro guarda coste y latencia, el Router guarda fiabilidad, y la calidad
 * la exige `QualityRequirement`.
 *
 * `userValue` está a propósito sin implementación. Es el eje que de verdad
 * importa y el único que Weë todavía no sabe medir; declararlo aquí, vacío y
 * con este comentario, es mejor que fingir una fórmula. Cuando exista feedback
 * real (A7) tendrá con qué llenarse.
 */
export type ObjectiveAxis =
  | 'quality'
  | 'cost'
  | 'latency'
  | 'reliability'
  /* La probabilidad de que el trabajo termine bien a la primera. */
  | 'successProbability'
  /* Lo que la persona valora. Sin medición todavía; ver arriba. */
  | 'userValue'
  /*
   * ── LOS TRES ESTRUCTURALES (A2) ─────────────────────────────────────────
   *
   * Cuántas operaciones, cuántos niveles de dependencia, y cuántas cosas
   * pueden ir a la vez. Existen porque sin ellos NO SE PUEDE decir «prefiero
   * la descomposición con menos pasos», y la alternativa era peor: meter esas
   * medidas en `cost` y `latency`, que significan dólares y milisegundos
   * medidos. Un número estructural disfrazado de dinero es un dato inventado.
   *
   * Se miden de verdad —se cuentan sobre el grafo—, así que a diferencia de
   * `userValue` estos SÍ tienen con qué llenarse desde el primer día.
   */
  /* Cuántas operaciones tiene el trabajo. Menos es mejor. */
  | 'steps'
  /* Niveles de dependencia: la longitud del camino crítico. Menos es mejor. */
  | 'depth'
  /* Cuánto puede ir a la vez. Más es mejor, si el objetivo lo pide. */
  | 'parallelism';

export const EJES: readonly ObjectiveAxis[] = Object.freeze([
  'quality', 'cost', 'latency', 'reliability', 'successProbability', 'userValue',
  'steps', 'depth', 'parallelism',
]);

/** Lo que se minimiza. Se dice una vez y nadie lo reinventa al revés. */
export const SE_MINIMIZA: readonly ObjectiveAxis[] = Object.freeze(['cost', 'latency', 'steps', 'depth']);

export const seMaximiza = (eje: ObjectiveAxis): boolean => !SE_MINIMIZA.includes(eje);

/**
 * QUÉ PESA CUÁNTO.
 *
 * Números sueltos, 0–1, que se normalizan al sumar. No se guardan normalizados
 * a propósito: quien escribe `{ quality: 1, cost: 0.5 }` está diciendo algo
 * legible, y obligarle a que sumen 1 convierte una intención en aritmética.
 *
 * Los ejes que no aparecen no cuentan. No es lo mismo que pesar 0 en el
 * resultado —lo es—, pero sí en lo que se lee: un eje ausente es un eje que no
 * interesa, y un eje a 0 es uno que se consideró y se descartó.
 */
export type ObjectiveWeights = Partial<Readonly<Record<ObjectiveAxis, number>>>;

/**
 * UN OBJETIVO, CON SUS CONDICIONES.
 *
 * La forma que el brief pedía poder expresar:
 *
 *     maximizar calidad
 *     sujeto a:  coste ≤ presupuesto
 *                latencia ≤ límite
 *                riesgo ≤ umbral
 *
 * `weights` es la parte que se maximiza; `constraints` es la que se cumple. Un
 * objetivo sin pesos es válido y significa «me da igual cómo, con que cumpla».
 */
export interface Objective {
  /** Un nombre para el informe: 'rápido y barato', 'lo mejor posible'. */
  label?: string;
  weights: ObjectiveWeights;
  constraints?: AlgorithmConstraints;
}

/**
 * LO QUE HAY QUE CUMPLIR SÍ O SÍ.
 *
 * Datos, nunca `if` repartidos. Es la diferencia entre poder explicar por qué
 * se descartó una estrategia y tener que leer código para averiguarlo, y es
 * literalmente lo que el brief pide en su punto 6.
 *
 * Nada de esto es obligatorio: un contexto sin restricciones es un contexto en
 * el que todo cabe, que es un caso legítimo y frecuente.
 */
export interface AlgorithmConstraints {
  /** El dinero. El de `core/cost.ts`, sin envolver. */
  budget?: Budget;
  /** Lo que se le exigirá al resultado. El de `core/workflow.ts`, sin envolver. */
  quality?: QualityRequirement;
  /** Tope de reloj para el TRABAJO, no para pensarlo. Lo otro es `AlgorithmBudgetLimits`. */
  maxLatencyMs?: number;
  /** Cuándo deja de valer la pena, en epoch ms. */
  deadlineAt?: number;
  /** Cuántos pasos puede tener la estrategia. */
  maxSteps?: number;
  /** Cuántos pueden ir a la vez. Lo ejecuta el Orchestrator; aquí solo se acota. */
  maxParallel?: number;
  /** Riesgo máximo admisible, 0–1. Por encima, se descarta. */
  maxRisk?: number;
  /**
   * CUÁNTO HAY QUE SABER PARA PODER ELEGIR ALGO, 0–1.
   *
   * No hay un umbral universal y no se inventa uno: una recomendación de qué
   * ver puede decidirse con poco, y un trabajo que cuesta dinero no. Quien pide
   * lo declara, y si no lo declara, la confianza se informa pero no descarta.
   *
   * Se comprueba DESPUÉS de puntuar, porque la confianza depende de la
   * cobertura y la cobertura no existe hasta que hay puntuación. Sigue siendo
   * una restricción dura: lo que no llega, se rechaza con su motivo.
   */
  minConfidence?: number;
  /**
   * CAPACIDADES QUE NO SE PUEDEN USAR. Del catálogo del Core.
   *
   * Sirve para lo que hoy no se puede decir: «hazlo sin música» porque
   * `music.generate` está pendiente. Son CAPACIDADES —lo que hay que hacer—,
   * jamás proveedores ni modelos: elegir con qué no es de esta capa y
   * `authority.ts` lo impide.
   */
  forbiddenCapabilities?: readonly string[];
  /** Las que tienen que aparecer sí o sí. Mismo criterio. */
  requiredCapabilities?: readonly string[];
}

/**
 * EL OBJETIVO POR DEFECTO, y por qué es este.
 *
 * Los mismos valores que la política del Router traduce a esta escala: calidad
 * por delante, coste que pesa pero no manda, y fiabilidad que solo desempata.
 * No se inventa una jerarquía nueva porque Weë ya tomó esa decisión una vez
 * (`POLITICA_POR_DEFECTO`), y tener dos jerarquías distintas en dos capas es
 * cómo un sistema acaba contradiciéndose consigo mismo.
 */
export const OBJETIVO_POR_DEFECTO: Objective = Object.freeze({
  label: 'equilibrado',
  weights: Object.freeze({ quality: 0.45, cost: 0.25, latency: 0.2, reliability: 0.1 }),
});

/**
 * Los pesos, sumando 1. Lo que de verdad se usa al puntuar.
 *
 * Un objetivo con todos los pesos a 0 —o sin pesos— no se convierte en «nada
 * importa»: eso haría que cualquier estrategia empatase con cualquier otra y
 * que el desempate lo decidiera el orden de la lista, en silencio. Devuelve el
 * reparto por defecto, que es una decisión declarada y auditable.
 */
export const pesosNormalizados = (objective: Objective | undefined): Readonly<Record<ObjectiveAxis, number>> => {
  const crudos = objective?.weights ?? {};
  const limpios: Partial<Record<ObjectiveAxis, number>> = {};
  let total = 0;
  for (const eje of EJES) {
    const v = crudos[eje];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      limpios[eje] = v;
      total += v;
    }
  }
  if (total <= 0) return pesosNormalizados(OBJETIVO_POR_DEFECTO);
  const salida = {} as Record<ObjectiveAxis, number>;
  for (const eje of EJES) salida[eje] = (limpios[eje] ?? 0) / total;
  return Object.freeze(salida);
};

/* ── Los números de una restricción (S2-B · B.1) ─────────────────────────── */

/**
 * QUÉ RANGO TIENE CADA NÚMERO DE UNA RESTRICCIÓN.
 *
 * Los rangos NO son nuevos: son los que `conflictosDeRestricciones` ya exigía
 * —un tope positivo para los pasos, el paralelo y la latencia; una fracción
 * 0–1 para el riesgo, la confianza y la calidad; nada negativo en el dinero—.
 * `deadlineAt` no tenía ninguno y sigue sin tenerlo: basta con que sea un
 * instante que se pueda comparar. Lo que añade S2-B es que el número sea de
 * verdad un número, y FINITO. En este orden salen los conflictos: el de siempre,
 * con `deadlineAt` detrás.
 */
export type RangoDeRestriccion = 'positivo' | 'fraccion' | 'noNegativo' | 'finito';

export const RANGO_DE_RESTRICCION: Readonly<Record<string, RangoDeRestriccion>> = Object.freeze({
  maxSteps: 'positivo',
  maxParallel: 'positivo',
  maxLatencyMs: 'positivo',
  maxRisk: 'fraccion',
  minConfidence: 'fraccion',
  'budget.maxCredits': 'noNegativo',
  'budget.maxUsd': 'noNegativo',
  'quality.minScore': 'fraccion',
  deadlineAt: 'finito',
});

/** El tipo de lo que llegó, para decirlo sin repetir el valor: un texto podría traer cualquier cosa. */
const tipoDe = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

/**
 * ¿VALE ESTE NÚMERO? `undefined` si vale; el motivo si no.
 *
 * UNA regla, y la aplican todos: A1 y A9 a cada lado antes de fundirlo, la
 * fusión, A3, A5 —con sus restricciones y con su `acceptance.minConfidence`— y
 * A8 con su `minConfidence`. Hacía falta porque `NaN < 0` y `NaN > 1` son
 * falsos: un `NaN` pasaba por «en rango» y, según el campo, apagaba el mínimo
 * (`minConfidence`), dejaba fuera a todas (`maxRisk`, `budget.maxUsd`,
 * `quality.minScore`) o se ignoraba (`deadlineAt`). Un infinito no es un tope
 * ni un suelo, y un texto o un `null` no son números. Nada de eso se arregla ni
 * se interpreta: se rechaza, y se dice por qué.
 */
export const motivoDeNumeroInvalido = (rango: RangoDeRestriccion, v: unknown): string | undefined => {
  if (typeof v !== 'number') return `no es un número (${tipoDe(v)})`;
  if (Number.isNaN(v)) return 'no es un número finito (NaN)';
  if (!Number.isFinite(v)) return `no es un número finito (${v > 0 ? 'Infinity' : '-Infinity'})`;
  if (rango === 'positivo' && v <= 0) return 'fuera de rango: tiene que ser mayor que 0';
  if (rango === 'fraccion' && (v < 0 || v > 1)) return 'fuera de rango: entre 0 y 1';
  if (rango === 'noNegativo' && v < 0) return 'fuera de rango: no puede ser negativo';
  return undefined;
};

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Un campo de `RANGO_DE_RESTRICCION` —`maxRisk`, `budget.maxUsd`…— leído de un objeto de restricciones. */
const leerCampo = (c: Record<string, unknown>, campo: string): unknown => {
  const [fuera, dentro] = campo.split('.');
  if (dentro === undefined) return c[fuera];
  const contenedor = c[fuera];
  return esObjeto(contenedor) ? contenedor[dentro] : undefined;
};

/** Lo mal formado de UN objeto de restricciones: qué campo y por qué. */
export interface RestriccionMalFormada {
  /** `maxRisk`, `budget.maxUsd`…; `budget` o `quality` si el contenedor no es un objeto; vacío si no lo es el lado entero. */
  campo: string;
  motivo: string;
}

/**
 * LO MAL FORMADO DE UN OBJETO DE RESTRICCIONES, mirando cada valor por separado
 * —ningún cruce entre campos, eso es `conflictosDeRestricciones`—.
 *
 * Ausente (`undefined`, o `null` como hasta ahora) no es un error: es no pedir
 * nada. Un lado o un contenedor (`budget`, `quality`) que no es un objeto sí lo
 * es: sus números no se podrían leer, y callarlos sería perderlos sin decirlo.
 */
export const restriccionesMalFormadas = (c: unknown): readonly RestriccionMalFormada[] => {
  if (c === undefined || c === null) return Object.freeze([]);
  if (!esObjeto(c)) return Object.freeze([{ campo: '', motivo: `no es un objeto de restricciones (${tipoDe(c)})` }]);
  const malas: RestriccionMalFormada[] = [];
  for (const contenedor of ['budget', 'quality']) {
    const v = c[contenedor];
    if (v !== undefined && v !== null && !esObjeto(v)) malas.push({ campo: contenedor, motivo: `no es un objeto (${tipoDe(v)})` });
  }
  for (const [campo, rango] of Object.entries(RANGO_DE_RESTRICCION)) {
    const v = leerCampo(c, campo);
    if (v === undefined) continue;
    const motivo = motivoDeNumeroInvalido(rango, v);
    if (motivo) malas.push({ campo, motivo });
  }
  return Object.freeze(malas);
};

/**
 * LOS DOS LADOS, CADA UNO CON SU RUTA, ANTES DE FUNDIRLOS (S2-B · B.1).
 *
 * La petición (`constraints`) y su objetivo (`objective.constraints`) se miran
 * por separado. Mirando solo lo fundido, un valor roto de un lado lo tapaba el
 * otro —un texto se ignoraba y pasaba el número del otro lado— o lo borraba
 * —`Math.max(0.5, NaN)` es `NaN`—, y nadie sabía de qué lado venía. Cada
 * problema sale como `ruta: motivo`, primero los de la petición y después los
 * del objetivo, cada lado en el orden de `RANGO_DE_RESTRICCION`.
 */
export const problemasDeLosLados = (objetivo: unknown, peticion: unknown): readonly string[] => {
  const conRuta = (lado: string) => ({ campo, motivo }: RestriccionMalFormada): string =>
    `${campo ? `${lado}.${campo}` : lado}: ${motivo}`;
  return Object.freeze([
    ...restriccionesMalFormadas(peticion).map(conRuta('constraints')),
    ...restriccionesMalFormadas(objetivo).map(conRuta('objective.constraints')),
  ]);
};

/**
 * UN LADO QUE SE PUEDE FUNDIR: un objeto, y sin números que no sean finitos.
 *
 * Es la guarda de la fusión (`restriccionesEfectivas`), no la validación: quien
 * funde ya validó cada lado con `problemasDeLosLados` y se paró si algo estaba
 * mal. Aun así, lo que no es un número finito no entra en una restricción
 * efectiva —ni se funde con el otro lado ni pasa tal cual—, y un contenedor que
 * no es un objeto no se lee. Un lado sin nada de eso se devuelve TAL CUAL, el
 * mismo objeto: con entradas válidas, la fusión es exactamente la de siempre.
 */
export const ladoFundible = (c: unknown): AlgorithmConstraints | undefined => {
  if (!esObjeto(c)) return undefined;
  const rotos = Object.keys(RANGO_DE_RESTRICCION).filter((campo) => {
    const v = leerCampo(c, campo);
    return v !== undefined && !(typeof v === 'number' && Number.isFinite(v));
  });
  const contenedoresRotos = ['budget', 'quality'].filter((k) => c[k] !== undefined && c[k] !== null && !esObjeto(c[k]));
  if (!rotos.length && !contenedoresRotos.length) return c as AlgorithmConstraints;
  const copia: Record<string, unknown> = { ...c };
  for (const k of contenedoresRotos) delete copia[k];
  for (const campo of rotos) {
    const [fuera, dentro] = campo.split('.');
    if (dentro === undefined) { delete copia[fuera]; continue; }
    const contenedor = { ...(copia[fuera] as Record<string, unknown>) };
    delete contenedor[dentro];
    copia[fuera] = contenedor;
  }
  return copia as AlgorithmConstraints;
};

/**
 * ¿SE CONTRADICEN LAS RESTRICCIONES?
 *
 * Devuelve los conflictos, no el primero: arreglarlos de uno en uno es lo que
 * convierte una validación en un castigo, y ese criterio ya es el del Core
 * (`validarSkill`, `validarRegistro`).
 *
 * Solo detecta lo que se puede afirmar SIN estimar nada. Un «este presupuesto
 * no alcanza para esta calidad» necesita saber lo que cuestan las cosas, y eso
 * es del estimador, no de aquí: decirlo sin datos sería inventar.
 *
 * Cada número, con la regla de `motivoDeNumeroInvalido` (S2-B · B.1): la misma
 * con que se valida cada lado antes de fundirlo. Los nombres y el orden de
 * los conflictos son los de siempre; `deadlineAt` va detrás.
 */
export const conflictosDeRestricciones = (c: AlgorithmConstraints | undefined): readonly string[] => {
  if (!c) return [];
  const malas: string[] = restriccionesMalFormadas(c).map((m) => m.campo || 'constraints');
  const positivo = (v: unknown) => motivoDeNumeroInvalido('positivo', v) === undefined;

  /* Pedir y prohibir la misma capacidad no se puede cumplir de ninguna manera. */
  const prohibidas = new Set(c.forbiddenCapabilities ?? []);
  for (const req of c.requiredCapabilities ?? []) {
    if (prohibidas.has(req)) malas.push(`requiredCapabilities:${req}`);
  }
  /* Más paralelo que pasos no es un error, pero maxParallel > maxSteps sí es incoherente. */
  if (positivo(c.maxSteps) && positivo(c.maxParallel) && (c.maxParallel as number) > (c.maxSteps as number)) {
    malas.push('maxParallel>maxSteps');
  }
  return malas;
};
