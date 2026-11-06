/*
 * VIETNAMITA — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Tạo cộng đồng',
  searchPlaceholder: 'Tìm cộng đồng...',
  loading: 'Đang tải cộng đồng...',

  joinedSection: 'Cộng đồng đã tham gia',
  discoverSection: 'Khám phá cộng đồng',

  official: 'Chính thức',
  members_one: '{{contador}} thành viên',
  members_other: '{{contador}} thành viên',
  memberOf: 'Đã tham gia',
  join: 'Tham gia',

  leaveTitle: 'Rời cộng đồng',
  leaveConfirm: 'Bạn có chắc muốn rời “{{nombre}}” không?',
  leave: 'Rời',
  leaveFailed: 'Không thể rời cộng đồng',
  actionFailed: 'Không thể hoàn tất thao tác',

  newCommunity: 'Cộng đồng mới',
  name: 'Tên',
  namePlaceholder: 'Ví dụ: Hội mê cà phê',
  description: 'Mô tả',
  descriptionPlaceholder: 'Cộng đồng này nói về điều gì?',
  createFailed: 'Không thể tạo cộng đồng',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Cộng đồng {{nombre}}',
  empty: 'Không có cộng đồng nào',

  /* La entrada del Home. */
  findYours: 'Tìm cộng đồng của bạn.',
  searchLabel: 'Tìm cộng đồng',
  members: 'thành viên',
  posts: 'bài viết',
  rules: 'Quy tắc cộng đồng',
  one: 'Cộng đồng',
  loadFailed: 'Không tải được cộng đồng',
  noPosts: 'Chưa có bài viết nào',
  beTheFirst: 'Hãy là người đầu tiên đăng bài trong cộng đồng này',
  createPost: 'Tạo bài viết',
  understoodJoin: 'Tôi hiểu, tham gia',
  memberCount_one: '{{cantidad}} thành viên',
  memberCount_other: '{{cantidad}} thành viên',
  postCount_one: '{{contador}} bài viết',
  postCount_other: '{{contador}} bài viết',
  officialNameFilmAnimation: 'Điện ảnh & Hoạt hình',
  officialNameArtCreativity: 'Nghệ thuật & Sáng tạo',
  officialNameCreatorsInfluencers: 'Nhà sáng tạo & Influencer',
  officialNameBusinessEntrepreneurship: 'Kinh doanh & Khởi nghiệp',
  officialNameTechAi: 'Công nghệ & AI',
  officialNameGamingVirtualWorlds: 'Gaming & Thế giới ảo',
  officialNameEducationLearning: 'Giáo dục & Học tập',
  officialNameFutureSociety: 'Tương lai & Xã hội',
  officialRuleShare: 'Chia sẻ những gì bạn tạo bằng AI và kể cách bạn đã làm',
  officialRuleRespect: 'Hỏi và trả lời một cách tôn trọng',
  officialRuleNoSpam: 'Không spam và không đăng nội dung không phải của bạn',
  popularDescFilmmakers: 'Những người dùng AI cho điện ảnh và sản xuất nghe nhìn. Hãy chia sẻ quy trình của bạn và học hỏi từ người khác.',
  popularDescInfluencers: 'Influencer và nhà sáng tạo nội dung sản xuất cùng AI.',
  popularDescDesigners: 'Nhà thiết kế làm việc với AI: thương hiệu, minh họa, nghệ thuật số.',
  popularDescWriters: 'Người viết sáng tác cùng AI: sách, kịch bản, bài báo và thơ.',
  popularDescMusicians: 'Người sáng tạo âm nhạc và âm thanh bằng AI.',
  popularDescDevelopers: 'Lập trình viên xây dựng sản phẩm cùng AI.',
  popularDescEntrepreneurs: 'Doanh nhân dùng AI trong công việc kinh doanh.',
  popularDescGamers: 'AI và trò chơi điện tử: nhân vật, thế giới và trải nghiệm.',
};
