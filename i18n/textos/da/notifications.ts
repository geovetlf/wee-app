/*
 * DANÉS — Notificaciones (Notifikationer): lo que otras personas hicieron contigo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Notificaciones» es «Notifikationer», como en Apple y en las redes sociales (glosario 9.1). El
 * nombre de quien avisa entra por `{{nombre}}` y la pantalla lo pinta en negrita partiendo la
 * frase por el hueco, así que cada frase lo lleva UNA vez; va de sujeto, al principio, y el verbo
 * detrás, el orden danés de siempre. Su repuesto, `common.user` («Bruger»), encaja igual. «Me
 * gusta» es «synes godt om», en presente, como lo dice Facebook en danés (glosario 9.2); el resto
 * va en pretérito. `comment` es «kommenterede dit opslag», sin el «på» del inglés (guía § 2).
 * `repost` dice «delte dit opslag»: es otra persona la que comparte lo tuyo («Del igen» es la
 * acción propia). `follow` usa el perfecto «er begyndt at følge dig», la forma de Instagram.
 * ËContact no se declina: «til ËContact» y, delante de un sustantivo, con guion: «din
 * ËContact-anmodning» (anmodning, glosario 9.6). `communityPost` recibe el nombre de la comunidad
 * o, si falta, `aCommunity` («et fællesskab»), y los dos caben detrás de «i»; «skrev et opslag»
 * evita «slå op i», que también es «buscar en». `now` es «nu», lo mismo que escribe `Intl`.
 * `markAllRead` lleva acento (Markér), de la lista cerrada de la guía (§ 3).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notifikationer',
  empty: 'Ingen notifikationer',
  emptyHint: 'Når nogen interagerer med dig, dukker det op her',
  allRead: 'Du har læst alle dine notifikationer',
  noneNew: 'Ingen nye notifikationer',
  like: '{{nombre}} synes godt om dit opslag',
  comment: '{{nombre}} kommenterede dit opslag',
  follow: '{{nombre}} er begyndt at følge dig',
  econtactRequest: '{{nombre}} vil tilføje dig til ËContact',
  econtactAccepted: '{{nombre}} accepterede din ËContact-anmodning',
  repost: '{{nombre}} delte dit opslag',
  mention: '{{nombre}} nævnte dig',
  reply: '{{nombre}} svarede på din kommentar',
  communityPost: '{{nombre}} skrev et opslag i {{comunidad}}',
  aCommunity: 'et fællesskab',
  generic: '{{nombre}} interagerede med dig',
  now: 'nu',
  markAllRead: 'Markér alle som læst',
  all: 'Alle',
  unread: 'Ulæste',
  unreadWithCount: 'Ulæste ({{total}})',
};
