/*
 * BOSNIO — Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre del idioma no va aquí: sale del registro de locales.
 */
export const language: typeof import('../es/language').language = {
  title: 'Jezik',
  explanation: 'Promijeni jezik interfejsa aplikacije Weë. Objave i komentari i dalje se vide onako kako ih je svako napisao.',
  comingSoon: 'Uskoro',
  comingSoonTitle: 'Stiže uskoro',
  selected: 'Odabrano',
};
