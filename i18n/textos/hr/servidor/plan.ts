/*
 * CROATA — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los huecos que rellena una opción o lo que escribió la persona van detrás de dos puntos o entre paréntesis, donde el
 * nominativo no necesita caso; Weë habla en presente o futuro, sin marcar género.
 * Plural one / few / other: por eso `ConPlurales`.
 */
import { ConPlurales } from '../../ru/plurales';
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: ConPlurales<typeof import('../../es/servidor/plan').plan> = {
  calidadEstandar: 'Standardna',
  calidadAlta: 'Visoka kvaliteta',
  calidadMaxima: 'Najviša kvaliteta',
  comoNoSabias: 'Budući da još ne znaš, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
