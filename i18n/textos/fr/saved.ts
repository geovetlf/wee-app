/*
 * Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Enregistrés',
  empty: 'Tu n’as encore rien enregistré',
  exploreHome: 'Explorer l’accueil',
  loadFailed: 'Tes publications enregistrées n’ont pas pu être chargées',
  emptyHint: 'Touche le signet d’une publication pour enregistrer les prompts, les tutoriels et les créations que tu veux revoir.',
};
