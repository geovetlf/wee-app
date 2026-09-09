"use strict";
/**
 * IDIOMA DE LOS PROMPTS QUE VAN A CADA PROVEEDOR.
 *
 *   Weë → Weë AI Gateway → adaptación del prompt → adaptador → API oficial
 *
 * La persona escribe en su idioma y eso no cambia: lo que cambia es el texto
 * interno que viaja al proveedor, y solo cuando ese proveedor lo exige.
 *
 * Tres capas, de la más barata a la más cara, y cada una solo entra si la
 * anterior no bastó:
 *
 *  1. Localización estructurada. La operación de imagen se escribe en inglés
 *     desde el principio, a partir del identificador del paso, que es estable.
 *     Vive en creator/prompts.ts (IMAGE_TASK_EN). Cuesta cero.
 *  2. Descripción visual en inglés. Los pasos de texto que preceden a una
 *     imagen ya terminan con una línea "IMAGEN:" escrita en inglés. Cuesta cero
 *     porque esos pasos ya se ejecutaban.
 *  3. Adaptación puntual. Solo si el proveedor limita el idioma Y todavía queda
 *     texto libre de la persona que aporta información. Es la única que gasta
 *     una llamada, y nunca se le cobra a nadie.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADAPT_INSTRUCTION = exports.providerLanguageLimit = exports.PROVIDER_LANGUAGES = void 0;
exports.looksEnglish = looksEnglish;
exports.hasRelevantFreeText = hasRelevantFreeText;
exports.adaptPromptForProvider = adaptPromptForProvider;
/**
 * Lo que cada proveedor admite, según su documentación oficial. Sin entrada
 * significa que no declara restricción y recibe el texto tal cual lo escribió
 * la persona.
 */
exports.PROVIDER_LANGUAGES = {
    // "All models support Chinese and English prompts. Seedream 5.0 pro also
    // supports Russian, Arabic, Filipino, Thai, Turkish, Korean, Malay, Spanish…"
    // docs.byteplus.com/en/docs/ModelArk/1541523, campo `prompt`.
    seedream: { only: ['en', 'zh'], note: 'Solo chino e inglés; el 5.0 pro añade más idiomas.' },
    // Google no declara ninguna restricción de idioma para imagen.
    gemini: { note: 'Sin restricción declarada.' },
    // BFL recomienda expresamente escribir en el idioma del contexto cultural.
    flux: { note: 'Multilingüe por diseño: se recomienda el idioma del contexto.' },
};
/** Idiomas que el proveedor admite, o undefined si no limita ninguno. */
const providerLanguageLimit = (provider) => { var _a; return (_a = exports.PROVIDER_LANGUAGES[provider]) === null || _a === void 0 ? void 0 : _a.only; };
exports.providerLanguageLimit = providerLanguageLimit;
/** Palabras y signos que solo aparecen en español. */
const SPANISH_MARKS = /[ñáéíóúü¿¡]/i;
// "color" se escribe igual en los dos idiomas, así que no cuenta como marca.
const SPANISH_WORDS = /\b(el|la|los|las|un|una|unos|unas|del|con|para|por|sin|que|como|más|muy|pero|sobre|entre|hacia|desde|cuando|donde|quiero|hacer|foto|fondo|imagen|colores|rostro|estilo|limpio|blanco)\b/gi;
/**
 * ¿Todo el texto está ya en un idioma que el proveedor admite? Heurística
 * deliberada, sin IA: busca marcas propias del español.
 *
 * La pregunta NO es "de qué idioma es la mayoría del texto", sino "queda algo
 * en español". Un prompt puede ser inglés en sus tres cuartas partes, porque las
 * capas 1 y 2 lo escribieron así, y aun llevar el objetivo de la persona en
 * español: eso hay que adaptarlo igual. Por eso basta un par de marcas para
 * decidir que no lo está.
 */
function looksEnglish(text) {
    const limpio = String(text || '').trim();
    if (!limpio)
        return true;
    if (SPANISH_MARKS.test(limpio))
        return false;
    return (limpio.match(SPANISH_WORDS) || []).length < 2;
}
/**
 * ¿Queda texto libre que aporte información? Se compara con lo que la propia
 * Weë ya escribió en inglés: si lo que sobra son cuatro palabras sueltas o el
 * objetivo por defecto de la sección, no aporta y no merece una llamada.
 */
function hasRelevantFreeText(text, structured = '') {
    const palabras = (s) => new Set(String(s || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3));
    const yaDicho = palabras(structured);
    const sobran = [...palabras(text)].filter((w) => !yaDicho.has(w));
    return sobran.length >= 4;
}
/**
 * Instrucción con la que se pide la adaptación. Es explícita a propósito: el
 * riesgo de traducir no es el idioma, es perder un detalle por el camino.
 */
exports.ADAPT_INSTRUCTION = [
    'Rewrite the following image instruction in English.',
    'Keep EXACTLY the same meaning and every detail: subject, background, composition, style, objects, clothing, colors, any text that must appear, and every restriction.',
    'Do not add anything that is not there. Do not remove anything. Do not explain.',
    'Answer with the rewritten instruction and nothing else.',
].join(' ');
/**
 * Punto único de adaptación. Devuelve siempre un prompt utilizable y explica
 * qué decidió, para que quede en el registro. Nunca descarta texto de la
 * persona por su cuenta.
 */
async function adaptPromptForProvider({ provider, prompt, structured = '', translate }) {
    const admite = (0, exports.providerLanguageLimit)(provider);
    if (!admite)
        return { prompt, adapted: false, reason: 'el proveedor no limita el idioma' };
    if (looksEnglish(prompt))
        return { prompt, adapted: false, reason: 'ya está en un idioma que el proveedor admite' };
    if (!hasRelevantFreeText(prompt, structured)) {
        return { prompt, adapted: false, reason: 'lo que queda sin adaptar no aporta información' };
    }
    if (!translate)
        return { prompt, adapted: false, reason: 'no hay adaptador disponible' };
    const adaptado = String((await translate(`${exports.ADAPT_INSTRUCTION}\n\n${prompt}`)) || '').trim();
    if (!adaptado)
        return { prompt, adapted: false, reason: 'la adaptación llegó vacía' };
    return { prompt: adaptado, adapted: true, reason: `adaptado al idioma que admite ${provider}` };
}
//# sourceMappingURL=promptLanguage.js.map