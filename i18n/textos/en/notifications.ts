/*
 * Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que en otros idiomas el verbo pueda ir donde toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notifications',
  empty: 'No notifications',
  emptyHint: 'When someone interacts with you, it will show up here',
  allRead: 'You have read all your notifications',
  noneNew: 'No new notifications',
  like: '{{nombre}} liked your post',
  comment: '{{nombre}} commented on your post',
  follow: '{{nombre}} started following you',
  econtactRequest: '{{nombre}} wants to add you to ËContact',
  econtactAccepted: '{{nombre}} accepted your ËContact request',
  repost: '{{nombre}} shared your post',
  mention: '{{nombre}} mentioned you',
  reply: '{{nombre}} replied to your comment',
  communityPost: '{{nombre}} posted in {{comunidad}}',
  aCommunity: 'a community',
  generic: '{{nombre}} interacted with you',
  now: 'now',
  markAllRead: 'Mark all as read',
  all: 'All',
  unread: 'Unread',
  unreadWithCount: 'Unread ({{total}})',
};
