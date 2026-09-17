/*
 * EL CATÁLOGO DE IDIOMAS DE WEË.
 *
 * Este archivo no importa nada y no decide nada: solo dice qué idiomas existen,
 * cómo se llaman en su propia lengua y en qué dirección se leen. Todo lo demás
 * —resolver, traducir, formatear, guardar— vive en módulos aparte que leen esto.
 *
 * TRES COSAS QUE NO SON LA MISMA Y QUE AQUÍ SE SEPARAN A PROPÓSITO:
 *
 *   IDIOMA   'es'      la lengua de la interfaz. Es lo que la persona elige.
 *   LOCALE   'es-PE'   idioma + región, y de ahí salen los FORMATOS: cómo se
 *                      escribe una fecha, un número o una moneda.
 *   UBICACIÓN          dónde está el teléfono. Vive en services/locationService
 *                      y NO PINTA NADA AQUÍ.
 *
 * La tercera es la importante. Alguien con la interfaz en inglés que viaja a
 * Japón sigue teniendo la interfaz en inglés: el GPS no elige el idioma de
 * nadie. Por eso este módulo no conoce `locationService` ni al revés.
 */

/** Los idiomas que Weë contempla. Añadir uno es añadirlo a esta lista. */
export type CodigoDeIdioma =
  | 'es' | 'en' | 'it' | 'fr' | 'de' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar';

/**
 * UNA ESCRITURA O REGIÓN QUE SE OFRECE POR SEPARADO DENTRO DEL MISMO IDIOMA.
 *
 * El chino es un idioma con dos escrituras que no se pueden mezclar: quien lee
 * en simplificado no quiere ver tradicional ni al revés. Pero NO son dos
 * idiomas: son el mismo, escrito de dos maneras. Por eso esto vive dentro de un
 * `Idioma` y no como otra fila del catálogo.
 *
 * `locale` es lo que se guarda al elegirla, y es también la clave con la que
 * `diccionarios.ts` la registra: el traductor ya busca `zh-TW` antes que `zh`
 * sin que nadie le enseñe nada nuevo.
 *
 * `cubre` es la lista de locales del APARATO que caen en esta variante. Hace
 * falta porque los aparatos no dicen `zh-TW`: dicen `zh-Hant-TW`, `zh-Hant-HK`,
 * `zh-MO`… y sin esa lista un teléfono taiwanés recibiría simplificado, que es
 * peor que no traducir. Son datos, no lógica; quien decide sigue siendo el
 * resolutor de siempre.
 */
export interface VarianteDeIdioma {
  locale: string;
  nombreNativo: string;
  cubre: readonly string[];
}

export interface Idioma {
  codigo: CodigoDeIdioma;
  /**
   * El nombre EN SU PROPIA LENGUA.
   *
   * "Deutsch", no "Alemán". Quien busca su idioma en una lista lo busca escrito
   * como lo escribiría él, y si no entiende la lengua en la que está la app
   * ahora mismo, un "Alemán" en español no le sirve de nada.
   */
  nombreNativo: string;
  /** 'rtl' solo para las lenguas que se leen de derecha a izquierda. */
  direccion: 'ltr' | 'rtl';
  /**
   * Si hay diccionario de verdad para este idioma.
   *
   * Los que están a `false` figuran en el catálogo pero NO se ofrecen todavía:
   * la arquitectura los admite y el día que llegue su diccionario basta con
   * cambiar este booleano. No se inventan traducciones para rellenar.
   */
  listo: boolean;
  /**
   * Las escrituras que este idioma ofrece por separado, si ofrece alguna.
   *
   * Casi ningún idioma tiene: `undefined` es lo normal y la pantalla pinta una
   * sola fila. Cuando las hay, pinta una fila por variante y el idioma sigue
   * siendo uno.
   */
  variantes?: readonly VarianteDeIdioma[];
}

/*
 * El orden es el de la lista que se le enseña a la persona. Inglés y español
 * primero por ser los que hay; el resto, alfabético por su nombre nativo.
 */
export const IDIOMAS: readonly Idioma[] = [
  { codigo: 'en', nombreNativo: 'English', direccion: 'ltr', listo: true },
  { codigo: 'es', nombreNativo: 'Español', direccion: 'ltr', listo: true },
  /* Primer idioma completado tras el español y el inglés (2026-09-16): 2 232 claves. */
  { codigo: 'de', nombreNativo: 'Deutsch', direccion: 'ltr', listo: true },
  { codigo: 'fr', nombreNativo: 'Français', direccion: 'ltr', listo: true },
  { codigo: 'it', nombreNativo: 'Italiano', direccion: 'ltr', listo: true },
  /*
   * PORTUGUÉS BRASILEÑO (pt-BR). Decisión de producto del usuario (2026-09-16)
   * y no una elección provisional: Brasil es el mercado internacional más
   * cercano de Weë, así que la experiencia en portugués se optimiza para allí.
   * El diccionario `pt` ES el brasileño y no se convierte en europeo; `pt-PT`
   * puede seguir en `LOCALES_CONTEMPLADOS` sin que eso cambie nada, porque un
   * locale solo decide FORMATOS. Un portugués europeo, si alguna vez se ofrece,
   * será un diccionario aparte. La regla entera está en `i18n/diccionarios.ts`
   * y la vigila `functions/test/i18n-variantes.test.mjs`.
   */
  /*
   * UN SOLO IDIOMA, DOS NORMAS. Igual que el chino, el portugués se ofrece en
   * dos variantes y sigue siendo UN idioma: `pt`.
   *
   * La base —`textos/pt`— es la BRASILEÑA, por la decisión de producto de
   * 2026-09-16 que hay explicada más abajo en `diccionarios.ts`. Portugal tiene
   * su propio diccionario en `textos/pt-PT`, y no es una conversión: allí se
   * dice «está a carregar» y se tutea con «tu», cosas que ninguna lista de
   * palabras produce.
   *
   * La lista `cubre` importa por lo mismo que en chino: un teléfono portugués
   * dice `pt-PT`, pero uno de Angola o Mozambique dice `pt-AO` o `pt-MZ`, y
   * esas variedades siguen la norma europea. Sin declararlos, caerían en `pt` y
   * recibirían brasileño.
   */
  {
    codigo: 'pt',
    nombreNativo: 'Português',
    direccion: 'ltr',
    listo: true,
    variantes: [
      {
        locale: 'pt-BR',
        nombreNativo: 'Português (Brasil)',
        cubre: ['pt', 'pt-BR'],
      },
      {
        locale: 'pt-PT',
        nombreNativo: 'Português (Portugal)',
        cubre: ['pt-PT', 'pt-AO', 'pt-MZ', 'pt-CV', 'pt-GW', 'pt-ST', 'pt-TL', 'pt-MO'],
      },
    ],
  },
  /*
   * Primer idioma que necesita MÁS formas de plural que el español: cuatro en
   * vez de dos. El motor ya lo preveía y el tipo lo permite desde
   * `textos/ru/plurales.ts`; lo comprueba `functions/test/i18n-plurales-ru.test.mjs`
   * ejecutando el traductor de verdad con los doce números que importan.
   */
  { codigo: 'ru', nombreNativo: 'Русский', direccion: 'ltr', listo: true },
  { codigo: 'ar', nombreNativo: 'العربية', direccion: 'rtl', listo: false },
  /*
   * El reverso del ruso: el coreano NO distingue número. `Intl.PluralRules`
   * declara una sola categoría, así que la forma `_one` no se lee nunca y las
   * dos formas de cada clave con cantidad llevan el mismo texto. Eso y las
   * partículas —que no pueden ir pegadas a un hueco— los vigila
   * `functions/test/i18n-coreano.test.mjs`.
   */
  { codigo: 'ko', nombreNativo: '한국어', direccion: 'ltr', listo: true },
  /*
   * UN SOLO IDIOMA, DOS ESCRITURAS. Simplificado y tradicional no se mezclan
   * jamás, pero tampoco son dos idiomas: `zh` es uno y ofrece dos variantes.
   *
   * La lista `cubre` no es decorativa. Un teléfono taiwanés de hoy no dice
   * `zh-TW`: dice `zh-Hant-TW`, y sin esa entrada la cadena de respaldo sería
   * [zh-Hant-TW, zh, en] y le serviría SIMPLIFICADO. Cada locale de aquí está
   * registrado en `diccionarios.ts`, y una prueba comprueba que las dos listas
   * digan lo mismo.
   */
  {
    codigo: 'zh',
    nombreNativo: '中文',
    direccion: 'ltr',
    listo: true,
    variantes: [
      {
        locale: 'zh-CN',
        nombreNativo: '中文（简体）',
        cubre: ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN', 'zh-Hans-SG'],
      },
      {
        locale: 'zh-TW',
        nombreNativo: '中文（繁體）',
        cubre: ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW', 'zh-Hant-HK', 'zh-Hant-MO'],
      },
    ],
  },
  { codigo: 'ja', nombreNativo: '日本語', direccion: 'ltr', listo: false },
];

/**
 * Cuando no hay nada mejor, inglés.
 *
 * No es una preferencia de producto: es el último escalón de la cadena de
 * respaldo, el que garantiza que la interfaz nunca se quede en blanco.
 */
export const IDIOMA_DE_RESERVA: CodigoDeIdioma = 'en';

/**
 * LOS LOCALES CONTEMPLADOS, que no es lo mismo que los idiomas.
 *
 * Un idioma tiene un diccionario; un locale tiene FORMATOS. `es-PE` y `es-ES`
 * comparten hasta la última palabra del diccionario y aun así escriben distinto
 * una fecha y una cantidad de dinero. Por eso son dos listas y no una.
 *
 * Esta lista no limita nada: `Intl` sabe formatear cualquier locale del mundo y
 * `formato.ts` le pasa el que haya. Está aquí para poder ofrecer una elección
 * de región el día que se ofrezca, y para que las pruebas comprueben que los
 * que nos importan se resuelven bien.
 */
export const LOCALES_CONTEMPLADOS: readonly string[] = [
  'es-PE', 'es-ES', 'es-MX',
  'en-US', 'en-GB',
  'it-IT',
  'fr-FR', 'fr-CA',
  'de-DE',
  'pt-BR', 'pt-PT',
  'ja-JP',
  'zh-CN', 'zh-TW',
  'ko-KR',
  'ru-RU',
  'ar-SA',
];

/** Los que se pueden elegir hoy. La pantalla de Idioma pinta exactamente esto. */
export const idiomasDisponibles = (): Idioma[] => IDIOMAS.filter((i) => i.listo);

/** Busca un idioma del catálogo. `undefined` si no está contemplado. */
export const idiomaDelCatalogo = (codigo: string): Idioma | undefined =>
  IDIOMAS.find((i) => i.codigo === codigo);

/** Cómo se lee un idioma. Lo que necesita la capa de RTL. */
export const direccionDe = (codigo: string): 'ltr' | 'rtl' =>
  idiomaDelCatalogo(codigo)?.direccion ?? 'ltr';

/**
 * Qué variante le corresponde a un locale. `undefined` si su idioma no tiene
 * variantes o si ninguna lo cubre.
 *
 * Es una BÚSQUEDA en el catálogo, no una decisión: quien elige el idioma sigue
 * siendo el resolutor, y quien sirve el texto sigue siendo el traductor. Esto
 * solo sirve para que la pantalla de Idioma sepa qué fila marcar cuando el
 * aparato llega diciendo `zh-Hant-TW` y la fila se llama `zh-TW`.
 */
export const varianteDelLocale = (locale: string): VarianteDeIdioma | undefined => {
  const suyo = String(locale || '');
  if (!suyo) return undefined;
  const idioma = idiomaDelCatalogo(suyo.split('-')[0].toLowerCase());
  return idioma?.variantes?.find((v) => v.locale === suyo || v.cubre.includes(suyo));
};

/**
 * Todas las filas que la pantalla de Idioma tiene que pintar: un idioma sin
 * variantes es una fila, y uno con variantes es una fila por variante.
 */
export const filasDeIdioma = (): { clave: string; nombreNativo: string; idioma: CodigoDeIdioma }[] =>
  idiomasDisponibles().flatMap((i) =>
    i.variantes
      ? i.variantes.map((v) => ({ clave: v.locale, nombreNativo: v.nombreNativo, idioma: i.codigo }))
      : [{ clave: i.codigo, nombreNativo: i.nombreNativo, idioma: i.codigo }],
  );
