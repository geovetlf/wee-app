/**
 * LAS TRES CAPAS DE WEË STUDIO.
 *
 *   CAPA 1  EL SITIO      dónde estoy: Weë Studio. Una caja y cuatro entradas.
 *   CAPA 2  LA EXPERIENCE qué quiero conseguir: un retrato, un timelapse.
 *   CAPA 3  LOS CONTROLES con qué detalle: cámara, luz, movimiento.
 *
 * Y no hay una cuarta. Cada capa existe porque responde a una pregunta distinta;
 * una más sería partir en dos una pregunta que ya estaba contestada.
 *
 * ── La regla que ordena todo esto ───────────────────────────────────────────
 *
 * La potencia aparece DESPUÉS de la intención. Al entrar no se ve ni un control:
 * se ve una caja donde escribir y cuatro sitios por donde empezar. Los controles
 * de cámara —perspectiva, óptica, movimiento, luz— existen y son muchos, pero
 * nadie los ve hasta que ha dicho que quiere un vídeo cinematográfico, porque
 * antes de eso no significan nada.
 *
 * ── Lo que este archivo NO dice ─────────────────────────────────────────────
 *
 * Con qué se hace cada cosa. Una Experience declara lo que la persona quiere
 * lograr y qué hace falta preguntarle; elegir con qué se consigue es de otra
 * capa del producto, y el frontend no la conoce.
 *
 * Como todo `constants/` de Weë, aquí van CLAVES y no frases: esto se importa
 * fuera de React, donde no hay traductor.
 */

import { AreaDeStudio } from './studioTools';

/* ── CAPA 1 · Las entradas ─────────────────────────────────────────────────── */

/**
 * Por dónde se entra. Cuatro principales y cinco para explorar.
 *
 * NO están Travel, Chef, Design, Business ni Music: son lugares de trabajo
 * distintos de Weë AI, no áreas del Studio. Meterlos aquí sería decir que el
 * Studio los contiene, y no los contiene.
 */
export type EntradaDeStudio =
  | 'images' | 'videos' | 'text' | 'voice'
  | 'characters' | 'beauty' | 'fashion' | 'documents' | 'more';

export interface PuertaDeEntrada {
  id: EntradaDeStudio;
  /** La clave del nombre. Lo que es marca no la lleva. */
  clave?: string;
  /** El nombre literal, solo para lo que es marca y no se traduce. */
  marca?: string;
  claveHint: string;
  icono: string;
  /**
   * De qué se está creando algo, para que los ajustes pregunten lo que toca.
   * Es el eje del catálogo de siempre (`studioTools.ts`), que no cambia.
   */
  area: AreaDeStudio;
  /**
   * A qué experiencia de Weë lleva al crear. Se declara aquí y NO se adivina:
   * con ese identificador viajan los trabajos guardados.
   *
   * Sin él, la entrada todavía no tiene experiencia propia —y se dice, en vez
   * de inventar una—.
   */
  experienceId?: string;
}

/**
 * LAS CUATRO PRINCIPALES.
 *
 * Imagen, Video, Texto y Voz. No quince botones: cuatro. Todo lo que Weë sabe
 * hacer cabe debajo de una de las cuatro, y lo que no cabe está en Explorar.
 *
 * El identificador de Texto es `writer` y no `text`: con `writer` viajan la
 * plantilla del servidor y los trabajos ya guardados, y eso no se toca. Lo que
 * cambia es cómo se presenta —"Texto", que es la categoría— mientras que Weë
 * Writer sigue siendo el nombre de la experiencia que hay dentro.
 */
export const ENTRADAS_PRINCIPALES: PuertaDeEntrada[] = [
  { id: 'images', clave: 'studio.imagesTitle', claveHint: 'studio.imagesHint', icono: 'image-outline', area: 'images', experienceId: 'photo' },
  { id: 'videos', clave: 'studio.videosTitle', claveHint: 'studio.videosHint', icono: 'videocam-outline', area: 'videos', experienceId: 'studio' },
  { id: 'text', clave: 'studio.textTitle', claveHint: 'studio.textHint', icono: 'create-outline', area: 'writer', experienceId: 'writer' },
  { id: 'voice', clave: 'studio.voiceTitle', claveHint: 'studio.voiceHint', icono: 'mic-outline', area: 'voice' },
];

/**
 * EXPLORAR.
 *
 * Debajo y en pequeño: es para quien ya miró las cuatro y quiere ver qué más
 * hay. Personajes, Beauty y Fashion trabajan sobre imágenes —de una persona, de
 * su ropa, de su cara— y por eso su área es `images`: los ajustes que hacen
 * falta son los de una imagen.
 *
 * Documentos NO es Texto y no se mezclan (B3.11 §19): uno es contenido escrito
 * y el otro son archivos con estructura.
 */
export const ENTRADAS_DE_EXPLORAR: PuertaDeEntrada[] = [
  { id: 'characters', clave: 'studio.charactersTitle', claveHint: 'studio.charactersHint', icono: 'person-outline', area: 'images' },
  { id: 'beauty', clave: 'studio.beautyTitle', claveHint: 'studio.beautyHint', icono: 'sparkles-outline', area: 'images', experienceId: 'beauty' },
  { id: 'fashion', clave: 'studio.fashionTitle', claveHint: 'studio.fashionHint', icono: 'shirt-outline', area: 'images', experienceId: 'beauty' },
  { id: 'documents', clave: 'studio.docsTitle', claveHint: 'studio.docsHint', icono: 'document-text-outline', area: 'documents' },
  { id: 'more', clave: 'studio.moreTitle', claveHint: 'studio.moreHint', icono: 'grid-outline', area: 'more' },
];

export const TODAS_LAS_ENTRADAS: PuertaDeEntrada[] = [...ENTRADAS_PRINCIPALES, ...ENTRADAS_DE_EXPLORAR];

export const entradaPorId = (id: EntradaDeStudio): PuertaDeEntrada | undefined =>
  TODAS_LAS_ENTRADAS.find((e) => e.id === id);

/* ── CAPA 2 · Las experiencias ─────────────────────────────────────────────── */

/**
 * Algo concreto que alguien quiere conseguir.
 *
 * `controles` son las familias de `camaraCinematica.ts` que esta experiencia
 * enseña, y solo esas. Un retrato no necesita movimiento de cámara ni óptica:
 * enseñárselos no es dar opciones, es dar trabajo.
 */
export interface ExperienciaDeStudio {
  id: string;
  clave: string;
  icono: string;
  /** Las familias de controles que se abren con ella. Vacío = ninguna. */
  controles: string[];
  /** Si pide un material para empezar: una foto, un vídeo, un documento. */
  pideMaterial?: boolean;
}

const x = (id: string, clave: string, icono: string, controles: string[] = [], pideMaterial = false): ExperienciaDeStudio =>
  ({ id, clave, icono, controles, ...(pideMaterial ? { pideMaterial } : {}) });

/**
 * IMAGEN. Seis maneras de empezar, no dieciocho herramientas.
 *
 * La diferencia con el catálogo de siempre es lo que cada una PREGUNTA: un
 * retrato pregunta encuadre, luz y composición; un cartel no pregunta ninguna
 * de las tres. Por eso son experiencias y no botones.
 */
export const EXPERIENCIAS_DE_IMAGEN: ExperienciaDeStudio[] = [
  x('portrait', 'studio.xpPortrait', 'person-outline', ['shot', 'lighting', 'composition']),
  x('product', 'studio.xpProduct', 'cube-outline', ['shot', 'lighting', 'composition']),
  x('editorial', 'studio.xpEditorial', 'newspaper-outline', ['shot', 'lighting', 'composition', 'lens']),
  x('cinematic', 'studio.xpCinematic', 'film-outline', ['camera', 'perspective', 'shot', 'lens', 'lighting', 'composition']),
  x('social', 'studio.xpSocial', 'heart-outline', ['composition']),
  x('poster', 'studio.xpPoster', 'easel-outline', ['composition']),
];

/**
 * VIDEO. Aquí la ocultación progresiva es todavía más fuerte, porque es donde
 * más controles hay: quince maneras de empezar, y cada una abre solo las suyas.
 *
 * Travel Time es una experiencia de vídeo del Studio —un viaje contado en
 * imágenes— y NO es Weë Travel, que es el lugar de trabajo donde se planifica
 * un viaje de verdad. Comparten la palabra y nada más.
 */
export const EXPERIENCIAS_DE_VIDEO: ExperienciaDeStudio[] = [
  x('travelTime', 'studio.xpTravelTime', 'airplane-outline', ['camera', 'movement', 'speed', 'lighting']),
  x('timelapse', 'studio.xpTimelapse', 'time-outline', ['camera', 'perspective', 'speed']),
  x('map', 'studio.xpMap', 'map-outline', ['camera', 'movement', 'speed']),
  x('whiteboard', 'studio.xpWhiteboard', 'clipboard-outline', ['speed']),
  x('cinematicVideo', 'studio.xpVidCinematic', 'film-outline', ['camera', 'perspective', 'shot', 'lens', 'movement', 'speed', 'lighting', 'composition']),
  x('character', 'studio.xpCharacter', 'person-outline', ['shot', 'movement', 'lighting'], true),
  x('productVideo', 'studio.xpVidProduct', 'cube-outline', ['camera', 'movement', 'lighting', 'composition'], true),
  x('socialVideo', 'studio.xpVidSocial', 'heart-outline', ['movement', 'speed']),
  x('story', 'studio.xpStory', 'book-outline', ['shot', 'movement', 'lighting']),
  x('ad', 'studio.xpAd', 'megaphone-outline', ['camera', 'movement', 'speed', 'lighting']),
  x('musicVideo', 'studio.xpMusicVideo', 'musical-notes-outline', ['camera', 'movement', 'speed', 'lighting']),
  x('scene', 'studio.vidScene', 'albums-outline', ['camera', 'shot', 'movement', 'lighting', 'composition']),
  x('multiScene', 'studio.xpMultiScene', 'layers-outline', ['shot', 'movement', 'lighting']),
  x('beforeAfter', 'studio.xpBeforeAfter', 'git-compare-outline', ['shot'], true),
  x('cameraMove', 'studio.xpCameraMove', 'videocam-outline', ['camera', 'perspective', 'movement', 'speed'], true),
];

/** TEXTO. Las seis que ya existían en el catálogo, con sus claves de siempre. */
export const EXPERIENCIAS_DE_TEXTO: ExperienciaDeStudio[] = [
  x('post', 'studio.wrPosts', 'megaphone-outline'),
  x('article', 'studio.wrArticles', 'newspaper-outline'),
  x('story', 'studio.wrStories', 'book-outline'),
  x('script', 'studio.wrScripts', 'document-outline'),
  x('rewrite', 'studio.wrRewrite', 'repeat-outline'),
  x('summarize', 'studio.wrSummaries', 'list-outline'),
];

/** VOZ. Sin controles de cámara, claro: una voz no se encuadra. */
export const EXPERIENCIAS_DE_VOZ: ExperienciaDeStudio[] = [
  x('narration', 'studio.voxNarration', 'mic-outline'),
  x('voiceOver', 'studio.xpVoiceOver', 'volume-high-outline'),
  x('characterVoice', 'studio.xpCharacterVoice', 'person-circle-outline'),
  x('reading', 'studio.xpReading', 'book-outline'),
];

/**
 * PERSONAJES. Una capacidad transversal, no un lugar de trabajo.
 *
 * Mantener a alguien reconocible entre una creación y la siguiente ya tiene
 * quien lo resuelva en Weë, y no se construye otro: aquí solo se dice que se
 * quiere, y quién lo hace es cosa de más abajo.
 */
export const EXPERIENCIAS_DE_PERSONAJES: ExperienciaDeStudio[] = [
  x('createCharacter', 'studio.xpCreateCharacter', 'person-add-outline', ['shot', 'lighting']),
  x('keepIdentity', 'studio.xpKeepIdentity', 'infinite-outline', ['shot', 'lighting'], true),
];

/** BEAUTY. Sobre la foto de una persona, siempre. */
export const EXPERIENCIAS_DE_BEAUTY: ExperienciaDeStudio[] = [
  x('look', 'studio.xpBeautyLook', 'sparkles-outline', ['shot', 'lighting'], true),
  x('makeup', 'studio.xpMakeup', 'color-palette-outline', ['shot', 'lighting'], true),
  x('hair', 'studio.xpHair', 'cut-outline', ['shot', 'lighting'], true),
  x('appearance', 'studio.xpAppearance', 'happy-outline', ['shot', 'lighting'], true),
];

/** FASHION. La ropa, el cuerpo entero y el estilo; la persona sigue siendo ella. */
export const EXPERIENCIAS_DE_FASHION: ExperienciaDeStudio[] = [
  x('outfit', 'studio.xpOutfit', 'shirt-outline', ['shot', 'lighting', 'composition'], true),
  x('fullBody', 'studio.xpFullBody', 'body-outline', ['shot', 'lighting', 'composition'], true),
  x('styling', 'studio.xpStyling', 'color-wand-outline', ['shot', 'lighting'], true),
  x('tryOn', 'studio.xpTryOn', 'checkmark-circle-outline', ['shot', 'lighting'], true),
];

/**
 * Qué experiencias tiene cada entrada.
 *
 * Documentos y "Más" no están, y es a propósito: los dos siguen enseñando el
 * catálogo de herramientas de siempre (`studioTools.ts`). Documentos porque
 * inventarle experiencias sería dibujar una puerta a un sitio al que Weë
 * todavía no llega, y "Más" porque ahí no se empieza algo: se busca algo.
 */
export const EXPERIENCIAS_POR_ENTRADA: Readonly<Partial<Record<EntradaDeStudio, ExperienciaDeStudio[]>>> = {
  images: EXPERIENCIAS_DE_IMAGEN,
  videos: EXPERIENCIAS_DE_VIDEO,
  text: EXPERIENCIAS_DE_TEXTO,
  voice: EXPERIENCIAS_DE_VOZ,
  characters: EXPERIENCIAS_DE_PERSONAJES,
  beauty: EXPERIENCIAS_DE_BEAUTY,
  fashion: EXPERIENCIAS_DE_FASHION,
};

export const experienciasDeLaEntrada = (id: EntradaDeStudio): ExperienciaDeStudio[] =>
  EXPERIENCIAS_POR_ENTRADA[id] ?? [];
