/*
 * GRIEGO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El griego declina y el hueco no puede cambiar de caso: las opciones que entran en una frase están escritas en
 * ACUSATIVO (responden a «Ποιον χώρο;», «Την κουζίνα»), y las frases las reciben como objeto directo, detrás de «για» o
 * tras dos puntos. Los adjetivos entran detrás del sustantivo y en neutro («με ύφος φιλικό», «με στιλ μοντέρνο»), salvo
 * la voz y el ánimo, que son femeninos. `comoNoSabias` no marca el género de quien lee. Weë habla con «εσύ»; los pasos,
 * que también son títulos, van como sustantivo («Μετάφραση στα {{idioma}}»), igual que los botones de la app.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Τυπική',
  calidadAlta: 'Υψηλή ποιότητα',
  calidadMaxima: 'Μέγιστη ποιότητα',
  comoNoSabias: 'Αφού δεν το είχες ξεκάθαρο, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
