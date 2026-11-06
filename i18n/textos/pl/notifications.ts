/*
 * POLACO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * EL PASADO POLACO TIENE GÉNERO («polubił» / «polubiła») y Weë no sabe el de
 * la persona. Por eso las frases van en presente o en forma nominal, que no lo
 * tienen: «{{nombre}} lubi twój post», «{{nombre}} teraz cię obserwuje»,
 * «{{nombre}} jest teraz w twoich ËContact». `aCommunity` va en locativo
 * («społeczności») porque solo se lee detrás de «w».
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Powiadomienia',
  empty: 'Brak powiadomień',
  emptyHint: 'Tu zobaczysz reakcje innych osób na twoją aktywność',
  allRead: 'Wszystkie powiadomienia przeczytane',
  noneNew: 'Brak nowych powiadomień',
  like: '{{nombre}} lubi twój post',
  comment: '{{nombre}} komentuje twój post',
  follow: '{{nombre}} teraz cię obserwuje',
  econtactRequest: '{{nombre}} chce dodać cię do ËContact',
  econtactAccepted: '{{nombre}} jest teraz w twoich ËContact',
  repost: '{{nombre}} udostępnia twój post',
  mention: '{{nombre}} wspomina o tobie',
  reply: '{{nombre}} odpowiada na twój komentarz',
  communityPost: '{{nombre}} publikuje w {{comunidad}}',
  aCommunity: 'społeczności',
  generic: 'Nowa aktywność: {{nombre}}',
  now: 'teraz',
  markAllRead: 'Oznacz wszystkie jako przeczytane',
  all: 'Wszystkie',
  unread: 'Nieprzeczytane',
  unreadWithCount: 'Nieprzeczytane ({{total}})',
};
