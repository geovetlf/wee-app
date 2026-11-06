/*
 * VIETNAMITA — Notificaciones. El nombre de quien la provoca entra como valor y no se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Thông báo',
  empty: 'Không có thông báo',
  emptyHint: 'Khi có người tương tác với bạn, thông báo sẽ hiện ở đây',
  allRead: 'Bạn đã đọc hết thông báo',
  noneNew: 'Không có thông báo mới',
  like: '{{nombre}} đã thích bài viết của bạn',
  comment: '{{nombre}} đã bình luận về bài viết của bạn',
  follow: '{{nombre}} đã bắt đầu theo dõi bạn',
  econtactRequest: '{{nombre}} muốn thêm bạn vào ËContact',
  econtactAccepted: '{{nombre}} đã chấp nhận yêu cầu ËContact của bạn',
  repost: '{{nombre}} đã chia sẻ bài viết của bạn',
  mention: '{{nombre}} đã nhắc đến bạn',
  reply: '{{nombre}} đã trả lời bình luận của bạn',
  communityPost: '{{nombre}} đã đăng trong {{comunidad}}',
  aCommunity: 'một cộng đồng',
  generic: '{{nombre}} đã tương tác với bạn',
  now: 'vừa xong',
  markAllRead: 'Đánh dấu tất cả là đã đọc',
  all: 'Tất cả',
  unread: 'Chưa đọc',
  unreadWithCount: 'Chưa đọc ({{total}})',
};
