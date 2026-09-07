"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDataUri = exports.MAX_INPUT_BYTES = exports.storageBucket = exports.env = exports.sleep = exports.NotConfiguredError = exports.ProviderError = void 0;
exports.fetchJson = fetchJson;
exports.fetchBytes = fetchBytes;
exports.pollUntil = pollUntil;
exports.downloadUrlFor = downloadUrlFor;
exports.saveGeneratedFile = saveGeneratedFile;
exports.persistRemoteFile = persistRemoteFile;
exports.persistBase64 = persistBase64;
exports.parseStorageUrl = parseStorageUrl;
exports.readImage = readImage;
const crypto_1 = require("crypto");
const storage_1 = require("firebase-admin/storage");
/**
 * Utilidades compartidas por los adaptadores: HTTP con tiempo límite,
 * espera de tareas asíncronas, lectura de imágenes de entrada y guardado de
 * resultados en Storage (el sistema de archivos de Weë: Firebase Storage).
 */
class ProviderError extends Error {
    constructor(message, provider, status, retryable = true) {
        super(message);
        this.provider = provider;
        this.status = status;
        this.retryable = retryable;
        this.name = 'ProviderError';
    }
}
exports.ProviderError = ProviderError;
class NotConfiguredError extends ProviderError {
    constructor(provider, envVar) {
        super(`${provider} no está configurado (falta ${envVar})`, provider, undefined, false);
        this.name = 'NotConfiguredError';
    }
}
exports.NotConfiguredError = NotConfiguredError;
async function fetchJson(url, options) {
    var _a, _b;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (_a = options.timeoutMs) !== null && _a !== void 0 ? _a : 60000);
    try {
        const response = await fetch(url, {
            method: (_b = options.method) !== null && _b !== void 0 ? _b : (options.body ? 'POST' : 'GET'),
            headers: Object.assign({ 'Content-Type': 'application/json' }, (options.headers || {})),
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            // 4xx de configuración/validación no se reintentan con el mismo proveedor
            const retryable = response.status >= 500 || response.status === 429;
            throw new ProviderError(`${options.provider} respondió ${response.status}: ${text.slice(0, 300)}`, options.provider, response.status, retryable);
        }
        return (text ? JSON.parse(text) : {});
    }
    catch (error) {
        if (error instanceof ProviderError)
            throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new ProviderError(`${options.provider}: ${message}`, options.provider);
    }
    finally {
        clearTimeout(timer);
    }
}
async function fetchBytes(url, options) {
    var _a, _b;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (_a = options.timeoutMs) !== null && _a !== void 0 ? _a : 120000);
    try {
        const response = await fetch(url, {
            method: (_b = options.method) !== null && _b !== void 0 ? _b : (options.body ? 'POST' : 'GET'),
            headers: Object.assign(Object.assign({}, (options.body ? { 'Content-Type': 'application/json' } : {})), (options.headers || {})),
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new ProviderError(`${options.provider} respondió ${response.status}: ${text.slice(0, 300)}`, options.provider, response.status, response.status >= 500);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
    }
    catch (error) {
        if (error instanceof ProviderError)
            throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new ProviderError(`${options.provider}: ${message}`, options.provider);
    }
    finally {
        clearTimeout(timer);
    }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
/** Espera a que una tarea asíncrona termine (video, imagen en cola…). */
async function pollUntil(check, options) {
    var _a;
    const started = Date.now();
    const interval = (_a = options.intervalMs) !== null && _a !== void 0 ? _a : 5000;
    while (Date.now() - started < options.timeoutMs) {
        const state = await check();
        if (state.error)
            throw new ProviderError(`${options.provider}: ${state.error}`, options.provider);
        if (state.done)
            return state.value;
        await (0, exports.sleep)(interval);
    }
    throw new ProviderError(`${options.provider}: la tarea tardó más de ${Math.round(options.timeoutMs / 1000)} s`, options.provider);
}
const extensionFor = (contentType) => {
    if (contentType.includes('png'))
        return 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg'))
        return 'jpg';
    if (contentType.includes('webp'))
        return 'webp';
    if (contentType.includes('mp4'))
        return 'mp4';
    if (contentType.includes('mpeg') || contentType.includes('mp3'))
        return 'mp3';
    if (contentType.includes('wav'))
        return 'wav';
    if (contentType.includes('pdf'))
        return 'pdf';
    return 'bin';
};
const env = (name) => {
    const value = process.env[name];
    return value && value.trim() ? value.trim() : undefined;
};
exports.env = env;
/** Bucket de Weë: el del proyecto (FIREBASE_CONFIG) salvo que STORAGE_BUCKET diga otro. */
const storageBucket = () => ((0, exports.env)('STORAGE_BUCKET') ? (0, storage_1.getStorage)().bucket((0, exports.env)('STORAGE_BUCKET')) : (0, storage_1.getStorage)().bucket());
exports.storageBucket = storageBucket;
/** URL de descarga estable para un archivo guardado (emulador o producción). */
function downloadUrlFor(bucket, path, token) {
    const emulator = (0, exports.env)('FIREBASE_STORAGE_EMULATOR_HOST');
    const base = emulator ? `http://${emulator.replace(/^https?:\/\//, '')}` : 'https://firebasestorage.googleapis.com';
    return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
/**
 * Guarda un resultado en Storage (users/{uid}/ai-generations/…) y devuelve una
 * URL de descarga estable. Los proveedores suelen dar URLs temporales.
 */
async function saveGeneratedFile(userId, buffer, contentType, label = 'result') {
    const bucket = (0, exports.storageBucket)();
    const token = (0, crypto_1.randomUUID)();
    const path = `users/${userId}/ai-generations/${Date.now()}-${label}.${extensionFor(contentType)}`;
    await bucket.file(path).save(buffer, {
        metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
        resumable: false,
    });
    return downloadUrlFor(bucket.name, path, token);
}
/** Descarga la URL temporal de un proveedor y la guarda en Storage. */
async function persistRemoteFile(userId, url, provider, label = 'result') {
    const { buffer, contentType } = await fetchBytes(url, { provider, timeoutMs: 180000 });
    return saveGeneratedFile(userId, buffer, contentType, label);
}
/** Guarda base64 (imagen/audio devuelto en línea) en Storage. */
async function persistBase64(userId, base64, contentType, label = 'result') {
    return saveGeneratedFile(userId, Buffer.from(base64, 'base64'), contentType, label);
}
// ── Archivos de entrada (fotos que sube la persona) ─────────────────────────
/** Reconoce URLs de nuestro Storage (producción, emulador, gs://) y devuelve bucket + ruta. */
function parseStorageUrl(url) {
    const gs = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (gs)
        return { bucket: gs[1], path: decodeURIComponent(gs[2]) };
    const firebase = url.match(/^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (firebase)
        return { bucket: firebase[1], path: decodeURIComponent(firebase[2]) };
    const gcs = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?]+)/);
    if (gcs)
        return { bucket: gcs[1], path: decodeURIComponent(gcs[2]) };
    return null;
}
exports.MAX_INPUT_BYTES = 12 * 1024 * 1024;
/**
 * Lee una imagen de entrada: data URI, archivo de nuestro Storage (con el Admin
 * SDK, sin depender de tokens) o cualquier URL pública.
 */
async function readImage(url, provider) {
    if (url.startsWith('data:')) {
        const [meta, data] = url.split(',');
        const contentType = meta.slice(5).split(';')[0] || 'image/png';
        const buffer = Buffer.from(data || '', 'base64');
        if (buffer.length > exports.MAX_INPUT_BYTES)
            throw new ProviderError(`${provider}: la imagen es demasiado grande`, provider, undefined, false);
        return { buffer, contentType };
    }
    const own = parseStorageUrl(url);
    if (own) {
        try {
            const file = (0, storage_1.getStorage)().bucket(own.bucket).file(own.path);
            const [buffer] = await file.download();
            const [metadata] = await file.getMetadata().catch(() => [{ contentType: undefined }]);
            if (buffer.length > exports.MAX_INPUT_BYTES)
                throw new ProviderError(`${provider}: la imagen es demasiado grande`, provider, undefined, false);
            return { buffer, contentType: String((metadata === null || metadata === void 0 ? void 0 : metadata.contentType) || 'image/jpeg') };
        }
        catch (error) {
            if (error instanceof ProviderError)
                throw error;
            // Si el Admin SDK no puede (p. ej. bucket de otro proyecto), se intenta por HTTP
        }
    }
    const result = await fetchBytes(url, { provider, timeoutMs: 60000 });
    if (result.buffer.length > exports.MAX_INPUT_BYTES)
        throw new ProviderError(`${provider}: la imagen es demasiado grande`, provider, undefined, false);
    return { buffer: result.buffer, contentType: result.contentType.split(';')[0] || 'image/jpeg' };
}
const toDataUri = (file) => `data:${file.contentType};base64,${file.buffer.toString('base64')}`;
exports.toDataUri = toDataUri;
//# sourceMappingURL=http.js.map