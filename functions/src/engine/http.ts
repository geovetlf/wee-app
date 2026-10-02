import { randomUUID } from 'crypto';
import { sanitizeForLog } from './sanitize';
import { secretValue } from '../secrets';
import { getStorage } from 'firebase-admin/storage';

/**
 * Utilidades compartidas por los adaptadores: HTTP con tiempo límite,
 * espera de tareas asíncronas, lectura de imágenes de entrada y guardado de
 * resultados en Storage (el sistema de archivos de Weë: Firebase Storage).
 */

export class ProviderError extends Error {
  constructor(message: string, public readonly provider: string, public readonly status?: number, public readonly retryable = true) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class NotConfiguredError extends ProviderError {
  constructor(provider: string, envVar: string) {
    super(`${provider} no está configurado (falta ${envVar})`, provider, undefined, false);
    this.name = 'NotConfiguredError';
  }
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  provider: string;
}

export async function fetchJson<T = any>(url: string, options: FetchOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const response = await fetch(url, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      // 4xx de configuración/validación no se reintentan con el mismo proveedor
      const retryable = response.status >= 500 || response.status === 429;
      // El cuerpo del proveedor puede traer la cabecera que le enviamos: se censura aquí,
      // antes de que el mensaje exista, para que no llegue a ningún registro.
      throw new ProviderError(
        `${options.provider} respondió ${response.status}: ${sanitizeForLog(text)}`,
        options.provider,
        response.status,
        retryable,
      );
    }
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`${options.provider}: ${sanitizeForLog(error)}`, options.provider);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBytes(url: string, options: FetchOptions): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
  try {
    const response = await fetch(url, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new ProviderError(`${options.provider} respondió ${response.status}: ${sanitizeForLog(text)}`, options.provider, response.status, response.status >= 500);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`${options.provider}: ${sanitizeForLog(error)}`, options.provider);
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Espera a que una tarea asíncrona termine (video, imagen en cola…). */
/**
 * UNA CONSULTA DE ESTADO QUE FALLA NO MATA UNA TAREA QUE SIGUE VIVA (auditoría H0, escenario #3).
 *
 * El sondeo solo PREGUNTA por una tarea que el proveedor ya está haciendo (y
 * cobrando). Antes, un único 503, 429 o una consulta sin respuesta lanzaba fuera
 * del bucle: el trabajo fallaba y se reembolsaba mientras el proveedor seguía
 * generando, y Weë pagaba esa generación igual. Ahora un fallo pasajero del
 * proveedor (lo que `fetchJson` marca como reintentable: 5xx, 429, red) se
 * tolera hasta FALLOS_PASAJEROS_TOLERADOS veces seguidas, dentro del mismo
 * plazo. Un 4xx, cualquier otro error y una tarea que el proveedor da por
 * fallida terminan en el acto, como siempre. Nunca se vuelve a crear la tarea.
 */
export const FALLOS_PASAJEROS_TOLERADOS = 3;

export async function pollUntil<T>(
  check: () => Promise<{ done: boolean; value?: T; error?: string }>,
  options: { intervalMs?: number; timeoutMs: number; provider: string }
): Promise<T> {
  const started = Date.now();
  const interval = options.intervalMs ?? 5_000;
  let fallosSeguidos = 0;
  while (Date.now() - started < options.timeoutMs) {
    let state: { done: boolean; value?: T; error?: string };
    try {
      state = await check();
      fallosSeguidos = 0;
    } catch (error) {
      const pasajero = error instanceof ProviderError && error.retryable;
      if (!pasajero || ++fallosSeguidos > FALLOS_PASAJEROS_TOLERADOS) throw error;
      console.warn(`${options.provider}: una consulta de estado falló (${fallosSeguidos}/${FALLOS_PASAJEROS_TOLERADOS}); la tarea sigue y se vuelve a preguntar.`);
      await sleep(interval);
      continue;
    }
    if (state.error) throw new ProviderError(`${options.provider}: ${state.error}`, options.provider);
    if (state.done) return state.value as T;
    await sleep(interval);
  }
  throw new ProviderError(`${options.provider}: la tarea tardó más de ${Math.round(options.timeoutMs / 1000)} s`, options.provider);
}

export const extensionFor = (contentType: string): string => {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('pdf')) return 'pdf';
  return 'bin';
};

/**
 * Valor de una variable de entorno. En producción los secretos llegan por Cloud
 * Secret Manager: Firebase los expone como variables de entorno con el mismo
 * nombre, y si no estuvieran se piden al parámetro declarado en secrets.ts.
 * Nunca se registra ni se devuelve al cliente.
 */
export const env = (name: string): string | undefined => {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  return secretValue(name);
};

/** Bucket de Weë: el del proyecto (FIREBASE_CONFIG) salvo que STORAGE_BUCKET diga otro. */
export const storageBucket = () => (env('STORAGE_BUCKET') ? getStorage().bucket(env('STORAGE_BUCKET')) : getStorage().bucket());

/** URL de descarga estable para un archivo guardado (emulador o producción). */
export function downloadUrlFor(bucket: string, path: string, token: string): string {
  const emulator = env('FIREBASE_STORAGE_EMULATOR_HOST');
  const base = emulator ? `http://${emulator.replace(/^https?:\/\//, '')}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Guarda un resultado en Storage (users/{uid}/ai-generations/…) y devuelve una
 * URL de descarga estable. Los proveedores suelen dar URLs temporales.
 */
export async function saveGeneratedFile(userId: string, buffer: Buffer, contentType: string, label = 'result'): Promise<string> {
  const bucket = storageBucket();
  const token = randomUUID();
  const path = `users/${userId}/ai-generations/${Date.now()}-${label}.${extensionFor(contentType)}`;
  await bucket.file(path).save(buffer, {
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });
  return downloadUrlFor(bucket.name, path, token);
}

/** Descarga la URL temporal de un proveedor y la guarda en Storage. */
export async function persistRemoteFile(userId: string, url: string, provider: string, label = 'result'): Promise<string> {
  const { buffer, contentType } = await fetchBytes(url, { provider, timeoutMs: 180_000 });
  return saveGeneratedFile(userId, buffer, contentType, label);
}

/** Guarda base64 (imagen/audio devuelto en línea) en Storage. */
export async function persistBase64(userId: string, base64: string, contentType: string, label = 'result'): Promise<string> {
  return saveGeneratedFile(userId, Buffer.from(base64, 'base64'), contentType, label);
}

// ── Archivos de entrada (fotos que sube la persona) ─────────────────────────

/** Reconoce URLs de nuestro Storage (producción, emulador, gs://) y devuelve bucket + ruta. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const gs = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (gs) return { bucket: gs[1], path: decodeURIComponent(gs[2]) };
  const firebase = url.match(/^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  if (firebase) return { bucket: firebase[1], path: decodeURIComponent(firebase[2]) };
  const gcs = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?]+)/);
  if (gcs) return { bucket: gcs[1], path: decodeURIComponent(gcs[2]) };
  return null;
}

/** Máximo por archivo enviado en línea. Gemini admite 20 MB por petición completa. */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Lee una imagen de entrada: data URI, archivo de nuestro Storage (con el Admin
 * SDK, sin depender de tokens) o cualquier URL pública.
 */
/**
 * Lee un archivo que la persona subió a su carpeta de Weë Storage (foto,
 * documento o audio) y lo devuelve en memoria para enviarlo en línea al
 * proveedor. Las URLs privadas de Weë nunca salen de Weë.
 */
export async function readImage(url: string, provider: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (url.startsWith('data:')) {
    const [meta, data] = url.split(',');
    const contentType = meta.slice(5).split(';')[0] || 'image/png';
    const buffer = Buffer.from(data || '', 'base64');
    if (buffer.length > MAX_INPUT_BYTES) throw new ProviderError(`${provider}: el archivo es demasiado grande`, provider, undefined, false);
    return { buffer, contentType };
  }
  const own = parseStorageUrl(url);
  if (own) {
    try {
      const file = getStorage().bucket(own.bucket).file(own.path);
      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata().catch(() => [{ contentType: undefined }] as any);
      if (buffer.length > MAX_INPUT_BYTES) throw new ProviderError(`${provider}: la imagen es demasiado grande`, provider, undefined, false);
      return { buffer, contentType: String(metadata?.contentType || 'image/jpeg') };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      // Si el Admin SDK no puede (p. ej. bucket de otro proyecto), se intenta por HTTP
    }
  }
  const result = await fetchBytes(url, { provider, timeoutMs: 60_000 });
  if (result.buffer.length > MAX_INPUT_BYTES) throw new ProviderError(`${provider}: la imagen es demasiado grande`, provider, undefined, false);
  return { buffer: result.buffer, contentType: result.contentType.split(';')[0] || 'image/jpeg' };
}

export const toDataUri = (file: { buffer: Buffer; contentType: string }): string => `data:${file.contentType};base64,${file.buffer.toString('base64')}`;
