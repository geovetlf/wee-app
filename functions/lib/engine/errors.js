"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertText = exports.EngineError = exports.ENGINE_MESSAGES = void 0;
exports.classifyError = classifyError;
exports.toEngineHttpsError = toEngineHttpsError;
const https_1 = require("firebase-functions/v2/https");
const creditValidation_1 = require("../credits/creditValidation");
const http_1 = require("./http");
exports.ENGINE_MESSAGES = {
    INVALID_REQUEST: 'Falta algo en tu pedido. Revísalo e inténtalo de nuevo.',
    UNAUTHORIZED: 'Inicia sesión para crear con Weë.',
    PROVIDER_ERROR: 'La IA no respondió esta vez. Inténtalo de nuevo en un momento.',
    GENERATION_FAILED: 'No pude terminar tu creación. No te cobré: inténtalo de nuevo.',
    TIMEOUT: 'Tardó demasiado y lo detuve. No te cobré: inténtalo de nuevo.',
    RATE_LIMITED: 'Has hecho muchas creaciones seguidas. Espera un momento e inténtalo de nuevo.',
    DUPLICATE_REQUEST: 'Esa creación ya está en marcha.',
    NOT_AVAILABLE: 'Esta función todavía no está disponible.',
};
const HTTPS_CODE = {
    INVALID_REQUEST: 'invalid-argument',
    UNAUTHORIZED: 'unauthenticated',
    PROVIDER_ERROR: 'unavailable',
    GENERATION_FAILED: 'aborted',
    TIMEOUT: 'deadline-exceeded',
    RATE_LIMITED: 'resource-exhausted',
    DUPLICATE_REQUEST: 'already-exists',
    NOT_AVAILABLE: 'failed-precondition',
};
class EngineError extends Error {
    constructor(code, message, details = {}) {
        super(message || exports.ENGINE_MESSAGES[code]);
        this.code = code;
        this.details = details;
        this.name = 'EngineError';
    }
}
exports.EngineError = EngineError;
/** Clasifica cualquier fallo en un código controlado (sin exponer nada interno). */
function classifyError(error) {
    if (error instanceof EngineError)
        return error;
    if (error instanceof http_1.NotConfiguredError)
        return new EngineError('NOT_AVAILABLE');
    if (error instanceof http_1.ProviderError) {
        if (/tardó más de|timed out|timeout/i.test(error.message))
            return new EngineError('TIMEOUT', undefined, { provider: error.provider });
        return new EngineError('PROVIDER_ERROR', undefined, { provider: error.provider, retryable: error.retryable });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/tardó más de|timeout/i.test(message))
        return new EngineError('TIMEOUT');
    return new EngineError('GENERATION_FAILED');
}
/** Convierte cualquier error en HttpsError con `details.code` para la app. */
function toEngineHttpsError(error) {
    if (error instanceof https_1.HttpsError)
        return error;
    if (error instanceof creditValidation_1.CreditError)
        return (0, creditValidation_1.toHttpsError)(error);
    const classified = classifyError(error);
    if (!(error instanceof EngineError)) {
        // Lo interno solo queda en el registro del servidor
        console.error(`WEË AI ENGINE: ${classified.code}:`, error instanceof Error ? error.message : error);
    }
    return new https_1.HttpsError(HTTPS_CODE[classified.code], classified.message, Object.assign({ code: classified.code }, classified.details));
}
const assertText = (value, name, max = 4000) => {
    if (typeof value !== 'string')
        throw new EngineError('INVALID_REQUEST', `Falta ${name}.`, { field: name });
    const text = value.trim();
    if (!text || text.length > max)
        throw new EngineError('INVALID_REQUEST', `Revisa ${name}: debe tener entre 1 y ${max} caracteres.`, { field: name });
    return text;
};
exports.assertText = assertText;
//# sourceMappingURL=errors.js.map