/*
 * Buscar en montenegrino (ijekaviano, latino): «Pretraga» como nombre, «Pretraži» como orden.
 * Lo que la persona escribe en el buscador entra por {{busqueda}} y no se toca.
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
  noCommunities: 'Nijesu pronađene zajednice',
  member: 'Član',
  typeTwoForPeople: 'Unesi najmanje 2 znaka da pretražiš korisnike',
  typeTwoForPosts: 'Unesi najmanje 2 slova da pretražiš objave',
  peopleFound: 'Pronađeni korisnici',
  searchPeople: 'Pretraži korisnike',
  noPeopleFor: 'Nijesu pronađeni korisnici za „{{busqueda}}“',
  postsFound: 'Pronađene objave',
  searchPosts: 'Pretraži objave',
  noPostsFor: 'Nijesmo našli objave za „{{busqueda}}“',
};
