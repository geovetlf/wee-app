/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits available',
  yourBalance: 'Your balance',
  currentBalance: 'Current balance',
  free: 'Free',
  testTopUp: 'Test top-up',
  testTopUpReady: 'Test top-up ready',
  testPrices: 'Test prices while we build Weë AI',
  topUp: 'Top up',
  seeHistory: 'See history →',
  seeHistoryLabel: 'See history',
  history: 'History',
  myWallet: 'My wallet',
  earned: 'Earned',
  spent: 'Spent',
  noMovements: 'No transactions yet',
  testTopUpDone: '{{cantidad}} Credits added to your account. This is a test top-up: nothing was charged.',
  balanceAfter: 'Balance: {{saldo}}',
  topUpFailed: 'The top-up could not be completed. Please try again.',
  terms: 'Test top-up: nothing is charged yet. Final prices will arrive once Weë AI runs on its real AIs; until then, every creation shows its test cost before you start.',
  youHaveLabel: 'You have {{saldo}} Credits',
  topUpButton: 'Top up {{cantidad}} Credits · test',
  txPurchase: 'Credits purchase',
  txGrant: 'Credits received',
  txRefund: 'Refund',
  txUsage: 'Credits used',
  txRefunded: 'Refunded',
  txPending: 'In progress',
  pkgBasic: 'Basic',
  badgePopular: 'Popular',
  badgeBestValue: 'Best value',
  purchasesComingSoon: 'Credits purchases are coming soon. For now, top-ups cannot be made here.',
  topUpFailedTitle: 'Oops',
};
