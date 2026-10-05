/*
 * WEË AI EVALUATION ENGINE — PERMISOS. La matriz rol × acción y la puerta del holdout son las del motor común
 * (functions/src/evals/motor/permisos.ts): aquí solo se reexportan.
 */
import { motor } from './motor.mjs';

export const { ACCIONES, puede, accederHoldout, ROLES } = motor('permisos');
