/*
 * INDONESIO — Guardados.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Tersimpan» es el nombre de la sección (glosario § 4; nunca el malayo «Disimpan»), igual que en
 * `menu.saved`. En `loadFailed` se le pone sustantivo delante —«postingan Tersimpan Anda»— porque un
 * participio suelto no funciona como nombre en indonesio. «Beranda» es el Home.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Tersimpan',
  empty: 'Anda belum menyimpan apa pun',
  exploreHome: 'Jelajahi Beranda',
  loadFailed: 'Tidak dapat memuat postingan Tersimpan Anda',
  emptyHint: 'Ketuk penanda pada sebuah postingan untuk menyimpan prompt, tutorial, dan karya yang ingin Anda lihat lagi.',
};
