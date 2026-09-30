/*
 * Guardados.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Saved',
  empty: 'Nothing saved yet',
  exploreHome: 'Explore Home',
  loadFailed: 'Your saved posts could not be loaded',
  emptyHint: 'Tap the bookmark on a post to save prompts, tutorials and work you want to come back to.',
};
