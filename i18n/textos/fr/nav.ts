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
  notificationsUnread: 'Notifications, tu as des avis non lus',
  current: 'section actuelle',
  goTo: 'Aller à {{nombre}}',
  weeNavigation: 'Navigation de Weë',
  goHome: 'Aller à l’accueil',
  myProfile: 'Aller à mon profil',
  openWeeAi: 'Ouvrir Weë AI',
  goToWeeAi: 'Aller à Weë AI',
  weeAiQuestion: 'Que veux-tu créer aujourd’hui ?',
  weeAiPitch: 'Dis à Weë ce que tu veux. Weë s’occupe de l’IA.',
  brandSlogan: 'Imaginez · Créez · Connectez',
  documentTitle: 'Weë - {{eslogan}}',
  /* Rediseño del 2026-11-15: los destinos nuevos de la barra. WeëAI es marca. Sin revisión nativa. */
  weeAi: 'WeëAI',
  messages: 'Messages',
  myWee: 'Mon Weë',
};
