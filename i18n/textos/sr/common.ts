/*
 * SERBIO (ћирилица) — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo e imperativo de 2.ª singular, con las formas más cortas que admite el
 * serbio porque estas etiquetas viven en barras estrechas. `accept` es el botón
 * de un aviso, no el de aceptar a una persona: por eso «У реду» y no «Прихвати»,
 * que sí usa `econtact`. `postsCount` lleva one / few / other («објава / објаве /
 * објава»), las tres con {{cantidad}}.
 */
import { ConPlurales } from '../ru/plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'Откажи',
  save: 'Сачувај',
  delete: 'Обриши',
  close: 'Затвори',
  back: 'Назад',
  next: 'Даље',
  done: 'Готово',
  accept: 'У реду',
  send: 'Пошаљи',
  share: 'Подели',
  retry: 'Покушај поново',
  mediaUnavailable: 'Овај фајл није доступан',
  loading: 'Учитавање…',
  error: 'Грешка',
  somethingWentWrong: 'Дошло је до грешке',
  noResults: 'Нема резултата',
  notAvailable: 'Није доступно',
  comingSoon: 'Ускоро',
  new: 'Ново',
  seeAll: 'Прикажи све →',
  guest: 'Гост',
  anonymousUser: 'Анонимни корисник',
  user: 'Корисник',
  yes: 'Да',
  no: 'Не',
  loadMore: 'Учитај још објава',
  postsCount_one: '{{cantidad}} објава',
  postsCount_few: '{{cantidad}} објаве',
  postsCount_other: '{{cantidad}} објава',
  someone: 'Неко',
};
