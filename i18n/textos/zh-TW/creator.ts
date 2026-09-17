/*
 * CHINO TRADICIONAL (TAIWÁN) — lo que describe cada experiencia de WEË AI. Los nombres —Weë Design, Weë Studio…— son marca y viven en constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * VOCABULARIO DE TAIWÁN, NO CONVERSIÓN DE CARACTERES: un vídeo es una 影片 y nunca
 * 視頻; el marketing es 行銷 y no 營銷; el CV es un 履歷; una presentación es un
 * 簡報 y no 演示文稿; una receta es una 食譜; el pelo es 髮 （髮型, 長髮, 髮色）; la
 * decoración de una casa es 裝潢; un plan es un 計畫; y el hogar de la sección es
 * 居家, no 家居.
 *
 * Los ejemplos son lo que ESCRIBE la persona, así que suenan a lo que se teclea de
 * verdad: un sintagma corto («我的新書封面») o una frase entera cuando hay duda
 * («今天不知道要煮什麼»). Nada de imperativos de manual.
 *
 * Las cinco claves `area*` llevan el nombre de la experiencia en alfabeto latino y
 * el separador `·` intacto; «Beauty» también es nombre y no se traduce. Weël, Weë
 * e Instagram se quedan igual, con un espacio entre el hanzi y el latín.
 *
 * En `tellTheSpecialist` el hueco es un nombre de marca en alfabeto latino, así que
 * va suelto entre espacios: «告訴 Weë Design 你想做什麼».
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'Logo、海報、插畫，還有社群媒體素材',
  studio: '用 AI 創作和改造照片與影片。',
  photo: '修復、增強，隨心改造你的照片',
  writer: '貼文、故事、腳本、郵件和書稿',
  music: '歌曲、純音樂、人聲和旁白',
  beauty: '妝容、髮型、鬍鬚、穿搭和造型改造',
  chef: '你的私人廚師：今天吃什麼、食譜和菜單',
  home: '裝潢、室內設計、翻修和庭院',
  business: '創業點子、行銷、履歷、文件和簡報',
  travel: '規劃你的旅行：去哪裡、玩什麼、怎麼走',
  brain: '不知道去哪裡找？問問 Weë',
  designEx1: '幫我的店做一個 Logo',
  designEx2: '要發到 Instagram 的貼文',
  designEx3: '我的新書封面',
  studioEx1: '幫我的餐廳拍一支宣傳影片',
  studioEx2: '把我的照片變成影片',
  studioEx3: '用我的產品做一個 Weël',
  photoEx1: '把照片變清晰',
  photoEx2: '去掉照片裡多餘的東西',
  photoEx3: '換掉照片的背景',
  writerEx1: '幫我的影片寫一段腳本',
  writerEx2: '寫一封信給客戶',
  writerEx3: '幫我改改這段文字',
  musicEx1: '幫我的品牌做一段廣告歌',
  musicEx2: '幫我的影片配背景音樂',
  musicEx3: '把我的文字變成語音',
  beautyEx1: '我留長髮會是什麼樣子',
  beautyEx2: '適合派對的造型',
  beautyEx3: '試試別的髮色',
  chefEx1: '用家裡現有的食材做一道菜',
  chefEx2: '一週的健康菜單',
  chefEx3: '今天不知道要煮什麼',
  homeEx1: '我的客廳換個風格會怎樣',
  homeEx2: '房間佈置的點子',
  homeEx3: '幫我的院子設計一個小花園',
  businessEx1: '我的創業計畫',
  businessEx2: '更新我的履歷',
  businessEx3: '做一份給投資人看的簡報',
  travelEx1: '十月去日本',
  travelEx2: '想找個安靜又便宜的海邊',
  travelEx3: '不知道要去哪裡旅行',
  brainEx1: '不知道要從哪裡開始',
  brainEx2: '用簡單的話講給我聽',
  brainEx3: '翻譯這段文字',
  areaStudioPhotos: 'Weë Studio · 照片',
  areaStudioVideos: 'Weë Studio · 影片',
  areaStudioBeauty: 'Weë Studio · Beauty',
  areaDesignHome: 'Weë Design · 居家與設計',
  areaHomeName: '居家與設計',
  tellTheSpecialist: '告訴 {{especialista}} 你想做什麼：它會問你兩三個簡單的問題，剩下的交給它。做好之後可以直接發到你的社群。',
};
