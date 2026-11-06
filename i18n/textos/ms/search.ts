/*
 * MALAYO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo que la persona escribe en el buscador y los resultados no pasan por aquí. «Tendencias» es
 * «Sohor kini», el término del DBP para «trending».
 */
export const search: typeof import('../es/search').search = {
  title: 'Cari',
  placeholder: 'Cari komuniti, orang atau siaran',
  communities: 'Komuniti',
  people: 'Pengguna',
  posts: 'Siaran',
  loading: 'Memuatkan...',
  popularTopics: 'Topik popular',
  trending: 'Sohor kini',
  noPostsForTopic: 'Tiada siaran dengan topik ini',
  results: 'Hasil',
  noCommunities: 'Tiada komuniti ditemui',
  member: 'Ahli',
  typeTwoForPeople: 'Taip sekurang-kurangnya 2 aksara untuk mencari pengguna',
  typeTwoForPosts: 'Taip sekurang-kurangnya 2 huruf untuk mencari siaran',
  peopleFound: 'Pengguna ditemui',
  searchPeople: 'Cari pengguna',
  noPeopleFor: 'Tiada pengguna ditemui untuk "{{busqueda}}"',
  postsFound: 'Siaran ditemui',
  searchPosts: 'Cari siaran',
  noPostsFor: 'Kami tidak menemui siaran untuk "{{busqueda}}"',
};
