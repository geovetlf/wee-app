/*
 * RUSO — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * AQUÍ APARECE LA PRIMERA DIVERGENCIA DEL RUSO. Tres claves cuentan cosas
 * —votos, días y horas— y en ruso eso son CUATRO formas, no dos: голос / голоса
 * / голосов. `ConPlurales` es lo único que permite declarar `_few` y `_many`;
 * el resto del archivo es igual que en alemán o en italiano.
 *
 * Y el verbo concuerda con el número, no con la traducción: «остался 1 день»
 * pero «осталось 2 дня». Por eso el `_one` de los plazos no dice «осталось».
 *
 * Trato de «вы» en minúscula. Marcas en alfabeto latino dentro del cirílico:
 * Weë, Weëls, Weël y WeeTalk se escriben igual que en español.
 */
import { ConPlurales } from './plurales';

export const wall: ConPlurales<typeof import('../es/wall').wall> = {
  repostedBy: 'Репост: {{nombre}}',
  repost: 'Сделать репост',
  undoRepost: 'Убрать репост',
  undoRepostConfirm: 'Убрать этот репост',
  sendByWeeTalk: 'Отправить через WeeTalk',
  save: 'Сохранить',
  unsave: 'Убрать из сохранённого',
  deletePost: 'Удалить публикацию',
  deletePostConfirm: 'Точно удалить эту публикацию?',
  deletePostFailed: 'Не удалось удалить публикацию. Попробуйте ещё раз.',
  sharePost: 'Поделиться публикацией',
  shareFailed: 'Не удалось поделиться публикацией. Попробуйте ещё раз.',
  preparingImage: 'Готовим изображение...',
  publishedOnWee: 'Опубликовано в Weë',
  viewInWeels: 'Смотреть в Weëls',
  moreImages: 'и ещё {{contador}}',
  comment: 'Комментировать',
  viewFullVideoInWeels: 'Смотреть видео целиком в Weëls',
  pollNoVotesYet: 'Голосов пока нет',
  pollVotes_one: '{{contador}} голос',
  pollVotes_few: '{{contador}} голоса',
  pollVotes_many: '{{contador}} голосов',
  pollVotes_other: '{{contador}} голосов',
  pollVoted: 'Голос учтён',
  pollClosed: 'Опрос завершён',
  pollDaysLeft_one: 'остался {{contador}} день',
  pollDaysLeft_few: 'осталось {{contador}} дня',
  pollDaysLeft_many: 'осталось {{contador}} дней',
  pollDaysLeft_other: 'осталось {{contador}} дней',
  pollHoursLeft_one: 'остался {{contador}} час',
  pollHoursLeft_few: 'осталось {{contador}} часа',
  pollHoursLeft_many: 'осталось {{contador}} часов',
  pollHoursLeft_other: 'осталось {{contador}} часов',
  pollLessThanAnHour: 'Меньше часа',
  pollLegacy: 'Этот опрос остался от прежней версии Weë и больше не принимает голоса.',
  pollVoteFailed: 'Не удалось засчитать ваш голос',
  closeComments: 'Закрыть комментарии',
  removeImage: 'Убрать изображение',
  attachImage: 'Прикрепить изображение',
  sendComment: 'Отправить комментарий',
  onePost: 'Публикация',
  loadingComments: 'Загружаем комментарии...',
  beFirstToComment: 'Оставьте первый комментарий',
  commentPlaceholder: 'Напишите комментарий...',
  postNotFound: 'Мы не нашли эту публикацию',
  loadingPosts: 'Загружаем публикации...',
  loadingMorePosts: 'Загружаем ещё публикации...',
  retry: 'Повторить',
  howIMadeIt: 'КАК ЭТО СДЕЛАНО',
  madeWith: 'Создано с помощью',
  holdToCopy: 'Нажмите и удерживайте текст, чтобы скопировать',
  process: 'Процесс:',
  comments: 'Комментарии',
  firstCommentHint: 'Любой большой разговор начинается с идеи.',
  loadingPost: 'Загружаем публикацию...',
  useInEditor: 'Использовать в редакторе',
  edit: 'Редактировать',
  publishToCommunity: 'Опубликовать в моём сообществе',
  changesAndPurchases: 'Список изменений и покупок',
  shareAnonymously: 'Высказывайтесь анонимно в Weë',
  statViews: 'просмотров',
  statAgree: 'согласны',
  statComments: 'комментариев',
  commentImageFailed: 'Не удалось загрузить изображение. Попробуйте ещё раз.',
  commentSendFailed: 'Не удалось отправить комментарий. Попробуйте ещё раз.',
  shareText: '{{contenido}}\n\nСоздано в Weë · World Encode Entity',
  shareTextEmpty: 'Посмотрите эту публикацию в Weë',
  commentsWithCount: 'Комментарии ({{total}})',
  agreeWithComment: 'Согласиться с этим комментарием',
  disagreeWithComment: 'Не согласиться с этим комментарием',
  showPrompt: 'Показать промпт',
  hidePrompt: 'Скрыть промпт',
  copyPrompt: 'Скопировать промпт',
  promptCopied: 'Скопировано',
};
