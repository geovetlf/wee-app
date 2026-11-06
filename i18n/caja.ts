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

/** Si el locale es griego ('el', 'el-GR', 'el-CY'). */
const esGriego = (locale?: string): boolean => String(locale || '').split(/[-_]/)[0].toLowerCase() === 'el';

/*
 * MAYÚSCULAS SOSTENIDAS EN GRIEGO: sin tono. «Ρυθμίσεις» → «ΡΥΘΜΙΣΕΙΣ», nunca «ΡΥΘΜΊΣΕΙΣ». Si la vocal acentuada iba
 * delante de una ι/υ con la que formaría diptongo, esa ι/υ recibe diéresis para que se siga leyendo aparte: «Μάιος» →
 * «ΜΑΪΟΣ», «άυλος» → «ΑΫΛΟΣ». La diéresis que ya estaba se queda («ταΐζω» → «ΤΑΪΖΩ») y la «ή» suelta —la conjunción
 * «o»— conserva su tono («Ή»), porque sin él sería el artículo. Es la regla de CLDR, la que aplica V8 con
 * `toLocaleUpperCase('el')`; está escrita aquí porque Hermes, en el teléfono, no garantiza aplicarla, y la prueba
 * `i18n-griego` comprueba que las dos digan lo mismo con cada texto del diccionario griego.
 */
const LETRA_GRIEGA = /[\u0370-\u03FF\u1F00-\u1FFF]/;
const ACENTO_GRIEGO = /[\u0300\u0301\u0342\u0313\u0314]/;
const MARCA = /\p{M}/u;
const LETRA = /\p{L}/u;
const DIERESIS = '\u0308';
const TONO = '\u0301';
const FORMAN_DIPTONGO_CON_IOTA = '\u03B1\u03B5\u03BF\u03C5';
const FORMAN_DIPTONGO_CON_YPSILON = '\u03B1\u03B5\u03BF\u03B7';

const mayusculasGriegas = (texto: string): string => {
  const c = Array.from(texto.normalize('NFD'));
  let salida = '';
  for (let i = 0; i < c.length; i++) {
    if (ACENTO_GRIEGO.test(c[i])) continue;
    salida += c[i];
    const base = c[i].toLowerCase();
    let j = i + 1;
    let acento = false;
    let dieresis = false;
    for (; j < c.length && MARCA.test(c[j]); j++) {
      if (ACENTO_GRIEGO.test(c[j])) acento = true;
      if (c[j] === DIERESIS) dieresis = true;
    }
    if (!acento) continue;
    if (base === '\u03B7' && !(i > 0 && LETRA.test(c[i - 1])) && !(j < c.length && LETRA.test(c[j]))) {
      salida += TONO;
      continue;
    }
    if (dieresis || j >= c.length || (j + 1 < c.length && MARCA.test(c[j + 1]))) continue;
    const siguiente = c[j].toLowerCase();
    if ((siguiente === '\u03B9' && FORMAN_DIPTONGO_CON_IOTA.includes(base))
      || (siguiente === '\u03C5' && FORMAN_DIPTONGO_CON_YPSILON.includes(base))) {
      for (let k = i + 1; k < j; k++) if (!ACENTO_GRIEGO.test(c[k])) salida += c[k];
      salida += c[j] + DIERESIS;
      i = j;
    }
  }
  return salida.toUpperCase().normalize('NFC');
};

/**
 * Un texto entero en mayúsculas con las reglas del locale: en griego, sin tono (ver arriba); en el resto, el
 * `toLocaleUpperCase` de siempre, que en turco ya da «İ».
 */
export const enMayusculas = (texto: string, locale?: string): string =>
  texto && esGriego(locale) && LETRA_GRIEGA.test(texto) ? mayusculasGriegas(texto) : (texto || '').toLocaleUpperCase(locale);
/**
 * La primera letra en mayúscula con las reglas del locale: «istanbul» → «İstanbul» en turco.
 *
 * En griego la mayúscula INICIAL conserva el tono («άλμπουμ» → «Άλμπουμ»): la regla del locale `el` es la de
 * mayúsculas SOSTENIDAS y lo quitaría, así que ahí se usa la correspondencia general de Unicode.
 *
 * En neerlandés el dígrafo «ij» es UNA letra: a principio de frase van las dos en mayúscula («ijsje» → «IJsje»,
 * «ijsland» → «IJsland»), y `toLocaleUpperCase('nl')` sobre un solo carácter daría «Ijsje».
 */
export const conMayusculaInicial = (texto: string, locale?: string): string => {
  if (!texto) return texto;
  if (String(locale || '').split(/[-_]/)[0].toLowerCase() === 'nl' && /^ij/i.test(texto)) return 'IJ' + texto.slice(2);
  return (esGriego(locale) ? texto.charAt(0).toUpperCase() : texto.charAt(0).toLocaleUpperCase(locale)) + texto.slice(1);
};

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
 *
 * En griego la gente escribe a menudo sin tono ni diéresis («μουσικη» por «Μουσική»), y la sigma final «ς» es la
 * misma letra que «σ»: al buscar, SOLO dentro de las letras griegas, se quitan las marcas y «ς» cuenta como «σ».
 */
export const paraBuscar = (texto: string | null | undefined): string =>
  (texto || '').toLowerCase().replace(/\u0307/g, '').replace(/\u0131/g, 'i')
    .replace(/[\u0958-\u095F]/g, (letra) => letra.normalize('NFD'))
    .replace(/[\u093C\u200C\u200D]/g, '')
    .replace(/\u0901/g, '\u0902')
    .replace(/[\u0370-\u03FF\u1F00-\u1FFF][\u0300-\u036F\u0370-\u03FF\u1F00-\u1FFF]*/g, (griego) => griego.normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/\u03C2/g, '\u03C3'));

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
