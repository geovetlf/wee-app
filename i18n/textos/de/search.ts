/*
 * ALEMÁN — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). Lo que la persona escribe en el buscador y los
 * resultados no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Suchen',
  placeholder: 'Communitys, Personen oder Beiträge suchen',
  communities: 'Communitys',
  people: 'Personen',
  posts: 'Beiträge',
  loading: 'Wird geladen...',
  popularTopics: 'Beliebte Themen',
  trending: 'Trends',
  noPostsForTopic: 'Es gibt keine Beiträge zu diesem Thema',
  results: 'Ergebnisse',
  noCommunities: 'Keine Communitys gefunden',
  member: 'Mitglied',
  typeTwoForPeople: 'Gib mindestens 2 Zeichen ein, um nach Personen zu suchen',
  typeTwoForPosts: 'Gib mindestens 2 Buchstaben ein, um nach Beiträgen zu suchen',
  peopleFound: 'Gefundene Personen',
  searchPeople: 'Personen suchen',
  noPeopleFor: 'Keine Personen für „{{busqueda}}“ gefunden',
  postsFound: 'Gefundene Beiträge',
  searchPosts: 'Beiträge suchen',
  noPostsFor: 'Wir haben keine Beiträge für „{{busqueda}}“ gefunden',
};
