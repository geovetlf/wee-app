/*
 * INDONESIO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (glosario § 4): Simpan, Hapus, Batal, Tutup,
 * Kembali, Berikutnya, Selesai, Kirim, Bagikan; verbo base, mayúscula solo al principio y sin punto.
 * `accept` es el botón único de los avisos: «OK», que es lo que lleva cualquier aviso en Indonesia
 * («Terima» sería aceptar a alguien). `retry` es botón y cuerpo de aviso a la vez: «Coba lagi»
 * (nunca el malayo «Cuba lagi»). «Postingan» es invariable: las dos formas del contador son
 * idénticas. `user` entra de sujeto en frases como «{{nombre}} menyukai postingan Anda»: «Pengguna».
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Batal',
  save: 'Simpan',
  delete: 'Hapus',
  close: 'Tutup',
  back: 'Kembali',
  next: 'Berikutnya',
  done: 'Selesai',
  accept: 'OK',
  send: 'Kirim',
  share: 'Bagikan',
  retry: 'Coba lagi',
  mediaUnavailable: 'File ini tidak tersedia',
  loading: 'Memuat…',
  error: 'Kesalahan',
  somethingWentWrong: 'Terjadi kesalahan',
  noResults: 'Tidak ada hasil',
  notAvailable: 'Tidak tersedia',
  comingSoon: 'Segera hadir',
  new: 'Baru',
  seeAll: 'Lihat semua →',
  guest: 'Tamu',
  anonymousUser: 'Pengguna Anonim',
  user: 'Pengguna',
  yes: 'Ya',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'Tidak',
  loadMore: 'Muat lebih banyak postingan',
  postsCount_one: '{{cantidad}} postingan',
  postsCount_other: '{{cantidad}} postingan',
  someone: 'Seseorang',
};
