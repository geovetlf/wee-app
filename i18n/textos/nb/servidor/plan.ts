/*
 * NORUEGO BOKMÅL — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Weë habla en primera persona y en presente («Jeg lager …»); los pasos van en infinitivo sin «å» («Skrive manus»),
 * porque son también el título del resultado. Tras la subordinada de `comoNoSabias` el noruego invierte verbo y sujeto
 * (V2), así que todas las piezas `…Decision…` empiezan por el verbo conjugado: «velger jeg …», «starter jeg med …».
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Høy kvalitet',
  calidadMaxima: 'Maksimal kvalitet',
  comoNoSabias: 'Siden du ikke var sikker, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
