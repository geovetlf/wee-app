/*
 * JAPONÉS — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Miembro», en el botón de una comunidad a la que ya perteneces, es 参加中: dice el estado, como フォロー中.
 */
export const search: typeof import('../es/search').search = {
  title: '検索',
  placeholder: 'コミュニティ、ユーザー、投稿を検索',
  communities: 'コミュニティ',
  people: 'ユーザー',
  posts: '投稿',
  loading: '読み込み中…',
  popularTopics: '人気のトピック',
  trending: 'トレンド',
  noPostsForTopic: 'このトピックの投稿はありません。',
  results: '検索結果',
  noCommunities: '該当するコミュニティはありません。',
  member: '参加中',
  typeTwoForPeople: 'ユーザーを検索するには、2文字以上入力してください。',
  typeTwoForPosts: '投稿を検索するには、2文字以上入力してください。',
  peopleFound: 'ユーザーの検索結果',
  searchPeople: 'ユーザーを検索',
  noPeopleFor: '「{{busqueda}}」に該当するユーザーはいません。',
  postsFound: '投稿の検索結果',
  searchPosts: '投稿を検索',
  noPostsFor: '「{{busqueda}}」に該当する投稿はありません。',
};
