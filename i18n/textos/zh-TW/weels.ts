/*
 * CHINO TRADICIONAL (TAIWÁN) — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weël y Weëls son MARCA: se quedan en alfabeto latino, no se transliteran y NO
 * se cambian por la palabra común que significan (no son 短影片). Dentro del
 * hanzi llevan UN espacio a cada lado, y donde el chino pedía un sustantivo
 * detrás —影片, 範例— se apoya en él en vez de forzar la marca.
 *
 * En Taiwán un video es un 影片, nunca un 視頻; cargar es 載入, no 加載; crear
 * es 建立, no 創建; y una comunidad es un 社群, no un 社區.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: '分享 Weël',
  empty: '還沒有 Weëls',
  emptyHint: '用 + 按鈕建立第一個',
  loadFailed: '無法載入 Weëls',
  rowSubtitle: '看看社群創作的影片。',
  seeAll: '查看全部 Weëls',
  create: '建立 Weël',
  createFirst: '你的第一個 Weël',
  open: '查看 Weël',
  upTo15s: '最長 15 秒',
  noneYetHint: '社群還沒有 Weëls。下面的範例先讓你看看它們長什麼樣。',
  sampleAiScene: 'AI 場景',
  sampleDance: '舞蹈',
  sampleRecipe: '食譜',
  sampleTrip: '旅行',
  recordVideo: '拍攝影片',
  pickVideo: '從相簿選擇',
  changeVideo: '更換影片',
  preview: 'Weël 預覽',
  requirements: '最長 {{segundos}} 秒的直式影片',
  descriptionLabel: 'Weël 簡介',
  descriptionPlaceholder: '用幾句話說說你的 Weël 在講什麼…',
  publish: '發布 Weël',
  uploading: '正在上傳你的影片…',
  publishing: '正在發布你的 Weël…',
  publishFailed: '無法發布你的 Weël，影片仍保留在這裡。',
  horizontalTitle: '這是橫式影片',
  horizontalBody: 'Weëls 以直式全螢幕觀看。仍要使用嗎？',
  horizontalAccept: '仍要使用',
  cameraForVideo: '要拍攝 Weël，Weë 需要使用相機。',
  galleryForVideo: '要為 Weël 選擇影片，Weë 需要存取你的相簿。',
};
