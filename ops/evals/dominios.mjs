/*
 * WEË AI EVALUATION ENGINE — LOS DOMINIOS DE DESARROLLO.
 *
 * El mecanismo es el del motor común (functions/src/evals/motor/dominios.ts): el contrato de dominio, el registro
 * congelado sin prototipo, `resolverDominio` (un nombre sin registrar falla cerrado) y el paso común de cada caso, en
 * el que el MOTOR comprueba lo que devuelve el dominio. Aquí solo se dice qué dominios corren las herramientas de
 * desarrollo, $0: los que deciden SIN ejecutar adaptadores. Registrar uno nuevo = un adaptador en
 * `ops/evals/dominios/` y una línea en DOMINIOS. Del dataset nunca sale código.
 */
import { motor } from './motor.mjs';
import { dominioRouter } from './dominios/router.mjs';
import { dominioAlgoritmo } from './dominios/algoritmo.mjs';

export const { validarDominio, validarSuperficie, crearRegistroDeDominios, resolverDominio, decidirCaso, calificarCaso, decidirYCalificar } = motor('dominios');

/**
 * Los dominios registrados. El Router es el primero; uno nuevo es un adaptador y una línea más aquí.
 * El segundo, el Algorithm Engine (misión de cierre, 2026-10-07): $0, sin LLM juez y EXPERIMENTAL/OBSERVACIONAL —el
 * motor está PREPARED y sin autoridad (DD-26)—: sin superficie que optimizar y solo en desarrollo, nunca en
 * `DOMINIOS_REALES`.
 */
export const DOMINIOS = crearRegistroDeDominios([dominioRouter, dominioAlgoritmo]);
