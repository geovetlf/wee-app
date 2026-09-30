/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» y el gerundio va `estar a + infinitivo`, por
 * eso `loading` dice «A carregar...» y no «Carregando...». En Portugal se
 * PROCURA —nunca se «busca»— y quien usa Weë es un «utilizador», no un
 * «usuário». Lo que la persona escribe en el buscador y los resultados no pasan
 * por aquí: son de quien los publicó. Apóstrofo tipográfico ’ siempre.
 */
export const search: typeof import('../es/search').search = {
  title: 'Procurar',
  placeholder: 'Procurar comunidades, pessoas ou publicações',
  communities: 'Comunidades',
  people: 'Utilizadores',
  posts: 'Publicações',
  loading: 'A carregar...',
  popularTopics: 'Temas populares',
  trending: 'Tendências',
  noPostsForTopic: 'Não há publicações com este tema',
  results: 'Resultados',
  noCommunities: 'Não foram encontradas comunidades',
  member: 'Membro',
  typeTwoForPeople: 'Escreve pelo menos 2 caracteres para procurar utilizadores',
  typeTwoForPosts: 'Escreve pelo menos 2 letras para procurar publicações',
  peopleFound: 'Utilizadores encontrados',
  searchPeople: 'Procura utilizadores',
  noPeopleFor: 'Não foram encontrados utilizadores para "{{busqueda}}"',
  postsFound: 'Publicações encontradas',
  searchPosts: 'Procura publicações',
  noPostsFor: 'Não encontrámos publicações para "{{busqueda}}"',
};
