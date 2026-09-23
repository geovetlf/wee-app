/**
 * WEE ALGORITHM ENGINE — A7 · AGREGACIÓN, DECADENCIA Y CONTRADICCIÓN.
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 *   DISEÑAR PARA DIEZ MILLONES. CALCULAR PARA HOY.
 *
 * Con diez millones de cuentas, «dame el histórico y recalcula» es una pregunta
 * que un día se come un servidor. Así que aquí no hay histórico: hay AGREGADOS
 * POR CLAVE, de tamaño fijo, que se actualizan de uno en uno y nunca crecen.
 *
 * Un agregado ocupa lo mismo con diez observaciones que con diez millones. Esa
 * es toda la idea, y es la que permite que esto siga valiendo cuando Weë sea
 * grande sin montar hoy una infraestructura que Weë no puede pagar.
 *
 * ── Y el que casi nadie resuelve ────────────────────────────────────────────
 *
 * Una media es un embustero educado. «Tasa de éxito 0,8 sobre mil» puede ser
 * mil ejecuciones tranquilas a 0,8, o novecientas a 0,95 y las últimas cien a
 * 0,3 — mismo número, acciones opuestas—. Por eso cada agregado lleva TRAMOS:
 * la ventana partida en trozos iguales, para poder ver si la cosa se mueve.
 *
 * ── Lo que se reutiliza y no se reescribe ───────────────────────────────────
 *
 * `frescura()` ya calcula la decadencia con su vida útil. `PESO_DE_FUENTE` ya
 * ordena las procedencias. `resolverSenales` ya resuelve conflictos. `Evidence`
 * ya guarda lo que contradice. Nada de eso se vuelve a escribir aquí.
 */

import { HistoryWindow } from './decision';
import { Confidence, Evidence, Signal, Uncertainty, confianzaDeSenal, frescura, incertidumbreDe } from './signals';
import { AmbitoDeEvento, CodigoDeRazon, PoliticaDeAprendizaje, Tendencia } from './feedback';

/* ── La clave ─────────────────────────────────────────────────────────────── */

/**
 * LA CLAVE DE AGREGACIÓN, y por qué es una cadena.
 *
 * Todo el acceso de A7 es por clave: nunca hay un recorrido sobre el histórico
 * y nunca hay una consulta que dependa de cuántas observaciones haya. Una
 * cadena canónica permite que el día que esto viva en Firestore sea el id del
 * documento y la operación sea un `increment`, que es O(1) — exactamente lo que
 * `engine/ledger.ts` ya hace con `aiUsage/{día}`.
 *
 * El orden de los campos es fijo y los ausentes se omiten: dos ámbitos iguales
 * escritos en distinto orden TIENEN que dar la misma clave, o el agregado se
 * parte en dos y las dos mitades mienten.
 */
export const ORDEN_DE_CLAVE: readonly (keyof AmbitoDeEvento)[] = Object.freeze(
  ['capability', 'experience', 'strategyId', 'providerId', 'modelId'],
);

/**
 * `account`, `requestId`, `jobId`, `stepId` y `resultId` NO entran en la clave.
 *
 * Deliberado y es la decisión de privacidad más importante del módulo: agrupar
 * por cuenta convierte un agregado operativo en un perfil, y un perfil es
 * exactamente lo que A7 no debe construir. Sirven para DEDUPLICAR dentro de una
 * ventana, que es otra cosa.
 */
export const claveDeAmbito = (scope: AmbitoDeEvento | undefined, metric: string): string => {
  const partes = ORDEN_DE_CLAVE
    .map((k) => (typeof scope?.[k] === 'string' && scope[k] ? `${k}=${scope[k]}` : undefined))
    .filter((x): x is string => x !== undefined);
  return [metric, ...partes].join('|') || metric;
};

/* ── El agregado ──────────────────────────────────────────────────────────── */

/**
 * UN TRAMO DE LA VENTANA.
 *
 * Tamaño fijo, y es lo que hace posible ver una tendencia sin guardar eventos.
 * Cuatro tramos no es una elección profunda: es el mínimo con el que «las dos
 * primeras mitades frente a las dos últimas» dice algo, y cada tramo más cuesta
 * memoria multiplicada por el número de claves.
 */
export interface Tramo {
  n: number;
  suma: number;
  /* Para poder hablar de éxito sin guardar cada resultado. */
  favorables: number;
  /* Epoch ms del más reciente que cayó aquí. */
  ultimo: number;
}

export const TRAMOS = 4;

const tramoCero = (): Tramo => ({ n: 0, suma: 0, favorables: 0, ultimo: 0 });

/**
 * EL AGREGADO. Tamaño fijo, pase lo que pase.
 *
 * No hay ni una lista que crezca con las observaciones. Las piezas de evidencia
 * que guarda están ACOTADAS y existen solo para poder explicar; el número sale
 * de los contadores, no de ellas.
 */
export interface AgregadoDeAprendizaje {
  key: string;
  metric: string;
  scope: AmbitoDeEvento;
  /** Cuántas observaciones han entrado en total. */
  n: number;
  suma: number;
  /** Cuántas fueron favorables a la afirmación. */
  favorables: number;
  min: number;
  max: number;
  /** El primero y el último, en epoch ms. */
  primero: number;
  ultimo: number;
  /** La ventana partida. Del más viejo al más nuevo. */
  tramos: readonly Tramo[];
  /** Cuánto pesa la procedencia de lo que ha entrado, 0–1. Media ponderada. */
  fuerza: number;
  /** Acotadas, y solo para explicar. Nunca para contar. */
  muestraDeApoyo: readonly Evidence[];
  muestraDeContradiccion: readonly Evidence[];
  /** Cuántas contradicciones han entrado EN TOTAL, no cuántas se guardaron. */
  contradicciones: number;
}

/** Cuántas piezas de evidencia se guardan para poder explicar. Tope duro. */
export const MAX_MUESTRA = 3;

export const agregadoVacio = (key: string, metric: string, scope: AmbitoDeEvento): AgregadoDeAprendizaje => ({
  key, metric, scope,
  n: 0, suma: 0, favorables: 0,
  min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY,
  primero: 0, ultimo: 0,
  tramos: Object.freeze(Array.from({ length: TRAMOS }, tramoCero)),
  fuerza: 0,
  muestraDeApoyo: Object.freeze([]),
  muestraDeContradiccion: Object.freeze([]),
  contradicciones: 0,
});

/**
 * EN QUÉ TRAMO CAE UNA OBSERVACIÓN.
 *
 * Por tiempo y relativo a la ventana, no por orden de llegada: dos eventos que
 * llegan tarde y desordenados tienen que caer donde les toca por su fecha, o la
 * tendencia depende del orden en que se procesaron y deja de ser reproducible.
 */
export const tramoDe = (at: number, ahora: number, vidaMs: number): number => {
  if (!Number.isFinite(at) || !Number.isFinite(ahora) || vidaMs <= 0) return TRAMOS - 1;
  const edad = Math.max(0, ahora - at);
  if (edad >= vidaMs) return 0;
  /* 0 = el más viejo, TRAMOS-1 = el más nuevo. */
  const i = TRAMOS - 1 - Math.floor((edad / vidaMs) * TRAMOS);
  return Math.min(TRAMOS - 1, Math.max(0, i));
};

/**
 * MÉTELE UNA OBSERVACIÓN. Devuelve otro agregado: aquí no se muta nada.
 *
 * Inmutable a propósito. Un agregado que se muta en sitio es imposible de
 * probar por igualdad y, el día que esto viva detrás de una transacción, es
 * imposible de reintentar sin contar dos veces.
 */
export const acumular = (
  a: AgregadoDeAprendizaje,
  obs: { value: number; at: number; favorable: boolean; signal?: Signal; evidence?: Evidence },
  ahora: number,
  vidaMs: number,
): AgregadoDeAprendizaje => {
  if (!Number.isFinite(obs?.value) || !Number.isFinite(obs?.at)) return a;

  const i = tramoDe(obs.at, ahora, vidaMs);
  const tramos = a.tramos.map((t, k) => (k !== i ? t : {
    n: t.n + 1,
    suma: t.suma + obs.value,
    favorables: t.favorables + (obs.favorable ? 1 : 0),
    ultimo: Math.max(t.ultimo, obs.at),
  }));

  /* La fuerza es la media ponderada de la procedencia. Sin señal no se sube:
   * una observación sin decir de dónde sale no fortalece nada. */
  const fuerzaObs = obs.signal ? confianzaDeSenal(obs.signal) : 0;
  const fuerza = (a.fuerza * a.n + fuerzaObs) / (a.n + 1);

  const apoya = obs.evidence?.supports !== false;
  /*
   * LA MUESTRA SE QUEDA CON LAS MÁS ANTIGUAS, en orden, y no con las primeras
   * que llegaron. La diferencia parece cosmética y no lo es: quedarse con las
   * tres primeras EN LLEGAR hace que el mismo conjunto de eventos procesado en
   * otro orden produzca otra explicación, y entonces el resultado deja de ser
   * reproducible por algo que no afecta a ningún número.
   *
   * Los contadores nunca dependieron del orden; esto era lo único que sí.
   */
  const nuevaMuestra = (lista: readonly Evidence[], e: Evidence | undefined) => {
    if (!e) return lista;
    const juntas = [...lista, e].sort((x, y) => {
      const ax = x.signal?.at ?? 0, ay = y.signal?.at ?? 0;
      if (ax !== ay) return ax - ay;
      const kx = x.signal?.key ?? '', ky = y.signal?.key ?? '';
      if (kx !== ky) return kx < ky ? -1 : 1;
      return String(x.signal?.value) < String(y.signal?.value) ? -1 : 1;
    });
    return Object.freeze(juntas.slice(0, MAX_MUESTRA));
  };

  return {
    ...a,
    n: a.n + 1,
    suma: a.suma + obs.value,
    favorables: a.favorables + (obs.favorable ? 1 : 0),
    min: Math.min(a.min, obs.value),
    max: Math.max(a.max, obs.value),
    primero: a.primero === 0 ? obs.at : Math.min(a.primero, obs.at),
    ultimo: Math.max(a.ultimo, obs.at),
    tramos: Object.freeze(tramos),
    fuerza,
    muestraDeApoyo: apoya ? nuevaMuestra(a.muestraDeApoyo, obs.evidence) : a.muestraDeApoyo,
    muestraDeContradiccion: apoya ? a.muestraDeContradiccion : nuevaMuestra(a.muestraDeContradiccion, obs.evidence),
    contradicciones: a.contradicciones + (apoya ? 0 : 1),
  };
};

/* ── Lo que se deduce del agregado ────────────────────────────────────────── */

/** La media, o `undefined` si no hay nada. Media de nada es 0, y 0 es un dato. */
export const mediaDe = (a: AgregadoDeAprendizaje): number | undefined => (a.n > 0 ? a.suma / a.n : undefined);

/** La proporción de favorables, o `undefined`. Lo mismo. */
export const tasaDe = (a: AgregadoDeAprendizaje): number | undefined => (a.n > 0 ? a.favorables / a.n : undefined);

/**
 * CUÁNTO DE ESTO SIGUE VALIENDO.
 *
 * Reutiliza `frescura()` de A0 en vez de inventar otra curva: lineal hasta la
 * vida útil y luego cero, con el motivo ya escrito allí —nadie ha medido cómo
 * envejecen las señales de Weë y una exponencial elegante sería una precisión
 * que no tenemos—.
 *
 * Sin fecha devuelve 0, que es lo correcto: un agregado que no sabe cuándo se
 * llenó no es fresco, es desconocido.
 */
export const frescuraDe = (a: AgregadoDeAprendizaje, ahora: number, vidaMs: number): number => {
  if (!a.n || !a.ultimo) return 0;
  return frescura({ key: 'aggregate.freshness', value: 1, source: 'derived', at: a.ultimo }, ahora, vidaMs);
};

/**
 * CUÁNTO SE REPITE EL PATRÓN A LO LARGO DE LA VENTANA.
 *
 * Dos agregados con la misma media y la misma muestra no valen lo mismo si uno
 * es plano y el otro es una escalera. Se mide comparando los tramos con datos:
 * cuanto más se parecen entre sí, más estable.
 *
 * Con un solo tramo con datos devuelve 0 y no 1: todo concentrado en un rato no
 * es estabilidad, es una foto. Y sin datos, 0 — que se lee como «no se sabe» y
 * no como «inestable», porque la política pide un mínimo aparte.
 */
export const estabilidadDe = (a: AgregadoDeAprendizaje): number | undefined => {
  const conDatos = a.tramos.filter((t) => t.n > 0);
  /* UNDEFINED, no cero. Con un solo tramo con datos no es que sea inestable: es
   * que no hay dos trozos que comparar. Devolver cero decía «inestable» de algo
   * que nadie había podido mirar, que es el mismo error que A6 existe para no
   * cometer —no saber no es suspender— cometido en la otra dirección. */
  if (conDatos.length < 2) return undefined;
  const medias = conDatos.map((t) => t.suma / t.n);
  const media = medias.reduce((s, x) => s + x, 0) / medias.length;
  const escala = Math.max(Math.abs(media), 1e-9);
  const desviacion = Math.sqrt(medias.reduce((s, x) => s + (x - media) ** 2, 0) / medias.length);
  /* Coeficiente de variación, invertido y acotado. Relativo a la escala, porque
   * una desviación de 50 ms sobre 5 000 y sobre 60 no son la misma cosa. */
  return Math.max(0, Math.min(1, 1 - desviacion / escala));
};

/**
 * ¿ESTÁ MEJORANDO, EMPEORANDO O QUIETO?
 *
 * Compara la mitad vieja de la ventana con la nueva. `mejorDireccion` dice qué
 * significa «mejor» para esta métrica, y es obligatorio: para una latencia,
 * bajar es mejorar; para una tasa de éxito, subir. Deducirlo del nombre de la
 * métrica sería adivinar por el texto.
 *
 * Sin tramos suficientes NO se inventa una tendencia: `insufficient_evidence`.
 */
export const tendenciaDe = (
  a: AgregadoDeAprendizaje,
  mejorDireccion: 'sube' | 'baja',
  politica: PoliticaDeAprendizaje,
): Tendencia => {
  const estabilidad = estabilidadDe(a);
  const conDatos = a.tramos.filter((t) => t.n > 0);
  if (a.n < politica.minSampleSize || conDatos.length < 2) return 'insufficient_evidence';

  const mitad = Math.floor(TRAMOS / 2);
  const viejos = a.tramos.slice(0, mitad).filter((t) => t.n > 0);
  const nuevos = a.tramos.slice(mitad).filter((t) => t.n > 0);
  if (!viejos.length || !nuevos.length) return 'insufficient_evidence';

  const mediaDeTramos = (ts: readonly Tramo[]) =>
    ts.reduce((s, t) => s + t.suma, 0) / ts.reduce((s, t) => s + t.n, 0);
  const antes = mediaDeTramos(viejos);
  const ahora = mediaDeTramos(nuevos);
  const escala = Math.max(Math.abs(antes), 1e-9);
  const cambio = (ahora - antes) / escala;

  /* Por debajo del umbral de cambio no hay movimiento que reportar: la
   * alternativa es que el ruido se lea como una tendencia. */
  if (Math.abs(cambio) < politica.maxMagnitude) {
    return (estabilidad ?? 0) >= politica.minStability ? 'stable' : 'mixed';
  }
  const haSubido = cambio > 0;
  return (haSubido === (mejorDireccion === 'sube')) ? 'improving' : 'degrading';
};

/**
 * LA CONFIANZA DE UN AGREGADO.
 *
 * Tres cosas la sostienen y las tres tienen que estar: la FUERZA de lo que
 * entró —procedencia—, la MUESTRA, y la FRESCURA. Cualquiera a cero deja la
 * confianza a cero, y eso es intencionado: mil observaciones rancias no son
 * conocimiento, ni treinta de una fuente que se inventó el número.
 *
 * La muestra crece hasta el mínimo y ahí se satura. Más allá no aporta: pasar
 * de treinta a trescientas no multiplica por diez lo que se sabe.
 */
export const confianzaDeAgregado = (
  a: AgregadoDeAprendizaje,
  ahora: number,
  politica: PoliticaDeAprendizaje,
): Confidence => {
  if (!a.n) return { kind: 'evidence', value: 0, basis: [], because: 'sin observaciones' };
  const muestra = Math.min(1, a.n / Math.max(1, politica.minSampleSize));
  const fresca = frescuraDe(a, ahora, politica.vidaMs);
  const valor = Math.max(0, Math.min(1, a.fuerza * muestra * fresca));
  return {
    kind: 'evidence',
    value: valor,
    basis: Object.freeze([...a.muestraDeApoyo, ...a.muestraDeContradiccion]),
    because: `${a.n} observación(es), fuerza ${a.fuerza.toFixed(2)}, frescura ${fresca.toFixed(2)}`,
  };
};

export const incertidumbreDeAgregado = (c: Confidence): Uncertainty => incertidumbreDe(c);

/**
 * CUÁNTO SE CONTRADICE, 0–1.
 *
 * Proporción sobre el total, no cuenta absoluta: veinte contradicciones sobre
 * mil son ruido y veinte sobre treinta son otra historia.
 */
export const contradiccionDe = (a: AgregadoDeAprendizaje): number => (a.n > 0 ? a.contradicciones / a.n : 0);

/* ── El puente con lo que ya existe ───────────────────────────────────────── */

/**
 * DE UN AGREGADO A LA VENTANA QUE A1 YA SABE LEER.
 *
 * Esta función es el motivo de que A7 no invente su propia forma de histórico:
 * `HistoryWindow` existe desde A1 y es lo que `DecisionContext` acepta. A7
 * produce evidencia PARA los que ya existen, no un formato nuevo que obligue a
 * tocarlos.
 *
 * La mediana no se puede sacar de un agregado sin guardar la distribución, así
 * que NO se rellena. Poner la media donde el contrato dice mediana —«una cola
 * lenta no debe mover el número entero», está escrito allí— sería romper
 * exactamente lo que ese campo protege.
 */
export const ventanaDe = (a: AgregadoDeAprendizaje): HistoryWindow => Object.freeze({
  sampleSize: a.n,
  succeeded: a.favorables,
  ...(a.primero ? { since: a.primero } : {}),
});

/**
 * DE UN AGREGADO A UNA SEÑAL, que es la moneda de curso legal del Core.
 *
 * `derived` y no `measured`, siempre: lo que sale de aquí es un cálculo sobre
 * mediciones, no una medición. La diferencia la ordena `PESO_DE_FUENTE` y
 * mentir en esto sería colar un agregado por delante de un dato real.
 */
export const senalDe = (
  a: AgregadoDeAprendizaje,
  clave: string,
  valor: number,
  ahora: number,
): Signal => Object.freeze({
  key: clave,
  ...(a.key ? { subject: a.key.slice(0, 128) } : {}),
  value: valor,
  source: 'derived',
  at: a.ultimo || ahora,
  sampleSize: a.n,
});

/* ── Las guardas ──────────────────────────────────────────────────────────── */

/**
 * ¿ESTO SE PUEDE DAR POR APRENDIDO?
 *
 * Devuelve TODOS los motivos, no el primero: quien vaya a arreglarlo necesita
 * saber si le falta muestra o le falta frescura, y descubrirlo de uno en uno
 * cuesta una semana por motivo.
 *
 * Fíjate en que no hay ninguna vía por la que esto devuelva «sí» sin evidencia.
 * Esa es toda la función.
 */
export const guardas = (
  a: AgregadoDeAprendizaje,
  ahora: number,
  politica: PoliticaDeAprendizaje,
  opciones: { soloImplicito?: boolean; magnitud?: number } = {},
): readonly CodigoDeRazon[] => {
  const motivos: CodigoDeRazon[] = [];
  if (!a.n) { motivos.push('no_evidence'); return Object.freeze(motivos); }
  if (a.n < politica.minSampleSize) motivos.push('sample_below_minimum');

  const c = confianzaDeAgregado(a, ahora, politica);
  if (c.value < politica.minConfidence) motivos.push('confidence_below_threshold');
  if (!['known', 'probable'].includes(incertidumbreDeAgregado(c))) motivos.push('uncertainty_too_high');
  if (frescuraDe(a, ahora, politica.vidaMs) < politica.minFreshness) motivos.push('evidence_stale');
  if (contradiccionDe(a) > politica.maxContradiction) motivos.push('evidence_contradictory');
  const estable = estabilidadDe(a);
  if (estable === undefined) motivos.push('stability_unknown');
  else if (estable < politica.minStability) motivos.push('unstable_across_window');
  if (typeof opciones.magnitud === 'number' && Math.abs(opciones.magnitud) > politica.maxMagnitude) {
    motivos.push('change_too_large');
  }
  if (opciones.soloImplicito && !politica.permitirSoloImplicito) motivos.push('implicit_only');
  return Object.freeze(motivos);
};
