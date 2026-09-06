import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';

/**
 * Utilidades compartidas por los adaptadores: HTTP con tiempo límite,
 * espera de tareas asíncronas y guardado de resultados en Storage.
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
  method?: 'GET' | 'POST' | 'DELETE';
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
      throw new ProviderError(`${options.provider} respondió ${response.status}: ${text.slice(0, 300)}`, options.provider, response.status, retryable);
    }
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ProviderError(`${options.provider}: ${message}`, options.provider);
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
      throw new ProviderError(`${options.provider} respondió ${response.status}: ${text.slice(0, 300)}`, options.provider, response.status, response.status >= 500);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ProviderError(`${options.provider}: ${message}`, options.provider);
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Espera a que una tarea asíncrona termine (video, imagen en cola…). */
export async function pollUntil<T>(
  check: () => Promise<{ done: boolean; value?: T; error?: string }>,
  options: { intervalMs?: number; timeoutMs: number; provider: string }
): Promise<T> {
  const started = Date.now();
  const interval = options.intervalMs ?? 5_000;
  while (Date.now() - started < options.timeoutMs) {
    const state = await check();
    if (state.error) throw new ProviderError(`${options.provider}: ${state.error}`, options.provider);
    if (state.done) return state.value as T;
    await sleep(interval);
  }
  throw new ProviderError(`${options.provider}: la tarea tardó más de ${Math.round(options.timeoutMs / 1000)} s`, options.provider);
}

const extensionFor = (contentType: string): string => {
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
 * Guarda un resultado en Storage (users/{uid}/ai-generations/…) y devuelve una
 * URL de descarga estable. Los proveedores suelen dar URLs temporales.
 */
export async function saveGeneratedFile(userId: string, buffer: Buffer, contentType: string, label = 'result'): Promise<string> {
  const bucket = getStorage().bucket();
  const token = randomUUID();
  const path = `users/${userId}/ai-generations/${Date.now()}-${label}.${extensionFor(contentType)}`;
  await bucket.file(path).save(buffer, {
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
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

export const env = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
};
