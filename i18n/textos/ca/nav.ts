/*
 * CATALÁN — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Inici» para el Home, «Cerca» para buscar; tuteo.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Inici',
  search: 'Cerca',
  create: 'Crea',
  talk: 'WeeTalk',
  notifications: 'Notificacions',
  notificationsUnread: 'Notificacions, tens avisos sense llegir',
  current: 'secció actual',
  goTo: 'Ves a {{nombre}}',
  weeNavigation: 'Navegació de Weë',
  goHome: 'Ves a l\'inici',
  myProfile: 'Ves al meu perfil',
  openWeeAi: 'Obre Weë AI',
  goToWeeAi: 'Ves a Weë AI',
  weeAiQuestion: 'Què vols crear avui?',
  weeAiPitch: 'Explica a Weë què vols. Weë s\'encarrega de la IA.',
  brandSlogan: 'Imagina · Crea · Connecta',
  documentTitle: 'Weë - {{eslogan}}',
  /* Rediseño del 2026-11-15: los destinos nuevos de la barra. WeëAI es marca. Sin revisión nativa. */
  weeAi: 'WeëAI',
  messages: 'Missatges',
  myWee: 'El meu Weë',
};
