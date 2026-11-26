/*
 * CATALÁN — Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre del idioma no va aquí: sale del registro de locales.
 */
export const language: typeof import('../es/language').language = {
  title: 'Idioma',
  explanation: 'Canvia l\'idioma de la interfície de Weë. Les publicacions i els comentaris es continuen veient tal com els va escriure cada persona.',
  comingSoon: 'Properament',
  comingSoonTitle: 'En camí',
  selected: 'Seleccionat',
};
