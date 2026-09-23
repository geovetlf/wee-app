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
  /*
   * VOZ LLEVA A `music`, y no es un capricho: es lo medido.
   *
   * En todo Weë hay UN plan que produce voz sola —`text.generate` + `voice.tts`,
   * sin tocar `music.generate`— y vive en la plantilla de Weë Music, cuyo
   * catálogo incluye «🗣️ Una voz o narración». El otro `voice.tts` que existe
   * es el tercer paso de un plan de vídeo, así que pedir una narración por ahí
   * generaría también un vídeo.
   *
   * Tiene una consecuencia que se dice en vez de taparse: quien entra por Voz
   * ve «Weë Music» en la cabecera del flujo. No es mentira —esa sección hace
   * narraciones— pero tampoco es lo que esperaba. Separarlo exige sacar la rama
   * de voz a su propia plantilla, que es servidor y es otra fase.
   */
  { id: 'voice', clave: 'studio.voiceTitle', claveHint: 'studio.voiceHint', icono: 'mic-outline', area: 'voice', experienceId: 'music' },
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
  /**
   * LO QUE ELEGIR ESTA EXPERIENCIA YA CONTESTA.
   *
   * Es el mismo mecanismo que usan las acciones de los especialistas desde
   * siempre (`constants/specialists.ts` → `preset`): respuestas que viajan con
   * el trabajo nuevo para que no se pregunte lo que ya está decidido.
   *
   * ── Por qué hace falta, medido ──────────────────────────────────────────
   *
   * Sin esto, las seis experiencias de imagen acababan en `image.edit`: la
   * plantilla deduce la acción de las PALABRAS del objetivo, y «Retrato»,
   * «Producto» o «Cartel» no están entre las que significan «crear desde
   * cero». Así que Weë pedía una foto para editarla cuando lo que se quería
   * era una imagen nueva.
   *
   * Elegir «Retrato» ES decir «créame una imagen». Decirlo aquí no es añadir
   * un camino: es usar el que ya existía para exactamente esto.
   */
  respuestas?: readonly { questionId: string; optionId: string }[];
  /**
   * POR QUÉ ESTA TODAVÍA NO SE PUEDE HACER. La clave de i18n del motivo.
   *
   * Una experiencia con motivo se ve, se puede leer y NO se puede abrir. Es a
   * propósito: la alternativa era enseñarla como si funcionara —y que alguien
   * gastara Credits en algo que no iba a salir— o quitarla del catálogo, y
   * entonces nadie sabría que está pensada y por qué falta.
   *
   * El motivo se mide, no se supone: cada una de las tres que hay hoy dice qué
   * pieza concreta del motor no existe todavía.
   */
  pendiente?: string;
}

const x = (
  id: string,
  clave: string,
  icono: string,
  controles: string[] = [],
  pideMaterial = false,
  respuestas?: readonly { questionId: string; optionId: string }[]
): ExperienciaDeStudio =>
  ({ id, clave, icono, controles, ...(pideMaterial ? { pideMaterial } : {}), ...(respuestas ? { respuestas } : {}) });

/**
 * Crear una imagen desde cero, dicho en el idioma de la plantilla `photo`.
 *
 * `action: 'generate'` es lo que hace que el plan sea `image.generate` con tres
 * propuestas, en vez de `vision.describe` + `image.edit` sobre una foto que
 * nadie subió.
 */
const CREAR_IMAGEN = { questionId: 'action', optionId: 'generate' } as const;

/**
 * Para qué es un vídeo, en el idioma de la plantilla `studio`.
 *
 * Tres de las cuatro opciones que tiene: promocionar algo, algo para redes, o
 * contar una historia. La cuarta —animar una foto— NO se pone nunca desde
 * aquí: es un plan distinto que EXIGE una foto subida, y ninguna experiencia
 * de vídeo del Studio la pide.
 */
const ENSENAR_ALGO = { questionId: 'type', optionId: 'promo' } as const;

/**
 * Lo que elegir una experiencia de VOZ ya contesta.
 *
 * `DECIR_ALGO` es «una voz o narración» en el catálogo de Weë Music, que es lo
 * que separa un plan de voz sola de uno que además compone una canción. Sin
 * ella, «Lectura» —que no lleva ninguna palabra que suene a voz— acababa
 * pidiendo `music.generate`, que está PENDIENTE, más una portada.
 *
 * `VOZ_QUE_ELIGE_WEE` es la respuesta honesta a «¿qué voz?» mientras la
 * elegida no llegue al proveedor: el plan escribe `input.voice` y los
 * adaptadores solo leen `input.voiceId`, así que hoy SIEMPRE suena la voz por
 * defecto. Preguntar «¿femenina o masculina?» para después ignorarlo sería
 * prometer una elección que no existe; que Weë elija es lo que de verdad pasa.
 * Arreglarlo pide un catálogo de voces por proveedor, y eso no se inventa.
 */
const DECIR_ALGO = { questionId: 'what', optionId: 'voice' } as const;
const VOZ_QUE_ELIGE_WEE = { questionId: 'voice', optionId: 'idk' } as const;
const PARA_REDES = { questionId: 'type', optionId: 'social' } as const;
const CONTAR_ALGO = { questionId: 'type', optionId: 'story' } as const;

/**
 * IMAGEN. Seis maneras de empezar, no dieciocho herramientas.
 *
 * La diferencia con el catálogo de siempre es lo que cada una PREGUNTA: un
 * retrato pregunta encuadre, luz y composición; un cartel no pregunta ninguna
 * de las tres. Por eso son experiencias y no botones.
 */
export const EXPERIENCIAS_DE_IMAGEN: ExperienciaDeStudio[] = [
  x('portrait', 'studio.xpPortrait', 'person-outline', ['shot', 'lighting', 'composition'], false, [CREAR_IMAGEN]),
  /*
   * Producto y Redes contestan además CÓMO se quiere, porque en esas dos la
   * respuesta es siempre la misma y preguntarla sería hacer perder un paso:
   * un producto se enseña sobre fondo limpio y algo para redes tiene que
   * destacar. Las otras cuatro no lo dan por hecho: ahí Weë pregunta, que es
   * lo correcto cuando no hay una respuesta obvia.
   */
  x('product', 'studio.xpProduct', 'cube-outline', ['shot', 'lighting', 'composition'], false,
    [CREAR_IMAGEN, { questionId: 'detail', optionId: 'clean' }]),
  x('editorial', 'studio.xpEditorial', 'newspaper-outline', ['shot', 'lighting', 'composition', 'lens'], false, [CREAR_IMAGEN]),
  x('cinematic', 'studio.xpCinematic', 'film-outline', ['camera', 'perspective', 'shot', 'lens', 'lighting', 'composition'], false, [CREAR_IMAGEN]),
  x('social', 'studio.xpSocial', 'heart-outline', ['composition'], false,
    [CREAR_IMAGEN, { questionId: 'detail', optionId: 'vivid' }]),
  x('poster', 'studio.xpPoster', 'easel-outline', ['composition'], false, [CREAR_IMAGEN]),
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
  /*
   * PARA QUÉ ES EL VÍDEO, cuando elegir la experiencia ya lo dice.
   *
   * La plantilla pregunta «¿qué tipo de vídeo?» —promocionar, redes, una
   * historia, animar una foto— y de eso salen las palabras del encargo y el
   * nivel del guion. Donde la respuesta es obvia se contesta; donde no lo es,
   * Weë pregunta, que es lo correcto cuando nadie lo ha dicho.
   *
   * Y hay una que se contesta por un motivo distinto: «Pizarra animada» lleva
   * la palabra «animada» en su propio nombre, y la plantilla la leía como
   * «animar una foto». El plan salía pidiendo una foto que nadie tenía. El
   * nombre de la experiencia contaminaba lo que Weë entendía.
   */
  x('travelTime', 'studio.xpTravelTime', 'airplane-outline', ['camera', 'movement', 'speed', 'lighting'], false, [CONTAR_ALGO]),
  x('timelapse', 'studio.xpTimelapse', 'time-outline', ['camera', 'perspective', 'speed'], false, [CONTAR_ALGO]),
  x('map', 'studio.xpMap', 'map-outline', ['camera', 'movement', 'speed'], false, [CONTAR_ALGO]),
  x('whiteboard', 'studio.xpWhiteboard', 'clipboard-outline', ['speed'], false, [CONTAR_ALGO]),
  x('cinematicVideo', 'studio.xpVidCinematic', 'film-outline', ['camera', 'perspective', 'shot', 'lens', 'movement', 'speed', 'lighting', 'composition'], false, [CONTAR_ALGO]),
  x('character', 'studio.xpCharacter', 'person-outline', ['shot', 'movement', 'lighting'], true, [CONTAR_ALGO]),
  x('productVideo', 'studio.xpVidProduct', 'cube-outline', ['camera', 'movement', 'lighting', 'composition'], true, [ENSENAR_ALGO]),
  x('socialVideo', 'studio.xpVidSocial', 'heart-outline', ['movement', 'speed'], false,
    [PARA_REDES, { questionId: 'where', optionId: 'vertical' }]),
  /* `storyVideo` y no `story`: el de Texto ya se llamaba así, y dos experiencias
     distintas con el mismo identificador es una trampa esperando. La lista de
     vídeo ya distinguía con sufijo —`productVideo`, `socialVideo`— y esta sigue
     la misma regla. Lo encontró el guard, no una lectura. */
  x('storyVideo', 'studio.xpStory', 'book-outline', ['shot', 'movement', 'lighting'], false, [CONTAR_ALGO]),
  x('ad', 'studio.xpAd', 'megaphone-outline', ['camera', 'movement', 'speed', 'lighting'], false, [ENSENAR_ALGO]),
  x('scene', 'studio.vidScene', 'albums-outline', ['camera', 'shot', 'movement', 'lighting', 'composition'], false, [CONTAR_ALGO]),
  x('cameraMove', 'studio.xpCameraMove', 'videocam-outline', ['camera', 'perspective', 'movement', 'speed'], true, [CONTAR_ALGO]),

  /*
   * ── LAS TRES QUE TODAVÍA NO SE PUEDEN HACER ────────────────────────────
   *
   * Medido, no supuesto. Se ven y no se abren, porque enseñarlas como si
   * funcionaran acabaría con alguien gastando Credits en algo que no iba a
   * salir.
   */
  { ...x('musicVideo', 'studio.xpMusicVideo', 'musical-notes-outline', ['camera', 'movement', 'speed', 'lighting']),
    pendiente: 'studio.pendMusic' },
  { ...x('multiScene', 'studio.xpMultiScene', 'layers-outline', ['shot', 'movement', 'lighting']),
    pendiente: 'studio.pendCompose' },
  { ...x('beforeAfter', 'studio.xpBeforeAfter', 'git-compare-outline', ['shot'], true),
    pendiente: 'studio.pendTwoRefs' },
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
  x('narration', 'studio.voxNarration', 'mic-outline', [], false, [DECIR_ALGO, VOZ_QUE_ELIGE_WEE]),
  x('voiceOver', 'studio.xpVoiceOver', 'volume-high-outline', [], false, [DECIR_ALGO, VOZ_QUE_ELIGE_WEE]),
  x('characterVoice', 'studio.xpCharacterVoice', 'person-circle-outline', [], false, [DECIR_ALGO, VOZ_QUE_ELIGE_WEE]),
  x('reading', 'studio.xpReading', 'book-outline', [], false, [DECIR_ALGO, VOZ_QUE_ELIGE_WEE]),
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
