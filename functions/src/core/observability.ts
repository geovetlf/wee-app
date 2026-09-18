import { CapabilityId } from './capability';
import { WeeErrorCode } from './errors';

/**
 * WEE CORE — TRAZA.
 *
 * ── Qué se puede saber hoy y qué no ─────────────────────────────────────────
 *
 * El libro (`aiGenerations`) ya guarda mucho y bien: proveedor, modelo,
 * capacidad, coste del proveedor separado de los Credits cobrados, latencia,
 * intento, error. Eso no se sustituye.
 *
 * Lo que no se puede hacer es SEGUIR UNA PETICIÓN DE PUNTA A PUNTA. Hay
 * `requestId` por operación, pero nada que ate las doce generaciones de un mismo
 * anuncio, ni que relacione lo que pidió la persona con lo que acabó pagando.
 * Cuando algo sale mal en el paso nueve, reconstruir qué pasó es arqueología.
 *
 * `traceId` es eso: un hilo que atraviesa Brain, planificador, workflow, router,
 * adaptador y libro.
 *
 * ── LO QUE NUNCA ENTRA AQUÍ ─────────────────────────────────────────────────
 *
 * Ninguna credencial, ninguna clave, y nada que escriba la persona. Un registro
 * es un sitio del que se copia y se pega: lo que no esté no se filtra. Esta
 * regla ya la aplica `engine/sanitize.ts` y aquí se declara en el tipo, que es
 * más difícil de olvidar que un comentario.
 */

/** El hilo que ata todo lo de una misma petición. */
export interface TraceContext {
  /** Único por petición de la persona. Atraviesa todas las capas. */
  traceId: string;
  /** Único por operación. El mismo que ya usa el Credit Engine para idempotencia. */
  requestId: string;
  userId: string;
  sessionId?: string;
  runId?: string;
  stepId?: string;
  /** Desde dónde se pidió: 'design', 'brain'… */
  workplace?: string;
  projectId?: string;
}

/** Lo que se anota cuando una operación termina, sea bien o mal. */
export interface OperationTrace extends TraceContext {
  capability: CapabilityId;
  provider?: string;
  model?: string;
  status: 'ok' | 'error';
  errorCode?: WeeErrorCode;
  latencyMs: number;
  /** Coste del proveedor en USD. Separado de los Credits: son dos cosas. */
  providerUsd?: number;
  credits?: number;
  attempt?: number;
  at: number;
}

/**
 * Puerto de traza. Deliberadamente mínimo.
 *
 * Una interfaz de observabilidad que crece acaba siendo un segundo sistema de
 * registro. Aquí solo se puede anotar; quién lo guarda y dónde es de quien la
 * implemente.
 */
export interface Tracer {
  record(trace: OperationTrace): void | Promise<void>;
}

/**
 * Campos que NUNCA deben aparecer en una traza.
 *
 * Es una lista y no un comentario para que una prueba pueda comprobarla. Un
 * secreto en un registro es un secreto publicado: los registros se copian, se
 * exportan y se pegan en un chat de soporte.
 */
export const CAMPOS_PROHIBIDOS: readonly string[] = [
  'apiKey',
  'api_key',
  'authorization',
  'token',
  'secret',
  'password',
  'credential',
  'prompt',
  'message',
  'content',
];

/** ¿Lleva esta traza algo que no debería? */
export const trazaLimpia = (trace: Record<string, unknown>): boolean =>
  !Object.keys(trace).some((k) => CAMPOS_PROHIBIDOS.includes(k) || CAMPOS_PROHIBIDOS.includes(k.toLowerCase()));
