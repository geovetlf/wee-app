/*
 * POLACO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo que la persona escribe en el buscador entra por `{{busqueda}}` entre
 * comillas polacas „…”. «Publicación» es «post», el préstamo que usa toda la app.
 */
export const search: typeof import('../es/search').search = {
  title: 'Szukaj',
  placeholder: 'Szukaj społeczności, osób lub postów',
  communities: 'Społeczności',
  people: 'Użytkownicy',
  posts: 'Posty',
  loading: 'Ładowanie...',
  popularTopics: 'Popularne tematy',
  trending: 'Na czasie',
  noPostsForTopic: 'Brak postów na ten temat',
  results: 'Wyniki',
  noCommunities: 'Nie znaleziono społeczności',
  member: 'Członek',
  typeTwoForPeople: 'Wpisz co najmniej 2 znaki, aby szukać użytkowników',
  typeTwoForPosts: 'Wpisz co najmniej 2 litery, aby szukać postów',
  peopleFound: 'Znalezieni użytkownicy',
  searchPeople: 'Szukaj użytkowników',
  noPeopleFor: 'Nie znaleziono użytkowników dla „{{busqueda}}”',
  postsFound: 'Znalezione posty',
  searchPosts: 'Szukaj postów',
  noPostsFor: 'Nie znaleźliśmy postów dla „{{busqueda}}”',
};
