/*
 * COREANO — buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. En coreano «2 caracteres» y «2 letras» son lo mismo —2자—,
 * así que las dos frases del mínimo dicen lo mismo con el objeto cambiado.
 *
 * LO QUE NO ENTRA AQUÍ: lo que la persona escribe en el buscador, ni los
 * resultados, que son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: '검색',
  placeholder: '커뮤니티, 사람, 게시물 검색',
  communities: '커뮤니티',
  people: '사용자',
  posts: '게시물',
  loading: '불러오는 중...',
  popularTopics: '인기 주제',
  trending: '트렌드',
  noPostsForTopic: '이 주제의 게시물이 없어요',
  results: '결과',
  noCommunities: '커뮤니티를 찾지 못했어요',
  member: '멤버',
  typeTwoForPeople: '사용자를 찾으려면 2자 이상 입력하세요',
  typeTwoForPosts: '게시물을 찾으려면 2자 이상 입력하세요',
  peopleFound: '검색된 사용자',
  searchPeople: '사용자 검색',
  noPeopleFor: '"{{busqueda}}"에 해당하는 사용자를 찾지 못했어요',
  postsFound: '검색된 게시물',
  searchPosts: '게시물 검색',
  noPostsFor: '"{{busqueda}}"에 해당하는 게시물을 찾지 못했어요',
};
