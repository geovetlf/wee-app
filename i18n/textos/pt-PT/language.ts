/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Portugués de PORTUGAL: trato de «tu» y la perífrasis europea «continuar a +
 * infinitivo», que es la marca gramatical que separa este idioma del brasileño.
 */
export const language: typeof import('../es/language').language = {
  title: 'Idioma',
  explanation: 'Muda o idioma da interface de Weë. As publicações e os comentários continuam a aparecer tal como cada pessoa os escreveu.',
  comingSoon: 'Em breve',
  comingSoonTitle: 'A caminho',
  selected: 'Selecionado',
};
