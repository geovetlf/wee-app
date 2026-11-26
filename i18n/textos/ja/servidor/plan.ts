/*
 * JAPONÉS — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción japonesa que eligió la persona (`opciones.ts`, sin
 * emoji) o con lo que escribió ella, tal cual. Lo que entra en un hueco puede ser un nombre o una frase corta, así que
 * los huecos van delante de の o を o como etiqueta entre paréntesis («（トーン：{{tono}}）»), nunca con な ni に pegados.
 * Las explicaciones van en です・ます; los pasos, que también son títulos, en forma de diccionario y sin 。.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: '標準',
  calidadAlta: '高品質',
  calidadMaxima: '最高品質',
  comoNoSabias: '迷っているようなので、{{decision}}。',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
