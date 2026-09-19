import { WeeErrorCode } from './errors';
import { CoreCapabilityId } from './registry/capabilities';

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
  /**
   * LA CUENTA. Se llama `userId` por historia, no por precisión.
   *
   * En Weë una persona tiene una cuenta y varias entidades, y este campo
   * siempre llevó la CUENTA. El nombre se queda —lo leen todas las capas— y
   * `accountId` es su sinónimo explícito para quien escriba código nuevo.
   */
  userId: string;
  /** La cuenta, dicha con su nombre. Mismo valor que `userId`. */
  accountId?: string;
  /**
   * QUÉ ENTIDAD ESTÁ ACTUANDO. Contexto, nunca propiedad.
   *
   * El Perfil Real, el Perfil Weë o una Página. Existe aquí porque la cadena
   * de atribución que el libro ya sabía leer (`FinancialAttribution`) empezaba
   * demasiado tarde: nacía en el asiento, cuando lo que hacía falta era que
   * viajara desde la primera capa hasta la última.
   */
  entityId?: string;
  entityType?: string;
  /** La operación de negocio, cuando agrupa varias peticiones. */
  operationId?: string;
  sessionId?: string;
  runId?: string;
  stepId?: string;
  /**
   * QUÉ PRODUCTO lo pidió: la app principal o una de las independientes.
   *
   * No es un proveedor, ni un modelo, ni una capacidad: es el anfitrión desde
   * el que entró la persona. El Core no conoce ninguno —aquí no hay ni puede
   * haber una lista de productos—, solo lo transporta, porque todas las apps
   * comparten la MISMA infraestructura y la misma cuenta.
   *
   * Existe para que el día que haya que atribuir una operación —quién, desde
   * qué producto, en qué Workplace, con qué capacidad— no falte justo la
   * mitad de la respuesta. Sin él se perdía en el primer lector.
   */
  appId?: string;
  /**
   * Desde dónde se pidió: 'design', 'brain'… El Workplace activo.
   *
   * SINÓNIMO HEREDADO. El Job Engine, el Router y el libro llaman a esto
   * `workspaceId`, y ese desajuste no era cosmético: la traza salía de Weë
   * Brain con `workplace: 'brain'` y llegaba a capas que solo leían
   * `workspaceId`, así que la atribución de Workplace se perdía entera en la
   * frontera. Los dos campos se quedan —quitar este rompería lo que ya
   * escribe— y `workspaceDe()` lee el que haya.
   */
  workplace?: string;
  /** El mismo concepto, con el nombre que usan Job Engine, Router y libro. */
  workspaceId?: string;
  projectId?: string;
}

/**
 * El Workplace, se llame como se llame en quien lo escribió.
 *
 * Existe para que nadie vuelva a resolver este desajuste con un `||` suelto en
 * el sitio donde le hizo falta, que es exactamente como los dos nombres
 * llegaron a convivir.
 */
export const workspaceDe = (t: Pick<TraceContext, 'workplace' | 'workspaceId'> | undefined): string | undefined =>
  t?.workspaceId ?? t?.workplace;

/** La cuenta de una traza, se haya escrito con el nombre nuevo o con el viejo. */
export const cuentaDeTraza = (t: Pick<TraceContext, 'userId' | 'accountId'> | undefined): string | undefined =>
  t?.accountId ?? t?.userId;

/**
 * Lo que se anota cuando una operación termina, sea bien o mal.
 *
 * `capability` es del CATÁLOGO (`CoreCapabilityId`), no solo de lo enrutable:
 * una operación sobre una capacidad declarada que aún no tiene matriz también
 * termina —fallando— y también hay que poder anotarla. Es un ensanchamiento
 * compatible: `CapabilityId` está contenida por construcción.
 */
export interface OperationTrace extends TraceContext {
  capability: CoreCapabilityId;
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
