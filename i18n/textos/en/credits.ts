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
  topUp: 'Top up',
  seeHistory: 'See history →',
  seeHistoryLabel: 'See history',
  history: 'History',
  myWallet: 'My wallet',
  earned: 'Earned',
  spent: 'Spent',
  noMovements: 'No transactions yet',
  balanceAfter: 'Balance: {{saldo}}',
  youHaveLabel: 'You have {{saldo}} Credits',
  txPurchase: 'Credits purchase',
  txGrant: 'Credits received',
  txRefund: 'Refund',
  txUsage: 'Credits used',
  txRefunded: 'Refunded',
  txPending: 'In progress',
  referenceRate: 'Reference conversion',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits are the unit of consumption in Weë. There are no plans or Credits packages.',
  recentMovements: 'Recent transactions',
  purchasesComingSoon: 'Credits purchases are coming soon. For now, top-ups cannot be made here.',
};
