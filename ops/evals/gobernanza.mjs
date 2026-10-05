/*
 * WEE AI EVALUATION ENGINE — GOBERNANZA DE UNA CORRIDA, en desarrollo.
 *
 * La corrida gobernada es la del motor común (functions/src/evals/motor/corredor.ts): permiso → (holdout sellado) →
 * corrida QUEUED → presupuesto FAIL-CLOSED → RUNNING → el corredor (cancelación y tope por caso) → COMPLETED /
 * CANCELLED / BUDGET_EXCEEDED. La misma que corre `evalRun` con dinero real; aquí, con el almacén en memoria, el coste
 * simulado y los dominios de desarrollo (`dominios.mjs`). El gasto se mide contra la identidad `eval`, NUNCA contra
 * Credits de usuario.
 */
import { DOMINIOS } from './dominios.mjs';
import { motor } from './motor.mjs';

const corredor = motor('corredor');

/** Corre una evaluación GOBERNADA con el registro de desarrollo (o el que se pase en `dominios`). */
export const correrEvalGobernada = (opciones = {}) => corredor.correrEvalGobernada({ ...opciones, dominios: opciones.dominios ?? DOMINIOS });
