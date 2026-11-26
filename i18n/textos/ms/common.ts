/*
 * MALAYO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (guía § 4): Simpan, Padam, Batal, Tutup,
 * Kembali, Seterusnya, Selesai, Hantar, Kongsi; verbo base, mayúscula solo al principio y sin
 * punto. `accept` es el botón único de los avisos: «OK». `retry` es botón y cuerpo de aviso a la
 * vez: «Cuba lagi». «Siaran» es invariable: el plural del malayo solo tiene «other».
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Batal',
  save: 'Simpan',
  delete: 'Padam',
  close: 'Tutup',
  back: 'Kembali',
  next: 'Seterusnya',
  done: 'Selesai',
  accept: 'OK',
  send: 'Hantar',
  share: 'Kongsi',
  retry: 'Cuba lagi',
  mediaUnavailable: 'Fail ini tidak tersedia',
  loading: 'Memuatkan…',
  error: 'Ralat',
  somethingWentWrong: 'Ada sesuatu yang tidak kena',
  noResults: 'Tiada hasil',
  notAvailable: 'Tidak tersedia',
  comingSoon: 'Akan datang',
  new: 'Baharu',
  seeAll: 'Lihat semua →',
  guest: 'Tetamu',
  anonymousUser: 'Pengguna tanpa nama',
  user: 'Pengguna',
  yes: 'Ya',
  no: 'Tidak',
  loadMore: 'Muatkan lebih banyak siaran',
  postsCount_one: '{{cantidad}} siaran',
  postsCount_other: '{{cantidad}} siaran',
  someone: 'Seseorang',
};
