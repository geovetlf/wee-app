/*
 * ALEMÁN SUIZO (de-CH) — los cinco destinos de la barra inferior.
 *
 * Variante del alemán base (de/nav.ts). Aquí el alemán base no tiene ß, comillas
 * ni léxico que cambie en Suiza, así que las frases son las mismas. Las cinco
 * etiquetas son de una palabra y son las mismas que usa el menú ☰ (`menu`).
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
  brandSlogan: 'Träumen · Erschaffen · Verbinden',
  documentTitle: 'Weë – {{eslogan}}',
};
