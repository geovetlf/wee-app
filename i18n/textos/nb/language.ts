/*
 * NORUEGO BOKMÅL — Configuración → Idioma. El nombre del idioma no vive aquí: sale del registro de locales.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: 'Språk',
  explanation: 'Bytt språk i grensesnittet til Weë. Innlegg og kommentarer vises fortsatt slik hver person skrev dem.',
  comingSoon: 'Kommer snart',
  comingSoonTitle: 'På vei',
  selected: 'Valgt',
};
