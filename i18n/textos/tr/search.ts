/*
 * TURCO — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los buscadores siguen el patrón «… ara» (guía § 8): «Kişi ara», «Gönderi ara». Lo que la persona
 * escribe va entre “…” y seguido de «için», que no se pega a nada: «“{{busqueda}}” için kişi
 * bulunamadı». «Tendencias» es «Gündem» (glosario 10.2). `member` es el estado del botón de una
 * comunidad a la que ya perteneces: «Üyesin». Lo que la persona escribe en el buscador y los
 * resultados no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'Ara',
  placeholder: 'Topluluk, kişi veya gönderi ara',
  communities: 'Topluluklar',
  people: 'Kişiler',
  posts: 'Gönderiler',
  loading: 'Yükleniyor…',
  popularTopics: 'Popüler konular',
  trending: 'Gündem',
  noPostsForTopic: 'Bu konuda gönderi yok',
  results: 'Sonuçlar',
  noCommunities: 'Topluluk bulunamadı',
  member: 'Üyesin',
  typeTwoForPeople: 'Kişi aramak için en az 2 karakter yaz',
  typeTwoForPosts: 'Gönderi aramak için en az 2 harf yaz',
  peopleFound: 'Bulunan kişiler',
  searchPeople: 'Kişi ara',
  noPeopleFor: '“{{busqueda}}” için kişi bulunamadı',
  postsFound: 'Bulunan gönderiler',
  searchPosts: 'Gönderi ara',
  noPostsFor: '“{{busqueda}}” için gönderi bulunamadı',
};
