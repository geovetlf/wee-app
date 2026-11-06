/*
 * SERBIO (ћирилица) — Обавештења. El NOMBRE de quien la provoca entra por {{nombre}} y
 * no se traduce ni se declina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El serbio marca el género en el pasado («лајковао / лајковала») y el nombre no
 * dice cuál es: la frase se construye sobre «Корисник {{nombre}}», que concuerda
 * en masculino con el sustantivo y deja el nombre en nominativo. `communityPost`
 * recibe por {{comunidad}} o bien un nombre de comunidad —que no se declina— o
 * bien `aCommunity`, que por eso ya va en locativo («у једној од заједница»).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Обавештења',
  empty: 'Нема обавештења',
  emptyHint: 'Овде ћеш видети кад неко реагује на твоје објаве или те помене',
  allRead: 'Сва твоја обавештења су прочитана',
  noneNew: 'Нема нових обавештења',
  like: 'Корисник {{nombre}} је лајковао твоју објаву',
  comment: 'Корисник {{nombre}} је коментарисао твоју објаву',
  follow: 'Корисник {{nombre}} је почео да те прати',
  econtactRequest: 'Корисник {{nombre}} жели да те дода у ËContact',
  econtactAccepted: 'Корисник {{nombre}} је прихватио твој захтев за ËContact',
  repost: 'Корисник {{nombre}} је поделио твоју објаву',
  mention: 'Корисник {{nombre}} те је поменуо',
  reply: 'Корисник {{nombre}} је одговорио на твој коментар',
  communityPost: 'Корисник {{nombre}} је објавио у {{comunidad}}',
  aCommunity: 'једној од заједница',
  generic: 'Корисник {{nombre}} је реаговао на твоју активност',
  now: 'сада',
  markAllRead: 'Означи све као прочитано',
  all: 'Све',
  unread: 'Непрочитана',
  unreadWithCount: 'Непрочитана ({{total}})',
};
