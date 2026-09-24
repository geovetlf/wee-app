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
import { AmbitoDeEvento, CodigoDeRazon, PoliticaDeAprendizaje, Tendencia, motivoDeReloj } from './feedback';

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

/** Lo que separa las dimensiones en la clave. Por eso ningún valor puede contenerlo. */
export const SEPARADOR_DE_CLAVE = '|';

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
  return [metric, ...partes].join(SEPARADOR_DE_CLAVE) || metric;
};

/**
 * ¿HAY UN VALOR QUE ROMPE LA CLAVE? Devuelve la dimensión, para decir cuál.
 *
 * La clave une las dimensiones con `SEPARADOR_DE_CLAVE`, y un valor que lo
 * contenga puede hacerse pasar por otra dimensión: la estrategia «S|providerId=p»
 * y la estrategia «S» con el proveedor «p» dan la MISMA clave, y sus resultados
 * se sumaban en un solo agregado —un fallo de una contado como de la otra—. Se
 * midió antes de escribir esto (A9.2). Con la identidad de la alternativa como
 * dimensión de aprendizaje, la clave tiene que ser inyectiva, y eso se exige en
 * la puerta: lo que no puede formar su propia clave no entra.
 */
export const valorQueRompeLaClave = (scope: AmbitoDeEvento | undefined): keyof AmbitoDeEvento | undefined =>
  ORDEN_DE_CLAVE.find((k) => typeof scope?.[k] === 'string' && (scope[k] as string).includes(SEPARADOR_DE_CLAVE));

/**
 * LO ÚNICO QUE UN AGREGADO PUEDE GUARDAR DE UN ÁMBITO: las dimensiones por las
 * que se agrega. Ni una más.
 *
 * Existe por una fuga que había: la CLAVE excluía bien la cuenta, pero el campo
 * `scope` del agregado copiaba el ámbito COMPLETO de la primera observación
 * —cuenta, petición, trabajo, paso, resultado y cualquier cosa que viniera—. Un
 * agregado de miles de personas llevaba dentro la cuenta de quien lo abrió.
 *
 * Es una lista BLANCA y no una negra, y la diferencia la demostró la propia
 * auditoría: `sessionId` se colaba sin estar siquiera en el tipo
 * `AmbitoDeEvento`. Una lista de lo prohibido habría fallado con el siguiente
 * identificador que nadie previó; una de lo permitido no puede.
 *
 * Y es la MISMA lista que forma la clave (`ORDEN_DE_CLAVE`), no una segunda:
 * lo que se guarda y aquello por lo que se agrupa no pueden divergir.
 *
 * No se sustituye nada por un hash: si un identificador no hace falta para
 * aprender del agregado —y ninguno hace falta—, no se guarda. Un hash de una
 * cuenta sigue siendo un identificador de esa cuenta.
 */
export const ambitoAgregable = (scope: AmbitoDeEvento | undefined): AmbitoDeEvento => {
  const salida: Partial<Record<keyof AmbitoDeEvento, string>> = {};
  for (const k of ORDEN_DE_CLAVE) {
    const v = scope?.[k];
    if (typeof v === 'string' && v) salida[k] = v;
  }
  return Object.freeze(salida) as AmbitoDeEvento;
};

/**
 * LA EVIDENCIA QUE UN AGREGADO GUARDA PARA EXPLICAR, sin su sujeto.
 *
 * El sujeto de una señal dice sobre QUÉ va, y en una señal adjunta a un
 * resultado suele ser una ejecución concreta —un resultado, un trabajo—, que
 * es un identificador individual. Para explicar un agregado no hace falta: el
 * «sobre qué» del agregado ya lo dicen su clave y su ámbito. Se quita.
 *
 * Se conserva lo que sí sostiene la explicación y no identifica a nadie: la
 * métrica, el valor, la procedencia, cuándo se midió, sobre cuántas
 * observaciones y con cuánta confianza.
 */
export const evidenciaAgregable = (e: Evidence): Evidence => {
  const s = e.signal;
  const senal: Signal = {
    key: s.key,
    value: s.value,
    source: s.source,
    ...(typeof s.at === 'number' ? { at: s.at } : {}),
    ...(typeof s.sampleSize === 'number' ? { sampleSize: s.sampleSize } : {}),
    ...(typeof s.confidence === 'number' ? { confidence: s.confidence } : {}),
  };
  return Object.freeze({
    claim: e.claim,
    signal: Object.freeze(senal),
    supports: e.supports,
    ...(typeof e.weight === 'number' ? { weight: e.weight } : {}),
  });
};

/**
 * UN AGREGADO, REDUCIDO A LO QUE PUEDE PERSISTIR. Idempotente.
 *
 * Hace falta además de las dos de arriba por el estado que ya existía: un
 * `previo` guardado antes del arreglo trae la fuga dentro, y reemitirlo tal
 * cual la perpetuaría llamada tras llamada.
 */
export const agregadoAgregable = (a: AgregadoDeAprendizaje): AgregadoDeAprendizaje => ({
  ...a,
  scope: ambitoAgregable(a.scope),
  muestraDeApoyo: Object.freeze((a.muestraDeApoyo ?? []).map(evidenciaAgregable)),
  muestraDeContradiccion: Object.freeze((a.muestraDeContradiccion ?? []).map(evidenciaAgregable)),
});

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
  /**
   * DÓNDE ACABA EL TRAMO MÁS NUEVO, en epoch ms: el final ABSOLUTO de la rejilla.
   *
   * Existe por un fallo que había. El tramo de una observación se calculaba
   * contra el `ahora` de la llamada que la acumulaba, y el tramo quedaba
   * congelado con ese reloj: los mismos ochenta datos daban tramos distintos
   * según llegaran en una llamada o en dos, y en dos daban un `validated`
   * estable sobre una latencia que se había multiplicado por seis.
   *
   * Ahora la rejilla es fija —celdas de `ventanaMs / TRAMOS` contadas desde la
   * época— y el tramo de una observación sale SOLO de su `at`, de la ventana y
   * de esta rejilla. Ver `finDeTramo`.
   *
   * Opcional para que un agregado guardado antes siga leyéndose. Su AUSENCIA
   * quiere decir que sus tramos no son de fiar: los totales valen, la
   * estabilidad y la tendencia no se saben hasta que haya una rejilla válida.
   */
  tramosHasta?: number;
  /** Cuánto pesa la procedencia de lo que ha entrado, 0–1. Media ponderada. */
  fuerza: number;
  /** Acotadas, y solo para explicar. Nunca para contar. */
  muestraDeApoyo: readonly Evidence[];
  muestraDeContradiccion: readonly Evidence[];
  /** Cuántas contradicciones han entrado EN TOTAL, no cuántas se guardaron. */
  contradicciones: number;
  /**
   * CUÁNTAS OBSERVACIONES NO IMPLÍCITAS HAN ENTRADO: explícitas o del sistema.
   *
   * Existe por un fallo que había. «¿Se sostiene esto solo en gestos
   * implícitos?» se calculaba sobre la LLAMADA —un conjunto que nacía vacío en
   * cada `aprender`— y no sobre el agregado, que no guardaba el dato. Así, los
   * mismos 120 datos salían `validated` en una llamada y `rejected` en dos: el
   * agregado olvidaba entre llamadas el apoyo explícito que ya tenía.
   *
   * Es una CUENTA y no un peso: dice cuántas observaciones no fueron una
   * interpretación, nada sobre cuánto valen. Y no identifica a nadie.
   *
   * Opcional para que un agregado guardado antes siga leyéndose. Su ausencia se
   * lee como CERO —apoyo explícito no demostrado—, que es la dirección que no
   * se equivoca: puede retrasar una validación, nunca adelantarla.
   */
  explicitas?: number;
}

/** Cuántas piezas de evidencia se guardan para poder explicar. Tope duro. */
export const MAX_MUESTRA = 3;

export const agregadoVacio = (key: string, metric: string, scope: AmbitoDeEvento): AgregadoDeAprendizaje => ({
  key, metric, scope: ambitoAgregable(scope),
  n: 0, suma: 0, favorables: 0,
  min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY,
  primero: 0, ultimo: 0,
  tramos: Object.freeze(Array.from({ length: TRAMOS }, tramoCero)),
  fuerza: 0,
  muestraDeApoyo: Object.freeze([]),
  muestraDeContradiccion: Object.freeze([]),
  contradicciones: 0,
  explicitas: 0,
});

/* ── La rejilla ───────────────────────────────────────────────────────────── */

/** El ancho de un tramo, o `undefined` si la ventana no es una ventana. */
const anchoDeTramo = (ventanaMs: number): number | undefined =>
  (typeof ventanaMs === 'number' && Number.isFinite(ventanaMs) && ventanaMs > 0 ? ventanaMs / TRAMOS : undefined);

/** ¿Cae este instante justo en un borde de la rejilla de este ancho? */
const enBorde = (t: number, ancho: number): boolean => Number.isFinite(t) && Math.round(t / ancho) * ancho === t;

/**
 * DÓNDE ACABA LA CELDA DE LA REJILLA QUE CONTIENE `at`.
 *
 * LA REJILLA, entera, está aquí. Celdas de `ventanaMs / TRAMOS` contadas desde
 * la época, cerradas por el final: la celda que acaba en `fin` cubre
 * `(fin − ancho, fin]`. Es la misma para todos los agregados con la misma
 * ventana y no se mueve con nada: ni con el reloj de quien llama, ni con el
 * orden en que lleguen los datos.
 */
export const finDeTramo = (at: number, ventanaMs: number): number | undefined => {
  const ancho = anchoDeTramo(ventanaMs);
  if (ancho === undefined || typeof at !== 'number' || !Number.isFinite(at)) return undefined;
  return Math.ceil(at / ancho) * ancho;
};

/**
 * ¿SE PUEDE FIAR DE LOS TRAMOS DE ESTE AGREGADO?
 *
 * Sí cuando dice dónde acaba su rejilla y trae sus TRAMOS tramos. Con una
 * ventana, además, cuando ese final cae en la rejilla de ESA ventana: si no
 * cae, los tramos se hicieron con otra y no se pueden seguir llenando.
 */
export const rejillaValida = (a: AgregadoDeAprendizaje, ventanaMs?: number): boolean => {
  const hasta = a?.tramosHasta;
  if (typeof hasta !== 'number' || !Number.isFinite(hasta)) return false;
  if (!Array.isArray(a.tramos) || a.tramos.length !== TRAMOS) return false;
  if (ventanaMs === undefined) return true;
  const ancho = anchoDeTramo(ventanaMs);
  return ancho !== undefined && enBorde(hasta, ancho);
};

/**
 * EN QUÉ TRAMO CAE UNA OBSERVACIÓN, en la rejilla que acaba en `hasta`.
 *
 * Por su FECHA y nada más. El segundo argumento era el reloj de la llamada, y
 * ese era el fallo: el tramo dependía de cuándo se acumulaba, no de cuándo
 * pasó. Ahora es el final de la rejilla, que tiene que caer en un borde.
 *
 * `undefined` fuera de la rejilla —más vieja que su primer tramo, o más nueva
 * que el último— o con algo que no es una fecha: no se sabe dónde va, y no se
 * pone en ningún sitio por si acaso.
 */
export const tramoDe = (at: number, hasta: number, ventanaMs: number): number | undefined => {
  const ancho = anchoDeTramo(ventanaMs);
  const fin = finDeTramo(at, ventanaMs);
  if (ancho === undefined || fin === undefined || !enBorde(hasta, ancho)) return undefined;
  /* Cuántas celdas por detrás del final. 0 = el tramo más nuevo. */
  const atras = Math.round((hasta - fin) / ancho);
  return atras >= 0 && atras < TRAMOS ? TRAMOS - 1 - atras : undefined;
};

/**
 * MÉTELE UNA OBSERVACIÓN. Devuelve otro agregado: aquí no se muta nada.
 *
 * Inmutable a propósito. Un agregado que se muta en sitio es imposible de
 * probar por igualdad y, el día que esto viva detrás de una transacción, es
 * imposible de reintentar sin contar dos veces.
 *
 * El tercer argumento YA NO SE USA. Era el reloj de la llamada, y el tramo no
 * puede depender de él. Sigue en la firma porque quitarlo correría `ventanaMs`
 * a su sitio, y quien llamara como antes pasaría su reloj como ventana sin que
 * nada se lo dijera.
 */
export const acumular = (
  a: AgregadoDeAprendizaje,
  obs: { value: number; at: number; favorable: boolean; signal?: Signal; evidence?: Evidence; implicito?: boolean },
  _ahora: number,
  ventanaMs: number,
): AgregadoDeAprendizaje => {
  if (!Number.isFinite(obs?.value) || !Number.isFinite(obs?.at)) return a;

  /*
   * LA REJILLA, antes de colocar nada.
   *
   * Sin una rejilla de la que fiarse —un agregado nuevo, uno guardado antes de
   * la rejilla absoluta, o uno hecho con otra ventana— los tramos EMPIEZAN AQUÍ
   * y los totales se quedan como estaban: lo viejo no se puede recolocar porque
   * no se guardó cuándo pasó cada cosa. Con una rejilla válida, si llega algo
   * más nuevo que su final, la rejilla AVANZA: salen por detrás los tramos que
   * se quedan fuera de la ventana y entran vacíos por delante.
   */
  const ancho = anchoDeTramo(ventanaMs);
  const fin = finDeTramo(obs.at, ventanaMs);
  let hasta = a.tramosHasta;
  let tramos: readonly Tramo[] = a.tramos;
  if (ancho !== undefined && fin !== undefined) {
    if (!(a.n > 0 && rejillaValida(a, ventanaMs))) {
      hasta = fin;
      tramos = Array.from({ length: TRAMOS }, tramoCero);
    } else if (fin > (hasta as number)) {
      const salto = Math.min(TRAMOS, Math.round((fin - (hasta as number)) / ancho));
      tramos = [...tramos.slice(salto), ...Array.from({ length: salto }, tramoCero)];
      hasta = fin;
    }
  }
  /* Lo que queda por detrás de la rejilla cuenta en los totales y en ningún
   * tramo: meterlo en el más viejo, como se hacía, mezclaba en él datos de
   * cualquier antigüedad. */
  const i = typeof hasta === 'number' ? tramoDe(obs.at, hasta, ventanaMs) : undefined;
  const nuevosTramos = i === undefined ? tramos : tramos.map((t, k) => (k !== i ? t : {
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
  const nuevaMuestra = (lista: readonly Evidence[], cruda: Evidence | undefined) => {
    if (!cruda) return lista;
    const e = evidenciaAgregable(cruda);
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
    tramos: Object.freeze(nuevosTramos),
    ...(typeof hasta === 'number' ? { tramosHasta: hasta } : {}),
    fuerza,
    muestraDeApoyo: apoya ? nuevaMuestra(a.muestraDeApoyo, obs.evidence) : a.muestraDeApoyo,
    muestraDeContradiccion: apoya ? a.muestraDeContradiccion : nuevaMuestra(a.muestraDeContradiccion, obs.evidence),
    contradicciones: a.contradicciones + (apoya ? 0 : 1),
    /* Solo cuenta lo que SE SABE que no fue una interpretación. Una observación
     * que no lo dice no suma: no saber no es tener apoyo explícito. */
    explicitas: (a.explicitas ?? 0) + (obs.implicito === false ? 1 : 0),
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
 * llenó no es fresco, es desconocido. Y sin un reloj válido, lo mismo: `frescura`
 * de A0 devuelve NaN con un reloj NaN, y un NaN no cae por debajo de ningún
 * umbral, así que la guarda de frescura lo dejaba pasar.
 */
export const frescuraDe = (a: AgregadoDeAprendizaje, ahora: number, vidaMs: number): number => {
  if (motivoDeReloj(ahora)) return 0;
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
 * Con menos de dos tramos con datos devuelve `undefined`: todo concentrado en
 * un rato no es estabilidad, es una foto. Y lo mismo si los tramos no son de
 * fiar —un agregado sin rejilla—: comparar trozos que no se sabe qué cubren no
 * mide nada.
 */
export const estabilidadDe = (a: AgregadoDeAprendizaje): number | undefined => {
  if (!rejillaValida(a)) return undefined;
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
 * Ni sin una rejilla de la que fiarse, que es no saber qué tramo es cuál.
 */
export const tendenciaDe = (
  a: AgregadoDeAprendizaje,
  mejorDireccion: 'sube' | 'baja',
  politica: PoliticaDeAprendizaje,
): Tendencia => {
  if (!rejillaValida(a)) return 'insufficient_evidence';
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
  /* Sin reloj no hay frescura, y sin frescura no hay confianza: se dice por qué. */
  const sinReloj = motivoDeReloj(ahora);
  if (sinReloj) return { kind: 'evidence', value: 0, basis: [], because: `sin reloj de evaluación (${sinReloj})` };
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
/**
 * ¿SE SOSTIENE ESTE AGREGADO SOLO EN GESTOS IMPLÍCITOS?
 *
 * Sobre el AGREGADO —todo lo que la clave ha aprendido— y no sobre la llamada
 * que lo está tocando: es lo que la guarda siempre dijo medir. Escrito aquí,
 * en un sitio, para que el motor y quien vuelva a evaluar las guardas más tarde
 * pregunten exactamente lo mismo.
 */
export const soloImplicitoDe = (a: AgregadoDeAprendizaje): boolean => !((a.explicitas ?? 0) > 0);

export const guardas = (
  a: AgregadoDeAprendizaje,
  ahora: number,
  politica: PoliticaDeAprendizaje,
  opciones: { soloImplicito?: boolean; magnitud?: number } = {},
): readonly CodigoDeRazon[] => {
  const motivos: CodigoDeRazon[] = [];
  /* Sin un reloj válido no se evalúa NADA, y es el único motivo: frescura,
   * confianza e incertidumbre dependen de él, y un NaN no cae por debajo de
   * ningún umbral —lo desconocido pasaba por aprobado—. */
  const sinReloj = motivoDeReloj(ahora);
  if (sinReloj) { motivos.push(sinReloj); return Object.freeze(motivos); }
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
  /* Del agregado, salvo que quien llama lo fuerce: así la guarda es la misma la
   * evalúe quien la evalúe, y no hace falta que cada llamador sepa calcularla. */
  const soloImplicito = opciones.soloImplicito ?? soloImplicitoDe(a);
  if (soloImplicito && !politica.permitirSoloImplicito) motivos.push('implicit_only');
  return Object.freeze(motivos);
};
