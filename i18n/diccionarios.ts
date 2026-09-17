import { Diccionarios } from './traducir';
import { es } from './textos/es';
import { en } from './textos/en';
import { de } from './textos/de';
import { fr } from './textos/fr';
import { it } from './textos/it';
import { pt } from './textos/pt';
import { ptPT } from './textos/pt-PT';
import { ru } from './textos/ru';
import { ko } from './textos/ko';
import { zh } from './textos/zh';
import { zhTW } from './textos/zh-TW';

/*
 * EL ÚNICO SITIO QUE SABE QUÉ DICCIONARIOS HAY.
 *
 * Añadir un idioma es escribir su archivo en `textos/` y añadir una línea aquí.
 * Ni una pantalla, ni un componente, ni el traductor cambian: por eso este
 * archivo existe en vez de importar los textos desde donde haga falta.
 *
 * SOBRE CARGARLOS SUELTOS: hoy los dos se importan de golpe, y con dos idiomas
 * pequeños es lo correcto —partirlos costaría más de lo que ahorra—. Cuando
 * sean once, la carga perezosa se pone AQUÍ, cambiando este objeto por un mapa
 * de funciones que devuelvan `import()`. Ninguna pantalla se entera, que es
 * justo lo que se buscaba al meter esto detrás de una puerta.
 *
 * Y nunca por red: los diccionarios viajan dentro de la app. Enseñar Weë en
 * otro idioma no puede costar una petición, ni un servicio de traducción, ni un
 * céntimo por persona.
 */
export const DICCIONARIOS: Diccionarios = {
  es,
  en,
  de,
  fr,
  it,
  /*
   * ── EL PORTUGUÉS: DOS NORMAS, EL MISMO IDIOMA ──────────────────────────────
   *
   * `pt` es el BRASILEÑO y hace de base (decisión de producto, 2026-09-16, ver
   * más abajo). `pt-PT` es el europeo, completo: no es un parche que rellene
   * huecos del brasileño, porque el respaldo va clave por clave y una sola sin
   * traducir metería una frase brasileña en medio de una pantalla portuguesa.
   *
   * Y los alias hacen aquí el mismo trabajo que en chino: Angola, Mozambique,
   * Cabo Verde, Guinea-Bisáu, Santo Tomé, Timor y Macao siguen la norma
   * europea. Sin estas líneas, `cadenaDeRespaldo('pt-AO')` daría [pt-AO, pt, en]
   * y les serviría BRASILEÑO.
   */
  pt,
  'pt-PT': ptPT,
  'pt-AO': ptPT,
  'pt-MZ': ptPT,
  'pt-CV': ptPT,
  'pt-GW': ptPT,
  'pt-ST': ptPT,
  'pt-TL': ptPT,
  'pt-MO': ptPT,
  ru,
  ko,
  /*
   * ── EL CHINO: UN IDIOMA, DOS ESCRITURAS, VARIAS PUERTAS ────────────────────
   *
   * `zh` es el simplificado y hace de base del idioma. `zh-TW` es el
   * tradicional, COMPLETO: no es un parche que rellene huecos del simplificado,
   * porque el respaldo es por clave y una sola clave sin traducir metería una
   * frase en simplificado en medio de una pantalla en tradicional.
   *
   * Y luego están los alias, que es lo que de verdad arregla un fallo real: los
   * aparatos NO dicen `zh-TW`. Un teléfono taiwanés de hoy dice `zh-Hant-TW`, y
   * uno de Hong Kong `zh-Hant-HK`. Sin estas líneas, `cadenaDeRespaldo` los
   * mandaría a [zh-Hant-TW, zh, en] y les serviría SIMPLIFICADO: no un texto
   * peor, sino la escritura equivocada entera.
   *
   * Son DATOS —el mismo objeto apuntado desde varias claves—, no lógica nueva:
   * el traductor ya buscaba el locale antes que el idioma desde el primer día.
   * La lista sale de `idiomas.ts`, donde cada variante declara qué locales
   * cubre, y una prueba comprueba que las dos digan lo mismo.
   */
  zh,
  'zh-TW': zhTW,
  'zh-HK': zhTW,
  'zh-MO': zhTW,
  'zh-Hant': zhTW,
  'zh-Hant-TW': zhTW,
  'zh-Hant-HK': zhTW,
  'zh-Hant-MO': zhTW,
};

/*
 * ── LO QUE NUNCA SE TRADUCE, EN NINGÚN IDIOMA ────────────────────────────────
 *
 * Quien venga a añadir el portugués, el ruso o el japonés lee este archivo:
 * aquí está la puerta. Así que la regla queda aquí también.
 *
 * Los nombres de Weë son MARCA y se escriben IGUAL en los once idiomas: Weë,
 * Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI y las once experiencias (Weë
 * Studio, Weë Brain, Weë Chef…). No se traducen, no se adaptan, no se
 * pluralizan, no se transliteran, no cambian de mayúsculas y no pierden ni un
 * diacrítico. "Credits" no es "Crédits" ni "Kredite"; "Weë Brain" no es "Weë
 * Cerveau". Lo que se traduce es el texto que los rodea.
 *
 * No hace falta acordarse: `functions/test/i18n-nombres-propios.test.mjs` lo
 * comprueba en todos los idiomas que existan, y sabe reconocer las
 * deformaciones típicas de cada uno. La lista oficial la saca del §8 de las
 * instrucciones del proyecto y de `constants/weeExperiences.ts`, no de una
 * copia suelta que pueda quedarse vieja.
 *
 * (Sin nombrar aquí ese archivo a propósito: la prueba 43 de `i18n.test.mjs`
 * vigila que en esta capa no aparezca el nombre de ningún traductor de IA, y
 * uno de los que busca coincide con el del archivo.)
 *
 * ── LA VARIANTE OFICIAL DEL PORTUGUÉS: BRASIL ───────────────────────────────
 *
 * Un idioma no siempre es una sola norma, y el portugués son dos bien
 * distintas. Aquí hay UN diccionario `pt`, así que hubo que elegir, y la
 * elección es firme (decisión del usuario, 2026-09-16):
 *
 *   `pt` ES PORTUGUÉS BRASILEÑO (pt-BR), Y NO SE CONVIERTE EN EUROPEO.
 *
 * El motivo es de producto, no de lingüística: Brasil es el mercado
 * internacional más cercano de Weë y la experiencia en portugués tiene que
 * estar optimizada para quien vive allí. En la práctica: se tutea con «você»,
 * se escribe «arquivo» y no «ficheiro», «tela» y no «ecrã», «celular» y no
 * «telemóvel», «Cadastre-se» y no «Registe-se», «Boas-vindas» y no la forma
 * europea; y los números, fechas y unidades siguen la convención brasileña.
 *
 * `pt-PT` sigue en `LOCALES_CONTEMPLADOS` y eso NO cambia nada de lo anterior:
 * un locale solo decide FORMATOS. Si algún día Weë ofrece portugués europeo,
 * será un diccionario aparte que habrá que escribir a propósito; hasta
 * entonces, quien venga a retocar una cadena de `pt` escribe en brasileño.
 *
 * Tampoco hace falta acordarse de esto: `functions/test/i18n-variantes.test.mjs`
 * lo comprueba, sabe reconocer las formas europeas típicas y trae su propio
 * control para demostrar que sabe fallar.
 */

/**
 * Los IDIOMAS que tienen diccionario. Lo que mira el resolutor.
 *
 * Se dejan fuera las claves con región —`zh-TW`, `zh-Hant-HK`…—, que no son
 * idiomas sino variantes del mismo. El resolutor pregunta «¿tengo chino?», no
 * «¿tengo chino de Taiwán?»: la variante la elige después la cadena de
 * respaldo, que ya busca el locale antes que el idioma.
 */
export const idiomasConDiccionario = (): string[] =>
  Object.keys(DICCIONARIOS).filter((c) => !c.includes('-'));

/** Todas las claves registradas, variantes incluidas. Para las pruebas. */
export const clavesConDiccionario = (): string[] => Object.keys(DICCIONARIOS);
