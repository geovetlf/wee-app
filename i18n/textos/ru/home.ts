/*
 * RUSO — el Home: saludo, compositor y las filas de arriba.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula e imperativo directo donde cabe. `seeAll` repite
 * la forma corta de `common` («Все →») porque es el mismo enlace y la flecha se
 * copia tal cual. Weë y Weël son marca y viajan en alfabeto latino.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Привет, {{nombre}}',
  greetingGuest: 'Привет',
  composerPlaceholder: 'Чем поделитесь?',
  seeAll: 'Все →',
  createWeel: 'Создать Weël',
  openMenu: 'Открыть меню',
  search: 'Поиск',
  logoHome: 'Weë, перейти на главную',
  filterBy: 'Фильтр: {{nombre}}',
  filterAll: 'Всё',
  bannerOf: 'Баннер {{numero}} из {{total}}',
  weelSample: 'Пример Weël: {{titulo}}',
  exploreCommunities: 'Откройте для себя сообщества',
  moreCategories: 'Ещё категории',
  popularCommunities: 'Популярные сообщества',
  seeAllOf: 'Все',
  topicOfTheDay: 'Тема дня',
  heatedDebate: 'Жаркий спор',
  featuredOpinion: 'Избранное мнение',
  featured: 'Избранное',
};
