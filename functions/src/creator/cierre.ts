import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { operacionAbandonada } from '../core';
import { CreatorJob } from './types';

/**
 * ── EL CIERRE DE UN TRABAJO DE WEË AI (Línea B · X3/X4, 2026-10-14) ────────
 *
 * Lo comparten `creatorRun` (su propio cierre y el de un intento abandonado) y
 * el barrido programado de trabajos legacy (`creator/barrido.ts`). Vive aparte
 * para que el barrido no tenga que cargar las funciones de la app.
 */

/** Lo que vive `creatorRun` y la parte final que se reserva para liquidar (las dos salen de `creator/index.ts`). */
export const PLAZO_DE_EJECUCION_MS = 900_000;
export const RESERVA_PARA_LIQUIDAR_MS = 45_000;

/**
 * CUÁNDO UN TRABAJO ESTÁ ABANDONADO DE VERDAD.
 *
 * `deadlineAt` es el final del tiempo para TRABAJAR, no el final del proceso:
 * después de él quedan `RESERVA_PARA_LIQUIDAR_MS` en los que la invocación
 * original sigue viva y liquida. Declararlo abandonado en `deadlineAt` dejaba
 * una ventana en la que un reintento devolvía los Credits mientras el proceso
 * original los cobraba y marcaba `done`: resultado entregado y reembolsado.
 *
 * Ahora solo se da por abandonado cuando la plataforma YA lo ha matado: pasado
 * el plazo de la función entera más un margen por relojes desalineados.
 */
export const MARGEN_DE_RELOJ_MS = 30_000;
export const finDelProcesoDe = (deadlineAt: unknown): number | undefined =>
  typeof deadlineAt === 'number' && Number.isFinite(deadlineAt) ? deadlineAt + RESERVA_PARA_LIQUIDAR_MS + MARGEN_DE_RELOJ_MS : undefined;

/**
 * CERRAR UN TRABAJO ES UNA TRANSICIÓN, NO UNA ESCRITURA.
 *
 * Solo cierra quien lo tiene: el trabajo sigue `running` y con el mismo `runId`.
 * Así un cierre por abandono (otra llamada o el barrido) y el cierre del propio
 * proceso no pueden ganar los dos: el que pierde no liquida nada, y el dinero se
 * mueve exactamente una vez, por el que ganó.
 */
export const cerrarTrabajo = (ref: DocumentReference, runId: string, campos: Record<string, unknown>): Promise<boolean> =>
  getFirestore().runTransaction(async (tx) => {
    const actual = ((await tx.get(ref)).data() || {}) as Partial<CreatorJob>;
    if (actual.status !== 'running' || actual.runId !== runId) return false;
    tx.update(ref, campos);
    return true;
  });

/** El cierre por abandono: solo si sigue `running` y su proceso ya no puede estar vivo. Devuelve lo leído si lo cerró. */
export const cerrarAbandonado = (ref: DocumentReference, ahora: number, campos: Record<string, unknown>): Promise<Partial<CreatorJob> | null> =>
  getFirestore().runTransaction(async (tx) => {
    const actual = ((await tx.get(ref)).data() || {}) as Partial<CreatorJob>;
    if (!operacionAbandonada(actual.status === 'running', finDelProcesoDe(actual.deadlineAt), ahora)) return null;
    tx.update(ref, campos);
    return actual;
  });
