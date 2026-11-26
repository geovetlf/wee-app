/*
 * RUMANO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción rumana que eligió la persona (`opciones.ts`, sin
 * emoji y con minúscula inicial) o con lo que escribió ella, tal cual. El rumano quita el artículo enclítico detrás de
 * preposición («pentru sufragerie», no «pentru sufrageria»), así que estos huecos van como objeto directo o detrás de dos
 * puntos. Weë habla en primera persona y de «tu»; los pasos, que también son títulos, van en infinitivo largo.
 *
 * `comoNoSabias` dice «Pentru că nu știai exact», que no marca el género de quien lee. `ConPlurales` da el `_few` que
 * pide el rumano en `plan/negocio.ts`.
 */
import { ConPlurales } from '../../ru/plurales';
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: ConPlurales<typeof import('../../es/servidor/plan').plan> = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Calitate înaltă',
  calidadMaxima: 'Calitate maximă',
  comoNoSabias: 'Pentru că nu știai exact, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
