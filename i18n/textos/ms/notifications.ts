/*
 * MALAYO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Pemberitahuan',
  empty: 'Tiada pemberitahuan',
  emptyHint: 'Apabila seseorang berinteraksi dengan anda, pemberitahuan akan muncul di sini',
  allRead: 'Anda telah membaca semua pemberitahuan anda',
  noneNew: 'Tiada pemberitahuan baharu',
  like: '{{nombre}} menyukai siaran anda',
  comment: '{{nombre}} mengulas siaran anda',
  follow: '{{nombre}} mula mengikuti anda',
  econtactRequest: '{{nombre}} ingin menambah anda ke ËContact',
  econtactAccepted: '{{nombre}} menerima permintaan ËContact anda',
  repost: '{{nombre}} berkongsi siaran anda',
  mention: '{{nombre}} menyebut anda',
  reply: '{{nombre}} membalas komen anda',
  communityPost: '{{nombre}} menyiarkan di {{comunidad}}',
  aCommunity: 'sebuah komuniti',
  generic: '{{nombre}} berinteraksi dengan anda',
  now: 'sekarang',
  markAllRead: 'Tandakan semua sebagai telah dibaca',
  all: 'Semua',
  unread: 'Belum dibaca',
  unreadWithCount: 'Belum dibaca ({{total}})',
};
