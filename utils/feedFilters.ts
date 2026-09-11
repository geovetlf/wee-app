import { Post } from '../services/firestoreService';
import { postsDeLaSeccion } from './sectionFeed';

/*
 * DOS FORMAS DE FILTRAR, Y NO SON LA MISMA.
 *
 * · POR TIPO DE CONTENIDO —imágenes, tutoriales—. Lo usan las paredes de cada
 *   experiencia (`components/creator/SectionWall.tsx`), donde ya sabes en qué
 *   sección estás y lo que quieres es acotar QUÉ mirar. Se queda como estaba.
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
export type HomeSectionId = 'all' | 'studio' | 'travel' | 'music' | 'chef';

export const HOME_SECTION_FILTERS: { id: HomeSectionId; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'studio', label: 'WeeStudio' },
  { id: 'travel', label: 'WeeTravel' },
  { id: 'music', label: 'WeeMusic' },
  { id: 'chef', label: 'WeeChef' },
];

export const filterBySection = (posts: Post[], filter: HomeSectionId): Post[] =>
  filter === 'all' ? posts : postsDeLaSeccion(posts, filter);
