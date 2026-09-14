/*
 * Los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Home',
  search: 'Search',
  create: 'Create',
  talk: 'WeeTalk',
  notifications: 'Notifications',
  current: 'current section',
  goTo: 'Go to {{nombre}}',
  weeNavigation: 'Weë navigation',
  goHome: 'Go to home',
  myProfile: 'Go to my profile',
  openWeeAi: 'Open Weë AI',
  goToWeeAi: 'Go to Weë AI',
  weeAiQuestion: 'What do you want to create today?',
  weeAiPitch: 'Tell Weë what you want. Weë takes care of the AI.',
};
