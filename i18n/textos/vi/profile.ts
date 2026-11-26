/*
 * VIETNAMITA — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Thêm ảnh bìa',
  permissionsTitle: 'Quyền truy cập',
  galleryPermission: 'Cần cấp quyền để truy cập thư viện ảnh',
  coverUploadFailed: 'Không thể tải ảnh bìa lên',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Đang tải hồ sơ...',
  loadFailed: 'Không tải được hồ sơ',
  loadFailedDetail: 'Không tải được thông tin người dùng',
  backToLogin: 'Quay lại đăng nhập',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Tên không được để trống',
  updateFailed: 'Không thể cập nhật hồ sơ',
  signOutFailed: 'Không thể đăng xuất',
  noSession: 'Không có phiên đăng nhập nào',
  avatarUpdateFailed: 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.',
  imageUrlMissing: 'Không nhận được URL hình ảnh',

  /* ── Compartir el perfil. ────────────────────────────────────────────── */
  shareMessage: 'Xem hồ sơ của {{nombre}} trên Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Chỉnh sửa hồ sơ',
  displayNameLabel: 'Tên hiển thị',
  displayNamePlaceholder: 'Tên hiển thị của bạn',
  bioLabel: 'Tiểu sử',
  bioPlaceholder: 'Kể về bản thân bạn...',
  websiteLabel: 'Trang web',
  websitePlaceholder: 'https://trangcuaban.com',
  charCount: '{{usados}}/{{maximo}} ký tự',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Chỉnh sửa hồ sơ',
  createWeeProfile: 'Tạo Hồ sơ Weë',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Bài viết',
  viewMyEcontacts: 'Xem {{nombre}} của tôi, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Đa phương tiện',
  tabReposts: 'Đăng lại',
  tabLikes: 'Lượt thích',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Đang tải bài viết...',
  postsFailed: 'Không tải được bài viết',
  retry: 'Thử lại',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Bạn chưa có bài viết nào',
  emptyPostsHint: 'Hãy chia sẻ bài viết đầu tiên của bạn!',
  emptyMedia: 'Bạn chưa có bài viết nào có ảnh hoặc video',
  emptyMediaHint: 'Tạo bài viết có ảnh hoặc video',
  emptyReposts: 'Bạn chưa đăng lại gì',
  emptyRepostsHint: 'Chia sẻ nội dung của người dùng khác',
  emptyLikes: 'Bạn chưa thích bài viết nào',
  emptyLikesHint: 'Hãy thích những bài viết bạn quan tâm',
  otherTitle: 'Hồ sơ',
  otherLoadFailed: 'Không tải được hồ sơ',
  seeFullProfile: 'Xem toàn bộ hồ sơ của tôi',
  emptyCategory: 'Chưa có bài viết trong mục này',
  actionFailed: 'Không thể hoàn tất',
  userNotFound: 'Người dùng không tồn tại',
  shareOtherMessage: 'Xem hồ sơ của @{{nombre}} trên Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Người dùng Weë',
  joinedOn: 'Tham gia vào {{fecha}}',
  tabPolls: 'Bình chọn',
};
