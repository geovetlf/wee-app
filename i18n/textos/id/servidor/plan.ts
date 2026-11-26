/*
 * INDONESIO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción indonesia que eligió la persona (`opciones.ts`, sin
 * emoji y con minúscula inicial) o con lo que escribió ella, tal cual. El indonesio no tiene artículo ni caso, así que
 * los huecos entran sin concordancia. Weë habla en primera persona y con «Anda»; los pasos, que también son títulos,
 * van en imperativo base.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standar',
  calidadAlta: 'Kualitas tinggi',
  calidadMaxima: 'Kualitas maksimum',
  comoNoSabias: 'Karena Anda belum yakin, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
