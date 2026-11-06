/*
 * Notificaciones en croata. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El pasado croata lleva género («komentirao/komentirala») y el
 * nombre no se puede declinar, así que las frases van en presente narrativo
 * con el nombre como sujeto («{{nombre}} komentira tvoju objavu»); el «me
 * gusta» se apoya en «Osobi {{nombre}}», que vale para cualquier persona.
 * `aCommunity` va en locativo porque sustituye a {{comunidad}} tras «u».
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Obavijesti',
  empty: 'Nema obavijesti',
  emptyHint: 'Kad netko reagira na tvoje objave ili ti se obrati, to će se pojaviti ovdje',
  allRead: 'Sve su tvoje obavijesti pročitane',
  noneNew: 'Nema novih obavijesti',
  like: 'Osobi {{nombre}} sviđa se tvoja objava',
  comment: '{{nombre}} komentira tvoju objavu',
  follow: '{{nombre}} te sada prati',
  econtactRequest: '{{nombre}} te želi dodati u ËContact',
  econtactAccepted: '{{nombre}} prihvaća tvoj zahtjev za ËContact',
  repost: '{{nombre}} dijeli tvoju objavu',
  mention: '{{nombre}} te spominje',
  reply: '{{nombre}} odgovara na tvoj komentar',
  communityPost: '{{nombre}} objavljuje u {{comunidad}}',
  aCommunity: 'jednoj zajednici',
  generic: 'Nova aktivnost: {{nombre}}',
  now: 'sada',
  markAllRead: 'Označi sve kao pročitano',
  all: 'Sve',
  unread: 'Nepročitane',
  unreadWithCount: 'Nepročitane ({{total}})',
};
