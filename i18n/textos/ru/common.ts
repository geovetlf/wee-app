/*
 * RUSO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula. Son las palabras más cortas que existen en ruso
 * para cada botón, porque estas etiquetas viven en barras estrechas y el ruso
 * alarga todo: por eso `seeAll` es «Все →» y no «Показать все →».
 *
 * `accept` es el botón de un aviso, no el de aceptar a una persona: por eso
 * «ОК» —en cirílico, que es como se escribe en ruso— y no «Принять», que sí usa
 * `econtact`.
 */
import { ConPlurales } from './plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Отмена',
  save: 'Сохранить',
  delete: 'Удалить',
  close: 'Закрыть',
  back: 'Назад',
  next: 'Далее',
  done: 'Готово',
  accept: 'ОК',
  send: 'Отправить',
  share: 'Поделиться',
  retry: 'Попробуйте ещё раз',
  loading: 'Загрузка…',
  error: 'Ошибка',
  somethingWentWrong: 'Что-то пошло не так',
  noResults: 'Ничего не найдено',
  notAvailable: 'Недоступно',
  comingSoon: 'Скоро',
  new: 'Новое',
  seeAll: 'Все →',
  guest: 'Гость',
  anonymousUser: 'Анонимный пользователь',
  user: 'Пользователь',
  yes: 'Да',
  no: 'Нет',
  loadMore: 'Загрузить ещё публикации',
  postsCount_one: '{{cantidad}} публикация',
  postsCount_few: '{{cantidad}} публикации',
  postsCount_many: '{{cantidad}} публикаций',
  postsCount_other: '{{cantidad}} публикаций',
};
