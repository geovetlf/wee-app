/*
 * RUSO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Cada `{{x}}` se llena con una pieza de esta sección, con la opción rusa que eligió la persona (`opciones.ts`, sin
 * emoji y con minúscula inicial) o con lo que escribió ella, tal cual. Lo que entra llega en nominativo y el ruso
 * declinaría: por eso esos huecos van detrás de dos puntos o de una etiqueta («стиль: {{estilo}}»), nunca donde pedirían
 * otro caso. Por la misma razón los `{{numero}}` sin variantes de plural van entre paréntesis o detrás de «вариантов:».
 * Trato de «вы» en minúscula; Weë evita el pasado en primera persona, que marcaría género. Los pasos van en infinitivo.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Стандартное качество',
  calidadAlta: 'Высокое качество',
  calidadMaxima: 'Максимальное качество',
  comoNoSabias: 'Раз вы не определились, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
