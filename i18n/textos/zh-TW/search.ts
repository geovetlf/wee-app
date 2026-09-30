/*
 * CHINO TRADICIONAL (TAIWÁN) — buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * En Taiwán buscar es 搜尋, nunca 搜索; una comunidad es un 社群, no un 社區;
 * una persona que usa la app es un 使用者, no un 用戶; y lo que publica es un
 * 貼文, no un 動態.
 *
 * En chino «2 caracteres» y «2 letras» son lo mismo —2 個字元, con 字元, que es
 * como Taiwán llama a un carácter—, así que las dos frases del mínimo dicen lo
 * mismo con el objeto cambiado. La cifra va con UN espacio a cada lado, como
 * manda el hanzi con los números.
 *
 * LO QUE NO ENTRA AQUÍ: lo que la persona escribe en el buscador, ni los
 * resultados, que son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: '搜尋',
  placeholder: '搜尋社群、使用者或貼文',
  communities: '社群',
  people: '使用者',
  posts: '貼文',
  loading: '載入中…',
  popularTopics: '熱門話題',
  trending: '趨勢',
  noPostsForTopic: '這個話題下還沒有貼文',
  results: '結果',
  noCommunities: '找不到社群',
  member: '成員',
  typeTwoForPeople: '至少輸入 2 個字元才能搜尋使用者',
  typeTwoForPosts: '至少輸入 2 個字元才能搜尋貼文',
  peopleFound: '找到的使用者',
  searchPeople: '搜尋使用者',
  noPeopleFor: '找不到與「{{busqueda}}」相關的使用者',
  postsFound: '找到的貼文',
  searchPosts: '搜尋貼文',
  noPostsFor: '找不到與「{{busqueda}}」相關的貼文',
};
