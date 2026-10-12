/*
 * RUSO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weëls y Weël son MARCA: en ruso eso quiere decir que no se traducen («Ролики»
 * no existe aquí) y que tampoco se transliteran ni se declinan. Se quedan en
 * alfabeto latino dentro de la frase en cirílico, y la frase se escribe para que
 * el nombre nunca necesite caso: «Все Weëls», «Смотреть Weël».
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Поделиться Weël',
  empty: 'Weëls пока нет',
  emptyHint: 'Создайте первый по кнопке +',
  loadFailed: 'Не удалось загрузить Weëls',
  rowSubtitle: 'Смотрите видео, созданные сообществом.',
  seeAll: 'Все Weëls',
  create: 'Создать Weël',
  createFirst: 'Ваш первый Weël',
  open: 'Смотреть Weël',
  upTo15s: 'до 15 с',
  noneYetHint: 'Weëls от сообщества пока нет. Примеры показывают, как они будут выглядеть.',
  sampleAiScene: 'Сцена с ИИ',
  sampleDance: 'Танец',
  sampleRecipe: 'Рецепт',
  sampleTrip: 'Путешествие',
  recordVideo: 'Записать видео',
  pickVideo: 'Выбрать из галереи',
  changeVideo: 'Заменить видео',
  preview: 'Предпросмотр Weël',
  requirements: 'Вертикальное видео до {{segundos}} секунд',
  descriptionLabel: 'Описание Weël',
  descriptionPlaceholder: 'Расскажите в нескольких словах, о чём ваш Weël…',
  publish: 'Опубликовать Weël',
  uploading: 'Загружаем ваше видео…',
  publishing: 'Публикуем ваш Weël…',
  publishFailed: 'Не удалось опубликовать ваш Weël. Видео осталось здесь.',
  horizontalTitle: 'Это горизонтальное видео',
  horizontalBody: 'Weëls смотрят вертикально, на весь экран. Всё равно использовать?',
  horizontalAccept: 'Всё равно использовать',
  cameraForVideo: 'Чтобы записать Weël, Weë нужен доступ к камере.',
  galleryForVideo: 'Чтобы выбрать видео для Weël, Weë нужен доступ к галерее.',
};
