/*
 * DANÉS — Buscar (Søg): comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los buscadores siguen el patrón «Søg …» de la guía (§ 8): «Søg efter personer», «Søg efter
 * opslag» —«efter» y no «i», porque se busca QUÉ hay, no dentro de algo—. La excepción es el placeholder grande,
 * «Find fællesskaber, personer og opslag»: con «Søg efter … eller …» no cabía en una línea en el teléfono y se
 * cortaba con «…» (campaña de capturas, 390 px). Lo que la persona
 * escribe va entre ”…”, con el patrón «Ingen … fundet for ”{{busqueda}}”», y nada se le pega. La
 * pestaña de «Usuarios» es «Personer», la palabra que ya usa el buscador; una publicación es
 * «opslag» (invariable). «Tendencias» es «Populært» (glosario 9.2): la sección de al lado,
 * «Populære emner», son hashtags, y esta, publicaciones. `member` es el estado del botón de una
 * comunidad a la que ya perteneces: «Medlem», como `communities.memberOf`. Lo que la persona
 * escribe en el buscador y los resultados no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Søg',
  placeholder: 'Find fællesskaber, personer og opslag',
  communities: 'Fællesskaber',
  people: 'Personer',
  posts: 'Opslag',
  loading: 'Indlæser…',
  popularTopics: 'Populære emner',
  trending: 'Populært',
  noPostsForTopic: 'Ingen opslag om dette emne',
  results: 'Resultater',
  noCommunities: 'Ingen fællesskaber fundet',
  member: 'Medlem',
  typeTwoForPeople: 'Skriv mindst 2 tegn for at søge efter personer',
  typeTwoForPosts: 'Skriv mindst 2 bogstaver for at søge efter opslag',
  peopleFound: 'Fundne personer',
  searchPeople: 'Søg efter personer',
  noPeopleFor: 'Ingen personer fundet for ”{{busqueda}}”',
  postsFound: 'Fundne opslag',
  searchPosts: 'Søg efter opslag',
  noPostsFor: 'Vi fandt ingen opslag for ”{{busqueda}}”',
};
