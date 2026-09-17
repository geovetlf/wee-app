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

/** Una clave de i18n, no el texto. Lo resuelve quien pinta. */
export type ClaveDeTexto = string;

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
  /**
   * La clave de i18n de la descripción. Lo que se PINTA sale de aquí.
   *
   * El NOMBRE no lleva clave y no la va a llevar: "Weë Design" es marca y se
   * escribe igual en todos los idiomas, como Instagram o Photoshop. Lo que se
   * traduce es lo que la describe.
   */
  claveDescripcion: ClaveDeTexto;
  /** La descripción en español. Documentación de esta tabla y red de seguridad. */
  description: string;
  /**
   * Pedidos típicos en lenguaje normal, en CLAVES de i18n: se enseñan como
   * ejemplos y por eso se traducen, igual que `claveDescripcion`.
   */
  examples: ClaveDeTexto[];
  /**
   * Palabras clave de la búsqueda "¿Qué quieres crear?".
   *
   * NO son interfaz y por eso no se traducen: nadie las lee, se comparan con lo
   * que alguien escribe. Traducirlas sería cambiar a dónde va una búsqueda, que
   * es lógica y no texto. Que Weë entienda también a quien busca en inglés es
   * otro trabajo —y otro bloque—, no una traducción de esta lista.
   */
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
    claveDescripcion: 'creator.design',
    name: 'Weë Design',
    emoji: '🎨',
    description: 'Logos, posters, ilustraciones y material para tus redes',
    examples: ['creator.designEx1', 'creator.designEx2', 'creator.designEx3'],
    keywords: ['logo', 'diseño', 'diseno', 'post', 'flyer', 'banner', 'afiche', 'poster', 'portada', 'marca', 'branding', 'ilustración', 'ilustracion', 'sticker', 'tarjeta', 'invitación', 'invitacion', 'dibujo', 'arte', 'creatividad', 'redes'],
  },
  {
    id: 'studio',
    icono: 'claqueta',
    claveDescripcion: 'creator.studio',
    name: 'Weë Studio',
    emoji: '🎬',
    // La propuesta principal de la sección, tal cual (fases 2E-52 y 2E-53): esta
    // línea se lee en la tarjeta de Weë Studio dentro de Weë Creator, y dice lo
    // mismo que el hero. Beauty no entra aquí a propósito —tiene su propia
    // descripción dentro del selector— para no repartir el mensaje principal.
    description: 'Crea y transforma fotos y videos con IA.',
    examples: ['creator.studioEx1', 'creator.studioEx2', 'creator.studioEx3'],
    keywords: ['video', 'weel', 'weël', 'reel', 'clip', 'anuncio', 'comercial', 'publicidad', 'animación', 'animacion', 'corto', 'película', 'pelicula', 'trailer', 'subtítulos', 'subtitulos', 'promocionar', 'tiktok', 'youtube', 'historia visual'],
  },
  {
    id: 'photo',
    icono: 'camara',
    claveDescripcion: 'creator.photo',
    name: 'Weë Photo',
    emoji: '📸',
    description: 'Mejora, restaura y transforma tus fotos',
    examples: ['creator.photoEx1', 'creator.photoEx2', 'creator.photoEx3'],
    keywords: ['foto', 'fotos', 'fotografía', 'fotografia', 'imagen', 'retocar', 'mejorar', 'fondo', 'restaurar', 'retrato', 'filtro', 'eliminar', 'quitar', 'objeto', 'avatar', 'selfie', 'perfil', 'nitidez', 'calidad', 'borrosa'],
  },
  {
    id: 'writer',
    icono: 'documento',
    claveDescripcion: 'creator.writer',
    name: 'Weë Writer',
    emoji: '✍️',
    description: 'Publicaciones, historias, guiones, emails y libros',
    examples: ['creator.writerEx1', 'creator.writerEx2', 'creator.writerEx3'],
    keywords: ['texto', 'guion', 'guión', 'escribir', 'redactar', 'historia', 'cuento', 'libro', 'ebook', 'novela', 'blog', 'artículo', 'articulo', 'caption', 'publicación', 'publicacion', 'descripción', 'descripcion', 'biografía', 'biografia', 'poema', 'carta', 'email', 'correo', 'corregir', 'idea'],
  },
  {
    id: 'music',
    icono: 'notas',
    claveDescripcion: 'creator.music',
    name: 'Weë Music',
    emoji: '🎵',
    description: 'Canciones, música instrumental, voces y narración',
    examples: ['creator.musicEx1', 'creator.musicEx2', 'creator.musicEx3'],
    keywords: ['música', 'musica', 'canción', 'cancion', 'jingle', 'beat', 'melodía', 'melodia', 'instrumental', 'audio', 'sonido', 'voz', 'locución', 'locucion', 'podcast', 'narración', 'narracion', 'doblaje'],
  },
  {
    id: 'beauty',
    icono: 'belleza',
    claveDescripcion: 'creator.beauty',
    name: 'Weë Beauty',
    emoji: '💄',
    description: 'Maquillaje, cabello, barba, outfits y cambios de look',
    examples: ['creator.beautyEx1', 'creator.beautyEx2', 'creator.beautyEx3'],
    keywords: ['belleza', 'maquillaje', 'peinado', 'corte', 'cabello', 'pelo', 'look', 'outfit', 'ropa', 'estilo', 'uñas', 'unas', 'piel', 'moda', 'barba', 'lentes', 'color de cabello', 'verme'],
  },
  {
    id: 'chef',
    icono: 'gorro',
    claveDescripcion: 'creator.chef',
    name: 'Weë Chef',
    emoji: '👨‍🍳',
    description: 'Tu chef personal: qué cocinar, recetas y menús',
    examples: ['creator.chefEx1', 'creator.chefEx2', 'creator.chefEx3'],
    keywords: ['receta', 'cocina', 'cocinar', 'comida', 'menú', 'menu', 'plato', 'ingredientes', 'dieta', 'saludable', 'cena', 'almuerzo', 'desayuno', 'postre', 'restaurante', 'sustituir', 'chef'],
  },
  {
    id: 'home',
    icono: 'casa',
    claveDescripcion: 'creator.home',
    name: 'Weë Home',
    emoji: '🏠',
    description: 'Decoración, diseño interior, remodelación y jardines',
    examples: ['creator.homeEx1', 'creator.homeEx2', 'creator.homeEx3'],
    keywords: ['casa', 'hogar', 'decoración', 'decoracion', 'decorar', 'sala', 'cuarto', 'habitación', 'habitacion', 'dormitorio', 'interior', 'muebles', 'jardín', 'jardin', 'remodelar', 'remodelación', 'remodelacion', 'espacio', 'oficina', 'baño', 'bano', 'exterior', 'patio'],
  },
  {
    id: 'business',
    icono: 'maletin',
    claveDescripcion: 'creator.business',
    name: 'Weë Business',
    emoji: '💼',
    description: 'Ideas de negocio, marketing, CV, documentos y presentaciones',
    examples: ['creator.businessEx1', 'creator.businessEx2', 'creator.businessEx3'],
    keywords: ['negocio', 'emprendimiento', 'emprender', 'marketing', 'ventas', 'vender', 'presentación', 'presentacion', 'pitch', 'plan', 'campaña', 'campana', 'cliente', 'clientes', 'tienda', 'empresa', 'estrategia', 'publicidad', 'precio', 'cv', 'currículum', 'curriculum', 'documento', 'análisis', 'analisis', 'trabajo'],
  },
  {
    id: 'travel',
    icono: 'avion',
    claveDescripcion: 'creator.travel',
    name: 'Weë Travel',
    emoji: '✈️',
    description: 'Prepara tu viaje: a dónde ir, qué hacer y cómo moverte',
    examples: ['creator.travelEx1', 'creator.travelEx2', 'creator.travelEx3'],
    keywords: ['viaje', 'viajar', 'viajes', 'vacaciones', 'itinerario', 'destino', 'destinos', 'turismo', 'turista', 'vuelo', 'vuelos', 'hotel', 'hoteles', 'playa', 'mochilero', 'ruta', 'excursión', 'excursion', 'maleta', 'pasaporte', 'visa', 'aeropuerto', 'tren', 'crucero', 'guía', 'guia', 'ciudad', 'país', 'pais', 'extranjero'],
  },
  {
    id: 'brain',
    icono: 'cerebro',
    claveDescripcion: 'creator.brain',
    name: 'Weë Brain',
    emoji: '🧠',
    description: '¿No sabes dónde buscar? Pregúntale a Weë',
    examples: ['creator.brainEx1', 'creator.brainEx2', 'creator.brainEx3'],
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

/**
 * EN QUÉ ORDEN SE VEN, Y AQUÍ SE DECIDE (decisión del usuario, 2026-09-15).
 *
 * El orden del menú no puede salir del orden en que estén escritas arriba: esa
 * lista es el registro de identificadores —se ordena por cuándo nació cada una—
 * y mover un bloque de treinta líneas para cambiar un sitio en el menú es una
 * forma muy cara de decir "Brain primero".
 *
 * Así que se dice aquí, con los identificadores y en una línea. Lo que se lee es
 * lo que se ve, y se ve igual en los dos menús —el ☰ del teléfono y la barra
 * lateral—, en Android y en web, y con el Perfil Real y con el Perfil Weë: el
 * orden no depende del perfil, porque no hay ningún `isWee` que lo mire.
 *
 * Weë Brain va primero porque es la puerta de quien no sabe a cuál entrar.
 */
export const ORDEN_EN_EL_MENU: string[] = [
  'brain',
  'studio',
  'design',
  'music',
  'chef',
  'business',
  'travel',
];

/**
 * Las que se ven, en su orden. Se arma con la lista de arriba y, detrás, lo que
 * no esté nombrado allí: una experiencia nueva aparece al final en vez de
 * desaparecer sin que nadie se entere.
 */
export const WEE_EXPERIENCES: WeeExperience[] = (() => {
  const visibles = ALL_EXPERIENCES.filter((e) => !HIDDEN_AS_SECTION.includes(e.id));
  const ordenadas = ORDEN_EN_EL_MENU
    .map((id) => visibles.find((e) => e.id === id))
    .filter((e): e is WeeExperience => !!e);
  const resto = visibles.filter((e) => !ORDEN_EN_EL_MENU.includes(e.id));
  return [...ordenadas, ...resto];
})();

/**
 * Cómo se presenta una experiencia que vive dentro de otra sección. El
 * identificador no cambia —sigue siendo `photo`, y con él viajan el historial y
 * el servidor—, pero lo que se lee arriba dice dónde está de verdad la persona.
 *
 * `claveEtiqueta` es el contexto completo, para la cabecera y la miga de pan.
 * `claveNombre` es cómo se llama la experiencia cuando habla: firma las burbujas
 * de la conversación, el progreso y el resultado. Sin `claveNombre` se usa el
 * nombre propio de la experiencia —que es marca y no se traduce—, que es lo que
 * siguen haciendo las tres áreas de Studio.
 *
 * Las dos son CLAVES: "Weë Design · Hogar & Diseño" se lee, así que se traduce.
 * Lo que no cambia nunca es el identificador `home`, que es con el que viajan
 * los trabajos guardados y las plantillas del servidor.
 */
export const EXPERIENCE_AREA: Record<string, { section: string; claveEtiqueta: ClaveDeTexto; claveNombre?: ClaveDeTexto }> = {
  photo: { section: 'studio', claveEtiqueta: 'creator.areaStudioPhotos' },
  studio: { section: 'studio', claveEtiqueta: 'creator.areaStudioVideos' },
  beauty: { section: 'studio', claveEtiqueta: 'creator.areaStudioBeauty' },
  /*
   * Weë Home pasa a ser Hogar & Diseño dentro de Weë Design. El nombre propio
   * desaparece de la pantalla —nadie debe leer "Weë Home"—, pero el
   * identificador `home` sigue intacto por debajo: con él viajan los trabajos
   * históricos, la plantilla del servidor, los planes y los prompts.
   */
  home: { section: 'design', claveEtiqueta: 'creator.areaDesignHome', claveNombre: 'creator.areaHomeName' },
};

/**
 * Cómo se llama una experiencia para quien la está usando: el nombre del área
 * cuando vive dentro de otra sección, y su nombre propio cuando no.
 *
 * El traductor entra por parámetro y es OBLIGATORIO a propósito: así ninguna
 * pantalla puede olvidarse de él y acabar enseñando "Hogar & Diseño" en una
 * interfaz en inglés. Si faltara, el compilador lo dice.
 */
export const experienceLabel = (
  experience: { id: string; name: string },
  t: (clave: string) => string,
): string => {
  const clave = EXPERIENCE_AREA[experience.id]?.claveNombre;
  return clave ? t(clave) : experience.name;
};

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
