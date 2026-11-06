/*
 * JEMER — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción jemer que eligió la persona (`opciones.ts`, sin
 * emoji) o con lo que escribió ella, tal cual. El jemer no tiene artículo, género ni caso, así que el hueco entra sin
 * concordar; va entre espacios normales y el ZWSP (U+200B) separa las demás palabras. Weë habla con «ខ្ញុំ» y «អ្នក».
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'ស្តង់ដារ',
  calidadAlta: 'គុណភាព​ខ្ពស់',
  calidadMaxima: 'គុណភាព​ខ្ពស់​បំផុត',
  comoNoSabias: 'ដោយសារ​អ្នក​មិនទាន់​ប្រាកដ {{decision}}។',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
