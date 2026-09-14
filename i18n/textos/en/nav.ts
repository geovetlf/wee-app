/*
 * Los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Home',
  search: 'Search',
  create: 'Create',
  talk: 'WeeTalk',
  notifications: 'Notifications',
  current: 'current section',
};
