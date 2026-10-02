/**
 * WEE ALGORITHM ENGINE — A6 · EL MODELO DE RECUPERACIÓN.
 *
 * ── La palabra que es todo el contrato ──────────────────────────────────────
 *
 *   PROPONE.
 *
 * A6 no reintenta, no cambia de estrategia, no replanifica y no aborta nada.
 * Los reintentos son del Job Engine con su `RetryPolicy`, el replan es del
 * Planner, el cambio de estrategia pasa por A1 y quien ejecuta es el
 * Orchestrator. Lo que aporta esto es que la recuperación deje de ser una
 * política fija igual para todos y responda a lo que tiene delante.
 *
 * ── Y la regla que impide el bucle ──────────────────────────────────────────
 *
 *   NO TODO FALLO MERECE RECUPERACIÓN.
 *
 * Reintentar lo que no se puede reintentar es gastar el dinero de alguien dos
 * veces. Un fallo de la petición no mejora repitiéndolo, y un saldo agotado
 * tampoco. Esa pregunta YA tiene respuesta en el Core —`sePuedeReintentarConOtro`
 * y `esDeLaPeticion`, en `core/errors.ts`— y aquí se CONSULTA, no se rehace: dos
 * capas decidiendo lo mismo acaban discrepando, y la que discrepa con el dinero
 * es la cara.
 */

import { WeeErrorCode, esDeLaPeticion, sePuedeReintentarConOtro } from '../errors';
import { RetryPolicy } from '../workflow';
import { AlgorithmBudgetLimits } from './types';
import { Confidence, Evidence, Uncertainty } from './signals';
import { RecoveryKind, RecoveryProposal, Severidad } from './strategy';
import { VerificationFinding, afirmaFallo } from './verification';

/* ── Qué clase de fallo fue ───────────────────────────────────────────────── */

/**
 * LA CLASE DEL FALLO, y es una unión ABIERTA.
 *
 * Abierta, al contrario que `EstadoDeVerificacion`, y la diferencia tiene
 * motivo: los estados son el vocabulario con el que A6 CONCLUYE, y quien lo lea
 * tiene que contemplarlos todos; las clases de fallo son el vocabulario con el
 * que el mundo ROMPE, y el mundo rompe de maneras nuevas. Una clase que nadie
 * conoce se trata como `unknown`, que es un camino seguro; un estado que nadie
 * conoce se trataría como «pasa», que no lo es.
 */
export type ClaseDeFallo =
  /* Puede salir bien repitiéndolo tal cual. */
  | 'transient'
  /* La entrada está mal. Repetir da lo mismo. */
  | 'invalid_input'
  /* Se pidió algo que el resultado no trae. */
  | 'unmet_requirement'
  /* No había con qué: trabajadores, cuota, saldo. */
  | 'resource'
  | 'timeout'
  | 'provider_failure'
  /* Salió, pero no lo bastante bien. */
  | 'quality_failure'
  /* Las piezas no encajan entre sí. */
  | 'consistency_failure'
  /* Algo de lo que dependía no llegó. */
  | 'dependency_failure'
  /* Se intentó nombrar una implementación, o se tocó lo que no se podía. */
  | 'authority_failure'
  /* Llegó algo, pero no tiene la forma pactada. */
  | 'malformed_result'
  /* No se sabe. Y decirlo es mejor que colocarlo en la casilla más parecida. */
  | 'unknown'
  | (string & {});

/**
 * DEL CÓDIGO DEL CORE A LA CLASE, en una tabla y solo una.
 *
 * `Record<WeeErrorCode, …>` a propósito: si mañana el Core añade un código, ESTO
 * DEJA DE COMPILAR hasta que alguien diga en qué clase cae. Un `switch` con
 * `default` se habría tragado el código nuevo clasificándolo como desconocido
 * sin que nadie se enterase, que es la manera silenciosa de que la recuperación
 * empeore con el tiempo.
 */
export const CLASE_DE_CODIGO: Readonly<Record<WeeErrorCode, ClaseDeFallo>> = Object.freeze({
  INVALID_REQUEST: 'invalid_input',
  AUTH_ERROR: 'authority_failure',
  CAPABILITY_UNAVAILABLE: 'unmet_requirement',
  PROVIDER_UNAVAILABLE: 'provider_failure',
  MODEL_UNAVAILABLE: 'provider_failure',
  PROVIDER_ERROR: 'provider_failure',
  RATE_LIMIT: 'transient',
  TIMEOUT: 'timeout',
  DUPLICATE_REQUEST: 'transient',
  INSUFFICIENT_CREDITS: 'resource',
  BUDGET_EXCEEDED: 'resource',
  UNSUPPORTED_LANGUAGE: 'unmet_requirement',
  UNSUPPORTED_MODALITY: 'unmet_requirement',
  CONTENT_POLICY: 'invalid_input',
  INTERNAL_ERROR: 'unknown',
});

const esCodigoConocido = (c: string | undefined): c is WeeErrorCode =>
  typeof c === 'string' && Object.prototype.hasOwnProperty.call(CLASE_DE_CODIGO, c);

/**
 * QUÉ CLASE DE FALLO ES ESTO.
 *
 * El error del Core manda cuando lo hay: es la clasificación que ya existe y no
 * se re-decide. Cuando no lo hay —porque el fallo no es de ejecución sino de
 * VERIFICACIÓN: salió algo y no cumple— la clase sale de lo que dijeron las
 * comprobaciones. Un código que no está en la tabla es `unknown`, nunca la
 * casilla que más se le parezca.
 */
export const claseDeFallo = (
  error: { code?: string } | undefined,
  findings: readonly VerificationFinding[] = [],
): ClaseDeFallo => {
  if (error && typeof error.code === 'string') {
    return esCodigoConocido(error.code) ? CLASE_DE_CODIGO[error.code] : 'unknown';
  }
  const fallidos = (findings ?? []).filter((f) => !!f && afirmaFallo(f.status));
  if (!fallidos.length) return 'unknown';
  /* Orden canónico: la misma lista barajada tiene que dar la misma clase. */
  const tipos = [...new Set(fallidos.map((f) => f.type))].sort();
  /* El prefijo del tipo de comprobación ES la familia. Nada de adivinar por el texto. */
  if (tipos.some((t) => t.startsWith('structural.missing') || t.startsWith('structural.count'))) return 'unmet_requirement';
  if (tipos.some((t) => t.startsWith('structural.malformed') || t.startsWith('structural.fields'))) return 'malformed_result';
  if (tipos.some((t) => t.startsWith('structural.dependency'))) return 'dependency_failure';
  if (tipos.some((t) => t.startsWith('authority'))) return 'authority_failure';
  if (tipos.some((t) => t.startsWith('consistency'))) return 'consistency_failure';
  if (tipos.some((t) => t.startsWith('quality'))) return 'quality_failure';
  if (tipos.some((t) => t.startsWith('constraint'))) return 'unmet_requirement';
  return 'unknown';
};

/**
 * ¿TIENE SENTIDO VOLVER A INTENTARLO TAL CUAL?
 *
 * Para los códigos del Core se pregunta al Core: `sePuedeReintentarConOtro` es
 * la respuesta que ya existe y reimplementarla aquí al revés sería el error
 * clásico. Para lo que nace en la verificación se responde por clase, y lo que
 * no se sabe devuelve `undefined` —ni sí ni no—, porque «no se sabe» no es «no».
 */
export const sePuedeReintentar = (clase: ClaseDeFallo, codigo?: string): boolean | undefined => {
  if (esCodigoConocido(codigo)) {
    if (esDeLaPeticion(codigo)) return false;
    return sePuedeReintentarConOtro(codigo);
  }
  if (clase === 'transient' || clase === 'timeout' || clase === 'provider_failure') return true;
  if (clase === 'invalid_input' || clase === 'authority_failure' || clase === 'resource') return false;
  if (clase === 'unmet_requirement') return false;
  /* `malformed_result` NO está arriba a propósito: una respuesta truncada o un
   * JSON roto pueden salir bien a la siguiente, y afirmar que no se reintenta
   * sería tan inventado como afirmar que sí. Cae en el «depende» de abajo.
   *
   * quality_failure, consistency_failure, dependency_failure e igual. */
  return undefined;
};

/* ── Lo que se propone ────────────────────────────────────────────────────── */

/**
 * LA PROPUESTA, que EXTIENDE la de A3 en vez de duplicarla.
 *
 * A3 ya tenía `RecoveryProposal` con lo esencial —qué y por qué—. Lo que A6
 * añade es lo que solo se sabe DESPUÉS de haber ejecutado: qué clase de fallo
 * fue, a qué pasos afecta, cuánto riesgo tiene intentarlo y qué efecto cabe
 * esperar. Todo opcional, así que una propuesta de A3 sigue siendo válida.
 */
export interface PropuestaDeRecuperacion extends RecoveryProposal {
  failureClass?: ClaseDeFallo;
  /** A qué pasos concretos. Vacío o ausente = al resultado entero. */
  affectedSteps?: readonly string[];
  /** Cuánto riesgo tiene HACER esto. Ordinal, no probabilidad. */
  risk?: Severidad;
  /**
   * Qué se espera que cambie. SOLO con evidencia detrás: sin ella el campo no
   * está, que es distinto de estar a cero.
   */
  expectedEffect?: { axis: string; direction: 'mejora' | 'empeora'; because: string };
  evidence?: readonly Evidence[];
  uncertainty?: Uncertainty;
  /** Cuántos intentos van ya, si se sabe. Sin esto no hay manera de parar. */
  attempt?: number;
}

/** Las que A6 puede proponer, y ni una más. Ejecutarlas es de otro. */
export const RECUPERACIONES: readonly RecoveryKind[] = Object.freeze(
  ['retry', 'alternative_strategy', 'partial', 'replan', 'fallback', 'regenerate', 'reduce_scope', 'verify_again', 'abort'],
);

/* ── El historial, que es lo que impide el bucle ──────────────────────────── */

/**
 * LO QUE YA SE INTENTÓ.
 *
 * Sin esto, A6 propondría `retry` eternamente y con toda la razón cada vez: el
 * fallo sigue ahí. El bucle `retry → verify → retry` no se corta mirando el
 * fallo, se corta mirando la HISTORIA, y la historia se la tiene que contar
 * quien ejecuta, porque A6 no guarda estado entre llamadas.
 */
export interface IntentoPrevio {
  /** Qué se hizo. */
  kind: RecoveryKind;
  /** Qué falló entonces. */
  failureClass?: ClaseDeFallo;
  /** Sobre qué. Ausente = el resultado entero. */
  affectedSteps?: readonly string[];
  /** Si aquello funcionó. Ausente = no se sabe. */
  succeeded?: boolean;
}

/**
 * LA HUELLA DE UN INTENTO, para reconocer que ya se hizo.
 *
 * Por lo que el intento ES —qué se hace, sobre qué, contra qué fallo—, nunca
 * por un identificador: dos propuestas con id distinto y el mismo contenido son
 * el mismo bucle, y compararlas por id no lo vería.
 */
export const huellaDeIntento = (i: { kind: string; failureClass?: string; affectedSteps?: readonly string[] }): string =>
  [i.kind, i.failureClass ?? '?', [...(i.affectedSteps ?? [])].sort().join('+') || '*'].join('|');

export interface ContextoDeRecuperacion {
  /** Lo que ya se intentó. Vacío = primera vez. */
  previous?: readonly IntentoPrevio[];
  /** La política que manda sobre los reintentos. Se LEE, no se sustituye. */
  retry?: RetryPolicy;
  /** Existe una alternativa a la que ir, y cuál. */
  alternatives?: readonly string[];
  /** Hay un respaldo declarado. */
  hasFallback?: boolean;
  /** Lo que queda por gastar, si se sabe. */
  budget?: AlgorithmBudgetLimits;
  evidence?: readonly Evidence[];
  metadata?: Readonly<Record<string, unknown>>;
}

export type CierreDeRecuperacion =
  /* Hay propuestas. */
  | 'proposed'
  /* No hace falta: la verificación no afirma ningún fallo. */
  | 'nothing_to_recover'
  /* Se sabe que falló, pero no hay nada razonable que hacer. */
  | 'not_recoverable'
  /* Se agotaron los intentos que la política permite. */
  | 'attempts_exhausted'
  /* Se llegó al tope de cómputo. */
  | 'budget_exhausted'
  /* Lo que tocaría proponer ya se intentó. */
  | 'loop_detected'
  /* No se sabe siquiera si falló. Proponer aquí sería actuar a ciegas. */
  | 'unknown_outcome';

export interface MetricasDeRecuperacion {
  candidatos: number;
  propuestas: number;
  descartadas: number;
  buclesDetectados: number;
  intentosPrevios: number;
  budgetExhausted: boolean;
}

export const METRICAS_DE_RECUPERACION_CERO: Readonly<MetricasDeRecuperacion> = Object.freeze({
  candidatos: 0, propuestas: 0, descartadas: 0, buclesDetectados: 0, intentosPrevios: 0, budgetExhausted: false,
});

export interface AnalisisDeRecuperacion {
  contract: string;
  failureClass: ClaseDeFallo;
  /** `undefined` cuando no se sabe. Ni `true` ni `false` por comodidad. */
  recoverable?: boolean;
  proposals: readonly PropuestaDeRecuperacion[];
  discarded: readonly { kind: RecoveryKind; because: string }[];
  stoppedBecause: CierreDeRecuperacion;
  confidence: Confidence;
  uncertainty: Uncertainty;
  because: readonly string[];
  metricas: MetricasDeRecuperacion;
}

/* ── El valor de recuperarse ──────────────────────────────────────────────── */

/**
 * ¿MERECE LA PENA INTENTARLO?
 *
 * Deliberadamente NO devuelve un número: devuelve si hay algo que lo sostenga.
 * Calcular un «valor esperado de la recuperación» exigiría una probabilidad de
 * éxito, y esa probabilidad no la tiene nadie —ni A6, ni A3, ni el proveedor—.
 * Inventarla daría un número con aspecto de medido que decidiría si se gasta el
 * dinero de una persona. Cuando haya histórico, entrará como señal y esto lo
 * leerá; hasta entonces, la respuesta honesta es «con esta evidencia, sí/no/no
 * se sabe».
 */
export const valeLaPenaRecuperarse = (
  clase: ClaseDeFallo,
  ctx: ContextoDeRecuperacion | undefined,
  codigo?: string,
): { ok: true } | { ok: false; because: string } => {
  /* Aquí NO se mira si se puede reintentar, y eso costó un error: reintentar es
   * UNA recuperación de nueve, y bloquear el análisis entero porque esa concreta
   * no aplica dejaba sin proponer el replan de una salida que falta o el recorte
   * de alcance de un recurso agotado —las dos respuestas correctas para fallos
   * que, en efecto, no se reintentan—. Si un fallo no admite reintento, lo dice
   * el candidato `retry` en su aplicabilidad, que es su sitio.
   *
   * Lo que sí se mira aquí es lo único que ningún candidato puede saber por su
   * cuenta: cuántas veces se ha intentado ya. */
  const intentos = (ctx?.previous ?? []).length;
  const tope = ctx?.retry?.maxAttempts;
  if (typeof tope === 'number' && intentos >= tope) {
    return { ok: false, because: `ya van ${intentos} intentos y la política permite ${tope}` };
  }
  return { ok: true };
};
