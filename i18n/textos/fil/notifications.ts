/*
 * FILIPINO — Notificaciones (Mga notification): lo que otras personas hicieron contigo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Notificaciones» es «Mga notification» (glosario 11.1; «Mga abiso» descartado). El nombre de quien avisa entra
 * por `{{nombre}}` y la pantalla lo pinta en negrita partiendo la frase por el hueco, así que cada frase lo lleva UNA
 * vez. En filipino el verbo va delante y el nombre detrás, con el marcador de persona que pide el foco del verbo
 * (glosario 11.6 y § 12): «ni» cuando lo hecho recae en lo tuyo —«Nagustuhan ni {{nombre}} ang post mo»,
 * «Ibinahagi ni…», «Tinanggap ni…», «Na-mention ka ni…», «Gusto kang idagdag ni…»— y «si» cuando la persona es quien
 * actúa —«Nagkomento si…», «Nag-follow sa iyo si…», «Sumagot si…», «Nag-post si {{nombre}} sa {{comunidad}}»—. Es la
 * forma de Facebook en filipino. Sin punto final, como el español.
 *
 * ËContact no se declina ni lleva afijos: «sa ËContact» y, delante de un sustantivo, marca + sustantivo, «ang
 * ËContact request mo» (§ 6). `communityPost` recibe el nombre de la comunidad o, si falta, `aCommunity` («isang
 * komunidad»), y los dos caben detrás de «sa». «Interactuar» es «makipag-interact», como se dice en redes. `now` es
 * «ngayon», lo mismo que escribe `Intl` (§ 12). Los estados vacíos usan «Wala pang …» (§ 10); «No leídas», «Hindi pa
 * nabasa» (glosario 11.4), y «Marcar todas como leídas», «Markahan lahat bilang nabasa na».
 *
 * `sinNombre` (CUANDO NO SE SABE QUIÉN FUE): «si»/«ni» no admiten un sustantivo común («ni isang tao» es
 * agramatical), así que estas frases van SIN `{{nombre}}` y con el «May …» de quien no se sabe quién es (guía § 12 y
 * decisión cerrada 6): «May nag-like sa post mo», «May nagkomento sa post mo», «May gustong magdagdag sa iyo sa
 * ËContact»… El `{{comunidad}}` de `communityPost` se queda. Que aquí falte `{{nombre}}` es a propósito: sin él, la
 * pantalla no pinta ningún nombre en negrita. La solicitud aceptada va en pasiva, «Tinanggap ang ËContact request
 * mo»: con «May tumanggap…» el objeto definido («ang request mo») no encaja en el foco de quien actúa.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Mga notification',
  empty: 'Wala pang notification',
  emptyHint: 'Lalabas dito kapag may nakipag-interact sa iyo',
  allRead: 'Nabasa mo na ang lahat ng notification mo',
  noneNew: 'Walang bagong notification',
  like: 'Nagustuhan ni {{nombre}} ang post mo',
  comment: 'Nagkomento si {{nombre}} sa post mo',
  follow: 'Nag-follow sa iyo si {{nombre}}',
  econtactRequest: 'Gusto kang idagdag ni {{nombre}} sa ËContact',
  econtactAccepted: 'Tinanggap ni {{nombre}} ang ËContact request mo',
  repost: 'Ibinahagi ni {{nombre}} ang post mo',
  mention: 'Na-mention ka ni {{nombre}}',
  reply: 'Sumagot si {{nombre}} sa komento mo',
  communityPost: 'Nag-post si {{nombre}} sa {{comunidad}}',
  aCommunity: 'isang komunidad',
  generic: 'Nakipag-interact sa iyo si {{nombre}}',
  /* Cuando no se sabe quién fue: frases sin nombre, con «May …» (ver la cabecera y es/notifications.ts). */
  likeSinNombre: 'May nag-like sa post mo',
  commentSinNombre: 'May nagkomento sa post mo',
  followSinNombre: 'May nag-follow sa iyo',
  econtactRequestSinNombre: 'May gustong magdagdag sa iyo sa ËContact',
  econtactAcceptedSinNombre: 'Tinanggap ang ËContact request mo',
  repostSinNombre: 'May nagbahagi ng post mo',
  mentionSinNombre: 'May nag-mention sa iyo',
  replySinNombre: 'May sumagot sa komento mo',
  communityPostSinNombre: 'May nag-post sa {{comunidad}}',
  genericSinNombre: 'May nakipag-interact sa iyo',
  now: 'ngayon',
  markAllRead: 'Markahan lahat bilang nabasa na',
  all: 'Lahat',
  unread: 'Hindi pa nabasa',
  unreadWithCount: 'Hindi pa nabasa ({{total}})',
};
