/*
 * Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Salvati',
  empty: 'Non hai ancora salvato nulla',
  exploreHome: 'Esplora la home',
  loadFailed: 'Non è stato possibile caricare i tuoi post salvati',
  emptyHint: 'Tocca il segnalibro di un post per salvare prompt, tutorial e lavori che vuoi rivedere.',
};
