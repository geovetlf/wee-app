/*
 * WEË STUDIO — el sitio donde se crea, en portugués de Portugal (pt-PT).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS. Pasar `i18n/textos/pt/` por una
 * tabla de sustituciones deja un texto que en Portugal se entiende y que allí
 * no escribe nadie, porque la diferencia mayor es GRAMATICAL:
 *
 *   ESTAR A + INFINITIVO, nunca el gerundio: "A criar..." y no "Criando...",
 *   "o que estás a criar" y no "o que você está criando".
 *   TRATO DE "TU", nunca "você": queres, podes, tens, a tua ideia, cria, edita.
 *   ENCLISIS: "ajudo-te", "dá-te", "partilha-a"; y el infinitivo lleva el
 *   clítico delante —"para o vender"— donde Brasil escribe "para vendê-lo".
 *   FUTURO DE SUBJUNTIVO vivo: "o que criares", "quando tiveres".
 *
 * Y el vocabulario, término a término:
 *
 *   ficheiros (no arquivos) · definições (no configurações) · câmara (no câmera)
 *   guião / guiões (no roteiro) · ecrã (no tela) · a personagem (no o personagem)
 *   rever (no revisar) · informação (no informações) · ligar (no conectar)
 *   as minhas criações (con artículo, no "minhas criações")
 *
 * MARCA: "Weë Studio" y "Writer" no se traducen. Los formatos —PDF, MP4, 16:9—
 * y los segundos tampoco cambian de idioma.
 *
 * CUIDADO con los falsos amigos del español: "pronto" no es soon (va "Em
 * breve"), "largo" no es long (va "Longo"), "acento" de voz es "sotaque" y los
 * subtítulos de un video son "legendas".
 */
export const studio: typeof import('../es/studio').studio = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Cria sem limites.',
  /* "Num só lugar": Portugal contrae em+um; Brasil escribe "em um só lugar". */
  description: 'Imagens, vídeos, voz, texto e muito mais.\nTudo num só lugar.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'O que queres criar hoje?',
  addLabel: 'Adicionar',
  referenceLabel: 'Adicionar uma imagem de referência',
  settingsLabel: 'Definições da criação',
  voiceLabel: 'Ditar',
  sendLabel: 'Criar',

  /* ── El editor a pantalla completa ────────────────────────────────────── */
  editorTitle: 'A tua ideia',
  editorPlaceholder: 'Conta em detalhe o que queres criar. Quanto mais claro, melhor fica.',
  editorReferences: 'Referências',
  editorNoReferences: 'Ainda não adicionaste nenhuma',
  editorAddReference: 'Adicionar referência',
  editorCharacters: '{{contador}} caracteres',
  create: 'Criar',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  settingsTitle: 'Definições',
  /* "Estás a criar": el gerundio europeo. Nunca "estás criando". */
  settingsHint: 'Mudam consoante o que estás a criar',
  settingsDone: 'Pronto',
  optFormat: 'Formato',
  optQuality: 'Qualidade',
  optResolution: 'Resolução',
  optStyle: 'Estilo',
  optVariations: 'Variações',
  optReferences: 'Referências',
  optDuration: 'Duração',
  optMotion: 'Movimento',
  /* "Extensão" y no "Tamanho": ese ya es optSize y hablan de cosas distintas. */
  optLength: 'Extensão',
  optTone: 'Tom',
  optLanguage: 'Idioma',
  optType: 'Tipo',
  optSize: 'Tamanho',
  valAuto: 'Automático',
  valSquare: 'Quadrado',
  valPortrait: 'Vertical',
  valLandscape: 'Horizontal',
  valStandard: 'Padrão',
  valHigh: 'Alta',
  valRealistic: 'Realista',
  valIllustration: 'Ilustração',
  valMinimal: 'Minimalista',
  valSlow: 'Suave',
  valDynamic: 'Com movimento',
  valShort: 'Curto',
  valMedium: 'Médio',
  valLong: 'Longo',
  valNeutral: 'Neutro',
  /* "Amigável" y no "Próximo": en un botón, "Próximo" se lee como "siguiente". */
  valClose: 'Amigável',
  valProfessional: 'Profissional',
  valSec5: '5 s',
  valSec10: '10 s',
  valSec15: '15 s',
  valOne: 'Uma',
  valFour: 'Quatro',
  /* Con {{contador}} en las dos formas, el cero de Portugal —que es plural—
   * sale bien: "0 referências". */
  settingsReferences_one: '{{contador}} referência',
  settingsReferences_other: '{{contador}} referências',
  settingsOption: '{{grupo}}: {{opcion}}',

  /* ── Las seis puertas ─────────────────────────────────────────────────── */
  imagesTitle: 'Imagens',
  imagesHint: 'Cria e edita',
  videosTitle: 'Vídeos',
  videosHint: 'Até 15 segundos',
  voiceTitle: 'Voz',
  voiceHint: 'Narração e muito mais',
  writerHint: 'Escreve qualquer conteúdo',
  docsTitle: 'Documentos',
  docsHint: 'PDF, documentos e mais',
  moreTitle: 'Mais ferramentas',
  moreHint: 'Edita, melhora, transforma',

  /* ── Imágenes ─────────────────────────────────────────────────────────── */
  imgFromText: 'Texto para imagem',
  imgFromImage: 'Imagem para imagem',
  imgEdit: 'Editar imagem',
  imgRemoveObject: 'Remover um objeto',
  imgAddObject: 'Adicionar um objeto',
  imgChangeBackground: 'Mudar o fundo',
  imgRemoveBackground: 'Remover o fundo',
  imgChangeStyle: 'Mudar o estilo',
  imgRelight: 'Mudar a luz',
  imgExpand: 'Expandir a imagem',
  imgRestore: 'Restaurar',
  imgEnhance: 'Melhorar',
  imgUpscale: 'Aumentar a resolução',
  imgVariations: 'Variações',
  imgCombine: 'Combinar referências',
  /* En Portugal la personagem es femenina; en Brasil es "o personagem". */
  imgCharacter: 'Manter a personagem',
  imgText: 'Texto dentro da imagem',
  imgFormats: 'Mudar de formato',

  /* ── Videos ───────────────────────────────────────────────────────────── */
  vidFromText: 'Texto para vídeo',
  vidFromImage: 'Imagem para vídeo',
  vidFromImages: 'Várias imagens para vídeo',
  vidFromVideo: 'Vídeo para vídeo',
  vidScene: 'Criar uma cena',
  vidContinue: 'Continuar a cena',
  vidVariations: 'Variações',
  vidMotion: 'Movimento',
  /* "Câmara" en Portugal; "câmera" es la forma brasileña. */
  vidCamera: 'Câmara',
  vidStyle: 'Estilo',
  vidLimit: 'Até 15 segundos por criação',

  /* ── Voz ──────────────────────────────────────────────────────────────── */
  voxFromText: 'Texto para voz',
  voxNarration: 'Narração',
  voxPick: 'Escolher a voz',
  voxLanguage: 'Idioma',
  voxAccent: 'Sotaque',
  voxEmotion: 'Emoção',
  voxTranscribe: 'Transcrever',
  voxSubtitles: 'Legendas',
  voxExtract: 'Extrair o áudio',
  voxEnhance: 'Melhorar a voz',
  voxClean: 'Limpar o áudio',

  /* ── Writer ───────────────────────────────────────────────────────────── */
  wrIdeas: 'Ideias',
  wrPosts: 'Publicações',
  wrCaptions: 'Legendas de foto',
  /* "Guião" es la palabra portuguesa; "roteiro" es de Brasil. */
  wrScripts: 'Guiões',
  wrStories: 'Histórias',
  wrBooks: 'Livros',
  wrArticles: 'Artigos',
  wrBlogs: 'Blogues',
  wrEssays: 'Ensaios',
  wrEmails: 'E-mails',
  wrLetters: 'Cartas',
  /* Como el alemán con "Lebenslauf": "CV" no es un identificador técnico. */
  wrCv: 'Currículo',
  wrDecks: 'Apresentações',
  wrProposals: 'Propostas',
  wrReports: 'Relatórios',
  wrDescriptions: 'Descrições',
  wrAds: 'Publicidade',
  wrVideoScripts: 'Guiões de vídeo',
  wrPodcasts: 'Podcasts',
  wrDialogue: 'Diálogos',
  wrLyrics: 'Letras de música',
  wrSummaries: 'Resumos',
  wrTranslate: 'Traduções',
  wrRewrite: 'Reescrita',
  wrProofread: 'Revisão',
  wrBrainstorm: 'Chuva de ideias',

  /* ── Documentos ───────────────────────────────────────────────────────── */
  docPdf: 'Criar um PDF',
  docDocument: 'Criar um documento',
  docEbook: 'Criar um ebook',
  docGuide: 'Criar um guia',
  docManual: 'Criar um manual',
  docDeck: 'Criar uma apresentação',
  docCatalog: 'Criar um catálogo',
  docBrochure: 'Criar um folheto',
  docImageToPdf: 'Imagem para PDF',
  docToPdf: 'Documento para PDF',
  docPdfToText: 'PDF para texto',
  docSummarize: 'Resumir um PDF',
  docAsk: 'Perguntar sobre um PDF',
  docCompare: 'Comparar documentos',

  /* ── Más herramientas ─────────────────────────────────────────────────── */
  grpImage: 'Imagem',
  grpVideo: 'Vídeo',
  grpAudio: 'Áudio',
  grpText: 'Texto',
  /* "Ficheiros" en Portugal; "arquivos" es de Brasil. */
  grpFiles: 'Ficheiros',
  tlCrop: 'Recortar e redimensionar',
  tlRecolor: 'Mudar a cor',
  tlVidEdit: 'Editar',
  tlVidCut: 'Cortar',
  tlVidJoin: 'Juntar',
  tlVidSubtitles: 'Legendas',
  tlVidSilences: 'Remover os silêncios',
  tlVidEnhance: 'Melhorar',
  tlVidFormat: 'Mudar de formato',
  tlVidClips: 'Extrair clipes',
  tlVidSpeed: 'Velocidade',
  tlVidBackground: 'Remover o fundo',
  tlAudClean: 'Limpar o áudio',
  tlAudNoise: 'Reduzir o ruído',
  tlTxtSummarize: 'Resumir',
  tlTxtRewrite: 'Reescrever',
  /* "Rever" un texto es lo que se dice en Portugal; "revisar" suena brasileño. */
  tlTxtProofread: 'Rever',
  tlTxtTranslate: 'Traduzir',
  tlTxtTone: 'Mudar o tom',
  tlTxtExpand: 'Ampliar',
  tlTxtSimplify: 'Simplificar',
  /* "Informação" en singular: el plural "informações" es brasileño. */
  tlTxtExtract: 'Extrair informação',
  tlFileConvert: 'Converter documentos',

  /* ── Mis creaciones ───────────────────────────────────────────────────── */
  /* Con artículo: "as minhas criações". Brasil lo deja en "minhas criações". */
  creationsTitle: 'As minhas criações',
  seeAll: 'Ver todas',
  /* Futuro de subjuntivo, vivo en Portugal: "o que criares". */
  creationsEmpty: 'O que criares aparece aqui',
  kindImage: 'Imagem',
  kindVideo: 'Vídeo',
  kindAudio: 'Áudio',
  kindDocument: 'Documento',
  creationOptions: 'Opções desta criação',

  /* ── El estado de una creación ────────────────────────────────────────── */
  /* "A criar...", nunca "Criando...": la marca del portugués europeo. */
  creating: 'A criar...',
  ready: 'Criação pronta',
  readyHint: 'Isto é uma demonstração: ainda não foi gerado nada de verdade.',
  dismiss: 'Entendi',

  /* ── Lo que todavía no está conectado ─────────────────────────────────── */
  soon: 'Em breve',
  soonHint: 'Esta ferramenta já tem o seu lugar. Falta ligá-la.',

  /* ── Weë Studio: entradas, experiencias y controles (B3.11) ──────────── */
  textTitle: 'Texto',
  textHint: 'Escreve qualquer conteúdo',
  exploreTitle: 'Explorar',
  charactersTitle: 'Personagens',
  charactersHint: 'Cria alguém e mantém-no igual',
  beautyTitle: 'Beauty',
  beautyHint: 'Na tua foto: cara, cabelo, maquilhagem',
  fashionTitle: 'Fashion',
  fashionHint: 'Roupa, estilo e corpo inteiro',
  continue: 'Continuar',
  needsMaterial: 'Isto começa com uma foto ou vídeo teu',
  noControls: 'Isto não precisa de ajustes de câmara: é só descrever.',
  removeContext: 'Remover',
  ctlCamera: 'Câmara',
  ctlPerspective: 'Perspetiva',
  ctlShot: 'Enquadramento',
  ctlLens: 'Lente',
  ctlMovement: 'Movimento',
  ctlLighting: 'Luz',
  ctlComposition: 'Composição',
  ctlSpeed: 'Ritmo',
  xpPortrait: 'Retrato',
  xpProduct: 'Produto',
  xpEditorial: 'Editorial',
  xpCinematic: 'Cinematográfica',
  xpSocial: 'Redes',
  xpPoster: 'Cartaz',
  xpTravelTime: 'Viagem',
  /* Sin anglicismo: em pt-PT 'time' é brasileirismo e o guard o vigia. */
  xpTimelapse: 'Vídeo acelerado',
  xpMap: 'Mapa explicativo',
  xpWhiteboard: 'Quadro animado',
  xpVidCinematic: 'Cinematográfico',
  xpCharacter: 'Personagem',
  xpVidProduct: 'Produto',
  xpVidSocial: 'Redes',
  xpStory: 'História',
  xpAd: 'Anúncio',
  xpMusicVideo: 'Videoclipe',
  xpMultiScene: 'Várias cenas',
  xpBeforeAfter: 'Antes e depois',
  xpCameraMove: 'Movimento de câmara',
  xpVoiceOver: 'Locução',
  xpCharacterVoice: 'Voz de personagem',
  xpReading: 'Leitura',
  xpCreateCharacter: 'Criar uma personagem',
  xpKeepIdentity: 'Que continue a ser ele',
  xpBeautyLook: 'Mudança de visual',
  xpMakeup: 'Maquilhagem',
  xpHair: 'Cabelo',
  xpAppearance: 'Aparência',
  xpOutfit: 'Look',
  xpFullBody: 'Corpo inteiro',
  xpStyling: 'Styling',
  xpTryOn: 'Experimentar roupa',

  /* ── Cámara y cinemática: el vocabulario, en palabras (B3.11) ────────── */
  camDrone: 'Drone',
  camTopDown: 'De cima',
  camGround: 'Rente ao chão',
  camHandheld: 'Na mão',
  camPov: 'Ponto de vista',
  camMacro: 'Macro',
  perEyeLevel: 'À altura dos olhos',
  perLowAngle: 'De baixo',
  perHighAngle: 'De cima',
  perBirdsEye: 'Vista de pássaro',
  shtEstablishing: 'Plano geral',
  shtWide: 'Plano aberto',
  shtMedium: 'Plano médio',
  shtCloseUp: 'Grande plano',
  shtExtremeCloseUp: 'Grande plano de pormenor',
  shtHero: 'Plano herói',
  lnsWide: 'Grande angular',
  lnsStandard: 'Normal',
  lnsTelephoto: 'Teleobjetiva',
  lnsMacro: 'Macro',
  lnsFisheye: 'Olho de peixe',
  mvStatic: 'Parada',
  mvPushIn: 'Aproximar',
  mvPullOut: 'Afastar',
  mvTracking: 'Acompanhar',
  mvOrbit: 'Girar à volta',
  mvFollow: 'Seguir',
  mvPan: 'Panorâmica',
  mvTilt: 'Inclinação',
  mvCraneUp: 'Subir',
  mvCraneDown: 'Descer',
  ltNatural: 'Natural',
  ltGolden: 'Hora dourada',
  ltBlue: 'Hora azul',
  ltStudio: 'De estúdio',
  ltDramatic: 'Dramática',
  ltSoft: 'Suave',
  ltContrast: 'Muito contraste',
  ltNight: 'À noite',
  cmpCentered: 'Centrada',
  cmpThirds: 'Regra dos terços',
  cmpSymmetrical: 'Simétrica',
  cmpNegative: 'Com respiro',
  cmpDepth: 'Com profundidade',
  spSlow: 'Lento',
  spNormal: 'Normal',
  spFast: 'Rápido',
  smSmooth: 'Suave',
  smNatural: 'Natural',
  smDynamic: 'Com energia',

  /* El nombre corto de una referencia en su ficha. El botón es `referenceLabel`. */
  reference: 'Referência',
};
