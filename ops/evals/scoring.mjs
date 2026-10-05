/*
 * WEE AI EVALUATION ENGINE — SCORING. La puntuación es la del motor común (functions/src/evals/motor/puntuacion.ts):
 * aquí solo se reexporta para las herramientas de desarrollo. Los pesos siguen entrando por `config`.
 */
import { motor } from './motor.mjs';

export const { puntuar } = motor('puntuacion');
