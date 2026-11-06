/*
 * SERBIO (ћирилица) — ËContact y ẄContact. Los dos nombres son marca —cambian con el
 * perfil activo— y entran por {{lista}}, sin traducir ni declinar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los nombres de persona ({{nombre}}) tampoco se declinan: se coloca el hueco
 * donde el serbio admite el nominativo. `count` lleva one / few / other, las
 * tres con {{contador}} (la marca no cambia de forma).
 */
import { ConPlurales } from '../ru/plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'Примљени захтеви',
  requestsSent: 'Послати захтеви',
  yours: 'Твоји {{lista}}',
  yoursWhenYouSignIn: 'Твоји {{lista}}, када се пријавиш',
  yoursWhenYouSignInSubtitle: '{{lista}} чува твоје везе у апликацији Weë. Пријави се да их видиш.',
  noneYet: 'Још немаш {{lista}}',
  noneYetSubtitle: 'Овде ће бити твоји људи у апликацији Weë. Веза настаје између двоје: једна особа је предложи, а друга прихвати.',
  noAgenda: 'Овај профил нема именик',
  noAgendaSubtitle: '{{lista}} је место где су твоје везе с другим људима. Пређи на свој Прави профил или Weë профил да их видиш.',
  wantsToConnect: '{{lista}} · жели да се повеже с тобом',
  accept: 'Прихвати {{nombre}}',
  reject: 'Одбиј {{nombre}}',
  withdraw: 'Повуци захтев за {{nombre}}',
  removeFrom: 'Уклони {{nombre}} из својих {{lista}}',
  openProfile: 'Отвори {{etiqueta}} корисника {{nombre}}',
  rejectTitle: 'Одбиј захтев',
  rejectConfirm: 'Одбити захтев од {{nombre}}?',
  withdrawTitle: 'Повуци захтев',
  withdrawConfirm: 'Повући захтев за {{nombre}}?',
  removeTitle: 'Уклони {{lista}}',
  removeConfirm: 'Уклонити {{nombre}} из својих {{lista}}?',
  failed: 'Није успело',
  count_one: '{{contador}} {{lista}}',
  count_few: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'ова особа',
  acceptLabel: 'Прихвати {{lista}}',
  rejectRequestLabel: 'Одбиј захтев за {{lista}}',
  requestSent: 'Захтев је послат',
  errSignIn: 'Пријави се да користиш ËContact.',
  errNotYours: 'Тај профил није твој.',
  errNotAPerson: 'Тај профил не може да користи ËContact.',
  errSameProfile: 'Профил не може да се повеже сам са собом.',
  errOffline: 'Није било могуће повезати се са апликацијом Weë.',
  errNoRequestToReject: 'Нема ниједног захтева који би могао да се одбије.',
  errNoPendingRequest: 'Немаш ниједан захтев на чекању с овим профилом.',
  errNotConnected: 'Немаш везу с овим профилом.',
  errNoActiveProfile: 'Нема активног профила с којим би ово могло да се уради.',
};
