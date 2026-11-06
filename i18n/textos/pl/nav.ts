/*
 * POLACO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Inicio» es «Strona główna», igual que `menu.home`. `{{nombre}}` entra en
 * nominativo detrás de «Przejdź do», que pediría genitivo: es el precio de no
 * declinar lo que viene de fuera, y se lee como etiqueta.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Strona główna',
  search: 'Szukaj',
  create: 'Utwórz',
  talk: 'WeeTalk',
  notifications: 'Powiadomienia',
  current: 'bieżąca sekcja',
  goTo: 'Przejdź do {{nombre}}',
  weeNavigation: 'Nawigacja Weë',
  goHome: 'Przejdź na stronę główną',
  myProfile: 'Przejdź do swojego profilu',
  openWeeAi: 'Otwórz Weë AI',
  goToWeeAi: 'Przejdź do Weë AI',
  weeAiQuestion: 'Co chcesz dziś stworzyć?',
  weeAiPitch: 'Powiedz Weë, czego chcesz. Weë zajmie się AI.',
  brandSlogan: 'Wyobraź sobie · Twórz · Łącz się',
  documentTitle: 'Weë – {{eslogan}}',
};
