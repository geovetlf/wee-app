/*
 * WEË AI EVALUATION ENGINE — LA CORRIDA (registro, estados, idempotencia, cancelación, reproducibilidad). Es la del
 * motor común (functions/src/evals/motor/corrida.ts), la misma que persiste `evalRun` en Firestore: aquí solo se
 * reexporta, con su almacén en memoria para desarrollo.
 */
import { motor } from './motor.mjs';

export const {
  ESTADOS, ESTADOS_TERMINALES, transicionValida, claveIdempotente, huellaDeCorrida,
  crearEvalRun, transicionar, cancelar, almacenMemoria,
} = motor('corrida');
