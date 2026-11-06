/*
 * VIETNAMITA — Buscar: comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const search: typeof import('../es/search').search = {
  title: 'Tìm kiếm',
  placeholder: 'Tìm cộng đồng, người dùng hoặc bài viết',
  communities: 'Cộng đồng',
  people: 'Người dùng',
  posts: 'Bài viết',
  loading: 'Đang tải...',
  popularTopics: 'Chủ đề phổ biến',
  trending: 'Xu hướng',
  noPostsForTopic: 'Chưa có bài viết nào về chủ đề này',
  results: 'Kết quả',
  noCommunities: 'Không tìm thấy cộng đồng nào',
  member: 'Thành viên',
  typeTwoForPeople: 'Nhập ít nhất 2 ký tự để tìm người dùng',
  typeTwoForPosts: 'Nhập ít nhất 2 chữ cái để tìm bài viết',
  peopleFound: 'Người dùng tìm thấy',
  searchPeople: 'Tìm người dùng',
  noPeopleFor: 'Không tìm thấy người dùng nào cho “{{busqueda}}”',
  postsFound: 'Bài viết tìm thấy',
  searchPosts: 'Tìm bài viết',
  noPostsFor: 'Không tìm thấy bài viết nào cho “{{busqueda}}”',
};
