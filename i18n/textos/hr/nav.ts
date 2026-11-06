/*
 * Los cinco destinos de la barra inferior, en croata.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). «Inicio» es «Početna», igual que `menu.home`. «Weë» no se
 * declina: «aplikacije Weë».
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Početna',
  search: 'Pretraži',
  create: 'Stvori',
  talk: 'WeeTalk',
  notifications: 'Obavijesti',
  current: 'trenutačni odjeljak',
  goTo: 'Idi na {{nombre}}',
  weeNavigation: 'Navigacija aplikacije Weë',
  goHome: 'Idi na početnu',
  myProfile: 'Idi na moj profil',
  openWeeAi: 'Otvori Weë AI',
  goToWeeAi: 'Idi na Weë AI',
  weeAiQuestion: 'Što želiš stvoriti danas?',
  weeAiPitch: 'Reci Weë što želiš. Weë se brine za AI.',
  brandSlogan: 'Zamisli · Stvori · Poveži se',
  documentTitle: 'Weë - {{eslogan}}',
};
