import { Post } from '../services/firestoreService';
import { postsDeLaSeccion } from './sectionFeed';

/*
 * DOS FORMAS DE FILTRAR, Y NO SON LA MISMA.
 *
 * · POR TIPO DE CONTENIDO —imágenes, tutoriales—. Lo usaban los muros que cada
 *   experiencia tuvo, donde ya sabías en qué sección estabas y lo que querías
 *   era acotar QUÉ mirar. Aquellos muros se fueron; el filtro se queda porque
 *   sigue siendo una forma válida de acotar y no cuesta nada tenerlo.
 *
 * · POR SECCIÓN DE WEË —Weë Studio, Weë Travel…—. Lo usa el muro del Home, donde
 *   está todo junto y lo que quieres es acotar DE DÓNDE viene.
 *
 * Van separadas a propósito: el Home cambió de criterio y las paredes de sección
 * no, así que mezclarlas habría cambiado unas al tocar las otras.
 */

// ─── Por tipo de contenido: las paredes de cada experiencia ──────────────────

/** Filtros simples del feed "Creado por la comunidad" (docs/UX.md §16). */
export type FeedFilterId = 'all' | 'images' | 'videos' | 'questions' | 'tutorials';

export const FEED_FILTER_OPTIONS: { id: FeedFilterId; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'images', label: 'Imágenes' },
  { id: 'videos', label: 'Videos' },
  { id: 'questions', label: 'Preguntas' },
  { id: 'tutorials', label: 'Tutoriales' },
];

export const filterPosts = (posts: Post[], filter: FeedFilterId): Post[] => {
  if (filter === 'all') return posts;
  return posts.filter((p) => {
    const hasImages = !!(p.imageUrls && p.imageUrls.length > 0) || !!p.imageUrl;
    const hasVideo = !!p.videoUrl;
    const text = (p.content || '').toLowerCase();
    switch (filter) {
      case 'images':
        return hasImages && !hasVideo;
      case 'videos':
        return hasVideo;
      case 'questions':
        return !!p.poll || text.includes('?') || text.includes('¿');
      case 'tutorials':
        return !!p.aiProcess || !!p.aiPrompt || /tutorial|paso a paso|c[oó]mo (lo )?hice|c[oó]mo hacer/.test(text) || (p.tags || []).some((t) => /tutorial/i.test(t));
      default:
        return true;
    }
  });
};

// ─── Por sección de Weë: las pastillas del Home ──────────────────────────────

/*
 * De dónde viene cada publicación. Es lo que una persona reconoce del producto
 * —"esto salió de Weë Travel"— y lo que ya decide quien publica al elegir sus
 * destinos, así que no hay criterio nuevo que inventar.
 *
 * Los identificadores son los de `NOMBRE_SECCION` en `utils/sectionFeed.ts`; el
 * reparto lo hace `postsDeLaSeccion`, que es exactamente lo mismo que usan los
 * muros de sección: mandan los destinos elegidos, y lo publicado antes de que
 * existieran los destinos se sigue leyendo por sus marcas. Aquí solo se elige
 * cuál de ellas mirar.
 */
export type HomeSectionId = 'all' | 'studio' | 'travel' | 'music' | 'chef' | 'design' | 'business';

/*
 * Siete, en este orden. "Todo" al entrar; después las secciones donde se
 * publica. Weë Design y Weë Business entraron con el carrusel de secciones del
 * Home (2026-09-12): son destinos de publicación desde antes, así que el
 * reparto ya sabía repartirlos y solo faltaba poder elegirlos.
 */
export const HOME_SECTION_FILTERS: { id: HomeSectionId; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'studio', label: 'WeeStudio' },
  { id: 'travel', label: 'WeeTravel' },
  { id: 'music', label: 'WeeMusic' },
  { id: 'chef', label: 'WeeChef' },
  { id: 'design', label: 'WeeDesign' },
  /* Con esta grafía, en mayúsculas, por decisión de producto (2026-09-12). */
  { id: 'business', label: 'WEEBusiness' },
];

export const filterBySection = (posts: Post[], filter: HomeSectionId): Post[] =>
  filter === 'all' ? posts : postsDeLaSeccion(posts, filter);

/*
 * ─── SELECCIÓN MÚLTIPLE: UNA O VARIAS SECCIONES, O "TODO" ─────────────────────
 *
 * La selección es la LISTA de secciones puestas, y "Todo" no está en ella:
 * "Todo" es lo que hay cuando la lista está vacía. Así las dos cosas son
 * excluyentes por construcción, sin un segundo estado que mantener en pie:
 *
 *  · con la lista vacía, "Todo" está puesto y el muro sale entero;
 *  · con una o más secciones, "Todo" no está puesto y el muro enseña lo que
 *    pertenece a CUALQUIERA de ellas;
 *  · tocar "Todo" vacía la lista;
 *  · tocar una sección la mete si no estaba y la saca si estaba;
 *  · sacar la última deja la lista vacía, es decir, vuelve a "Todo" sola. El
 *    muro nunca se queda sin filtro por accidente.
 *
 * Con las siete puestas la selección se queda en siete: no se convierte a
 * "Todo" porque no hace falta, y porque quien las eligió una a una ve lo que
 * eligió.
 */
export type SeccionesElegidas = HomeSectionId[];

/** ¿Está puesta esta pastilla? "Todo" lo está exactamente cuando no hay ninguna otra. */
export const estaActiva = (elegidas: SeccionesElegidas, id: HomeSectionId): boolean =>
  id === 'all' ? elegidas.length === 0 : elegidas.includes(id);

/** La selección después de tocar una pastilla. Devuelve una lista nueva; no toca la que recibe. */
export const alternarSeccion = (elegidas: SeccionesElegidas, tocada: HomeSectionId): SeccionesElegidas => {
  if (tocada === 'all') return [];
  return elegidas.includes(tocada) ? elegidas.filter((s) => s !== tocada) : [...elegidas, tocada];
};

/**
 * El muro acotado por la selección: la UNIÓN de las secciones puestas, con el
 * mismo reparto que usa cada muro de sección (`postsDeLaSeccion`), en el orden
 * original y sin repetir una publicación que pertenezca a varias.
 */
export const filterBySections = (posts: Post[], elegidas: SeccionesElegidas): Post[] => {
  if (elegidas.length === 0 || elegidas.includes('all')) return posts;
  const dentro = new Set<Post>();
  for (const seccion of elegidas) {
    for (const post of postsDeLaSeccion(posts, seccion)) dentro.add(post);
  }
  return posts.filter((post) => dentro.has(post));
};
