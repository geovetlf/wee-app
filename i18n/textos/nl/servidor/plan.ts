/*
 * NEERLANDÉS — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Un adjetivo neerlandés cambia delante del sustantivo («modern» / «moderne stijl») y el hueco no puede cambiar, así que
 * los adjetivos entran como predicado o etiqueta: «in de stijl {{estilo}}», «een toon die {{tono}} klinkt», «(stijl:
 * pop, sfeer: vrolijk)». Los pasos, que también son títulos, no empiezan por un hueco: quedaría en minúscula.
 * `comoNoSabias` empieza por una subordinada, así que cada `…Decision…` empieza por el verbo («begin ik met…»).
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standaard',
  calidadAlta: 'Hoge kwaliteit',
  calidadMaxima: 'Maximale kwaliteit',
  comoNoSabias: 'Omdat je het nog niet zeker wist, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
