/*
 * WEE AI EVALUATION ENGINE — PRESUPUESTO. Es el del motor común (functions/src/evals/motor/presupuesto.ts): la
 * decisión fail-closed, el acumulador y la reserva/reconciliación del gasto real. Aquí solo se reexporta. El dinero
 * de las evaluaciones es ajeno a los Credits del usuario: gasta contra la identidad `eval`.
 */
import { motor } from './motor.mjs';

export const {
  IDENTIDAD_EVAL, esIdentidadEval, pareceUsuario, decidirPresupuesto, crearAcumuladorDeGasto,
  EPSILON, microUsd, cabeLaReserva, restanteParaReservar, huboSobrecoste, excesoDeSobrecoste,
} = motor('presupuesto');
