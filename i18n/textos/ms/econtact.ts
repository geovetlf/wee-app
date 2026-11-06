/*
 * MALAYO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El malayo no marca el plural: `count_one` y `count_other` son idénticas y llevan `{{contador}}`.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Permintaan diterima',
  requestsSent: 'Permintaan dihantar',
  yours: '{{lista}} anda',
  yoursWhenYouSignIn: '{{lista}} anda, selepas anda log masuk',
  yoursWhenYouSignInSubtitle: '{{lista}} menyimpan hubungan Weë anda. Log masuk untuk melihatnya.',
  noneYet: 'Anda belum mempunyai {{lista}}',
  noneYetSubtitle: 'Di sinilah orang anda di Weë akan berada. Hubungan dibuat antara dua orang: seorang mencadangkan dan seorang lagi menerima.',
  noAgenda: 'Profil ini tiada senarai kenalan',
  noAgendaSubtitle: '{{lista}} ialah tempat hubungan anda dengan orang lain berada. Tukar ke Profil Sebenar atau Profil Weë anda untuk melihatnya.',
  wantsToConnect: '{{lista}} · ingin berhubung dengan anda',
  accept: 'Terima {{nombre}}',
  reject: 'Tolak {{nombre}}',
  withdraw: 'Tarik balik permintaan kepada {{nombre}}',
  removeFrom: 'Buang {{nombre}} daripada {{lista}} anda',
  openProfile: 'Buka {{etiqueta}} {{nombre}}',
  rejectTitle: 'Tolak permintaan',
  rejectConfirm: 'Tolak permintaan daripada {{nombre}}?',
  withdrawTitle: 'Tarik balik permintaan',
  withdrawConfirm: 'Tarik balik permintaan anda kepada {{nombre}}?',
  removeTitle: 'Buang {{lista}}',
  removeConfirm: 'Buang {{nombre}} daripada {{lista}} anda?',
  failed: 'Tidak dapat diselesaikan',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'orang ini',
  acceptLabel: 'Terima {{lista}}',
  rejectRequestLabel: 'Tolak permintaan {{lista}}',
  requestSent: 'Permintaan dihantar',
  errSignIn: 'Log masuk untuk menggunakan ËContact.',
  errNotYours: 'Profil itu bukan milik anda.',
  errNotAPerson: 'Profil itu tidak boleh menggunakan ËContact.',
  errSameProfile: 'Sesuatu profil tidak boleh berhubung dengan dirinya sendiri.',
  errOffline: 'Tidak dapat berhubung dengan Weë.',
  errNoRequestToReject: 'Tiada permintaan untuk anda tolak.',
  errNoPendingRequest: 'Anda tiada permintaan yang belum selesai dengan profil ini.',
  errNotConnected: 'Anda tidak berhubung dengan profil ini.',
  errNoActiveProfile: 'Tiada profil aktif untuk melakukan ini.',
};
