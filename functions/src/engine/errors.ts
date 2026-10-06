import { HttpsError } from 'firebase-functions/v2/https';
import { CreditError, toHttpsError as creditsToHttpsError } from '../credits/creditValidation';
import { NotConfiguredError, ProviderError } from './http';
import { sanitizeForLog } from './sanitize';
import type { CausaDeDescarte, EstadoDeElegibilidad } from './types';

/**
 * Errores controlados del WEË AI ENGINE y de Weë Creator (docs/AI-ENGINE.md §Errores).
 * La app solo recibe un código y una frase en español; nunca claves, trazas
 * ni mensajes internos de los proveedores (esos se registran en el servidor).
 */
export type EngineErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'PROVIDER_ERROR'
  | 'GENERATION_FAILED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'DUPLICATE_REQUEST'
  | 'NOT_AVAILABLE';

export const ENGINE_MESSAGES: Record<EngineErrorCode, string> = {
  INVALID_REQUEST: 'Falta algo en tu pedido. Revísalo e inténtalo de nuevo.',
  UNAUTHORIZED: 'Inicia sesión para crear con Weë.',
  PROVIDER_ERROR: 'La IA no pudo completar tu creación esta vez. No te cobré: inténtalo de nuevo en un momento.',
  GENERATION_FAILED: 'No pude terminar tu creación. No te cobré: inténtalo de nuevo.',
  TIMEOUT: 'Tardó demasiado y lo detuve. No te cobré: inténtalo de nuevo.',
  RATE_LIMITED: 'Has hecho muchas creaciones seguidas. No te cobré: espera un momento e inténtalo de nuevo.',
  DUPLICATE_REQUEST: 'Esa creación ya está en marcha.',
  NOT_AVAILABLE: 'Esta función todavía no está disponible.',
};

type HttpsCode = 'invalid-argument' | 'unauthenticated' | 'unavailable' | 'aborted' | 'deadline-exceeded' | 'resource-exhausted' | 'already-exists' | 'failed-precondition';

const HTTPS_CODE: Record<EngineErrorCode, HttpsCode> = {
  INVALID_REQUEST: 'invalid-argument',
  UNAUTHORIZED: 'unauthenticated',
  PROVIDER_ERROR: 'unavailable',
  GENERATION_FAILED: 'aborted',
  TIMEOUT: 'deadline-exceeded',
  RATE_LIMITED: 'resource-exhausted',
  DUPLICATE_REQUEST: 'already-exists',
  NOT_AVAILABLE: 'failed-precondition',
};

export class EngineError extends Error {
  constructor(public readonly code: EngineErrorCode, message?: string, public readonly details: Record<string, unknown> = {}) {
    super(message || ENGINE_MESSAGES[code]);
    this.name = 'EngineError';
  }
}

/**
 * ¿PUDO COBRAR EL PROVEEDOR UNA GENERACIÓN QUE FALLÓ? (auditoría H0, #22)
 *
 * El libro cerraba todo fallo con `providerCost: 0`, así que `aiUsage/{día}` —de donde salen los topes de
 * gasto diario— no veía el dinero de lo que sí llegó al proveedor: una tarea de vídeo aceptada cuyo sondeo
 * falla, o una petición que se queda sin respuesta. Se distingue con lo que se sabe, sin adivinar:
 *  · 'cero': no salió nada (el proveedor no está configurado, o Weë rechazó la entrada antes de mandarla),
 *    o el proveedor la rechazó al recibirla (4xx);
 *  · 'desconocido': la tarea ya estaba aceptada (hay `providerTaskId`), se agotó el tiempo, no hubo
 *    respuesta o el proveedor falló (5xx), o algo se rompió después de una respuesta.
 * Lo desconocido se anota con su coste ESTIMADO como «en riesgo»; el coste medido sigue en 0, y los topes
 * cuentan los dos: mejor parar un poco antes que gastar de más sin verlo.
 *
 * Vive aquí, con la clasificación de errores, para que la usen los dos caminos sin arrastrar el router: el router del
 * motor (que la reexporta) y el ejecutor del Gateway del Core (`engine/gateway.ts`), que la decide con el error original
 * y la anota en el error para el conductor (RUNTIME §25c).
 */
/**
 * ¿EL PROVEEDOR YA TIENE LA TAREA? Lo dice un adaptador al avisar de su avance con el nombre que el proveedor le dio
 * (`providerTaskId`): desde ahí, un fallo pudo costar dinero (el `despachado` de `costeTrasUnFallo`). Una sola
 * definición para el router del motor y para el ejecutor del Gateway.
 */
export const tareaEnElProveedor = (meta: Record<string, unknown> | undefined): boolean =>
  typeof meta?.providerTaskId === 'string' && meta.providerTaskId.length > 0;

export const costeTrasUnFallo = (error: unknown, despachado: boolean): 'cero' | 'desconocido' => {
  if (error instanceof NotConfiguredError) return 'cero';
  if (despachado) return 'desconocido';
  if (error instanceof EngineError) return error.code === 'INVALID_REQUEST' ? 'cero' : 'desconocido';
  if (error instanceof ProviderError && typeof error.status === 'number' && error.status >= 400 && error.status < 500) return 'cero';
  return 'desconocido';
};

/**
 * POR QUÉ NO ESTÁ DISPONIBLE, dicho como lo puede saber la persona.
 *
 * «Inténtalo más tarde» solo es verdad cuando la causa es PASAJERA. Cuando lo que falta es una aprobación, una
 * activación, una jurisdicción o una opción, esperar no arregla nada, y decirlo sería mentir. Así que el motivo sale
 * de los descartes del Router —sus causas y los escalones de la regla común—, pero lo que viaja a la app es SOLO esto:
 * ni el proveedor, ni el modelo, ni la jurisdicción, ni el escalón.
 *
 *   ahora_no            algo pasajero (pausa, cupo, la IA detenida): vuelve sola
 *   en_tu_region        aquí no, y en otra jurisdicción sí lo estaría
 *   falta_tu_pais       hace falta saber el país de la cuenta (el que declara el Perfil Real), y en alguno sí lo estaría
 *   con_estas_opciones  lo pedido no lo puede hacer ninguna IA disponible; con otras opciones, quizá
 *   no_disponible       no lo está, para nadie, ahora: sin aprobar, sin activar, sin proveedor o sin configurar
 */
export type MotivoDeNoDisponible = 'ahora_no' | 'en_tu_region' | 'falta_tu_pais' | 'con_estas_opciones' | 'no_disponible';
export const MOTIVOS_DE_NO_DISPONIBLE: readonly MotivoDeNoDisponible[] = Object.freeze(['ahora_no', 'en_tu_region', 'falta_tu_pais', 'con_estas_opciones', 'no_disponible'] as const);

/** La frase de cada motivo: la que se registra y la que reconoce la app (`i18n/textos/<idioma>/servidor/motor.ts`). */
export const MENSAJE_DE_NO_DISPONIBLE: Readonly<Record<MotivoDeNoDisponible, string>> = Object.freeze({
  ahora_no: 'Esta función no está disponible en este momento. Vuelve a intentarlo dentro de un rato.',
  en_tu_region: 'Esta función no está disponible actualmente en tu región.',
  falta_tu_pais: 'Para usar esta función, indica tu país en tu Perfil Real.',
  con_estas_opciones: 'Esta función no está disponible con las opciones que elegiste. Prueba con otras.',
  no_disponible: 'Esta función no está disponible actualmente.',
});

export interface DescarteLegible {
  causa?: CausaDeDescarte;
  estado?: EstadoDeElegibilidad;
  enOtraJurisdiccion?: boolean;
}

/**
 * DE LOS DESCARTES AL MOTIVO PÚBLICO. Pura. Lo pasajero gana —si algo vuelve solo, decir «más tarde» es verdad—;
 * después, lo territorial que en otra jurisdicción sí valdría; después, lo que pidió la operación; y si no, no está.
 */
export const motivoDeNoDisponible = (descartes: readonly DescarteLegible[]): MotivoDeNoDisponible => {
  if (descartes.some((d) => d.causa === 'pasajera')) return 'ahora_no';
  const territoriales = descartes.filter((d) => d.causa === 'elegibilidad' && d.enOtraJurisdiccion === true);
  if (territoriales.some((d) => d.estado === 'JURISDICTION_UNKNOWN')) return 'falta_tu_pais';
  if (territoriales.some((d) => d.estado === 'BLOCKED_FOR_JURISDICTION' || d.estado === 'REVIEW_REQUIRED')) return 'en_tu_region';
  if (descartes.some((d) => d.causa === 'peticion')) return 'con_estas_opciones';
  return 'no_disponible';
};

/** NOT_AVAILABLE con su motivo público, y nada más en los detalles. */
export const noDisponible = (motivo: MotivoDeNoDisponible): EngineError =>
  new EngineError('NOT_AVAILABLE', MENSAJE_DE_NO_DISPONIBLE[motivo], { reason: motivo });

/**
 * LO QUE NUNCA SALE HACIA LA APP en los detalles de un error: quién era el proveedor, qué escalones de elegibilidad
 * se quedaron fuera, qué capacidad. Se registra en el servidor (saneado) y la app recibe el código y el motivo.
 */
const DETALLES_INTERNOS: readonly string[] = Object.freeze(['provider', 'elegibilidad', 'capability', 'model', 'modelo', 'jurisdicciones', 'jurisdiccion']);

/** Clasifica cualquier fallo en un código controlado (sin exponer nada interno). */
export function classifyError(error: unknown): EngineError {
  if (error instanceof EngineError) return error;
  if (error instanceof NotConfiguredError) return new EngineError('NOT_AVAILABLE');
  if (error instanceof ProviderError) {
    if (/tardó más de|timed out|timeout/i.test(error.message)) return new EngineError('TIMEOUT', undefined, { provider: error.provider });
    if (/rechazo de entrada|sensitive|moderat|InputImage|InputVideo|TaskTypeConstraint|TaskTypeMismatch/i.test(error.message)) {
      return new EngineError('INVALID_REQUEST', 'La foto o el video no se pudieron usar para generar: no se aceptan rostros reales ni ese contenido. Prueba con otra imagen o descripción.', { provider: error.provider, reason: 'input_rejected' });
    }
    return new EngineError('PROVIDER_ERROR', undefined, { provider: error.provider, retryable: error.retryable });
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/tardó más de|timeout/i.test(message)) return new EngineError('TIMEOUT');
  return new EngineError('GENERATION_FAILED');
}

/** Convierte cualquier error en HttpsError con `details.code` para la app. */
export function toEngineHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof CreditError) return creditsToHttpsError(error);
  const classified = classifyError(error);
  if (!(error instanceof EngineError)) {
    // Lo interno solo queda en el registro del servidor, y siempre sanitizado
    console.error(`WEË AI ENGINE: ${classified.code}:`, sanitizeForLog(error, 300));
  }
  const hacia = Object.fromEntries(Object.entries(classified.details).filter(([k]) => !DETALLES_INTERNOS.includes(k)));
  return new HttpsError(HTTPS_CODE[classified.code], classified.message, { code: classified.code, ...hacia });
}

export const assertText = (value: unknown, name: string, max = 4000): string => {
  if (typeof value !== 'string') throw new EngineError('INVALID_REQUEST', `Falta ${name}.`, { field: name });
  const text = value.trim();
  if (!text || text.length > max) throw new EngineError('INVALID_REQUEST', `Revisa ${name}: debe tener entre 1 y ${max} caracteres.`, { field: name });
  return text;
};
