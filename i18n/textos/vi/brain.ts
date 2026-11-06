/*
 * VIETNAMITA — Weë Brain: cabecera, caja y bloque de respuestas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Trợ lý thông minh cho mọi việc của bạn',
  slogan: 'Tưởng tượng · Hỏi đáp · Sáng tạo · Kết nối',
  description: 'Toàn bộ sức mạnh của Weë, trong một cuộc trò chuyện duy nhất.',
  systemLabel: 'Weë Brain, kết nối với các mục khác của Weë AI',
  goTo: 'Đi tới {{seccion}}',
  placeholder: 'Viết tin nhắn của bạn ở đây...',
  settingsHint: 'Bạn muốn được trả lời như thế nào.',
  searchGroup: 'Tìm kiếm trên internet',
  imageLabel: 'Hình ảnh',
  settingsLabel: 'Cài đặt',
  blockLeft: 'Còn {{restantes}}/{{total}} câu trả lời',
};
