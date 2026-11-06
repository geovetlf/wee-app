/*
 * VIETNAMITA — Mis proyectos de Weë AI.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Tác phẩm của bạn, sắp xếp theo dự án',
  introText: 'Một dự án có thể gồm logo, ảnh, quảng cáo, video, nhạc và tài liệu. Lưu mỗi kết quả vào dự án của nó từ “{{accion}}”.',
  sectionTitle: 'Dự án',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Ví dụ: Nhà hàng của tôi',
  emptyTitle: 'Bạn chưa có dự án nào',
  emptyText: 'Hãy tạo dự án đầu tiên, hoặc lưu một tác phẩm vào dự án từ kết quả của nó.',
  emptyAction: 'Tạo dự án đầu tiên của tôi',
  open: 'Mở',
  fallbackTitle: 'Dự án',
  notFound: 'Không tìm thấy dự án này.',
  saveName: 'Lưu tên',
  rename: 'Đổi tên',
  deleteProject: 'Xóa dự án',
  deleteConfirmWeb: 'Xóa dự án “{{nombre}}”? Các tác phẩm của bạn sẽ không bị xóa.',
  deleteConfirm: 'Xóa “{{nombre}}”? Các tác phẩm của bạn sẽ không bị xóa.',
  creations_one: '{{contador}} tác phẩm',
  creations_other: '{{contador}} tác phẩm',
  creationsTitle: 'Tác phẩm',
  add: 'Thêm',
  noCreations: 'Chưa có tác phẩm nào ở đây. Hãy tạo gì đó với bất kỳ chuyên gia nào và lưu vào dự án này.',
  whatIsMissing: 'Dự án này còn thiếu gì?',
  whatIsMissingNote: 'Một logo, ảnh, quảng cáo, video, nhạc hay tài liệu: bất kỳ chuyên gia nào của Weë cũng có thể bổ sung vào đây.',
  createSomethingNew: 'Tạo gì đó mới',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} dự án',
  count_other: '{{contador}} dự án',
  updatedOn: 'Cập nhật {{fecha}}',
  searchPlaceholder: 'Tìm dự án',
  sortUpdated: 'Mới cập nhật',
  sortName: 'Tên (A–Z)',
  noMatches: 'Không có dự án nào khớp với tìm kiếm của bạn.',
  emptySpaceTitle: 'Không gian sáng tạo của bạn bắt đầu từ đây',
  moreActions: 'Thao tác khác',
};
