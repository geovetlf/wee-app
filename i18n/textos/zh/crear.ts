/*
 * CHINO SIMPLIFICADO — la pantalla Crear video de Weë Studio.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë —Weë, Weë AI, Weë Studio, Weë Brain, Filmmaker, Credits—
 * son marca: se quedan en alfabeto latino dentro del hanzi, con un espacio a
 * cada lado. «Weë AI Director» es «Weë AI 导演»: la marca intacta y el panel
 * con el nombre que ya tiene en `filmmaker.director`.
 *
 * Las palabras de cada estilo (`style…Words`) viajan dentro de la idea hacia
 * el vídeo, así que se escriben como las teclearía una persona: «电影感风格».
 * La calidad es 画质 y el formato 画幅, como en `filmmaker` y `studio`; la
 * duración de las fichas se queda en «{{segundos}} s», que es como la escriben
 * los editores de vídeo chinos.
 */
export const crear: typeof import('../es/crear').crear = {
  videoTitle: '创作视频',
  videoPlaceholder: '描述你的视频：谁出镜、在哪里、发生了什么、给人什么感觉…',
  improvePrompt: '优化提示词',
  improveTitle: '完善你的想法',
  improveText: '加上景别、相机、运镜和光线。创作时，Weë 会把它们融入你的想法。',
  addPhoto: '让照片动起来',
  photoToAnimate: '要动起来的照片',
  removeChip: '移除',
  style: '风格',
  styleCinematic: '电影感',
  styleRealistic: '写实',
  styleAnime: '动漫',
  style3d: '3D',
  styleCinematicWords: '电影感风格',
  styleRealisticWords: '写实风格',
  styleAnimeWords: '动漫风格',
  style3dWords: '3D 动画风格',
  duration: '时长',
  seconds: '{{segundos}} s',
  durationFixedWhy: '目前，单个片段的视频时长为 10 秒（让照片动起来时为 5 秒）。需要其他时长，请使用 Filmmaker。',
  durationFiveWhy: '5 秒是让照片动起来时的时长：先添加一张照片，才能选择它。',
  durationPhotoWhy: '让照片动起来时，片段时长为 5 秒。',
  format: '画幅',
  formatVertical: 'Instagram · TikTok',
  formatHorizontal: 'YouTube',
  formatSquare: '方形',
  formatSocial: '社交媒体',
  format45Why: '视频暂时还不支持 4:5 画幅。',
  formatFromPhoto: '让照片动起来时，视频会沿用照片的画幅。',
  advanced: '高级设置',
  typeTitle: '用来做什么？',
  typeSocial: '发到我的社交媒体',
  typePromo: '宣传推广',
  typeStory: '讲一个故事',
  typeNote: '如果你不选，Weë 会问你，或者根据你的想法来判断。',
  quality: '画质',
  qualityText: '画质决定视频的细节和精细程度。确认之前，你会看到准确的价格。',
  qualityPill: '画质：{{calidad}}',
  qualityStandard: '标准',
  qualityStandardDetail: '可用',
  qualityHigh: '高',
  qualityMax: '最高',
  quality4k: '4K',
  qualityNotYet: '暂未开放',
  qualityUnavailableWhy: '“高”和“最高”画质在 Weë 中暂不可用：目前视频都以“标准”画质生成。',
  quality4kWhy: '4K 目前不可用。',
  generateVideo: '生成视频',
  priceNote: '创作之前，你会先看到方案和所需的 Credits。你确认之前，不会扣费。',
  proTitle: '专业创作',
  proInCreator: '转到 Filmmaker 继续',
  proText: '多个场景、镜头、时间线和 Weë AI 导演，都在 Weë Studio 里。',
  recentVideos: '你最近的视频',
  noVideosYet: '你还没有创作过视频。第一支视频会出现在这里。',
  seeCreations: '查看我的作品',
};
