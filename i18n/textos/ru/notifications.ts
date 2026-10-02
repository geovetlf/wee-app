/*
 * RUSO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se
 * traduce; la frase entera sí, para que en ruso el verbo pueda ir donde toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── EL PASADO RUSO TIENE GÉNERO Y WEË NO LO SABE ────────────────────────────
 *
 * «оценил» es él y «оценила» es ella, y Weë no guarda el género de nadie. La
 * salida que usa el ruso de producto —y la que se lee sin tropezar— es la forma
 * con paréntesis: «оценил(а)», «прокомментировал(а)». Donde el presente sirve
 * igual se prefiere, porque no tiene género ninguno: `follow` dice «теперь
 * подписан(а) на вас» y `econtactRequest` dice «хочет добавить вас».
 *
 * `communityPost` recibe por `{{comunidad}}` o bien un nombre de comunidad —que
 * lo escribió una persona y no se declina— o bien `aCommunity` cuando no hay
 * ninguno. Por eso el respaldo es «одном из сообществ», en preposicional: encaja
 * en la frase sin pegar cadenas y sin romper el caso.
 *
 * ËContact es marca: ni «Контакты» ni transliteración.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Уведомления',
  empty: 'Уведомлений нет',
  emptyHint: 'Когда кто-то откликнется, всё появится здесь',
  allRead: 'Все уведомления прочитаны',
  noneNew: 'Новых уведомлений нет',
  like: '{{nombre}} оценил(а) вашу публикацию',
  comment: '{{nombre}} прокомментировал(а) вашу публикацию',
  follow: '{{nombre}} теперь подписан(а) на вас',
  econtactRequest: '{{nombre}} хочет добавить вас в ËContact',
  econtactAccepted: '{{nombre}} принял(а) вашу заявку в ËContact',
  repost: '{{nombre}} сделал(а) репост вашей публикации',
  mention: '{{nombre}} упомянул(а) вас',
  reply: '{{nombre}} ответил(а) на ваш комментарий',
  communityPost: '{{nombre}} опубликовал(а) в {{comunidad}}',
  aCommunity: 'одном из сообществ',
  generic: '{{nombre}} взаимодействовал(а) с вами',
  now: 'сейчас',
  markAllRead: 'Отметить все как прочитанные',
  all: 'Все',
  unread: 'Непрочитанные',
  unreadWithCount: 'Непрочитанные ({{total}})',
};
