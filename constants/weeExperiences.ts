/**
 * Las 10 experiencias de WEE Creator (docs/CREATOR.md).
 *
 * "El usuario elige el resultado. WEE elige la IA."
 * Cada experiencia es un especialista visible; por detrás puede usar una o
 * varias APIs, modelos y servicios. La persona nunca ve proveedores ni prompts.
 *
 * No confundir con las categorías sociales de "Explora comunidades"
 * (constants/communityCategories.ts): aquí van RESULTADOS, allá van PERSONAS.
 *
 * Fuente única para el menú ☰, la pantalla WEE Creator y el registro de interés.
 */

export interface WeeExperience {
  id: string;
  /** Nombre de identidad (WEE Design, WEE Studio…). No traducir ni cambiar. */
  name: string;
  emoji: string;
  /** Qué consigue la persona con esta experiencia (una línea, en resultados). */
  description: string;
  /** Pedidos típicos en lenguaje normal; se muestran como ejemplos. */
  examples: string[];
  /** Palabras clave para la búsqueda "¿Qué quieres crear?". */
  keywords: string[];
}

export const WEE_EXPERIENCES: WeeExperience[] = [
  {
    id: 'design',
    name: 'WEE Design',
    emoji: '🎨',
    description: 'Logos, posts, flyers y diseños listos para usar',
    examples: ['Un logo para mi negocio', 'Un post para Instagram', 'Un flyer para mi evento'],
    keywords: ['logo', 'diseño', 'diseno', 'post', 'flyer', 'banner', 'afiche', 'poster', 'portada', 'marca', 'branding', 'ilustración', 'ilustracion', 'sticker', 'tarjeta', 'invitación', 'invitacion', 'dibujo', 'arte'],
  },
  {
    id: 'studio',
    name: 'WEE Studio',
    emoji: '🎬',
    description: 'Videos cortos, Weëls y anuncios con voz y música',
    examples: ['Un video para promocionar mi restaurante', 'Un Weël con mi producto', 'Un anuncio con voz en off'],
    keywords: ['video', 'weel', 'weël', 'reel', 'clip', 'anuncio', 'comercial', 'animación', 'animacion', 'corto', 'película', 'pelicula', 'trailer', 'subtítulos', 'subtitulos', 'promocionar', 'tiktok', 'youtube'],
  },
  {
    id: 'photo',
    name: 'WEE Photo',
    emoji: '📸',
    description: 'Mejora, retoca y transforma tus fotos',
    examples: ['Mejorar la calidad de una foto', 'Quitar el fondo', 'Una foto de perfil profesional'],
    keywords: ['foto', 'fotos', 'imagen', 'retocar', 'mejorar', 'fondo', 'restaurar', 'retrato', 'filtro', 'producto', 'avatar', 'selfie', 'perfil', 'nitidez', 'calidad'],
  },
  {
    id: 'writer',
    name: 'WEE Writer',
    emoji: '✍️',
    description: 'Textos, guiones, historias y libros',
    examples: ['Un guion para mi video', 'La descripción de mi producto', 'Un cuento para mis hijos'],
    keywords: ['texto', 'guion', 'guión', 'escribir', 'redactar', 'historia', 'cuento', 'libro', 'ebook', 'novela', 'blog', 'artículo', 'articulo', 'caption', 'descripción', 'descripcion', 'biografía', 'biografia', 'poema', 'carta', 'traducir', 'corregir'],
  },
  {
    id: 'music',
    name: 'WEE Music',
    emoji: '🎵',
    description: 'Canciones, jingles, voces y sonidos',
    examples: ['Un jingle para mi marca', 'Música de fondo para mi video', 'Convertir mi texto en voz'],
    keywords: ['música', 'musica', 'canción', 'cancion', 'jingle', 'beat', 'melodía', 'melodia', 'audio', 'sonido', 'voz', 'locución', 'locucion', 'podcast', 'narración', 'narracion', 'doblaje'],
  },
  {
    id: 'beauty',
    name: 'WEE Beauty',
    emoji: '💄',
    description: 'Prueba looks, maquillaje, peinados y estilo',
    examples: ['Cómo me quedaría este corte', 'Un look para una fiesta', 'Probar un maquillaje'],
    keywords: ['belleza', 'maquillaje', 'peinado', 'corte', 'cabello', 'pelo', 'look', 'outfit', 'ropa', 'estilo', 'uñas', 'unas', 'piel', 'moda', 'barba', 'lentes'],
  },
  {
    id: 'chef',
    name: 'WEE Chef',
    emoji: '👨‍🍳',
    description: 'Recetas, menús y planes de comida',
    examples: ['Una receta con lo que tengo en casa', 'Un menú semanal saludable', 'El plato del día para mi restaurante'],
    keywords: ['receta', 'cocina', 'cocinar', 'comida', 'menú', 'menu', 'plato', 'ingredientes', 'dieta', 'saludable', 'cena', 'almuerzo', 'desayuno', 'postre', 'restaurante'],
  },
  {
    id: 'home',
    name: 'WEE Home',
    emoji: '🏠',
    description: 'Decora, organiza y rediseña tus espacios',
    examples: ['Cómo se vería mi sala con otro estilo', 'Ideas para decorar mi cuarto', 'Organizar mi cocina pequeña'],
    keywords: ['casa', 'hogar', 'decoración', 'decoracion', 'decorar', 'sala', 'cuarto', 'habitación', 'habitacion', 'dormitorio', 'interior', 'muebles', 'jardín', 'jardin', 'remodelar', 'espacio', 'oficina', 'baño', 'bano'],
  },
  {
    id: 'business',
    name: 'WEE Business',
    emoji: '💼',
    description: 'Marketing, ventas, presentaciones y planes',
    examples: ['Un plan para mi emprendimiento', 'Una presentación para inversores', 'Ideas de marketing para mi tienda'],
    keywords: ['negocio', 'emprendimiento', 'emprender', 'marketing', 'ventas', 'vender', 'presentación', 'presentacion', 'pitch', 'plan', 'campaña', 'campana', 'cliente', 'clientes', 'tienda', 'empresa', 'estrategia', 'publicidad', 'precio'],
  },
  {
    id: 'brain',
    name: 'WEE Brain',
    emoji: '🧠',
    description: 'Pregunta lo que sea: WEE piensa contigo y te guía',
    examples: ['No sé por dónde empezar', 'Ayúdame a planear mi semana', 'Explícame esto fácil'],
    keywords: ['ayuda', 'ayúdame', 'ayudame', 'idea', 'ideas', 'pregunta', 'pensar', 'aprender', 'explicar', 'explícame', 'explicame', 'resumen', 'resumir', 'organizar', 'planear', 'planificar', 'estudiar', 'tarea', 'investigar', 'consejo'],
  },
];

export const getExperienceById = (id: string): WeeExperience | undefined =>
  WEE_EXPERIENCES.find((e) => e.id === id);

/** Experiencias cuyo nombre o palabras clave coinciden con lo que la persona quiere lograr. */
export const matchExperiences = (query: string): WeeExperience[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  return WEE_EXPERIENCES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.keywords.some((k) => q.includes(k) || words.some((w) => k.startsWith(w) || w.startsWith(k)))
  );
};
