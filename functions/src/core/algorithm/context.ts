/**
 * WEE ALGORITHM ENGINE — A8 · EL MODELO DE CONTEXTO.
 *
 * ── La frase ────────────────────────────────────────────────────────────────
 *
 *   APRENDER A LO ANCHO. USAR A LO ESTRECHO. NUNCA INVENTAR EVIDENCIA.
 *
 * A7 aprende de todo. A8 decide qué de lo aprendido le sirve a UNA decisión
 * concreta —si está en su ámbito, si sigue valiendo, si alcanza— y se lo
 * entrega en la forma que esa decisión ya sabe leer. No decide la acción.
 *
 * ── Lo que A8 NO reconstruye, porque ya existe ──────────────────────────────
 *
 *   · La deduplicación y el conflicto entre señales iguales son de
 *     `resolverSenales` (A0). A8 no toca señales crudas: esas ya llegan a sus
 *     consumidores por su camino, y una segunda vía sería duplicarla.
 *   · El conflicto EN EL TIEMPO —bueno antes, malo ahora— es de `tendenciaDe`
 *     (A7). A8 lo transporta, no lo recalcula de otra manera.
 *   · Si un hecho aprendido sigue siendo válido lo deciden las `guardas()` de
 *     A7. A8 las vuelve a ejecutar con el reloj de la decisión: misma función,
 *     misma política, otro instante.
 *   · La decadencia es `frescura()` (A0). La confianza es la de A7. La forma del
 *     histórico es `HistoryWindow` (A1). El ámbito es `AmbitoDeEvento` (A7).
 *
 * ── Las dos autoridades, que no se mezclan ──────────────────────────────────
 *
 *   ¿SIGUE SIENDO UN HECHO VÁLIDO?  → A7, con SU política.
 *   ¿LE SIRVE A ESTA DECISIÓN?      → quien pide, con lo que DECLARE.
 *
 * La segunda sigue al pie de la letra la regla que `minConfidence` dejó
 * escrita en `AlgorithmConstraints`: no hay un umbral universal y no se
 * inventa uno; quien pide lo declara, y si no lo declara, se informa pero no
 * descarta.
 */

import { ObjectiveAxis } from './objective';
import { Confidence, Uncertainty } from './signals';
import { AmbitoDeEvento, CodigoDeRazon, Tendencia } from './feedback';
import { ORDEN_DE_CLAVE } from './learning';

/* ── Qué eje informa cada métrica ─────────────────────────────────────────── */

/**
 * EL PUENTE ENTRE LO QUE A7 MIDE Y LO QUE UNA DECISIÓN OPTIMIZA.
 *
 * Vive AQUÍ y no en A7 a propósito. Qué eje informa una métrica es un hecho de
 * RELEVANCIA —de qué sirve para decidir—, no de aprendizaje: A7 no necesita
 * saberlo para aprender, y meterlo en su descriptor habría obligado a tocar una
 * fase cerrada y a subir el contrato por un dato que A7 no usa.
 *
 * El riesgo de tener la lista de métricas en dos sitios es real, y se cierra
 * con una prueba que falla si A7 declara una métrica base sin eje aquí. Y el
 * fallo es seguro: una métrica sin eje no se inventa uno — su relevancia por
 * eje sale `unknown` y no se admite por eje.
 *
 * `feedback.satisfaction` va a `userValue`, que `ObjectiveAxis` tiene desde A0
 * con la nota «sin medición todavía». Es la primera medición que le llega.
 */
export const EJE_DE_METRICA: Readonly<Record<string, ObjectiveAxis>> = Object.freeze({
  'result.latencyMs': 'latency',
  'result.costUsd': 'cost',
  'result.quality': 'quality',
  'outcome.success': 'reliability',
  'verification.passed': 'quality',
  'recovery.succeeded': 'reliability',
  'strategy.succeeded': 'successProbability',
  'feedback.satisfaction': 'userValue',
});

/** Qué eje informa una métrica. `undefined` = no se sabe, y no se inventa. */
export const ejeDeMetrica = (
  metric: string,
  extra?: Readonly<Record<string, ObjectiveAxis>>,
): ObjectiveAxis | undefined => extra?.[metric] ?? EJE_DE_METRICA[metric];

/* ── El ámbito ────────────────────────────────────────────────────────────── */

/**
 * CÓMO ENCAJA EL ÁMBITO DE UNA EVIDENCIA CON EL DE UNA DECISIÓN.
 *
 *   exact     dicen lo mismo, campo a campo.
 *   narrower  la evidencia es MÁS concreta: habla de lo que la decisión habla
 *             y además precisa algo —un proveedor, un modelo—. Sirve.
 *   broader   la evidencia es MÁS general: habla de toda la capacidad y la
 *             decisión es sobre un proveedor. NO sirve por defecto.
 *   conflict  hablan de cosas distintas: otra capacidad, otro proveedor.
 *
 * `broader` no se admite sin permiso EXPLÍCITO, y es la regla que el brief
 * pedía: una señal general no contamina una concreta sin una regla de
 * transferencia declarada. Que «video.generate suele tardar 40 s» no dice nada
 * de un proveedor concreto — puede ser el que tira de la media hacia arriba.
 */
export type EncajeDeAmbito = 'exact' | 'narrower' | 'broader' | 'conflict';

/*
 * Los campos que cuentan para el ámbito son EXACTAMENTE los de la clave de
 * agregación de A7, y se leen de su propia lista (`ORDEN_DE_CLAVE`). Una copia
 * aquí acabaría divergiendo de aquella en cuanto una de las dos cambiara.
 */
export const encajeDeAmbito = (
  evidencia: AmbitoDeEvento | undefined,
  decision: AmbitoDeEvento | undefined,
): EncajeDeAmbito => {
  let masConcreta = false;
  let masGeneral = false;
  for (const k of ORDEN_DE_CLAVE) {
    const e = typeof evidencia?.[k] === 'string' && evidencia[k] ? evidencia[k] : undefined;
    const d = typeof decision?.[k] === 'string' && decision[k] ? decision[k] : undefined;
    if (e !== undefined && d !== undefined && e !== d) return 'conflict';
    if (e !== undefined && d === undefined) masConcreta = true;
    if (e === undefined && d !== undefined) masGeneral = true;
  }
  /* Más concreta en un campo y más general en otro es hablar de otra cosa:
   * «este proveedor, en cualquier capacidad» frente a «esta capacidad, con
   * cualquier proveedor». No encaja en ninguna dirección. */
  if (masConcreta && masGeneral) return 'conflict';
  if (masGeneral) return 'broader';
  if (masConcreta) return 'narrower';
  return 'exact';
};

/* ── Lo que pide una decisión ─────────────────────────────────────────────── */

/**
 * QUÉ LE EXIGE ESTA DECISIÓN A LA EVIDENCIA.
 *
 * TODO opcional, y ninguno tiene valor por defecto: la regla de `minConfidence`
 * aplicada sin excepciones. Lo que no se declara se informa en cada admisión y
 * NO descarta nada. Un umbral por defecto aquí sería un umbral universal
 * inventado, que es justo lo que esa regla prohíbe.
 *
 * Lo que sí descarta siempre, se declare o no, es lo que no es evidencia: un
 * hecho que A7 ya no validaría, algo fuera de ámbito, algo con datos de una
 * persona. Eso no es un umbral de la decisión: es la definición de evidencia.
 */
export interface RequisitosDeEvidencia {
  /** Confianza mínima, 0–1. La misma semántica que `AlgorithmConstraints.minConfidence`. */
  minConfidence?: number;
  /** Cuán vieja puede ser, en ms, contando desde la última observación. */
  maxAgeMs?: number;
  /** Cuántas observaciones como mínimo, además del mínimo de A7. */
  minSampleSize?: number;
  /** ¿Se admite evidencia MÁS GENERAL que la decisión? La regla de transferencia explícita. */
  allowBroaderScope?: boolean;
}

/** Quién va a leer esto. Del mismo vocabulario que `DescriptorDeMetrica.target` (A7). */
export type Consumidor = 'decision' | 'strategy' | 'optimization' | 'verification' | 'recovery' | 'router';

/* ── El resultado de admitir ──────────────────────────────────────────────── */

/**
 * QUÉ SE HIZO CON CADA PIEZA DE EVIDENCIA.
 *
 * Siete estados, y cerrada a propósito —como `EstadoDeVerificacion`—: quien la
 * lea tiene que contemplarlos todos, porque un estado desconocido tratado con
 * un `default` es la manera más barata de admitir lo que no debía.
 *
 * El ORDEN de gravedad importa cuando hay varios motivos: una pieza fuera de
 * ámbito es irrelevante aunque además esté rancia, y lo que se dice primero es
 * lo que la hace inútil para esta decisión. Todos los motivos se conservan.
 */
export type EstadoDeAdmision =
  /* Sirve: en ámbito, válida ahora y a la altura de lo que se declaró. */
  | 'admitted'
  /* Lleva algo que no puede llevar: datos de una persona, una cuenta. */
  | 'filtered'
  /* Habla de otra cosa, o de algo más general sin permiso para transferirlo. */
  | 'out_of_scope'
  /* Valió, y ha caducado. */
  | 'stale'
  /* Se contradice o se mueve demasiado para sostener una conclusión. */
  | 'conflicted'
  /* No alcanza: poca muestra, poca confianza, sin base. */
  | 'insufficient'
  /* No se sabe interpretarla para esta decisión. */
  | 'unknown';

export const GRAVEDAD_DE_ADMISION: readonly EstadoDeAdmision[] = Object.freeze(
  ['filtered', 'out_of_scope', 'stale', 'conflicted', 'insufficient', 'unknown', 'admitted'],
);

/**
 * ENCAJE DE EJE: si la métrica habla de lo que la decisión optimiza.
 *
 * No hay «no pedido»: toda decisión tiene un objetivo en vigor, el declarado o,
 * sin declarar, el de A0 —`pesosNormalizados` con su semántica de siempre—.
 * Es la misma lectura que hacen A0, A1 y A5 al puntuar, y A8 no se inventa otra.
 */
export type EncajeDeEje = 'match' | 'other_axis' | 'unknown';

/** Encaje de consumidor: si la métrica está pensada para quien la pide. */
export type EncajeDeConsumidor = 'match' | 'other_consumer' | 'not_requested';

/**
 * UNA ADMISIÓN, CON TODA SU PROCEDENCIA.
 *
 * Los COMPONENTES de la relevancia van separados y NO se combinan en una
 * puntuación. Una fórmula que sumara encaje de ámbito, eje, frescura y
 * confianza sería un número mágico con aspecto de medida, y el consumidor
 * perdería justo lo que necesita para decidir por sí mismo.
 */
export interface Admision {
  /** La clave natural de A7. Es la identidad: no hace falta ningún hash. */
  key: string;
  metric: string;
  scope: AmbitoDeEvento;
  status: EstadoDeAdmision;
  /** TODOS los motivos, no el primero. Del vocabulario de A7, que es abierto. */
  because: readonly CodigoDeRazon[];
  /* ── La relevancia, por componentes ───────────────────────────────────── */
  scopeMatch: EncajeDeAmbito;
  axis?: ObjectiveAxis;
  axisMatch: EncajeDeEje;
  consumerMatch: EncajeDeConsumidor;
  /* ── La procedencia, recalculada en el instante de la decisión ────────── */
  value?: number;
  sampleSize: number;
  /** Epoch ms de la última observación. */
  lastObservedAt?: number;
  /** 0–1, con `frescura()` y el reloj de la decisión. */
  freshness: number;
  /** `undefined` cuando no hay dos tramos que comparar: no es «inestable». */
  stability?: number;
  trend: Tendencia;
  /** A favor y en contra, CONTADOS, no una muestra. */
  supporting: number;
  contradicting: number;
  confidence: Confidence;
  uncertainty: Uncertainty;
}

/* ── Lo que se entrega ────────────────────────────────────────────────────── */

export interface MetricasDeContexto {
  recibidas: number;
  evaluadas: number;
  duplicadas: number;
  admitidas: number;
  porEstado: Readonly<Partial<Record<EstadoDeAdmision, number>>>;
  budgetExhausted: boolean;
}

export const METRICAS_DE_CONTEXTO_CERO: Readonly<MetricasDeContexto> = Object.freeze({
  recibidas: 0, evaluadas: 0, duplicadas: 0, admitidas: 0, porEstado: Object.freeze({}), budgetExhausted: false,
});

/**
 * QUÉ SE LE CONTESTA A UNA DECISIÓN CUANDO NO HAY CON QUÉ.
 *
 * Tres respuestas distintas, porque llevan a acciones distintas: sin evidencia
 * se mide; con evidencia que no alcanza se espera o se baja la exigencia; con
 * evidencia que no se sabe leer se declara la métrica. Ninguna es «usa el
 * proveedor de siempre»: ese no es un recurso de A8.
 */
export type CierreDeContexto =
  /* Hay evidencia admitida. */
  | 'admitted'
  /* No llegó ninguna pieza de evidencia. */
  | 'no_evidence'
  /* Llegó, pero ninguna pasó. */
  | 'insufficient_evidence'
  /* Llegó, y ninguna se pudo interpretar para esta decisión. */
  | 'unknown';
