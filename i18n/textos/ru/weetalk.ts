/*
 * RUSO — WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA
 * pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk no es «Чат»: es un nombre propio y se queda en alfabeto latino dentro
 * del cirílico. Trato con «вы» en minúscula e imperativo directo. Las comillas
 * son las rusas « », también cuando la frase cita un botón: `noConversationsHint`
 * nombra «Приватно», que es el botón de una publicación. El emoji 🤝 se copia
 * tal cual.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Напишите сообщение…',
  send: 'Отправить',
  empty: 'У вас пока нет переписок',
  emptyHint: 'Напишите кому-нибудь из его профиля',
  loadFailed: 'Не удалось загрузить ваши переписки',
  sendFailed: 'Не удалось отправить сообщение',
  attach: 'Прикрепить',
  photo: 'Фото',
  search: 'Поиск...',
  noConversations: 'Переписок нет',
  deleteConversation: 'Удалить переписку',
  areYouSure: 'Вы уверены?',
  messagePlaceholderShort: 'Сообщение...',
  firstMessage: 'Отправьте первое сообщение',
  photoSeen: 'Фото просмотрено',
  photoOnce: 'Одноразовое фото',
  photoOpened: 'Открыто',
  tapToView: 'Нажмите, чтобы посмотреть',
  tapToClose: 'Нажмите, чтобы закрыть',
  theme: 'Тема',
  background: 'Фон',
  permissions: 'Разрешения',
  photoPermission: 'Нужны разрешения для доступа к фото',
  audioPermission: 'Нужны разрешения для записи звука',
  imageFailed: 'Не удалось отправить изображение',
  noConversationsHint: 'Нажмите «Приватно» под любой публикацией, чтобы начать анонимную переписку',
  ephemeralMode: 'Исчезающий режим',
  noMessagesYet: 'Сообщений пока нет',
  youSaid: 'Вы: {{mensaje}}',
  conversationStart: 'Это начало вашей приватной переписки',
  beRespectful: 'Помните про уважение и приватность 🤝',
  anonymousUser: 'Анонимный пользователь',
  ephemeralOn: 'Исчезающий режим включён · Сообщения удаляются при выходе',
  cameraNeeded: 'Нужен доступ к камере',
  allow: 'Разрешить',
  recordAudio: 'Записать аудио',
  viewOnceOn: 'Посмотреть один раз',
  keepInChat: 'Оставить в чате',
};
