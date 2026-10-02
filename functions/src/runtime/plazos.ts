import { JobPolicy } from '../core';

/**
 * WEË RUNTIME — CINCO RELOJES QUE NO SON EL MISMO.
 *
 * Hoy conviven siete u ocho números repartidos por el código —900 s aquí,
 * 1 200 s allá, 1 500 s más allá— y ninguno dice de qué habla. El problema no
 * es que sean distintos: es que miden cosas distintas y se usan como si
 * midieran la misma. Aquí están separados, con nombre, y con la regla que los
 * ordena.
 *
 *   1 · VIDA DE LA TAREA EN EL PROVEEDOR
 *       Cuánto le damos al proveedor para terminar antes de que él mismo la dé
 *       por vencida. Es suya, pero la fijamos nosotros: aceptar su valor por
 *       defecto significaría que sigue trabajando —y cobrando— cuando para
 *       Weë el trabajo ya murió.
 *
 *   2 · VIDA DEL TRABAJO EN WEË
 *       Cuánto vive el trabajo en el Job Engine. Tiene que cubrir la vida de
 *       la tarea del proveedor, porque si muere antes, el resultado llega a un
 *       trabajo que ya no admite avisos.
 *
 *   3 · CONCESIÓN DEL TRABAJADOR
 *       Cuánto tiempo es «de» un proceso. **Corta y renovable, siempre.** Un
 *       trabajo puede vivir horas sin que la concesión dure horas: alargarla
 *       sería que la muerte de un proceso bloqueara el trabajo todo ese rato.
 *       Con el camino asíncrono ni siquiera hace falta: la concesión solo tiene
 *       que cubrir el envío, que son segundos.
 *
 *   4 · HORIZONTE DE RECONCILIACIÓN
 *       Hasta cuándo se le puede preguntar al proveedor por una tarea. No lo
 *       decidimos nosotros: lo decide él. Pasado, la incertidumbre es
 *       definitiva y nadie va a resolverla.
 *
 *   5 · CADUCIDAD DE LA URL DEL RESULTADO
 *       Cuánto vale el enlace que devuelve el proveedor. Es el reloj más corto
 *       de todos y el que obliga a guardar el resultado en cuanto se sabe.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 *     concesión  ≪  vida de la tarea  ≤  vida del trabajo  ≤  tope del contrato
 *     y todo lo que haya que reconciliar, dentro del horizonte del proveedor.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

/** El tope que impone el contrato del Job Engine a cualquier vida configurable. */
export const TOPE_DEL_CONTRATO_MS = 24 * 60 * 60 * 1000;

export interface PlazosDeCapacidad {
  /** 1 · Lo que se le concede al proveedor. Se le dice a él, en sus unidades. */
  vidaEnElProveedorMs: number;
  /** 2 · Lo que vive el trabajo. */
  vidaDelTrabajoMs: number;
  /** 3 · Lo que dura ser dueño de un intento. Corta. */
  concesionMs: number;
  /** El tiempo máximo de UNA llamada al proveedor. Con envío asíncrono son segundos, no minutos. */
  envioMs: number;
  /** 4 · Hasta cuándo se le puede preguntar. Lo pone el proveedor. */
  horizonteDeReconciliacionMs: number;
  /** 5 · Lo que vale el enlace del resultado. Lo pone el proveedor. */
  vidaDeLaUrlMs: number;
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/**
 * VÍDEO CON SEEDANCE (BytePlus ModelArk).
 *
 * Los dos últimos números NO los elegimos: están publicados. La ventana de
 * consulta es de siete días y el enlace del vídeo vale veinticuatro horas. Los
 * tres primeros sí, y se eligen para que encajen con ellos.
 *
 * Dos horas de tarea es holgado para un vídeo de hasta treinta segundos —el
 * plazo que usa hoy `generateVideo` es de veinticinco minutos— y deja sitio de
 * sobra para una cola del proveedor cargada, que es lo que pasa cuando se
 * alcanza el límite de tareas simultáneas: no fallan, se encolan.
 */
export const PLAZOS_DE_VIDEO: PlazosDeCapacidad = Object.freeze({
  vidaEnElProveedorMs: 2 * HORA,
  vidaDelTrabajoMs: 2 * HORA + 15 * MINUTO,
  concesionMs: MINUTO,
  envioMs: 60_000,
  /* Publicado: «You can query only task records from the past 7 days». */
  horizonteDeReconciliacionMs: 7 * 24 * HORA,
  /* Publicado: «Video URLs are valid for 24 hours». */
  vidaDeLaUrlMs: 24 * HORA,
});

export type FalloDePlazos =
  | 'concesion_no_menor'
  | 'proveedor_supera_trabajo'
  | 'trabajo_supera_el_tope'
  | 'reconciliacion_fuera_de_ventana'
  | 'envio_no_menor';

/**
 * ¿ESTOS PLAZOS SE SOSTIENEN? Pura. Devuelve lo que esté mal, no un booleano:
 * un plazo incoherente no es «inválido», es una forma concreta de perder dinero
 * o resultados, y conviene poder nombrarla.
 */
export const revisarPlazos = (p: PlazosDeCapacidad): readonly FalloDePlazos[] => {
  const fallos: FalloDePlazos[] = [];
  /* Una concesión tan larga como el trabajo convierte la muerte de un proceso en el bloqueo del trabajo. */
  if (!(p.concesionMs < p.vidaDelTrabajoMs)) fallos.push('concesion_no_menor');
  /* El envío es una llamada, no una espera: tiene que caber muy holgadamente. */
  if (!(p.envioMs < p.vidaDelTrabajoMs)) fallos.push('envio_no_menor');
  /* Si el proveedor sigue cuando el trabajo ya murió, el resultado llega a un trabajo que no lo admite. */
  if (p.vidaEnElProveedorMs > p.vidaDelTrabajoMs) fallos.push('proveedor_supera_trabajo');
  if (p.vidaDelTrabajoMs > TOPE_DEL_CONTRATO_MS) fallos.push('trabajo_supera_el_tope');
  /* Reconciliar fuera de la ventana del proveedor es preguntarle a quien ya no sabe. */
  if (p.vidaDelTrabajoMs > p.horizonteDeReconciliacionMs) fallos.push('reconciliacion_fuera_de_ventana');
  return Object.freeze(fallos);
};

/**
 * De los plazos a la política que entiende el Job Engine. Los reintentos y el
 * número de intentos guardados NO se tocan: son suyos.
 */
export const politicaDe = (p: PlazosDeCapacidad, base: JobPolicy): JobPolicy => Object.freeze({
  ...base,
  attemptTimeoutMs: p.envioMs,
  maxLifetimeMs: p.vidaDelTrabajoMs,
  leaseMs: p.concesionMs,
});

/** Lo que hay que decirle al proveedor, en sus unidades. ModelArk lo quiere en segundos. */
export const segundosParaElProveedor = (p: PlazosDeCapacidad): number => Math.floor(p.vidaEnElProveedorMs / 1000);
