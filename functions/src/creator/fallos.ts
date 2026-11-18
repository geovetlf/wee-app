import type { WeeError } from '../core';

/**
 * WEË FILMMAKER · POR QUÉ NO SALIÓ UNA GENERACIÓN, EN CINCO PALABRAS (F1-D).
 *
 * Tras el canary real (2026-09-28), un 404 de ModelArk —el modelo no estaba
 * activado en la cuenta— llegó a la app como «No se pudo preparar para
 * generarlo»: la frase de lo que no se reconoce. No decía qué pasó ni qué hacer.
 *
 * Esto convierte el error del Core —el mismo que ya guardan el trabajo y el
 * resultado del Gateway— en UNA de cinco categorías, y la app pone la frase. No
 * sale nada de dentro: ni el código HTTP, ni el adaptador, ni el mensaje del
 * proveedor, ni ningún identificador. Solo la categoría.
 *
 *   MODEL_UNAVAILABLE         el modelo no está (sin activar, apagado, o no existe)
 *   PROVIDER_TEMPORARY_ERROR  el servicio no está ahora (5xx, cuota, sin credencial)
 *   PROVIDER_REJECTED         el proveedor no aceptó ESTA petición (4xx, contenido)
 *   TIMEOUT                   tardó más de lo que se le dio, aquí o allí
 *   UNKNOWN_PROVIDER_ERROR    todo lo demás
 *
 * Es pura y no decide nada: ni reintentos, ni dinero, ni el estado del trabajo.
 * Eso lo siguen decidiendo el Job Engine y la liquidación, igual que antes.
 */

export type CategoriaDeFallo =
  | 'MODEL_UNAVAILABLE'
  | 'PROVIDER_TEMPORARY_ERROR'
  | 'PROVIDER_REJECTED'
  | 'TIMEOUT'
  | 'UNKNOWN_PROVIDER_ERROR';

export const CATEGORIAS_DE_FALLO: readonly CategoriaDeFallo[] = Object.freeze([
  'MODEL_UNAVAILABLE', 'PROVIDER_TEMPORARY_ERROR', 'PROVIDER_REJECTED', 'TIMEOUT', 'UNKNOWN_PROVIDER_ERROR',
] as CategoriaDeFallo[]);

/** Lo que empieza así lo escribió el adaptador de un rechazo de entrada (moderación, rostros, parámetros). */
const RECHAZO_DE_ENTRADA = /^rechazo de entrada/i;

const detallesDe = (e: Pick<WeeError, 'details'>): Readonly<Record<string, unknown>> =>
  (e.details && typeof e.details === 'object' ? (e.details as Record<string, unknown>) : {});

/** El estado HTTP que contestó el proveedor, si el código es uno. Los códigos de texto de un aviso no lo son. */
const estadoHttp = (e: Pick<WeeError, 'providerCode'>): number | undefined => {
  const n = typeof e.providerCode === 'string' && /^\d{3}$/.test(e.providerCode) ? Number(e.providerCode) : undefined;
  return n !== undefined && n >= 100 && n <= 599 ? n : undefined;
};

/**
 * LA CATEGORÍA DE UN ERROR DEL CORE. En este orden, porque el primero que casa gana:
 *
 *   1 · lo que tardó demasiado —el plazo de Weë, o la tarea que el proveedor dio
 *       por vencida (`expired`)—;
 *   2 · el modelo que no está: `MODEL_UNAVAILABLE` del Gateway, o un 404 al pedir
 *       la tarea —el de ModelArk cuando el modelo no está activado—;
 *   3 · el servicio que no está ahora: cuota, proveedor apagado o sin credencial,
 *       un 5xx, o lo que el propio adaptador dio por reintentable;
 *   4 · la petición que el proveedor no aceptó: contenido, parámetros, un 4xx, o
 *       el rechazo de entrada que contó en su aviso;
 *   5 · lo demás.
 */
export const categoriaDelFallo = (e: Pick<WeeError, 'code' | 'providerCode' | 'details'> | null | undefined): CategoriaDeFallo => {
  if (!e || typeof e !== 'object') return 'UNKNOWN_PROVIDER_ERROR';
  const d = detallesDe(e);
  const http = estadoHttp(e);

  if (e.code === 'TIMEOUT' || d.providerStatus === 'expired') return 'TIMEOUT';
  if (e.code === 'MODEL_UNAVAILABLE' || http === 404) return 'MODEL_UNAVAILABLE';
  if (e.code === 'RATE_LIMIT' || e.code === 'PROVIDER_UNAVAILABLE' || (http !== undefined && http >= 500)) return 'PROVIDER_TEMPORARY_ERROR';
  if (e.code === 'CONTENT_POLICY' || e.code === 'INVALID_REQUEST' || (http !== undefined && http >= 400 && http < 500)) return 'PROVIDER_REJECTED';
  if (typeof d.providerMessage === 'string' && RECHAZO_DE_ENTRADA.test(d.providerMessage)) return 'PROVIDER_REJECTED';
  if (e.code === 'PROVIDER_ERROR' && d.providerRetryable === true) return 'PROVIDER_TEMPORARY_ERROR';
  return 'UNKNOWN_PROVIDER_ERROR';
};
