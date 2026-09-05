/**
 * Categorías sociales de Weë (Comunidades).
 *
 * Son TEMÁTICAS de comunidad — personas, intereses y conversaciones —,
 * no herramientas de IA. Las herramientas viven en Weë Creator.
 *
 *   Weë Creator = herramientas de IA   = "¿Qué querés crear?"
 *   Comunidades = personas + intereses = "¿Con quién querés compartir, aprender e interactuar?"
 *
 * Fuente única de verdad para: landing (nativa y web), home logueada,
 * comunidades oficiales semilla (Firestore) y tags sugeridos al publicar.
 */

export interface CommunityCategory {
  id: string;
  /** Slug de la comunidad oficial asociada (los posts se guardan con este campo). */
  slug: string;
  name: string;
  emoji: string;
  /** Nombre base de Ionicons, sin sufijo "-outline". */
  icon: string;
  color: string;
  description: string;
  /** Tags sugeridos al publicar en esta comunidad. */
  tags: string[];
}

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  {
    id: 'cine-animacion',
    slug: 'cine-animacion',
    name: 'Cine & Animación',
    emoji: '🎬',
    icon: 'film',
    color: '#EF4444',
    description: 'Filmmaking, películas, cortometrajes, animación, personajes y creación audiovisual con IA.',
    tags: ['Cortometrajes', 'Animación', 'Personajes', 'Guion', 'VFX', 'Storyboard', 'Detrás de escena', 'Estrenos'],
  },
  {
    id: 'arte-creatividad',
    slug: 'arte-creatividad',
    name: 'Arte & Creatividad',
    emoji: '🎨',
    icon: 'color-palette',
    color: '#EC4899',
    description: 'Arte digital, ilustración, fotografía, diseño y creatividad potenciada con IA.',
    tags: ['Ilustración', 'Fotografía', 'Diseño', 'Arte digital', 'Prompts', 'Estilos', 'Proceso', 'Portafolio'],
  },
  {
    id: 'creadores-influencers',
    slug: 'creadores-influencers',
    name: 'Creadores & Influencers',
    emoji: '📱',
    icon: 'phone-portrait',
    color: '#F5B731',
    description: 'Creadores de contenido, influencers, YouTubers, TikTokers, Instagramers y creación de contenido con IA.',
    tags: ['YouTube', 'TikTok', 'Instagram', 'Guiones', 'Miniaturas', 'Edición', 'Crecimiento', 'Monetización'],
  },
  {
    id: 'negocios-emprendimiento',
    slug: 'negocios-emprendimiento',
    name: 'Negocios & Emprendimiento',
    emoji: '💼',
    icon: 'briefcase',
    color: '#059669',
    description: 'Emprendedores, startups, negocios, marketing y oportunidades relacionadas con IA.',
    tags: ['Startups', 'Marketing', 'Ventas', 'Automatización', 'Productividad', 'Casos de éxito', 'Oportunidades', 'Freelance'],
  },
  {
    id: 'tecnologia-ia',
    slug: 'tecnologia-ia',
    name: 'Tecnología & IA',
    emoji: '💻',
    icon: 'hardware-chip',
    color: '#06B6D4',
    description: 'Noticias, novedades, modelos de IA, avances tecnológicos, herramientas y discusión sobre Inteligencia Artificial.',
    tags: ['Noticias', 'Modelos', 'Herramientas', 'Lanzamientos', 'Tutoriales', 'Open source', 'Hardware', 'Debate'],
  },
  {
    id: 'gaming-mundos-virtuales',
    slug: 'gaming-mundos-virtuales',
    name: 'Gaming & Mundos Virtuales',
    emoji: '🎮',
    icon: 'game-controller',
    color: '#7C3AED',
    description: 'Videojuegos, creación de personajes, mundos virtuales, gaming y experiencias digitales.',
    tags: ['Videojuegos', 'Personajes', 'Mundos', 'Indie', 'Esports', 'Realidad virtual', 'Mods', 'Streaming'],
  },
  {
    id: 'educacion-aprendizaje',
    slug: 'educacion-aprendizaje',
    name: 'Educación & Aprendizaje',
    emoji: '📚',
    icon: 'school',
    color: '#0EA5E9',
    description: 'Educación, estudiantes, profesores, investigación, aprendizaje y uso de IA para estudiar.',
    tags: ['Estudiar con IA', 'Profesores', 'Investigación', 'Cursos', 'Universidad', 'Idiomas', 'Tutoriales', 'Recursos'],
  },
  {
    id: 'futuro-sociedad',
    slug: 'futuro-sociedad',
    name: 'Futuro & Sociedad',
    emoji: '🚀',
    icon: 'rocket',
    color: '#6366F1',
    description: 'El futuro de la IA, profesiones, trabajo, creatividad, sociedad y los cambios que producirá la Inteligencia Artificial.',
    tags: ['Trabajo', 'Profesiones', 'Ética', 'Regulación', 'Creatividad', 'Sociedad', 'Predicciones', 'Debate'],
  },
];

/**
 * Comunidades populares de ejemplo (simulan comunidades creadas por usuarios).
 * Se muestran en la landing y en demos hasta que existan comunidades reales.
 */
export interface PopularCommunity {
  id: string;
  name: string;
  slug: string;
  communitySlug: string;
  /** Ionicons con sufijo "-outline", como lo usa el chip de la landing. */
  icon: string;
  color: string;
  members: number;
  description: string;
  categoryId: string;
}

export const POPULAR_COMMUNITIES: PopularCommunity[] = [
  {
    id: 'wee-filmmakers',
    name: 'Weë Filmmakers',
    slug: 'wee-filmmakers',
    communitySlug: 'wee-filmmakers',
    icon: 'film-outline',
    color: '#EF4444',
    members: 12400,
    description: 'Personas que usan IA para cine y producción audiovisual. Muestra tu proceso y aprende del de otros.',
    categoryId: 'cine-animacion',
  },
  {
    id: 'wee-influencers',
    name: 'Weë Influencers',
    slug: 'wee-influencers',
    communitySlug: 'wee-influencers',
    icon: 'phone-portrait-outline',
    color: '#F5B731',
    members: 8700,
    description: 'Influencers y creadores de contenido que producen con IA.',
    categoryId: 'creadores-influencers',
  },
  {
    id: 'wee-designers',
    name: 'Weë Designers',
    slug: 'wee-designers',
    communitySlug: 'wee-designers',
    icon: 'color-palette-outline',
    color: '#EC4899',
    members: 6200,
    description: 'Diseñadores que trabajan con IA: branding, ilustración, arte digital.',
    categoryId: 'arte-creatividad',
  },
  {
    id: 'wee-writers',
    name: 'Weë Writers',
    slug: 'wee-writers',
    communitySlug: 'wee-writers',
    icon: 'create-outline',
    color: '#F59E0B',
    members: 5400,
    description: 'Escritores que crean con IA: libros, guiones, artículos y poesía.',
    categoryId: 'arte-creatividad',
  },
  {
    id: 'wee-musicians',
    name: 'Weë Musicians',
    slug: 'wee-musicians',
    communitySlug: 'wee-musicians',
    icon: 'musical-notes-outline',
    color: '#8B5CF6',
    members: 4900,
    description: 'Creadores de música y audio con IA.',
    categoryId: 'arte-creatividad',
  },
  {
    id: 'wee-developers',
    name: 'Weë Developers',
    slug: 'wee-developers',
    communitySlug: 'wee-developers',
    icon: 'code-slash-outline',
    color: '#06B6D4',
    members: 4100,
    description: 'Programadores que construyen con IA.',
    categoryId: 'tecnologia-ia',
  },
  {
    id: 'wee-entrepreneurs',
    name: 'Weë Entrepreneurs',
    slug: 'wee-entrepreneurs',
    communitySlug: 'wee-entrepreneurs',
    icon: 'briefcase-outline',
    color: '#059669',
    members: 3600,
    description: 'Emprendedores que usan IA en sus negocios.',
    categoryId: 'negocios-emprendimiento',
  },
  {
    id: 'wee-gamers',
    name: 'Weë Gamers',
    slug: 'wee-gamers',
    communitySlug: 'wee-gamers',
    icon: 'game-controller-outline',
    color: '#7C3AED',
    members: 2800,
    description: 'IA y videojuegos: personajes, mundos y experiencias.',
    categoryId: 'gaming-mundos-virtuales',
  },
];

export const getCommunityCategoryBySlug = (slug: string): CommunityCategory | undefined =>
  COMMUNITY_CATEGORIES.find((c) => c.slug === slug);
