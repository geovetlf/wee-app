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
};
