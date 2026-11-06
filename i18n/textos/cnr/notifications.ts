/*
 * Notificaciones en montenegrino (ijekaviano, latino). El nombre de quien la provoca entra por {{nombre}} y no se declina.
 * Los verbos van en presente para no elegir género («komentariše», «dijeli») cuando el español usa pasado.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Obavještenja',
  empty: 'Nema obavještenja',
  emptyHint: 'Kad neko stupi u interakciju s tobom, pojaviće se ovdje',
  allRead: 'Sva tvoja obavještenja su pročitana',
  noneNew: 'Nema novih obavještenja',
  like: 'Korisniku {{nombre}} se sviđa tvoja objava',
  comment: '{{nombre}} komentariše tvoju objavu',
  follow: '{{nombre}} te sada prati',
  econtactRequest: '{{nombre}} želi da te doda u ËContact',
  econtactAccepted: '{{nombre}} prihvata tvoj ËContact zahtjev',
  repost: '{{nombre}} dijeli tvoju objavu',
  mention: '{{nombre}} te pominje',
  reply: '{{nombre}} odgovara na tvoj komentar',
  communityPost: '{{nombre}} objavljuje u {{comunidad}}',
  aCommunity: 'jednoj zajednici',
  generic: '{{nombre}} stupa u interakciju s tobom',
  now: 'sada',
  markAllRead: 'Označi sve kao pročitano',
  all: 'Sva',
  unread: 'Nepročitana',
  unreadWithCount: 'Nepročitana ({{total}})',
};
