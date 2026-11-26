/*
 * CATALÁN — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo común a los cuatro archivos:
 *  · Las opciones llegan con su artículo, sin emoji y con minúscula inicial. Como delante de un hueco el catalán no puede
 *    contraer ni apostrofar solo («de el bany», «de un envàs»), esos huecos van como objeto directo o detrás de «per a»
 *    cuando solo pueden llegar con «un», «una» o sin artículo.
 *  · Weë habla en primera persona y con «tu», como el resto de la app; los pasos, que también son títulos, van en infinitivo.
 *  · `comoNoSabias` dice «Com que no ho tenies clar», que no marca el género de quien lee.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Estàndard',
  calidadAlta: 'Alta qualitat',
  calidadMaxima: 'Màxima qualitat',
  comoNoSabias: 'Com que no ho tenies clar, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
