/*
 * FRANCÉS — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Las cinco etiquetas son cortas porque la barra es
 * estrecha, y son exactamente las mismas que usa el menú ☰ (`menu`): Accueil,
 * Rechercher, Créer, WeeTalk, Notifications. Apóstrofo tipográfico ’ siempre.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Accueil',
  search: 'Rechercher',
  create: 'Créer',
  talk: 'WeeTalk',
  notifications: 'Notifications',
  current: 'section actuelle',
  goTo: 'Aller à {{nombre}}',
  weeNavigation: 'Navigation de Weë',
  goHome: 'Aller à l’accueil',
  myProfile: 'Aller à mon profil',
  openWeeAi: 'Ouvrir Weë AI',
  goToWeeAi: 'Aller à Weë AI',
  weeAiQuestion: 'Que veux-tu créer aujourd’hui ?',
  weeAiPitch: 'Dis à Weë ce que tu veux. Weë s’occupe de l’IA.',
};
