/*
 * WEË STUDIO — el sitio donde se crea, en chino tradicional (norma de Taiwán).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ESTO NO ES EL SIMPLIFICADO CON OTROS CARACTERES. Pasar `i18n/textos/zh/` por
 * una tabla 简→繁 da un texto que en Taiwán se entiende y que allí no escribe
 * nadie: 視頻 por «video» —cuando es 影片—, 設置 por «ajustes» —cuando es 設定—,
 * 分辨率 por «resolución» —cuando es 解析度—. Aquí el vocabulario es el de
 * Taiwán, término a término:
 *
 *   影片 (no 視頻) · 設定 (no 設置) · 解析度 (no 分辨率) · 音訊 (no 音頻)
 *   檔案 = archivo, 文件 = documento (al revés que en China) · 資訊 (no 信息)
 *   建立 (no 創建) · 範本 (no 模板) · 擷取 (no 提取) · 裁切 (no 裁剪)
 *   直式 / 橫式 (no 豎版 / 橫版) · 高畫質 (no 高清) · 貼文 (no 動態)
 *   簡報 (no 演示文稿) · 履歷 (no 簡歷) · 部落格 (no 博客) · 型錄 (no 產品目錄)
 *   腦力激盪 (no 頭腦風暴) · 去背 (no 去除背景) · 物件 (no 物體) · 新增 (no 添加)
 *
 * MARCA: "Weë Studio", "Writer" y el resto de los nombres de Weë van en
 * alfabeto latino dentro del hanzi, nunca traducidos ni transliterados
 * («工作室» no es Studio y «積分» no es Credits). Los formatos técnicos —PDF,
 * MP4, 16:9— tampoco cambian de idioma.
 *
 * PLURALES: el chino no los tiene. `Intl.PluralRules('zh')` declara UNA sola
 * categoría, `other`, así que la forma `_one` NO SE LEE NUNCA —ni con 1— y
 * lleva exactamente el mismo texto que `_other`. La cantidad se dice con su
 * CLASIFICADOR (張 para lo plano, 個 para lo genérico, 秒 para el tiempo), que
 * no cambia con el número. Por eso aquí no hace falta `ConPlurales` ni existen
 * `_few` ni `_many`.
 *
 * ESPACIADO: un espacio entre hanzi y lo que va en alfabeto latino o en cifras
 * —«最長 15 秒», «{{contador}} 張參考圖»—, y ninguno entre palabras chinas ni
 * antes de la puntuación de ancho completo （。，、？！：；）.
 */
export const studio: typeof import('../es/studio').studio = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: '創作，不設限。',
  description: '圖片、影片、語音、文字，還有更多。\n全都在這裡。',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '今天想創作什麼？',
  /* 新增 y no 添加: «añadir» en una interfaz taiwanesa es 新增. */
  addLabel: '新增',
  referenceLabel: '新增一張參考圖',
  settingsLabel: '創作設定',
  voiceLabel: '語音輸入',
  /* El botón que dispara la IA: en chino se dice 生成, no 創作. */
  sendLabel: '生成',

  /* ── El editor a pantalla completa ────────────────────────────────────── */
  editorTitle: '你的想法',
  editorPlaceholder: '詳細說說你想創作什麼。描述越清楚，結果越好。',
  editorReferences: '參考圖',
  editorNoReferences: '還沒有新增參考圖',
  editorAddReference: '新增參考圖',
  /* 字 es el clasificador de caracteres y va tras la cifra, con un espacio. */
  editorCharacters: '{{contador}} 字',
  create: '生成',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  /* 設定 y no 設置: en Taiwán «ajustes» es 設定, sin excepción. */
  settingsTitle: '設定',
  settingsHint: '會隨著你創作的內容而變化',
  settingsDone: '完成',
  optFormat: '畫面比例',
  optQuality: '畫質',
  /* 解析度 y no 分辨率. */
  optResolution: '解析度',
  optStyle: '風格',
  optVariations: '生成數量',
  optReferences: '參考圖',
  /* Solo sale en video: cuánto dura, no cuánto texto. */
  optDuration: '長度',
  optMotion: '動態',
  optLength: '篇幅',
  optTone: '語氣',
  optLanguage: '語言',
  optType: '類型',
  optSize: '尺寸',
  valAuto: '自動',
  valSquare: '方形',
  /* 直式 / 橫式: así se dice la orientación en Taiwán. */
  valPortrait: '直式',
  valLandscape: '橫式',
  valStandard: '標準',
  valHigh: '高畫質',
  valRealistic: '寫實',
  valIllustration: '插畫',
  valMinimal: '極簡',
  valSlow: '柔和',
  valDynamic: '有動感',
  valShort: '簡短',
  valMedium: '適中',
  valLong: '詳盡',
  valNeutral: '中性',
  valClose: '親切',
  valProfessional: '專業',
  /* Las duraciones que Weë sabe hacer: un Weël llega a quince segundos. */
  valSec5: '5 秒',
  valSec10: '10 秒',
  valSec15: '15 秒',
  /* 個 y no 張: estas variaciones también pueden ser videos. */
  valOne: '1 個',
  valFour: '4 個',
  /*
   * Cuántas referencias viajan con la creación. El chino no distingue una de
   * varias: las dos formas dicen lo mismo porque `_one` no se lee nunca.
   */
  settingsReferences_one: '{{contador}} 張參考圖',
  settingsReferences_other: '{{contador}} 張參考圖',
  /* Lo que lee un lector de pantalla en cada píldora: "畫面比例: 直式". */
  settingsOption: '{{grupo}}：{{opcion}}',

  /* ── Las seis puertas ─────────────────────────────────────────────────── */
  imagesTitle: '圖片',
  imagesHint: '生成與編輯',
  /* 影片 y no 視頻: en Taiwán un video es un 影片. */
  videosTitle: '影片',
  videosHint: '最長 15 秒',
  voiceTitle: '語音',
  voiceHint: '旁白、配音，還有更多',
  writerHint: '什麼內容都能寫',
  /* 文件 = documento en Taiwán; el archivo es 檔案 (ver `grpFiles`). */
  docsTitle: '文件',
  docsHint: 'PDF、文件等',
  moreTitle: '更多工具',
  moreHint: '編輯、優化、轉換',

  /* ── Imágenes ─────────────────────────────────────────────────────────── */
  imgFromText: '文字生成圖片',
  imgFromImage: '圖片生成圖片',
  imgEdit: '編輯圖片',
  /* 物件 y no 物體: «objeto» en una interfaz taiwanesa es 物件. */
  imgRemoveObject: '消除物件',
  imgAddObject: '新增物件',
  imgChangeBackground: '更換背景',
  /* 去背 es la palabra que usa cualquiera que trabaje con imágenes en Taiwán. */
  imgRemoveBackground: '去背',
  imgChangeStyle: '更換風格',
  imgRelight: '調整光線',
  imgExpand: '擴展圖片',
  imgRestore: '照片修復',
  imgEnhance: '畫質增強',
  imgUpscale: '提升解析度',
  imgVariations: '生成變化版本',
  imgCombine: '融合參考圖',
  imgCharacter: '保持人物一致',
  imgText: '圖片中的文字',
  imgFormats: '轉換畫面比例',

  /* ── Videos ───────────────────────────────────────────────────────────── */
  vidFromText: '文字生成影片',
  vidFromImage: '圖片生成影片',
  vidFromImages: '多張圖片生成影片',
  vidFromVideo: '影片生成影片',
  vidScene: '建立場景',
  vidContinue: '延續場景',
  vidVariations: '生成變化版本',
  vidMotion: '畫面動態',
  vidCamera: '鏡頭',
  vidStyle: '風格',
  vidLimit: '每次最長 15 秒',

  /* ── Voz ──────────────────────────────────────────────────────────────── */
  voxFromText: '文字轉語音',
  voxNarration: '旁白',
  voxPick: '選擇音色',
  voxLanguage: '語言',
  voxAccent: '口音',
  voxEmotion: '情緒',
  voxTranscribe: '語音轉文字',
  voxSubtitles: '字幕',
  /* 擷取 y no 提取; 音訊 y no 音頻. */
  voxExtract: '擷取音訊',
  voxEnhance: '人聲增強',
  voxClean: '音訊清理',

  /* ── Writer ───────────────────────────────────────────────────────────── */
  wrIdeas: '創意',
  /* 貼文 y no 動態: en Taiwán una publicación de redes es un 貼文. */
  wrPosts: '貼文',
  wrCaptions: '圖說',
  wrScripts: '腳本',
  wrStories: '故事',
  wrBooks: '書籍',
  wrArticles: '文章',
  wrBlogs: '部落格',
  wrEssays: '隨筆',
  wrEmails: '電子郵件',
  wrLetters: '信件',
  /* 履歷 y no 簡歷. */
  wrCv: '履歷',
  /* 簡報 y no 演示文稿: en Taiwán una presentación es un 簡報. */
  wrDecks: '簡報',
  wrProposals: '提案',
  wrReports: '報告',
  wrDescriptions: '描述文案',
  wrAds: '廣告文案',
  wrVideoScripts: '影片腳本',
  wrPodcasts: 'Podcast',
  wrDialogue: '對白',
  wrLyrics: '歌詞',
  wrSummaries: '摘要',
  wrTranslate: '翻譯',
  wrRewrite: '改寫',
  wrProofread: '校對',
  /* 腦力激盪 y no 頭腦風暴. */
  wrBrainstorm: '腦力激盪',

  /* ── Documentos ───────────────────────────────────────────────────────── */
  /* 建立 y no 創建: «crear» en una interfaz taiwanesa es 建立. */
  docPdf: '建立 PDF',
  docDocument: '建立文件',
  docEbook: '建立電子書',
  docGuide: '建立指南',
  docManual: '建立手冊',
  docDeck: '建立簡報',
  /* 型錄 y no 產品目錄. */
  docCatalog: '建立產品型錄',
  docBrochure: '建立宣傳手冊',
  /* 轉 y no 生成: aquí solo cambia el formato, no hay nada que generar. */
  docImageToPdf: '圖片轉 PDF',
  docToPdf: '文件轉 PDF',
  docPdfToText: 'PDF 轉文字',
  docSummarize: '總結 PDF',
  docAsk: '向 PDF 提問',
  docCompare: '比較文件',

  /* ── Más herramientas ─────────────────────────────────────────────────── */
  grpImage: '圖片',
  grpVideo: '影片',
  grpAudio: '音訊',
  grpText: '文字',
  /* 檔案 = archivo. En Taiwán 文件 es el documento, no el archivo. */
  grpFiles: '檔案',
  tlCrop: '裁切與調整尺寸',
  tlRecolor: '更換顏色',
  tlVidEdit: '剪輯',
  tlVidCut: '分割',
  tlVidJoin: '合併',
  tlVidSubtitles: '字幕',
  tlVidSilences: '去除靜音片段',
  tlVidEnhance: '畫質增強',
  tlVidFormat: '轉換畫面比例',
  tlVidClips: '擷取片段',
  tlVidSpeed: '變速',
  tlVidBackground: '去背',
  tlAudClean: '音訊清理',
  tlAudNoise: '降噪',
  tlTxtSummarize: '總結',
  tlTxtRewrite: '改寫',
  tlTxtProofread: '校對',
  tlTxtTranslate: '翻譯',
  tlTxtTone: '調整語氣',
  tlTxtExpand: '擴寫',
  tlTxtSimplify: '簡化',
  /* 資訊 y no 信息. */
  tlTxtExtract: '擷取資訊',
  tlFileConvert: '轉換文件格式',

  /* ── Mis creaciones ───────────────────────────────────────────────────── */
  creationsTitle: '我的作品',
  seeAll: '查看全部',
  creationsEmpty: '你創作的內容會出現在這裡',
  kindImage: '圖片',
  kindVideo: '影片',
  kindAudio: '音訊',
  kindDocument: '文件',
  creationOptions: '這個創作的選項',

  /* ── El estado de una creación ────────────────────────────────────────── */
  creating: '正在生成…',
  ready: '創作完成',
  readyHint: '這是示範：還沒有真正生成任何內容。',
  dismiss: '知道了',

  /* ── Lo que todavía no está conectado ─────────────────────────────────── */
  soon: '即將上線',
  /* 串接 es como se dice en Taiwán conectar con una API. */
  soonHint: '這個工具的位置已經留好了，還差串接。',

  /* ── Weë Studio: entradas, experiencias y controles (B3.11) ──────────── */
  textTitle: '文字',
  textHint: '寫任何內容',
  exploreTitle: '探索',
  charactersTitle: '角色',
  charactersHint: '創造一個角色並保持一致',
  beautyTitle: 'Beauty',
  beautyHint: '在你的照片上：臉、髮型、妝容',
  fashionTitle: 'Fashion',
  fashionHint: '服裝、風格與全身',
  continue: '繼續',
  needsMaterial: '這需要先有你的照片或影片',
  noControls: '這裡不需要相機設定，描述一下就好。',
  removeContext: '移除',
  ctlCamera: '相機',
  ctlPerspective: '視角',
  ctlShot: '景別',
  ctlLens: '鏡頭',
  ctlMovement: '運鏡',
  ctlLighting: '光線',
  ctlComposition: '構圖',
  ctlSpeed: '節奏',
  xpPortrait: '人像',
  xpProduct: '產品',
  xpEditorial: '時尚大片',
  xpCinematic: '電影感',
  xpSocial: '社群',
  xpPoster: '海報',
  xpTravelTime: '旅行',
  xpTimelapse: '縮時攝影',
  xpMap: '講解地圖',
  xpWhiteboard: '手繪白板',
  xpVidCinematic: '電影感',
  xpCharacter: '角色',
  xpVidProduct: '產品',
  xpVidSocial: '社群',
  xpStory: '故事',
  xpAd: '廣告',
  xpMusicVideo: '音樂錄影帶',
  xpMultiScene: '多場景',
  xpBeforeAfter: '前後對比',
  xpCameraMove: '運鏡',
  xpVoiceOver: '配音',
  xpCharacterVoice: '角色配音',
  xpReading: '朗讀',
  xpCreateCharacter: '建立角色',
  xpKeepIdentity: '保持同一個人',
  xpBeautyLook: '換個造型',
  xpMakeup: '妝容',
  xpHair: '髮型',
  xpAppearance: '外貌',
  xpOutfit: '穿搭',
  xpFullBody: '全身',
  xpStyling: '造型',
  xpTryOn: '試穿',

  /* ── Cámara y cinemática: el vocabulario, en palabras (B3.11) ────────── */
  camDrone: '空拍',
  camTopDown: '俯視',
  camGround: '貼地',
  camHandheld: '手持',
  camPov: '第一視角',
  camMacro: '微距',
  perEyeLevel: '平視',
  perLowAngle: '仰拍',
  perHighAngle: '俯拍',
  perBirdsEye: '鳥瞰',
  shtEstablishing: '定場鏡頭',
  shtWide: '遠景',
  shtMedium: '中景',
  shtCloseUp: '特寫',
  shtExtremeCloseUp: '大特寫',
  shtHero: '主角鏡頭',
  lnsWide: '廣角',
  lnsStandard: '標準',
  lnsTelephoto: '長焦',
  lnsMacro: '微距',
  lnsFisheye: '魚眼',
  mvStatic: '固定',
  mvPushIn: '推近',
  mvPullOut: '拉遠',
  mvTracking: '橫移',
  mvOrbit: '環繞',
  mvFollow: '跟隨',
  mvPan: '橫搖',
  mvTilt: '縱搖',
  mvCraneUp: '升起',
  mvCraneDown: '下降',
  ltNatural: '自然光',
  ltGolden: '黃金時刻',
  ltBlue: '藍調時刻',
  ltStudio: '棚拍光',
  ltDramatic: '戲劇光',
  ltSoft: '柔光',
  ltContrast: '高對比',
  ltNight: '夜景',
  cmpCentered: '置中',
  cmpThirds: '三分法',
  cmpSymmetrical: '對稱',
  cmpNegative: '留白',
  cmpDepth: '前景縱深',
  spSlow: '慢',
  spNormal: '正常',
  spFast: '快',
  smSmooth: '平滑',
  smNatural: '自然',
  smDynamic: '動感',

  /* El nombre corto de una referencia en su ficha. El botón es `referenceLabel`. */
  reference: '參考圖',

  /* Por qué una experiencia todavía no se puede hacer (B3.14). Medido, no «pronto». */
  pendMusic: "Weë 還不會作曲。缺的是音樂，不是影片。",
  pendCompose: "Weë 還不會把多個場景接成一支影片。",
  pendTwoRefs: "Weë 目前只能帶一張參考圖，而這裡需要兩張。",
  sampleLake: '群山間的湖泊',
  sampleWarmRoom: '暖色調的客廳',
  sampleNarration: '中文旁白',
  sampleDocument: '好想法，成就更好的人',

  /* 3D World (misión mundo3d, 2026-10-05): de una foto, un mundo 3D. «3D World» sigue la regla de Beauty y Fashion. */
  world3dTitle: '3D World',
  world3dHint: '從照片到 3D 世界',
  xpCreateWorld: '建立 3D 世界',
  pendWorld: 'Weë 還不會生成 3D 世界。',
  worldIntro: '選一張某個地方的照片，Weë 會把它變成 3D 世界。你可以在「我的作品」中找到它。',
  worldChangePhoto: '更換照片',
  worldYourWords: '你描述的內容',
  worldSpaceQuestion: '這個地方是室外還是室內？',
  worldSpaceOutdoor: '🌳 室外',
  worldSpaceIndoor: '🏠 室內',
  worldSpaceIdk: '🤷 不知道',
  worldCreateFor: '用 {{credits}} Credits 生成',
  worldPriceChanged: '價格在你查看後有變動，生成前請再確認一下。',
  worldQueued: '排隊中',
  worldGenerating: '正在生成你的 3D 世界…',
  worldStopping: '正在停止…',
  worldStoppingNote: '如果 3D 世界在停止前已經完成，它會儲存在你的作品中，並扣除 Credits。',
  worldCancelledNote: '我已停止創作。預留的 Credits 會退回你的餘額。',
  worldUploadFailed: '沒能上傳你的照片，請再試一次。',
  worldDailyLimit: '今天的 3D 世界已經用完了。沒有生成成功的會退還給你，次數每天都會重置。',
};
