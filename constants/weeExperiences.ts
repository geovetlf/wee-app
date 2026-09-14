/**
 * Las experiencias de Weë Creator (docs/CREATOR.md §1 y §8).
 *
 * Once existen; nueve se ven. Weë Travel es la última en llegar (fase 2E-64C). Weë Photo y Weë Beauty dejaron de ser secciones
 * del menú y pasaron a ser áreas dentro de Weë Studio (fase 2E-50), pero sus
 * identificadores, sus plantillas y sus rutas siguen enteros: de eso vive todo
 * el trabajo ya creado. Por eso hay dos listas y no una.
 *
 * "El usuario elige el resultado. Weë elige la IA."
 * Cada experiencia es un especialista visible; por detrás puede usar una o
 * varias APIs, modelos y servicios. La persona nunca ve proveedores ni prompts.
 *
 * No confundir con las categorías sociales de "Explora comunidades"
 * (constants/communityCategories.ts): aquí van RESULTADOS, allá van PERSONAS.
 *
 * Fuente única para el menú ☰, la pantalla Weë Creator y el registro de interés.
 */

import { NombreDeIcono } from '../components/icons/trazosDeWee';

export interface WeeExperience {
  id: string;
  /** Nombre de identidad (Weë Design, Weë Studio…). No traducir ni cambiar. */
  name: string;
  /**
   * El icono dibujado, de `components/icons/trazosDeWee`. Lo pinta el cajón.
   *
   * El emoji de identidad de cada experiencia (🎨 Weë Design, 🎬 Weë Studio…) se
   * queda: lo usan sus propias pantallas y es parte de su nombre. Esto es otra
   * cosa: la versión dibujada, para que en el menú las once se vean de la misma
   * familia y no once dibujos del sistema operativo puestos en columna.
   */
  icono: NombreDeIcono;
  emoji: string;
  /** Qué consigue la persona con esta experiencia (una línea, en resultados). */
  description: string;
  /** Pedidos típicos en lenguaje normal; se muestran como ejemplos. */
  examples: string[];
  /** Palabras clave para la búsqueda "¿Qué quieres crear?". */
  keywords: string[];
}

/**
 * Todas, sin excepción. Es la lista con la que se resuelve un identificador:
 * un trabajo de hace meses tiene que seguir abriéndose con su nombre y su emoji.
 */
export const ALL_EXPERIENCES: WeeExperience[] = [
  {
    id: 'design',
    icono: 'pincel',
    name: 'Weë Design',
    emoji: '🎨',
    description: 'Logos, posters, ilustraciones y material para tus redes',
    examples: ['Un logo para mi negocio', 'Un post para Instagram', 'La portada de mi libro'],
    keywords: ['logo', 'diseño', 'diseno', 'post', 'flyer', 'banner', 'afiche', 'poster', 'portada', 'marca', 'branding', 'ilustración', 'ilustracion', 'sticker', 'tarjeta', 'invitación', 'invitacion', 'dibujo', 'arte', 'creatividad', 'redes'],
  },
  {
    id: 'studio',
    icono: 'claqueta',
    name: 'Weë Studio',
    emoji: '🎬',
    // La propuesta principal de la sección, tal cual (fases 2E-52 y 2E-53): esta
    // línea se lee en la tarjeta de Weë Studio dentro de Weë Creator, y dice lo
    // mismo que el hero. Beauty no entra aquí a propósito —tiene su propia
    // descripción dentro del selector— para no repartir el mensaje principal.
    description: 'Crea y transforma fotos y videos con IA.',
    examples: ['Un video para promocionar mi restaurante', 'Convertir mi foto en un video', 'Un Weël con mi producto'],
    keywords: ['video', 'weel', 'weël', 'reel', 'clip', 'anuncio', 'comercial', 'publicidad', 'animación', 'animacion', 'corto', 'película', 'pelicula', 'trailer', 'subtítulos', 'subtitulos', 'promocionar', 'tiktok', 'youtube', 'historia visual'],
  },
  {
    id: 'photo',
    icono: 'camara',
    name: 'Weë Photo',
    emoji: '📸',
    description: 'Mejora, restaura y transforma tus fotos',
    examples: ['Mejorar la calidad de una foto', 'Quitar algo que sobra en la foto', 'Cambiar el fondo de mi foto'],
    keywords: ['foto', 'fotos', 'fotografía', 'fotografia', 'imagen', 'retocar', 'mejorar', 'fondo', 'restaurar', 'retrato', 'filtro', 'eliminar', 'quitar', 'objeto', 'avatar', 'selfie', 'perfil', 'nitidez', 'calidad', 'borrosa'],
  },
  {
    id: 'writer',
    icono: 'documento',
    name: 'Weë Writer',
    emoji: '✍️',
    description: 'Publicaciones, historias, guiones, emails y libros',
    examples: ['Un guion para mi video', 'Un email para un cliente', 'Corregir mi texto'],
    keywords: ['texto', 'guion', 'guión', 'escribir', 'redactar', 'historia', 'cuento', 'libro', 'ebook', 'novela', 'blog', 'artículo', 'articulo', 'caption', 'publicación', 'publicacion', 'descripción', 'descripcion', 'biografía', 'biografia', 'poema', 'carta', 'email', 'correo', 'corregir', 'idea'],
  },
  {
    id: 'music',
    icono: 'notas',
    name: 'Weë Music',
    emoji: '🎵',
    description: 'Canciones, música instrumental, voces y narración',
    examples: ['Un jingle para mi marca', 'Música de fondo para mi video', 'Convertir mi texto en voz'],
    keywords: ['música', 'musica', 'canción', 'cancion', 'jingle', 'beat', 'melodía', 'melodia', 'instrumental', 'audio', 'sonido', 'voz', 'locución', 'locucion', 'podcast', 'narración', 'narracion', 'doblaje'],
  },
  {
    id: 'beauty',
    icono: 'belleza',
    name: 'Weë Beauty',
    emoji: '💄',
    description: 'Maquillaje, cabello, barba, outfits y cambios de look',
    examples: ['Cómo me quedaría el cabello largo', 'Un look para una fiesta', 'Probar otro color de cabello'],
    keywords: ['belleza', 'maquillaje', 'peinado', 'corte', 'cabello', 'pelo', 'look', 'outfit', 'ropa', 'estilo', 'uñas', 'unas', 'piel', 'moda', 'barba', 'lentes', 'color de cabello', 'verme'],
  },
  {
    id: 'chef',
    icono: 'gorro',
    name: 'Weë Chef',
    emoji: '👨‍🍳',
    description: 'Tu chef personal: qué cocinar, recetas y menús',
    examples: ['Una receta con lo que tengo en casa', 'Un menú semanal saludable', 'No sé qué cocinar hoy'],
    keywords: ['receta', 'cocina', 'cocinar', 'comida', 'menú', 'menu', 'plato', 'ingredientes', 'dieta', 'saludable', 'cena', 'almuerzo', 'desayuno', 'postre', 'restaurante', 'sustituir', 'chef'],
  },
  {
    id: 'home',
    icono: 'casa',
    name: 'Weë Home',
    emoji: '🏠',
    description: 'Decoración, diseño interior, remodelación y jardines',
    examples: ['Cómo se vería mi sala con otro estilo', 'Ideas para decorar mi cuarto', 'Un jardín pequeño para mi patio'],
    keywords: ['casa', 'hogar', 'decoración', 'decoracion', 'decorar', 'sala', 'cuarto', 'habitación', 'habitacion', 'dormitorio', 'interior', 'muebles', 'jardín', 'jardin', 'remodelar', 'remodelación', 'remodelacion', 'espacio', 'oficina', 'baño', 'bano', 'exterior', 'patio'],
  },
  {
    id: 'business',
    icono: 'maletin',
    name: 'Weë Business',
    emoji: '💼',
    description: 'Ideas de negocio, marketing, CV, documentos y presentaciones',
    examples: ['Un plan para mi emprendimiento', 'Mi CV actualizado', 'Una presentación para inversores'],
    keywords: ['negocio', 'emprendimiento', 'emprender', 'marketing', 'ventas', 'vender', 'presentación', 'presentacion', 'pitch', 'plan', 'campaña', 'campana', 'cliente', 'clientes', 'tienda', 'empresa', 'estrategia', 'publicidad', 'precio', 'cv', 'currículum', 'curriculum', 'documento', 'análisis', 'analisis', 'trabajo'],
  },
  {
    id: 'travel',
    icono: 'avion',
    name: 'Weë Travel',
    emoji: '✈️',
    description: 'Prepara tu viaje: a dónde ir, qué hacer y cómo moverte',
    examples: ['Japón en octubre', 'Quiero una playa tranquila y barata', 'No sé dónde viajar'],
    keywords: ['viaje', 'viajar', 'viajes', 'vacaciones', 'itinerario', 'destino', 'destinos', 'turismo', 'turista', 'vuelo', 'vuelos', 'hotel', 'hoteles', 'playa', 'mochilero', 'ruta', 'excursión', 'excursion', 'maleta', 'pasaporte', 'visa', 'aeropuerto', 'tren', 'crucero', 'guía', 'guia', 'ciudad', 'país', 'pais', 'extranjero'],
  },
  {
    id: 'brain',
    icono: 'cerebro',
    name: 'Weë Brain',
    emoji: '🧠',
    description: '¿No sabes dónde buscar? Pregúntale a Weë',
    examples: ['No sé por dónde empezar', 'Explícame esto fácil', 'Traduce este texto'],
    keywords: ['ayuda', 'ayúdame', 'ayudame', 'pregunta', 'pensar', 'aprender', 'explicar', 'explícame', 'explicame', 'resumen', 'resumir', 'organizar', 'planear', 'planificar', 'estudiar', 'tarea', 'investigar', 'investigación', 'investigacion', 'traducir', 'traduce', 'problema', 'consejo', 'no sé', 'no se'],
  },
];

/**
 * Las que aparecen como sección en el menú ☰, en la barra lateral y en la
 * pantalla que las reúne. Photo y Beauty no están: se entra a ellas desde el
 * selector de Weë Studio. Home tampoco: entra por el de Weë Design, donde se
 * llama Hogar & Diseño (fase 2E-56). Y Weë Writer tampoco: pasa a ser una
 * función más del selector de Weë Studio.
 *
 * Esconder una sección no esconde NADA de lo que sabe hacer: sigue en
 * `ALL_EXPERIENCES`, `getExperienceById` la resuelve, `matchExperiences` la
 * encuentra por sus palabras, su plantilla y sus planes están intactos y sus
 * trabajos históricos siguen abriendo donde abrían. Solo deja de tener puerta
 * propia en el menú.
 */
export const HIDDEN_AS_SECTION: string[] = ['photo', 'beauty', 'home', 'writer'];

export const WEE_EXPERIENCES: WeeExperience[] = ALL_EXPERIENCES.filter((e) => !HIDDEN_AS_SECTION.includes(e.id));

/**
 * Cómo se presenta una experiencia que vive dentro de otra sección. El
 * identificador no cambia —sigue siendo `photo`, y con él viajan el historial y
 * el servidor—, pero lo que se lee arriba dice dónde está de verdad la persona.
 *
 * `label` es el contexto completo, para la cabecera y la miga de pan.
 * `name` es cómo se llama la experiencia cuando habla: firma las burbujas de la
 * conversación, el progreso y el resultado. Sin `name` se usa el nombre propio
 * de la experiencia, que es lo que siguen haciendo las tres áreas de Studio.
 */
export const EXPERIENCE_AREA: Record<string, { section: string; label: string; name?: string }> = {
  photo: { section: 'studio', label: 'Weë Studio · Fotos' },
  studio: { section: 'studio', label: 'Weë Studio · Videos' },
  beauty: { section: 'studio', label: 'Weë Studio · Beauty' },
  /*
   * Weë Home pasa a ser Hogar & Diseño dentro de Weë Design. El nombre propio
   * desaparece de la pantalla —nadie debe leer "Weë Home"—, pero el
   * identificador `home` sigue intacto por debajo: con él viajan los trabajos
   * históricos, la plantilla del servidor, los planes y los prompts.
   */
  home: { section: 'design', label: 'Weë Design · Hogar & Diseño', name: 'Hogar & Diseño' },
};

/**
 * Cómo se llama una experiencia para quien la está usando: el nombre del área
 * cuando vive dentro de otra sección, y su nombre propio cuando no.
 */
export const experienceLabel = (experience: { id: string; name: string }): string =>
  EXPERIENCE_AREA[experience.id]?.name ?? experience.name;

/** Resuelve por identificador entre LAS DIEZ: el historial depende de esto. */
export const getExperienceById = (id: string): WeeExperience | undefined =>
  ALL_EXPERIENCES.find((e) => e.id === id);

/**
 * Experiencias cuyo nombre o palabras clave coinciden con lo que la persona
 * quiere lograr. Busca entre todas a propósito: quien escribe "maquillaje" o
 * "retocar" tiene que llegar a esa capacidad aunque su sección ya no esté en el
 * menú. Esconder una sección no es esconder lo que sabe hacer.
 */
export const matchExperiences = (query: string): WeeExperience[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  return ALL_EXPERIENCES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.keywords.some((k) => q.includes(k) || words.some((w) => k.startsWith(w) || w.startsWith(k)))
  );
};
