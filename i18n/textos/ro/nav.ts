/*
 * RUMANO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Acasă',
  search: 'Caută',
  create: 'Creează',
  talk: 'WeeTalk',
  notifications: 'Notificări',
  current: 'secțiunea curentă',
  goTo: 'Mergi la {{nombre}}',
  weeNavigation: 'Navigare Weë',
  goHome: 'Mergi la pagina principală',
  myProfile: 'Mergi la profilul meu',
  openWeeAi: 'Deschide Weë AI',
  goToWeeAi: 'Mergi la Weë AI',
  weeAiQuestion: 'Ce vrei să creezi astăzi?',
  weeAiPitch: 'Spune-i lui Weë ce vrei. Weë se ocupă de IA.',
  brandSlogan: 'Imaginează · Creează · Conectează',
  documentTitle: 'Weë - {{eslogan}}',
};
