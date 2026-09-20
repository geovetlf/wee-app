import { createHash } from 'node:crypto';
import { Job, JobAttempt, ProviderOperationRef } from '../core';

/**
 * WEË RUNTIME — CÓMO SE ENCUENTRA Y SE LEE LO QUE DICE UN PROVEEDOR.
 *
 * Cuando una tarea sigue viva en casa del proveedor, lo único que queda de ella
 * es cómo la llama él: un `providerRef`. Con eso tienen que resolverse dos
 * preguntas que hoy no se puede responder:
 *
 *   1. «Llega un aviso sobre la tarea `cgt-123`. ¿De quién es?»
 *   2. «Este aviso, ¿ya lo atendí?»
 *
 * Aquí están las dos, y las dos son funciones puras: sin Firestore, sin reloj,
 * sin red y sin proveedor concreto. Quien las usa es el almacén (para poder
 * buscar) y la frontera que recibe los avisos.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

/* ── 1 · Encontrar el trabajo ──────────────────────────────────────────────── */

/**
 * LA CLAVE DE BÚSQUEDA. Proveedor y operación juntos, y en ese orden: dos
 * proveedores pueden llamar igual a dos tareas distintas, así que el nombre de
 * la operación por sí solo no identifica nada.
 *
 * Opaca: se compara entera, nunca por partes.
 */
export const claveDeOperacion = (providerId: string, operationId: string): string | undefined => {
  if (typeof providerId !== 'string' || typeof operationId !== 'string') return undefined;
  const p = providerId.trim();
  const o = operationId.trim();
  if (!p.length || !o.length || p.length > 64 || o.length > 256) return undefined;
  /* Sin caracteres que conviertan una clave en otra cosa: ni rutas, ni saltos de línea. */
  if (/[\s/\\]/.test(p) || /[\s/\\]/.test(o)) return undefined;
  return `${p}:${o}`;
};

/** Cuántas claves se guardan de un trabajo. El motor almacena 16 intentos; más no hay. */
export const MAX_CLAVES_POR_TRABAJO = 16;

/**
 * TODAS las operaciones de proveedor de un trabajo, no solo la última.
 *
 * Un trabajo puede haber intentado dos veces y tener dos tareas distintas en
 * casa del proveedor. Un aviso sobre la primera tiene que encontrar su trabajo
 * igual que uno sobre la segunda; quedarse solo con la última perdería la
 * mitad de los avisos, y justo la mitad que llega tarde.
 */
export const clavesDeOperacionDe = (job: Job): readonly string[] => {
  const claves: string[] = [];
  for (const intento of job.attempts ?? []) {
    const ref = intento.providerRef;
    if (!ref) continue;
    const clave = claveDeOperacion(ref.providerId, ref.operationId);
    if (clave && !claves.includes(clave)) claves.push(clave);
  }
  return Object.freeze(claves.slice(-MAX_CLAVES_POR_TRABAJO));
};

/** El intento de ESE trabajo al que se refiere una operación. Sin él, un aviso no sabe a qué intento pertenece. */
export const intentoDeLaOperacion = (job: Job, ref: ProviderOperationRef): JobAttempt | undefined => {
  const buscada = claveDeOperacion(ref.providerId, ref.operationId);
  if (!buscada) return undefined;
  return (job.attempts ?? []).find((a) => a.providerRef && claveDeOperacion(a.providerRef.providerId, a.providerRef.operationId) === buscada);
};

export type BusquedaPorOperacion =
  | { ok: true; job: Job; intento: JobAttempt }
  /* No hay ninguno. Se contesta igual que «no es tuyo»: de una operación ajena no se cuenta ni que exista. */
  | { ok: false; motivo: 'no_encontrada' }
  /*
   * Hay MÁS DE UNO. No se elige: elegir sería inventarse a cuál pertenece el
   * dinero. Es un fallo que hay que ver, no un empate que resolver.
   */
  | { ok: false; motivo: 'ambigua' }
  /* El trabajo está, pero ninguno de sus intentos es esa operación. */
  | { ok: false; motivo: 'intento_no_encontrado' };

/* ── 2 · Saber si un aviso ya se atendió ───────────────────────────────────── */

/**
 * LA IDENTIDAD DE UN AVISO, calculada y no recibida.
 *
 * Los webhooks se repiten —ModelArk reintenta tres veces si no confirmas en
 * cinco segundos— y el motor de trabajos ya sabe descartar un aviso repetido:
 * lo hace por `eventId`. Lo que faltaba es que ese identificador fuera el MISMO
 * en los tres reintentos. Si se generara al azar, los tres entrarían como
 * eventos distintos y el tercero podría mover algo que el primero ya movió.
 *
 * Así que se deriva de lo que el aviso dice de sí mismo:
 *
 *     sha256(proveedor, operación, estado, cuándo cambió)
 *
 * ── Qué garantiza, y qué no ─────────────────────────────────────────────────
 *
 * GARANTIZA que el mismo aviso repetido es el mismo evento.
 *
 * NO garantiza que dos avisos distintos sean siempre distintos: si el proveedor
 * mandara dos cambios con el mismo estado y la misma marca de tiempo, aquí se
 * colapsan en uno. Es el lado seguro —el segundo no haría nada— y es una
 * consecuencia de los datos que el proveedor da, no una garantía suya que se
 * esté suponiendo.
 *
 * SIN MARCA DE TIEMPO se degrada a (proveedor, operación, estado), y entonces
 * dos transiciones al mismo estado son indistinguibles. También es el lado
 * seguro, y también hay que saberlo.
 */
export const identidadDeEvento = (datos: {
  providerId: string;
  operationId: string;
  providerStatus: string;
  /** Cuándo lo cambió el proveedor, tal y como él lo diga. `undefined` degrada la identidad. */
  updatedAt?: number | string;
}): string | undefined => {
  const clave = claveDeOperacion(datos.providerId, datos.operationId);
  if (!clave || typeof datos.providerStatus !== 'string' || !datos.providerStatus.length) return undefined;
  const cuando = datos.updatedAt === undefined || datos.updatedAt === null || datos.updatedAt === '' ? 'sin-fecha' : String(datos.updatedAt);
  return `ev_${createHash('sha256').update(`${clave}|${datos.providerStatus}|${cuando}`, 'utf8').digest('hex').slice(0, 32)}`;
};

/** ¿La identidad de este aviso se pudo calcular con fecha, o se degradó? Para poder decirlo en los registros. */
export const identidadCompleta = (updatedAt?: number | string): boolean =>
  updatedAt !== undefined && updatedAt !== null && updatedAt !== '';
