/*
 * RUSO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula e imperativo directo. Los tres puntos suspensivos
 * de `loading` se copian tal cual del español (tres puntos, no el carácter …),
 * que es lo que hacen los demás idiomas.
 */
export const search: typeof import('../es/search').search = {
  title: 'Поиск',
  placeholder: 'Поиск сообществ, людей и публикаций',
  communities: 'Сообщества',
  people: 'Пользователи',
  posts: 'Публикации',
  loading: 'Загрузка...',
  popularTopics: 'Популярные темы',
  trending: 'В тренде',
  noPostsForTopic: 'По этой теме пока нет публикаций',
  results: 'Результаты',
  noCommunities: 'Сообщества не найдены',
  member: 'Участник',
  typeTwoForPeople: 'Введите минимум 2 символа, чтобы найти пользователей',
  typeTwoForPosts: 'Введите минимум 2 буквы, чтобы найти публикации',
  peopleFound: 'Найденные пользователи',
  searchPeople: 'Поиск пользователей',
  noPeopleFor: 'По запросу «{{busqueda}}» пользователи не найдены',
  postsFound: 'Найденные публикации',
  searchPosts: 'Поиск публикаций',
  noPostsFor: 'По запросу «{{busqueda}}» мы не нашли публикаций',
};
