/*
 * PERSA — Notificaciones. El NOMBRE de quien la provoca entra como valor y va
 * como sujeto al principio de la frase, sin sufijos pegados al hueco. Tipado
 * contra el español.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'اعلان‌ها',
  empty: 'اعلانی نیست',
  emptyHint: 'وقتی کسی با شما تعامل کند، اینجا نمایش داده می‌شود',
  allRead: 'همه اعلان‌هایتان را خوانده‌اید',
  noneNew: 'اعلان جدیدی نیست',
  like: '{{nombre}} پست شما را پسندید',
  comment: '{{nombre}} روی پست شما نظر داد',
  follow: '{{nombre}} شما را دنبال کرد',
  econtactRequest: '{{nombre}} می‌خواهد شما را به ËContact اضافه کند',
  econtactAccepted: '{{nombre}} درخواست ËContact شما را پذیرفت',
  repost: '{{nombre}} پست شما را بازنشر کرد',
  mention: '{{nombre}} شما را منشن کرد',
  reply: '{{nombre}} به نظر شما پاسخ داد',
  communityPost: '{{nombre}} در {{comunidad}} پست گذاشت',
  aCommunity: 'یک انجمن',
  generic: '{{nombre}} با شما تعامل کرد',
  now: 'اکنون',
  markAllRead: 'علامت‌گذاری همه به‌عنوان خوانده‌شده',
  all: 'همه',
  unread: 'خوانده‌نشده',
  unreadWithCount: 'خوانده‌نشده ({{total}})',
};
