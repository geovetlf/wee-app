/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción portuguesa que eligió la persona (`opciones.ts`,
 * sin emoji y con minúscula inicial) o con lo que escribió ella, tal cual. Como una opción con artículo no se contrae
 * sola («de a sala»), las frases evitan la preposición delante de esos huecos. Weë habla en primera persona y con «tu»,
 * el clítico va detrás («deixo-te») y el posesivo lleva artículo («a tua foto»); los pasos, que también son títulos,
 * van en infinitivo.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Padrão',
  calidadAlta: 'Alta qualidade',
  calidadMaxima: 'Qualidade máxima',
  comoNoSabias: 'Como não tinhas a certeza, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
