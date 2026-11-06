/*
 * RUMANO — Notificaciones. El NOMBRE de quien la provoca entra como sujeto, sin artículo ni declinación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notificări',
  empty: 'Nicio notificare',
  emptyHint: 'Când cineva interacționează cu tine, va apărea aici',
  allRead: 'Ai citit toate notificările',
  noneNew: 'Nicio notificare nouă',
  like: '{{nombre}} a apreciat postarea ta',
  comment: '{{nombre}} a comentat la postarea ta',
  follow: '{{nombre}} a început să te urmărească',
  econtactRequest: '{{nombre}} vrea să te adauge în ËContact',
  econtactAccepted: '{{nombre}} a acceptat cererea ta de ËContact',
  repost: '{{nombre}} a redistribuit postarea ta',
  mention: '{{nombre}} te-a menționat',
  reply: '{{nombre}} a răspuns la comentariul tău',
  communityPost: '{{nombre}} a postat în {{comunidad}}',
  aCommunity: 'o comunitate',
  generic: '{{nombre}} a interacționat cu tine',
  now: 'acum',
  markAllRead: 'Marchează-le pe toate ca citite',
  all: 'Toate',
  unread: 'Necitite',
  unreadWithCount: 'Necitite ({{total}})',
};
