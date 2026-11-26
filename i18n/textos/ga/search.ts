/*
 * IRLANDÉS — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo que la persona escribe en el buscador entra por `{{busqueda}}` sin tocar.
 */
export const search: typeof import('../es/search').search = {
  title: 'Cuardaigh',
  placeholder: 'Cuardaigh pobail, daoine nó postálacha',
  communities: 'Pobail',
  people: 'Úsáideoirí',
  posts: 'Postálacha',
  loading: 'Á lódáil...',
  popularTopics: 'Topaicí a bhfuil tóir orthu',
  trending: 'Treochtaí',
  noPostsForTopic: 'Níl aon phostáil ann faoin topaic seo',
  results: 'Torthaí',
  noCommunities: 'Níor aimsíodh aon phobal',
  member: 'Ball',
  typeTwoForPeople: 'Scríobh 2 charachtar ar a laghad chun úsáideoirí a chuardach',
  typeTwoForPosts: 'Scríobh 2 litir ar a laghad chun postálacha a chuardach',
  peopleFound: 'Úsáideoirí aimsithe',
  searchPeople: 'Cuardaigh úsáideoirí',
  noPeopleFor: 'Níor aimsíodh aon úsáideoir do "{{busqueda}}"',
  postsFound: 'Postálacha aimsithe',
  searchPosts: 'Cuardaigh postálacha',
  noPostsFor: 'Níor aimsíomar aon phostáil do "{{busqueda}}"',
};
