/*
 * Buscar en croata: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). Lo que la persona escribe en el buscador entra por
 * {{busqueda}} y no se toca.
 */
export const search: typeof import('../es/search').search = {
  title: 'Pretraži',
  placeholder: 'Pretraži zajednice, ljude ili objave',
  communities: 'Zajednice',
  people: 'Korisnici',
  posts: 'Objave',
  loading: 'Učitavanje...',
  popularTopics: 'Popularne teme',
  trending: 'U trendu',
  noPostsForTopic: 'Nema objava s ovom temom',
  results: 'Rezultati',
  noCommunities: 'Nijedna zajednica nije pronađena',
  member: 'Član',
  typeTwoForPeople: 'Upiši barem 2 znaka za pretraživanje korisnika',
  typeTwoForPosts: 'Upiši barem 2 slova za pretraživanje objava',
  peopleFound: 'Pronađeni korisnici',
  searchPeople: 'Pretraži korisnike',
  noPeopleFor: 'Nijedan korisnik nije pronađen za „{{busqueda}}“',
  postsFound: 'Pronađene objave',
  searchPosts: 'Pretraži objave',
  noPostsFor: 'Nismo pronašli objave za „{{busqueda}}“',
};
