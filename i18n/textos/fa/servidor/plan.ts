/*
 * PERSA — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Weë habla en primera persona («می‌سازم», «آماده می‌کنم») y trata de «شما», como el resto de la app. Los pasos, que
 * también son títulos, son sustantivos de acción. Ningún sufijo va pegado a un hueco: «را», «برای» y la ezafe no lo piden.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'استاندارد',
  calidadAlta: 'کیفیت بالا',
  calidadMaxima: 'بالاترین کیفیت',
  comoNoSabias: 'چون مطمئن نبودید، {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
