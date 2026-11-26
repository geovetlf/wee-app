/*
 * HÚNGARO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Nunca se pega un sufijo a un {{hueco}}: lo que la persona elige entra en nominativo, detrás de dos puntos o entre
 * paréntesis («ehhez: egy csomagolás»), o delante de una palabra que lleva ella el sufijo («{{estilo}} stílusban»).
 * Weë habla en primera persona y tutea; los pasos, que también son títulos, van como sustantivo de acción.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Magas minőség',
  calidadMaxima: 'Maximális minőség',
  comoNoSabias: 'Mivel nem voltál biztos benne, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
