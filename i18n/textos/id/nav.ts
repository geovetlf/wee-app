/*
 * INDONESIO — Los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `home` es «Beranda» (glosario § 4), igual que `menu.home`. «Pergi ke …» es el «Ir a …» de las
 * etiquetas de accesibilidad; se distingue de «Buka Weë AI» (abrir), que es otro botón.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Beranda',
  search: 'Cari',
  create: 'Buat',
  talk: 'WeeTalk',
  notifications: 'Notifikasi',
  current: 'bagian saat ini',
  goTo: 'Pergi ke {{nombre}}',
  weeNavigation: 'Navigasi Weë',
  goHome: 'Pergi ke beranda',
  myProfile: 'Pergi ke profil saya',
  openWeeAi: 'Buka Weë AI',
  goToWeeAi: 'Pergi ke Weë AI',
  weeAiQuestion: 'Apa yang ingin Anda buat hari ini?',
  weeAiPitch: 'Ceritakan kepada Weë apa yang Anda inginkan. Weë yang mengurus AI-nya.',
  brandSlogan: 'Bayangkan · Ciptakan · Terhubung',
  documentTitle: 'Weë - {{eslogan}}',
};
