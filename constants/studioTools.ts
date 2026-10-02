/*
 * EL CATÁLOGO DE WEË STUDIO.
 *
 * Aquí viven el orden, los iconos y las CLAVES de texto. No las frases: este
 * archivo se importa fuera de React, donde no hay traductor, así que traducir
 * al construirlo congelaría el idioma del arranque. Quien pinta resuelve, con
 * `t(clave)` — el mismo patrón de `constants/specialists.ts` y `weeMenu.ts`.
 *
 * Los iconos son de Ionicons en su variante `-outline`, como el resto del
 * taller, y se pintan con el color del texto: negros sobre blanco, nunca de
 * colores. Un solo trazo, una sola familia.
 */

/**
 * DE QUÉ SE ESTÁ CREANDO ALGO. Seis medios, y con eso se decide qué ajustes
 * preguntar y qué herramientas enseñar.
 *
 * NO es la lista de entradas del Studio: esa vive en `studioExperiences.ts` y
 * son nueve —cuatro grandes y cinco de Explorar—. Aquí había una segunda lista
 * de seis puertas con sus iconos y sus pistas, y dos catálogos de lo mismo se
 * separan solos en cuanto uno cambia. Se quedó el que dice DE QUÉ MEDIO va.
 */
export type AreaDeStudio = 'images' | 'videos' | 'voice' | 'writer' | 'documents' | 'more';

/** Una herramienta dentro de un panel. */
export interface HerramientaDeStudio {
  id: string;
  clave: string;
  icono: string;
}

/** Un grupo de herramientas, para los paneles que las ordenan por familia. */
export interface GrupoDeHerramientas {
  id: string;
  clave: string;
  herramientas: HerramientaDeStudio[];
}

const h = (id: string, clave: string, icono: string): HerramientaDeStudio => ({ id, clave, icono });

export const HERRAMIENTAS_DE_IMAGEN: HerramientaDeStudio[] = [
  h('fromText', 'studio.imgFromText', 'text-outline'),
  h('fromImage', 'studio.imgFromImage', 'images-outline'),
  h('edit', 'studio.imgEdit', 'brush-outline'),
  h('removeObject', 'studio.imgRemoveObject', 'cut-outline'),
  h('addObject', 'studio.imgAddObject', 'add-circle-outline'),
  h('changeBackground', 'studio.imgChangeBackground', 'layers-outline'),
  h('removeBackground', 'studio.imgRemoveBackground', 'scan-outline'),
  h('changeStyle', 'studio.imgChangeStyle', 'color-palette-outline'),
  h('relight', 'studio.imgRelight', 'sunny-outline'),
  h('expand', 'studio.imgExpand', 'expand-outline'),
  h('restore', 'studio.imgRestore', 'refresh-outline'),
  h('enhance', 'studio.imgEnhance', 'sparkles-outline'),
  h('upscale', 'studio.imgUpscale', 'resize-outline'),
  h('variations', 'studio.imgVariations', 'copy-outline'),
  h('combine', 'studio.imgCombine', 'git-merge-outline'),
  h('character', 'studio.imgCharacter', 'person-outline'),
  h('textInside', 'studio.imgText', 'text'),
  h('formats', 'studio.imgFormats', 'crop-outline'),
];

export const HERRAMIENTAS_DE_VIDEO: HerramientaDeStudio[] = [
  h('fromText', 'studio.vidFromText', 'text-outline'),
  h('fromImage', 'studio.vidFromImage', 'image-outline'),
  h('fromImages', 'studio.vidFromImages', 'images-outline'),
  h('fromVideo', 'studio.vidFromVideo', 'film-outline'),
  h('scene', 'studio.vidScene', 'albums-outline'),
  h('continue', 'studio.vidContinue', 'play-forward-outline'),
  h('variations', 'studio.vidVariations', 'copy-outline'),
  h('motion', 'studio.vidMotion', 'move-outline'),
  h('camera', 'studio.vidCamera', 'videocam-outline'),
  h('style', 'studio.vidStyle', 'color-palette-outline'),
];

export const HERRAMIENTAS_DE_VOZ: HerramientaDeStudio[] = [
  h('fromText', 'studio.voxFromText', 'volume-high-outline'),
  h('narration', 'studio.voxNarration', 'mic-outline'),
  h('pick', 'studio.voxPick', 'person-circle-outline'),
  h('language', 'studio.voxLanguage', 'globe-outline'),
  h('accent', 'studio.voxAccent', 'chatbubble-ellipses-outline'),
  h('emotion', 'studio.voxEmotion', 'happy-outline'),
  h('transcribe', 'studio.voxTranscribe', 'document-text-outline'),
  h('subtitles', 'studio.voxSubtitles', 'chatbox-outline'),
  h('extract', 'studio.voxExtract', 'download-outline'),
  h('enhance', 'studio.voxEnhance', 'sparkles-outline'),
  h('clean', 'studio.voxClean', 'sparkles-outline'),
];

export const HERRAMIENTAS_DE_WRITER: HerramientaDeStudio[] = [
  h('ideas', 'studio.wrIdeas', 'bulb-outline'),
  h('posts', 'studio.wrPosts', 'megaphone-outline'),
  h('captions', 'studio.wrCaptions', 'chatbubble-outline'),
  h('scripts', 'studio.wrScripts', 'document-outline'),
  h('stories', 'studio.wrStories', 'book-outline'),
  h('books', 'studio.wrBooks', 'library-outline'),
  h('articles', 'studio.wrArticles', 'newspaper-outline'),
  h('blogs', 'studio.wrBlogs', 'globe-outline'),
  h('essays', 'studio.wrEssays', 'school-outline'),
  h('emails', 'studio.wrEmails', 'mail-outline'),
  h('letters', 'studio.wrLetters', 'mail-open-outline'),
  h('cv', 'studio.wrCv', 'briefcase-outline'),
  h('decks', 'studio.wrDecks', 'easel-outline'),
  h('proposals', 'studio.wrProposals', 'clipboard-outline'),
  h('reports', 'studio.wrReports', 'bar-chart-outline'),
  h('descriptions', 'studio.wrDescriptions', 'pricetag-outline'),
  h('ads', 'studio.wrAds', 'megaphone-outline'),
  h('videoScripts', 'studio.wrVideoScripts', 'film-outline'),
  h('podcasts', 'studio.wrPodcasts', 'radio-outline'),
  h('dialogue', 'studio.wrDialogue', 'chatbubbles-outline'),
  h('lyrics', 'studio.wrLyrics', 'musical-notes-outline'),
  h('summaries', 'studio.wrSummaries', 'list-outline'),
  h('translate', 'studio.wrTranslate', 'language-outline'),
  h('rewrite', 'studio.wrRewrite', 'repeat-outline'),
  h('proofread', 'studio.wrProofread', 'checkmark-done-outline'),
  h('brainstorm', 'studio.wrBrainstorm', 'sparkles-outline'),
];

export const HERRAMIENTAS_DE_DOCUMENTOS: HerramientaDeStudio[] = [
  h('pdf', 'studio.docPdf', 'document-outline'),
  h('document', 'studio.docDocument', 'document-text-outline'),
  h('ebook', 'studio.docEbook', 'book-outline'),
  h('guide', 'studio.docGuide', 'map-outline'),
  h('manual', 'studio.docManual', 'construct-outline'),
  h('deck', 'studio.docDeck', 'easel-outline'),
  h('catalog', 'studio.docCatalog', 'albums-outline'),
  h('brochure', 'studio.docBrochure', 'reader-outline'),
  h('imageToPdf', 'studio.docImageToPdf', 'image-outline'),
  h('toPdf', 'studio.docToPdf', 'swap-horizontal-outline'),
  h('pdfToText', 'studio.docPdfToText', 'text-outline'),
  h('summarize', 'studio.docSummarize', 'list-outline'),
  h('ask', 'studio.docAsk', 'help-circle-outline'),
  h('compare', 'studio.docCompare', 'git-compare-outline'),
];

/*
 * Más herramientas, por familias. La regla que pide el diseño es no soltar
 * cuarenta botones en fila: cada una se busca por el material con el que se
 * trabaja —una imagen, un video, un audio, un texto, un archivo—, no por su
 * nombre.
 */
export const GRUPOS_DE_HERRAMIENTAS: GrupoDeHerramientas[] = [
  {
    id: 'image',
    clave: 'studio.grpImage',
    herramientas: [
      h('removeBackground', 'studio.imgRemoveBackground', 'scan-outline'),
      h('removeObject', 'studio.imgRemoveObject', 'cut-outline'),
      h('enhance', 'studio.imgEnhance', 'sparkles-outline'),
      h('upscale', 'studio.imgUpscale', 'resize-outline'),
      h('expand', 'studio.imgExpand', 'expand-outline'),
      h('changeBackground', 'studio.imgChangeBackground', 'layers-outline'),
      h('relight', 'studio.imgRelight', 'sunny-outline'),
      h('restore', 'studio.imgRestore', 'refresh-outline'),
      h('recolor', 'studio.tlRecolor', 'color-palette-outline'),
      h('crop', 'studio.tlCrop', 'crop-outline'),
    ],
  },
  {
    id: 'video',
    clave: 'studio.grpVideo',
    herramientas: [
      h('edit', 'studio.tlVidEdit', 'brush-outline'),
      h('cut', 'studio.tlVidCut', 'cut-outline'),
      h('join', 'studio.tlVidJoin', 'git-merge-outline'),
      h('subtitles', 'studio.tlVidSubtitles', 'chatbox-outline'),
      h('silences', 'studio.tlVidSilences', 'volume-mute-outline'),
      h('enhance', 'studio.tlVidEnhance', 'sparkles-outline'),
      h('format', 'studio.tlVidFormat', 'crop-outline'),
      h('clips', 'studio.tlVidClips', 'albums-outline'),
      h('speed', 'studio.tlVidSpeed', 'speedometer-outline'),
      h('background', 'studio.tlVidBackground', 'scan-outline'),
    ],
  },
  {
    id: 'audio',
    clave: 'studio.grpAudio',
    herramientas: [
      h('clean', 'studio.tlAudClean', 'sparkles-outline'),
      h('noise', 'studio.tlAudNoise', 'volume-low-outline'),
      h('enhance', 'studio.voxEnhance', 'mic-outline'),
      h('transcribe', 'studio.voxTranscribe', 'document-text-outline'),
      h('extract', 'studio.voxExtract', 'download-outline'),
      h('tts', 'studio.voxFromText', 'volume-high-outline'),
    ],
  },
  {
    id: 'text',
    clave: 'studio.grpText',
    herramientas: [
      h('summarize', 'studio.tlTxtSummarize', 'list-outline'),
      h('rewrite', 'studio.tlTxtRewrite', 'repeat-outline'),
      h('proofread', 'studio.tlTxtProofread', 'checkmark-done-outline'),
      h('translate', 'studio.tlTxtTranslate', 'language-outline'),
      h('tone', 'studio.tlTxtTone', 'happy-outline'),
      h('expand', 'studio.tlTxtExpand', 'expand-outline'),
      h('simplify', 'studio.tlTxtSimplify', 'remove-outline'),
      h('extract', 'studio.tlTxtExtract', 'search-outline'),
    ],
  },
  {
    id: 'files',
    clave: 'studio.grpFiles',
    herramientas: [
      h('pdfToText', 'studio.docPdfToText', 'text-outline'),
      h('imageToPdf', 'studio.docImageToPdf', 'image-outline'),
      h('summarize', 'studio.docSummarize', 'list-outline'),
      h('ask', 'studio.docAsk', 'help-circle-outline'),
      h('convert', 'studio.tlFileConvert', 'swap-horizontal-outline'),
    ],
  },
];

/*
 * LOS AJUSTES CAMBIAN CON LO QUE SE ESTÁ CREANDO.
 *
 * No es un panel de preferencias: es lo que hace falta decidir para ESTA
 * creación. Por eso cuelgan del área y no de la aplicación. Guardan claves,
 * como todo lo demás de este archivo.
 */
export interface AjusteDeStudio {
  id: string;
  clave: string;
  opciones: { id: string; clave: string }[];
}

const o = (id: string, clave: string) => ({ id, clave });

const FORMATO = o('auto', 'studio.valAuto');
const AJUSTES_COMUNES = {
  formato: {
    id: 'format',
    clave: 'studio.optFormat',
    opciones: [FORMATO, o('square', 'studio.valSquare'), o('portrait', 'studio.valPortrait'), o('landscape', 'studio.valLandscape')],
  },
  calidad: {
    id: 'quality',
    clave: 'studio.optQuality',
    opciones: [o('standard', 'studio.valStandard'), o('high', 'studio.valHigh')],
  },
  estilo: {
    id: 'style',
    clave: 'studio.optStyle',
    opciones: [FORMATO, o('realistic', 'studio.valRealistic'), o('illustration', 'studio.valIllustration'), o('minimal', 'studio.valMinimal')],
  },
  resolucion: {
    id: 'resolution',
    clave: 'studio.optResolution',
    opciones: [FORMATO, o('standard', 'studio.valStandard'), o('high', 'studio.valHigh')],
  },
};

export const AJUSTES_POR_AREA: Record<AreaDeStudio, AjusteDeStudio[]> = {
  images: [
    AJUSTES_COMUNES.formato,
    AJUSTES_COMUNES.calidad,
    AJUSTES_COMUNES.resolucion,
    AJUSTES_COMUNES.estilo,
    { id: 'variations', clave: 'studio.optVariations', opciones: [o('1', 'studio.valStandard'), o('4', 'studio.valHigh')] },
    { id: 'references', clave: 'studio.optReferences', opciones: [o('none', 'studio.editorNoReferences')] },
  ],
  videos: [
    { id: 'duration', clave: 'studio.optDuration', opciones: [o('short', 'studio.valShort'), o('medium', 'studio.valMedium'), o('long', 'studio.valLong')] },
    AJUSTES_COMUNES.formato,
    { id: 'motion', clave: 'studio.optMotion', opciones: [o('slow', 'studio.valSlow'), o('dynamic', 'studio.valDynamic')] },
    AJUSTES_COMUNES.estilo,
    AJUSTES_COMUNES.resolucion,
  ],
  voice: [
    { id: 'tone', clave: 'studio.optTone', opciones: [o('neutral', 'studio.valNeutral'), o('close', 'studio.valClose'), o('professional', 'studio.valProfessional')] },
    { id: 'language', clave: 'studio.optLanguage', opciones: [FORMATO] },
  ],
  writer: [
    { id: 'length', clave: 'studio.optLength', opciones: [o('short', 'studio.valShort'), o('medium', 'studio.valMedium'), o('long', 'studio.valLong')] },
    { id: 'tone', clave: 'studio.optTone', opciones: [o('neutral', 'studio.valNeutral'), o('close', 'studio.valClose'), o('professional', 'studio.valProfessional')] },
    { id: 'language', clave: 'studio.optLanguage', opciones: [FORMATO] },
    AJUSTES_COMUNES.formato,
  ],
  documents: [
    { id: 'type', clave: 'studio.optType', opciones: [FORMATO] },
    AJUSTES_COMUNES.formato,
    { id: 'size', clave: 'studio.optSize', opciones: [o('short', 'studio.valShort'), o('medium', 'studio.valMedium'), o('long', 'studio.valLong')] },
  ],
  more: [AJUSTES_COMUNES.formato, AJUSTES_COMUNES.calidad],
};

/** Las herramientas de cada panel, por su área. */
export const HERRAMIENTAS_POR_AREA: Record<Exclude<AreaDeStudio, 'more'>, HerramientaDeStudio[]> = {
  images: HERRAMIENTAS_DE_IMAGEN,
  videos: HERRAMIENTAS_DE_VIDEO,
  voice: HERRAMIENTAS_DE_VOZ,
  writer: HERRAMIENTAS_DE_WRITER,
  documents: HERRAMIENTAS_DE_DOCUMENTOS,
};
