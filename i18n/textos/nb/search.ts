/*
 * NORUEGO BOKMÅL — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que la persona escribe en el buscador entra por `{{busqueda}}` entre comillas noruegas.
 */
export const search: typeof import('../es/search').search = {
  title: 'Søk',
  placeholder: 'Søk etter fellesskap, personer eller innlegg',
  communities: 'Fellesskap',
  people: 'Brukere',
  posts: 'Innlegg',
  loading: 'Laster…',
  popularTopics: 'Populære emner',
  trending: 'Trender',
  noPostsForTopic: 'Ingen innlegg med dette emnet',
  results: 'Resultater',
  noCommunities: 'Fant ingen fellesskap',
  member: 'Medlem',
  typeTwoForPeople: 'Skriv minst 2 tegn for å søke etter brukere',
  typeTwoForPosts: 'Skriv minst 2 bokstaver for å søke etter innlegg',
  peopleFound: 'Brukere funnet',
  searchPeople: 'Søk etter brukere',
  noPeopleFor: 'Fant ingen brukere for «{{busqueda}}»',
  postsFound: 'Innlegg funnet',
  searchPosts: 'Søk etter innlegg',
  noPostsFor: 'Vi fant ingen innlegg for «{{busqueda}}»',
};
