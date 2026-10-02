/*
 * CHINO SIMPLIFICADO — buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * En chino «2 caracteres» y «2 letras» son lo mismo —2 个字符—, así que las dos
 * frases del mínimo dicen lo mismo con el objeto cambiado. La cifra va con UN
 * espacio a cada lado, como manda el hanzi con los números.
 *
 * LO QUE NO ENTRA AQUÍ: lo que la persona escribe en el buscador, ni los
 * resultados, que son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: '搜索',
  placeholder: '搜索社区、用户或动态',
  communities: '社区',
  people: '用户',
  posts: '动态',
  loading: '加载中…',
  popularTopics: '热门话题',
  trending: '趋势',
  noPostsForTopic: '这个话题下还没有动态',
  results: '结果',
  noCommunities: '没有找到社区',
  member: '成员',
  typeTwoForPeople: '至少输入 2 个字符才能搜索用户',
  typeTwoForPosts: '至少输入 2 个字符才能搜索动态',
  peopleFound: '找到的用户',
  searchPeople: '搜索用户',
  noPeopleFor: '没有找到与“{{busqueda}}”相关的用户',
  postsFound: '找到的动态',
  searchPosts: '搜索动态',
  noPostsFor: '没有找到与“{{busqueda}}”相关的动态',
};
