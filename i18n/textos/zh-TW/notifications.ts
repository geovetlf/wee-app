/*
 * CHINO TRADICIONAL (TAIWÁN) — notificaciones. El NOMBRE de quien la provoca
 * entra como valor y no se traduce; la frase entera sí, para que en otros
 * idiomas el verbo pueda ir donde toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── LOS VERBOS SOCIALES DE TAIWÁN ──────────────────────────────────────────
 *
 * Dar un me gusta es 按讚 —nunca 點贊—, comentar es 留言 —no 評論—, seguir a
 * alguien es 追蹤 —no 關注— y lo que se publica es un 貼文 —no un 動態—. Son
 * las palabras que se leen en Taiwán, no el simplificado con otros trazos.
 *
 * En chino el sujeto va delante y el verbo detrás, así que `{{nombre}}` abre
 * siempre la frase y lleva UN espacio hasta el hanzi: sirve igual para un
 * nombre en latino que para uno escrito en hanzi. La pantalla parte la frase
 * por el hueco para poner el nombre en negrita, y el resto se lee tal cual.
 *
 * ËContact es marca: se queda en alfabeto latino y no pasa a hanzi.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: '通知',
  empty: '沒有通知',
  emptyHint: '有人和你互動時，會出現在這裡',
  allRead: '你已經看完所有通知了',
  noneNew: '沒有新通知',
  like: '{{nombre}} 對你的貼文按讚',
  comment: '{{nombre}} 在你的貼文留言',
  follow: '{{nombre}} 開始追蹤你',
  econtactRequest: '{{nombre}} 想把你加進 ËContact',
  econtactAccepted: '{{nombre}} 接受了你的 ËContact 邀請',
  repost: '{{nombre}} 轉發了你的貼文',
  mention: '{{nombre}} 提到了你',
  reply: '{{nombre}} 回覆了你的留言',
  communityPost: '{{nombre}} 在 {{comunidad}} 發了貼文',
  aCommunity: '某個社群',
  generic: '{{nombre}} 和你互動了',
  now: '剛剛',
  markAllRead: '全部標示為已讀',
  all: '全部',
  unread: '未讀',
  unreadWithCount: '未讀（{{total}}）',
};
