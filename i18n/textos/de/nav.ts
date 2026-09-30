/*
 * ALEMÁN — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). Las cinco etiquetas son de una palabra porque la
 * barra es estrecha, y son las mismas que usa el menú ☰ (`menu`): Start,
 * Suchen, Erstellen, WeeTalk, Mitteilungen.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Start',
  search: 'Suchen',
  create: 'Erstellen',
  talk: 'WeeTalk',
  notifications: 'Mitteilungen',
  current: 'aktueller Bereich',
  goTo: 'Zu {{nombre}}',
  weeNavigation: 'Navigation von Weë',
  goHome: 'Zum Start',
  myProfile: 'Zu meinem Profil',
  openWeeAi: 'Weë AI öffnen',
  goToWeeAi: 'Zu Weë AI',
  weeAiQuestion: 'Was möchtest du heute erschaffen?',
  weeAiPitch: 'Sag Weë, was du willst. Weë kümmert sich um die KI.',
  documentTitle: 'Weë - Die Community der Zukunft',
};
