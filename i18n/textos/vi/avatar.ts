/*
 * VIETNAMITA — Elegir avatar: estilos, foto propia y avatar humano con IA.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Chọn ảnh đại diện',

  aiSection: 'Avatar người bằng AI',
  aiTitle: 'Tạo avatar người của tôi',
  aiSubtitle: 'Tạo một gương mặt hư cấu bằng AI',

  photoSection: 'Ảnh của riêng bạn',
  takePhoto: 'Chụp ảnh',
  pickImage: 'Chọn hình ảnh',
  fromGallery: 'Từ thư viện',

  avatarsSection: 'Ảnh đại diện',
  processing: 'Đang xử lý hình ảnh...',

  galleryPermission: 'Cần quyền truy cập thư viện ảnh của bạn để chọn ảnh',
  cameraPermission: 'Cần quyền truy cập máy ảnh của bạn để chụp ảnh',
  pickFailed: 'Không thể chọn hình ảnh. Vui lòng thử lại.',
  photoFailed: 'Không thể chụp ảnh',
  styleAdventurer: 'Nhà thám hiểm',
  styleRobots: 'Người máy',
  styleSmile: 'Nụ cười',
  stylePeople: 'Con người',
};
