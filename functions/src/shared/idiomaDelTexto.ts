/**
 * EN QUÉ IDIOMA ESTÁ UN TEXTO, CUANDO SE PUEDE SABER CON SEGURIDAD.
 *
 * Sirve para OBSERVAR si lo que escribió la IA está en el idioma que se le pidió (`creator/idiomaDeSalida.ts`). No
 * decide nada ni rechaza nada: un modelo generativo no se puede obligar a obedecer una instrucción de idioma, y un
 * filtro que tirara respuestas por llevar nombres propios, términos técnicos o palabras internacionales haría más daño
 * que el que evita. Por eso este detector solo contesta cuando hay pruebas de sobra, y si no, dice «no lo sé».
 *
 * CÓMO DECIDE
 *  · Escrituras propias: cirílico → ruso; hangul → coreano; kana → japonés; han sin kana → chino; devanagari → hindi.
 *    Basta con que esas letras sean la mayoría de las letras del texto.
 *  · Alfabeto latino: por las PALABRAS FUNCIONALES de cada idioma (artículos, preposiciones, pronombres, auxiliares),
 *    que son las que no se toman prestadas. Un sustantivo —«prompt», «paella», «Instagram», «design»— no cuenta nunca.
 *    Antes de contar se quitan las líneas internas de Weë (`IMAGEN:`, `PROBAR:`, `NARRACIÓN:`), las direcciones,
 *    los @usuarios, los #temas, las cifras y toda palabra con mayúscula inicial (nombres propios y marcas).
 *    Una palabra que existe en varios idiomas («de», «i», «en») pesa menos que una que es de uno solo.
 *  · Solo contesta si hay al menos `MIN_PALABRAS` palabras, al menos `MIN_FUNCIONALES` funcionales y el idioma
 *    ganador saca `MARGEN` veces al segundo. Si no, `null`.
 *
 * LO QUE NO PUEDE: un texto corto («Hej!», «OK»), una lista de ingredientes sin frases, o un texto que de verdad mezcla
 * dos idiomas a partes iguales no tienen idioma decidible, y aquí no se finge que lo tengan. Tampoco distingue
 * variantes del mismo idioma (pt-BR / pt-PT, zh-CN / zh-TW): eso no es un error de idioma.
 */

export type IdiomaDetectable = 'es' | 'en' | 'da' | 'sv' | 'de' | 'fr' | 'it' | 'pt' | 'tr' | 'ru' | 'ko' | 'ja' | 'zh' | 'hi';

export const MIN_PALABRAS = 25;
export const MIN_FUNCIONALES = 6;
export const MARGEN = 2.5;

/* Las palabras funcionales más frecuentes de cada idioma latino que Weë habla. Solo minúsculas y solo palabras que no
   son sustantivos: nada que se tome prestado entre idiomas. */
const FUNCIONALES: Record<Exclude<IdiomaDetectable, 'ru' | 'ko' | 'ja' | 'zh' | 'hi'>, readonly string[]> = {
  es: ['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'unos', 'unas', 'por', 'con', 'para', 'es', 'son', 'está', 'están', 'se', 'no', 'su', 'sus', 'al', 'lo', 'como', 'más', 'pero', 'ya', 'muy', 'sin', 'sobre', 'también', 'hasta', 'hay', 'donde', 'desde', 'todo', 'cuando', 'porque', 'esta', 'este', 'estos', 'estas', 'puedes', 'tu', 'tus', 'te', 'mi', 'yo', 'ser', 'tiene', 'hace', 'muy', 'cada', 'entre'],
  en: ['the', 'of', 'and', 'to', 'in', 'is', 'are', 'you', 'your', 'that', 'it', 'for', 'on', 'with', 'as', 'be', 'this', 'these', 'have', 'has', 'from', 'or', 'by', 'can', 'will', 'not', 'but', 'what', 'all', 'when', 'there', 'an', 'which', 'their', 'if', 'do', 'so', 'about', 'more', 'into', 'then', 'them', 'its', 'our', 'would', 'been', 'also', 'each', 'until', 'while', 'should', 'a', 'my', 'we', 'they', 'how', 'than', 'only', 'just', 'any'],
  da: ['og', 'i', 'at', 'det', 'en', 'den', 'til', 'er', 'som', 'på', 'de', 'med', 'af', 'for', 'ikke', 'der', 'var', 'mig', 'sig', 'men', 'et', 'har', 'om', 'vi', 'min', 'nu', 'over', 'fra', 'du', 'ud', 'sin', 'dem', 'os', 'op', 'man', 'hvor', 'eller', 'hvad', 'skal', 'selv', 'her', 'alle', 'vil', 'blev', 'kunne', 'ind', 'når', 'være', 'noget', 'efter', 'ned', 'denne', 'end', 'dette', 'også', 'under', 'have', 'dig', 'meget', 'hvis', 'din', 'dit', 'dine', 'nogle', 'hos', 'blive', 'mange', 'bliver', 'jeg', 'kan', 'så', 'eller', 'mere', 'hver'],
  sv: ['och', 'det', 'att', 'i', 'en', 'jag', 'som', 'på', 'den', 'med', 'var', 'sig', 'för', 'så', 'till', 'är', 'men', 'ett', 'om', 'de', 'av', 'mig', 'du', 'då', 'nu', 'har', 'inte', 'där', 'min', 'man', 'vid', 'något', 'från', 'ut', 'när', 'efter', 'upp', 'vi', 'dem', 'vara', 'vad', 'över', 'än', 'dig', 'kan', 'här', 'mot', 'alla', 'under', 'någon', 'eller', 'allt', 'mycket', 'också', 'hur', 'din', 'ditt', 'dina', 'dessa', 'några', 'blir', 'ska', 'varje', 'mer'],
  de: ['der', 'die', 'das', 'und', 'in', 'zu', 'den', 'von', 'mit', 'ist', 'des', 'sich', 'auf', 'für', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über', 'einen', 'so', 'zum', 'oder', 'aber', 'vor', 'zur', 'bis', 'mehr', 'durch', 'man', 'dein', 'deine', 'du', 'ich', 'kann', 'wenn', 'jede'],
  fr: ['le', 'la', 'les', 'de', 'des', 'du', 'et', 'un', 'une', 'en', 'est', 'que', 'qui', 'dans', 'pour', 'pas', 'sur', 'au', 'aux', 'avec', 'ce', 'cette', 'ces', 'il', 'elle', 'ne', 'se', 'sont', 'par', 'plus', 'vous', 'votre', 'vos', 'nous', 'mais', 'ou', 'comme', 'tout', 'tu', 'ton', 'ta', 'tes', 'peut', 'être', 'aussi', 'chaque', 'leur', 'sans', 'un', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'je', 'on', 'très', 'où', 'si', 'votre', 'cela', 'ici'],
  it: ['il', 'lo', 'la', 'gli', 'le', 'di', 'del', 'della', 'dei', 'delle', 'e', 'che', 'un', 'una', 'in', 'per', 'con', 'non', 'è', 'sono', 'si', 'da', 'al', 'alla', 'nel', 'nella', 'come', 'più', 'ma', 'anche', 'tuo', 'tua', 'tuoi', 'puoi', 'questo', 'questa', 'quando', 'perché', 'ogni', 'senza', 'sul', 'sulla', 'ci', 'ti'],
  pt: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'que', 'um', 'uma', 'em', 'no', 'na', 'nos', 'nas', 'por', 'com', 'para', 'não', 'se', 'é', 'são', 'mais', 'como', 'mas', 'ao', 'seu', 'sua', 'você', 'pode', 'também', 'quando', 'isso', 'este', 'esta', 'cada', 'sem', 'muito', 'pelo', 'pela'],
  tr: ['ve', 'bir', 'bu', 'için', 'ile', 'de', 'da', 'değil', 'çok', 'daha', 'gibi', 'olan', 'olarak', 'ama', 'veya', 'her', 'sen', 'senin', 'ne', 'mi', 'mı', 'kadar', 'sonra', 'önce', 'şu', 'o', 'en', 'ya', 'hem', 'ki', 'bunu', 'şey'],
};

/* Cuántos idiomas comparten cada palabra: «de» está en cinco y pesa un quinto; «ikke» solo en uno y pesa entero. */
const COMPARTIDAS = new Map<string, number>();
for (const lista of Object.values(FUNCIONALES)) for (const p of new Set(lista)) COMPARTIDAS.set(p, (COMPARTIDAS.get(p) ?? 0) + 1);
const CONJUNTOS = Object.fromEntries(Object.entries(FUNCIONALES).map(([k, v]) => [k, new Set(v)])) as Record<string, Set<string>>;

const ESCRITURAS: [IdiomaDetectable, RegExp][] = [
  ['ru', /\p{Script=Cyrillic}/u],
  ['ko', /\p{Script=Hangul}/u],
  ['hi', /\p{Script=Devanagari}/u],
];
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const HAN = /\p{Script=Han}/u;

/** Lo que no es prosa en el idioma de la respuesta: las líneas internas, direcciones, @usuarios, #temas y cifras. */
export const textoParaDetectar = (texto: string): string =>
  texto
    .split('\n')
    .filter((linea) => !/^\s*(?:[-•*]\s*)?\**\s*(?:IMAGEN|PROBAR|NARRACI[ÓO]N)\s*\**\s*:/i.test(linea))
    .join('\n')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/[@#][\p{L}\p{N}_.-]+/gu, ' ')
    .replace(/\p{N}+/gu, ' ');

export interface Deteccion {
  idioma: IdiomaDetectable;
  /** Palabras (latino) o letras (otras escrituras) que lo sostienen. */
  pruebas: number;
  /** Cuántas veces saca al segundo. Infinity si no hay segundo. */
  margen: number;
}

/** Los umbrales, por si quien mide frases cortas de interfaz necesita otros (más exigentes en margen). */
export interface Umbrales {
  minPalabras?: number;
  minFuncionales?: number;
  margen?: number;
}

export const detectarIdioma = (bruto: string, umbrales: Umbrales = {}): Deteccion | null => {
  const minPalabras = umbrales.minPalabras ?? MIN_PALABRAS;
  const minFuncionales = umbrales.minFuncionales ?? MIN_FUNCIONALES;
  const margenMinimo = umbrales.margen ?? MARGEN;
  const texto = textoParaDetectar(bruto || '');
  const letras = [...texto].filter((c) => /\p{L}/u.test(c));
  if (letras.length === 0) return null;

  /* 1 · Otras escrituras: mandan si son la mayoría de las letras. */
  const latinas = letras.filter((c) => /\p{Script=Latin}/u.test(c)).length;
  for (const [idioma, re] of ESCRITURAS) {
    const propias = letras.filter((c) => re.test(c)).length;
    if (propias >= 20 && propias > latinas) return { idioma, pruebas: propias, margen: latinas ? propias / latinas : Infinity };
  }
  const kana = letras.filter((c) => KANA.test(c)).length;
  const han = letras.filter((c) => HAN.test(c)).length;
  if (kana + han >= 20 && kana + han > latinas) {
    /* El japonés escribe kana en casi cualquier frase; un texto de han sin una sola kana es chino. */
    return kana >= 5 ? { idioma: 'ja', pruebas: kana + han, margen: Infinity } : { idioma: 'zh', pruebas: han, margen: Infinity };
  }

  /* 2 · Alfabeto latino: palabras funcionales, sin nombres propios ni marcas. */
  const palabras = texto.split(/[^\p{L}'’]+/u).filter(Boolean);
  if (palabras.length < minPalabras) return null;
  const puntos: Record<string, number> = {};
  let funcionales = 0;
  for (const original of palabras) {
    if (/^\p{Lu}/u.test(original)) continue;
    const p = original.toLowerCase();
    const n = COMPARTIDAS.get(p);
    if (!n) continue;
    funcionales++;
    for (const [idioma, conjunto] of Object.entries(CONJUNTOS)) if (conjunto.has(p)) puntos[idioma] = (puntos[idioma] ?? 0) + 1 / n;
  }
  if (funcionales < minFuncionales) return null;
  const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
  if (!orden.length) return null;
  const [primero, segundo] = orden;
  const margen = segundo ? primero[1] / segundo[1] : Infinity;
  if (margen < margenMinimo) return null;
  return { idioma: primero[0] as IdiomaDetectable, pruebas: funcionales, margen };
};

export type Veredicto = 'coincide' | 'distinto' | 'incierto';

/**
 * ¿Está el texto en el idioma esperado? `incierto` si no se puede saber, o si el idioma esperado no es uno de los que
 * este detector reconoce. Nunca dice `distinto` sin pruebas de sobra.
 */
export const veredictoDeIdioma = (
  texto: string,
  esperado: string | null | undefined,
  umbrales: Umbrales = {}
): { veredicto: Veredicto; detectado?: IdiomaDetectable } => {
  const base = /^([A-Za-z]{2,3})/.exec(esperado || '')?.[1]?.toLowerCase();
  const reconocibles: readonly string[] = ['es', 'en', 'da', 'sv', 'de', 'fr', 'it', 'pt', 'tr', 'ru', 'ko', 'ja', 'zh', 'hi'];
  if (!base || !reconocibles.includes(base)) return { veredicto: 'incierto' };
  const d = detectarIdioma(texto, umbrales);
  if (!d) return { veredicto: 'incierto' };
  return d.idioma === base ? { veredicto: 'coincide', detectado: d.idioma } : { veredicto: 'distinto', detectado: d.idioma };
};
