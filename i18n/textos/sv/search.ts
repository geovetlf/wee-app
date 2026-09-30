/*
 * SUECO — Buscar (Sök): comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los buscadores siguen el patrón «Sök …» de la guía (§ 8): «Sök efter personer», «Sök efter
 * inlägg». Lo que la persona escribe va entre ”…”, con el patrón «Inga … hittades för
 * ”{{busqueda}}”», y nada se le pega. La pestaña de «Usuarios» es «Personer», como en X; una
 * publicación es «inlägg» (invariable). «Tendencias» es «Trendar» (glosario 9.2), porque
 * «Populärt» ya lo dice la sección de al lado («Populära ämnen»). `member` es el estado del botón
 * de una comunidad a la que ya perteneces: «Medlem». Lo que la persona escribe en el buscador y
 * los resultados no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Sök',
  placeholder: 'Sök communities, personer eller inlägg',
  communities: 'Communities',
  people: 'Personer',
  posts: 'Inlägg',
  loading: 'Laddar…',
  popularTopics: 'Populära ämnen',
  trending: 'Trendar',
  noPostsForTopic: 'Inga inlägg om det här ämnet',
  results: 'Resultat',
  noCommunities: 'Inga communities hittades',
  member: 'Medlem',
  typeTwoForPeople: 'Skriv minst 2 tecken för att söka efter personer',
  typeTwoForPosts: 'Skriv minst 2 bokstäver för att söka efter inlägg',
  peopleFound: 'Personer som hittades',
  searchPeople: 'Sök efter personer',
  noPeopleFor: 'Inga personer hittades för ”{{busqueda}}”',
  postsFound: 'Inlägg som hittades',
  searchPosts: 'Sök efter inlägg',
  noPostsFor: 'Inga inlägg hittades för ”{{busqueda}}”',
};
