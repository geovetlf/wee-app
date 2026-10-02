import { HttpsError } from 'firebase-functions/v2/https';
import { isCreditService, CreditService } from './creditCosts';
import { esIdDeCuenta } from '../core/identity';
import { sanitizeForLog } from '../engine/sanitize';

/**
 * Validación y errores del Credit Engine. Nada de lo que llega del cliente se
 * usa sin pasar por aquí; los montos nunca vienen del frontend.
 */
export type CreditErrorCode =
  | 'INSUFFICIENT_CREDITS'
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_AMOUNT'
  | 'INVALID_REQUEST'
  | 'INVALID_SERVICE'
  | 'TRANSACTION_NOT_FOUND'
  | 'ALREADY_REFUNDED'
  | 'NOT_REFUNDABLE'
  | 'FORBIDDEN'
  | 'PURCHASE_INVALID'
  | 'NOT_IMPLEMENTED';

export class CreditError extends Error {
  constructor(public readonly code: CreditErrorCode, message: string, public readonly details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CreditError';
  }
}

/** Traduce un CreditError a HttpsError para las callables (el cliente recibe code + details). */
export const toHttpsError = (error: unknown): HttpsError => {
  if (error instanceof HttpsError) return error;
  if (error instanceof CreditError) {
    const map: Record<CreditErrorCode, 'failed-precondition' | 'not-found' | 'invalid-argument' | 'permission-denied' | 'unimplemented'> = {
      INSUFFICIENT_CREDITS: 'failed-precondition',
      ACCOUNT_NOT_FOUND: 'not-found',
      INVALID_AMOUNT: 'invalid-argument',
      INVALID_REQUEST: 'invalid-argument',
      INVALID_SERVICE: 'invalid-argument',
      TRANSACTION_NOT_FOUND: 'not-found',
      ALREADY_REFUNDED: 'failed-precondition',
      NOT_REFUNDABLE: 'failed-precondition',
      FORBIDDEN: 'permission-denied',
      PURCHASE_INVALID: 'failed-precondition',
      NOT_IMPLEMENTED: 'unimplemented',
    };
    return new HttpsError(map[error.code], error.code, { code: error.code, ...error.details });
  }
  /*
   * UN ERROR QUE NO ES DE CREDITS NO LE CUENTA NADA AL CLIENTE (cierre post-auditoría 2026-10-01,
   * money/error-interno-al-cliente). Antes viajaba su mensaje crudo —el de Firestore, una ruta, un
   * identificador, lo que fuera—. Ahora sale un código genérico y lo interno se queda en el registro
   * del servidor, saneado con el mismo saneador que el resto (`engine/sanitize.ts`). Es la forma de
   * `moderation/index.ts` (`aHttpsError`).
   */
  console.error('CREDITS: fallo interno', sanitizeForLog(error, 300));
  return new HttpsError('internal', 'INTERNAL');
};

export const MAX_AMOUNT = 1_000_000;
const REQUEST_ID = /^[A-Za-z0-9_.:-]{4,160}$/;

/**
 * LOS CREDITS SON DE UNA CUENTA, Y SOLO UNA CUENTA ENTRA AQUÍ (Fase 11.x-4A).
 *
 * Esto aceptaba cualquier texto de hasta 128 caracteres. Las rutas de la app
 * pasan siempre `request.auth.uid`, pero las de administración pasan lo que
 * llegue en la petición: con el identificador de un Perfil Weë, el motor
 * encontraba ese documento de `users`, le abría un saldo propio y le daba la
 * bienvenida — Credits en una cara que ningún gasto puede alcanzar.
 *
 * La forma la decide el Identity Core (`esIdDeCuenta`): ni el identificador de
 * una cara, ni un número de cuenta, ni el de una entidad, ni texto suelto.
 * Que además el documento encontrado sea un Perfil Real lo comprueba el motor
 * con el resolutor canónico.
 */
export const assertAccountId = (accountId: unknown): string => {
  if (!esIdDeCuenta(accountId)) throw new CreditError('INVALID_REQUEST', 'accountId inválido');
  return accountId;
};

/** El nombre de siempre: en el Credit Engine, `userId` fue desde el principio la cuenta. */
export const assertUserId = assertAccountId;

/** Monto entero positivo dentro de límites. */
export const assertAmount = (amount: unknown): number => {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > MAX_AMOUNT) throw new CreditError('INVALID_AMOUNT', 'El monto debe ser un entero positivo', { amount });
  return n;
};

export const assertRequestId = (requestId: unknown): string => {
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) throw new CreditError('INVALID_REQUEST', 'requestId inválido (4–160 caracteres: letras, números, _ . : -)', { requestId });
  return requestId;
};

const FINGERPRINT = /^[a-f0-9]{16,128}$/;

/** La huella de una operación: la calcula el servidor que sabe qué se pide, nunca el cliente. Hexadecimal, 16–128. */
export const assertFingerprint = (fingerprint: unknown): string => {
  if (typeof fingerprint !== 'string' || !FINGERPRINT.test(fingerprint)) throw new CreditError('INVALID_REQUEST', 'Huella de operación inválida', { field: 'fingerprint' });
  return fingerprint;
};

export const assertService = (service: unknown): CreditService => {
  if (!isCreditService(service)) throw new CreditError('INVALID_SERVICE', `Servicio desconocido: ${String(service)}`, { service });
  return service;
};

export const cleanText = (value: unknown, max = 140, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const text = value.trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, max) : fallback;
};

export const assertLimit = (value: unknown, fallback = 50, max = 200): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
};
