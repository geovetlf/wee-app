import { Post } from '../services/firestoreService';

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
