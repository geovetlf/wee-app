/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: 'Idioma',
  explanation: 'Mude o idioma da interface de Weë. As publicações e os comentários continuam como cada pessoa escreveu.',
  comingSoon: 'Em breve',
  comingSoonTitle: 'A caminho',
  selected: 'Selecionado',
};
