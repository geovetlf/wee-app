/*
 * MAYÚSCULAS, MINÚSCULAS Y BÚSQUEDA, CON LAS REGLAS DE CADA IDIOMA.
 *
 * `toUpperCase()` y `toLowerCase()` sin locale aplican las reglas generales de
 * Unicode, y en turco están mal: la mayúscula de «i» es «İ» y la minúscula de
 * «I» es «ı». Sin locale, «istanbul» pasa a «ISTANBUL» e «İstanbul» pasa a
 * «i̇stanbul», con un punto suelto (U+0307) que además impide encontrarlo.
 *
 * No es un sistema aparte: son los métodos de siempre con el locale que ya
 * decide `IdiomaContext`, y una forma de comparar para buscar. Este archivo no
 * importa nada, así que lo pueden usar los servicios, que viven fuera de React.
 */

/** La primera letra en mayúscula con las reglas del locale: «istanbul» → «İstanbul» en turco. */
export const conMayusculaInicial = (texto: string, locale?: string): string =>
  texto ? texto.charAt(0).toLocaleUpperCase(locale) + texto.slice(1) : texto;

/**
 * Cómo se compara un texto al BUSCARLO: en minúsculas y con las cuatro íes del
 * turco (i, ı, İ, I) como una sola letra, para que «ibrahim» encuentre a
 * «İbrahim» e «ISTANBUL» a «İstanbul». No depende del idioma de la interfaz a
 * propósito: lo que se busca lo escribió una persona, en el idioma que sea. Se
 * aplica a los dos lados de la comparación, y nunca a lo que se enseña.
 */
export const paraBuscar = (texto: string | null | undefined): string =>
  (texto || '').toLowerCase().replace(/̇/g, '').replace(/ı/g, 'i');
