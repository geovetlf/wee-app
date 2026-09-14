/**
 * Configuración de cada especialista de Weë Creator (docs/CREATOR-BUILD.md,
 * referencias en design/references/). Alimenta las piezas compartidas
 * (hero, "¿Qué quieres hacer hoy?", caja de idea, subida de fotos, ejemplos)
 * y cada pantalla añade lo suyo (chat grande, editor, "Mis redes"…).
 *
 * AQUÍ NO HAY NI UNA FRASE, Y ES A PROPÓSITO.
 *
 * Este archivo guarda la ESTRUCTURA del catálogo —qué funciones hay, en qué
 * orden, con qué icono, qué respuesta deja contestada cada una, a dónde lleva—
 * y, donde antes había texto, guarda la CLAVE del texto: `chefAcMenuTitle` en
 * vez de "Crear un menú". Las palabras viven en `i18n/textos/<idioma>/catalogo.ts`
 * y las resuelve quien pinta, con el idioma de la persona.
 *
 * Se hace así porque este archivo se lee fuera de React —se importa, se recorre,
 * se compara— y ahí no hay traductor: llamar a `t()` al construir el objeto
 * congelaría el idioma del arranque y dejaría media pantalla en español al
 * cambiarlo. Con claves no hay nada que congelar.
 *
 * La puerta de salida es `traducirEspecialista(spec, t)` (o el hook
 * `useEspecialista`, que es lo que usan las pantallas): devuelve la misma
 * configuración con cada clave ya resuelta, así que los componentes siguen
 * leyendo `spec.headline` y `action.title` exactamente como antes.
 *
 * Lo que NUNCA es una clave: los identificadores (`photo`, `enhance`,
 * `optionId`, `opens`), los iconos, los emojis, `kind`, `tone` y las banderas.
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

/**
 * Una clave de `i18n/textos/<idioma>/catalogo.ts`, no el texto.
 *
 * Es un `string` como cualquier otro —TypeScript no distingue una clave de una
 * frase—, pero el nombre dice de qué se trata en cada propiedad y evita que
 * alguien escriba aquí una frase sin darse cuenta.
 */
export type ClaveDeTexto = string;

export interface SpecialistAction {
  id: string;
  /** Nombre de icono Ionicons (outline) que se dibuja en la tarjeta. */
  icon: string;
  /** Emoji para las tarjetas con imagen simulada y para móvil. */
  emoji: string;
  title: ClaveDeTexto;
  subtitle: ClaveDeTexto;
  /**
   * Objetivo con el que arranca la conversación guiada al tocar la acción.
   *
   * Va traducido porque es lo que la persona habría escrito con sus palabras:
   * acaba siendo el título del trabajo en "Tus creaciones", el del documento
   * guardado y lo que firma el resultado. Quién necesita foto NO se decide por
   * este texto sino por `preset.optionId` y por la experiencia, así que
   * traducirlo no cambia ningún camino.
   */
  goal: ClaveDeTexto;
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
  /**
   * La acción abre la PANTALLA de esa experiencia, no su conversación.
   *
   * Weë Writer entra en el selector de Weë Studio y deja de tener puerta propia
   * en el menú. Con `opens` a secas se abriría su conversación y se perdería lo
   * que solo vive en su pantalla: "Mis documentos", que es su historial de
   * textos. Con esta marca la tarjeta lleva a la pantalla de siempre —la misma
   * ruta a la que llevaba el menú—, así que la experiencia de Weë Writer llega
   * entera y sin una segunda implementación.
   *
   * Las tres áreas de Studio no la usan: fotos, videos y look sí entran por la
   * conversación, que es donde se les pregunta qué hacer.
   */
  opensSection?: boolean;
}

export type ExampleKind = 'beforeAfter' | 'image' | 'video' | 'audio' | 'document' | 'recipe';

export interface SpecialistExample {
  title: ClaveDeTexto;
  subtitle?: ClaveDeTexto;
  kind: ExampleKind;
  emoji: string;
  /** Dos colores para el degradado de la imagen simulada. */
  tone: [string, string];
  /** Duración (video/audio) o tiempo (receta) como lo diría la tarjeta. */
  meta?: ClaveDeTexto;
}

export interface SpecialistConfig {
  id: SpecialistId;
  /** Frase grande del hero. */
  headline: ClaveDeTexto;
  /** Texto corto debajo del headline. */
  intro: ClaveDeTexto;
  /** Tres o cuatro sellos: "Fácil de usar", "Para todos"… */
  chips: ClaveDeTexto[];
  /** Frase manuscrita de la referencia. */
  note: ClaveDeTexto;
  /** Emoji grande de la ilustración del hero. */
  heroEmoji: string;
  gridTitle: ClaveDeTexto;
  /** Frase corta a la derecha del título ("Elige una opción y empieza…"). */
  gridHint?: ClaveDeTexto;
  actionLayout: ActionLayout;
  actions: SpecialistAction[];
  inputs: InputMode[];
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
    title: ClaveDeTexto;
    subtitle: ClaveDeTexto;
    placeholder: ClaveDeTexto;
    chips: ClaveDeTexto[];
    /** Texto del botón cuando hay uno (Studio: "Empezar"). */
    button?: ClaveDeTexto;
  };
  /** Caja de subida de foto (Photo, Home, Beauty, Chef). */
  upload?: {
    title: ClaveDeTexto;
    subtitle: ClaveDeTexto;
    hint: ClaveDeTexto;
    button?: ClaveDeTexto;
  };
  /*
   * La fila de ejemplos bajo el muro. Es opcional desde 2E-69: una sección puede
   * no tener nada que enseñar ahí, y entonces no enseña nada. Weë Travel tenía
   * "Viajes que preparó Weë" con cuatro tarjetas que no llevaban a ningún viaje
   * de nadie —eran decorado— y competían con lo que sí publica la gente.
   */
  examplesTitle?: ClaveDeTexto;
  examples?: SpecialistExample[];
  /** Franja final con una invitación ("¿No sabes por dónde empezar?"). */
  closing?: {
    title: ClaveDeTexto;
    subtitle: ClaveDeTexto;
    button: ClaveDeTexto;
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
    headline: 'brainHeadline',
    intro: 'brainIntro',
    chips: ['brainChip1', 'brainChip2', 'brainChip3', 'brainChip4', 'brainChip5', 'brainChip6'],
    note: 'brainNote',
    heroEmoji: '🤖',
    gridTitle: 'brainGridTitle',
    actionLayout: 'tiles',
    actions: [
      { id: 'idea', icon: 'bulb-outline', emoji: '💡', title: 'brainAcIdeaTitle', subtitle: 'brainAcIdeaSubtitle', goal: 'brainAcIdeaGoal', preset: { questionId: 'what', optionId: 'plan' } },
      { id: 'know', icon: 'help-circle-outline', emoji: '❓', title: 'brainAcKnowTitle', subtitle: 'brainAcKnowSubtitle', goal: 'brainAcKnowGoal', preset: { questionId: 'what', optionId: 'learn' } },
      { id: 'document', icon: 'document-text-outline', emoji: '📄', title: 'brainAcDocumentTitle', subtitle: 'brainAcDocumentSubtitle', goal: 'brainAcDocumentGoal', preset: { questionId: 'what', optionId: 'translate' } },
      { id: 'learn', icon: 'school-outline', emoji: '🎓', title: 'brainAcLearnTitle', subtitle: 'brainAcLearnSubtitle', goal: 'brainAcLearnGoal', preset: { questionId: 'what', optionId: 'learn' } },
      { id: 'research', icon: 'search-outline', emoji: '🔎', title: 'brainAcResearchTitle', subtitle: 'brainAcResearchSubtitle', goal: 'brainAcResearchGoal', preset: { questionId: 'what', optionId: 'learn' } },
      { id: 'problem', icon: 'extension-puzzle-outline', emoji: '🧩', title: 'brainAcProblemTitle', subtitle: 'brainAcProblemSubtitle', goal: 'brainAcProblemGoal', preset: { questionId: 'what', optionId: 'solve' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'brainAcIdkTitle', subtitle: 'brainAcIdkSubtitle', goal: 'brainAcIdkGoal', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'attach', 'voice', 'web'],
    idea: {
      title: 'brainIdeaTitle',
      subtitle: 'brainIdeaSubtitle',
      placeholder: 'brainIdeaPlaceholder',
      chips: ['brainIdeaChip1', 'brainIdeaChip2', 'brainIdeaChip3'],
    },
    examplesTitle: 'brainExamplesTitle',
    examples: [
      { title: 'brainEj1Title', subtitle: 'brainEj1Subtitle', kind: 'document', emoji: '💬', tone: T.yellow },
      { title: 'brainEj2Title', subtitle: 'brainEj2Subtitle', kind: 'document', emoji: '🧭', tone: T.sky },
      { title: 'brainEj3Title', subtitle: 'brainEj3Subtitle', kind: 'document', emoji: '✨', tone: T.mint },
    ],
  },

  design: {
    id: 'design',
    headline: 'designHeadline',
    intro: 'designIntro',
    chips: ['designChip1', 'designChip2', 'designChip3'],
    note: 'designNote',
    heroEmoji: '🏎️',
    gridTitle: 'designGridTitle',
    gridHint: 'designGridHint',
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
      { id: 'brand', icon: 'text-outline', emoji: '🔤', title: 'designAcBrandTitle', subtitle: 'designAcBrandSubtitle', goal: 'designAcBrandGoal', preset: { questionId: 'what', optionId: 'logo' } },
      { id: 'social', icon: 'megaphone-outline', emoji: '🪧', title: 'designAcSocialTitle', subtitle: 'designAcSocialSubtitle', goal: 'designAcSocialGoal', preset: { questionId: 'what', optionId: 'poster' } },
      { id: 'product', icon: 'cube-outline', emoji: '📦', title: 'designAcProductTitle', subtitle: 'designAcProductSubtitle', goal: 'designAcProductGoal', preset: { questionId: 'what', optionId: 'product' } },
      { id: 'machine', icon: 'car-sport-outline', emoji: '🏎️', title: 'designAcMachineTitle', subtitle: 'designAcMachineSubtitle', goal: 'designAcMachineGoal', preset: { questionId: 'what', optionId: 'object' } },
      { id: 'place', icon: 'business-outline', emoji: '🏙️', title: 'designAcPlaceTitle', subtitle: 'designAcPlaceSubtitle', goal: 'designAcPlaceGoal', preset: { questionId: 'what', optionId: 'scene' } },
      /*
       * Hogar & Diseño va aquí, al lado de su vecino conceptual, aunque se dibuje
       * abajo: `secondary` decide dónde se pinta, no el orden de esta lista.
       *
       * Y va separada de "Un lugar o un escenario" por lo que hace, no por el
       * sustantivo que comparten: una imagina un lugar desde cero, la otra trabaja
       * sobre la foto del espacio que ya tienes conservando paredes y ventanas.
       * Por dentro sigue siendo la experiencia `home`, entera.
       */
      { id: 'home', icon: 'home-outline', emoji: '🏠', title: 'designAcHomeTitle', subtitle: 'designAcHomeSubtitle', goal: 'designAcHomeGoal', opens: 'home', secondary: true },
      { id: 'character', icon: 'happy-outline', emoji: '🧑‍🚀', title: 'designAcCharacterTitle', subtitle: 'designAcCharacterSubtitle', goal: 'designAcCharacterGoal', preset: { questionId: 'what', optionId: 'character' } },
      // Sin respuesta previa a propósito: la primera pregunta del flujo es justo
      // "¿Qué quieres diseñar?", que es la ayuda que necesita quien no lo tiene claro.
      { id: 'idk', icon: 'bulb-outline', emoji: '💡', title: 'designAcIdkTitle', subtitle: 'designAcIdkSubtitle', goal: 'designAcIdkGoal', idk: true },
    ],
    inputs: ['text'],
    // Weë Design estrena el muro social después de Weë Chef (fase 2E-43).
    idea: {
      title: 'designIdeaTitle',
      subtitle: 'designIdeaSubtitle',
      placeholder: 'designIdeaPlaceholder',
      chips: ['designIdeaChip1', 'designIdeaChip2', 'designIdeaChip3', 'designIdeaChip4', 'designIdeaChip5', 'designIdeaChip6'],
    },
    examplesTitle: 'designExamplesTitle',
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
    headline: 'photoHeadline',
    intro: 'photoIntro',
    chips: ['photoChip1', 'photoChip2', 'photoChip3'],
    note: 'photoNote',
    heroEmoji: '📸',
    gridTitle: 'photoGridTitle',
    actionLayout: 'tiles',
    actions: [
      { id: 'enhance', icon: 'image-outline', emoji: '✨', title: 'photoAcEnhanceTitle', subtitle: 'photoAcEnhanceSubtitle', goal: 'photoAcEnhanceGoal', preset: { questionId: 'action', optionId: 'enhance' } },
      { id: 'remove', icon: 'cut-outline', emoji: '🧽', title: 'photoAcRemoveTitle', subtitle: 'photoAcRemoveSubtitle', goal: 'photoAcRemoveGoal', preset: { questionId: 'action', optionId: 'remove' } },
      { id: 'background', icon: 'images-outline', emoji: '🪄', title: 'photoAcBackgroundTitle', subtitle: 'photoAcBackgroundSubtitle', goal: 'photoAcBackgroundGoal', preset: { questionId: 'action', optionId: 'background' } },
      { id: 'restore', icon: 'time-outline', emoji: '🕰️', title: 'photoAcRestoreTitle', subtitle: 'photoAcRestoreSubtitle', goal: 'photoAcRestoreGoal', preset: { questionId: 'action', optionId: 'restore' } },
      { id: 'transform', icon: 'sparkles-outline', emoji: '🎇', title: 'photoAcTransformTitle', subtitle: 'photoAcTransformSubtitle', goal: 'photoAcTransformGoal', preset: { questionId: 'action', optionId: 'transform' } },
      { id: 'retouch', icon: 'happy-outline', emoji: '🙂', title: 'photoAcRetouchTitle', subtitle: 'photoAcRetouchSubtitle', goal: 'photoAcRetouchGoal', preset: { questionId: 'action', optionId: 'retouch' } },
      { id: 'style', icon: 'color-palette-outline', emoji: '🎞️', title: 'photoAcStyleTitle', subtitle: 'photoAcStyleSubtitle', goal: 'photoAcStyleGoal', preset: { questionId: 'action', optionId: 'transform' } },
      { id: 'colorize', icon: 'color-filter-outline', emoji: '🌈', title: 'photoAcColorizeTitle', subtitle: 'photoAcColorizeSubtitle', goal: 'photoAcColorizeGoal', preset: { questionId: 'action', optionId: 'colorize' } },
      { id: 'generate', icon: 'add-circle-outline', emoji: '🖼️', title: 'photoAcGenerateTitle', subtitle: 'photoAcGenerateSubtitle', goal: 'photoAcGenerateGoal', preset: { questionId: 'action', optionId: 'generate' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'photoAcIdkTitle', subtitle: 'photoAcIdkSubtitle', goal: 'photoAcIdkGoal', preset: { questionId: 'action', optionId: 'idk' }, idk: true },
    ],
    inputs: ['upload', 'camera', 'text'],
    upload: {
      title: 'photoUploadTitle',
      subtitle: 'photoUploadSubtitle',
      hint: 'photoUploadHint',
    },
    idea: {
      title: 'photoIdeaTitle',
      subtitle: 'photoIdeaSubtitle',
      placeholder: 'photoIdeaPlaceholder',
      chips: ['photoIdeaChip1', 'photoIdeaChip2', 'photoIdeaChip3'],
    },
    examplesTitle: 'photoExamplesTitle',
    examples: [
      { title: 'photoEj1Title', kind: 'beforeAfter', emoji: '🏔️', tone: T.sky },
      { title: 'photoEj2Title', kind: 'beforeAfter', emoji: '🏖️', tone: T.yellow },
      { title: 'photoEj3Title', kind: 'beforeAfter', emoji: '🛋️', tone: T.sand },
      { title: 'photoEj4Title', kind: 'beforeAfter', emoji: '🕰️', tone: T.slate },
      { title: 'photoEj5Title', kind: 'beforeAfter', emoji: '🙂', tone: T.rose },
      { title: 'photoEj6Title', kind: 'beforeAfter', emoji: '🎨', tone: T.plum },
    ],
  },

  music: {
    id: 'music',
    headline: 'musicHeadline',
    intro: 'musicIntro',
    chips: ['musicChip1', 'musicChip2', 'musicChip3'],
    note: 'musicNote',
    heroEmoji: '🎧',
    gridTitle: 'musicGridTitle',
    actionLayout: 'tiles',
    actions: [
      { id: 'song', icon: 'musical-notes-outline', emoji: '🎤', title: 'musicAcSongTitle', subtitle: 'musicAcSongSubtitle', goal: 'musicAcSongGoal', preset: { questionId: 'what', optionId: 'song' } },
      { id: 'musicvideo', icon: 'videocam-outline', emoji: '🎬', title: 'musicAcMusicvideoTitle', subtitle: 'musicAcMusicvideoSubtitle', goal: 'musicAcMusicvideoGoal', preset: { questionId: 'what', optionId: 'video' } },
      { id: 'voice', icon: 'mic-outline', emoji: '🗣️', title: 'musicAcVoiceTitle', subtitle: 'musicAcVoiceSubtitle', goal: 'musicAcVoiceGoal', preset: { questionId: 'what', optionId: 'voice' } },
      { id: 'beat', icon: 'pulse-outline', emoji: '🥁', title: 'musicAcBeatTitle', subtitle: 'musicAcBeatSubtitle', goal: 'musicAcBeatGoal', preset: { questionId: 'what', optionId: 'instrumental' } },
      { id: 'lyrics', icon: 'document-text-outline', emoji: '📝', title: 'musicAcLyricsTitle', subtitle: 'musicAcLyricsSubtitle', goal: 'musicAcLyricsGoal', preset: { questionId: 'what', optionId: 'lyrics' } },
      { id: 'mix', icon: 'options-outline', emoji: '🎚️', title: 'musicAcMixTitle', subtitle: 'musicAcMixSubtitle', goal: 'musicAcMixGoal', preset: { questionId: 'what', optionId: 'mix' } },
      { id: 'clip', icon: 'film-outline', emoji: '🎞️', title: 'musicAcClipTitle', subtitle: 'musicAcClipSubtitle', goal: 'musicAcClipGoal', preset: { questionId: 'what', optionId: 'video' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'musicAcIdkTitle', subtitle: 'musicAcIdkSubtitle', goal: 'musicAcIdkGoal', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'voice'],
    idea: {
      title: 'musicIdeaTitle',
      subtitle: 'musicIdeaSubtitle',
      placeholder: 'musicIdeaPlaceholder',
      chips: ['musicIdeaChip1', 'musicIdeaChip2', 'musicIdeaChip3', 'musicIdeaChip4'],
    },
    examplesTitle: 'musicExamplesTitle',
    examples: [
      { title: 'musicEj1Title', subtitle: 'musicEj1Subtitle', kind: 'video', emoji: '🎤', tone: T.plum, meta: 'musicEj1Meta' },
      { title: 'musicEj2Title', subtitle: 'musicEj2Subtitle', kind: 'video', emoji: '🕶️', tone: T.night, meta: 'musicEj2Meta' },
      { title: 'musicEj3Title', subtitle: 'musicEj3Subtitle', kind: 'video', emoji: '🪽', tone: T.slate, meta: 'musicEj3Meta' },
      { title: 'musicEj4Title', subtitle: 'musicEj4Subtitle', kind: 'video', emoji: '🍽️', tone: T.coral, meta: 'musicEj4Meta' },
      { title: 'musicEj5Title', subtitle: 'musicEj5Subtitle', kind: 'video', emoji: '🌅', tone: T.yellow, meta: 'musicEj5Meta' },
      { title: 'musicEj6Title', subtitle: 'musicEj6Subtitle', kind: 'video', emoji: '🌆', tone: T.sky, meta: 'musicEj6Meta' },
    ],
    closing: {
      title: 'musicClosingTitle',
      subtitle: 'musicClosingSubtitle',
      button: 'musicClosingButton',
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
    headline: 'studioHeadline',
    intro: 'studioIntro',
    chips: ['studioChip1', 'studioChip2', 'studioChip3'],
    // Vale para una foto, para un video y para un cambio de look.
    note: 'studioNote',
    heroEmoji: '🎬',
    gridTitle: 'studioGridTitle',
    /* Cuatro cosas desde que Weë Writer entró aquí: la línea las nombra todas. */
    gridHint: 'studioGridHint',
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
      { id: 'photos', icon: 'camera-outline', emoji: '📸', title: 'studioAcPhotosTitle', subtitle: 'studioAcPhotosSubtitle', goal: 'studioAcPhotosGoal', opens: 'photo' },
      { id: 'videos', icon: 'videocam-outline', emoji: '🎬', title: 'studioAcVideosTitle', subtitle: 'studioAcVideosSubtitle', goal: 'studioAcVideosGoal', opens: 'studio' },
      { id: 'beauty', icon: 'sparkles-outline', emoji: '💄', title: 'studioAcBeautyTitle', subtitle: 'studioAcBeautySubtitle', goal: 'studioAcBeautyGoal', opens: 'beauty', secondary: true },
      /*
       * Weë Writer, la cuarta. Va en el renglón secundario con Beauty: Studio
       * dice primero "crea fotos y videos", y escribir es una capacidad
       * especializada de ese mismo mundo —el guion del video, el pie de la
       * foto—, no uno de los dos caminos principales.
       *
       * `opensSection` la lleva a la PANTALLA de Weë Writer, la de siempre, con
       * su cuadrícula y su "Mis documentos". Ni se duplica ni se reimplementa
       * nada: es la misma ruta a la que llevaba el menú.
       */
      { id: 'writer', icon: 'create-outline', emoji: '✍️', title: 'studioAcWriterTitle', subtitle: 'studioAcWriterSubtitle', goal: 'studioAcWriterGoal', opens: 'writer', opensSection: true, secondary: true },
    ],
    // Weë Studio estrena muro después de Weë Chef y Weë Design (fase 2E-50).
    inputs: ['text', 'upload'],
    idea: {
      title: 'studioIdeaTitle',
      subtitle: 'studioIdeaSubtitle',
      placeholder: 'studioIdeaPlaceholder',
      chips: ['studioIdeaChip1', 'studioIdeaChip2', 'studioIdeaChip3', 'studioIdeaChip4', 'studioIdeaChip5'],
      button: 'studioIdeaButton',
    },
    examplesTitle: 'studioExamplesTitle',
    examples: [
      { title: 'studioEj1Title', kind: 'video', emoji: '🍔', tone: T.coral, meta: 'studioEj1Meta' },
      { title: 'studioEj2Title', kind: 'video', emoji: '🏞️', tone: T.sky, meta: 'studioEj2Meta' },
      { title: 'studioEj3Title', kind: 'video', emoji: '🧴', tone: T.sand, meta: 'studioEj3Meta' },
      { title: 'studioEj4Title', kind: 'video', emoji: '💪', tone: T.slate, meta: 'studioEj4Meta' },
      { title: 'studioEj5Title', kind: 'video', emoji: '🧒', tone: T.yellow, meta: 'studioEj5Meta' },
      { title: 'studioEj6Title', kind: 'video', emoji: '🐶', tone: T.mint, meta: 'studioEj6Meta' },
    ],
  },

  business: {
    id: 'business',
    headline: 'businessHeadline',
    intro: 'businessIntro',
    chips: ['businessChip1', 'businessChip2', 'businessChip3'],
    note: 'businessNote',
    heroEmoji: '💼',
    gridTitle: 'businessGridTitle',
    actionLayout: 'tiles',
    actions: [
      { id: 'content', icon: 'color-wand-outline', emoji: '✨', title: 'businessAcContentTitle', subtitle: 'businessAcContentSubtitle', goal: 'businessAcContentGoal', preset: { questionId: 'what', optionId: 'content' } },
      { id: 'schedule', icon: 'calendar-outline', emoji: '📅', title: 'businessAcScheduleTitle', subtitle: 'businessAcScheduleSubtitle', goal: 'businessAcScheduleGoal', preset: { questionId: 'what', optionId: 'schedule' } },
      { id: 'publish', icon: 'paper-plane-outline', emoji: '🚀', title: 'businessAcPublishTitle', subtitle: 'businessAcPublishSubtitle', goal: 'businessAcPublishGoal', preset: { questionId: 'what', optionId: 'publish' } },
      { id: 'reply', icon: 'chatbubble-ellipses-outline', emoji: '💬', title: 'businessAcReplyTitle', subtitle: 'businessAcReplySubtitle', goal: 'businessAcReplyGoal', preset: { questionId: 'what', optionId: 'reply' } },
      { id: 'analyze', icon: 'bar-chart-outline', emoji: '📊', title: 'businessAcAnalyzeTitle', subtitle: 'businessAcAnalyzeSubtitle', goal: 'businessAcAnalyzeGoal', preset: { questionId: 'what', optionId: 'analyze' } },
      { id: 'strategy', icon: 'bulb-outline', emoji: '💡', title: 'businessAcStrategyTitle', subtitle: 'businessAcStrategySubtitle', goal: 'businessAcStrategyGoal', preset: { questionId: 'what', optionId: 'idea' } },
    ],
    inputs: ['text', 'attach'],
    idea: {
      title: 'businessIdeaTitle',
      subtitle: 'businessIdeaSubtitle',
      placeholder: 'businessIdeaPlaceholder',
      chips: ['businessIdeaChip1', 'businessIdeaChip2', 'businessIdeaChip3', 'businessIdeaChip4'],
      button: 'businessIdeaButton',
    },
    examplesTitle: 'businessExamplesTitle',
    examples: [
      { title: 'businessEj1Title', subtitle: 'businessEj1Subtitle', kind: 'document', emoji: '📝', tone: T.yellow, meta: 'businessEj1Meta' },
      { title: 'businessEj2Title', subtitle: 'businessEj2Subtitle', kind: 'document', emoji: '👀', tone: T.sky, meta: 'businessEj2Meta' },
      { title: 'businessEj3Title', subtitle: 'businessEj3Subtitle', kind: 'document', emoji: '💬', tone: T.mint, meta: 'businessEj3Meta' },
      { title: 'businessEj4Title', subtitle: 'businessEj4Subtitle', kind: 'document', emoji: '📩', tone: T.coral, meta: 'businessEj4Meta' },
    ],
  },

  chef: {
    id: 'chef',
    headline: 'chefHeadline',
    intro: 'chefIntro',
    chips: ['chefChip1', 'chefChip2', 'chefChip3'],
    note: 'chefNote',
    heroEmoji: '🍝',
    gridTitle: 'chefGridTitle',
    gridHint: 'chefGridHint',
    // Controles pequeños, sin fotografías: las siete funciones se recorren de un
    // vistazo y dejan la pantalla para lo que de verdad manda, que es el muro.
    actionLayout: 'compact',
    actions: [
      { id: 'recipe', icon: 'restaurant-outline', emoji: '🍲', title: 'chefAcRecipeTitle', subtitle: 'chefAcRecipeSubtitle', goal: 'chefAcRecipeGoal', preset: { questionId: 'what', optionId: 'recipe' } },
      // El subtítulo dice qué foto hace falta: es lo único que aportaba el bloque
      // "¿Tienes una foto?", que repetía esta acción y la de retocar (fase 2E-40).
      { id: 'ingredients', icon: 'nutrition-outline', emoji: '🧊', title: 'chefAcIngredientsTitle', subtitle: 'chefAcIngredientsSubtitle', goal: 'chefAcIngredientsGoal', preset: { questionId: 'what', optionId: 'cook' } },
      { id: 'menu', icon: 'list-outline', emoji: '📋', title: 'chefAcMenuTitle', subtitle: 'chefAcMenuSubtitle', goal: 'chefAcMenuGoal', preset: { questionId: 'what', optionId: 'menu' } },
      { id: 'healthy', icon: 'leaf-outline', emoji: '🥗', title: 'chefAcHealthyTitle', subtitle: 'chefAcHealthySubtitle', goal: 'chefAcHealthyGoal', preset: { questionId: 'what', optionId: 'healthy' } },
      { id: 'dessert', icon: 'ice-cream-outline', emoji: '🍰', title: 'chefAcDessertTitle', subtitle: 'chefAcDessertSubtitle', goal: 'chefAcDessertGoal', preset: { questionId: 'what', optionId: 'dessert' } },
      { id: 'edit', icon: 'camera-outline', emoji: '📸', title: 'chefAcEditTitle', subtitle: 'chefAcEditSubtitle', goal: 'chefAcEditGoal', preset: { questionId: 'what', optionId: 'edit' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'chefAcIdkTitle', subtitle: 'chefAcIdkSubtitle', goal: 'chefAcIdkGoal', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    // Chef acepta imágenes en dos de sus flujos (cocinar con lo que tengo y
    // retocar el plato), igual que Photo, Home y Beauty.
    inputs: ['text', 'upload', 'camera', 'voice'],
    idea: {
      title: 'chefIdeaTitle',
      subtitle: 'chefIdeaSubtitle',
      placeholder: 'chefIdeaPlaceholder',
      chips: ['chefIdeaChip1', 'chefIdeaChip2', 'chefIdeaChip3', 'chefIdeaChip4', 'chefIdeaChip5'],
    },
    /*
     * Chef no tiene caja de subida propia. Sus dos rutas con foto —retocar el
     * plato y cocinar con lo que hay— son dos de las siete funciones, y cada una
     * dice en su subtítulo qué foto espera. El bloque "¿Tienes una foto?" que
     * hubo aquí las repetía palabra por palabra y se quitó en 2E-40: una acción,
     * un sitio. La foto se sigue pidiendo dentro de la conversación, como antes.
     */
    // Weë Chef es el piloto del muro social dentro de una sección (fase 2E-37).
    examplesTitle: 'chefExamplesTitle',
    examples: [
      { title: 'chefEj1Title', subtitle: 'chefEj1Subtitle', kind: 'recipe', emoji: '🍝', tone: T.yellow, meta: 'chefEj1Meta' },
      { title: 'chefEj2Title', subtitle: 'chefEj2Subtitle', kind: 'recipe', emoji: '🥗', tone: T.mint, meta: 'chefEj2Meta' },
      { title: 'chefEj3Title', subtitle: 'chefEj3Subtitle', kind: 'recipe', emoji: '🍔', tone: T.coral, meta: 'chefEj3Meta' },
      { title: 'chefEj4Title', subtitle: 'chefEj4Subtitle', kind: 'recipe', emoji: '🥘', tone: T.sand, meta: 'chefEj4Meta' },
      { title: 'chefEj5Title', subtitle: 'chefEj5Subtitle', kind: 'recipe', emoji: '🍫', tone: T.slate, meta: 'chefEj5Meta' },
    ],
  },

  home: {
    id: 'home',
    headline: 'homeHeadline',
    intro: 'homeIntro',
    chips: ['homeChip1', 'homeChip2', 'homeChip3'],
    note: 'homeNote',
    heroEmoji: '🛋️',
    gridTitle: 'homeGridTitle',
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
      { id: 'design', icon: 'bed-outline', emoji: '🏠', title: 'homeAcDesignTitle', subtitle: 'homeAcDesignSubtitle', goal: 'homeAcDesignGoal', preset: { questionId: 'what', optionId: 'design' } },
      { id: 'furniture', icon: 'cube-outline', emoji: '🪑', title: 'homeAcFurnitureTitle', subtitle: 'homeAcFurnitureSubtitle', goal: 'homeAcFurnitureGoal', preset: { questionId: 'what', optionId: 'furniture' } },
      { id: 'colors', icon: 'color-palette-outline', emoji: '🎨', title: 'homeAcColorsTitle', subtitle: 'homeAcColorsSubtitle', goal: 'homeAcColorsGoal', preset: { questionId: 'what', optionId: 'colors' } },
      { id: 'layout', icon: 'grid-outline', emoji: '📐', title: 'homeAcLayoutTitle', subtitle: 'homeAcLayoutSubtitle', goal: 'homeAcLayoutGoal', preset: { questionId: 'what', optionId: 'layout' } },
      { id: 'garden', icon: 'leaf-outline', emoji: '🌿', title: 'homeAcGardenTitle', subtitle: 'homeAcGardenSubtitle', goal: 'homeAcGardenGoal', preset: { questionId: 'what', optionId: 'garden' } },
      { id: 'ideas', icon: 'bulb-outline', emoji: '💡', title: 'homeAcIdeasTitle', subtitle: 'homeAcIdeasSubtitle', goal: 'homeAcIdeasGoal', preset: { questionId: 'what', optionId: 'ideas' } },
      { id: 'idk', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'homeAcIdkTitle', subtitle: 'homeAcIdkSubtitle', goal: 'homeAcIdkGoal', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['upload', 'text'],
    upload: {
      title: 'homeUploadTitle',
      subtitle: 'homeUploadSubtitle',
      hint: 'homeUploadHint',
      button: 'homeUploadButton',
    },
    idea: {
      title: 'homeIdeaTitle',
      subtitle: 'homeIdeaSubtitle',
      placeholder: 'homeIdeaPlaceholder',
      chips: ['homeIdeaChip1', 'homeIdeaChip2', 'homeIdeaChip3'],
    },
    examplesTitle: 'homeExamplesTitle',
    examples: [
      { title: 'homeEj1Title', kind: 'image', emoji: '🛋️', tone: T.sand },
      { title: 'homeEj2Title', kind: 'image', emoji: '🍳', tone: T.yellow },
      { title: 'homeEj3Title', kind: 'image', emoji: '🛏️', tone: T.rose },
      { title: 'homeEj4Title', kind: 'image', emoji: '🛁', tone: T.sky },
      { title: 'homeEj5Title', kind: 'image', emoji: '🌿', tone: T.mint },
      { title: 'homeEj6Title', kind: 'image', emoji: '◻️', tone: T.slate },
    ],
    closing: {
      title: 'homeClosingTitle',
      subtitle: 'homeClosingSubtitle',
      button: 'homeClosingButton',
    },
  },

  beauty: {
    id: 'beauty',
    headline: 'beautyHeadline',
    intro: 'beautyIntro',
    chips: ['beautyChip1', 'beautyChip2', 'beautyChip3', 'beautyChip4'],
    note: 'beautyNote',
    heroEmoji: '💄',
    gridTitle: 'beautyGridTitle',
    actionLayout: 'images',
    actions: [
      { id: 'makeup', icon: 'color-palette-outline', emoji: '💄', title: 'beautyAcMakeupTitle', subtitle: 'beautyAcMakeupSubtitle', goal: 'beautyAcMakeupGoal', preset: { questionId: 'what', optionId: 'makeup' } },
      { id: 'hair', icon: 'cut-outline', emoji: '💇', title: 'beautyAcHairTitle', subtitle: 'beautyAcHairSubtitle', goal: 'beautyAcHairGoal', preset: { questionId: 'what', optionId: 'hair' } },
      { id: 'haircolor', icon: 'color-fill-outline', emoji: '🎨', title: 'beautyAcHaircolorTitle', subtitle: 'beautyAcHaircolorSubtitle', goal: 'beautyAcHaircolorGoal', preset: { questionId: 'what', optionId: 'haircolor' } },
      { id: 'beard', icon: 'man-outline', emoji: '🧔', title: 'beautyAcBeardTitle', subtitle: 'beautyAcBeardSubtitle', goal: 'beautyAcBeardGoal', preset: { questionId: 'what', optionId: 'beard' } },
      { id: 'outfit', icon: 'shirt-outline', emoji: '👗', title: 'beautyAcOutfitTitle', subtitle: 'beautyAcOutfitSubtitle', goal: 'beautyAcOutfitGoal', preset: { questionId: 'what', optionId: 'outfit' } },
      { id: 'nails', icon: 'hand-left-outline', emoji: '💅', title: 'beautyAcNailsTitle', subtitle: 'beautyAcNailsSubtitle', goal: 'beautyAcNailsGoal', preset: { questionId: 'what', optionId: 'nails' } },
      { id: 'transform', icon: 'swap-horizontal-outline', emoji: '✨', title: 'beautyAcTransformTitle', subtitle: 'beautyAcTransformSubtitle', goal: 'beautyAcTransformGoal', preset: { questionId: 'what', optionId: 'transform' } },
      { id: 'skin', icon: 'water-outline', emoji: '🧴', title: 'beautyAcSkinTitle', subtitle: 'beautyAcSkinSubtitle', goal: 'beautyAcSkinGoal', preset: { questionId: 'what', optionId: 'skin' } },
      { id: 'face', icon: 'scan-outline', emoji: '🪞', title: 'beautyAcFaceTitle', subtitle: 'beautyAcFaceSubtitle', goal: 'beautyAcFaceGoal', preset: { questionId: 'what', optionId: 'face' } },
      { id: 'accessories', icon: 'glasses-outline', emoji: '🕶️', title: 'beautyAcAccessoriesTitle', subtitle: 'beautyAcAccessoriesSubtitle', goal: 'beautyAcAccessoriesGoal', preset: { questionId: 'what', optionId: 'accessories' } },
    ],
    inputs: ['upload', 'camera', 'voice', 'text'],
    upload: {
      title: 'beautyUploadTitle',
      subtitle: 'beautyUploadSubtitle',
      hint: 'beautyUploadHint',
      button: 'beautyUploadButton',
    },
    idea: {
      title: 'beautyIdeaTitle',
      subtitle: 'beautyIdeaSubtitle',
      placeholder: 'beautyIdeaPlaceholder',
      chips: ['beautyIdeaChip1', 'beautyIdeaChip2', 'beautyIdeaChip3'],
    },
    examplesTitle: 'beautyExamplesTitle',
    examples: [
      { title: 'beautyEj1Title', subtitle: 'beautyEj1Subtitle', kind: 'image', emoji: '🌤️', tone: T.sand },
      { title: 'beautyEj2Title', subtitle: 'beautyEj2Subtitle', kind: 'image', emoji: '🌙', tone: T.night },
      { title: 'beautyEj3Title', subtitle: 'beautyEj3Subtitle', kind: 'image', emoji: '👱', tone: T.yellow },
      { title: 'beautyEj4Title', subtitle: 'beautyEj4Subtitle', kind: 'image', emoji: '🌸', tone: T.rose },
      { title: 'beautyEj5Title', subtitle: 'beautyEj5Subtitle', kind: 'image', emoji: '👕', tone: T.sky },
      { title: 'beautyEj6Title', subtitle: 'beautyEj6Subtitle', kind: 'image', emoji: '💼', tone: T.slate },
    ],
  },

  writer: {
    id: 'writer',
    headline: 'writerHeadline',
    intro: 'writerIntro',
    chips: ['writerChip1', 'writerChip2', 'writerChip3'],
    note: 'writerNote',
    heroEmoji: '✏️',
    gridTitle: 'writerGridTitle',
    actionLayout: 'tiles',
    actions: [
      { id: 'cover', icon: 'book-outline', emoji: '📕', title: 'writerAcCoverTitle', subtitle: 'writerAcCoverSubtitle', goal: 'writerAcCoverGoal', preset: { questionId: 'what', optionId: 'cover' } },
      { id: 'story', icon: 'library-outline', emoji: '📖', title: 'writerAcStoryTitle', subtitle: 'writerAcStorySubtitle', goal: 'writerAcStoryGoal', preset: { questionId: 'what', optionId: 'story' } },
      { id: 'script', icon: 'film-outline', emoji: '🎬', title: 'writerAcScriptTitle', subtitle: 'writerAcScriptSubtitle', goal: 'writerAcScriptGoal', preset: { questionId: 'what', optionId: 'script' } },
      { id: 'article', icon: 'newspaper-outline', emoji: '📰', title: 'writerAcArticleTitle', subtitle: 'writerAcArticleSubtitle', goal: 'writerAcArticleGoal', preset: { questionId: 'what', optionId: 'article' } },
      { id: 'social', icon: 'logo-instagram', emoji: '📱', title: 'writerAcSocialTitle', subtitle: 'writerAcSocialSubtitle', goal: 'writerAcSocialGoal', preset: { questionId: 'what', optionId: 'post' } },
      { id: 'email', icon: 'mail-outline', emoji: '✉️', title: 'writerAcEmailTitle', subtitle: 'writerAcEmailSubtitle', goal: 'writerAcEmailGoal', preset: { questionId: 'what', optionId: 'email' } },
      { id: 'document', icon: 'document-text-outline', emoji: '📄', title: 'writerAcDocumentTitle', subtitle: 'writerAcDocumentSubtitle', goal: 'writerAcDocumentGoal', preset: { questionId: 'what', optionId: 'document' } },
      { id: 'cv', icon: 'person-outline', emoji: '🧑‍💼', title: 'writerAcCvTitle', subtitle: 'writerAcCvSubtitle', goal: 'writerAcCvGoal', preset: { questionId: 'what', optionId: 'cv' } },
      { id: 'translate', icon: 'language-outline', emoji: '🌐', title: 'writerAcTranslateTitle', subtitle: 'writerAcTranslateSubtitle', goal: 'writerAcTranslateGoal', preset: { questionId: 'what', optionId: 'translate' } },
      { id: 'summary', icon: 'list-outline', emoji: '🗒️', title: 'writerAcSummaryTitle', subtitle: 'writerAcSummarySubtitle', goal: 'writerAcSummaryGoal', preset: { questionId: 'what', optionId: 'summary' } },
      { id: 'ideas', icon: 'bulb-outline', emoji: '💡', title: 'writerAcIdeasTitle', subtitle: 'writerAcIdeasSubtitle', goal: 'writerAcIdeasGoal', preset: { questionId: 'what', optionId: 'ideas' } },
      { id: 'fix', icon: 'checkmark-circle-outline', emoji: '✔️', title: 'writerAcFixTitle', subtitle: 'writerAcFixSubtitle', goal: 'writerAcFixGoal', preset: { questionId: 'what', optionId: 'fix' } },
      { id: 'rewrite', icon: 'refresh-outline', emoji: '🔁', title: 'writerAcRewriteTitle', subtitle: 'writerAcRewriteSubtitle', goal: 'writerAcRewriteGoal', preset: { questionId: 'what', optionId: 'rewrite' } },
      { id: 'citations', icon: 'chatbox-ellipses-outline', emoji: '❝', title: 'writerAcCitationsTitle', subtitle: 'writerAcCitationsSubtitle', goal: 'writerAcCitationsGoal', preset: { questionId: 'what', optionId: 'document' } },
      { id: 'more', icon: 'ellipsis-horizontal-circle-outline', emoji: '🤷', title: 'writerAcMoreTitle', subtitle: 'writerAcMoreSubtitle', goal: 'writerAcMoreGoal', preset: { questionId: 'what', optionId: 'idk' }, idk: true },
    ],
    inputs: ['text', 'attach', 'voice', 'web'],
    idea: {
      title: 'writerIdeaTitle',
      subtitle: 'writerIdeaSubtitle',
      placeholder: 'writerIdeaPlaceholder',
      chips: ['writerIdeaChip1', 'writerIdeaChip2', 'writerIdeaChip3', 'writerIdeaChip4'],
    },
    examplesTitle: 'writerExamplesTitle',
    examples: [
      { title: 'writerEj1Title', subtitle: 'writerEj1Subtitle', kind: 'document', emoji: '🚀', tone: T.night },
      { title: 'writerEj2Title', subtitle: 'writerEj2Subtitle', kind: 'document', emoji: '🍲', tone: T.coral },
      { title: 'writerEj3Title', subtitle: 'writerEj3Subtitle', kind: 'document', emoji: '🎭', tone: T.slate },
      { title: 'writerEj4Title', subtitle: 'writerEj4Subtitle', kind: 'document', emoji: '💻', tone: T.sky },
      { title: 'writerEj5Title', subtitle: 'writerEj5Subtitle', kind: 'document', emoji: '🌅', tone: T.yellow },
      { title: 'writerEj6Title', subtitle: 'writerEj6Subtitle', kind: 'document', emoji: '🧑‍💼', tone: T.mint },
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
    headline: 'travelHeadline',
    intro: 'travelIntro',
    chips: ['travelChip1', 'travelChip2', 'travelChip3'],
    note: 'travelNote',
    heroEmoji: '✈️',
    /*
     * El rótulo de la fila que despliega las funciones (fase 2E-69). Es la otra
     * puerta, debajo de la frase: quien ya sabe lo que quiere la abre y elige.
     * Sin `gridHint`, porque "cuatro formas de empezar" repetía en palabras lo
     * que se ve de un vistazo en cuanto la fila se abre.
     */
    gridTitle: 'travelGridTitle',
    /* La frase bajo el título cuando Travel está plegado: qué hay ahí dentro. */
    gridHint: 'travelGridHint',
    actionLayout: 'compact',
    actions: [
      { id: 'plan', icon: 'map-outline', emoji: '🗺️', title: 'travelAcPlanTitle', subtitle: 'travelAcPlanSubtitle', goal: 'travelAcPlanGoal', preset: { questionId: 'what', optionId: 'plan' } },
      { id: 'where', icon: 'earth-outline', emoji: '🌎', title: 'travelAcWhereTitle', subtitle: 'travelAcWhereSubtitle', goal: 'travelAcWhereGoal', preset: { questionId: 'what', optionId: 'where' }, idk: true },
      { id: 'doing', icon: 'restaurant-outline', emoji: '🍽️', title: 'travelAcDoingTitle', subtitle: 'travelAcDoingSubtitle', goal: 'travelAcDoingGoal', preset: { questionId: 'what', optionId: 'doing' } },
      { id: 'moving', icon: 'compass-outline', emoji: '🧭', title: 'travelAcMovingTitle', subtitle: 'travelAcMovingSubtitle', goal: 'travelAcMovingGoal', preset: { questionId: 'what', optionId: 'moving' } },
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
      title: 'travelIdeaTitle',
      subtitle: 'travelIdeaSubtitle',
      placeholder: 'travelIdeaPlaceholder',
      chips: ['travelIdeaChip1', 'travelIdeaChip2', 'travelIdeaChip3'],
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
/* El orden de las secciones con puerta propia. Writer salió al entrar en Studio. */
export const SPECIALIST_ORDER: SpecialistId[] = ['brain', 'design', 'music', 'studio', 'business', 'chef', 'travel'];

export const getSpecialist = (id: string): (SpecialistConfig & { experience: WeeExperience }) | null => {
  const config = SPECIALISTS[id as SpecialistId];
  const experience = getExperienceById(id);
  if (!config || !experience) return null;
  return { ...config, experience };
};

/** Lo mínimo que se le pide al traductor: una clave entra, un texto sale. */
type Traducir = (clave: string) => string;

/** El módulo del diccionario donde vive el catálogo. */
const CAT = 'catalogo.';

/**
 * La misma configuración, con las claves ya convertidas en palabras.
 *
 * Es LA ÚNICA puerta entre el catálogo y la pantalla. Devuelve un objeto con la
 * misma forma —mismas propiedades, mismo orden, mismos identificadores— para
 * que ni las pantallas ni los componentes compartidos tengan que cambiar: quien
 * recibía `spec.headline` sigue recibiendo una frase, y quien recibía
 * `action.title` también.
 *
 * Lo que NO pasa por el traductor, y se copia tal cual: `id`, `icon`, `emoji`,
 * `heroEmoji`, `kind`, `tone`, `inputs`, `actionLayout`, `preset`, `opens`,
 * `opensSection`, `secondary`, `idk` e `ideaFirst`. Es decir: todo lo que
 * decide a dónde lleva algo, cómo se dibuja o qué se le manda al servidor.
 */
export const traducirEspecialista = <C extends SpecialistConfig>(spec: C, t: Traducir): C => ({
  ...spec,
  headline: t(CAT + spec.headline),
  intro: t(CAT + spec.intro),
  chips: spec.chips.map((c) => t(CAT + c)),
  note: t(CAT + spec.note),
  gridTitle: t(CAT + spec.gridTitle),
  gridHint: spec.gridHint ? t(CAT + spec.gridHint) : undefined,
  actions: spec.actions.map((a) => ({
    ...a,
    title: t(CAT + a.title),
    subtitle: t(CAT + a.subtitle),
    goal: t(CAT + a.goal),
  })),
  idea: {
    ...spec.idea,
    title: t(CAT + spec.idea.title),
    subtitle: t(CAT + spec.idea.subtitle),
    placeholder: t(CAT + spec.idea.placeholder),
    chips: spec.idea.chips.map((c) => t(CAT + c)),
    button: spec.idea.button ? t(CAT + spec.idea.button) : undefined,
  },
  upload: spec.upload && {
    ...spec.upload,
    title: t(CAT + spec.upload.title),
    subtitle: t(CAT + spec.upload.subtitle),
    hint: t(CAT + spec.upload.hint),
    button: spec.upload.button ? t(CAT + spec.upload.button) : undefined,
  },
  examplesTitle: spec.examplesTitle ? t(CAT + spec.examplesTitle) : undefined,
  examples: spec.examples?.map((e) => ({
    ...e,
    title: t(CAT + e.title),
    subtitle: e.subtitle ? t(CAT + e.subtitle) : undefined,
    meta: e.meta ? t(CAT + e.meta) : undefined,
  })),
  closing: spec.closing && {
    ...spec.closing,
    title: t(CAT + spec.closing.title),
    subtitle: t(CAT + spec.closing.subtitle),
    button: t(CAT + spec.closing.button),
  },
});
