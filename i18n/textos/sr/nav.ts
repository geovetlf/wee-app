/*
 * SERBIO (ћирилица) — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `home` es «Почетна», igual que en `menu`.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Почетна',
  search: 'Претрага',
  create: 'Креирај',
  talk: 'WeeTalk',
  notifications: 'Обавештења',
  current: 'тренутни одељак',
  goTo: 'Иди на {{nombre}}',
  weeNavigation: 'Weë навигација',
  goHome: 'Иди на почетну',
  myProfile: 'Иди на мој профил',
  openWeeAi: 'Отвори Weë AI',
  goToWeeAi: 'Иди на Weë AI',
  weeAiQuestion: 'Шта желиш да створиш данас?',
  weeAiPitch: 'Реци Weë шта желиш. Weë се брине за AI.',
  brandSlogan: 'Замисли · Створи · Повежи се',
  documentTitle: 'Weë - {{eslogan}}',
};
