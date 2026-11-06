/*
 * VIETNAMITA — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Lượt thích mới',
  likeCuerpo: '{{nombre}} đã thích bài viết của bạn',
  comentarioTitulo: 'Bình luận mới',
  comentarioCuerpo: '{{nombre}} đã bình luận về bài viết của bạn',
  seguidorTitulo: 'Người theo dõi mới',
  seguidorCuerpo: '{{nombre}} đã bắt đầu theo dõi bạn',
  solicitudTitulo: 'Yêu cầu ËContact mới',
  solicitudCuerpo: '{{nombre}} muốn thêm bạn vào ËContact',
  aceptadaTitulo: 'ËContact mới',
  aceptadaCuerpo: '{{nombre}} đã chấp nhận yêu cầu ËContact của bạn',
  mencionTitulo: 'Bạn được nhắc đến',
  mencionCuerpo: '{{nombre}} đã nhắc đến bạn trong một bài viết',
  repostTitulo: 'Lượt đăng lại mới',
  repostCuerpo: '{{nombre}} đã đăng lại bài viết của bạn',
  respuestaTitulo: 'Câu trả lời mới',
  respuestaCuerpo: '{{nombre}} đã trả lời bình luận của bạn',
  mensajeTitulo: 'Tin nhắn mới',
  mensajeCuerpo: '{{nombre}} đã gửi cho bạn một tin nhắn',
  alguien: 'Ai đó',
  teEnvioUnMensaje: 'Đã gửi cho bạn một tin nhắn',
  fotoUnica: 'Ảnh xem một lần',
  imagen: '📷 Hình ảnh',
  audio: '🎤 Âm thanh',
};
