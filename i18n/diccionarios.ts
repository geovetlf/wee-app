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
import { ja } from './textos/ja';
import { tr } from './textos/tr';
import { sv } from './textos/sv';
import { da } from './textos/da';
import { hi } from './textos/hi';
import { servidor as servidorEs } from './textos/es/servidor';
import { servidor as servidorEn } from './textos/en/servidor';
import { servidor as servidorDa } from './textos/da/servidor';
import { servidor as servidorDe } from './textos/de/servidor';
import { servidor as servidorFr } from './textos/fr/servidor';
import { servidor as servidorIt } from './textos/it/servidor';
import { servidor as servidorPt } from './textos/pt/servidor';
import { servidor as servidorRu } from './textos/ru/servidor';
import { servidor as servidorKo } from './textos/ko/servidor';
import { servidor as servidorZh } from './textos/zh/servidor';
import { servidor as servidorJa } from './textos/ja/servidor';
import { servidor as servidorTr } from './textos/tr/servidor';
import { servidor as servidorSv } from './textos/sv/servidor';
import { servidor as servidorHi } from './textos/hi/servidor';
import { servidor as servidorPtPT } from './textos/pt-PT/servidor';
import { servidor as servidorZhTW } from './textos/zh-TW/servidor';
/* Los 23 idiomas de la oleada de 40 y la variante suiza (lotes L0 + L1). */
import { deCH } from './textos/de-CH';
import { servidor as servidorDeCH } from './textos/de-CH/servidor';
import { ar } from './textos/ar';
import { servidor as servidorAr } from './textos/ar/servidor';
import { he } from './textos/he';
import { servidor as servidorHe } from './textos/he/servidor';
import { fa } from './textos/fa';
import { servidor as servidorFa } from './textos/fa/servidor';
import { id } from './textos/id';
import { servidor as servidorId } from './textos/id/servidor';
import { ms } from './textos/ms';
import { servidor as servidorMs } from './textos/ms/servidor';
import { hr } from './textos/hr';
import { servidor as servidorHr } from './textos/hr/servidor';
import { bs } from './textos/bs';
import { servidor as servidorBs } from './textos/bs/servidor';
import { sr } from './textos/sr';
import { servidor as servidorSr } from './textos/sr/servidor';
import { srLatn } from './textos/sr-Latn';
import { servidor as servidorSrLatn } from './textos/sr-Latn/servidor';
import { cnr } from './textos/cnr';
import { servidor as servidorCnr } from './textos/cnr/servidor';
import { pl } from './textos/pl';
import { servidor as servidorPl } from './textos/pl/servidor';
import { ca } from './textos/ca';
import { servidor as servidorCa } from './textos/ca/servidor';
import { el } from './textos/el';
import { servidor as servidorEl } from './textos/el/servidor';
import { nl } from './textos/nl';
import { servidor as servidorNl } from './textos/nl/servidor';
import { vi } from './textos/vi';
import { servidor as servidorVi } from './textos/vi/servidor';
import { hu } from './textos/hu';
import { servidor as servidorHu } from './textos/hu/servidor';
import { fi } from './textos/fi';
import { servidor as servidorFi } from './textos/fi/servidor';
import { mn } from './textos/mn';
import { servidor as servidorMn } from './textos/mn/servidor';
import { nb } from './textos/nb';
import { servidor as servidorNb } from './textos/nb/servidor';
import { is } from './textos/is';
import { servidor as servidorIs } from './textos/is/servidor';
import { kl } from './textos/kl';
import { servidor as servidorKl } from './textos/kl/servidor';
import { fil } from './textos/fil';
import { servidor as servidorFil } from './textos/fil/servidor';
import { ga } from './textos/ga';
import { servidor as servidorGa } from './textos/ga/servidor';
import { km } from './textos/km';
import { servidor as servidorKm } from './textos/km/servidor';
import { ro } from './textos/ro';
import { servidor as servidorRo } from './textos/ro/servidor';

/*
 * EL ÚNICO SITIO QUE SABE QUÉ DICCIONARIOS HAY.
 *
 * Añadir un idioma es escribir su archivo en `textos/` y añadir una línea aquí.
 * Ni una pantalla, ni un componente, ni el traductor cambian: por eso este
 * archivo existe en vez de importar los textos desde donde haga falta.
 *
 * SOBRE CARGARLOS SUELTOS: hoy todos se importan de golpe, que es lo más simple
 * y lo que no puede fallar en el arranque. El día que su peso se note al abrir
 * la app, la carga perezosa se pone AQUÍ, cambiando este objeto por un mapa
 * de funciones que devuelvan `import()`. Ninguna pantalla se entera, que es
 * justo lo que se buscaba al meter esto detrás de una puerta.
 *
 * Y nunca por red: los diccionarios viajan dentro de la app. Enseñar Weë en
 * otro idioma no puede costar una petición, ni un servicio de traducción, ni un
 * céntimo por persona.
 */
/*
 * LOS TEXTOS DEL SERVIDOR van aparte (`textos/<idioma>/servidor/`, ver su índice) porque son una sección opcional:
 * el idioma que los ha traducido los suma aquí a su diccionario; el que no, cae en el inglés por la cadena de siempre.
 */
const ptPTCompleto = { ...ptPT, ...servidorPtPT };
const zhTWCompleto = { ...zhTW, ...servidorZhTW };
const deCHCompleto = { ...deCH, ...servidorDeCH };
const srCompleto = { ...sr, ...servidorSr };
const srLatnCompleto = { ...srLatn, ...servidorSrLatn };

export const DICCIONARIOS: Diccionarios = {
  es: { ...es, ...servidorEs },
  en: { ...en, ...servidorEn },
  de: { ...de, ...servidorDe },
  fr: { ...fr, ...servidorFr },
  it: { ...it, ...servidorIt },
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
  pt: { ...pt, ...servidorPt },
  'pt-PT': ptPTCompleto,
  'pt-AO': ptPTCompleto,
  'pt-MZ': ptPTCompleto,
  'pt-CV': ptPTCompleto,
  'pt-GW': ptPTCompleto,
  'pt-ST': ptPTCompleto,
  'pt-TL': ptPTCompleto,
  'pt-MO': ptPTCompleto,
  ru: { ...ru, ...servidorRu },
  ko: { ...ko, ...servidorKo },
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
  zh: { ...zh, ...servidorZh },
  'zh-TW': zhTWCompleto,
  'zh-HK': zhTWCompleto,
  'zh-MO': zhTWCompleto,
  'zh-Hant': zhTWCompleto,
  'zh-Hant-TW': zhTWCompleto,
  'zh-Hant-HK': zhTWCompleto,
  'zh-Hant-MO': zhTWCompleto,
  ja: { ...ja, ...servidorJa },
  tr: { ...tr, ...servidorTr },
  sv: { ...sv, ...servidorSv },
  da: { ...da, ...servidorDa },
  hi: { ...hi, ...servidorHi },
  /* Lote L1 (2026-11-03): los 23 idiomas de la oleada de 40 y la variante suiza, completos. Sin revisión nativa. */
  /* Suiza y Liechtenstein: la variante suiza completa (ss, léxico, «…»). Austria sigue en el alemán base. */
  'de-CH': deCHCompleto,
  'de-LI': deCHCompleto,
  ar: { ...ar, ...servidorAr },
  he: { ...he, ...servidorHe },
  fa: { ...fa, ...servidorFa },
  id: { ...id, ...servidorId },
  ms: { ...ms, ...servidorMs },
  hr: { ...hr, ...servidorHr },
  bs: { ...bs, ...servidorBs },
  sr: srCompleto,
  /*
   * ── EL SERBIO: DOS ESCRITURAS, EL MISMO IDIOMA ─────────────────────────────
   * `sr` es el cirílico y hace de base. `sr-Latn` es el latino, GENERADO desde el cirílico (scripts/i18n-sr-latn.mjs);
   * los alias hacen que un aparato en sr-Latn-BA o sr-ME lea latino y uno en sr-Cyrl-RS lea cirílico.
   */
  'sr-Cyrl': srCompleto,
  'sr-Cyrl-RS': srCompleto,
  'sr-Latn': srLatnCompleto,
  'sr-Latn-RS': srLatnCompleto,
  'sr-Latn-BA': srLatnCompleto,
  'sr-Latn-ME': srLatnCompleto,
  'sr-ME': srLatnCompleto,
  cnr: { ...cnr, ...servidorCnr },
  pl: { ...pl, ...servidorPl },
  ca: { ...ca, ...servidorCa },
  el: { ...el, ...servidorEl },
  nl: { ...nl, ...servidorNl },
  vi: { ...vi, ...servidorVi },
  hu: { ...hu, ...servidorHu },
  fi: { ...fi, ...servidorFi },
  mn: { ...mn, ...servidorMn },
  nb: { ...nb, ...servidorNb },
  /* Islandés y groenlandés (2026-11-03). kl es lengua propia: ni alias ni respaldo hacia el danés. */
  is: { ...is, ...servidorIs },
  kl: { ...kl, ...servidorKl },
  fil: { ...fil, ...servidorFil },
  ga: { ...ga, ...servidorGa },
  km: { ...km, ...servidorKm },
  ro: { ...ro, ...servidorRo },
};

/*
 * ── LO QUE NUNCA SE TRADUCE, EN NINGÚN IDIOMA ────────────────────────────────
 *
 * Quien venga a añadir un idioma lee este archivo: aquí está la puerta. Así
 * que la regla queda aquí también.
 *
 * Los nombres de Weë son MARCA y se escriben IGUAL en todos los idiomas: Weë,
 * Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI y las experiencias (Weë
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

