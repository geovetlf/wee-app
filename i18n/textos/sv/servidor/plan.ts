/*
 * SUECO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Weë habla en primera persona y en presente («Jag skapar …», guía § 2); los pasos, que también son títulos, van en
 * infinitivo sin «att». Las `…Decision…` empiezan por «jag» y en minúscula: cierran «Du var osäker, så …», donde el
 * sueco conserva el orden sujeto-verbo y no pide la inversión V2.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Hög kvalitet',
  calidadMaxima: 'Högsta kvalitet',
  comoNoSabias: 'Du var osäker, så {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
