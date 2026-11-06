/*
 * NORUEGO BOKMÅL — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Varsler',
  empty: 'Ingen varsler',
  emptyHint: 'Når noen samhandler med deg, dukker det opp her',
  allRead: 'Du har lest alle varslene dine',
  noneNew: 'Ingen nye varsler',
  like: '{{nombre}} likte innlegget ditt',
  comment: '{{nombre}} kommenterte innlegget ditt',
  follow: '{{nombre}} begynte å følge deg',
  econtactRequest: '{{nombre}} vil legge deg til i ËContact',
  econtactAccepted: '{{nombre}} godtok forespørselen din om ËContact',
  repost: '{{nombre}} delte innlegget ditt',
  mention: '{{nombre}} nevnte deg',
  reply: '{{nombre}} svarte på kommentaren din',
  communityPost: '{{nombre}} publiserte i {{comunidad}}',
  aCommunity: 'et fellesskap',
  generic: '{{nombre}} samhandlet med deg',
  now: 'nå',
  markAllRead: 'Merk alle som lest',
  all: 'Alle',
  unread: 'Uleste',
  unreadWithCount: 'Uleste ({{total}})',
};
