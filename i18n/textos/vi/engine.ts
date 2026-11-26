/*
 * VIETNAMITA — Panel del Weë AI Engine (solo administración).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Làm mới',
  statusFailed: 'Không đọc được trạng thái của engine. Máy chủ có đang chạy không?',
  changeFailed: 'Không thể áp dụng thay đổi',

  adminOnly: 'Chỉ dành cho quản trị viên',
  adminOnlyNote: 'Bảng này dành cho đội ngũ Weë. Nếu bạn thuộc đội ngũ, hãy nhờ thêm tài khoản của bạn làm quản trị viên.',

  settingsTitle: 'Cài đặt',
  settingsLine: 'Giá: {{precios}} · {{credits}} Credits mỗi USD · biên lợi nhuận {{margen}} % · chính sách {{politica}} · chế độ demo làm phương án cuối: {{demo}}',
  pricesTest: 'thử nghiệm',
  pricesReal: 'thực tế',
  yes: 'có',
  no: 'không',
  configFrom: 'Cấu hình được đọc từ {{origen}}.',
  sourceDefaults: 'các giá trị mặc định trong mã',
  resetHealth: 'Đặt lại tình trạng',
  healthReset: 'Đã đặt lại tình trạng.',
  seedDone: 'Đã lưu các giá trị mặc định vào Firestore.',

  providers: 'Nhà cung cấp',
  priority: 'ưu tiên {{numero}}',
  enable: 'Bật {{proveedor}}',
  disable: 'Tắt {{proveedor}}',
  withKey: 'có khóa',
  withoutKey: 'không có khóa',
  active: 'đang hoạt động',
  inactive: 'không hoạt động',
  pausedByFailures: 'tạm dừng do lỗi',
  recentFailures_one: '{{contador}} lỗi gần đây',
  recentFailures_other: '{{contador}} lỗi gần đây',
  modelLine: '• {{id}} · chất lượng {{calidad}}/5 · tốc độ {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · tối đa {{segundos}} s',
  pendingVerification: ' · đang chờ xác minh',

  chains: 'Chuỗi dự phòng',
  policyLabel: 'Chính sách {{capacidad}}: {{politica}}',
  onlyDemo: 'chỉ chế độ demo (chưa có nhà cung cấp thật)',
  editNote: 'Để đổi thứ tự một chuỗi hoặc cố định một mô hình, hãy sửa aiRouting/{{capacidad}} trong Firestore hoặc dùng engineAdmin · setRouting.',

  policyQualityFirst: 'Ưu tiên chất lượng',
  policyBalanced: 'Cân bằng',
  policyCostFirst: 'Ưu tiên chi phí',

  modalityText: 'văn bản',
  modalityVision: 'thị giác',
  modalityImage: 'hình ảnh',
  modalityVideo: 'video',
  modalityVoice: 'giọng nói',
  modalityMusic: 'âm nhạc',
  modalityDoc: 'tài liệu',
  rowSubtitle: 'Nhà cung cấp, chuỗi dự phòng và cài đặt (chỉ dành cho quản trị viên)',
};
