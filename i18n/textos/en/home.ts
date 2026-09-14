/*
 * El Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Hi, {{nombre}}',
  greetingGuest: 'Hi',
  composerPlaceholder: 'What do you want to share?',
  seeAll: 'See all →',
  createWeel: 'Create Weël',
  openMenu: 'Open menu',
  search: 'Search',
  back: 'Back',
  logoHome: 'Weë, go to the top',
  filterBy: 'Filter: {{nombre}}',
  filterAll: 'All',
};
