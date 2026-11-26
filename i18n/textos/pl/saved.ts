/*
 * POLACO — Guardados.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «Zapisane», el mismo nombre que en `menu`. «Aún no guardaste
 * nada» se reformula sin pasado, porque el pasado polaco tiene género.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Zapisane',
  empty: 'Nie masz jeszcze nic zapisanego',
  exploreHome: 'Przeglądaj stronę główną',
  loadFailed: 'Nie udało się wczytać twoich Zapisanych',
  emptyHint: 'Dotknij zakładki przy poście, aby zapisać prompty, poradniki i prace, do których chcesz wrócić.',
};
