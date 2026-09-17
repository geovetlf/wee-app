import { CodigoDeIdioma, IDIOMA_DE_RESERVA, idiomaDelCatalogo } from './idiomas';

/*
 * DE LO QUE DICE EL APARATO A LO QUE ENSEÑA WEË.
 *
 * Todo lo de este archivo son funciones puras: entra texto, sale texto. No lee
 * el dispositivo, no toca el almacenamiento y no sabe nada de React. Por eso se
 * puede probar entera con una tabla de casos, que es exactamente lo que hace
 * `functions/test/i18n.test.mjs`.
 *
 * LA REGLA QUE MANDA SOBRE TODAS: si la persona eligió un idioma a mano, ese es
 * el idioma. Punto. Ni el aparato, ni la red, ni el país, ni el GPS lo cambian.
 * Esa regla se aplica en `elegirIdioma`, y está escrita en una sola línea a
 * propósito, para que no haya dónde esconder una excepción.
 */

/** Lo que se sabe de un locale una vez desarmado. */
export interface PartesDelLocale {
  /** 'es' de 'es-PE'. Siempre en minúsculas. */
  idioma: string;
  /** 'PE' de 'es-PE'. Siempre en mayúsculas. `null` si el locale no la trae. */
  region: string | null;
  /** El locale entero y bien escrito: 'es-PE'. */
  locale: string;
}

/**
 * Deja un locale como debe estar: 'es_pe', 'ES-pe' y 'es-PE' son el mismo.
 *
 * Los aparatos no se ponen de acuerdo: Android suele decir `es_PE`, los
 * navegadores `es-PE`, y algunos meten la escritura en medio (`zh-Hant-TW`).
 * Aquí se normaliza todo a la forma con guion, con el idioma en minúsculas y la
 * región en mayúsculas, conservando la escritura si viene.
 */
export const normalizarLocale = (crudo: string): string => {
  const limpio = String(crudo ?? '').trim().replace(/_/g, '-');
  if (!limpio) return '';
  const trozos = limpio.split('-').filter(Boolean);
  if (!trozos.length) return '';
  const idioma = trozos[0].toLowerCase();
  /* Solo letras: descarta basura del tipo "es-PE.UTF-8" o "C". */
  if (!/^[a-z]{2,3}$/.test(idioma)) return '';
  const resto = trozos.slice(1).map((t) => {
    if (/^[a-z]{4}$/i.test(t)) return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); // escritura
    if (/^[a-z]{2}$/i.test(t) || /^\d{3}$/.test(t)) return t.toUpperCase(); // región
    return '';
  }).filter(Boolean);
  return [idioma, ...resto].join('-');
};

/** Desarma un locale en sus piezas. */
export const partesDelLocale = (crudo: string): PartesDelLocale => {
  const locale = normalizarLocale(crudo);
  if (!locale) return { idioma: '', region: null, locale: '' };
  const trozos = locale.split('-');
  const region = trozos.find((t) => /^[A-Z]{2}$/.test(t) || /^\d{3}$/.test(t)) ?? null;
  return { idioma: trozos[0], region, locale };
};

/** Solo el idioma: 'es-PE' → 'es'. */
export const idiomaDe = (crudo: string): string => partesDelLocale(crudo).idioma;

/**
 * LA CADENA DE RESPALDO, del más concreto al más general.
 *
 *   'fr-CA'  →  ['fr-CA', 'fr', 'en']
 *   'es-PE'  →  ['es-PE', 'es', 'en']
 *   'en-GB'  →  ['en-GB', 'en']
 *   basura   →  ['en']
 *
 * Sirve para dos cosas distintas y por eso está aquí y no dentro del traductor:
 * elegir qué diccionario cargar, y buscar UNA CLAVE que falte en el diccionario
 * elegido. Lo segundo es lo que impide que la interfaz se rompa porque a una
 * traducción nueva le falte una línea.
 */
export const cadenaDeRespaldo = (crudo: string): string[] => {
  const { idioma, locale } = partesDelLocale(crudo);
  const cadena: string[] = [];
  if (locale && locale !== idioma) cadena.push(locale);
  if (idioma) cadena.push(idioma);
  if (!cadena.includes(IDIOMA_DE_RESERVA)) cadena.push(IDIOMA_DE_RESERVA);
  return cadena;
};

/** De dónde salió el idioma que se está usando. Se guarda para poder explicarlo. */
export type OrigenDelIdioma = 'elegido' | 'aparato' | 'reserva';

export interface IdiomaResuelto {
  /** El idioma de la interfaz: el diccionario que se va a usar. */
  idioma: CodigoDeIdioma;
  /**
   * El locale de los FORMATOS, con su región si se conoce.
   *
   * No tiene por qué coincidir con el idioma: alguien puede tener la interfaz
   * en inglés y seguir queriendo sus fechas como en Perú. Hoy se deriva del
   * mismo sitio, pero son dos campos porque son dos cosas.
   */
  locale: string;
  origen: OrigenDelIdioma;
}

/**
 * EL APARATO PIDE DOS VECES LO MISMO, Y LA SEGUNDA ES MÁS PRECISA.
 *
 * `navigator.languages` no es una respuesta, es una LISTA ordenada, y muy a
 * menudo la encabeza el idioma a secas y lo concreta justo después:
 *
 *     ['pt', 'pt-PT']          alguien en Portugal
 *     ['zh', 'zh-TW']          alguien en Taiwán
 *     ['es', 'es-ES', 'es-PE'] lo que dicen Chrome y Edge a cada rato
 *
 * Leer solo la primera línea le servía BRASILEÑO a Portugal y SIMPLIFICADO a
 * Taiwán. Eso no es un texto peor: es la norma equivocada entera. Y desde que
 * el locale resuelto se guarda en la cuenta, la pérdida dejaba de recalcularse
 * en cada arranque y se volvía permanente.
 *
 * Había además una asimetría que delata el fallo: `['pt-PT']` conservaba la
 * región y `['pt', 'pt-PT']` la tiraba. La misma persona, la misma lista, y el
 * resultado dependía de en qué posición la hubiera puesto su navegador.
 *
 * ── LO QUE ESTO HACE, Y SOBRE TODO LO QUE NO ───────────────────────────────
 *
 * Solo entra en juego cuando el aparato ganó con el idioma DESNUDO —sin región
 * ni escritura—. Entonces busca en la MISMA lista la primera vez que ese mismo
 * idioma aparece concretado, y usa esa. No inventa nada: la variante tiene que
 * estar escrita por el aparato.
 *
 *     ['pt', 'pt-PT']     → pt-PT   la pidió él
 *     ['pt', 'pt-BR']     → pt-BR   la pidió él
 *     ['pt']              → pt      NO la pidió: se queda como estaba
 *     ['pt-BR', 'pt-PT']  → pt-BR   ya era explícito; nadie le gana el sitio
 *     ['en', 'pt-PT']     → en      otro idioma no concreta este
 *
 * Por eso NO cambia ningún respaldo: `pt` a secas sigue dando brasileño y `zh`
 * a secas sigue dando simplificado, que es lo documentado y lo decidido.
 *
 * Y es genérico por construcción: no sabe qué idiomas tienen variantes
 * declaradas ni le hace falta. Para un idioma de una sola norma lo único que
 * afina es el locale de los FORMATOS —`['es','es-ES']` pasa a dar `es-ES`—,
 * que es exactamente lo que ese aparato pidió y lo que ya hacía cuando la
 * región venía en la primera línea.
 */
const concretarConLaLista = (locale: string, delAparato: readonly string[]): string => {
  const { idioma, locale: normalizado } = partesDelLocale(locale);
  /* Ya venía concretado —'pt-PT', 'zh-Hant'—: el aparato fue explícito a la
   * primera y esto no tiene nada que añadir. */
  if (!idioma || normalizado !== idioma) return locale;

  for (const otro of delAparato) {
    const candidato = normalizarLocale(otro);
    if (!candidato || candidato === idioma) continue;
    /* Del MISMO idioma. Un `pt-PT` no concreta un `en`. */
    if (idiomaDe(candidato) !== idioma) continue;
    return candidato;
  }
  return locale;
};

/**
 * QUÉ IDIOMA ENSEÑAR. La única función que decide.
 *
 * @param elegido    lo que la persona eligió a mano, si eligió algo. MANDA.
 * @param delAparato la lista de preferencias del sistema o del navegador, en su
 *                   orden de preferencia (`navigator.languages` da varias).
 * @param disponibles los idiomas con diccionario de verdad.
 *
 * El orden de los `if` ES la regla de negocio:
 *
 *   1. lo elegido a mano, si sigue siendo un idioma que existe;
 *   2. la primera preferencia del aparato que sepamos hablar, mirando primero
 *      el locale completo y después el idioma a secas; y si ganó el idioma a
 *      secas, concretado con la variante que la propia lista pida después
 *      (`concretarConLaLista`, aquí arriba);
 *   3. inglés.
 *
 * Fíjate en lo que NO hay en esta lista: país, IP, GPS, zona horaria. La
 * ubicación física no entra en esta función porque no entra en esta decisión.
 */
export const elegirIdioma = (
  elegido: string | null | undefined,
  delAparato: readonly string[],
  disponibles: readonly string[],
): IdiomaResuelto => {
  const puedo = (codigo: string) => disponibles.includes(codigo);

  /* 1 · La elección manual gana siempre. */
  const suyo = normalizarLocale(elegido || '');
  if (suyo) {
    const base = idiomaDe(suyo);
    if (puedo(base) && idiomaDelCatalogo(base)) {
      return { idioma: base as CodigoDeIdioma, locale: suyo, origen: 'elegido' };
    }
  }

  /* 2 · Lo que pide el aparato, en su orden, del locale completo al idioma. */
  for (const preferido of delAparato) {
    const locale = normalizarLocale(preferido);
    if (!locale) continue;
    for (const escalon of cadenaDeRespaldo(locale)) {
      if (escalon === IDIOMA_DE_RESERVA && idiomaDe(locale) !== IDIOMA_DE_RESERVA) break;
      if (puedo(escalon) && idiomaDelCatalogo(idiomaDe(escalon))) {
        return {
          idioma: idiomaDe(escalon) as CodigoDeIdioma,
          locale: concretarConLaLista(locale, delAparato),
          origen: 'aparato',
        };
      }
    }
  }

  /* 3 · Inglés, y con el locale del aparato si lo hubo: la interfaz cambia de
   * lengua, pero las fechas y los números pueden seguir siendo los de su sitio. */
  const primeroDelAparato = delAparato.map(normalizarLocale).find(Boolean);
  return {
    idioma: IDIOMA_DE_RESERVA,
    locale: primeroDelAparato || 'en-US',
    origen: 'reserva',
  };
};
