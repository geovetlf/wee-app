/*
 * TURCO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción turca que eligió la persona (`opciones.ts`, sin
 * emoji y con minúscula inicial) o con lo que escribió ella, tal cual. Ningún sufijo va pegado a un hueco: la frase lo
 * pone en la palabra de detrás («{{cosa}} için», «{{estilo}} tarzda», «{{espacio}} fotoğrafına») o usa una etiqueta.
 * Weë habla en primera persona y con «sen»; los pasos, que también son títulos, son sintagmas nominales («Senaryo
 * yazımı»), porque el `-ma` con objeto («Senaryoyu yazma») se leería como un imperativo negativo.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standart',
  calidadAlta: 'Yüksek kalite',
  calidadMaxima: 'En yüksek kalite',
  comoNoSabias: 'Emin olmadığın için {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
