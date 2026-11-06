/*
 * INDONESIO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo que la persona escribe en el buscador entra por `{{busqueda}}` y no se toca. «Cari» es buscar
 * (glosario § 4); «Pengguna» es usuario, como en `common.user`; «Postingan» es publicación.
 */
export const search: typeof import('../es/search').search = {
  title: 'Cari',
  placeholder: 'Cari komunitas, orang, atau postingan',
  communities: 'Komunitas',
  people: 'Pengguna',
  posts: 'Postingan',
  loading: 'Memuat...',
  popularTopics: 'Topik populer',
  trending: 'Sedang tren',
  noPostsForTopic: 'Tidak ada postingan dengan topik ini',
  results: 'Hasil',
  noCommunities: 'Komunitas tidak ditemukan',
  member: 'Anggota',
  typeTwoForPeople: 'Ketik minimal 2 karakter untuk mencari pengguna',
  typeTwoForPosts: 'Ketik minimal 2 huruf untuk mencari postingan',
  peopleFound: 'Pengguna ditemukan',
  searchPeople: 'Cari pengguna',
  noPeopleFor: 'Tidak ada pengguna yang ditemukan untuk "{{busqueda}}"',
  postsFound: 'Postingan ditemukan',
  searchPosts: 'Cari postingan',
  noPostsFor: 'Kami tidak menemukan postingan untuk "{{busqueda}}"',
};
