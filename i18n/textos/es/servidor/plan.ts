/*
 * ESPAÑOL — El plan que Weë AI enseña antes de crear: la explicación (`Plan.explainToUser`), los pasos
 * (`PlanStep.purpose`, que también son el título de cada resultado y el nombre de cada creación) y las etiquetas de
 * calidad del presupuesto.
 *
 * Lo arma el servidor (`functions/src/creator/templates.ts`, `creator/credits.ts`, `engine/imageModels.ts`) juntando
 * frases y respuestas; la app reconoce lo que llega y lo pinta en el idioma de quien mira (`i18n/servidor.ts`). Son
 * EXACTAMENTE las frases del servidor, con un hueco donde el servidor mete algo:
 *
 *  · `{{x}}` en una frase de una experiencia se rellena con la pieza `<experiencia><X>…` de esta misma sección que
 *    diga lo mismo (`designAlmaModern`), o con la opción de esa experiencia que la persona eligió, o con lo que la
 *    persona escribió, tal cual. Un hueco que se llama `contador`, `numero`, `dias`, `noches`, `cantidad` o `segundos`
 *    es un número.
 *  · `comoNoSabias` es la coletilla que el servidor añade cuando la persona contestó «No sé»; su `{{decision}}` se
 *    rellena con las piezas `<experiencia>Decision…`.
 *
 * `functions/test/i18n-servidor.test.mjs` arma TODOS los planes posibles con el servidor de verdad y falla si alguno
 * no se reconoce entero.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan = {
  calidadEstandar: 'Estándar',
  calidadAlta: 'Alta calidad',
  calidadMaxima: 'Máxima calidad',
  comoNoSabias: 'Como no estabas seguro, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
