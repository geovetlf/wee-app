/*
 * BOSNIO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Početna» es el Home, igual que en `menu`.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Početna',
  search: 'Pretraga',
  create: 'Kreiraj',
  talk: 'WeeTalk',
  notifications: 'Obavještenja',
  current: 'trenutna sekcija',
  goTo: 'Idi na {{nombre}}',
  weeNavigation: 'Navigacija aplikacije Weë',
  goHome: 'Idi na početnu',
  myProfile: 'Idi na moj profil',
  openWeeAi: 'Otvori Weë AI',
  goToWeeAi: 'Idi na Weë AI',
  weeAiQuestion: 'Šta želiš kreirati danas?',
  weeAiPitch: 'Reci Weë šta želiš. Weë se brine za AI.',
  brandSlogan: 'Zamisli · Stvori · Poveži se',
  documentTitle: 'Weë – {{eslogan}}',
};
