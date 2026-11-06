/*
 * VIETNAMITA — Mis creaciones: la biblioteca de material de la cuenta y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Tác phẩm của tôi',
  intro: 'Mọi thứ bạn đã tạo bằng Weë AI, ở cùng một nơi. Chúng thuộc về tài khoản của bạn: bạn thấy như nhau từ Hồ sơ thật và Hồ sơ Weë.',

  /* Filtros por tipo. */
  filterAll: 'Tất cả',
  filterImages: 'Hình ảnh',
  filterVideos: 'Video',
  filterAudio: 'Âm thanh',
  filterDocuments: 'Tài liệu',
  filterModel3d: '3D',
  filterLabel: 'Lọc theo loại',

  /* Orden. */
  sortRecent: 'Mới nhất',
  sortOldest: 'Cũ nhất',
  sortLabel: 'Sắp xếp',

  /* Estados de la lista. */
  loading: 'Đang tải các tác phẩm của bạn…',
  loadFailed: 'Không tải được các tác phẩm của bạn.',
  retry: 'Thử lại',
  loadMore: 'Tải thêm',
  emptyTitle: 'Bạn chưa có tác phẩm nào',
  emptyText: 'Mọi thứ bạn làm với Weë AI sẽ xuất hiện ở đây, cùng hình ảnh, video hoặc âm thanh của nó.',
  emptyAction: 'Tạo gì đó với Weë AI',
  emptyFiltered: 'Không có tác phẩm thuộc loại này.',
  count_one: '{{contador}} tác phẩm',
  count_other: '{{contador}} tác phẩm',

  /* Estados de una creación. */
  statusUploading: 'Đang tải lên',
  statusProcessing: 'Đang xử lý',
  statusReady: 'Sẵn sàng',
  statusFailed: 'Chưa thành công',
  statusDeleted: 'Đã xóa',
  pendingDeletion: 'Tệp sẽ sớm được gỡ bỏ.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Hình ảnh',
  kindVideo: 'Video',
  kindAudio: 'Âm thanh',
  kindDocument: 'Tài liệu',
  kindModel3d: '3D',
  kindText: 'Văn bản',

  /* Acciones sobre una creación. */
  open: 'Mở',
  openCreation: 'Mở tác phẩm: {{nombre}}',
  download: 'Tải xuống',
  downloaded: 'Đã lưu vào thư viện ảnh của bạn.',
  downloadFailed: 'Không thể tải xuống. Vui lòng thử lại.',
  downloadPermission: 'Weë cần quyền để lưu vào thư viện ảnh của bạn.',
  savedInCreations: 'Đã lưu vào tác phẩm của bạn',
  save: 'Lưu',
  saved: 'Đã lưu',
  useInProject: 'Dùng trong dự án',
  publish: 'Đăng',
  share: 'Chia sẻ',
  delete: 'Xóa',
  deleteConfirm: 'Xóa tác phẩm này? Tệp sẽ bị xóa. Những gì bạn đã đăng không thay đổi.',
  deleteConfirmWeb: 'Xóa tác phẩm này? Tệp sẽ bị xóa. Những gì bạn đã đăng không thay đổi.',
  deleted: 'Đã xóa tác phẩm.',
  deleteFailed: 'Không thể xóa. Vui lòng thử lại.',
  createdWith: 'Tạo bằng {{nombre}}',
  createdOn: 'Tạo ngày {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} đang làm việc',
  progressStarting: 'Đang bắt đầu…',
  progressSteps: 'Đã xong {{hechos}}/{{total}} bước',
  progressFindLater: 'Bạn có thể rời màn hình này; khi xong, bạn sẽ thấy nó trong “Tác phẩm của tôi”.',

  /* Mundos 3D. */
  filterWorlds: 'Thế giới 3D',
  kindWorld: 'Thế giới 3D',
  noViewer3d: 'Weë chưa có trình xem 3D. Hãy tải xuống để mở bằng một ứng dụng 3D.',
  rightsTitle: 'Bạn có thể làm gì với nó',
  rightsProvenance: 'Tạo bằng AI trên Weë, với một mô hình bên thứ ba có giấy phép riêng.',
  rightsCommercialAllowed: 'Bạn có thể dùng cho mục đích thương mại.',
  rightsCommercialRestricted: 'Việc dùng cho mục đích thương mại có điều kiện.',
  rightsCommercialUnclear: 'Chưa rõ có được dùng cho mục đích thương mại hay không.',
  rightsCommercialNotAllowed: 'Không được dùng cho mục đích thương mại.',
  rightsAttribution: 'Giấy phép yêu cầu ghi nguồn.',
  rightsBlockedIn: 'Không được dùng hay hiển thị tại: {{lugares}}.',
};
