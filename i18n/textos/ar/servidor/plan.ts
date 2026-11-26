/*
 * ÁRABE — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`). Traducción de IA pendiente de
 * revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los plurales de Weë Travel llevan las
 * seis formas del árabe: por eso `ConPlurales`.
 *
 * Lo común a los cuatro archivos:
 *  · Weë habla en primera persona y en futuro («سأنشئ …»); los pasos van como sustantivo de acción («كتابة …»), porque
 *    son también el título del resultado.
 *  · Crear y generar son «إنشاء» (glosario); «توليد» queda para Filmmaker.
 *  · `comoNoSabias` evita el masculino de «متأكدًا» con «لعدم تأكدك»; las piezas `…Decision…` son frases completas con
 *    su verbo en primera persona.
 *  · Comillas «…» y coma «،».
 */
import { ConPlurales } from '../plurales';
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: ConPlurales<typeof import('../../es/servidor/plan').plan> = {
  calidadEstandar: 'قياسية',
  calidadAlta: 'جودة عالية',
  calidadMaxima: 'أعلى جودة',
  comoNoSabias: 'لعدم تأكدك، {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
