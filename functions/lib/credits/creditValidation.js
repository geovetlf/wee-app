"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLimit = exports.cleanText = exports.assertService = exports.assertRequestId = exports.assertAmount = exports.assertUserId = exports.MAX_AMOUNT = exports.toHttpsError = exports.CreditError = void 0;
const https_1 = require("firebase-functions/v2/https");
const creditCosts_1 = require("./creditCosts");
class CreditError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CreditError';
    }
}
exports.CreditError = CreditError;
/** Traduce un CreditError a HttpsError para las callables (el cliente recibe code + details). */
const toHttpsError = (error) => {
    if (error instanceof https_1.HttpsError)
        return error;
    if (error instanceof CreditError) {
        const map = {
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
        return new https_1.HttpsError(map[error.code], error.code, Object.assign({ code: error.code }, error.details));
    }
    const message = error instanceof Error ? error.message : String(error);
    return new https_1.HttpsError('internal', message);
};
exports.toHttpsError = toHttpsError;
exports.MAX_AMOUNT = 1000000;
const REQUEST_ID = /^[A-Za-z0-9_.:-]{4,160}$/;
const assertUserId = (userId) => {
    if (typeof userId !== 'string' || !userId.trim() || userId.length > 128)
        throw new CreditError('INVALID_REQUEST', 'userId inválido');
    return userId;
};
exports.assertUserId = assertUserId;
/** Monto entero positivo dentro de límites. */
const assertAmount = (amount) => {
    const n = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > exports.MAX_AMOUNT)
        throw new CreditError('INVALID_AMOUNT', 'El monto debe ser un entero positivo', { amount });
    return n;
};
exports.assertAmount = assertAmount;
const assertRequestId = (requestId) => {
    if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId))
        throw new CreditError('INVALID_REQUEST', 'requestId inválido (4–160 caracteres: letras, números, _ . : -)', { requestId });
    return requestId;
};
exports.assertRequestId = assertRequestId;
const assertService = (service) => {
    if (!(0, creditCosts_1.isCreditService)(service))
        throw new CreditError('INVALID_SERVICE', `Servicio desconocido: ${String(service)}`, { service });
    return service;
};
exports.assertService = assertService;
const cleanText = (value, max = 140, fallback = '') => {
    if (typeof value !== 'string')
        return fallback;
    const text = value.trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, max) : fallback;
};
exports.cleanText = cleanText;
const assertLimit = (value, fallback = 50, max = 200) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0)
        return fallback;
    return Math.min(Math.floor(n), max);
};
exports.assertLimit = assertLimit;
//# sourceMappingURL=creditValidation.js.map