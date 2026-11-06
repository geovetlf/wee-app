/*
 * POLACO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español CON PLURALES POLACOS: `ConPlurales` añade `_few` y `_many` a los plurales de Weë Travel.
 *
 * Lo común a los cuatro archivos:
 *  · Las opciones llegan en nominativo, sin emoji y con minúscula inicial. Para no tener que declinarlas, los huecos van
 *    detrás de dos puntos o entre paréntesis («Temat: dom», «(czas: pół godziny)»).
 *  · Weë habla en futuro perfectivo o en presente, nunca en pasado: el pasado polaco marca el género («zrobiłem»).
 *  · Los pasos van como sustantivo verbal («Pisanie scenariusza»): son título del resultado y también `{{proposito}}…`.
 *  · `comoNoSabias` tampoco marca el género de quien lee.
 */
import { ConPlurales } from '../../ru/plurales';
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: ConPlurales<typeof import('../../es/servidor/plan').plan> = {
  calidadEstandar: 'Standardowa',
  calidadAlta: 'Wysoka jakość',
  calidadMaxima: 'Najwyższa jakość',
  comoNoSabias: 'Ponieważ nie masz pewności, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
