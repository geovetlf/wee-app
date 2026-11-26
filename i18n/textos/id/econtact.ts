/*
 * INDONESIO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran
 * como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El posesivo va detrás: «{{lista}} Anda» («ËContact Anda»). El plural indonesio no tiene «one»: las dos
 * formas de `count` son idénticas y llevan `{{contador}}`. «Agenda» (la libreta de contactos) es «daftar
 * kontak». `openProfile` recibe la etiqueta del perfil («Profil Asli» / «Profil Weë») y el nombre:
 * «Buka Profil Asli Ana».
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'Permintaan diterima',
  requestsSent: 'Permintaan terkirim',
  yours: '{{lista}} Anda',
  yoursWhenYouSignIn: '{{lista}} Anda, setelah Anda masuk',
  yoursWhenYouSignInSubtitle: '{{lista}} menyimpan koneksi Anda di Weë. Masuk untuk melihatnya.',
  noneYet: 'Anda belum punya {{lista}}',
  noneYetSubtitle: 'Di sini akan ada orang-orang Anda di Weë. Koneksi terbentuk dari dua pihak: satu orang mengajukan dan yang lain menerima.',
  noAgenda: 'Profil ini tidak memiliki daftar kontak',
  noAgendaSubtitle: '{{lista}} adalah tempat koneksi Anda dengan orang lain. Beralih ke Profil Asli atau Profil Weë Anda untuk melihatnya.',
  wantsToConnect: '{{lista}} · ingin terhubung dengan Anda',
  accept: 'Terima {{nombre}}',
  reject: 'Tolak {{nombre}}',
  withdraw: 'Tarik permintaan ke {{nombre}}',
  removeFrom: 'Hapus {{nombre}} dari {{lista}} Anda',
  openProfile: 'Buka {{etiqueta}} {{nombre}}',
  rejectTitle: 'Tolak permintaan',
  rejectConfirm: 'Tolak permintaan dari {{nombre}}?',
  withdrawTitle: 'Tarik permintaan',
  withdrawConfirm: 'Tarik permintaan Anda ke {{nombre}}?',
  removeTitle: 'Hapus {{lista}}',
  removeConfirm: 'Hapus {{nombre}} dari {{lista}} Anda?',
  failed: 'Tidak dapat diselesaikan',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'orang ini',
  acceptLabel: 'Terima {{lista}}',
  rejectRequestLabel: 'Tolak permintaan {{lista}}',
  requestSent: 'Permintaan terkirim',
  errSignIn: 'Masuk untuk menggunakan ËContact.',
  errNotYours: 'Profil itu bukan milik Anda.',
  errNotAPerson: 'Profil itu tidak dapat menggunakan ËContact.',
  errSameProfile: 'Sebuah profil tidak dapat terhubung dengan dirinya sendiri.',
  errOffline: 'Tidak dapat terhubung ke Weë.',
  errNoRequestToReject: 'Tidak ada permintaan yang dapat Anda tolak.',
  errNoPendingRequest: 'Anda tidak memiliki permintaan tertunda dengan profil ini.',
  errNotConnected: 'Anda tidak terhubung dengan profil ini.',
  errNoActiveProfile: 'Tidak ada profil aktif untuk melakukan ini.',
};
