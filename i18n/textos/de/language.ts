/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: 'Sprache',
  explanation: 'Ändere die Sprache der Weë Oberfläche. Beiträge und Kommentare bleiben genau so, wie sie geschrieben wurden.',
  comingSoon: 'Demnächst',
  comingSoonTitle: 'Kommt bald',
  selected: 'Ausgewählt',
};
