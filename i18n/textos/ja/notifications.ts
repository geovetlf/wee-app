/*
 * JAPONÉS — Notificaciones: lo que otras personas hicieron contigo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre va SOLO, sin さん (guía § 2 y § 8: al contar lo que hizo otra
 * persona no se añade honorífico, como en la notificación de muestra de LINE),
 * y la frase entera se queda alrededor de {{nombre}}, que el código pinta en
 * negrita partiendo la frase por ahí. あなた aparece porque el objeto de la
 * notificación es quien la lee: sin él, «あなたの投稿» no se distingue de
 * cualquier otro. Una solicitud de ËContact es リクエスト. `repost` es
 * リポストしました aunque el español diga «compartió»: el aviso llega cuando
 * alguien REPOSTEA (`notificationService`), y リポスト es el nombre del botón
 * en el muro; 共有 es la hoja de compartir del teléfono, que Weë no ve.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: '通知',
  empty: '通知はありません',
  emptyHint: '誰かからの反応があると、ここに表示されます',
  allRead: '通知はすべて既読です',
  noneNew: '新しい通知はありません',
  like: '{{nombre}}があなたの投稿にいいねしました',
  comment: '{{nombre}}があなたの投稿にコメントしました',
  follow: '{{nombre}}があなたをフォローしました',
  econtactRequest: '{{nombre}}からËContactのリクエストが届きました',
  econtactAccepted: '{{nombre}}がËContactのリクエストを承認しました',
  repost: '{{nombre}}があなたの投稿をリポストしました',
  mention: '{{nombre}}があなたをメンションしました',
  reply: '{{nombre}}があなたのコメントに返信しました',
  communityPost: '{{nombre}}が{{comunidad}}に投稿しました',
  aCommunity: 'コミュニティ',
  generic: '{{nombre}}があなたに反応しました',
  now: 'たった今',
  markAllRead: 'すべて既読にする',
  all: 'すべて',
  unread: '未読',
  unreadWithCount: '未読（{{total}}）',
};
