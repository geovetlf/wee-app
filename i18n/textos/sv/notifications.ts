/*
 * SUECO — Notificaciones (Aviseringar): lo que otras personas hicieron contigo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Notificaciones» es «Aviseringar», como en Android, YouTube y Meta (glosario 9.2). El nombre de
 * quien avisa entra por `{{nombre}}` y la pantalla lo pinta en negrita partiendo la frase por el
 * hueco, así que cada frase lo lleva UNA vez; va de sujeto, al principio, y el verbo en pretérito
 * detrás («{{nombre}} gillade ditt inlägg»), el orden sueco de siempre. Su repuesto,
 * `common.user` («Användare»), encaja igual. `repost` dice «återpublicerade» (glosario 9.2: el
 * aviso llega cuando alguien republica). ËContact no se declina: «i ËContact» y, delante de un
 * sustantivo, con guion: «din ËContact-förfrågan». `communityPost` recibe el nombre de la
 * comunidad o, si falta, `aCommunity` («en community»), y los dos caben detrás de «i». `now` es
 * «nu», lo mismo que escribe `Intl` para el instante.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Aviseringar',
  empty: 'Inga aviseringar',
  emptyHint: 'När någon interagerar med dig visas det här',
  allRead: 'Du har läst alla aviseringar',
  noneNew: 'Inga nya aviseringar',
  like: '{{nombre}} gillade ditt inlägg',
  comment: '{{nombre}} kommenterade ditt inlägg',
  follow: '{{nombre}} började följa dig',
  econtactRequest: '{{nombre}} vill lägga till dig i ËContact',
  econtactAccepted: '{{nombre}} accepterade din ËContact-förfrågan',
  repost: '{{nombre}} återpublicerade ditt inlägg',
  mention: '{{nombre}} nämnde dig',
  reply: '{{nombre}} svarade på din kommentar',
  communityPost: '{{nombre}} publicerade i {{comunidad}}',
  aCommunity: 'en community',
  generic: '{{nombre}} interagerade med dig',
  /* Cuando no se sabe quién fue: en este idioma, la misma frase de siempre (ver es/notifications.ts). */
  likeSinNombre: '{{nombre}} gillade ditt inlägg',
  commentSinNombre: '{{nombre}} kommenterade ditt inlägg',
  followSinNombre: '{{nombre}} började följa dig',
  econtactRequestSinNombre: '{{nombre}} vill lägga till dig i ËContact',
  econtactAcceptedSinNombre: '{{nombre}} accepterade din ËContact-förfrågan',
  repostSinNombre: '{{nombre}} återpublicerade ditt inlägg',
  mentionSinNombre: '{{nombre}} nämnde dig',
  replySinNombre: '{{nombre}} svarade på din kommentar',
  communityPostSinNombre: '{{nombre}} publicerade i {{comunidad}}',
  genericSinNombre: '{{nombre}} interagerade med dig',
  now: 'nu',
  markAllRead: 'Markera alla som lästa',
  all: 'Alla',
  unread: 'Olästa',
  unreadWithCount: 'Olästa ({{total}})',
};
