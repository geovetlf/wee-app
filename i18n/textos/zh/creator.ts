/*
 * CHINO SIMPLIFICADO — lo que describe cada experiencia de WEË AI. Los nombres —Weë Design, Weë Studio…— son marca y viven en constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ejemplos son lo que ESCRIBE la persona, así que suenan a lo que se teclea de
 * verdad: un sintagma corto («我的新书封面») o una frase entera cuando hay duda
 * («今天不知道做什么菜»). Nada de imperativos de manual.
 *
 * Las cinco claves `area*` llevan el nombre de la experiencia en alfabeto latino y
 * el separador `·` intacto; «Beauty» también es nombre y no se traduce. Weël, Weë
 * e Instagram se quedan igual, con un espacio entre el hanzi y el latín.
 *
 * En `tellTheSpecialist` el hueco es un nombre de marca en alfabeto latino, así que
 * va suelto entre espacios: «告诉 Weë Design 你想做什么».
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'Logo、海报、插画，还有社交媒体素材',
  studio: '用 AI 创作和改造照片与视频。',
  photo: '修复、增强，随心改造你的照片',
  writer: '动态、故事、脚本、邮件和书稿',
  music: '歌曲、器乐、人声和旁白',
  beauty: '妆容、发型、胡须、穿搭和造型改造',
  chef: '你的私人厨师：今天吃什么、菜谱和菜单',
  home: '装饰、室内设计、改造和庭院',
  business: '创业点子、营销、简历、文档和演示文稿',
  travel: '规划你的旅行：去哪儿、玩什么、怎么走',
  brain: '不知道去哪里找？问问 Weë',
  designEx1: '给我的店做个 Logo',
  designEx2: '一条发 Instagram 的帖子',
  designEx3: '我的新书封面',
  studioEx1: '给我的餐厅拍条宣传视频',
  studioEx2: '把我的照片变成视频',
  studioEx3: '用我的产品做一个 Weël',
  photoEx1: '把照片变清晰',
  photoEx2: '去掉照片里多余的东西',
  photoEx3: '换掉照片的背景',
  writerEx1: '给我的视频写个脚本',
  writerEx2: '给客户写一封邮件',
  writerEx3: '帮我改改这段文字',
  musicEx1: '给我的品牌做一段广告歌',
  musicEx2: '给我的视频配背景音乐',
  musicEx3: '把我的文字变成语音',
  beautyEx1: '我留长发会是什么样',
  beautyEx2: '适合派对的造型',
  beautyEx3: '试试别的发色',
  chefEx1: '用家里现有的食材做道菜',
  chefEx2: '一周的健康菜单',
  chefEx3: '今天不知道做什么菜',
  homeEx1: '我的客厅换个风格会怎样',
  homeEx2: '房间装饰的点子',
  homeEx3: '给我的院子设计一个小花园',
  businessEx1: '我的创业计划',
  businessEx2: '更新我的简历',
  businessEx3: '给投资人做一份演示文稿',
  travelEx1: '十月去日本',
  travelEx2: '想找个安静又便宜的海边',
  travelEx3: '不知道去哪里旅行',
  brainEx1: '不知道从哪里开始',
  brainEx2: '用简单的话讲给我听',
  brainEx3: '翻译这段文字',
  areaStudioPhotos: 'Weë Studio · 照片',
  areaStudioVideos: 'Weë Studio · 视频',
  areaStudioBeauty: 'Weë Studio · Beauty',
  areaDesignHome: 'Weë Design · 家居与设计',
  areaHomeName: '家居与设计',
  tellTheSpecialist: '告诉 {{especialista}} 你想做什么：它会问你两三个简单的问题，剩下的交给它。做好之后可以直接发到你的社区。',
};
