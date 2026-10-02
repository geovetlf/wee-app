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
 *
 * En devanagari conviven dos grafías para lo mismo, según el teclado de cada
 * cual: con nukta o sin él («फ़ोटो» / «फोटो») y con chandrabindu o con anusvara
 * («हाँ» / «हां»). Al buscar cuentan como una: se quita el nukta —el suelto,
 * U+093C, y el de las letras precompuestas U+0958–U+095F— y la chandrabindu se
 * lee como anusvara. Tampoco cuentan los enlazadores invisibles ZWJ y ZWNJ, que
 * solo cambian cómo se dibuja una letra. Todo eso es invisible para el latín, la
 * «å» sueca y las íes turcas, que quedan exactamente como estaban.
 */
export const paraBuscar = (texto: string | null | undefined): string =>
  (texto || '').toLowerCase().replace(/\u0307/g, '').replace(/\u0131/g, 'i')
    .replace(/[\u0958-\u095F]/g, (letra) => letra.normalize('NFD'))
    .replace(/[\u093C\u200C\u200D]/g, '')
    .replace(/\u0901/g, '\u0902');

/**
 * ESPACIADO ENTRE LETRAS SOLO DONDE LA ESCRITURA LO AGUANTA.
 *
 * Los rótulos pequeños llevan `letterSpacing` para que el latín en mayúsculas
 * respire. En las escrituras cuyas letras se unen —el devanagari y sus
 * hermanas de la India, por la línea de arriba; el árabe, letra con letra— ese
 * espacio parte la palabra: la línea superior de un rótulo hindi sale cortada
 * en trozos. Quien pinta un rótulo con espaciado añade `sinEspaciadoSiSeUne(texto)`
 * al final de su estilo: devuelve `{ letterSpacing: 0 }` para esas escrituras y
 * nada para las demás, así que el latín, el cirílico o el japonés quedan
 * exactamente como estaban.
 */
const SE_UNE = /[\u0600-\u06FF\u0750-\u077F\u0900-\u0DFF]/;
export const sinEspaciadoSiSeUne = (texto: string | null | undefined): { letterSpacing: number } | undefined =>
  (SE_UNE.test(texto || '') ? { letterSpacing: 0 } : undefined);
