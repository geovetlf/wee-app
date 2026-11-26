/*
 * MONGOL — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * Los adjetivos del hueco no se declinan y van delante del nombre («{{tono}} өнгө аясаар»). Los nombres sí pedirían un
 * caso con armonía vocálica, así que entran con «гэсэн», detrás de dos puntos o entre paréntesis. Weë trata de «та»,
 * como el resto de la app; los pasos van en la forma en -х, que también es la de los títulos.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Стандарт',
  calidadAlta: 'Өндөр чанар',
  calidadMaxima: 'Хамгийн өндөр чанар',
  comoNoSabias: 'Та эргэлзэж байсан тул {{decision}}.',
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
