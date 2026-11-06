/*
 * IRLANDÉS — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Baile',
  search: 'Cuardaigh',
  create: 'Cruthaigh',
  talk: 'WeeTalk',
  notifications: 'Fógraí',
  current: 'an rannóg reatha',
  goTo: 'Téigh chuig {{nombre}}',
  weeNavigation: 'Nascleanúint Weë',
  goHome: 'Téigh go dtí an leathanach baile',
  myProfile: 'Téigh go dtí mo phróifíl',
  openWeeAi: 'Oscail Weë AI',
  goToWeeAi: 'Téigh go Weë AI',
  weeAiQuestion: 'Cad ba mhaith leat a chruthú inniu?',
  weeAiPitch: 'Inis do Weë cad atá uait. Tugann Weë aire don IS.',
  brandSlogan: 'Samhlaigh · Cruthaigh · Nasc',
  documentTitle: 'Weë - {{eslogan}}',
};
