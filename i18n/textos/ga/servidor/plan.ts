/*
 * IRLANDÉS — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los plurales de Weë Travel llevan las
 * cinco formas del irlandés: por eso `ConPlurales`.
 * Traducción de IA pendiente de revisión humana.
 *
 * Weë habla en primera persona y en futuro («Cruthóidh mé …»); los pasos van con el nombre verbal («An script a
 * scríobh»), porque son también el título del resultado. Una preposición mutaría lo que entra por un hueco, y una
 * opción o lo que escribe la persona no puede mutar: los huecos van detrás de dos puntos o entre paréntesis
 * («stíl: {{estilo}}», «{{numero}} san iomlán»), o detrás de un sustantivo masculino que no muta el adjetivo («le ton
 * {{tono}}», «le guth {{voz}}»), o de objeto directo, en nominativo.
 */
import { ConPlurales } from '../plurales';
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: ConPlurales<typeof import('../../es/servidor/plan').plan> = {
  calidadEstandar: 'Caighdeánach',
  calidadAlta: 'Ardcháilíocht',
  calidadMaxima: 'Cáilíocht uasta',
  comoNoSabias: 'Toisc nach raibh tú cinnte, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
