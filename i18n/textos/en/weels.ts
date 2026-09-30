/*
 * Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Share Weël',
  empty: 'No Weëls yet',
  emptyHint: 'Create the first one from the + button',
  loadFailed: 'Weëls could not be loaded',
  rowSubtitle: 'Discover videos made by the community.',
  seeAll: 'See all Weëls',
  create: 'Create Weël',
  createFirst: 'Your first Weël',
  open: 'Open Weël',
  upTo15s: 'up to 15s',
  noneYetHint: 'There are no community Weëls yet. The examples show how they will look.',
  sampleAiScene: 'AI scene',
  sampleDance: 'Dance',
  sampleRecipe: 'Recipe',
  sampleTrip: 'Trip',
};
