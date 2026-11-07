/*
 * ITALIANO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí, para que el verbo italiano caiga donde toca.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). ËContact es marca y no se traduce. "Mi piace" es
 * el nombre del gesto en italiano y va con mayúscula, como en el resto de la app.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notifiche',
  empty: 'Nessuna notifica',
  emptyHint: 'Quando qualcuno interagisce con te, appare qui',
  allRead: 'Hai letto tutte le tue notifiche',
  noneNew: 'Nessuna notifica nuova',
  like: 'A {{nombre}} piace il tuo post',
  comment: '{{nombre}} ha commentato il tuo post',
  follow: '{{nombre}} ha iniziato a seguirti',
  econtactRequest: '{{nombre}} vuole aggiungerti a ËContact',
  econtactAccepted: '{{nombre}} ha accettato la tua richiesta ËContact',
  repost: '{{nombre}} ha condiviso il tuo post',
  mention: '{{nombre}} ti ha menzionato',
  reply: '{{nombre}} ha risposto al tuo commento',
  communityPost: '{{nombre}} ha pubblicato in {{comunidad}}',
  aCommunity: 'una community',
  generic: '{{nombre}} ha interagito con te',
  /* Cuando no se sabe quién fue: en este idioma, la misma frase de siempre (ver es/notifications.ts). */
  likeSinNombre: 'A {{nombre}} piace il tuo post',
  commentSinNombre: '{{nombre}} ha commentato il tuo post',
  followSinNombre: '{{nombre}} ha iniziato a seguirti',
  econtactRequestSinNombre: '{{nombre}} vuole aggiungerti a ËContact',
  econtactAcceptedSinNombre: '{{nombre}} ha accettato la tua richiesta ËContact',
  repostSinNombre: '{{nombre}} ha condiviso il tuo post',
  mentionSinNombre: '{{nombre}} ti ha menzionato',
  replySinNombre: '{{nombre}} ha risposto al tuo commento',
  communityPostSinNombre: '{{nombre}} ha pubblicato in {{comunidad}}',
  genericSinNombre: '{{nombre}} ha interagito con te',
  now: 'adesso',
  markAllRead: 'Segna tutte come lette',
  all: 'Tutte',
  unread: 'Non lette',
  unreadWithCount: 'Non lette ({{total}})',
};
