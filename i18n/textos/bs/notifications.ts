/*
 * BOSNIO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El pasado bosnio marca el género («komentarisao / komentarisala») y la app
 * no lo sabe, así que las frases van en presente neutro («{{nombre}} te sada
 * prati») o con el nombre en dativo mediante puente («Korisniku {{nombre}} se
 * sviđa…»). El nombre nunca se declina.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Obavještenja',
  empty: 'Nema obavještenja',
  emptyHint: 'Ovdje ćeš vidjeti kad neko reaguje na tvoje objave ili ti se obrati',
  allRead: 'Sva tvoja obavještenja su pročitana',
  noneNew: 'Nema novih obavještenja',
  like: 'Korisniku {{nombre}} se sviđa tvoja objava',
  comment: '{{nombre}} komentariše tvoju objavu',
  follow: '{{nombre}} te sada prati',
  econtactRequest: '{{nombre}} te želi dodati u ËContact',
  econtactAccepted: '{{nombre}} prihvata tvoj ËContact zahtjev',
  repost: '{{nombre}} dijeli tvoju objavu',
  mention: '{{nombre}} te spominje',
  reply: '{{nombre}} odgovara na tvoj komentar',
  communityPost: '{{comunidad}}: {{nombre}} ima novu objavu',
  aCommunity: 'Zajednica',
  generic: '{{nombre}} reaguje na tvoju aktivnost',
  now: 'sada',
  markAllRead: 'Označi sve kao pročitano',
  all: 'Sva',
  unread: 'Nepročitana',
  unreadWithCount: 'Nepročitana ({{total}})',
};
