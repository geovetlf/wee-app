/*
 * WEE AI EVALUATION ENGINE — HOLDOUT y CONTAMINACIÓN. Son los del motor común (functions/src/evals/motor/holdout.ts):
 * la clave común de un caso, la detección de solapes y la carga sellada con permiso. Aquí solo se reexportan.
 */
import { motor } from './motor.mjs';

export const { claveDeCaso, detectarContaminacion, selloDeHoldout, cargarHoldout } = motor('holdout');
