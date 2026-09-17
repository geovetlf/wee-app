/*
 * ITALIANO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Las cinco etiquetas son cortas porque la barra es
 * estrecha, y son exactamente las mismas que usa el menú ☰ (`menu`): Home,
 * Cerca, Crea, WeeTalk, Notifiche. Apóstrofo tipográfico ’ siempre.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Home',
  search: 'Cerca',
  create: 'Crea',
  talk: 'WeeTalk',
  notifications: 'Notifiche',
  current: 'sezione attuale',
  goTo: 'Vai a {{nombre}}',
  weeNavigation: 'Navigazione di Weë',
  goHome: 'Vai alla Home',
  myProfile: 'Vai al mio profilo',
  openWeeAi: 'Apri Weë AI',
  goToWeeAi: 'Vai a Weë AI',
  weeAiQuestion: 'Cosa vuoi creare oggi?',
  weeAiPitch: 'Dì a Weë cosa vuoi. Weë pensa all’IA.',
};
