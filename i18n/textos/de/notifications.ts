/*
 * ALEMÁN — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que el verbo alemán caiga donde toca.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). ËContact es marca y no se traduce.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Mitteilungen',
  empty: 'Keine Mitteilungen',
  emptyHint: 'Wenn jemand mit dir interagiert, erscheint es hier',
  allRead: 'Du hast alle deine Mitteilungen gelesen',
  noneNew: 'Keine neuen Mitteilungen',
  like: '{{nombre}} gefällt dein Beitrag',
  comment: '{{nombre}} hat deinen Beitrag kommentiert',
  follow: '{{nombre}} folgt dir jetzt',
  econtactRequest: '{{nombre}} möchte dich zu ËContact hinzufügen',
  econtactAccepted: '{{nombre}} hat deine ËContact-Anfrage angenommen',
  repost: '{{nombre}} hat deinen Beitrag geteilt',
  mention: '{{nombre}} hat dich erwähnt',
  reply: '{{nombre}} hat auf deinen Kommentar geantwortet',
  communityPost: '{{nombre}} hat in {{comunidad}} gepostet',
  aCommunity: 'einer Community',
  generic: '{{nombre}} hat mit dir interagiert',
  /* Cuando no se sabe quién fue: en este idioma, la misma frase de siempre (ver es/notifications.ts). */
  likeSinNombre: '{{nombre}} gefällt dein Beitrag',
  commentSinNombre: '{{nombre}} hat deinen Beitrag kommentiert',
  followSinNombre: '{{nombre}} folgt dir jetzt',
  econtactRequestSinNombre: '{{nombre}} möchte dich zu ËContact hinzufügen',
  econtactAcceptedSinNombre: '{{nombre}} hat deine ËContact-Anfrage angenommen',
  repostSinNombre: '{{nombre}} hat deinen Beitrag geteilt',
  mentionSinNombre: '{{nombre}} hat dich erwähnt',
  replySinNombre: '{{nombre}} hat auf deinen Kommentar geantwortet',
  communityPostSinNombre: '{{nombre}} hat in {{comunidad}} gepostet',
  genericSinNombre: '{{nombre}} hat mit dir interagiert',
  now: 'jetzt',
  markAllRead: 'Alle als gelesen markieren',
  all: 'Alle',
  unread: 'Ungelesen',
  unreadWithCount: 'Ungelesen ({{total}})',
};
