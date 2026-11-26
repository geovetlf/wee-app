/*
 * BOSNIO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que la persona escribe en el buscador entra por {{busqueda}} sin tocar.
 */
export const search: typeof import('../es/search').search = {
  title: 'Pretraga',
  placeholder: 'Pretraži zajednice, ljude ili objave',
  communities: 'Zajednice',
  people: 'Korisnici',
  posts: 'Objave',
  loading: 'Učitavanje...',
  popularTopics: 'Popularne teme',
  trending: 'U trendu',
  noPostsForTopic: 'Nema objava na ovu temu',
  results: 'Rezultati',
  noCommunities: 'Nijedna zajednica nije pronađena',
  member: 'Član',
  typeTwoForPeople: 'Unesi najmanje 2 znaka za pretragu korisnika',
  typeTwoForPosts: 'Unesi najmanje 2 slova za pretragu objava',
  peopleFound: 'Pronađeni korisnici',
  searchPeople: 'Pretraži korisnike',
  noPeopleFor: 'Nema korisnika za „{{busqueda}}“',
  postsFound: 'Pronađene objave',
  searchPosts: 'Pretraži objave',
  noPostsFor: 'Nismo pronašli objave za „{{busqueda}}“',
};
