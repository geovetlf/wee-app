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
  | 'es' | 'en' | 'it' | 'fr' | 'de' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar' | 'tr' | 'sv' | 'hi' | 'da' | 'he' | 'fa' | 'id' | 'ms' | 'hr' | 'bs' | 'sr' | 'cnr' | 'pl' | 'ca' | 'el' | 'nl' | 'vi' | 'hu' | 'fi' | 'mn' | 'nb' | 'ga' | 'km' | 'ro' | 'fil' | 'is' | 'kl';

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
   *
   * Lotes L0 y L1 del plan global (docs/I18N-INVENTARIO-GLOBAL.md): los 23 idiomas de la oleada de 40 diccionarios
   * —más la variante de-CH— se completaron en L1 con `music`, `profesional` y `common.mediaUnavailable` y pasaron a
   * `true`. Ninguno tiene revisión humana nativa: estar listo es estar COMPLETO, no revisado.
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
  /**
   * El locale de FORMATOS cuando nadie da región (decisión D1 del dueño, 2026-11-03). Solo decide cifras, fechas y
   * semana; nunca el diccionario. Hoy solo el árabe: `ar` es la identidad y `ar-SA` el formato por defecto.
   */
  localePorDefecto?: string;
  /**
   * Si la elección MANUAL sin región hereda la región del aparato del mismo idioma (decisión D2, 2026-11-03), igual que
   * ya hace la elección automática. Solo si no cambia la variante (el diccionario): heredar decide formatos, no textos.
   */
  heredaRegionDelAparato?: boolean;
  /**
   * Respaldo VECINO, clave a clave (decisión D5, 2026-11-03): si a este diccionario le falta una clave, se busca en
   * el del vecino antes que en inglés. Nunca sustituye el diccionario entero, nunca elige idioma, un solo salto (no
   * encadena el respaldo del vecino) y nunca cruza de escritura: lo vigila `functions/test/i18n-l2-l3.test.mjs`.
   */
  respaldoVecino?: string;
  /**
   * Partes de `Intl` cuyos datos de CLDR para este idioma NO se usan, con su motivo en el comentario de la fila. Hoy solo
   * el groenlandés: su tiempo relativo de CLDR usa el marco danés «for … siden» / «om …», y servirlo sería meter danés
   * en una interfaz groenlandesa. `formato.ts` cae entonces en lo que no lleva palabras de otro idioma (la fecha).
   */
  intlNoFiable?: readonly ('RelativeTimeFormat')[];
}

/*
 * El orden es el de la lista que se le enseña a la persona. Inglés y español
 * primero por ser los que hay; el resto, alfabético por su nombre nativo.
 */
export const IDIOMAS: readonly Idioma[] = [
  { codigo: 'en', nombreNativo: 'English', direccion: 'ltr', listo: true },
  { codigo: 'es', nombreNativo: 'Español', direccion: 'ltr', listo: true },
  /* Primer idioma completado tras el español y el inglés (2026-09-16): 2 232 claves. */
  /*
   * El alemán tiene DOS normas ortográficas vivas y el mismo idioma: Alemania/Austria escriben ß, Suiza y Liechtenstein
   * escriben ss y usan algo de léxico propio (Velo, Billett, Offerte…). Como el portugués: `de` es la base y `de-CH`
   * es una variante COMPLETA (`textos/de-CH/`), adaptada frase a frase desde el alemán base, no un parche.
   */
  {
    codigo: 'de',
    nombreNativo: 'Deutsch',
    direccion: 'ltr',
    listo: true,
    variantes: [
      {
        locale: 'de-DE',
        nombreNativo: 'Deutsch (Deutschland)',
        cubre: ['de', 'de-DE', 'de-AT', 'de-LU', 'de-BE', 'de-IT'],
      },
      {
        locale: 'de-CH',
        nombreNativo: 'Deutsch (Schweiz)',
        cubre: ['de-CH', 'de-LI'],
      },
    ],
  },
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
   * El sueco se tutea («du») y escribe junto lo que es una sola palabra: una
   * palabra compuesta partida en dos («profil bild») es el error más visible de
   * una traducción al sueco. Tiene `one` y `other`, y aquí sí cambian
   * («1 kommentar», «3 kommentarer»). Las marcas no llevan terminaciones: se
   * usan con preposición («på Weë»). Todo eso está en `docs/I18N-SUECO.md` y
   * lo vigila `functions/test/i18n-sueco.test.mjs`.
   */
  { codigo: 'sv', nombreNativo: 'Svenska', direccion: 'ltr', listo: true },
  /*
   * El danés también se tutea («du») y escribe junto lo que es una sola palabra
   * («profilbillede», nunca «profil billede»). Tiene `one` y `other`, pero su
   * `one` NO es solo el 1: `Intl.PluralRules('da')` da `one` también a 1,5 y a
   * 0,5, así que ningún `_one` escribe un «1» a mano. Las marcas no se declinan
   * («på Weë», «din Weë-profil»). La hora se escribe con punto (14.30) y la
   * moneda como `1.234,50 kr.`: lo da `Intl` con `da-DK`. Todo eso está en
   * `docs/I18N-DANES.md` y lo vigila `functions/test/i18n-danes.test.mjs`.
   */
  { codigo: 'da', nombreNativo: 'Dansk', direccion: 'ltr', listo: true },
  /*
   * HEBREO (he-IL) — de DERECHA A IZQUIERDA (`direccion: 'rtl'`, tercera lengua RTL tras el árabe y el persa; comparten
   * toda la infraestructura de dirección). Sin niqud, letras finales a fin de palabra, puntuación latina, dígitos latinos y
   * calendario gregoriano por Intl con he-IL. Plural one/two/other: donde el español declara _one/_other, el hebreo añade
   * _two (dual) con `ConPlurales` de textos/he/plurales.ts. Prefijos hebreos sobre una marca siempre con guion («ב-Weë»).
   * Traducción SIN revisión humana nativa (2026-10-30); guía y glosario en docs/I18N-HEBREO.md.
   */
  { codigo: 'he', nombreNativo: 'עברית', direccion: 'rtl', listo: true },
  /*
   * PERSA (fa-IR) — de DERECHA A IZQUIERDA (`direccion: 'rtl'`, la segunda lengua RTL tras el árabe). ی/ک persas
   * (U+06CC/U+06A9, nunca ي/ك árabes), ZWNJ (U+200C) en la ortografía, puntuación persa «؟ ، ؛». Los dígitos y el
   * calendario NO se escriben a mano: `Intl` con fa-IR da dígitos persas y calendario solar; con «fa» a secas,
   * occidentales. Plural one/other (el 0 es `one`; el sustantivo no cambia tras número). Un solo diccionario:
   * dari y tayiko no se contemplan. Traducción SIN revisión humana nativa (2026-10-30); guía en docs/I18N-PERSA.md.
   */
  { codigo: 'fa', nombreNativo: 'فارسی', direccion: 'rtl', listo: true },
  /*
   * INDONESIO (id-ID) — latino, LTR, trato de «Anda». Intl solo tiene «other»: donde el español declara _one/_other
   * las dos formas son idénticas y llevan {{contador}}. Es OTRO idioma que el malayo (ms): léxico propio (pengaturan,
   * unggah, unduh, akun) y ninguna palabra compartida por copia. Traducción SIN revisión humana nativa (2026-10-30);
   * guía y glosario en docs/I18N-INDONESIO.md.
   */
  { codigo: 'id', nombreNativo: 'Bahasa Indonesia', direccion: 'ltr', listo: true },
  /*
   * MALAYO (ms-MY) — latino, LTR, trato de «anda» (minúscula, DBP). Intl solo tiene «other»: donde el español declara
   * _one/_other las dos formas son idénticas y llevan {{contador}}. Es OTRO idioma que el indonesio (id): léxico propio
   * (tetapan, muat naik, muat turun, akaun, e-mel) y ninguna palabra compartida por copia. Brunéi y Singapur reciben el
   * mismo diccionario con su locale. Traducción SIN revisión humana nativa (2026-10-30); guía en docs/I18N-MALAYO.md.
   */
  { codigo: 'ms', nombreNativo: 'Bahasa Melayu', direccion: 'ltr', listo: true },
  /*
   * CROATA (hr-HR) — latino, LTR, ijekaviano, léxico croata (računalo, datoteka, postavke, spremi, tjedan, tisuća, glazba).
   * Plural one/few/other: donde el español declara _one/_other, el croata añade _few con `ConPlurales` (reutilizado del ruso),
   * las tres formas con {{contador}}. Es OTRO idioma que el serbio (sr), el bosnio (bs) y el montenegrino (cnr): nada se
   * copia entre ellos. Traducción SIN revisión humana nativa (2026-10-30); guía y glosario en docs/I18N-CROATA.md.
   */
  /* D5: una clave que falte en croata se busca en bosnio (latino, ijekaviano) antes que en inglés. */
  { codigo: 'hr', nombreNativo: 'Hrvatski', direccion: 'ltr', listo: true, respaldoVecino: 'bs' },
  /*
   * BOSNIO (bs-BA) — latino, LTR, ijekaviano, léxico bosnio (računar, sedmica, hiljada, muzika, postavke, sačuvaj,
   * obavještenja). Plural one/few/other con `ConPlurales` (reutilizado del ruso), las tres formas con {{contador}}. Es OTRO
   * idioma que el croata (hr), el serbio (sr) y el montenegrino (cnr): nada se copia entre ellos. Traducción SIN revisión
   * humana nativa (2026-10-30); guía y glosario en docs/I18N-BOSNIO.md.
   */
  /* D5: una clave que falte en bosnio se busca en croata (latino, ijekaviano) antes que en inglés. */
  { codigo: 'bs', nombreNativo: 'Bosanski', direccion: 'ltr', listo: true, respaldoVecino: 'hr' },
  /*
   * SERBIO (sr-RS) — ekaviano, DOS ESCRITURAS como el chino: el cirílico es la base (`textos/sr/`, traducido a mano) y
   * el latino (`textos/sr-Latn/`) se GENERA con scripts/i18n-sr-latn.mjs (conversión 1:1 del alfabeto serbio; nunca se edita
   * a mano). Las variantes van en `variantes[]` con sus `cubre[]`. Plural one/few/other con `ConPlurales` (reutilizado del
   * ruso), las tres formas con {{contador}}. Marcas en latino dentro del cirílico, sin declinar (sustantivo puente).
   * Traducción SIN revisión humana nativa (2026-10-30); guía y glosario en docs/I18N-SERBIO.md.
   */
  /*
   * El serbio tiene DOS escrituras oficiales y la misma norma: no son dos idiomas, son dos formas de escribir el mismo
   * (como el chino). El cirílico es la base traducida (`textos/sr/`); el latino (`textos/sr-Latn/`) se GENERA con
   * scripts/i18n-sr-latn.mjs y nunca se edita a mano. `cubre` reparte los locales del aparato: los que dicen Cyrl (o nada)
   * caen en cirílico; los que dicen Latn, en latino. Un aparato en sr-ME (Montenegro sin código cnr) recibe serbio latino.
   */
  {
    codigo: 'sr',
    nombreNativo: 'Српски',
    direccion: 'ltr',
    listo: true,
    variantes: [
      {
        locale: 'sr-Cyrl',
        nombreNativo: 'Српски (ћирилица)',
        cubre: ['sr', 'sr-RS', 'sr-Cyrl', 'sr-Cyrl-RS', 'sr-Cyrl-BA', 'sr-Cyrl-ME'],
      },
      {
        locale: 'sr-Latn',
        nombreNativo: 'Srpski (latinica)',
        cubre: ['sr-Latn', 'sr-Latn-RS', 'sr-Latn-BA', 'sr-Latn-ME', 'sr-ME'],
      },
    ],
  },
  /*
   * MONTENEGRINO (cnr-ME) — código ISO 639-3 `cnr` (no tiene código de dos letras; `cnr-ME` es BCP 47 válido). Latino,
   * LTR, ijekaviano. Intl NO conoce `cnr` y lo resuelve a sr-ME: los formatos salen correctos para Montenegro por el respaldo
   * de ICU (medido en la suite), y el nombre del idioma sale de este catálogo, nunca de Intl. Plural one/few/other con
   * `ConPlurales` (reutilizado del ruso). Es OTRO idioma que el serbio, el croata y el bosnio: nada se copia entre ellos.
   * Traducción SIN revisión humana nativa (2026-10-30); guía y glosario en docs/I18N-MONTENEGRINO.md.
   */
  /*
   * D6: `cnr` es su propia identidad. No se deduce de `sr-ME` (un teléfono en serbio con región Montenegro eligió
   * serbio) y nunca se canonicaliza: `Intl.getCanonicalLocales('cnr')` da `sr-ME`, así que el resolutor no la usa.
   * D5: una clave que falte se busca en serbio LATINO (la misma escritura) antes que en inglés; nunca en cirílico.
   */
  { codigo: 'cnr', nombreNativo: 'Crnogorski', direccion: 'ltr', listo: true, respaldoVecino: 'sr-Latn' },
  /*
   * POLACO (pl-PL) — latino, LTR, tuteo, todos los diacríticos. Plural one/few/many/other: donde el español declara
   * _one/_other, el polaco añade _few y _many con `ConPlurales` (reutilizado del ruso), las cuatro formas con {{contador}}
   * (la _other es la de los decimales). Las marcas no se declinan (sustantivo puente). Traducción SIN revisión humana nativa
   * (2026-10-30); guía y glosario en docs/I18N-POLACO.md.
   */
  { codigo: 'pl', nombreNativo: 'Polski', direccion: 'ltr', listo: true },
  /*
   * CATALÁN (ca-ES) — latino, LTR, tuteo, criterios de Softcatalà (imperativo en los botones, «Desa», «Cerca»), l·l con punt
   * volat, apóstrofos. Plural one/other como el español. Las demás regiones (ca-AD, ca-FR, ca-IT) reciben el mismo diccionario
   * con su locale. Traducción SIN revisión por una persona competente en catalán (2026-10-30); guía y glosario en
   * docs/I18N-CATALA.md.
   */
  { codigo: 'ca', nombreNativo: 'Català', direccion: 'ltr', listo: true },
  /*
   * El griego separa palabras, tiene `one` y `other` y su CERO es `other`, como el español; una sola escritura y
   * de izquierda a derecha, así que nada de lo del japonés, el chino o el árabe le aplica. Lo suyo es la CAJA: en
   * mayúsculas sostenidas se quita el tono («ΡΥΘΜΙΣΕΙΣ», «ΜΑΪΟΣ»), que lo hace `enMayusculas` en `i18n/caja.ts`, y al
   * buscar no cuentan ni el tono, ni la diéresis, ni la sigma final. Se tutea («εσύ»), los botones son sustantivos de
   * acción («Αποθήκευση») y las marcas van en latino con artículo neutro («στο Weë»). El signo de interrogación es
   * «;». Todo eso está en `docs/I18N-GRIEGO.md` y lo vigila `functions/test/i18n-griego.test.mjs`.
   */
  { codigo: 'el', nombreNativo: 'Ελληνικά', direccion: 'ltr', listo: true },
  /*
   * El neerlandés se tutea («je/jij»), los botones van en infinitivo («Opslaan») y lo que es una sola palabra se
   * escribe junto («profielfoto»); junto a una marca, con guion («Weë-profiel»). Tiene `one` y `other` y su cero es
   * `other`. Lo único que pide al sistema común es el dígrafo «ij»: a principio de frase son DOS mayúsculas («IJsje»),
   * que lo hace `conMayusculaInicial` en `i18n/caja.ts`. Los formatos (`€ 1.234,50`, `29-10-2026`, 14:30) los da
   * `Intl` con `nl-NL`. Todo eso está en `docs/I18N-NEERLANDES.md` y lo vigila `functions/test/i18n-neerlandes.test.mjs`.
   */
  { codigo: 'nl', nombreNativo: 'Nederlands', direccion: 'ltr', listo: true },
  /*
   * Como el coreano, el chino y el japonés, el vietnamita NO distingue número: `Intl.PluralRules('vi')` declara una
   * sola categoría, así que `_one` nunca se lee y lleva el mismo texto que `_other`. Los tonos se apilan sobre vocales
   * con circunflejo o cuerno y TODO va en NFC con precompuestos. Se trata de «bạn». Formatos de `Intl` con `vi-VN`
   * (`1.234.567 ₫`, `29/10/2026`). Todo en `docs/I18N-VIETNAMITA.md`; lo vigila `functions/test/i18n-vietnamita.test.mjs`.
   */
  { codigo: 'vi', nombreNativo: 'Tiếng Việt', direccion: 'ltr', listo: true },
  /*
   * El húngaro se tutea («te») y escribe los botones como sustantivo de acción («Mentés»). Tiene `one` y
   * `other`, pero tras un número el sustantivo va en singular, así que las dos formas suelen decir lo mismo. Lo suyo son
   * los SUFIJOS con armonía vocálica: nunca se pegan a un {{hueco}} (se reescribe la frase) y sobre una marca van con
   * guion y vocal anterior («a Weë-ben»). «ő» y «ű» son letras propias. Formatos de `Intl` con `hu-HU` (`1235 Ft`,
   * `2026. 10. 29.`). Todo en `docs/I18N-HUNGARO.md`; lo vigila `functions/test/i18n-hungaro.test.mjs`.
   */
  { codigo: 'hu', nombreNativo: 'Magyar', direccion: 'ltr', listo: true },
  /*
   * El finés se tutea («sinä», casi siempre omitido) y escribe los botones en imperativo («Tallenna»). Tiene `one` y
   * `other`, y aquí sí cambian: tras un número mayor que 1 el sustantivo va en PARTITIVO («3 kommenttia»). Lo suyo son los
   * CASOS: una terminación nunca se pega a un {{hueco}} (la palabra con caso va delante: «käyttäjältä {{nombre}}») y una
   * marca no se declina («Weë-sovelluksessa», o «Weë:ssä» con dos puntos si no hay otra). Compuestos juntos («profiilikuva»).
   * Formatos de `Intl` con `fi-FI` (`1 234,50 €`, `29.10.2026`, `klo 14.30`). Todo en `docs/I18N-FINES.md`; lo vigila
   * `functions/test/i18n-fines.test.mjs`.
   */
  { codigo: 'fi', nombreNativo: 'Suomi', direccion: 'ltr', listo: true },
  /*
   * MONGOL (mn-MN) — cirílico mongol (con Ө/ө y Ү/ү), de izquierda a derecha. Un solo diccionario para Mongolia;
   * la escritura tradicional (Mongolia Interior) no se contempla. Ninguna terminación de caso pegada a un {{hueco}}
   * (se reformula con sustantivo puente) y sobre una marca solo con guion («Weë-д»). Plural: one/other con
   * `{{contador}}` (el sustantivo no cambia tras número). Traducción SIN revisión humana nativa (2026-10-30);
   * guía y glosario en docs/I18N-MONGOL.md.
   */
  { codigo: 'mn', nombreNativo: 'Монгол', direccion: 'ltr', listo: true },
  /*
   * NORUEGO BOKMÅL (nb-NO) — latino, LTR, tuteo («du»), æ ø å, compuestos juntos. Solo bokmål: nynorsk (nn) queda fuera.
   * Plural one/other como el español. Ni danés ni sueco (av, hva, meg, ikke, og). Traducción SIN revisión humana nativa
   * (2026-10-30); guía y glosario en docs/I18N-NORUEGO.md.
   */
  /* El filipino: tuteo sin «po», y el plural en el enlace del número. docs/I18N-FILIPINO.md. */
  { codigo: 'fil', nombreNativo: 'Filipino', direccion: 'ltr', listo: true },
  /*
   * D3: el `no` genérico llega aquí (ALIAS_DE_IDIOMA). D4: el nynorsk (`nn`) NO: es otra norma y, mientras no haya
   * diccionario propio, cae en inglés por la cadena de siempre; tampoco tiene a `nb` de respaldo vecino.
   */
  { codigo: 'nb', nombreNativo: 'Norsk (bokmål)', direccion: 'ltr', listo: true },
  /*
   * IRLANDÉS (ga-IE) — latino con síneadh fada (áéíóú), LTR, tuteo («tú»), mutaciones iniciales (lenición y eclipsis) que
   * van dentro de la palabra. Plural de CINCO formas por Intl.PluralRules('ga'): one, two, few (3-6), many (7-10) y other (0 y 11+);
   * donde el español declara _one/_other el irlandés añade _two/_few/_many con `ConPlurales` propio (textos/ga/plurales.ts),
   * todas con {{contador}}. Las marcas no se mutan ni se declinan. Idioma con pocos recursos digitales: traducción SIN revisión
   * humana nativa (2026-10-30), confianza más baja que la media; guía y glosario en docs/I18N-IRLANDES.md.
   */
  { codigo: 'ga', nombreNativo: 'Gaeilge', direccion: 'ltr', listo: true },
  /*
   * JEMER (km-KH) — escritura jemer (abugida con consonantes apiladas y vocales dependientes), LTR, sin espacios entre palabras:
   * los cortes de línea van con U+200B (ZWSP) dentro de las frases y el espacio normal separa cláusulas, marcas, cifras y huecos.
   * Intl.PluralRules('km') solo tiene «other»: _one y _other van idénticos con {{contador}}. Dígitos LATINOS por defecto (Intl km-KH),
   * moneda con ៛ pospuesto. Tipografía CRÍTICA: la fuente del sistema (Khmer OS / Noto Sans Khmer) y un lineHeight generoso por
   * las vocales apiladas; Inter no tiene glifos jemeres. Traducción SIN revisión humana nativa (2026-10-30); guía en docs/I18N-JEMER.md.
   */
  { codigo: 'km', nombreNativo: 'ភាសាខ្មែរ', direccion: 'ltr', listo: true },
  /*
   * RUMANO (ro-RO) — ș/ț con coma abajo (U+0219/U+021B, nunca cedilla), tuteo, botones en imperativo. Plural
   * one/few/other: «1 vot», «3 voturi», «20 de voturi» (la forma _few la añade `ConPlurales`, reutilizado del ruso).
   * El artículo nunca se pega a una marca («Profilul Weë», no «Weë-ul»). Traducción SIN revisión humana nativa
   * (2026-10-30); guía y glosario en docs/I18N-RUMANO.md.
   */
  { codigo: 'ro', nombreNativo: 'Română', direccion: 'ltr', listo: true },
  /*
   * ISLANDÉS (is-IS) — latino, LTR, þú; plural one/other (one = 1, 21, 31…, no 11). Sin variantes ni vecino de respaldo: lo que
   * falte cae en inglés, nunca en danés ni noruego. Traducción SIN revisión humana nativa (2026-11-03); guía en docs/I18N-ISLANDES.md.
   */
  { codigo: 'is', nombreNativo: 'Íslenska', direccion: 'ltr', listo: true },
  /*
   * GROENLANDÉS / KALAALLISUT (kl-GL) — lengua esquimo-aleutiana propia, polisintética; NO es danés ni una variante del danés,
   * no tiene respaldo vecino y lo que falte cae en inglés, nunca en danés. Plural one/other (CLDR). `intlNoFiable`: el tiempo
   * relativo de CLDR para kl usa el marco danés «for … siden»; no se usa (formato.ts escribe la fecha). Las listas tampoco tienen
   * datos en Intl para kl y formato.ts las escribe sin conjunción. Traducción SIN revisión humana nativa (2026-11-03), confianza
   * baja-media declarada por los traductores; guía en docs/I18N-GROENLANDES.md.
   */
  { codigo: 'kl', nombreNativo: 'Kalaallisut', direccion: 'ltr', listo: true, intlNoFiable: ['RelativeTimeFormat'] },
  /*
   * Lo propio del turco no es el plural —`Intl.PluralRules('tr')` tiene `one` y
   * `other`, y tras una cifra el sustantivo va en singular, así que las dos
   * formas suelen decir lo mismo— sino la CAJA y los SUFIJOS: la mayúscula de
   * «i» es «İ» y la minúscula de «I» es «ı», así que nada se pasa a mayúsculas
   * o minúsculas sin su locale; y un sufijo no se pega a un {{hueco}}, porque
   * su vocal depende de una palabra que no se conoce. Todo eso está en
   * `docs/I18N-TURCO.md` y lo vigila `functions/test/i18n-turco.test.mjs`.
   */
  { codigo: 'tr', nombreNativo: 'Türkçe', direccion: 'ltr', listo: true },
  /*
   * Primer idioma que necesita MÁS formas de plural que el español: cuatro en
   * vez de dos. El motor ya lo preveía y el tipo lo permite desde
   * `textos/ru/plurales.ts`; lo comprueba `functions/test/i18n-plurales-ru.test.mjs`
   * ejecutando el traductor de verdad con los doce números que importan.
   */
  { codigo: 'ru', nombreNativo: 'Русский', direccion: 'ltr', listo: true },
  /*
   * ÁRABE ESTÁNDAR MODERNO. Seis formas de plural (`zero/one/two/few/many/other`), declaradas con `ConPlurales` ampliado en
   * `textos/ar/plurales.ts`. Se lee de DERECHA A IZQUIERDA: la dirección ya estaba en el catálogo (`direccion: 'rtl'`) y la
   * entrega `useDireccion`; activarla de verdad en toda la interfaz es el frente RTL descrito en `docs/I18N-ARABE.md` § 1.
   * Los números los formatea `Intl` con el locale del aparato (dígitos orientales en `ar-EG`), nunca a mano. Las marcas van en
   * latino con artículo árabe separado («تطبيق Weë»). Lo vigila `functions/test/i18n-arabe.test.mjs`.
   */
  /*
   * D1: `ar` es la identidad (un solo diccionario, árabe estándar); `ar-SA` es el formato regional cuando no hay región.
   * D2: la elección manual sin región hereda la del aparato si es árabe (`ar` + aparato `ar-EG` → `ar-EG`); una región
   * elegida explícitamente se respeta. Igual que la elección automática.
   */
  { codigo: 'ar', nombreNativo: 'العربية', direccion: 'rtl', listo: true, localePorDefecto: 'ar-SA', heredaRegionDelAparato: true },
  /*
   * El hindi tiene dos cosas que no se ven en ningún otro idioma de Weë. La
   * primera: el CERO es `one` (`Intl.PluralRules('hi')` pone 0 y 1 en `one`),
   * así que ninguna forma `_one` puede escribir «1» ni «एक» a mano. La segunda:
   * la nukta de «फ़ोटो» o «ज़रूरी» se escribe letra + U+093C, porque las letras
   * precompuestas (U+0958–U+095F) no sobreviven a NFC. Se trata de «आप», las
   * marcas van en latino con la posposición separada («Weë पर») y la frase
   * acaba en «.». El nombre del selector es el de CLDR, «हिन्दी»; en el texto
   * corrido, «हिंदी». Todo eso está en `docs/I18N-HINDI.md` y lo vigila
   * `functions/test/i18n-hindi.test.mjs`.
   */
  { codigo: 'hi', nombreNativo: 'हिन्दी', direccion: 'ltr', listo: true },
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
  /*
   * Como el coreano y el chino, el japonés NO distingue número: `_one` lleva el
   * mismo texto que `_other`. Una sola escritura, así que sin variantes; su
   * locale es `ja-JP`. Lo propio del japonés —las marcas en latino y nunca en
   * katakana, la puntuación de ancho completo, sin espacios entre japonés y
   * latino— está en `docs/I18N-JAPONES.md` y lo vigila
   * `functions/test/i18n-japones.test.mjs`.
   */
  { codigo: 'ja', nombreNativo: '日本語', direccion: 'ltr', listo: true },
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
/**
 * ETIQUETAS QUE SON OTRO NOMBRE DEL MISMO IDIOMA. CLDR trata el tagalo (`tl`) como el filipino (`fil`): un teléfono que
 * dice `tl-PH` tiene que llegar al diccionario filipino. Se aplica al normalizar el locale (i18n/resolver.ts).
 */
/* D3 (dueño, 2026-11-03): `no` (noruego genérico) es el bokmål, la traducción que hay. `nn` (nynorsk) NO es alias (D4). */
export const ALIAS_DE_IDIOMA: Readonly<Record<string, string>> = { tl: 'fil', no: 'nb' };

export const LOCALES_CONTEMPLADOS: readonly string[] = [
  'fil-PH',
  'es-PE', 'es-ES', 'es-MX',
  'en-US', 'en-GB',
  'it-IT',
  'fr-FR', 'fr-CA',
  'de-DE',
  'de-CH',
  'pt-BR', 'pt-PT',
  'sv-SE',
  'da-DK',
  'ar-EG',
  'he-IL',
  'fa-IR',
  'id-ID',
  'ms-MY',
  'hr-HR',
  'bs-BA',
  'sr-RS',
  'cnr-ME',
  'pl-PL',
  'ca-ES',
  'el-GR',
  'nl-NL',
  'vi-VN',
  'hu-HU',
  'fi-FI',
  'mn-MN',
  'nb-NO',
  'is-IS',
  'kl-GL',
  'ga-IE',
  'km-KH',
  'ro-RO',
  'tr-TR',
  'ja-JP',
  'zh-CN', 'zh-TW',
  'ko-KR',
  'ru-RU',
  'hi-IN',
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
