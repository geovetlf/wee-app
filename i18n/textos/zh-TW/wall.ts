/*
 * CHINO TRADICIONAL (TAIWÁN) — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ESTO NO ES EL SIMPLIFICADO PASADO POR UN CONVERSOR. Convertir 视频 carácter a
 * carácter da 視頻, que en Taiwán se entiende y nadie dice: allí un vídeo es una
 * 影片. Lo mismo con el resto del vocabulario de esta pantalla —貼文 y no 動態,
 * 留言 y no 評論, 社群 y no 社區, 檢舉 y no 舉報, 載入 y no 加載, 傳送 y no 發送—:
 * se escribe como se escribe en Taipéi, no como sale de una tabla.
 *
 * Registro de app moderna: frases cortas, 你 y nunca 您. Puntuación de ancho
 * completo （。，、？：） y UN espacio entre el hanzi y lo que viene en alfabeto
 * latino o en cifras —«發布於 Weë», «還有 3 張»—, nunca entre palabras chinas.
 *
 * EL CHINO NO TIENE PLURAL. `Intl.PluralRules('zh')` solo declara `other`, así que
 * `pollVotes_one`, `pollDaysLeft_one` y `pollHoursLeft_one` NO SE LEEN NUNCA —ni
 * con 1—. Están porque el español las exige y dicen exactamente lo mismo que su
 * `_other`. Lo que sí lleva el chino es clasificador: 票 para los votos, 張 para
 * las imágenes, 天 y 小時 para lo que queda, 則 para las publicaciones.
 *
 * Weë, Wäll, Weëls, Weël y WeeTalk se quedan en alfabeto latino dentro del hanzi:
 * son marca, y eso significa no traducir Y NO PASAR A HANZI. Nada de 牆 por Wäll.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} 轉發了這則貼文',
  repost: '轉發',
  undoRepost: '取消轉發',
  undoRepostConfirm: '取消這則轉發',
  sendByWeeTalk: '透過 WeeTalk 傳送',
  save: '收藏',
  unsave: '取消收藏',
  deletePost: '刪除貼文',
  deletePostConfirm: '確定要刪除這則貼文嗎？',
  deletePostFailed: '無法刪除這則貼文，請再試一次。',
  reportPost: '檢舉貼文',
  reportWhy: '你為什麼要檢舉這則貼文？',
  reportSpam: '垃圾訊息',
  reportOffensive: '不當內容',
  reportOther: '其他原因',
  reportSent: '檢舉已送出',
  reportThanks: '謝謝你的檢舉，我們會盡快處理。',
  sharePost: '分享貼文',
  shareFailed: '無法分享這則貼文，請再試一次。',
  preparingImage: '正在準備圖片…',
  publishedOnWee: '發布於 Weë',
  viewInWeels: '在 Weëls 中觀看',
  moreImages: '還有 {{contador}} 張',
  comment: '留言',
  viewFullVideoInWeels: '在 Weëls 觀看完整影片',
  pollNoVotesYet: '還沒有人投票',
  pollVotes_one: '{{contador}} 票',
  pollVotes_other: '{{contador}} 票',
  pollVoted: '已投票',
  pollClosed: '投票已結束',
  pollDaysLeft_one: '還剩 {{contador}} 天',
  pollDaysLeft_other: '還剩 {{contador}} 天',
  pollHoursLeft_one: '還剩 {{contador}} 小時',
  pollHoursLeft_other: '還剩 {{contador}} 小時',
  pollLessThanAnHour: '不到 1 小時',
  pollLegacy: '這個投票來自舊版 Weë，已經不能再投票了。',
  pollVoteFailed: '無法記錄你的投票',
  closeComments: '收起留言',
  removeImage: '移除圖片',
  attachImage: '新增圖片',
  sendComment: '送出留言',
  onePost: '貼文',
  loadingComments: '正在載入留言…',
  beFirstToComment: '搶先留言吧',
  commentPlaceholder: '寫下你的留言…',
  postNotFound: '找不到這則貼文',
  loadingPosts: '正在載入貼文…',
  loadingMorePosts: '正在載入更多貼文…',
  retry: '重試',
  howIMadeIt: '我是怎麼做的',
  madeWith: '使用的工具',
  holdToCopy: '長按文字就能複製',
  process: '過程：',
  comments: '留言',
  firstCommentHint: '每一場精彩的對話，都從一個想法開始。',
  loadingPost: '正在載入貼文…',
  useInEditor: '在編輯器中使用',
  edit: '編輯',
  publishToCommunity: '發布到我的社群',
  changesAndPurchases: '變更與購買紀錄',
  shareAnonymously: '在 Weë 上匿名說說你的看法',
  statViews: '瀏覽',
  statAgree: '贊同',
  statComments: '留言',
};
