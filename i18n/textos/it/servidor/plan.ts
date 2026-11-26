/*
 * ITALIANO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción italiana que eligió la persona (`opciones.ts`, sin
 * emoji y con minúscula inicial) o con lo que escribió ella, tal cual. Como el italiano no puede contraer delante de un
 * hueco («di il soggiorno»), esos huecos van detrás de «per», como objeto directo o detrás de dos puntos. Weë habla en
 * primera persona y con «tu», como el resto de la app; los pasos, que también son títulos, van en infinitivo.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Alta qualità',
  calidadMaxima: 'Massima qualità',
  comoNoSabias: 'Visto che avevi dubbi, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
