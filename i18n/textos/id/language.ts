/*
 * INDONESIO — Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del idioma NO va aquí: lo pone el registro de locales. «Segera hadir» es el mismo
 * «Próximamente» de `common.comingSoon`.
 */
export const language: typeof import('../es/language').language = {
  title: 'Bahasa',
  explanation: 'Ubah bahasa antarmuka Weë. Postingan dan komentar tetap tampil persis seperti yang ditulis oleh setiap orang.',
  comingSoon: 'Segera hadir',
  comingSoonTitle: 'Sedang disiapkan',
  selected: 'Dipilih',
};
