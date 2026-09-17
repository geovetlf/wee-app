/*
 * RUSO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula y, siempre que se puede, imperativo directo. Las
 * cinco etiquetas son cortas porque la barra es estrecha —y en ruso las palabras
 * son largas— y son EXACTAMENTE las mismas que usa el menú ☰ (`menu`): Главная,
 * Поиск, Создать, WeeTalk, Уведомления. WeeTalk es marca: ni se traduce ni se
 * translitera, y dentro de una frase en cirílico se queda en alfabeto latino.
 *
 * `goTo` recibe el nombre de una comunidad o de una sección de Weë y ese nombre
 * NO se declina. Por eso la frase es «Открыть {{nombre}}»: el acusativo de un
 * inanimado coincide con el nominativo, así que el hueco cae bien siempre, venga
 * lo que venga.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Главная',
  search: 'Поиск',
  create: 'Создать',
  talk: 'WeeTalk',
  notifications: 'Уведомления',
  current: 'текущий раздел',
  goTo: 'Открыть {{nombre}}',
  weeNavigation: 'Навигация Weë',
  goHome: 'На главную',
  myProfile: 'В мой профиль',
  openWeeAi: 'Открыть Weë AI',
  goToWeeAi: 'Перейти в Weë AI',
  weeAiQuestion: 'Что хотите создать сегодня?',
  weeAiPitch: 'Расскажите Weë, что вам нужно. С ИИ Weë разберётся.',
};
