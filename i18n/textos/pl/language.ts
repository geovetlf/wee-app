/*
 * POLACO — Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del idioma no está aquí: lo pone el registro («Polski»).
 */
export const language: typeof import('../es/language').language = {
  title: 'Język',
  explanation: 'Zmień język interfejsu Weë. Posty i komentarze nadal wyświetlają się w języku, w którym zostały napisane.',
  comingSoon: 'Wkrótce',
  comingSoonTitle: 'W drodze',
  selected: 'Wybrany',
};
