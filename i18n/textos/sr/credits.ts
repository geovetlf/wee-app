/*
 * SERBIO (ћирилица) — Credits: el saldo, la recarga y el historial. «Credits» es marca
 * y queda en latino, sin declinar (nunca «кредити»); todo lo que lo rodea, sí se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Ni los precios ni los cálculos pasan por aquí.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Доступни Credits',
  yourBalance: 'Твоје стање',
  currentBalance: 'Тренутно стање',
  free: 'Бесплатно',
  testTopUp: 'Пробна допуна',
  testTopUpReady: 'Пробна допуна је спремна',
  testPrices: 'Пробне цене док градимо Weë AI',
  topUp: 'Допуни',
  seeHistory: 'Погледај историју →',
  seeHistoryLabel: 'Погледај историју',
  history: 'Историја',
  myWallet: 'Мој новчаник',
  earned: 'Добијено',
  spent: 'Потрошено',
  noMovements: 'Још нема трансакција',
  testTopUpDone: '{{cantidad}} Credits је додато на твој налог. Ово је пробна допуна: ништа није наплаћено.',
  balanceAfter: 'Стање: {{saldo}}',
  topUpFailed: 'Допуна није могла да се доврши. Покушај поново.',
  terms: 'Пробна допуна: за сада се ништа не наплаћује. Коначне цене стижу када Weë AI почне да користи праве AI моделе; до тада свака креација приказује своју пробну цену пре почетка.',
  youHaveLabel: 'Имаш {{saldo}} Credits',
  topUpButton: 'Допуни {{cantidad}} Credits · проба',
  txPurchase: 'Куповина Credits',
  txGrant: 'Примљени Credits',
  txRefund: 'Повраћај',
  txUsage: 'Потрошња Credits',
  txRefunded: 'Враћено',
  txPending: 'У обради',
  purchasesComingSoon: 'Куповина Credits стиже ускоро. За сада овде није могуће извршити допуну.',
  topUpFailedTitle: 'Упс',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Колико Credits желиш?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Купи {{cantidad}} Credits · {{precio}}',
  buyLess: 'Мање',
  buyMore: 'Више',
  buyNoticeTitle: 'Плаћања још нису повезана',
  buyNoticeBody: 'Ништа није наплаћено и твоје стање је остало исто.',
  buyChecking: 'Проверавамо продавницу…',
  buyCatalogError: 'Продавница није доступна. Додирни за поновни покушај.',
  buyMarketUnavailable: 'Плаћања у овој валути још нису доступна. Ништа није наплаћено.',
  historyLoading: 'Учитавање трансакција…',
  historyError: 'Историја није могла да се учита.',
  historyRetry: 'Покушај поново',
};
