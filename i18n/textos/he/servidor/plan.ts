/*
 * HEBREO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Weë habla en primera persona de futuro («אצור», «אכין») y de pasado («בחרתי»), que no marcan género. A quien lee no se
 * le conjuga en presente ni en imperativo: «לך/שלך», los pasados de segunda persona («ביקשת») y las formas impersonales
 * («אפשר…»). `comoNoSabias` dice «como no tenías preferencia», que se escribe igual para todos. Los pasos, que también
 * son títulos, son sustantivos de acción. Ningún hueco lleva un prefijo pegado: se usan «עבור», «את» o los dos puntos.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'רגילה',
  calidadAlta: 'איכות גבוהה',
  calidadMaxima: 'איכות מרבית',
  comoNoSabias: 'מאחר שלא הייתה לך העדפה, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
