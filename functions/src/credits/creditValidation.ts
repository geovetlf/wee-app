import { HttpsError } from 'firebase-functions/v2/https';
import { isCreditService, CreditService } from './creditCosts';

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
  const message = error instanceof Error ? error.message : String(error);
  return new HttpsError('internal', message);
};

export const MAX_AMOUNT = 1_000_000;
const REQUEST_ID = /^[A-Za-z0-9_.:-]{4,160}$/;

export const assertUserId = (userId: unknown): string => {
  if (typeof userId !== 'string' || !userId.trim() || userId.length > 128) throw new CreditError('INVALID_REQUEST', 'userId inválido');
  return userId;
};

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
