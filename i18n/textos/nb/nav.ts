/*
 * NORUEGO BOKMÅL — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Hjem» es el nombre fijo del Home (glosario), igual que en el menú ☰.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Hjem',
  search: 'Søk',
  create: 'Lag',
  talk: 'WeeTalk',
  notifications: 'Varsler',
  current: 'gjeldende seksjon',
  goTo: 'Gå til {{nombre}}',
  weeNavigation: 'Navigasjon i Weë',
  goHome: 'Gå til Hjem',
  myProfile: 'Gå til profilen min',
  openWeeAi: 'Åpne Weë AI',
  goToWeeAi: 'Gå til Weë AI',
  weeAiQuestion: 'Hva vil du lage i dag?',
  weeAiPitch: 'Fortell Weë hva du vil ha. Weë tar seg av KI-en.',
  brandSlogan: 'Drøm · Skap · Koble sammen',
  documentTitle: 'Weë - {{eslogan}}',
};
