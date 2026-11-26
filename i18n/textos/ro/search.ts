/*
 * RUMANO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que la persona escribe en el buscador entra por {{busqueda}} tal cual.
 */
export const search: typeof import('../es/search').search = {
  title: 'Caută',
  placeholder: 'Caută comunități, persoane sau postări',
  communities: 'Comunități',
  people: 'Utilizatori',
  posts: 'Postări',
  loading: 'Se încarcă...',
  popularTopics: 'Subiecte populare',
  trending: 'Tendințe',
  noPostsForTopic: 'Nu există postări pe acest subiect',
  results: 'Rezultate',
  noCommunities: 'Nu s-au găsit comunități',
  member: 'Membru',
  typeTwoForPeople: 'Scrie cel puțin 2 caractere pentru a căuta utilizatori',
  typeTwoForPosts: 'Scrie cel puțin 2 litere pentru a căuta postări',
  peopleFound: 'Utilizatori găsiți',
  searchPeople: 'Caută utilizatori',
  noPeopleFor: 'Nu s-au găsit utilizatori pentru „{{busqueda}}”',
  postsFound: 'Postări găsite',
  searchPosts: 'Caută postări',
  noPostsFor: 'Nu am găsit postări pentru „{{busqueda}}”',
};
