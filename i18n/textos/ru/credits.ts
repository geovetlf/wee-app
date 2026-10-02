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
  free: 'Бесплатно',
  testTopUp: 'Тестовое пополнение',
  testTopUpReady: 'Тестовое пополнение готово',
  testPrices: 'Тестовые цены, пока мы строим Weë AI',
  topUp: 'Пополнить',
  seeHistory: 'Смотреть историю →',
  seeHistoryLabel: 'Смотреть историю',
  history: 'История',
  myWallet: 'Мой кошелёк',
  earned: 'Получено',
  spent: 'Потрачено',
  noMovements: 'Операций пока нет',
  testTopUpDone: '{{cantidad}} Credits зачислены на ваш счёт. Это тестовое пополнение: настоящие деньги не списаны.',
  balanceAfter: 'Баланс: {{saldo}}',
  topUpFailed: 'Не удалось завершить пополнение. Попробуйте ещё раз.',
  terms: 'Тестовое пополнение: настоящие деньги пока не списываются. Окончательные цены появятся, когда Weë AI заработает на настоящих ИИ. А до тех пор перед началом каждой работы вы видите её тестовую стоимость.',
  youHaveLabel: 'У вас {{saldo}} Credits',
  topUpButton: 'Пополнить на {{cantidad}} Credits · тест',
  txPurchase: 'Покупка Credits',
  txGrant: 'Credits получены',
  txRefund: 'Возврат',
  txUsage: 'Credits потрачены',
  txRefunded: 'Возвращено',
  txPending: 'В процессе',
  pkgBasic: 'Базовый',
  badgePopular: 'Популярный',
  badgeBestValue: 'Выгоднее всего',
  purchasesComingSoon: 'Покупка Credits скоро появится. Пока пополнить баланс здесь нельзя.',
  topUpFailedTitle: 'Упс',
};
