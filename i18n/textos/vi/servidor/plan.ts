/*
 * VIETNAMITA — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * La app no se nombra con un pronombre: habla «Weë» y a la persona se la trata de «bạn». Los pasos, que también son
 * títulos, van con verbo y sin sujeto. Vietnamita sin plural: `_one` y `_other` dicen lo mismo.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Tiêu chuẩn',
  calidadAlta: 'Chất lượng cao',
  calidadMaxima: 'Chất lượng tối đa',
  comoNoSabias: 'Vì bạn chưa chắc, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
