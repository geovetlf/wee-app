/*
 * RUSO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El tipo es `ConPlurales` porque el ruso necesita DOS formas más de las que el
 * español tiene, y esas dos son lo único que este archivo añade.
 *
 * ── LAS CUATRO FORMAS DE `members` ──────────────────────────────────────────
 *
 *     1, 21, 31, 101…        one    1 участник
 *     2, 3, 4, 22, 23…       few    2 участника
 *     0, 5…20, 25…30, 111…   many   5 участников   ← aquí caen el 0 y el 11
 *     1,5                    other  (fracciones; misma forma que `many`)
 *
 * Elige `Intl.PluralRules` dentro de `i18n/traducir.ts`, no un `if`.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre de una comunidad y su descripción, que los
 * escribe una persona y se pintan tal cual. Cuando una frase de Weë los nombra,
 * entran por hueco —`{{nombre}}`— y salen sin tocar; en ruso eso obliga además a
 * meterlos entre comillas « », porque un nombre así no se declina.
 */
import { ConPlurales } from './plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Создать сообщество',
  searchPlaceholder: 'Поиск сообществ...',
  loading: 'Загрузка сообществ...',

  joinedSection: 'Ваши сообщества',
  discoverSection: 'Откройте новые сообщества',

  official: 'Официальное',
  members_one: '{{contador}} участник',
  members_few: '{{contador}} участника',
  members_many: '{{contador}} участников',
  members_other: '{{contador}} участников',
  memberOf: 'Вы участник',
  join: 'Вступить',

  leaveTitle: 'Выйти из сообщества',
  leaveConfirm: 'Точно выйти из «{{nombre}}»?',
  leave: 'Выйти',
  leaveFailed: 'Не удалось выйти из сообщества',
  actionFailed: 'Не удалось выполнить действие',

  newCommunity: 'Новое сообщество',
  name: 'Название',
  namePlaceholder: 'Например: Любители кофе',
  description: 'Описание',
  descriptionPlaceholder: 'О чём это сообщество?',
  createFailed: 'Не удалось создать сообщество',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Сообщество «{{nombre}}»',
  empty: 'Доступных сообществ нет',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Найдите свои.',
  searchLabel: 'Поиск сообществ',
  members: 'участников',
  posts: 'публикаций',
  rules: 'Правила сообщества',
  one: 'Сообщество',
  loadFailed: 'Не удалось загрузить сообщество',
  noPosts: 'Публикаций нет',
  beTheFirst: 'Опубликуйте первым в этом сообществе',
  createPost: 'Создать публикацию',
  understoodJoin: 'Понятно, вступаю',
};
