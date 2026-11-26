/*
 * SERBIO (ћирилица) — Претрага: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que la persona escribe en el buscador entra por {{busqueda}} entre comillas
 * serbias y no se toca; los resultados son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Претрага',
  placeholder: 'Претражи заједнице, људе или објаве',
  communities: 'Заједнице',
  people: 'Корисници',
  posts: 'Објаве',
  loading: 'Учитавање...',
  popularTopics: 'Популарне теме',
  trending: 'У тренду',
  noPostsForTopic: 'Нема објава на ову тему',
  results: 'Резултати',
  noCommunities: 'Није пронађена ниједна заједница',
  member: 'Члан',
  typeTwoForPeople: 'Унеси бар 2 знака да претражиш кориснике',
  typeTwoForPosts: 'Унеси бар 2 слова да претражиш објаве',
  peopleFound: 'Пронађени корисници',
  searchPeople: 'Претражи кориснике',
  noPeopleFor: 'Није пронађен ниједан корисник за „{{busqueda}}“',
  postsFound: 'Пронађене објаве',
  searchPosts: 'Претражи објаве',
  noPostsFor: 'Нисмо пронашли објаве за „{{busqueda}}“',
};
