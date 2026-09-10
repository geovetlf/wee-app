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

/**
 * Cómo se muestra la cuadrícula "¿Qué quieres hacer hoy?".
 * 'compact' es la forma que estrena Weë Chef (fase 2E-37): controles pequeños,
 * fáciles de recorrer de un vistazo y sin ninguna fotografía, para que la pantalla
 * no se convierta en un catálogo de tarjetas grandes.
 */
export type ActionLayout = 'tiles' | 'wide' | 'images' | 'compact';

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
  /**
   * Abre la conversación de OTRA experiencia (fase 2E-50).
   *
   * Weë Studio reúne tres áreas —fotos, videos y look— que por dentro siguen
   * siendo Weë Photo, Weë Studio y Weë Beauty, con sus plantillas y sus planes
   * intactos. Esta línea es lo único que hacía falta para que el selector lleve
   * a la mesa de trabajo correcta sin duplicar ni una.
   *
   * Sin este campo, una acción abre la conversación de su propia sección, que es
   * lo que hacen las otras siete.
   */
  opens?: SpecialistId;
  /**
   * Entrada secundaria del selector (fase 2E-53).
   *
   * Weë Studio dice primero una cosa —crea fotos y videos— y Beauty es una
   * capacidad especializada dentro de ese mundo. Con las tres tarjetas iguales,
   * Beauty competía con el mensaje principal; escondida dentro del flujo de
   * Fotos, quedaba a tres pasos y detrás de una subida de foto. Esta marca le da
   * el sitio que le toca: un renglón propio bajo una línea, más pequeño que los
   * dos caminos principales y a un solo toque.
   *
   * No cambia a dónde lleva: sigue abriendo `beauty` directamente, con su
   * plantilla, sus planes y su identificador intactos.
   */
  secondary?: boolean;
}

/**
 * Pestañas del muro social de una sección. Cada una se resuelve con algo que Weë
 * ya sabe hacer —todas las publicaciones, las que traen imagen, las que explican
 * cómo se hizo algo, las tuyas y las que guardaste— sin ninguna función nueva.
 */
export type WallTabKind = 'all' | 'images' | 'tutorials' | 'mine' | 'saved';

export interface WallTab {
  id: WallTabKind;
  label: string;
}

/** Lo que la sección aporta a su muro: sus pestañas y sus palabras. */
export interface SectionWallConfig {
  /*
   * Opcional desde 2E-73. Una sección que enseña el muro general de Weë no tiene
   * pestañas propias: filtrar por sección y ofrecer "Fotos del viaje" o "Mis
   * viajes" convertía la sección en un feed paralelo, y Weë tiene un solo muro.
   */
  tabs?: WallTab[];
  /** Texto del compositor ("Comparte tu plato, una receta o una pregunta…"). */
  placeholder: string;
  /** Qué se ve cuando todavía no hay publicaciones de esta sección. */
  empty: {
    emoji: string;
    title: string;
    text: string;
    button: string;
  };
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
  /** Frase corta a la derecha del título ("Elige una opción y empieza…"). */
  gridHint?: string;
  actionLayout: ActionLayout;
  actions: SpecialistAction[];
  inputs: InputMode[];
  /**
   * Muro social de la sección. Cuando está, la sección deja de ser un catálogo de
   * herramientas y pasa a ser una comunidad con herramientas dentro. Weë Chef es
   * el piloto (fase 2E-37); las demás lo adoptan cuando les toque.
   */
  wall?: SectionWallConfig;
  /**
   * La caja de escribir va antes que la cuadrícula de funciones (fase 2E-64C).
   *
   * En una sección con muro, el orden normal es: herramientas plegadas y luego
   * el muro. Weë Travel invierte los dos primeros porque su entrada natural es
   * una frase —"Japón 10 días en octubre"—, no elegir de un menú. Sin esta marca
   * el orden no cambia, así que las demás secciones siguen exactamente igual.
   */
  ideaFirst?: boolean;
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
  /*
   * La fila de ejemplos bajo el muro. Es opcional desde 2E-69: una sección puede
   * no tener nada que enseñar ahí, y entonces no enseña nada. Weë Travel tenía
   * "Viajes que preparó Weë" con cuatro tarjetas que no llevaban a ningún viaje
   * de nadie —eran decorado— y competían con lo que sí publica la gente.
   */
  examplesTitle?: string;
  examples?: SpecialistExample[];
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
    gridHint: 'Logos, productos, personajes, lugares y más.',
    /*
     * Siete intenciones, no catorce ejemplos (fase 2E-43).
     *
     * Aquí hubo catorce tarjetas —autos, helicópteros, muebles, vasos, tecnología,
     * ropa, packaging, arquitectura, inventos, piezas, personajes, logos, afiches y
     * mundos— que por dentro eran seis destinos y un único plan. Diez de ellas solo
     * cambiaban la frase que se le manda al modelo: eran ejemplos disfrazados de
     * funciones.
     *
     * Se agrupan por lo que quiere la persona, no por el destino técnico: por eso
     * "arquitectura" (que era `object`, como un auto) está con "mundos y escenas",
     * porque quien diseña una casa piensa en un lugar y no en una máquina.
     *
     * Los diez nombres que pierden botón siguen vivos en los subtítulos y en el
     * `infer` del planificador, que reconoce "packaging", "zapatilla", "lámpara",
     * "casa" o "invento" y salta solo a la opción correcta.
     *
     * Estas siete no resuelven nada aquí: cada una es la puerta a la conversación
     * guiada, que es donde se trabaja.
     */
    actionLayout: 'compact',
    actions: [
      { id: 'brand', icon: 'text-outline', emoji: '🔤', title: 'Un logo o mi marca', subtitle: 'Nombre, colores y tipografía', goal: 'Diseñar un logo y la identidad de mi marca', preset: { questionId: 'what', optionId: 'logo' } },
      { id: 'social', icon: 'megaphone-outline', emoji: '🪧', title: 'Algo para redes o publicidad', subtitle: 'Afiches, flyers, anuncios, portadas', goal: 'Diseñar una pieza para redes o publicidad', preset: { questionId: 'what', optionId: 'poster' } },
      { id: 'product', icon: 'cube-outline', emoji: '📦', title: 'Un producto', subtitle: 'Envases, muebles, ropa, tecnología', goal: 'Diseñar un producto', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'machine', icon: 'car-sport-outline', emoji: '🏎️', title: 'Un vehículo o una máquina', subtitle: 'Autos, aviones, motores, inventos', goal: 'Diseñar un vehículo o una máquina', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'place', icon: 'business-outline', emoji: '🏙️', title: 'Un lugar o un escenario', subtitle: 'Crea desde cero casas, locales, ciudades y paisajes', goal: 'Diseñar un lugar o un escenario', preset: { questionId: 'what', optionId: 'scene' } },
      /*
       * Hogar & Diseño va aquí, al lado de su vecino conceptual, aunque se dibuje
       * abajo: `secondary` decide dónde se pinta, no el orden de esta lista.
       *
       * Y va separada de "Un lugar o un escenario" por lo que hace, no por el
       * sustantivo que comparten: una imagina un lugar desde cero, la otra trabaja
       * sobre la foto del espacio que ya tienes conservando paredes y ventanas.
       * Por dentro sigue siendo la experiencia `home`, entera.
       */
      { id: 'home', icon: 'home-outline', emoji: '🏠', title: 'Hogar & Diseño', subtitle: 'Transforma y rediseña tu hogar o espacio a partir de una foto.', goal: 'Diseñar un espacio de mi casa', opens: 'home', secondary: true },
      { id: 'character', icon: 'happy-outline', emoji: '🧑‍🚀', title: 'Un personaje', subtitle: 'Mascotas, héroes, criaturas', goal: 'Diseñar un personaje', preset: { questionId: 'what', optionId: 'character' } },
      // Sin respuesta previa a propósito: la primera pregunta del flujo es justo
      // "¿Qué quieres diseñar?", que es la ayuda que necesita quien no lo tiene claro.
      { id: 'idk', icon: 'bulb-outline', emoji: '💡', title: 'No sé qué diseñar', subtitle: 'Cuéntame tu idea y te propongo algo', goal: 'Quiero diseñar algo pero no sé qué', idk: true },
    ],
    inputs: ['text'],
    // Weë Design estrena el muro social después de Weë Chef (fase 2E-43).
    wall: {
      tabs: [
        { id: 'all', label: 'Muro Design' },
        { id: 'tutorials', label: 'Cómo lo hicieron' },
        { id: 'saved', label: 'Guardados' },
      ],
      placeholder: 'Comparte un diseño, una idea o una pregunta…',
      empty: {
        emoji: '🎨',
        title: 'Todavía no hay nada en el muro de Weë Design',
        text: 'Comparte tu primer diseño, una idea o una pregunta con la comunidad.',
        button: 'Crear publicación',
      },
    },
    idea: {
      title: '¿Qué quieres diseñar?',
      subtitle: 'Describe tu idea con el mayor detalle posible.',
      placeholder: 'Ejemplo: Diseña un auto eléctrico del futuro, deportivo y elegante…',
      chips: ['Un auto del futuro', 'Un helicóptero de rescate', 'Un vaso innovador', 'Un logo para mi marca', 'Una casa de playa', 'Un personaje de videojuego'],
    },
    examplesTitle: 'Ejemplos de diseños creados con Weë',
    /*
     * Vacío a propósito. Aquí había siete tarjetas que parecían diseños y eran
     * degradados de color con un emoji encima. Debajo de un muro con trabajos
     * reales de otras personas dejarían de ilustrar posibilidades para parecer
     * diseños falsos, justo en la sección donde la credibilidad visual lo es todo.
     * No se sustituyen por nada: el muro enseña lo que hay.
     */
    examples: [],
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
    /*
     * La cabecera nombra las tres cosas (fase 2E-52).
     *
     * Weë Studio reunió fotos, videos y look en 2E-50, pero el hero se quedó
     * diciendo «Convierte tus ideas en videos» y «No necesitas saber hacer videos»
     * justo encima de un selector cuya primera puerta es Fotos y cuya tercera es
     * Beauty. Era el primer texto de la sección desmintiendo lo que la sección
     * hace: quien venía a retocar una foto podía irse antes de abrir el selector.
     */
    headline: 'Crea fotos y videos con IA',
    intro: 'Cuéntame qué quieres crear y te ayudaré paso a paso.',
    chips: ['Fácil de usar', 'Resultados increíbles', 'Para todos'],
    // Vale para una foto, para un video y para un cambio de look.
    note: 'Ideas que se ven',
    heroEmoji: '🎬',
    gridTitle: '¿Qué quieres hacer hoy?',
    gridHint: 'Fotos, videos y cambios de look.',
    /*
     * Tres áreas, no veintiséis funciones (fase 2E-50) — y en dos niveles (2E-53).
     *
     * Weë Studio reúne lo que antes eran tres secciones. Aquí no se elige una
     * función: se elige de qué se va a hablar. Cada área abre la conversación de su
     * experiencia —que sigue existiendo entera, con sus plantillas, sus planes y sus
     * capacidades— y es allí donde se pregunta qué se quiere hacer: "¿Qué hacemos
     * con tu foto?" son las ocho de Photo, "¿Qué quieres probar?" las diez de Beauty
     * y "¿Qué tipo de video?" las cuatro de Studio.
     *
     * Por eso las tarjetas de función desaparecen del selector sin perder nada: ya
     * vivían como primera pregunta de cada flujo.
     *
     * Los dos niveles vienen de que la sección dice una sola cosa: crea fotos y
     * videos. Esos son los caminos principales; Beauty es una capacidad
     * especializada de ese mismo mundo, así que va debajo, en un renglón propio,
     * más pequeña pero a un toque. Ni compitiendo con el mensaje, ni escondida.
     */
    actionLayout: 'compact',
    actions: [
      { id: 'photos', icon: 'camera-outline', emoji: '📸', title: 'Fotos', subtitle: 'Crear, editar, mejorar y transformar fotos.', goal: 'Trabajar con una foto', opens: 'photo' },
      { id: 'videos', icon: 'videocam-outline', emoji: '🎬', title: 'Videos', subtitle: 'Crear videos, animar fotos y contenido para redes.', goal: 'Crear un video', opens: 'studio' },
      { id: 'beauty', icon: 'sparkles-outline', emoji: '💄', title: 'Beauty', subtitle: 'Maquillaje, cabello, rostro, ropa, uñas y cuidado personal.', goal: 'Probar un cambio de look', opens: 'beauty', secondary: true },
    ],
    // Weë Studio estrena muro después de Weë Chef y Weë Design (fase 2E-50).
    wall: {
      tabs: [
        { id: 'all', label: 'Muro Studio' },
        { id: 'tutorials', label: 'Cómo lo hicieron' },
        { id: 'saved', label: 'Guardados' },
      ],
      placeholder: 'Comparte una foto, un video o una pregunta…',
      empty: {
        emoji: '🎬',
        title: 'Todavía no hay nada en el muro de Weë Studio',
        text: 'Comparte tu primera foto, video o cambio de look con la comunidad.',
        button: 'Crear publicación',
      },
    },
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
      { id: 'content', icon: 'color-wand-outline', emoji: '✨', title: 'Crear contenido', subtitle: 'Imágenes, videos y textos con IA', goal: 'Crear contenido para las redes de mi negocio', preset: { questionId: 'what', optionId: 'content' } },
      { id: 'schedule', icon: 'calendar-outline', emoji: '📅', title: 'Programar publicaciones', subtitle: 'Elige fechas y horarios', goal: 'Programar las publicaciones de mi negocio', preset: { questionId: 'what', optionId: 'schedule' } },
      { id: 'publish', icon: 'paper-plane-outline', emoji: '🚀', title: 'Publicar automáticamente', subtitle: 'En todas tus redes', goal: 'Publicar automáticamente en mis redes', preset: { questionId: 'what', optionId: 'publish' } },
      { id: 'reply', icon: 'chatbubble-ellipses-outline', emoji: '💬', title: 'Responder clientes', subtitle: 'Mensajes, comentarios y consultas', goal: 'Responder a mis clientes', preset: { questionId: 'what', optionId: 'reply' } },
      { id: 'analyze', icon: 'bar-chart-outline', emoji: '📊', title: 'Analizar resultados', subtitle: 'Descubre qué funciona mejor', goal: 'Analizar los resultados de mi negocio', preset: { questionId: 'what', optionId: 'analyze' } },
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
    gridHint: 'Elige una opción y empieza a cocinar con Weë.',
    // Controles pequeños, sin fotografías: las siete funciones se recorren de un
    // vistazo y dejan la pantalla para lo que de verdad manda, que es el muro.
    actionLayout: 'compact',
    actions: [
      { id: 'recipe', icon: 'restaurant-outline', emoji: '🍲', title: 'Quiero una receta', subtitle: 'Dime qué se te antoja', goal: 'Quiero una receta', preset: { questionId: 'what', optionId: 'recipe' } },
      // El subtítulo dice qué foto hace falta: es lo único que aportaba el bloque
      // "¿Tienes una foto?", que repetía esta acción y la de retocar (fase 2E-40).
      { id: 'ingredients', icon: 'nutrition-outline', emoji: '🧊', title: 'Usar mis ingredientes', subtitle: 'Desde la foto de tu refrigerador', goal: 'Cocinar con los ingredientes que tengo en casa', preset: { questionId: 'what', optionId: 'cook' } },
      { id: 'menu', icon: 'list-outline', emoji: '📋', title: 'Crear un menú', subtitle: 'Para la semana o un evento', goal: 'Crear un menú', preset: { questionId: 'what', optionId: 'menu' } },
      { id: 'healthy', icon: 'leaf-outline', emoji: '🥗', title: 'Opciones saludables', subtitle: 'Rico y ligero', goal: 'Quiero opciones saludables para comer', preset: { questionId: 'what', optionId: 'healthy' } },
      { id: 'dessert', icon: 'ice-cream-outline', emoji: '🍰', title: 'Postres', subtitle: 'Fáciles y deliciosos', goal: 'Quiero un postre fácil', preset: { questionId: 'what', optionId: 'dessert' } },
      { id: 'edit', icon: 'camera-outline', emoji: '📸', title: 'Retocar mi foto', subtitle: 'Mejora la foto de tu plato', goal: 'Retocar la foto de mi plato', preset: { questionId: 'what', optionId: 'edit' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé qué cocinar', subtitle: 'Te propongo algo rico', goal: 'No sé qué cocinar hoy', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    // Chef acepta imágenes en dos de sus flujos (cocinar con lo que tengo y
    // retocar el plato), igual que Photo, Home y Beauty.
    inputs: ['text', 'upload', 'camera', 'voice'],
    idea: {
      title: '¡Hola! Soy Weë Chef 👨‍🍳',
      subtitle: 'Cuéntame, ¿qué te gustaría cocinar hoy?',
      placeholder: 'Escribe tu idea aquí…',
      chips: ['Quiero una cena rápida', 'Recetas con pollo', 'Algo saludable', 'Un postre fácil', 'Qué puedo hacer con esto'],
    },
    /*
     * Chef no tiene caja de subida propia. Sus dos rutas con foto —retocar el
     * plato y cocinar con lo que hay— son dos de las siete funciones, y cada una
     * dice en su subtítulo qué foto espera. El bloque "¿Tienes una foto?" que
     * hubo aquí las repetía palabra por palabra y se quitó en 2E-40: una acción,
     * un sitio. La foto se sigue pidiendo dentro de la conversación, como antes.
     */
    // Weë Chef es el piloto del muro social dentro de una sección (fase 2E-37).
    wall: {
      tabs: [
        { id: 'all', label: 'Muro Chef' },
        { id: 'images', label: 'Recetas' },
        { id: 'tutorials', label: 'Consejos' },
        { id: 'mine', label: 'Mis recetas' },
        { id: 'saved', label: 'Favoritos' },
      ],
      placeholder: 'Comparte tu plato, una receta o una pregunta…',
      empty: {
        emoji: '🍳',
        title: 'Todavía no hay nada en el muro de Weë Chef',
        text: 'Comparte tu primera receta, pregunta o experiencia con la comunidad.',
        button: 'Crear publicación',
      },
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
    /*
     * Las mismas siete intenciones que la conversación (fase 2E-60).
     *
     * Esta pantalla ya no se abre desde la navegación —a Hogar & Diseño se entra
     * por el selector de Weë Design—, pero mientras exista no puede enseñar una
     * lista distinta de la que existe: "Remodelar" era una octava puerta que
     * hacía lo mismo que rediseñar y se retiró en 2E-59. Su identificador sigue
     * resolviendo en la plantilla; lo que desaparece es el botón.
     */
    actions: [
      { id: 'design', icon: 'bed-outline', emoji: '🏠', title: 'Rediseñar mi espacio', subtitle: 'Muebles, colores y decoración nuevos, con tus mismas paredes.', goal: 'Diseñar un espacio de mi casa', preset: { questionId: 'what', optionId: 'design' } },
      { id: 'furniture', icon: 'cube-outline', emoji: '🪑', title: 'Cambiar o probar muebles', subtitle: 'Ve cómo quedan otros muebles sin tocar los acabados.', goal: 'Probar muebles nuevos en mi espacio', preset: { questionId: 'what', optionId: 'furniture' } },
      { id: 'colors', icon: 'color-palette-outline', emoji: '🎨', title: 'Cambiar estilo y colores', subtitle: 'Otra paleta y otros materiales, con tus mismos muebles.', goal: 'Cambiar los colores de mi espacio', preset: { questionId: 'what', optionId: 'colors' } },
      { id: 'layout', icon: 'grid-outline', emoji: '📐', title: 'Mejorar la distribución', subtitle: 'Los muebles que ya tienes, mejor puestos.', goal: 'Mejorar la distribución de mi espacio', preset: { questionId: 'what', optionId: 'layout' } },
      { id: 'garden', icon: 'leaf-outline', emoji: '🌿', title: 'Exterior y jardín', subtitle: 'Fachadas, terrazas, patios y jardines.', goal: 'Diseñar mi jardín o exterior', preset: { questionId: 'what', optionId: 'garden' } },
      { id: 'ideas', icon: 'bulb-outline', emoji: '💡', title: 'Buscar ideas', subtitle: 'Inspírate con estilos y tendencias.', goal: 'Buscar ideas para mi casa', preset: { questionId: 'what', optionId: 'ideas' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'No sé qué hacer', subtitle: 'Miro tu espacio y te propongo por dónde empezar.', goal: 'Renovar un espacio de mi casa', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
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
      { id: 'haircolor', icon: 'color-fill-outline', emoji: '🎨', title: 'Color de cabello', subtitle: 'Explora nuevos colores', goal: 'Probar otro color de cabello', preset: { questionId: 'what', optionId: 'haircolor' } },
      { id: 'beard', icon: 'man-outline', emoji: '🧔', title: 'Barba', subtitle: 'Estilos y cuidado', goal: 'Probar un estilo de barba', preset: { questionId: 'what', optionId: 'beard' } },
      { id: 'outfit', icon: 'shirt-outline', emoji: '👗', title: 'Ropa y outfits', subtitle: 'Combina tu estilo', goal: 'Probar un outfit', preset: { questionId: 'what', optionId: 'outfit' } },
      { id: 'nails', icon: 'hand-left-outline', emoji: '💅', title: 'Uñas', subtitle: 'Diseños y colores', goal: 'Probar un diseño de uñas', preset: { questionId: 'what', optionId: 'nails' } },
      { id: 'transform', icon: 'swap-horizontal-outline', emoji: '✨', title: 'Transformaciones', subtitle: 'Antes y después', goal: 'Probar un cambio de look completo', preset: { questionId: 'what', optionId: 'transform' } },
      { id: 'skin', icon: 'water-outline', emoji: '🧴', title: 'Cuidado de la piel', subtitle: 'Rutinas y consejos', goal: 'Consejos para el cuidado de mi piel', preset: { questionId: 'what', optionId: 'skin' } },
      { id: 'face', icon: 'scan-outline', emoji: '🪞', title: 'Estilo por rostro', subtitle: 'Encuentra tu estilo ideal', goal: 'Encontrar el estilo que mejor va con mi rostro', preset: { questionId: 'what', optionId: 'face' } },
      { id: 'accessories', icon: 'glasses-outline', emoji: '🕶️', title: 'Accesorios', subtitle: 'Completa tu look', goal: 'Probar accesorios para mi look', preset: { questionId: 'what', optionId: 'accessories' } },
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
  /*
   * Weë Travel (fase 2E-64C).
   *
   * Cuatro funciones y ni una más: planificar, elegir destino, qué hacer y cómo
   * moverse. La entrada principal NO es la cuadrícula sino la caja de escribir
   * —un viaje se cuenta con una frase, no eligiendo de un menú—, y por eso lleva
   * `ideaFirst`: el texto arriba, las cuatro funciones plegadas debajo y el muro
   * de la comunidad después.
   *
   * Lo que Weë Travel NO hace, y conviene decirlo aquí: no reserva vuelos, no
   * reserva hoteles, no cobra nada y no abre un mapa. Prepara el viaje; ir es
   * cosa de la persona.
   */
  travel: {
    id: 'travel',
    headline: 'Prepara tu viaje con alguien que ya ha viajado.',
    intro: 'Cuéntame a dónde vas —o que no lo sabes todavía— y te preparo el viaje: qué ver, dónde comer y cómo moverte.',
    chips: ['Sin reservas', 'Con fuentes', 'A tu ritmo'],
    note: 'Los mejores viajes empiezan con una frase',
    heroEmoji: '✈️',
    /*
     * El rótulo de la fila que despliega las funciones (fase 2E-69). Es la otra
     * puerta, debajo de la frase: quien ya sabe lo que quiere la abre y elige.
     * Sin `gridHint`, porque "cuatro formas de empezar" repetía en palabras lo
     * que se ve de un vistazo en cuanto la fila se abre.
     */
    gridTitle: '¿Qué quieres hacer?',
    /* La frase bajo el título cuando Travel está plegado: qué hay ahí dentro. */
    gridHint: 'Planifica, descubre, explora…',
    actionLayout: 'compact',
    actions: [
      { id: 'plan', icon: 'map-outline', emoji: '🗺️', title: 'Planificar un viaje', subtitle: 'Un itinerario día a día', goal: 'Planificar un viaje', preset: { questionId: 'what', optionId: 'plan' } },
      { id: 'where', icon: 'earth-outline', emoji: '🌎', title: 'No sé a dónde ir', subtitle: 'Te propongo tres destinos', goal: 'No sé a dónde viajar', preset: { questionId: 'what', optionId: 'where' }, idk: true },
      { id: 'doing', icon: 'restaurant-outline', emoji: '🍽️', title: 'Qué hacer y dónde comer', subtitle: 'Lo que merece la pena, con su fuente', goal: 'Qué hacer y dónde comer en mi destino', preset: { questionId: 'what', optionId: 'doing' } },
      { id: 'moving', icon: 'compass-outline', emoji: '🧭', title: 'Cómo moverme', subtitle: 'Tiempos y precios aproximados', goal: 'Cómo moverme en mi destino', preset: { questionId: 'what', optionId: 'moving' } },
    ],
    inputs: ['text'],
    /*
     * La caja de escribir va ARRIBA del todo, antes que las cuatro funciones.
     * Es la diferencia entre "elige una herramienta" y "cuéntame tu viaje", y en
     * viajes lo segundo es lo natural: casi todo lo que Weë necesita ya está
     * dentro de la frase que la persona escribiría igualmente.
     */
    ideaFirst: true,
    idea: {
      title: '✈️ ¿Qué viaje tienes en mente?',
      subtitle: 'Escríbelo con tus palabras: cuanto más me cuentes, menos te pregunto.',
      placeholder: 'Ejemplo: Japón del 12 al 22 de octubre, me gusta comer…',
      chips: ['🇯🇵 Japón en octubre', '🌴 Quiero una playa tranquila y barata', '🤷 No sé dónde viajar'],
    },
    wall: {
      /*
       * Sin pestañas (fase 2E-73). Weë Travel no tiene muro propio: enseña el
       * muro general de Weë, donde una publicación de viajes convive con una de
       * Studio o de Design. Travel es el contexto de una publicación —el
       * WeeTag—, no el sitio donde vive.
       */
      placeholder: 'Comparte un viaje, una recomendación o una pregunta…',
      empty: {
        emoji: '🧳',
        title: 'Todavía no hay nada en el muro de Weë Travel',
        text: 'Comparte tu último viaje, una recomendación o una duda con la comunidad.',
        button: 'Crear publicación',
      },
    },
    /*
     * Sin fila de ejemplos (fase 2E-69). "Viajes que preparó Weë" eran cuatro
     * tarjetas decorativas que no abrían ningún viaje real de nadie y se ponían
     * justo debajo del muro, compitiendo con lo único que ahí importa: lo que
     * publica la gente. En Travel el muro es el protagonista.
     */
  },

};

/** Orden de la barra lateral y de la pantalla de Weë Creator (referencias visuales). */
/**
 * El orden de las secciones en la barra lateral. Photo y Beauty ya no están:
 * se entra a ellas desde el selector de Weë Studio. Home tampoco, desde la fase
 * 2E-56: se entra por el de Weë Design, como Hogar & Diseño. Las tres
 * configuraciones siguen enteras más arriba, porque sus mesas de trabajo se
 * siguen usando.
 */
export const SPECIALIST_ORDER: SpecialistId[] = ['brain', 'design', 'music', 'studio', 'business', 'chef', 'writer', 'travel'];

export const getSpecialist = (id: string): (SpecialistConfig & { experience: WeeExperience }) | null => {
  const config = SPECIALISTS[id as SpecialistId];
  const experience = getExperienceById(id);
  if (!config || !experience) return null;
  return { ...config, experience };
};
