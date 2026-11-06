/*
 * VIETNAMITA — Los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Trang chủ',
  search: 'Tìm kiếm',
  create: 'Tạo',
  talk: 'WeeTalk',
  notifications: 'Thông báo',
  current: 'mục hiện tại',
  goTo: 'Đi tới {{nombre}}',
  weeNavigation: 'Điều hướng Weë',
  goHome: 'Về Trang chủ',
  myProfile: 'Đi tới hồ sơ của tôi',
  openWeeAi: 'Mở Weë AI',
  goToWeeAi: 'Đi tới Weë AI',
  weeAiQuestion: 'Hôm nay bạn muốn tạo gì?',
  weeAiPitch: 'Hãy nói với Weë điều bạn muốn. Weë sẽ lo phần AI.',
  brandSlogan: 'Tưởng tượng · Sáng tạo · Kết nối',
  documentTitle: 'Weë - {{eslogan}}',
};
