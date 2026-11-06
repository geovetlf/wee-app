/*
 * FINÉS — Notificaciones. Tipado contra el español: si allí hay una clave que
 * aquí falta, no compila.
 *
 * El nombre de quien provoca la notificación entra como sujeto en nominativo y
 * el verbo se conjuga en 3.ª persona del pasado («{{nombre}} tykkäsi …»).
 * «Publicó en {{comunidad}}» se dice «julkaisi yhteisössä: {{comunidad}}» con
 * dos puntos, para que el nombre de la comunidad —que escribe una persona— no
 * reciba ninguna terminación de caso. ËContact es marca: «ËContact-pyyntösi».
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Ilmoitukset',
  empty: 'Ei ilmoituksia',
  emptyHint: 'Kun joku on vuorovaikutuksessa kanssasi, se näkyy täällä',
  allRead: 'Olet lukenut kaikki ilmoituksesi',
  noneNew: 'Ei uusia ilmoituksia',
  like: '{{nombre}} tykkäsi julkaisustasi',
  comment: '{{nombre}} kommentoi julkaisuasi',
  follow: '{{nombre}} alkoi seurata sinua',
  econtactRequest: '{{nombre}} haluaa lisätä sinut ËContact-yhteyksiinsä',
  econtactAccepted: '{{nombre}} hyväksyi ËContact-pyyntösi',
  repost: '{{nombre}} jakoi julkaisusi',
  mention: '{{nombre}} mainitsi sinut',
  reply: '{{nombre}} vastasi kommenttiisi',
  communityPost: '{{nombre}} julkaisi yhteisössä: {{comunidad}}',
  aCommunity: 'eräs yhteisö',
  generic: '{{nombre}} oli vuorovaikutuksessa kanssasi',
  now: 'nyt',
  markAllRead: 'Merkitse kaikki luetuiksi',
  all: 'Kaikki',
  unread: 'Lukemattomat',
  unreadWithCount: 'Lukemattomat ({{total}})',
};
