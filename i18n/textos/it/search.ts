/*
 * ITALIANO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Lo que la persona escribe en el buscador y los
 * resultados no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Cerca',
  placeholder: 'Cerca community, persone o post',
  communities: 'Community',
  people: 'Persone',
  posts: 'Post',
  loading: 'Caricamento...',
  popularTopics: 'Temi popolari',
  trending: 'Tendenze',
  noPostsForTopic: 'Non ci sono post su questo tema',
  results: 'Risultati',
  noCommunities: 'Nessuna community trovata',
  member: 'Membro',
  typeTwoForPeople: 'Scrivi almeno 2 caratteri per cercare persone',
  typeTwoForPosts: 'Scrivi almeno 2 lettere per cercare post',
};
