/*
 * FILIPINO — Buscar (Maghanap): comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La cabecera de la pantalla es «Maghanap», como la pestaña de la barra inferior (glosario 11.1), y los buscadores
 * siguen el patrón «Maghanap ng …» de la guía (§ 10), con el objeto indefinido y sin «mga»: «Maghanap ng tao»,
 * «Maghanap ng post». «Usuarios» es «Mga tao» en todo el módulo, la palabra del buscador y la que pone Facebook en su
 * pestaña de búsqueda; una publicación es «post» (glosario 11.3). «Tendencias» es «Trending» (glosario 11.3) y
 * «Temas populares», que son hashtags, «Mga sikat na paksa». Lo que la persona escribe va entre “…” (§ 7) y nada se le
 * pega: «Walang nahanap na tao para sa “{{busqueda}}”»; cuando el español habla en primera persona del plural, Weë
 * habla con el «kami» exclusivo (§ 2): «Wala kaming nahanap…». «Escribe al menos 2 caracteres» es «Mag-type ng hindi
 * bababa sa 2 character», sin enlace tras la cifra (§ 8.3, regla 7). `member` es el estado del botón de una
 * comunidad a la que ya perteneces: «Miyembro». «Cargando» es «Naglo-load…» con su «…» de un carácter.
 *
 * LO QUE NO ENTRA AQUÍ: lo que la persona escribe en el buscador, ni los resultados, que son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Maghanap',
  placeholder: 'Maghanap ng komunidad, tao o post',
  communities: 'Mga komunidad',
  people: 'Mga tao',
  posts: 'Mga post',
  loading: 'Naglo-load…',
  popularTopics: 'Mga sikat na paksa',
  trending: 'Trending',
  noPostsForTopic: 'Walang post tungkol sa paksang ito',
  results: 'Mga resulta',
  noCommunities: 'Walang nahanap na komunidad',
  member: 'Miyembro',
  typeTwoForPeople: 'Mag-type ng hindi bababa sa 2 character para maghanap ng tao',
  typeTwoForPosts: 'Mag-type ng hindi bababa sa 2 letra para maghanap ng post',
  peopleFound: 'Mga nahanap na tao',
  searchPeople: 'Maghanap ng tao',
  noPeopleFor: 'Walang nahanap na tao para sa “{{busqueda}}”',
  postsFound: 'Mga nahanap na post',
  searchPosts: 'Maghanap ng post',
  noPostsFor: 'Wala kaming nahanap na post para sa “{{busqueda}}”',
};
