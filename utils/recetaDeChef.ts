import { sinMarcasInternas } from './textoDeResultado';

/**
 * WEË CHEF · LEER Y ESCALAR UNA RECETA (CHEF-04).
 *
 * Tres funciones PURAS del cliente, sin interfaz todavía —las usará `RecetaCard`, CHEF-07, lote 2—:
 *
 *   leerReceta(texto)          el texto de un paso `recipe` → título, porciones, tiempo, ingredientes y pasos; o `null`.
 *   escalarReceta(receta, n)   la receta leída, para `n` porciones, en el dispositivo y sin gastar nada; o `null`.
 *   leerLista(texto)           una lista de la compra agrupada por «SECCIÓN:»; o `null`.
 *
 * ── FALLO CERRADO ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * Lo que no se entiende devuelve `null` y el texto original sale tal cual (AC-17); nunca una receta inventada ni una
 * cantidad adivinada. Línea a línea es igual: una línea de ingredientes que no se entiende se CONSERVA con su texto, sin
 * `cantidad`, y al escalar sale sin escalar y con `sinEscalar`. Una cantidad solo se lee cuando no hay duda: «1.000 g»
 * (¿mil o uno?), «2 dl» (una unidad que v1 no conoce, que no se toma por una pieza), «1 taza (240 ml)» (otra cantidad
 * dentro, que quedaría vieja al escalar) o «una docena» se quedan como están.
 *
 * ── PURAS ───────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Sin React, sin traductor, sin red, sin reloj, sin azar y sin formateo de números (devuelven NÚMEROS: cómo se escriben
 * «1,5» o «1½» es de quien pinte, con `i18n/formato.ts`). No mutan sus entradas y la misma entrada da siempre la misma salida.
 * Todo texto interno de máquina («IMAGEN:», «PROBAR:», «NARRACIÓN:») lo quita `sinMarcasInternas`, que se reutiliza.
 *
 * ── EL CONTRATO CON QUIEN PINTE ─────────────────────────────────────────────────────────────────────────────
 *
 *  · `texto` de un ingrediente es la línea del modelo, sin viñeta, y NO se reescribe nunca. Una línea con `cantidad` se
 *    pinta con `cantidad` + `unidad` + `nombre` (y `hasta` si es un rango); las demás, con `texto`. `nombre` siempre
 *    está si hay `cantidad`. `aproximado` pide el «≈»; `sinEscalar` pide un aviso en esa línea.
 *  · Se escala SIEMPRE desde la receta leída, no desde una ya escalada: sus redondeos se acumularían, y `escalarReceta`
 *    se niega (`null`) a escalar una que ya trae `aproximado`.
 *  · El aviso «revisa los tiempos y el tamaño del molde» lo escribe la tarjeta; aquí solo está su condición
 *    (`pideRevisarTiempos`). Tampoco se conjugan los nombres: «1 huevo» escalado a 3 sigue llamándose «huevo».
 *
 * ── LO QUE ESTA PIEZA NO SABE (UNKNOWN) ─────────────────────────────────────────────────────────────────────
 *
 * Las REGLAS CULINARIAS del escalado —cómo se redondea cada cosa, los mínimos, qué se cuenta como «pieza», qué se deja
 * intacto— son `[P]` (propuesta: `docs/WEE-CHEF-ESPECIFICACION.md` §2.5) y están SIN REVISAR por alguien que cocine. Este
 * código hace lo que esa propuesta dice; que cocinar así salga bien es UNKNOWN. Tampoco se ha leído nunca la salida de
 * un modelo real (CHEF-18, canary): v1 se apoya en el formato que el prompt de receta pide HOY y solo conoce palabras en
 * ESPAÑOL; en otro idioma lo seguro es no escalar (sin porciones base, `escalarReceta` da `null`).
 */

/* ═══ Tipos ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Las unidades que v1 conoce, por identificador: quien pinta las nombra en su idioma. */
export type UnidadDeCocina = 'g' | 'kg' | 'ml' | 'l' | 'cucharada' | 'cucharadita' | 'taza' | 'vaso' | 'pizca';

/** Una línea con su cantidad, si se entendió con seguridad. */
export interface LineaConCantidad {
  /** La línea como la escribió el modelo, sin viñeta ni número de lista. Lo que se enseña cuando no hay `cantidad`. */
  readonly texto: string;
  /** Solo si se entendió sin duda. Nunca cero, ni negativa, ni adivinada. */
  readonly cantidad?: number;
  /** Segundo extremo de un rango («2–3 dientes de ajo»): `cantidad` es el primero y `hasta` es mayor. */
  readonly hasta?: number;
  readonly unidad?: UnidadDeCocina;
  /** Lo que sigue a la cantidad y a la unidad, sin el «de» que las une («harina»). Siempre está si hay `cantidad`. */
  readonly nombre?: string;
}

export interface IngredienteLeido extends LineaConCantidad {
  /** Solo tras escalar: el número que se enseña no es el exacto («≈»). */
  readonly aproximado?: boolean;
  /** Solo tras escalar: esta línea NO se escaló porque no se entendió; sigue como estaba. */
  readonly sinEscalar?: boolean;
}

export interface RecetaLeida {
  readonly titulo: string;
  /** El emoji con que empieza el título, aparte; ausente si no lo trae. */
  readonly emoji?: string;
  /** Las porciones que dice el texto («Para 4 personas»); ausentes si no las dice o si no está claro (un rango). */
  readonly porciones?: number;
  /** El tiempo TOTAL en minutos; ausente si no se dice o no está claro (un rango, o solo la preparación). */
  readonly minutos?: number;
  readonly ingredientes: readonly IngredienteLeido[];
  readonly pasos: readonly string[];
  readonly consejo?: string;
  /** Las líneas que no son ni título, ni porciones o tiempo, ni ingrediente, ni paso, ni consejo: tal cual, en su orden. */
  readonly otras?: readonly string[];
}

export interface SeccionDeLista {
  /** Vacío si las líneas venían sin ninguna sección. */
  readonly nombre: string;
  readonly lineas: readonly LineaConCantidad[];
}

export interface ListaLeida {
  readonly secciones: readonly SeccionDeLista[];
  /** Lo que no es ni sección ni línea, tal cual y en su orden. */
  readonly otras?: readonly string[];
}

/* ═══ Constantes ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Más texto del que cabe en una receta no se lee: protege a la pantalla de una entrada desmedida. */
const MAX_CARACTERES = 20000;
/**
 * Una línea más larga no se analiza (ninguna expresión regular le toca un carácter): no es un título, ni un ingrediente, ni un
 * paso. Si tiene forma de elemento de lista —viñeta o número delante—, el texto entero no se lee; si es un párrafo, va a `otras`.
 */
const LINEA_MAXIMA = 800;
/** El factor de escalado admitido es `nuevas / base` entre 0,25 y 10 (§2.5). */
const FACTOR_MINIMO = 0.25;
const FACTOR_MAXIMO = 10;
const TOLERANCIA = 1e-9;
/** Una cantidad mayor es un error de lectura o de escritura, no una receta. */
const CANTIDAD_MAXIMA = 100000;
const TITULO_MAXIMO = 120;
const SECCION_MAXIMA = 60;

/* ═══ Texto: líneas, adornos y qué es cada línea ══════════════════════════════════════════════════════════════ */

/** Las líneas de un texto, sin la marca interna, sin espacios duros ni caracteres invisibles; las vacías se conservan. */
const lineasDe = (texto: unknown): string[] | null => {
  if (typeof texto !== 'string' || texto.length > MAX_CARACTERES) return null;
  const limpio = sinMarcasInternas(
    texto
      .normalize('NFC')
      .replace(/[\u{A0}\u{202F}\u{2007}\u{2009}]/gu, ' ')
      .replace(/[\u{200B}\u{200C}\u{2060}\u{FEFF}]/gu, '')
      .replace(/\r\n?|[\u{2028}\u{2029}\u{85}]/gu, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      /* Un tramo largo de espacios no es nada y hace cuadrática la expresión de `sinMarcasInternas`. */
      .replace(/[^\S\n]{12,}/gu, ' '),
  );
  return limpio ? limpio.split('\n').map((linea) => linea.trim()) : null;
};

/** El adorno de markdown que el prompt prohíbe y los modelos ponen igual: «## », «**negrita**», «_cursiva_». */
const sinAdorno = (linea: string): string =>
  linea
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*|__/g, '')
    .replace(/^[*_]+(?=[^\s*_])/, '')
    .replace(/(?<=[^\s*_])[*_]+$/, '')
    .trim();

/** Una línea que son solo rayas o viñetas sueltas («---», «***», «•», «-») no dice nada. */
const NADA = /^[-*_=—–•·▪◦‣⁃●.\s]+$/u;
const VINETA = /^(?:[•·▪◦‣⁃●]|[-*–—](?=\s)|\[[ xX✓✔]?\]|[☐☑☒✓✔])\s*/u;
const CASILLA = /^(?:\[[ xX✓✔]?\]|[☐☑☒✓✔])\s*/u;
const NUMERADA = /^(?:paso\s+)?(\d{1,2})\s*[.)](?!\d)\s*(\S[\s\S]*)$/iu;
const PASO_CON_DOS_PUNTOS = /^paso\s+(\d{1,2})\s*[:\-–—]\s*(\S[\s\S]*)$/iu;

type Linea =
  | { readonly tipo: 'vacia' }
  | { readonly tipo: 'vineta'; readonly texto: string }
  | { readonly tipo: 'numerada'; readonly texto: string }
  | { readonly tipo: 'plana'; readonly texto: string }
  /** Más larga de `LINEA_MAXIMA`: no se analiza. `deLista` si empieza como un elemento de lista (entonces nada se lee). */
  | { readonly tipo: 'larga'; readonly texto: string; readonly deLista: boolean };

/** Qué es una línea por cómo empieza: viñeta («•», «-», «*»…), número de paso («1.», «1)», «Paso 1:») o texto suelto. */
const clasificar = (cruda: string): Linea => {
  if (cruda.length > LINEA_MAXIMA) return { tipo: 'larga', texto: cruda, deLista: /^[•·▪◦‣⁃●*\-–—[☐☑☒✓✔\d]/u.test(cruda) };
  const linea = sinAdorno(cruda);
  if (!linea || NADA.test(linea)) return { tipo: 'vacia' };
  const vineta = VINETA.exec(linea);
  if (vineta) {
    const resto = linea.slice(vineta[0].length).replace(CASILLA, '').trim();
    return resto ? { tipo: 'vineta', texto: resto } : { tipo: 'vacia' };
  }
  const numerada = NUMERADA.exec(linea) ?? PASO_CON_DOS_PUNTOS.exec(linea);
  if (numerada) return { tipo: 'numerada', texto: numerada[2].trim() };
  return { tipo: 'plana', texto: linea };
};

/** Los emojis con que empieza una línea (con sus selectores, uniones y tonos): «🍝», «🍽️», «👨‍🍳». */
const EMOJI_INICIAL =
  /^(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}][\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]*\s*)+/u;

const separarEmoji = (linea: string): { emoji?: string; resto: string } => {
  const m = EMOJI_INICIAL.exec(linea);
  return m ? { emoji: m[0].trim(), resto: linea.slice(m[0].length).trim() } : { resto: linea.trim() };
};

const sinCeros = <T extends object>(objeto: T): T =>
  Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as T;

/* ═══ Porciones y tiempo ══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Minúsculas de una palabra española SIN depender del idioma del dispositivo: `toLowerCase()` cambia en turco (I → ı) y
 * `toLocaleLowerCase` no es puro. Las mayúsculas del español (A–Z, ÁÉÍÓÚÜÑ) están a 32 puntos de su minúscula.
 */
const aMinusculas = (s: string): string => s.replace(/[A-ZÁÉÍÓÚÜÑ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

const NUMEROS_EN_PALABRAS: Readonly<Record<string, number>> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  medio: 0.5, media: 0.5,
};
const PALABRAS_DE_NUMERO = 'un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce';

const NOMBRE_DE_PORCION = String.raw`(?:personas?|porci[oó]n(?:es)?|raci[oó]n(?:es)?|comensales)`;
const NUMERO_DE_PORCIONES = String.raw`(\d{1,2}|${PALABRAS_DE_NUMERO})`;
/** «Para 4 personas», «4 porciones», «para dos personas». */
const PORCIONES_A = new RegExp(`^(?:para\\s+)?${NUMERO_DE_PORCIONES}\\s+${NOMBRE_DE_PORCION}$`, 'iu');
/** «Porciones: 4», «Personas: 4», «Rinde 4 porciones», «Sirve a 4 personas». */
const PORCIONES_B = new RegExp(`^(?:${NOMBRE_DE_PORCION}|rinde|rendimiento|sirve(?:\\s+a)?)\\s*:?\\s*${NUMERO_DE_PORCIONES}(?:\\s+${NOMBRE_DE_PORCION})?$`, 'iu');
/**
 * Las porciones de un trozo de línea, o `null`. Solo se leen las formas de arriba, ancladas: un rango («Para 4-6 personas») no
 * encaja en ninguna y no se elige una base entre dos; la línea se conserva en `otras`.
 */
const leerPorciones = (segmento: string): number | null => {
  const m = PORCIONES_A.exec(segmento) ?? PORCIONES_B.exec(segmento);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS_EN_PALABRAS[aMinusculas(m[1])];
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
};

const ETIQUETA_DE_TIEMPO_TOTAL = /^(?:tiempo(?:\s+(?:total|aproximado|estimado))?|duraci[oó]n|total|listo\s+en)\s*:?\s*/iu;
const MINUTOS_MAXIMOS = 4320;

/**
 * Los minutos TOTALES de un trozo de línea, o `null`. Solo se leen las formas de abajo, ancladas, con la etiqueta del total o
 * sin etiqueta: «Tiempo de preparación: 15 min» (un parcial, que no se suma), «30-40 minutos» (un rango) o «unos 45 minutos»
 * no encajan en ninguna, no se toman por el total y la línea se conserva en `otras`.
 */
const leerDuracion = (segmento: string): number | null => {
  const s = segmento.replace(ETIQUETA_DE_TIEMPO_TOTAL, '').trim();
  let minutos: number | null = null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d+)\s*(?:min(?:utos?|s)?)$/iu.exec(s))) minutos = Number(m[1]);
  else if ((m = /^(\d+(?:[.,]\d+)?)\s*(?:h|hrs?|horas?)(?:\s*(?:y\s*)?(\d{1,2})\s*(?:min(?:utos?|s)?)?)?$/iu.exec(s))) {
    minutos = Math.round(Number(m[1].replace(',', '.')) * 60) + (m[2] ? Number(m[2]) : 0);
  } else if (/^media\s+hora$/iu.test(s)) minutos = 30;
  else if (/^una\s+hora$/iu.test(s)) minutos = 60;
  else if (/^hora\s+y\s+media$/iu.test(s)) minutos = 90;
  else if ((m = /^(una|\d+)\s+horas?\s+y\s+media$/iu.exec(s))) minutos = (/^\d+$/.test(m[1]) ? Number(m[1]) : 1) * 60 + 30;
  return minutos !== null && Number.isFinite(minutos) && minutos >= 1 && minutos <= MINUTOS_MAXIMOS ? minutos : null;
};

const SEPARADOR_DE_META = /\s*[·|;•]\s*|\s+[-–—]\s+|\.\s+|,\s+/u;
const limpiarSegmento = (s: string): string => s.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[\s.:;,)\]]+$/u, '').trim();

interface MetaLeida {
  readonly porciones: number[];
  readonly minutos: number[];
  /** Lo que se dice junto a las porciones y al tiempo pero no es ninguna de las dos cosas (o no está claro). */
  readonly sobrantes: string[];
}

/** «Para 4 personas · 45 minutos»: las porciones y el tiempo de una línea, trozo a trozo. */
const leerMeta = (linea: string): MetaLeida => {
  const meta: MetaLeida = { porciones: [], minutos: [], sobrantes: [] };
  for (const segmento of linea.split(SEPARADOR_DE_META).map(limpiarSegmento).filter(Boolean)) {
    const personas = leerPorciones(segmento);
    if (personas !== null) { meta.porciones.push(personas); continue; }
    const duracion = leerDuracion(segmento);
    if (duracion !== null) { meta.minutos.push(duracion); continue; }
    meta.sobrantes.push(segmento);
  }
  return meta;
};
const reconocida = (meta: MetaLeida): boolean => meta.porciones.length + meta.minutos.length > 0;

/* ═══ Cantidades y unidades ═══════════════════════════════════════════════════════════════════════════════════ */

const FRACCIONES: Readonly<Record<string, number>> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const F = '[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]';
/** «1½», «1 ½», «2 y 1/2», «1 1/2», «1/2», «½», «250», «1,5», «0.25». */
const NUMERO = new RegExp(
  `^(?:(\\d{1,3})\\s*(${F})`
  + `|(\\d{1,3})\\s+y\\s+(?:(\\d{1,2})\\s*/\\s*(\\d{1,2})|(${F}))`
  + `|(\\d{1,3})\\s+(\\d{1,2})\\s*/\\s*(\\d{1,2})`
  + `|(\\d{1,3})\\s*/\\s*(\\d{1,2})`
  + `|(${F})`
  + `|(\\d+(?:[.,]\\d+)?))`,
  'u',
);
const NUMERO_EN_PALABRA = /^(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|medio|media)(?![\p{L}\p{N}])/iu;
/** «2-3», «2 – 3», «2 a 3». */
const SEPARADOR_DE_RANGO = /^\s*(?:[-–—]\s*|a\s+)/iu;

/** El número con que empieza un texto, o `ambiguo` si podría ser dos cosas («1.000»), o `null` si no hay número claro. */
const leerNumero = (s: string): { valor: number; fin: number } | 'ambiguo' | null => {
  const m = NUMERO.exec(s);
  if (!m) return null;
  let valor: number;
  if (m[2] !== undefined) valor = Number(m[1]) + FRACCIONES[m[2]];
  else if (m[3] !== undefined) valor = Number(m[3]) + (m[6] !== undefined ? FRACCIONES[m[6]] : Number(m[4]) / Number(m[5]));
  else if (m[7] !== undefined) valor = Number(m[7]) + Number(m[8]) / Number(m[9]);
  else if (m[10] !== undefined) valor = Number(m[10]) / Number(m[11]);
  else if (m[12] !== undefined) valor = FRACCIONES[m[12]];
  else {
    /* «1.000» o «1,500»: ¿mil o uno con tres decimales? Sin saberlo, no se lee. «0,125» no es ambiguo: no empieza por 1-9. */
    if (/^[1-9]\d{0,2}[.,]\d{3}$/.test(m[13])) return 'ambiguo';
    valor = Number(m[13].replace(',', '.'));
  }
  if (!Number.isFinite(valor) || valor <= 0 || valor > CANTIDAD_MAXIMA) return null;
  return { valor, fin: m[0].length };
};

/** Las unidades que v1 conoce, en español. Un punto detrás de la abreviatura («cdas.», «gr.») se admite. */
const UNIDADES: ReadonlyArray<readonly [UnidadDeCocina, RegExp]> = [
  ['kg', /^\s*(?:kgs?|kilos?|kilogramos?)\.?(?![\p{L}\p{N}])/iu],
  ['g', /^\s*(?:g|grs?|gramos?)\.?(?![\p{L}\p{N}])/iu],
  ['ml', /^\s*(?:mls?|mililitros?)\.?(?![\p{L}\p{N}])/iu],
  ['l', /^\s*(?:l|lts?|litros?)\.?(?![\p{L}\p{N}])/iu],
  ['cucharadita', /^\s*(?:cucharaditas?|cditas?|cdtas?)\.?(?![\p{L}\p{N}])/iu],
  ['cucharada', /^\s*(?:cucharadas?|cdas?)\.?(?![\p{L}\p{N}])/iu],
  ['taza', /^\s*tazas?(?![\p{L}\p{N}])/iu],
  ['vaso', /^\s*vasos?(?![\p{L}\p{N}])/iu],
  ['pizca', /^\s*pizcas?(?![\p{L}\p{N}])/iu],
];
/**
 * Lo que parece una unidad o una cantidad pero v1 no sabe escalar: tomarlo por «una pieza» redondearía un decilitro al
 * entero. La línea se conserva tal cual.
 */
const SIN_SOPORTE = /^(?:cl|dl|mg|cc|oz|onzas?|lbs?|libras?|cups?|tbsp|tsp|pints?|quarts?|gal(?:ones?|[oó]n)|cm|mm|pulgadas?|docenas?|pares?|par|cuartos?|mitad(?:es)?|tercios?|medios?)(?![\p{L}\p{N}])/iu;
/** Un calificativo de la medida («rasa», «colmada», «sopera»…) cambia la cantidad: no se descarta en silencio. */
const CALIFICATIVO = /^(?:rasas?|colmadas?|copetudas?|soperas?|escasas?|abundantes?|generosas?|llenas?|grandes?|peque[ñn]as?|medianas?)(?![\p{L}\p{N}])/iu;
/**
 * Si tras la unidad sigue una conjunción o una preposición («1 taza y media», «1 kg y medio», «2 o 3», «con»), la
 * cantidad CONTINÚA: leer solo «1 taza» y escalarla daría «2 y media» donde son 3. No se lee la mitad.
 */
const CANTIDAD_QUE_CONTINUA = /^(?:y|e|o|u|a|m[aá]s|menos|con|por|x)(?![\p{L}\p{N}])/iu;
/** Una pieza empieza por un nombre: un artículo o una preposición («2 de los tomates», «3 a la plancha») no lo es. */
const NO_ES_UN_NOMBRE = /^(?:de|del|la|el|los|las|un|una|unos|unas|sin|para)(?![\p{L}\p{N}])/iu;
const VAGO_AL_COMIENZO = /^(?:chorritos?|chorros?|poquito|poco|toque|pu[ñn]ados?|pellizcos?)(?![\p{L}\p{N}])/iu;
const UTENSILIO_AL_COMIENZO = /^(?:molde|moldes|bandejas?|sart[eé]n|sartenes|ollas?|cacerolas?|cazuelas?)(?![\p{L}\p{N}])/iu;
/**
 * Una temperatura, una medida de corte o un tiempo dentro de la línea no son otra cantidad que escalar. Las cifras van
 * acotadas (9 + 9): sin tope, una tira larga de dígitos haría cuadrática la búsqueda.
 */
const MEDIDA_QUE_NO_SE_ESCALA =
  /\d{1,9}(?:[.,]\d{1,9})?\s*(?:cm|mm|%|(?:°|º)\s*[cf]?|grados?|minutos?|mins?|horas?|h|d[ií]as?|a[ñn]os?|semanas?)(?![\p{L}\p{N}])/giu;

/** ¿Queda un número suelto, una fracción o una barra de cantidad? Entonces la línea trae OTRA cantidad y no se escala. */
const quedaOtraCantidad = (resto: string): boolean =>
  /[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/u.test(resto.replace(MEDIDA_QUE_NO_SE_ESCALA, ' '));

interface CantidadLeida {
  readonly cantidad: number;
  readonly hasta?: number;
  readonly unidad?: UnidadDeCocina;
  readonly nombre: string;
}

/** La cantidad con que empieza una línea de ingredientes, o `null` si hay la mínima duda. */
const leerCantidad = (texto: string): CantidadLeida | null => {
  let cantidad: number;
  let hasta: number | undefined;
  let fin: number;
  const palabra = NUMERO_EN_PALABRA.exec(texto);
  if (palabra) {
    cantidad = NUMEROS_EN_PALABRAS[aMinusculas(palabra[1])];
    fin = palabra[0].length;
  } else {
    const n = leerNumero(texto);
    if (n === null || n === 'ambiguo') return null;
    cantidad = n.valor;
    fin = n.fin;
    const separador = SEPARADOR_DE_RANGO.exec(texto.slice(fin));
    if (separador) {
      const segundo = leerNumero(texto.slice(fin + separador[0].length));
      if (segundo === 'ambiguo') return null;
      if (segundo !== null) {
        if (segundo.valor <= cantidad) return null;
        hasta = segundo.valor;
        fin += separador[0].length + segundo.fin;
      }
    }
  }
  const resto = texto.slice(fin);

  /* «250 g de harina», «¼ de taza de azúcar»: la unidad va pegada al número, o tras un «de» cuando es una fracción. */
  let unidad: UnidadDeCocina | undefined;
  let despues = resto;
  for (const candidato of [resto, resto.replace(/^\s+de(?=\s)/iu, '')]) {
    for (const [id, regla] of UNIDADES) {
      const coincide = regla.exec(candidato);
      if (coincide) { unidad = id; despues = candidato.slice(coincide[0].length); break; }
    }
    if (unidad) break;
  }

  let nombre: string;
  if (unidad) {
    const cola = despues.trim();
    if (CALIFICATIVO.test(cola) || CANTIDAD_QUE_CONTINUA.test(cola)) return null;
    nombre = cola.replace(/^(?:del|de)\s+/iu, '').trim();
  } else {
    /* Sin unidad es una pieza («3 huevos», «2 dientes de ajo»): una palabra, separada del número. */
    if (!/^\s+\S/.test(resto)) return null;
    nombre = resto.trim();
    if (CANTIDAD_QUE_CONTINUA.test(nombre) || NO_ES_UN_NOMBRE.test(nombre)) return null;
    if (SIN_SOPORTE.test(nombre) || VAGO_AL_COMIENZO.test(nombre) || UTENSILIO_AL_COMIENZO.test(nombre)) return null;
  }
  /* El nombre empieza por una letra y es algo más que «de»: «2 tazas. de sal» o «2 g» a secas no son un ingrediente que se lea. */
  if (!/^\p{L}/u.test(nombre) || /^(?:de|del)$/iu.test(nombre) || quedaOtraCantidad(nombre)) return null;
  return sinCeros({ cantidad, hasta, unidad, nombre });
};

const leerLinea = (texto: string): LineaConCantidad => {
  const q = leerCantidad(texto);
  return q ? sinCeros({ texto, cantidad: q.cantidad, hasta: q.hasta, unidad: q.unidad, nombre: q.nombre }) : { texto };
};

const EMPIEZA_CON_CANTIDAD = /^(?:\d|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|medio|media)(?![\p{L}\p{N}]))/iu;

/* ═══ Leer una receta ═════════════════════════════════════════════════════════════════════════════════════════ */

const ENCABEZADO_DE_INGREDIENTES = /^[^\p{L}\p{N}]*(?:lista\s+de\s+)?ingredientes?(?![\p{L}\p{N}])([\s\S]*)$/iu;
const ENCABEZADO_DE_PASOS =
  /^[^\p{L}\p{N}]*(?:paso\s+a\s+paso|pasos?|preparaci[oó]n|elaboraci[oó]n|instrucciones|procedimiento|modo\s+de\s+(?:preparaci[oó]n|hacer))(?![\p{L}\p{N}])([\s\S]*)$/iu;
const ETIQUETA_DE_CONSEJO = /^[^\p{L}\p{N}]*(?:consejos?(?:\s+(?:final|del\s+chef))?|truco|tip)\s*:\s*([\s\S]*)$/iu;

/** Lo que queda de un encabezado tras su palabra: vacío («Pasos:») o las porciones entre paréntesis («Ingredientes (2 personas):»). */
const restoDeEncabezado = (resto: string, conPorciones: boolean): { valido: boolean; porciones?: number } => {
  if (/^[\s:：.\-–—]*$/u.test(resto)) return { valido: true };
  if (!conPorciones) return { valido: false };
  const meta = leerMeta(resto.replace(/^[\s:：(\[]+|[\s:：)\].]+$/gu, ''));
  const valido = meta.porciones.length === 1 && meta.sobrantes.length === 0 && meta.minutos.length === 0;
  return valido ? { valido, porciones: meta.porciones[0] } : { valido: false };
};

const esTitulo = (resto: string): boolean =>
  resto.length > 0 && resto.length <= TITULO_MAXIMO && /\p{L}/u.test(resto) && !/[:：]$/u.test(resto);

/**
 * El texto de una receta, leído. `null` si no se puede leer con seguridad: sin título, sin ingredientes o sin pasos.
 *
 * Se apoya en el formato que el prompt de receta pide hoy (título con emoji, para cuántas personas, tiempo total,
 * ingredientes con «•», pasos numerados y un consejo) y no exige que el modelo lo cumpla al pie de la letra: las
 * cabeceras («Ingredientes:», «Pasos:», «Preparación:», «INGREDIENTES:»…) ayudan pero no hacen falta, y las viñetas
 * valen «•», «-» y «*», y los pasos «1.», «1)» y «Paso 1:». Pensado para el resultado del paso `recipe`.
 */
export const leerReceta = (texto: string): RecetaLeida | null => {
  const lineas = lineasDe(texto);
  if (!lineas) return null;

  let titulo: string | undefined;
  let emoji: string | undefined;
  let porciones: number | undefined;
  let minutos: number | undefined;
  let consejo: string | undefined;
  let consejoPendiente = false;
  let estado: 'inicio' | 'ingredientes' | 'pasos' | 'consejo' = 'inicio';
  const ingredientes: IngredienteLeido[] = [];
  const pasos: string[] = [];
  const otras: string[] = [];

  /** Una porción o un tiempo ya dicho no se pisa: si el texto lo dice dos veces distinto, la segunda va a `otras`. */
  const anotar = (meta: MetaLeida, linea: string): void => {
    for (const p of meta.porciones) {
      if (porciones === undefined) porciones = p;
      else if (porciones !== p) otras.push(linea);
    }
    for (const m of meta.minutos) {
      if (minutos === undefined) minutos = m;
      else if (minutos !== m) otras.push(linea);
    }
    otras.push(...meta.sobrantes);
  };

  for (const cruda of lineas) {
    const linea = clasificar(cruda);
    if (linea.tipo === 'vacia') { consejoPendiente = false; continue; }
    if (linea.tipo === 'larga') {
      if (linea.deLista) return null;
      consejoPendiente = false;
      otras.push(linea.texto);
      continue;
    }

    if (linea.tipo === 'plana') {
      const l = linea.texto;
      if (consejoPendiente) { consejo = l; consejoPendiente = false; continue; }

      const ing = ENCABEZADO_DE_INGREDIENTES.exec(l);
      if (ing) {
        const resto = restoDeEncabezado(ing[1], true);
        if (resto.valido) {
          estado = 'ingredientes';
          if (resto.porciones !== undefined && porciones === undefined) porciones = resto.porciones;
          continue;
        }
      }
      const pas = ENCABEZADO_DE_PASOS.exec(l);
      if (pas && restoDeEncabezado(pas[1], false).valido) { estado = 'pasos'; continue; }

      const con = ETIQUETA_DE_CONSEJO.exec(l);
      if (con) {
        estado = 'consejo';
        const dicho = con[1].trim();
        if (dicho) consejo = dicho; else consejoPendiente = true;
        continue;
      }

      const meta = leerMeta(l);
      if (titulo === undefined && estado === 'inicio' && !ingredientes.length && !pasos.length && !reconocida(meta)) {
        const { emoji: e, resto } = separarEmoji(l);
        if (esTitulo(resto)) { titulo = resto; emoji = e; continue; }
        otras.push(l);
        continue;
      }
      if (reconocida(meta)) { anotar(meta, l); continue; }
      if (estado === 'ingredientes' && EMPIEZA_CON_CANTIDAD.test(l)) { ingredientes.push(leerLinea(l)); continue; }
      otras.push(l);
      continue;
    }

    consejoPendiente = false;
    if (linea.tipo === 'numerada') {
      /* Bajo «Consejo(s):», unos consejos numerados son consejo, como sus viñetas: no pasos que la tarjeta enseñaría (R9-2). */
      if (estado === 'consejo') { consejo = consejo ? `${consejo} ${linea.texto}` : linea.texto; continue; }
      if (estado === 'ingredientes') estado = 'pasos';
      pasos.push(linea.texto);
      continue;
    }
    /* Una viñeta: un ingrediente; bajo «Pasos:», un paso; bajo «Consejo:», más consejo; tras pasos sin cabecera, una nota. */
    if (estado === 'pasos') pasos.push(linea.texto);
    else if (estado === 'consejo') consejo = consejo ? `${consejo} ${linea.texto}` : linea.texto;
    else if (pasos.length > 0 && estado !== 'ingredientes') otras.push(linea.texto);
    else ingredientes.push(leerLinea(linea.texto));
  }

  if (titulo === undefined || ingredientes.length === 0 || pasos.length === 0) return null;
  return sinCeros({
    titulo, emoji, porciones, minutos, ingredientes, pasos, consejo, otras: otras.length ? otras : undefined,
  });
};

/* ═══ Escalar ═════════════════════════════════════════════════════════════════════════════════════════════════ */

const esNumeroPositivo = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

/** El factor `nuevas / base`, o `null` si algo no es un número bueno o queda fuera de 0,25–10. */
export const factorDeEscala = (base: number, nuevas: number): number | null => {
  if (!esNumeroPositivo(base) || !esNumeroPositivo(nuevas)) return null;
  const factor = nuevas / base;
  return factor < FACTOR_MINIMO - TOLERANCIA || factor > FACTOR_MAXIMO + TOLERANCIA ? null : factor;
};

/** Con un factor mayor que 2 o menor que 0,5 los tiempos y el molde dejan de valer tal cual: la tarjeta lo avisa. */
export const pideRevisarTiempos = (factor: number): boolean => factor > 2 || factor < 0.5;

/** Quita el ruido de coma flotante («0,15000000000000002») sin tocar ninguna cifra que importe. */
const sinRuido = (x: number): number => Number(x.toFixed(9));

/** El paso al que se redondea, por unidad (§2.5, `[P]`, SIN REVISAR): g y ml a 0,5 / 1 / 5; kg y l a 0,05; cucharadas y tazas a ¼; piezas al entero. */
const pasoDe = (unidad: UnidadDeCocina | undefined, x: number): number => {
  if (unidad === 'g' || unidad === 'ml') return x >= 100 ? 5 : x >= 10 ? 1 : 0.5;
  if (unidad === 'kg' || unidad === 'l') return 0.05;
  return unidad === undefined ? 1 : 0.25;
};
/** Nunca se devuelve cero: una cantidad que se redondea a nada se queda en lo más pequeño que se puede medir. */
const minimoDe = (unidad: UnidadDeCocina | undefined): number => pasoDe(unidad, 0);

/** Escala un número: proporcional, redondeado con su regla (mitades hacia arriba) y con el aviso de si dejó de ser exacto. */
const escalarNumero = (cantidad: number, unidad: UnidadDeCocina | undefined, factor: number): { valor: number; aproximado: boolean } => {
  const exacto = sinRuido(cantidad * factor);
  const paso = pasoDe(unidad, exacto);
  const redondeado = sinRuido(Math.floor(sinRuido(exacto / paso) + 0.5) * paso);
  const valor = Math.max(minimoDe(unidad), redondeado);
  return { valor, aproximado: Math.abs(valor - exacto) > TOLERANCIA };
};

const AL_GUSTO = /(?<![\p{L}\p{N}])(?:al\s+gusto|a\s+gusto|al\s+ojo|cantidad\s+necesaria|c\/n)(?![\p{L}\p{N}])/iu;
const VAGO_CON_NUMERO =
  /^(?:(?:\d+(?:[.,]\d+)?|un|una|uno|dos|tres)\s+)?(?:pizcas?|chorritos?|chorros?|poquito|poco|toque|pu[ñn]ados?|pellizcos?)(?![\p{L}\p{N}])/iu;
const UTENSILIO_CON_NUMERO =
  /^(?:(?:\d+|un|una|uno|dos|tres)\s+)?(?:molde|moldes|bandejas?|sart[eé]n|sartenes|ollas?|cacerolas?|cazuelas?)(?![\p{L}\p{N}])/iu;

/** «Al gusto», «una pizca», «un chorrito» y el tamaño de un molde no se escalan: la regla (§2.5) y, por tanto, ningún aviso. */
const esIntacta = (i: IngredienteLeido): boolean =>
  i.unidad === 'pizca' || AL_GUSTO.test(i.texto) || VAGO_CON_NUMERO.test(i.texto) || UTENSILIO_CON_NUMERO.test(i.texto);

const UNIDADES_QUE_SE_ESCALAN: ReadonlySet<string> = new Set(['g', 'kg', 'ml', 'l', 'cucharada', 'cucharadita', 'taza', 'vaso']);

/** ¿Es una línea con una cantidad que v1 no leyó (así que NO se escaló y hay que avisarlo)? */
const tieneCantidadSinLeer = (texto: string): boolean => EMPIEZA_CON_CANTIDAD.test(texto) || quedaOtraCantidad(texto);

const escalarLinea = (i: IngredienteLeido, factor: number): { linea: IngredienteLeido; escalada: boolean } => {
  if (esIntacta(i)) return { linea: { ...i }, escalada: false };
  if (i.cantidad !== undefined || i.hasta !== undefined || i.unidad !== undefined) {
    const valida = esNumeroPositivo(i.cantidad)
      && typeof i.nombre === 'string' && i.nombre.trim() !== ''
      && (i.unidad === undefined || UNIDADES_QUE_SE_ESCALAN.has(i.unidad))
      && (i.hasta === undefined || (esNumeroPositivo(i.hasta) && i.hasta > (i.cantidad as number)));
    if (!valida) return { linea: { ...i, sinEscalar: true }, escalada: false };
    const primero = escalarNumero(i.cantidad as number, i.unidad, factor);
    const segundo = i.hasta !== undefined ? escalarNumero(i.hasta, i.unidad, factor) : undefined;
    /* Un rango que el redondeo aprieta en un solo número deja de ser un rango. */
    const apretado = segundo !== undefined && segundo.valor <= primero.valor;
    return {
      linea: sinCeros({
        texto: i.texto,
        cantidad: primero.valor,
        hasta: segundo !== undefined && !apretado ? segundo.valor : undefined,
        unidad: i.unidad,
        nombre: i.nombre,
        aproximado: primero.aproximado || segundo?.aproximado || apretado ? true : undefined,
      }),
      escalada: true,
    };
  }
  return tieneCantidadSinLeer(i.texto) ? { linea: { ...i, sinEscalar: true }, escalada: false } : { linea: { ...i }, escalada: false };
};

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const esCadena = (x: unknown): x is string => typeof x === 'string';

const esRecetaLeida = (r: unknown): r is RecetaLeida =>
  esObjeto(r)
  && esCadena(r.titulo)
  && Array.isArray(r.ingredientes) && r.ingredientes.length > 0 && r.ingredientes.every((i) => esObjeto(i) && esCadena(i.texto))
  && Array.isArray(r.pasos) && r.pasos.every(esCadena)
  && (r.otras === undefined || (Array.isArray(r.otras) && r.otras.every(esCadena)));

const clonar = <T>(x: T): T => {
  if (Array.isArray(x)) return x.map(clonar) as unknown as T;
  if (esObjeto(x)) return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, clonar(v)])) as T;
  return x;
};

/**
 * La receta leída, para otras porciones: `null` si no se puede (sin porciones base, factor fuera de 0,25–10, nada que
 * escalar, o ya escalada con redondeos). Con las mismas porciones devuelve lo mismo, sin redondear nada.
 * No muta la receta que recibe y devuelve objetos nuevos.
 */
export const escalarReceta = (r: RecetaLeida, porciones: number): RecetaLeida | null => {
  if (!esRecetaLeida(r)) return null;
  const factor = factorDeEscala(r.porciones as number, porciones);
  if (factor === null) return null;
  if (Math.abs(factor - 1) <= TOLERANCIA) return clonar(r);
  if (r.ingredientes.some((i) => i.aproximado === true)) return null;
  let escaladas = 0;
  const ingredientes = r.ingredientes.map((i) => {
    const hecha = escalarLinea(i, factor);
    if (hecha.escalada) escaladas++;
    return hecha.linea;
  });
  if (escaladas === 0) return null;
  return { ...clonar(r), porciones, ingredientes };
};

/* ═══ Leer una lista de la compra ═════════════════════════════════════════════════════════════════════════════ */

const MARCA_DE_SECCION = /^[^\p{L}\p{N}]*secci[oó]n\s*:\s*([\s\S]*)$/iu;

/**
 * Las comillas o el marcador que envuelven un nombre: la instrucción de compra (CHEF-01) enseña la marca como
 * `"SECCIÓN: <nombre>"`, y un modelo puede copiar las comillas o los ángulos tal cual.
 */
const ENVOLTURA_INICIAL = '"\'«“‘<';
const ENVOLTURA_FINAL = ':：."\'»”’>';

/** Recorta por los dos lados con un bucle, no con `[…]+$`: una tira larga de esos signos no vuelve cuadrática la lectura. */
const sinEnvoltura = (texto: string): string => {
  const espacio = (c: string): boolean => /\s/u.test(c);
  let i = 0;
  let j = texto.length;
  while (i < j && (espacio(texto[i]) || ENVOLTURA_INICIAL.includes(texto[i]))) i++;
  while (j > i && (espacio(texto[j - 1]) || ENVOLTURA_FINAL.includes(texto[j - 1]))) j--;
  return texto.slice(i, j);
};

/** El nombre de una sección: sin emoji, sin comillas ni ángulos alrededor, sin los dos puntos del final. */
const nombreDeSeccion = (texto: string): string => sinEnvoltura(separarEmoji(sinEnvoltura(texto)).resto);

/** ¿Es un título de grupo por sí solo? Corto, sin punto final, y con viñetas justo debajo. */
const pareceTituloDeSeccion = (l: string): boolean => {
  const nombre = nombreDeSeccion(l);
  return nombre.length > 0 && nombre.length <= SECCION_MAXIMA && nombre.split(/\s+/).length <= 7 && /\p{L}/u.test(nombre) && !/[.!?]$/u.test(l);
};

/**
 * Una lista de la compra agrupada por secciones: «SECCIÓN: Frutas y verduras» y sus viñetas; o un título suelto con
 * viñetas debajo. `null` si no hay ninguna línea. Lo que no es ni sección ni línea va a `otras`, tal cual.
 */
export const leerLista = (texto: string): ListaLeida | null => {
  const lineas = lineasDe(texto);
  if (!lineas) return null;
  const clases = lineas.map(clasificar);
  const secciones: { nombre: string; lineas: LineaConCantidad[] }[] = [];
  const otras: string[] = [];
  let actual: { nombre: string; lineas: LineaConCantidad[] } | undefined;
  const nueva = (nombre: string): void => { actual = { nombre, lineas: [] }; secciones.push(actual); };
  const siguienteEsLinea = (desde: number): boolean => {
    for (let k = desde + 1; k < clases.length; k++) {
      if (clases[k].tipo === 'vacia') continue;
      return clases[k].tipo === 'vineta' || clases[k].tipo === 'numerada';
    }
    return false;
  };

  let desmedida = false;
  clases.forEach((c, k) => {
    if (c.tipo === 'vacia') return;
    if (c.tipo === 'larga') {
      if (c.deLista) desmedida = true; else otras.push(c.texto);
      return;
    }
    if (c.tipo === 'vineta' || c.tipo === 'numerada') {
      if (!actual) nueva('');
      actual!.lineas.push(leerLinea(c.texto));
      return;
    }
    const marca = MARCA_DE_SECCION.exec(c.texto);
    if (marca) {
      /* Sin nombre (o con uno que se queda en nada) sigue siendo un cambio de sección: lo de debajo no es de la anterior (R9-2). */
      nueva(nombreDeSeccion(marca[1]));
      return;
    }
    if (siguienteEsLinea(k) && pareceTituloDeSeccion(c.texto)) { nueva(nombreDeSeccion(c.texto)); return; }
    if (EMPIEZA_CON_CANTIDAD.test(c.texto)) {
      if (!actual) nueva('');
      actual!.lineas.push(leerLinea(c.texto));
      return;
    }
    otras.push(c.texto);
  });

  const llenas = secciones.filter((s) => s.lineas.length > 0);
  if (desmedida || llenas.length === 0) return null;
  return sinCeros({ secciones: llenas, otras: otras.length ? otras : undefined });
};
