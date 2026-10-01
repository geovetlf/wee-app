import type { Traductor } from '../i18n/traducir';
import { idiomaDe } from '../i18n/resolver';

/**
 * EL TEXTO DE UN RESULTADO DE WEË AI, COMO SE LEE.
 *
 * El servidor le pide al modelo unas marcas fijas en español porque después las lee
 * (`functions/src/creator/prompts.ts`, `instruccionDeSalida`): «IMAGEN:», «PROBAR:» y «NARRACIÓN:» pasan algo al paso
 * siguiente —una descripción en inglés para la imagen, el texto que se va a narrar—, «Escena 1» da la primera escena
 * de un vídeo, y un itinerario se pliega por sus «DÍA 1 ·» y deja abierto su «PRESUPUESTO:». Aunque el resultado esté
 * en danés, esas marcas siguen en español: son el contrato entre el servidor y la app.
 *
 *  · Las tres primeras son de la máquina y no se enseñan, en ningún idioma: eran líneas de instrucciones en inglés
 *    colgando al final de una receta o de un guion.
 *  · Las otras se escriben en el idioma de quien mira (`resultado.dia`, `resultado.escena`, `resultado.presupuesto`).
 *    En español se dejan como las escribió el modelo.
 */

const MARCA_INTERNA = /^\s*(?:[-•*]\s*)?\**\s*(?:IMAGEN|PROBAR|NARRACI[ÓO]N)\s*\**\s*:/i;
const ESCENA = /^(\s*(?:[-•*]\s*)?\**\s*)escena\s+(\d+)/i;
const DIA = /^d[íi]a\s+(\d+)/i;
const PRESUPUESTO = /^(\s*\**\s*)presupuesto(\s*\**\s*):/i;

/* El idioma de un locale lo dice el resolutor de Weë (`idiomaDe`), no una expresión copiada en cada archivo. */
const enEspanol = (locale: string): boolean => idiomaDe(locale) === 'es';

/** Quita las líneas que el servidor pidió para el paso siguiente. */
export const sinMarcasInternas = (texto: string): string =>
  texto
    .split('\n')
    .filter((linea) => !MARCA_INTERNA.test(linea))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** «Escena 1 (0–3 s): …» → «Scene 1 (0–3 s): …» en el idioma de quien mira. */
export const conEscenasEnSuIdioma = (texto: string, t: Traductor, locale: string): string =>
  enEspanol(locale)
    ? texto
    : texto
        .split('\n')
        .map((linea) => linea.replace(ESCENA, (_, antes: string, n: string) => `${antes}${t('resultado.escena', { numero: Number(n) })}`))
        .join('\n');

/** El texto entero de un resultado, listo para leer. */
export const textoParaLeer = (texto: string, t: Traductor, locale: string): string =>
  conEscenasEnSuIdioma(sinMarcasInternas(texto), t, locale);

/** El título de un día de un itinerario: «DÍA 1 · 12 oct · Roma» → «Dag 1 · 12 oct · Roma». */
export const tituloDelDia = (titulo: string, t: Traductor, locale: string): string =>
  enEspanol(locale) ? titulo : titulo.replace(DIA, (_, n: string) => t('resultado.dia', { numero: Number(n) }));

/** El bloque del presupuesto: su primera línea dice «Presupuesto» en el idioma de quien mira. */
export const bloqueDelPresupuesto = (bloque: string, t: Traductor, locale: string): string =>
  enEspanol(locale) ? bloque : bloque.replace(PRESUPUESTO, (_, antes: string, despues: string) => `${antes}${t('resultado.presupuesto')}${despues}:`);

/**
 * Las palabras con las que se reconoce un día y el presupuesto: las del contrato (español) y, por si el modelo las
 * escribiera en el idioma de la persona en vez de copiar la marca, las de ese idioma.
 */
export const palabrasDelItinerario = (t: Traductor): { dia: string; presupuesto: string } => ({
  dia: t('resultado.diaPalabra'),
  presupuesto: t('resultado.presupuestoPalabra'),
});
