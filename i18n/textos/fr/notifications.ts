/*
 * FRANCÉS — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que el verbo francés caiga donde toca.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). ËContact es marca y no se traduce.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notifications',
  empty: 'Aucune notification',
  emptyHint: 'Quand quelqu’un interagit avec toi, ça apparaît ici',
  allRead: 'Tu as lu toutes tes notifications',
  noneNew: 'Aucune nouvelle notification',
  like: '{{nombre}} a aimé ta publication',
  comment: '{{nombre}} a commenté ta publication',
  follow: '{{nombre}} a commencé à te suivre',
  econtactRequest: '{{nombre}} veut t’ajouter à ËContact',
  econtactAccepted: '{{nombre}} a accepté ta demande ËContact',
  repost: '{{nombre}} a partagé ta publication',
  mention: '{{nombre}} t’a mentionné',
  reply: '{{nombre}} a répondu à ton commentaire',
  communityPost: '{{nombre}} a publié dans {{comunidad}}',
  aCommunity: 'une communauté',
  generic: '{{nombre}} a interagi avec toi',
  now: 'maintenant',
  markAllRead: 'Tout marquer comme lu',
  all: 'Toutes',
};
