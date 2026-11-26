/*
 * BAHASA INDONESIA — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Sapaan «Anda», seperti seluruh kamus. «encargo» = «permintaan».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Hapus akun',
  sectionDanger: 'Zona berbahaya',
  title: 'Hapus akun',
  goesFaces: 'Semua profil Anda: Profil Asli dan alter ego Anda',
  goesCharacter: 'Karakter Anda dan avatarnya',
  goesPosts: 'Postingan, komentar, dan reaksi Anda',
  goesMessages: 'Pesan WeeTalk Anda: isinya dikosongkan, dan percakapan orang lain tetap ada tanpa pesan-pesan itu',
  goesCreations: 'Karya, proyek, dan percakapan Weë AI Anda',
  goesContacts: 'Kontak, komunitas, dan item tersimpan Anda',
  goesCredits: 'Sisa Credits Anda: hangus dan tidak dikembalikan',
  whatStaysTitle: 'Yang tetap disimpan',
  staysRecords: 'Catatan akuntansi Credits dan pembayaran. Catatan ini disimpan tanpa nama Anda atau data profil Anda, karena merupakan pembukuan Weë.',
  confirmLabel: 'Untuk mengonfirmasi, ketik "{{palabra}}"',
  confirmWord: 'HAPUS',
  confirmPlaceholder: 'Ketik kata di sini',
  dialogTitle: 'Hapus akun Anda?',
  dialogConfirm: 'Hapus',
  doneTitle: 'Akun Anda telah dihapus',
  doneBody: 'Terima kasih telah menjadi bagian dari Weë.',
  reauthTitle: 'Masuk lagi',
  reauthBody: 'Demi keamanan, untuk menghapus akun Anda harus baru saja masuk. Keluar, masuk lagi, lalu ulangi langkah-langkah ini.',
  reauthButton: 'Keluar untuk masuk lagi',
  errorTitle: 'Tidak dapat diselesaikan',
  errorBody: 'Ada yang gagal di tengah jalan. Coba lagi: prosesnya akan dilanjutkan dari titik terakhir.',
  retry: 'Coba lagi',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Akun dinonaktifkan dan, setelah 30 hari, semuanya dihapus',
  introDesactivar: 'Akun Anda dinonaktifkan sekarang dan, jika Anda tidak kembali dalam 30 hari, semuanya dihapus selamanya.',
  nowTitle: 'Yang terjadi sekarang',
  nowHidden: 'Akun Anda tidak lagi terlihat: tidak ada yang akan melihat profil atau postingan Anda',
  nowCharacterOff: 'Otonomi karakter Anda dimatikan dan tidak lagi dikenai biaya',
  nowComeBack_one: 'Anda punya waktu {{contador}} hari untuk kembali: masuk lagi dan pilih "Aktifkan akun"',
  nowComeBack_other: 'Anda punya waktu {{contador}} hari untuk kembali: masuk lagi dan pilih "Aktifkan akun"',
  whatGoesLaterTitle: 'Yang dihapus jika Anda tidak kembali',
  deactivateButton: 'Hapus akun saya',
  dialogBodyDesactivar: 'Akun Anda tidak akan terlihat lagi. Jika Anda tidak kembali dalam 30 hari, semuanya akan dihapus dan tidak bisa dipulihkan.',
  deactivating: 'Menonaktifkan akun Anda…',
  deactivatedTitle: 'Akun Anda dinonaktifkan',
  deactivatedBody: 'Anda punya waktu hingga {{fecha}} untuk kembali. Setelah itu, semuanya akan dihapus selamanya.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Akun Anda dinonaktifkan',
  activarBody: 'Anda meminta penghapusan akun. Selama akun dinonaktifkan, tidak ada yang bisa melihat profil atau postingan Anda.',
  activarDaysLeft_one: 'Tersisa {{contador}} hari sebelum penghapusan permanen',
  activarDaysLeft_other: 'Tersisa {{contador}} hari sebelum penghapusan permanen',
  activarDate: 'Jika tidak Anda aktifkan, akun akan dihapus selamanya pada {{fecha}}.',
  activarCharacterNote: 'Otonomi karakter Anda akan tetap mati; Anda bisa menjadwalkannya lagi kapan saja.',
  activarButton: 'Aktifkan akun',
  activating: 'Mengaktifkan akun Anda…',
  activatedTitle: 'Akun Anda aktif kembali',
  activarExpiredTitle: 'Batas waktu untuk kembali sudah berakhir',
  activarExpiredBody: 'Akun Anda akan dihapus sepenuhnya dalam beberapa jam ke depan.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Sisa {{creditos}} Credits Anda: hangus dan tidak dikembalikan',
};
