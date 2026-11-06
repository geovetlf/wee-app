/*
 * MALAYO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `home` es «Laman Utama», igual que en `menu` (glosario § 4).
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Laman Utama',
  search: 'Cari',
  create: 'Cipta',
  talk: 'WeeTalk',
  notifications: 'Pemberitahuan',
  current: 'bahagian semasa',
  goTo: 'Pergi ke {{nombre}}',
  weeNavigation: 'Navigasi Weë',
  goHome: 'Pergi ke laman utama',
  myProfile: 'Pergi ke profil saya',
  openWeeAi: 'Buka Weë AI',
  goToWeeAi: 'Pergi ke Weë AI',
  weeAiQuestion: 'Apa yang anda mahu cipta hari ini?',
  weeAiPitch: 'Beritahu Weë apa yang anda mahu. Weë yang menguruskan AI.',
  brandSlogan: 'Bayangkan · Cipta · Berhubung',
  documentTitle: 'Weë - {{eslogan}}',
};
