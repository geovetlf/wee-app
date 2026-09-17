/*
 * PORTUGUÉS (pt-BR) — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). Lo que la persona escribe en el buscador y los
 * resultados no pasan por aquí: son de quien los publicó. Apóstrofo tipográfico
 * ’ siempre.
 */
export const search: typeof import('../es/search').search = {
  title: 'Buscar',
  placeholder: 'Buscar comunidades, pessoas ou publicações',
  communities: 'Comunidades',
  people: 'Usuários',
  posts: 'Publicações',
  loading: 'Carregando...',
  popularTopics: 'Temas populares',
  trending: 'Tendências',
  noPostsForTopic: 'Não há publicações com este tema',
  results: 'Resultados',
  noCommunities: 'Nenhuma comunidade encontrada',
  member: 'Membro',
  typeTwoForPeople: 'Escreva pelo menos 2 caracteres para buscar usuários',
  typeTwoForPosts: 'Escreva pelo menos 2 letras para buscar publicações',
};
