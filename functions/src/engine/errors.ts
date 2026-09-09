import { HttpsError } from 'firebase-functions/v2/https';
import { CreditError, toHttpsError as creditsToHttpsError } from '../credits/creditValidation';
import { NotConfiguredError, ProviderError } from './http';
import { sanitizeForLog } from './sanitize';

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

/** Clasifica cualquier fallo en un código controlado (sin exponer nada interno). */
export function classifyError(error: unknown): EngineError {
  if (error instanceof EngineError) return error;
  if (error instanceof NotConfiguredError) return new EngineError('NOT_AVAILABLE');
  if (error instanceof ProviderError) {
    if (/tardó más de|timed out|timeout/i.test(error.message)) return new EngineError('TIMEOUT', undefined, { provider: error.provider });
    if (/rechazo de entrada|sensitive|moderat|InputImage|InputVideo|TaskTypeConstraint|TaskTypeMismatch/i.test(error.message)) {
      return new EngineError('INVALID_REQUEST', 'La foto o el video no se pudieron usar para generar: el proveedor no acepta rostros reales ni ese contenido. Prueba con otra imagen o descripción.', { provider: error.provider, reason: 'input_rejected' });
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
  return new HttpsError(HTTPS_CODE[classified.code], classified.message, { code: classified.code, ...classified.details });
}

export const assertText = (value: unknown, name: string, max = 4000): string => {
  if (typeof value !== 'string') throw new EngineError('INVALID_REQUEST', `Falta ${name}.`, { field: name });
  const text = value.trim();
  if (!text || text.length > max) throw new EngineError('INVALID_REQUEST', `Revisa ${name}: debe tener entre 1 y ${max} caracteres.`, { field: name });
  return text;
};
