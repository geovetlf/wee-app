/*
 * DANÉS — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`): la explicación, los pasos y las
 * etiquetas de calidad del presupuesto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El servidor escribe el plan en español y la app lo reconoce y pinta esto (`i18n/servidor.ts`). Cada `{{x}}` se
 * llena con una pieza de esta sección, con la opción DANESA que eligió la persona (`opciones.ts`, sin emoji y con
 * minúscula inicial) o con lo que escribió ella, tal cual; por eso cada frase danesa está escrita para que esas
 * opciones —fijas, con su artículo, su género y su preposición— se lean naturales en el hueco. Las decisiones de
 * cada grupo están en la cabecera de su archivo.
 *
 * Lo común a los cuatro:
 *  · Weë habla en primera persona («jeg», como en `progreso`), con «du», en presente (guía § 2: «Jeg laver …», no
 *    «Jeg vil lave …») y en frases cortas.
 *  · Los pasos (`…Paso…`), que son también el título del resultado, el nombre de la creación y la línea de progreso,
 *    van en INFINITIVO sin «at» («Skrive manuskriptet»): los hace Weë, y un imperativo se leería como una orden.
 *  · Lo que el español pega detrás de una coma y puede traer palabras de la persona va detrás de una raya con espacios
 *    («Jeg laver 3 logoer til ”Café Sol” – med et moderne udtryk.»), el inciso de la guía (§ 5).
 *  · Comillas ”…”, compuestos juntos o con guion («trin-for-trin-opskrift», «science fiction-stil», «A4-format»),
 *    æøå, y las marcas intactas y sin declinar («Weë Music», «Weë-specialist»).
 *
 * `comoNoSabias` es la coletilla que el servidor añade por cada «No sé»: «Da du ikke var sikker, {{decision}}.».
 * Detrás de una subordinada el danés pone el verbo antes que el sujeto (inversión V2), así que TODAS las piezas
 * `<experiencia>Decision…` empiezan por el verbo conjugado y su sujeto: «valgte jeg en varm og rytmisk stil»,
 * «laver jeg den til dine sociale medier», «starter jeg med stuen».
 *
 * Las calidades son tres fichas bajo «KVALITET»: «Standard» (la palabra danesa, como `studio.valStandard`), «Høj
 * kvalitet» y «Maksimal kvalitet».
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Høj kvalitet',
  calidadMaxima: 'Maksimal kvalitet',
  comoNoSabias: 'Da du ikke var sikker, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
