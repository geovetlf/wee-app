/*
 * FILIPINO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`): la explicación, los pasos y
 * las etiquetas de calidad del presupuesto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El servidor escribe el plan en español y la app lo reconoce y pinta esto (`i18n/servidor.ts`). Cada `{{x}}` se
 * llena con una pieza de esta sección, con la opción FILIPINA que eligió la persona (`opciones.ts`, sin emoji) o con
 * lo que escribió ella, tal cual. Las frases de cada experiencia están en los cuatro archivos de `./plan/`, con sus
 * decisiones en la cabecera de cada uno; aquí solo vive lo común a todas.
 *
 * Las calidades son tres fichas bajo «KALIDAD», del mismo molde que `studio.valStandard` / `studio.valHigh`:
 * «Standard» (la palabra que se usa en Filipinas, glosario § 11.11), «Mataas na kalidad» y «Pinakamataas na kalidad».
 *
 * `comoNoSabias` es la coletilla que el servidor añade por cada «No sé»: «Dahil hindi ka sigurado, {{decision}}.»
 * (sin género, como todo el filipino; «Como no estabas seguro/a» no necesita barra). Detrás de la coma va una pieza
 * `<experiencia>Decision…` de `./plan/`, en minúscula y sin punto, que tiene que leerse sola como el resto de la
 * frase: una oración con el verbo delante y Weë en primera persona («pumili ako ng masiglang pop na istilo»,
 * «sisimulan ko sa sala») o un complemento suelto cuando el español lo pone así («nang walang pagmamadali»).
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Mataas na kalidad',
  calidadMaxima: 'Pinakamataas na kalidad',
  comoNoSabias: 'Dahil hindi ka sigurado, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
