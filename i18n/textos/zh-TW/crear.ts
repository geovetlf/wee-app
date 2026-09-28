/*
 * CHINO TRADICIONAL (TAIWÁN) — la pestaña Crear y la pantalla Crear video (2026-09-27).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weë, Weë AI, Weë Creator, Weë Brain, Filmmaker y Credits son marca: se quedan en
 * alfabeto latino dentro del hanzi, con un espacio a cada lado. «Weë AI Director» es
 * «Weë AI 導演»: la marca intacta y el panel Director con la palabra de `filmmaker`.
 * Vocabulario de Taiwán, el mismo que `studio` y `filmmaker`: 影片 (no 視頻), 建立
 * (no 創建), 畫質 para la calidad del vídeo, 提示詞 para el prompt, 長度 para la
 * duración y 景別 · 相機 · 運鏡 · 光線 para las familias de cámara.
 *
 * Las `style…Words` viajan dentro de la idea hacia el generador de vídeo, así que
 * se escriben como las diría alguien en Taiwán: 電影感風格, 寫實風格, 動漫風格.
 * `seconds` conserva «{{segundos}} s», la cifra técnica que el encargo deja igual.
 */
export const crear: typeof import('../es/crear').crear = {
  hubSubtitle: '你想像的一切，都能用 Weë 的 AI 或你自己的照片和影片實現。',
  heroTitle: '把你的想法變成精彩的影片',
  heroText: '告訴 Weë 你想看到什麼：腳本、畫面和配音都交給 AI。',
  heroCta: '建立影片',
  createCta: '開始創作',
  ideaPlaceholder: '描述你想創作的內容…',
  capabilitiesTitle: '你想創作什麼',
  capVideo: '影片',
  capFilmmaker: 'Filmmaker',
  capMore: '更多',
  shareTitle: '在 Weë 上分享',
  creatorTitle: '專業創作',
  creatorText: 'Weë Creator：Filmmaker、時間軸、Weë AI 導演，還有你所有的素材，都在同一個專業的創作空間裡。',
  creatorCta: '開啟 Weë Creator',
  noDestinationTitle: '你想用這個想法做什麼？',
  noDestinationText: '選一個開始的地方。還沒想好的話，Weë Brain 會幫你決定。',
  suggestImage: '一張圖片',
  suggestText: '一段文字',
  suggestBrain: '問問 Weë Brain',
  videoTitle: '建立影片',
  videoPlaceholder: '描述你的影片：誰會出現、在哪裡、發生什麼事、給人什麼感覺…',
  improvePrompt: '優化提示詞',
  improveTitle: '優化你的想法',
  improveText: '加上景別、相機、運鏡和光線。生成時，Weë 會把它們融入你的想法。',
  addPhoto: '讓照片動起來',
  photoToAnimate: '要動起來的照片',
  removeChip: '移除',
  style: '風格',
  styleCinematic: '電影感',
  styleRealistic: '寫實',
  styleAnime: '動漫',
  style3d: '3D',
  styleCinematicWords: '電影感風格',
  styleRealisticWords: '寫實風格',
  styleAnimeWords: '動漫風格',
  style3dWords: '3D 動畫風格',
  duration: '長度',
  seconds: '{{segundos}} s',
  durationFixedWhy: '目前單一片段的影片長 10 秒（讓照片動起來則是 5 秒）。想要其他長度，請使用 Filmmaker。',
  durationFiveWhy: '讓照片動起來的影片長 5 秒：新增一張照片就能選用。',
  durationPhotoWhy: '讓照片動起來時，片段長 5 秒。',
  format: '格式',
  formatVertical: 'Instagram · TikTok',
  formatHorizontal: 'YouTube',
  formatSquare: '方形',
  formatSocial: '社群',
  format45Why: '4:5 格式目前還不支援影片。',
  formatFromPhoto: '讓照片動起來時，影片會沿用照片的格式。',
  advanced: '進階設定',
  typeTitle: '用途是什麼？',
  typeSocial: '用在我的社群平台',
  typePromo: '用來做宣傳',
  typeStory: '講一個故事',
  typeNote: '如果你不選，Weë 會問你，或從你的想法中判斷。',
  quality: '畫質',
  qualityText: '畫質決定影片的細節與精緻程度。確認之前，你會看到確切的價格。',
  qualityPill: '畫質：{{calidad}}',
  qualityStandard: '標準',
  qualityStandardDetail: '可使用',
  qualityHigh: '高',
  qualityMax: '最高',
  quality4k: '4K',
  qualityNotYet: '尚未開放',
  qualityUnavailableWhy: '「高」和「最高」畫質目前在 Weë 上還無法使用：現在影片都以「標準」畫質製作。',
  quality4kWhy: '目前無法使用 4K。',
  generateVideo: '生成影片',
  priceNote: '開始創作前，你會先看到方案和它的 Credits 價格。在你確認之前，不會扣款。',
  proTitle: '專業創作',
  proInCreator: '帶到 Filmmaker 繼續',
  proText: '多個場景、鏡頭、時間軸和 Weë AI 導演，都在 Weë Creator 裡。',
  recentVideos: '你最近的影片',
  noVideosYet: '你還沒有建立過影片。第一支會出現在這裡。',
  seeCreations: '查看我的作品',
};
