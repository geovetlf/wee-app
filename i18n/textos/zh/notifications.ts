/*
 * CHINO SIMPLIFICADO — notificaciones. El NOMBRE de quien la provoca entra como
 * valor y no se traduce; la frase entera sí, para que en otros idiomas el verbo
 * pueda ir donde toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
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
  empty: '没有通知',
  emptyHint: '有人和你互动时，会出现在这里',
  allRead: '你已经看完所有通知了',
  noneNew: '没有新通知',
  like: '{{nombre}} 赞了你的动态',
  comment: '{{nombre}} 评论了你的动态',
  follow: '{{nombre}} 关注了你',
  econtactRequest: '{{nombre}} 想把你加进 ËContact',
  econtactAccepted: '{{nombre}} 接受了你的 ËContact 请求',
  repost: '{{nombre}} 转发了你的动态',
  mention: '{{nombre}} 提到了你',
  reply: '{{nombre}} 回复了你的评论',
  communityPost: '{{nombre}} 在 {{comunidad}} 发了动态',
  aCommunity: '某个社区',
  generic: '{{nombre}} 和你互动了',
  now: '刚刚',
  markAllRead: '全部标为已读',
  all: '全部',
  unread: '未读',
  unreadWithCount: '未读（{{total}}）',
};
