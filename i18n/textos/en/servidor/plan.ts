/*
 * ENGLISH — El plan que Weë AI enseña antes de crear: la explicación, los pasos (que también son el título de cada
 * resultado y el nombre de cada creación) y las etiquetas de calidad. Ver `../../es/servidor/plan.ts`, que explica
 * de dónde sale cada frase y qué rellena cada `{{hueco}}`.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'High quality',
  calidadMaxima: 'Maximum quality',
  comoNoSabias: 'Since you weren’t sure, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
