/*
 * FRANCÉS — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción francesa que eligió la persona (`opciones.ts`, sin
 * emoji y con minúscula inicial) o con lo que escribió ella, tal cual. Como delante de un hueco el francés no puede
 * contraer ni elidir solo («de le salon», «de améliorer»), las frases ponen esos huecos detrás de «pour», como objeto
 * directo o detrás de dos puntos. Weë habla en primera persona y con «tu», como el resto de la app; los pasos, que
 * también son títulos, van en infinitivo.
 *
 * `comoNoSabias` dice «Comme tu hésitais», que no marca el género de quien lee.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Haute qualité',
  calidadMaxima: 'Qualité maximale',
  comoNoSabias: 'Comme tu hésitais, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
