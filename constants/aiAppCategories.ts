/**
 * Categorías de AI Apps de WEE Creator (herramientas de IA).
 *
 * No confundir con las categorías sociales de "Explora comunidades"
 * (constants/communityCategories.ts): aquí van HERRAMIENTAS, allá van PERSONAS.
 *
 * Fuente única para el menú ☰, la pantalla WEE Creator y la hoja Crear.
 */

export interface AiAppCategory {
  id: string;
  name: string;
  emoji: string;
  /** Qué puede hacer el usuario con esta categoría (una línea). */
  description: string;
  /** Palabras clave para la búsqueda "¿Qué quieres crear?". */
  keywords: string[];
}

export const AI_APP_CATEGORIES: AiAppCategory[] = [
  { id: 'video', name: 'AI Video', emoji: '🎬', description: 'Crea videos con IA', keywords: ['video', 'clip', 'reel', 'weel', 'animación', 'animacion', 'corto', 'película', 'pelicula', 'cine'] },
  { id: 'imagen', name: 'AI Imagen', emoji: '🖼️', description: 'Genera imágenes', keywords: ['imagen', 'foto', 'ilustración', 'ilustracion', 'arte', 'dibujo', 'personaje', 'retrato', 'avatar'] },
  { id: 'diseno', name: 'AI Diseño', emoji: '🎨', description: 'Diseña con IA', keywords: ['diseño', 'diseno', 'logo', 'marca', 'branding', 'afiche', 'poster', 'presentación', 'presentacion', 'banner'] },
  { id: 'escritura', name: 'AI Escritura', emoji: '✍️', description: 'Textos, guiones, blogs', keywords: ['texto', 'guion', 'guión', 'escribir', 'artículo', 'articulo', 'blog', 'post', 'caption', 'traducir', 'corregir'] },
  { id: 'libros', name: 'AI Libros', emoji: '📚', description: 'Crea tu libro con IA', keywords: ['libro', 'novela', 'historia', 'capítulo', 'capitulo', 'portada', 'manuscrito', 'cuento'] },
  { id: 'musica', name: 'AI Música & Audio', emoji: '🎵', description: 'Genera música y audio', keywords: ['música', 'musica', 'canción', 'cancion', 'audio', 'voz', 'doblaje', 'podcast', 'sonido', 'beat'] },
  { id: 'codigo', name: 'AI Código', emoji: '💻', description: 'Desarrolla con IA', keywords: ['código', 'codigo', 'app', 'aplicación', 'aplicacion', 'web', 'página', 'pagina', 'programar', 'prototipo', 'bot'] },
  { id: 'marketing', name: 'AI Marketing', emoji: '📣', description: 'Contenido y campañas', keywords: ['marketing', 'anuncio', 'campaña', 'campana', 'publicidad', 'ventas', 'redes', 'instagram', 'tiktok'] },
  { id: 'productividad', name: 'AI Productividad', emoji: '🧠', description: 'Organiza y automatiza', keywords: ['productividad', 'documento', 'resumen', 'organizar', 'automatizar', 'planificar', 'investigar', 'notas'] },
  { id: 'otras', name: 'Otras herramientas', emoji: '▦', description: 'Más AI Apps', keywords: [] },
];

export const getAiAppCategoryById = (id: string): AiAppCategory | undefined =>
  AI_APP_CATEGORIES.find((c) => c.id === id);

/** Devuelve las categorías cuyo nombre o palabras clave coinciden con la consulta. */
export const matchAiAppCategories = (query: string): AiAppCategory[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  return AI_APP_CATEGORIES.filter((c) =>
    c.id !== 'otras' &&
    (c.name.toLowerCase().includes(q) ||
      c.keywords.some((k) => q.includes(k) || words.some((w) => k.startsWith(w) || w.startsWith(k))))
  );
};
