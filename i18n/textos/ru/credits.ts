/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Aquí se habla de dinero: cada frase deja claro si se cobra o no, y cuánto.
 * «баланс» traduce SALDO; la moneda se sigue llamando "Credits" y no se
 * traduce ni se translitera al cirílico, que en ruso es el riesgo de verdad.
 * Cobrar es «списать»/«списано»; calcular un coste es «рассчитать». No se
 * mezclan: nada informativo puede leerse como un cargo ya hecho.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Доступные Credits',
  yourBalance: 'Ваш баланс',
  currentBalance: 'Текущий баланс',
  topUp: 'Пополнить',
  seeHistory: 'Смотреть историю →',
  seeHistoryLabel: 'Смотреть историю',
  history: 'История',
  myWallet: 'Мой кошелёк',
  earned: 'Получено',
  spent: 'Потрачено',
  noMovements: 'Операций пока нет',
  balanceAfter: 'Баланс: {{saldo}}',
  youHaveLabel: 'У вас {{saldo}} Credits',
  txPurchase: 'Покупка Credits',
  txGrant: 'Credits получены',
  txRefund: 'Возврат',
  txUsage: 'Credits потрачены',
  txRefunded: 'Возвращено',
  txPending: 'В процессе',
  referenceRate: 'Справочный курс',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits — единица расхода в Weë. Тарифов и пакетов Credits нет.',
  recentMovements: 'Последние операции',
  purchasesComingSoon: 'Покупка Credits скоро появится. Пока пополнить баланс здесь нельзя.',
};
