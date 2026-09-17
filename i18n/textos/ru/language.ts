/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: 'Язык',
  explanation: 'Смените язык интерфейса Weë. Публикации и комментарии остаются такими, какими их написал каждый человек.',
  comingSoon: 'Скоро',
  comingSoonTitle: 'Уже в работе',
  selected: 'Выбрано',
};
