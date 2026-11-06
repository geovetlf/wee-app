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
 * CUANDO NO SE SABE QUIÉN FUE: esta base no tiene frases `<clave>SinNombre`, y la pantalla pone `common.someone`,
 * «Isang user», en el hueco, detrás de «si»/«ni». No es correcto en filipino («ni isang tao» es agramatical): pendiente
 * de la línea que trae esas frases (guía § 12 y § 16, decisión 6).
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
  now: 'ngayon',
  markAllRead: 'Markahan lahat bilang nabasa na',
  all: 'Lahat',
  unread: 'Hindi pa nabasa',
  unreadWithCount: 'Hindi pa nabasa ({{total}})',
};
