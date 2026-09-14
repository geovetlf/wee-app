/*
 * Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const language: typeof import('../es/language').language = {
  title: 'Language',
  explanation: 'Change the language of the Weë interface. Posts and comments are still shown exactly as each person wrote them.',
  comingSoon: 'Coming soon',
  comingSoonTitle: 'On the way',
  selected: 'Selected',
};
