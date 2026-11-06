/*
 * INDONESIO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase
 * entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El sujeto va delante y el verbo con prefijo «me-» («{{nombre}} menyukai postingan Anda»), que es el
 * orden natural del indonesio. «Notifikasi» (nunca el malayo «Pemberitahuan»). «Baru saja» es el
 * «ahora» de una marca de tiempo.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Notifikasi',
  empty: 'Tidak ada notifikasi',
  emptyHint: 'Saat seseorang berinteraksi dengan Anda, notifikasinya akan muncul di sini',
  allRead: 'Anda sudah membaca semua notifikasi',
  noneNew: 'Tidak ada notifikasi baru',
  like: '{{nombre}} menyukai postingan Anda',
  comment: '{{nombre}} mengomentari postingan Anda',
  follow: '{{nombre}} mulai mengikuti Anda',
  econtactRequest: '{{nombre}} ingin menambahkan Anda ke ËContact',
  econtactAccepted: '{{nombre}} menerima permintaan ËContact Anda',
  repost: '{{nombre}} membagikan postingan Anda',
  mention: '{{nombre}} menyebut Anda',
  reply: '{{nombre}} membalas komentar Anda',
  communityPost: '{{nombre}} memposting di {{comunidad}}',
  aCommunity: 'sebuah komunitas',
  generic: '{{nombre}} berinteraksi dengan Anda',
  now: 'baru saja',
  markAllRead: 'Tandai semua sudah dibaca',
  all: 'Semua',
  unread: 'Belum dibaca',
  unreadWithCount: 'Belum dibaca ({{total}})',
};
