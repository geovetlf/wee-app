/*
 * MONGOL — Notificaciones. El NOMBRE de quien la provoca entra como valor en nominativo (sujeto) y no se traduce.
 * Tipado contra el español. Ningún sufijo se pega a {{nombre}} ni a {{comunidad}}.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Мэдэгдэл',
  empty: 'Мэдэгдэл байхгүй',
  emptyHint: 'Хэн нэгэн тантай харилцах үед энд харагдана',
  allRead: 'Та бүх мэдэгдлээ уншсан байна',
  noneNew: 'Шинэ мэдэгдэл байхгүй',
  like: '{{nombre}} таны нийтлэлд лайк дарлаа',
  comment: '{{nombre}} таны нийтлэлд сэтгэгдэл үлдээлээ',
  follow: '{{nombre}} таныг дагаж эхэллээ',
  econtactRequest: '{{nombre}} таныг ËContact жагсаалтдаа нэмэхийг хүсэж байна',
  econtactAccepted: '{{nombre}} таны ËContact хүсэлтийг хүлээн авлаа',
  repost: '{{nombre}} таны нийтлэлийг хуваалцлаа',
  mention: '{{nombre}} таныг дурдлаа',
  reply: '{{nombre}} таны сэтгэгдэлд хариуллаа',
  communityPost: '{{nombre}} {{comunidad}} дотор нийтэллээ',
  aCommunity: 'нэгэн нийгэмлэг',
  generic: '{{nombre}} тантай харилцлаа',
  now: 'одоо',
  markAllRead: 'Бүгдийг уншсан гэж тэмдэглэх',
  all: 'Бүгд',
  unread: 'Уншаагүй',
  unreadWithCount: 'Уншаагүй ({{total}})',
};
