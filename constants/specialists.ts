/**
 * Configuración de cada especialista de Weë Creator (docs/CREATOR-BUILD.md,
 * referencias en design/references/). Alimenta las piezas compartidas
 * (hero, "¿Qué quieres hacer hoy?", caja de idea, subida de fotos, ejemplos)
 * y cada pantalla añade lo suyo (chat grande, editor, "Mis redes"…).
 *
 * Todo lo que la persona lee está aquí en lenguaje humano: nada técnico.
 */
import { WeeExperience, getExperienceById } from './weeExperiences';

export type SpecialistId = WeeExperience['id'];

/** Modo de entrada que ofrece la pantalla del especialista. */
export type InputMode = 'text' | 'upload' | 'camera' | 'voice' | 'attach' | 'web';

/** Cómo se muestra la cuadrícula "¿Qué quieres hacer hoy?". */
export type ActionLayout = 'tiles' | 'wide' | 'images';

export interface SpecialistAction {
  id: string;
  /** Nombre de icono Ionicons (outline) que se dibuja en la tarjeta. */
  icon: string;
  /** Emoji para las tarjetas con imagen simulada y para móvil. */
  emoji: string;
  title: string;
  subtitle: string;
  /** Objetivo con el que arranca la conversación guiada al tocar la acción. */
  goal: string;
  /** Respuesta que ya queda contestada al elegir la acción (evita repetir la pregunta). */
  preset?: { questionId: string; optionId: string };
  /** true en "No sé qué hacer": Weë propone. */
  idk?: boolean;
}

export type ExampleKind = 'beforeAfter' | 'image' | 'video' | 'audio' | 'document' | 'recipe';

export interface SpecialistExample {
  title: string;
  subtitle?: string;
  kind: ExampleKind;
  emoji: string;
  /** Dos colores para el degradado de la imagen simulada. */
  tone: [string, string];
  /** Duración (video/audio) o tiempo (receta) como lo diría la tarjeta. */
  meta?: string;
}

export interface SpecialistConfig {
  id: SpecialistId;
  /** Frase grande del hero. */
  headline: string;
  /** Texto corto debajo del headline. */
  intro: string;
  /** Tres o cuatro sellos: "Fácil de usar", "Para todos"… */
  chips: string[];
  /** Frase manuscrita de la referencia. */
  note: string;
  /** Emoji grande de la ilustración del hero. */
  heroEmoji: string;
  gridTitle: string;
  actionLayout: ActionLayout;
  actions: SpecialistAction[];
  inputs: InputMode[];
  /** Caja "¿Tienes una idea en mente?" */
  idea: {
    title: string;
    subtitle: string;
    placeholder: string;
    chips: string[];
    /** Texto del botón cuando hay uno (Studio: "Empezar"). */
    button?: string;
  };
  /** Caja de subida de foto (Photo, Home, Beauty, Chef). */
  upload?: {
    title: string;
    subtitle: string;
    hint: string;
    button?: string;
  };
  examplesTitle: string;
  examples: SpecialistExample[];
  /** Franja final con una invitación ("¿No sabes por dónde empezar?"). */
  closing?: {
    title: string;
    subtitle: string;
    button: string;
  };
}

const T = {
  yellow: ['#F5B731', '#FFE08A'] as [string, string],
  sky: ['#4F8FE6', '#A8CBFF'] as [string, string],
  mint: ['#2FB784', '#A9F0D1'] as [string, string],
  coral: ['#F0705E', '#FFC1B5'] as [string, string],
  plum: ['#7C3AED', '#D4C2FF'] as [string, string],
  slate: ['#1F2937', '#6B7280'] as [string, string],
  rose: ['#E85C9A', '#FFC7E0'] as [string, string],
  sand: ['#C89B5A', '#F2DDB8'] as [string, string],
  night: ['#0F172A', '#3B4A6B'] as [string, string],
};

export const SPECIALISTS: Record<SpecialistId, SpecialistConfig> = {
  brain: {
    id: 'brain',
    headline: 'Pregúntame, cuéntame o pídeme lo que necesites.',
    intro: 'Tu asistente inteligente para todo. Si necesitas algo de los otros Weë, yo te llevo.',
    chips: ['Resuelve', 'Investiga', 'Aprende', 'Planifica', 'Te da ideas', 'Integra todos los Weë'],
    note: 'Aquí estoy para todo',
    heroEmoji: '🤖',
    gridTitle: '¿Por dónde empezamos?',
    actionLayout: 'tiles',
    actions: [
      { id: 'idea', icon: 'bulb-outline', emoji: '💡', title: 'Tengo una idea', subtitle: 'Cuéntamela y la aterrizamos', goal: 'Tengo una idea y quiero aterrizarla', preset: { questionId: 'what', optionId: 'plan' } },
      { id: 'know', icon: 'help-circle-outline', emoji: '❓', title: 'Quiero saber algo', subtitle: 'Pregunta lo que sea', goal: 'Quiero saber algo', preset: { questionId: 'what', optionId: 'learn' } },
      { id: 'document', icon: 'document-text-outline', emoji: '📄', title: 'Quiero entender un documento', subtitle: 'Te lo explico en simple', goal: 'Quiero entender un documento', preset: { questionId: 'what', optionId: 'translate' } },
      { id: 'learn', icon: 'school-outline', emoji: '🎓', title: 'Quiero aprender', subtitle: 'Paso a paso, sin jerga', goal: 'Quiero aprender algo nuevo', preset: { questionId: 'what', optionId: 'learn' } },
      { id: 'research', icon: 'search-outline', emoji: '🔎', title: 'Quiero investigar', subtitle: 'Reúno y ordeno la información', goal: 'Quiero investigar un tema', preset: { questionId: 'what', optionId: 'learn' } },
      { id: 'problem', icon: 'extension-puzzle-outline', emoji: '🧩', title: 'Tengo un problema', subtitle: 'Lo resolvemos juntos', goal: 'Tengo un problema y necesito resolverlo', preset: { questionId: 'what', optionId: 'solve' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé cómo hacerlo', subtitle: 'Cuéntame qué quieres lograr', goal: 'Necesito ayuda y no sé por dónde empezar', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'attach', 'voice', 'web'],
    idea: {
      title: '¿Qué necesitas?',
      subtitle: 'Cuéntamelo con tus propias palabras.',
      placeholder: '¿Qué necesitas? Cuéntamelo con tus propias palabras…',
      chips: ['Quiero hacer algo para mi restaurante pero no sé qué', 'Explícame cómo funciona la IA', 'Ayúdame a organizar mi semana'],
    },
    examplesTitle: 'Lo que Weë Brain hace por ti',
    examples: [
      { title: 'Entiende lo que quieres', subtitle: 'Aunque no sepas cómo se llama', kind: 'document', emoji: '💬', tone: T.yellow },
      { title: 'Te lleva al especialista', subtitle: 'Design, Studio, Chef… tú solo ves Weë', kind: 'document', emoji: '🧭', tone: T.sky },
      { title: 'Se encarga de todo el proceso', subtitle: 'De la idea a los diseños, videos y música', kind: 'document', emoji: '✨', tone: T.mint },
    ],
  },

  design: {
    id: 'design',
    headline: 'Diseña lo que imagines.',
    intro: 'Convierte tus ideas en diseños increíbles con inteligencia artificial. Desde un logo hasta un auto, un producto o un mundo completo.',
    chips: ['Rápido y fácil', 'Resultados profesionales', 'Sin límites'],
    note: 'Tu imaginación también diseña el futuro',
    heroEmoji: '🏎️',
    gridTitle: '¿Qué quieres diseñar hoy?',
    actionLayout: 'images',
    actions: [
      { id: 'vehicles', icon: 'car-sport-outline', emoji: '🏎️', title: 'Autos y vehículos', subtitle: 'Deportivos, eléctricos, del futuro', goal: 'Diseñar un auto o vehículo', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'aircraft', icon: 'airplane-outline', emoji: '🚁', title: 'Helicópteros y aviones', subtitle: 'Transporte y rescate', goal: 'Diseñar un helicóptero o avión', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'furniture', icon: 'bed-outline', emoji: '🛋️', title: 'Muebles', subtitle: 'Sillas, mesas, lámparas', goal: 'Diseñar un mueble', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'products', icon: 'water-outline', emoji: '🧴', title: 'Vasos y productos', subtitle: 'Botellas, envases, objetos', goal: 'Diseñar un producto', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'tech', icon: 'phone-portrait-outline', emoji: '📱', title: 'Tecnología', subtitle: 'Gadgets y dispositivos', goal: 'Diseñar un dispositivo tecnológico', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'fashion', icon: 'shirt-outline', emoji: '👟', title: 'Ropa y calzado', subtitle: 'Prendas, zapatillas, colecciones', goal: 'Diseñar ropa o calzado', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'packaging', icon: 'cube-outline', emoji: '📦', title: 'Packaging', subtitle: 'Cajas, etiquetas, empaques', goal: 'Diseñar un empaque', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'architecture', icon: 'business-outline', emoji: '🏠', title: 'Espacios y arquitectura', subtitle: 'Casas, locales, fachadas', goal: 'Diseñar un espacio o edificio', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'inventions', icon: 'bulb-outline', emoji: '💡', title: 'Inventos y conceptos', subtitle: 'Ideas que todavía no existen', goal: 'Diseñar un invento o concepto', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'mechanical', icon: 'cog-outline', emoji: '⚙️', title: 'Piezas mecánicas', subtitle: 'Motores, engranajes, partes', goal: 'Diseñar una pieza mecánica', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'characters', icon: 'happy-outline', emoji: '🧑‍🚀', title: 'Personajes y criaturas', subtitle: 'Mascotas, héroes, seres', goal: 'Diseñar un personaje o criatura', preset: { questionId: 'what', optionId: 'character' } },
      { id: 'logos', icon: 'text-outline', emoji: '🔤', title: 'Logos e identidad', subtitle: 'Marca, colores, tipografía', goal: 'Diseñar un logo e identidad', preset: { questionId: 'what', optionId: 'logo' } },
      { id: 'posters', icon: 'megaphone-outline', emoji: '🪧', title: 'Afiches y publicidad', subtitle: 'Flyers, anuncios, redes', goal: 'Diseñar un afiche o pieza publicitaria', preset: { questionId: 'what', optionId: 'poster' } },
      { id: 'worlds', icon: 'planet-outline', emoji: '🌄', title: 'Mundos y escenas', subtitle: 'Paisajes, ciudades, ambientes', goal: 'Diseñar un mundo o una escena', preset: { questionId: 'what', optionId: 'scene' } },
    ],
    inputs: ['text', 'attach'],
    idea: {
      title: '¿Qué quieres diseñar?',
      subtitle: 'Describe tu idea con el mayor detalle posible.',
      placeholder: 'Ejemplo: Diseña un auto eléctrico del futuro, deportivo y elegante…',
      chips: ['Un auto del futuro', 'Un helicóptero de rescate', 'Un vaso innovador', 'Un logo para mi marca', 'Una casa de playa', 'Un personaje de videojuego'],
    },
    examplesTitle: 'Ejemplos de diseños creados con Weë',
    examples: [
      { title: 'Auto futurista', subtitle: 'Concepto', kind: 'image', emoji: '🏎️', tone: T.slate },
      { title: 'Helicóptero de rescate', subtitle: 'Transporte', kind: 'image', emoji: '🚁', tone: T.coral },
      { title: 'Botella de agua', subtitle: 'Producto', kind: 'image', emoji: '🧴', tone: T.sky },
      { title: 'Casa moderna', subtitle: 'Arquitectura', kind: 'image', emoji: '🏡', tone: T.sand },
      { title: 'Taza de café', subtitle: 'Producto', kind: 'image', emoji: '☕', tone: T.yellow },
      { title: 'Zapatilla deportiva', subtitle: 'Calzado', kind: 'image', emoji: '👟', tone: T.mint },
      { title: 'Robot asistente', subtitle: 'Personaje', kind: 'image', emoji: '🤖', tone: T.plum },
    ],
  },

  photo: {
    id: 'photo',
    headline: 'Tus fotos, aún más increíbles',
    intro: 'Mejora, restaura, transforma y da nueva vida a tus fotos con inteligencia artificial. Es fácil y rápido.',
    chips: ['Resultados en segundos', 'Calidad profesional', 'Para todos'],
    note: 'La mejor versión de tus fotos',
    heroEmoji: '📸',
    gridTitle: '¿Qué quieres hacer hoy?',
    actionLayout: 'tiles',
    actions: [
      { id: 'enhance', icon: 'image-outline', emoji: '✨', title: 'Mejorar una foto', subtitle: 'Más calidad y nitidez', goal: 'Mejorar la calidad de una foto', preset: { questionId: 'action', optionId: 'enhance' } },
      { id: 'remove', icon: 'cut-outline', emoji: '🧽', title: 'Eliminar objetos', subtitle: 'Quita personas o cosas', goal: 'Quitar algo que sobra en una foto', preset: { questionId: 'action', optionId: 'remove' } },
      { id: 'background', icon: 'images-outline', emoji: '🪄', title: 'Cambiar el fondo', subtitle: 'Un nuevo escenario', goal: 'Cambiar el fondo de una foto', preset: { questionId: 'action', optionId: 'background' } },
      { id: 'restore', icon: 'time-outline', emoji: '🕰️', title: 'Restaurar fotos antiguas', subtitle: 'Devuelve la vida a tus recuerdos', goal: 'Restaurar una foto antigua', preset: { questionId: 'action', optionId: 'restore' } },
      { id: 'transform', icon: 'sparkles-outline', emoji: '🎇', title: 'Transformar con IA', subtitle: 'Nuevos estilos y posibilidades', goal: 'Transformar una foto con un estilo nuevo', preset: { questionId: 'action', optionId: 'transform' } },
      { id: 'retouch', icon: 'happy-outline', emoji: '🙂', title: 'Retoque facial', subtitle: 'Luce tu mejor versión', goal: 'Retocar un retrato de forma natural', preset: { questionId: 'action', optionId: 'retouch' } },
      { id: 'style', icon: 'color-palette-outline', emoji: '🎞️', title: 'Cambiar de estilo', subtitle: 'Vintage, artístico, etc.', goal: 'Darle otro estilo a una foto', preset: { questionId: 'action', optionId: 'transform' } },
      { id: 'colorize', icon: 'color-filter-outline', emoji: '🌈', title: 'Colorizar fotos en blanco y negro', subtitle: 'Añade color a tu historia', goal: 'Colorizar una foto en blanco y negro', preset: { questionId: 'action', optionId: 'colorize' } },
      { id: 'generate', icon: 'add-circle-outline', emoji: '🖼️', title: 'Crear imágenes', subtitle: 'Genera imágenes con IA', goal: 'Crear una imagen desde cero', preset: { questionId: 'action', optionId: 'generate' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé qué hacer', subtitle: 'Muéstrame ideas', goal: 'Mejorar una foto', preset: { questionId: 'action', optionId: 'idk' }, idk: true },
    ],
    inputs: ['upload', 'camera', 'text'],
    upload: {
      title: 'Sube tu foto aquí',
      subtitle: 'Arrastra una imagen o haz clic para seleccionar',
      hint: 'JPG, PNG o WEBP (máx. 10 MB)',
    },
    idea: {
      title: '¿Tienes una idea en mente?',
      subtitle: 'Cuéntale a Weë lo que quieres hacer con tu foto.',
      placeholder: 'Ejemplo: Quiero que esta foto se vea más nítida y con colores más vivos…',
      chips: ['Más nítida y con colores vivos', 'Quita a la persona del fondo', 'Hazla estilo vintage'],
    },
    examplesTitle: 'Ejemplos de lo que puedes hacer',
    examples: [
      { title: 'Mejorar calidad', kind: 'beforeAfter', emoji: '🏔️', tone: T.sky },
      { title: 'Eliminar objetos', kind: 'beforeAfter', emoji: '🏖️', tone: T.yellow },
      { title: 'Cambiar fondo', kind: 'beforeAfter', emoji: '🛋️', tone: T.sand },
      { title: 'Restaurar foto', kind: 'beforeAfter', emoji: '🕰️', tone: T.slate },
      { title: 'Retoque facial', kind: 'beforeAfter', emoji: '🙂', tone: T.rose },
      { title: 'Transformar con IA', kind: 'beforeAfter', emoji: '🎨', tone: T.plum },
    ],
  },

  music: {
    id: 'music',
    headline: 'Crea, escucha y vive tu música con IA',
    intro: 'Convierte tus ideas en canciones, videos y experiencias únicas. Sin límites para tu creatividad.',
    chips: ['Rápido y sencillo', 'Calidad profesional', 'Para todos'],
    note: 'Tu imaginación también suena',
    heroEmoji: '🎧',
    gridTitle: '¿Qué quieres crear hoy?',
    actionLayout: 'tiles',
    actions: [
      { id: 'song', icon: 'musical-notes-outline', emoji: '🎤', title: 'Crear una canción', subtitle: 'Desde una idea, letra o estilo', goal: 'Crear una canción', preset: { questionId: 'what', optionId: 'song' } },
      { id: 'musicvideo', icon: 'videocam-outline', emoji: '🎬', title: 'Crear tu video con IA', subtitle: 'Genera un videoclip completo', goal: 'Crear un videoclip para mi canción', preset: { questionId: 'what', optionId: 'video' } },
      { id: 'voice', icon: 'mic-outline', emoji: '🗣️', title: 'Crear una voz con IA', subtitle: 'Voces realistas en varios estilos', goal: 'Crear una voz o narración', preset: { questionId: 'what', optionId: 'voice' } },
      { id: 'beat', icon: 'pulse-outline', emoji: '🥁', title: 'Crear un beat', subtitle: 'Trap, pop, rock, reggaetón y más', goal: 'Crear un beat', preset: { questionId: 'what', optionId: 'instrumental' } },
      { id: 'lyrics', icon: 'document-text-outline', emoji: '📝', title: 'Crear o mejorar una letra', subtitle: 'Te ayudamos a escribir la canción perfecta', goal: 'Escribir o mejorar la letra de una canción', preset: { questionId: 'what', optionId: 'lyrics' } },
      { id: 'mix', icon: 'options-outline', emoji: '🎚️', title: 'Mezclar y masterizar', subtitle: 'Dale un sonido profesional', goal: 'Mezclar y masterizar mi canción', preset: { questionId: 'what', optionId: 'mix' } },
      { id: 'clip', icon: 'film-outline', emoji: '🎞️', title: 'Crear videoclip para mi canción', subtitle: 'Música + video + edición en un solo lugar', goal: 'Crear un videoclip para mi canción', preset: { questionId: 'what', optionId: 'video' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé qué hacer', subtitle: 'Cuéntame tu idea y te ayudo', goal: 'Música para mi contenido', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'voice'],
    idea: {
      title: '¿Tienes una idea en mente?',
      subtitle: 'Cuéntamela y la convertimos en música.',
      placeholder: 'Ejemplo: Quiero una canción de reggaetón sobre mi restaurante…',
      chips: ['Una canción para mi negocio', 'Un beat para mis videos', 'Un jingle pegajoso', 'Sorpréndeme'],
    },
    examplesTitle: 'Ejemplos de lo que puedes crear',
    examples: [
      { title: 'Sueños', subtitle: 'Pop', kind: 'video', emoji: '🎤', tone: T.plum, meta: '3:12' },
      { title: 'Barrio mío', subtitle: 'Reggaetón', kind: 'video', emoji: '🕶️', tone: T.night, meta: '2:45' },
      { title: 'Vuela alto', subtitle: 'Rock', kind: 'video', emoji: '🪽', tone: T.slate, meta: '4:08' },
      { title: 'Sabor peruano', subtitle: 'Comercial', kind: 'video', emoji: '🍽️', tone: T.coral, meta: '1:20' },
      { title: 'Luz en ti', subtitle: 'Balada', kind: 'video', emoji: '🌅', tone: T.yellow, meta: '3:55' },
      { title: 'Ciudad virtual', subtitle: 'Electrónica', kind: 'video', emoji: '🌆', tone: T.sky, meta: '3:10' },
    ],
    closing: {
      title: 'Crear tu video con IA',
      subtitle: 'Convierte tu música en un video increíble: varios estilos, sincronización automática, formatos para redes, escenas y personajes.',
      button: 'Crear video ahora',
    },
  },

  studio: {
    id: 'studio',
    headline: 'Convierte tus ideas en videos',
    intro: 'No necesitas saber hacer videos. Cuéntame qué quieres crear y te ayudaré paso a paso.',
    chips: ['Fácil de usar', 'Resultados increíbles', 'Para todos'],
    note: 'Ideas en movimiento',
    heroEmoji: '🎬',
    gridTitle: '¿Qué quieres hacer hoy?',
    actionLayout: 'wide',
    actions: [
      { id: 'video', icon: 'videocam-outline', emoji: '🎬', title: 'Crear un video', subtitle: 'Cuéntame una idea y la convertiremos en video.', goal: 'Crear un video desde una idea', preset: { questionId: 'type', optionId: 'social' } },
      { id: 'animate', icon: 'image-outline', emoji: '🖼️', title: 'Animar una foto', subtitle: 'Haz que una fotografía cobre vida.', goal: 'Animar una foto', preset: { questionId: 'type', optionId: 'animate' } },
      { id: 'social', icon: 'phone-portrait-outline', emoji: '📱', title: 'Video para redes', subtitle: 'Crea contenido para Instagram, TikTok o YouTube.', goal: 'Un video para mis redes', preset: { questionId: 'type', optionId: 'social' } },
      { id: 'ad', icon: 'megaphone-outline', emoji: '📣', title: 'Crear un anuncio', subtitle: 'Promociona tu producto o negocio.', goal: 'Crear un anuncio para mi negocio', preset: { questionId: 'type', optionId: 'promo' } },
      { id: 'story', icon: 'book-outline', emoji: '📖', title: 'Contar una historia', subtitle: 'Crea una historia visual escena por escena.', goal: 'Contar una historia en video', preset: { questionId: 'type', optionId: 'story' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé cómo hacerlo', subtitle: 'Cuéntame qué quieres conseguir y Weë te orientará.', goal: 'Un video corto para mis redes', preset: { questionId: 'type', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'upload'],
    idea: {
      title: '¿Tienes una idea en mente?',
      subtitle: 'Escríbela con tus propias palabras y Weë te ayudará.',
      placeholder: 'Ejemplo: Quiero un video para mi restaurante…',
      chips: ['Un video de mi negocio', 'Una presentación', 'Un saludo especial', 'Un video de mi mascota', 'Sorpréndeme'],
      button: 'Empezar',
    },
    examplesTitle: 'Ejemplos de videos que puedes crear',
    examples: [
      { title: 'Anuncio gastronómico', kind: 'video', emoji: '🍔', tone: T.coral, meta: '0:15' },
      { title: 'Video de viajes', kind: 'video', emoji: '🏞️', tone: T.sky, meta: '0:20' },
      { title: 'Video de producto', kind: 'video', emoji: '🧴', tone: T.sand, meta: '0:12' },
      { title: 'Contenido para redes', kind: 'video', emoji: '💪', tone: T.slate, meta: '0:18' },
      { title: 'Video animado', kind: 'video', emoji: '🧒', tone: T.yellow, meta: '0:20' },
      { title: 'Video de mascotas', kind: 'video', emoji: '🐶', tone: T.mint, meta: '0:14' },
    ],
  },

  business: {
    id: 'business',
    headline: 'Tu equipo de marketing, ventas y estrategia en un solo lugar.',
    intro: 'Conecta tus redes, crea contenido, publica automáticamente y haz crecer tu negocio con inteligencia artificial.',
    chips: ['Ahorra tiempo', 'Más ventas', 'Tu negocio, más grande'],
    note: 'Tu negocio también puede llegar más lejos',
    heroEmoji: '💼',
    gridTitle: '¿Qué quieres hacer hoy?',
    actionLayout: 'tiles',
    actions: [
      { id: 'content', icon: 'color-wand-outline', emoji: '✨', title: 'Crear contenido', subtitle: 'Imágenes, videos y textos con IA', goal: 'Crear contenido para las redes de mi negocio', preset: { questionId: 'what', optionId: 'marketing' } },
      { id: 'schedule', icon: 'calendar-outline', emoji: '📅', title: 'Programar publicaciones', subtitle: 'Elige fechas y horarios', goal: 'Programar las publicaciones de mi negocio', preset: { questionId: 'what', optionId: 'marketing' } },
      { id: 'publish', icon: 'paper-plane-outline', emoji: '🚀', title: 'Publicar automáticamente', subtitle: 'En todas tus redes', goal: 'Publicar automáticamente en mis redes', preset: { questionId: 'what', optionId: 'marketing' } },
      { id: 'reply', icon: 'chatbubble-ellipses-outline', emoji: '💬', title: 'Responder clientes', subtitle: 'Mensajes, comentarios y consultas', goal: 'Responder a mis clientes', preset: { questionId: 'what', optionId: 'marketing' } },
      { id: 'analyze', icon: 'bar-chart-outline', emoji: '📊', title: 'Analizar resultados', subtitle: 'Descubre qué funciona mejor', goal: 'Analizar los resultados de mi negocio', preset: { questionId: 'what', optionId: 'plan' } },
      { id: 'strategy', icon: 'bulb-outline', emoji: '💡', title: 'Ideas y estrategia', subtitle: 'Nuevas oportunidades para crecer', goal: 'Ideas y estrategia para hacer crecer mi negocio', preset: { questionId: 'what', optionId: 'idea' } },
    ],
    inputs: ['text', 'attach'],
    idea: {
      title: 'Weë está listo para ayudarte',
      subtitle: 'Dime qué necesitas y crearé la estrategia, el contenido y me encargaré de publicarlo.',
      placeholder: 'Ejemplo: Quiero vender más este mes en mi cafetería…',
      chips: ['Crear mi primera campaña', 'Un plan para mi emprendimiento', 'Mi CV actualizado', 'Una presentación para inversores'],
      button: 'Crear mi primera campaña',
    },
    examplesTitle: 'Resultados esta semana',
    examples: [
      { title: '24', subtitle: 'Publicaciones', kind: 'document', emoji: '📝', tone: T.yellow, meta: '↑ 40%' },
      { title: '125.4K', subtitle: 'Personas alcanzadas', kind: 'document', emoji: '👀', tone: T.sky, meta: '↑ 60%' },
      { title: '2.8K', subtitle: 'Interacciones', kind: 'document', emoji: '💬', tone: T.mint, meta: '↑ 35%' },
      { title: '186', subtitle: 'Mensajes recibidos', kind: 'document', emoji: '📩', tone: T.coral, meta: '↑ 70%' },
    ],
  },

  chef: {
    id: 'chef',
    headline: 'Tu chef personal siempre contigo',
    intro: 'Descubre recetas, crea menús, aprovecha lo que tienes y come mejor, más fácil y más rico.',
    chips: ['Recetas fáciles', 'Opciones saludables', 'Para todos'],
    note: 'Buenas ideas también se cocinan',
    heroEmoji: '🍝',
    gridTitle: '¿Qué quieres hacer hoy?',
    actionLayout: 'tiles',
    actions: [
      { id: 'recipe', icon: 'restaurant-outline', emoji: '🍲', title: 'Quiero una receta', subtitle: 'Dime qué se te antoja', goal: 'Quiero una receta', preset: { questionId: 'what', optionId: 'recipe' } },
      { id: 'ingredients', icon: 'nutrition-outline', emoji: '🧊', title: 'Usar mis ingredientes', subtitle: 'Cocina con lo que tienes', goal: 'Cocinar con los ingredientes que tengo en casa', preset: { questionId: 'what', optionId: 'cook' } },
      { id: 'menu', icon: 'list-outline', emoji: '📋', title: 'Crear un menú', subtitle: 'Para la semana o un evento', goal: 'Crear un menú', preset: { questionId: 'what', optionId: 'menu' } },
      { id: 'healthy', icon: 'leaf-outline', emoji: '🥗', title: 'Opciones saludables', subtitle: 'Rico y ligero', goal: 'Quiero opciones saludables para comer', preset: { questionId: 'what', optionId: 'recipe' } },
      { id: 'dessert', icon: 'ice-cream-outline', emoji: '🍰', title: 'Postres', subtitle: 'Fáciles y deliciosos', goal: 'Quiero un postre fácil', preset: { questionId: 'what', optionId: 'recipe' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé qué cocinar', subtitle: 'Te propongo algo rico', goal: 'No sé qué cocinar hoy', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'camera', 'voice'],
    idea: {
      title: '¡Hola! Soy Weë Chef 👨‍🍳',
      subtitle: 'Cuéntame, ¿qué te gustaría cocinar hoy?',
      placeholder: 'Escribe tu idea aquí…',
      chips: ['Quiero una cena rápida', 'Recetas con pollo', 'Algo saludable', 'Un postre fácil', 'Qué puedo hacer con esto'],
    },
    upload: {
      title: '¿Tienes ingredientes en casa?',
      subtitle: 'Toma una foto de tu refrigerador y Weë te dirá qué puedes cocinar.',
      hint: 'JPG, PNG o WEBP (máx. 10 MB)',
      button: 'Subir foto',
    },
    examplesTitle: 'Recetas populares',
    examples: [
      { title: 'Pasta a la carbonara', subtitle: 'Fácil y deliciosa', kind: 'recipe', emoji: '🍝', tone: T.yellow, meta: '20 min' },
      { title: 'Ensalada de pollo', subtitle: 'Saludable', kind: 'recipe', emoji: '🥗', tone: T.mint, meta: '25 min' },
      { title: 'Hamburguesa casera', subtitle: 'Como en casa', kind: 'recipe', emoji: '🍔', tone: T.coral, meta: '30 min' },
      { title: 'Lomo saltado', subtitle: 'Clásico peruano', kind: 'recipe', emoji: '🥘', tone: T.sand, meta: '25 min' },
      { title: 'Volcán de chocolate', subtitle: 'Postre irresistible', kind: 'recipe', emoji: '🍫', tone: T.slate, meta: '15 min' },
    ],
  },

  home: {
    id: 'home',
    headline: 'Tu espacio, mejor versión',
    intro: 'Diseña, visualiza y transforma tus espacios con inteligencia artificial. Ideas reales para un hogar más bonito, funcional y a tu estilo.',
    chips: ['Fácil de usar', 'Resultados realistas', 'Para todos'],
    note: 'Un hogar con más posibilidades',
    heroEmoji: '🛋️',
    gridTitle: '¿Qué quieres hacer hoy?',
    actionLayout: 'wide',
    actions: [
      { id: 'design', icon: 'bed-outline', emoji: '🛋️', title: 'Diseñar tus espacios', subtitle: 'Visualiza cómo se verían tus ambientes.', goal: 'Diseñar un espacio de mi casa', preset: { questionId: 'space', optionId: 'living' } },
      { id: 'remodel', icon: 'brush-outline', emoji: '🧱', title: 'Remodelar', subtitle: 'Cambia pisos, paredes y estilos.', goal: 'Remodelar un espacio de mi casa', preset: { questionId: 'space', optionId: 'living' } },
      { id: 'furniture', icon: 'cube-outline', emoji: '🪑', title: 'Probar muebles', subtitle: 'Ve cómo quedan en tu espacio.', goal: 'Probar muebles nuevos en mi espacio', preset: { questionId: 'space', optionId: 'living' } },
      { id: 'garden', icon: 'leaf-outline', emoji: '🌿', title: 'Exterior y jardín', subtitle: 'Diseña fachadas, terrazas y jardines.', goal: 'Diseñar mi jardín o exterior', preset: { questionId: 'space', optionId: 'garden' } },
      { id: 'ideas', icon: 'bulb-outline', emoji: '💡', title: 'Buscar ideas', subtitle: 'Inspírate con estilos y tendencias.', goal: 'Buscar ideas para mi casa', preset: { questionId: 'space', optionId: 'idk' } },
      { id: 'layout', icon: 'grid-outline', emoji: '📐', title: 'Planos y distribución', subtitle: 'Optimiza el espacio de tu hogar.', goal: 'Mejorar la distribución de mi espacio', preset: { questionId: 'space', optionId: 'living' } },
      { id: 'colors', icon: 'color-palette-outline', emoji: '🎨', title: 'Cambiar colores', subtitle: 'Explora diferentes paletas y estilos.', goal: 'Cambiar los colores de mi espacio', preset: { questionId: 'space', optionId: 'living' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé qué hacer', subtitle: 'Cuéntame tu idea y te ayudo.', goal: 'Renovar un espacio de mi casa', preset: { questionId: 'space', optionId: 'idk' }, idk: true },
    ],
    inputs: ['upload', 'text'],
    upload: {
      title: 'Sube una foto de tu espacio',
      subtitle: 'Sala, cocina, dormitorio, terraza, etc.',
      hint: 'JPG, PNG o WEBP (máx. 10 MB)',
      button: 'Subir foto',
    },
    idea: {
      title: 'O también puedes partir de una idea',
      subtitle: 'Cuéntale a Weë cómo es tu espacio y qué te gustaría mejorar.',
      placeholder: 'Ejemplo: Quiero una sala más moderna y acogedora…',
      chips: ['Una sala más moderna', 'Mi cuarto más acogedor', 'Una cocina pequeña bien aprovechada'],
    },
    examplesTitle: 'Inspiración para tu hogar',
    examples: [
      { title: 'Salas modernas', kind: 'image', emoji: '🛋️', tone: T.sand },
      { title: 'Cocinas funcionales', kind: 'image', emoji: '🍳', tone: T.yellow },
      { title: 'Dormitorios acogedores', kind: 'image', emoji: '🛏️', tone: T.rose },
      { title: 'Baños elegantes', kind: 'image', emoji: '🛁', tone: T.sky },
      { title: 'Terrazas y jardines', kind: 'image', emoji: '🌿', tone: T.mint },
      { title: 'Estilos minimalistas', kind: 'image', emoji: '◻️', tone: T.slate },
    ],
    closing: {
      title: '¿No sabes por dónde empezar?',
      subtitle: 'Cuéntale a Weë cómo es tu espacio y qué te gustaría mejorar.',
      button: 'Hablar con Weë',
    },
  },

  beauty: {
    id: 'beauty',
    headline: 'Explora, crea y descubre tu mejor versión.',
    intro: 'Tu estilista, maquillador y asesor de imagen con IA.',
    chips: ['Looks increíbles', 'Resultados realistas', 'Para todos los estilos', 'Tú decides'],
    note: 'Tu estilo también cuenta',
    heroEmoji: '💄',
    gridTitle: '¿Qué quieres probar hoy?',
    actionLayout: 'images',
    actions: [
      { id: 'makeup', icon: 'color-palette-outline', emoji: '💄', title: 'Maquillaje', subtitle: 'Looks para cada ocasión', goal: 'Probar un maquillaje', preset: { questionId: 'what', optionId: 'makeup' } },
      { id: 'hair', icon: 'cut-outline', emoji: '💇', title: 'Cabello', subtitle: 'Cortes, peinados y estilos', goal: 'Probar otro corte o peinado', preset: { questionId: 'what', optionId: 'hair' } },
      { id: 'haircolor', icon: 'color-fill-outline', emoji: '🎨', title: 'Color de cabello', subtitle: 'Explora nuevos colores', goal: 'Probar otro color de cabello', preset: { questionId: 'what', optionId: 'hair' } },
      { id: 'beard', icon: 'man-outline', emoji: '🧔', title: 'Barba', subtitle: 'Estilos y cuidado', goal: 'Probar un estilo de barba', preset: { questionId: 'what', optionId: 'beard' } },
      { id: 'outfit', icon: 'shirt-outline', emoji: '👗', title: 'Ropa y outfits', subtitle: 'Combina tu estilo', goal: 'Probar un outfit', preset: { questionId: 'what', optionId: 'outfit' } },
      { id: 'nails', icon: 'hand-left-outline', emoji: '💅', title: 'Uñas', subtitle: 'Diseños y colores', goal: 'Probar un diseño de uñas', preset: { questionId: 'what', optionId: 'makeup' } },
      { id: 'transform', icon: 'swap-horizontal-outline', emoji: '✨', title: 'Transformaciones', subtitle: 'Antes y después', goal: 'Probar un cambio de look completo', preset: { questionId: 'what', optionId: 'idk' } },
      { id: 'skin', icon: 'water-outline', emoji: '🧴', title: 'Cuidado de la piel', subtitle: 'Rutinas y consejos', goal: 'Consejos para el cuidado de mi piel', preset: { questionId: 'what', optionId: 'makeup' } },
      { id: 'face', icon: 'scan-outline', emoji: '🪞', title: 'Estilo por rostro', subtitle: 'Encuentra tu estilo ideal', goal: 'Encontrar el estilo que mejor va con mi rostro', preset: { questionId: 'what', optionId: 'hair' } },
      { id: 'accessories', icon: 'glasses-outline', emoji: '🕶️', title: 'Accesorios', subtitle: 'Completa tu look', goal: 'Probar accesorios para mi look', preset: { questionId: 'what', optionId: 'outfit' } },
    ],
    inputs: ['upload', 'camera', 'voice', 'text'],
    upload: {
      title: 'Prueba un look en tu foto',
      subtitle: 'Sube una foto y descubre diferentes estilos al instante.',
      hint: 'JPG, PNG o WEBP (máx. 10 MB)',
      button: 'Subir mi foto',
    },
    idea: {
      title: 'Cuéntale a Weë qué quieres hacer…',
      subtitle: 'Con tus palabras: Weë se encarga del resto.',
      placeholder: 'Ejemplo: "Quiero un cambio de look, cabello largo y rubio, maquillaje natural"',
      chips: ['Cabello largo y rubio', 'Maquillaje natural para el día', 'Un look para una fiesta'],
    },
    examplesTitle: 'Ideas para ti',
    examples: [
      { title: 'Look natural', subtitle: 'Para el día a día', kind: 'image', emoji: '🌤️', tone: T.sand },
      { title: 'Look de noche', subtitle: 'Glam y sofisticado', kind: 'image', emoji: '🌙', tone: T.night },
      { title: 'Cabello largo y rubio', subtitle: 'Transforma tu estilo', kind: 'image', emoji: '👱', tone: T.yellow },
      { title: 'Maquillaje coreano', subtitle: 'Fresco y moderno', kind: 'image', emoji: '🌸', tone: T.rose },
      { title: 'Outfit casual', subtitle: 'Cómodo y con estilo', kind: 'image', emoji: '👕', tone: T.sky },
      { title: 'Look profesional', subtitle: 'Para el trabajo', kind: 'image', emoji: '💼', tone: T.slate },
    ],
  },

  writer: {
    id: 'writer',
    headline: 'Escribe, crea, mejora y da vida a tus ideas.',
    intro: 'Tu especialista en textos, historias, guiones, documentos y mucho más.',
    chips: ['Ideas sin límites', 'Textos de calidad', 'Tu historia, nuestro apoyo'],
    note: 'Tus ideas también cuentan',
    heroEmoji: '✏️',
    gridTitle: '¿Qué escribimos hoy?',
    actionLayout: 'tiles',
    actions: [
      { id: 'cover', icon: 'book-outline', emoji: '📕', title: 'Crear portada', subtitle: 'Portadas de libros, ebooks, documentos y más', goal: 'Crear la portada de mi libro', preset: { questionId: 'what', optionId: 'cover' } },
      { id: 'story', icon: 'library-outline', emoji: '📖', title: 'Historia / Novela', subtitle: 'Crea mundos, personajes y tramas', goal: 'Escribir una historia o novela', preset: { questionId: 'what', optionId: 'story' } },
      { id: 'script', icon: 'film-outline', emoji: '🎬', title: 'Guion', subtitle: 'Cine, series, YouTube o comerciales', goal: 'Escribir un guion', preset: { questionId: 'what', optionId: 'script' } },
      { id: 'article', icon: 'newspaper-outline', emoji: '📰', title: 'Artículo / Blog', subtitle: 'Escribe artículos que inspiran', goal: 'Escribir un artículo para mi blog', preset: { questionId: 'what', optionId: 'article' } },
      { id: 'social', icon: 'logo-instagram', emoji: '📱', title: 'Redes sociales', subtitle: 'Publicaciones que conectan', goal: 'Escribir una publicación para redes', preset: { questionId: 'what', optionId: 'post' } },
      { id: 'email', icon: 'mail-outline', emoji: '✉️', title: 'Email / Carta', subtitle: 'Redacta mensajes profesionales o personales', goal: 'Escribir un email o una carta', preset: { questionId: 'what', optionId: 'email' } },
      { id: 'document', icon: 'document-text-outline', emoji: '📄', title: 'Documento', subtitle: 'Informes, planes y más', goal: 'Redactar un documento', preset: { questionId: 'what', optionId: 'document' } },
      { id: 'cv', icon: 'person-outline', emoji: '🧑‍💼', title: 'CV / Hoja de vida', subtitle: 'Destaca tu talento', goal: 'Redactar mi CV', preset: { questionId: 'what', optionId: 'cv' } },
      { id: 'translate', icon: 'language-outline', emoji: '🌐', title: 'Traducción', subtitle: 'A cualquier idioma', goal: 'Traducir un texto', preset: { questionId: 'what', optionId: 'translate' } },
      { id: 'summary', icon: 'list-outline', emoji: '🗒️', title: 'Resumen', subtitle: 'Convierte textos largos en ideas clave', goal: 'Resumir un texto', preset: { questionId: 'what', optionId: 'summary' } },
      { id: 'ideas', icon: 'bulb-outline', emoji: '💡', title: 'Ideas', subtitle: 'Supera el bloqueo creativo', goal: 'Necesito ideas para escribir', preset: { questionId: 'what', optionId: 'ideas' } },
      { id: 'fix', icon: 'checkmark-circle-outline', emoji: '✔️', title: 'Corrección', subtitle: 'Mejora ortografía, estilo y claridad', goal: 'Corregir un texto', preset: { questionId: 'what', optionId: 'fix' } },
      { id: 'rewrite', icon: 'refresh-outline', emoji: '🔁', title: 'Reescritura', subtitle: 'Dale un nuevo enfoque a tus textos', goal: 'Reescribir un texto con otro enfoque', preset: { questionId: 'what', optionId: 'rewrite' } },
      { id: 'citations', icon: 'chatbox-ellipses-outline', emoji: '❝', title: 'Citas y referencias', subtitle: 'Formatea en APA, MLA y más', goal: 'Formatear citas y referencias', preset: { questionId: 'what', optionId: 'document' } },
      { id: 'more', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'Más herramientas', subtitle: 'Explora todo lo que puedes crear', goal: 'Un texto para publicar', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'attach', 'voice', 'web'],
    idea: {
      title: 'Cuéntale a Weë qué quieres escribir…',
      subtitle: 'Un tema, una idea suelta o un texto para mejorar.',
      placeholder: 'Cuéntale a Weë qué quieres escribir…',
      chips: ['Un cuento para mis hijos', 'Un email para un cliente', 'La descripción de mi producto', 'Corrige este texto'],
    },
    examplesTitle: 'Ejemplos e inspiración',
    examples: [
      { title: 'Portada de novela', subtitle: 'Ciencia ficción', kind: 'document', emoji: '🚀', tone: T.night },
      { title: 'Portada de libro', subtitle: 'Gastronomía', kind: 'document', emoji: '🍲', tone: T.coral },
      { title: 'Guion de cortometraje', subtitle: 'Drama', kind: 'document', emoji: '🎭', tone: T.slate },
      { title: 'Artículo de blog', subtitle: 'Tecnología', kind: 'document', emoji: '💻', tone: T.sky },
      { title: 'Post para redes', subtitle: 'Motivación', kind: 'document', emoji: '🌅', tone: T.yellow },
      { title: 'CV profesional', subtitle: 'Moderno y limpio', kind: 'document', emoji: '🧑‍💼', tone: T.mint },
    ],
  },
};

/** Orden de la barra lateral y de la pantalla de Weë Creator (referencias visuales). */
export const SPECIALIST_ORDER: SpecialistId[] = ['brain', 'design', 'photo', 'music', 'studio', 'business', 'chef', 'home', 'beauty', 'writer'];

export const getSpecialist = (id: string): (SpecialistConfig & { experience: WeeExperience }) | null => {
  const config = SPECIALISTS[id as SpecialistId];
  const experience = getExperienceById(id);
  if (!config || !experience) return null;
  return { ...config, experience };
};
