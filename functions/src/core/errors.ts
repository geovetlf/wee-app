/**
 * WEE CORE — ERRORES NORMALIZADOS.
 *
 * ── Qué problema resuelve ───────────────────────────────────────────────────
 *
 * Cada proveedor falla a su manera: unos devuelven 429, otros un JSON con
 * `code: "TaskTypeConstraint"`, otros cuelgan. Si esa variedad llega arriba, el
 * planificador y el orquestador acaban con un `if` por proveedor, que es
 * exactamente lo que el Core existe para impedir.
 *
 * Aquí está el vocabulario ÚNICO de fallo. Cada adaptador traduce lo suyo a uno
 * de estos códigos y a partir de ahí el sistema razona igual sea quien sea el
 * que falló.
 *
 * ── Por qué añade códigos a los que ya había ────────────────────────────────
 *
 * `engine/errors.ts` tiene ocho y funcionan: son los que la app ya entiende y no
 * se tocan. Pero no distinguen cosas que el Core SÍ necesita distinguir para
 * decidir:
 *
 *   · `CAPABILITY_UNAVAILABLE` no es `PROVIDER_UNAVAILABLE`. En el primero no
 *     hay a quién preguntar; en el segundo hay que probar el siguiente de la
 *     cadena. Hoy los dos caen en `NOT_AVAILABLE` y el router no puede
 *     distinguir «reintenta con otro» de «no insistas».
 *   · `BUDGET_EXCEEDED` no es `INSUFFICIENT_CREDITS`. Uno es un límite que puso
 *     la persona; el otro, que no le queda saldo. La salida es distinta.
 *   · `UNSUPPORTED_LANGUAGE` y `UNSUPPORTED_MODALITY` permiten degradar en vez
 *     de fallar: si el proveedor no habla ese idioma, hay una capa que adapta;
 *     si no acepta esa modalidad, hay otro candidato.
 *
 * Nada de esto cambia lo que la persona ve hoy: `DESDE_ENGINE` mapea los ocho
 * códigos existentes a los nuevos sin tocar `ENGINE_MESSAGES`.
 */

/** El vocabulario de fallo del Core. */
export type WeeErrorCode =
  /* La petición está mal formada o le falta algo. */
  | 'INVALID_REQUEST'
  /* No hay sesión, o no tiene permiso. */
  | 'AUTH_ERROR'
  /* Nadie implementa esta capacidad. No sirve reintentar. */
  | 'CAPABILITY_UNAVAILABLE'
  /* El proveedor está caído, en pausa o sin credencial. Puede haber otro. */
  | 'PROVIDER_UNAVAILABLE'
  /* El modelo concreto no existe o está desactivado. Puede haber otro del mismo proveedor. */
  | 'MODEL_UNAVAILABLE'
  /* El proveedor respondió, pero con un error suyo. */
  | 'PROVIDER_ERROR'
  /* Demasiadas peticiones. */
  | 'RATE_LIMIT'
  /* Tardó más de lo permitido y se cortó. */
  | 'TIMEOUT'
  /* Esa misma operación ya está en marcha. */
  | 'DUPLICATE_REQUEST'
  /* No le quedan Credits. */
  | 'INSUFFICIENT_CREDITS'
  /* Cabía en su saldo, pero se pasa del límite que fijó para este trabajo. */
  | 'BUDGET_EXCEEDED'
  /* Ningún proveedor de la cadena trabaja en ese idioma y no se pudo adaptar. */
  | 'UNSUPPORTED_LANGUAGE'
  /* Se mandó una foto donde solo se admite texto, o similar. */
  | 'UNSUPPORTED_MODALITY'
  /* El contenido lo rechazó una política, sea del proveedor o de Weë. */
  | 'CONTENT_POLICY'
  /* Falló Weë. Nunca se usa para tapar un fallo que sí se sabe clasificar. */
  | 'INTERNAL_ERROR';

/**
 * ¿Merece la pena reintentar con OTRO candidato?
 *
 * Es la pregunta que se hace el router, y por eso vive con los códigos y no
 * dispersa en cada punto de decisión. Ojo a las que dicen que no: sin capacidad
 * no hay a quién preguntar, y con el saldo agotado o el presupuesto excedido
 * reintentar es gastar el dinero de alguien dos veces.
 */
export const sePuedeReintentarConOtro = (code: WeeErrorCode): boolean =>
  code === 'PROVIDER_UNAVAILABLE' ||
  code === 'MODEL_UNAVAILABLE' ||
  code === 'PROVIDER_ERROR' ||
  code === 'TIMEOUT' ||
  code === 'RATE_LIMIT';

/**
 * ¿Es culpa de quien pidió?
 *
 * Sirve para lo que de verdad importa: si NO lo es, no se cobra. La regla ya la
 * cumple el sistema —«No te cobré» está en casi todos los mensajes actuales—;
 * tenerla como función evita que la próxima capa la reimplemente al revés.
 */
export const esDeLaPeticion = (code: WeeErrorCode): boolean =>
  code === 'INVALID_REQUEST' ||
  code === 'UNSUPPORTED_MODALITY' ||
  code === 'CONTENT_POLICY' ||
  code === 'INSUFFICIENT_CREDITS' ||
  code === 'BUDGET_EXCEEDED' ||
  code === 'AUTH_ERROR';

/**
 * De los ocho códigos que ya existen a los del Core.
 *
 * ADITIVO Y EN UN SOLO SENTIDO. `engine/errors.ts` sigue mandando sobre lo que
 * la persona lee; esto solo permite que el Core razone sobre un fallo que nació
 * en el motor. `GENERATION_FAILED` cae en `PROVIDER_ERROR` y no en
 * `INTERNAL_ERROR` porque es lo que es: la generación falló del lado del que
 * genera, no en Weë.
 */
export const DESDE_ENGINE: Record<string, WeeErrorCode> = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'AUTH_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  GENERATION_FAILED: 'PROVIDER_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMIT',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  NOT_AVAILABLE: 'CAPABILITY_UNAVAILABLE',
};

/** De los códigos del Credit Engine a los del Core. */
export const DESDE_CREDITS: Record<string, WeeErrorCode> = {
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  INVALID_AMOUNT: 'INVALID_REQUEST',
  INVALID_REQUEST_ID: 'INVALID_REQUEST',
  INVALID_SERVICE: 'INVALID_REQUEST',
  FORBIDDEN: 'AUTH_ERROR',
  NOT_FOUND: 'INVALID_REQUEST',
  ALREADY_REFUNDED: 'DUPLICATE_REQUEST',
};

/**
 * Un fallo, ya normalizado.
 *
 * `providerCode` guarda el código crudo del proveedor para el registro del
 * servidor. No se le enseña a nadie: existe para que un humano pueda averiguar
 * qué pasó de verdad sin que el sistema tenga que entenderlo.
 */
export interface WeeError {
  code: WeeErrorCode;
  /** Qué pieza lo detectó: 'router', 'adapter:seedance', 'credits'… */
  source: string;
  /** Código original del proveedor, si lo hubo. Solo para el registro. */
  providerCode?: string;
  /** Datos de apoyo. Nunca credenciales ni contenido de la persona. */
  details?: Record<string, unknown>;
}

export const errorDelCore = (
  code: WeeErrorCode,
  source: string,
  extra: Omit<WeeError, 'code' | 'source'> = {},
): WeeError => ({ code, source, ...extra });
