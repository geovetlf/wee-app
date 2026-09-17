/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: 'Langue',
  explanation: 'Change la langue de l’interface de Weë. Les publications et les commentaires restent tels que chaque personne les a écrits.',
  comingSoon: 'Bientôt',
  comingSoonTitle: 'En préparation',
  selected: 'Sélectionné',
};
