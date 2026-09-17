import { Diccionarios } from './traducir';
import { es } from './textos/es';
import { en } from './textos/en';
import { de } from './textos/de';
import { fr } from './textos/fr';
import { it } from './textos/it';
import { pt } from './textos/pt';
import { ru } from './textos/ru';
import { ko } from './textos/ko';

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
  pt,
  ru,
  ko,
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

/** Los idiomas que tienen diccionario de verdad. Lo que mira el resolutor. */
export const idiomasConDiccionario = (): string[] => Object.keys(DICCIONARIOS);
