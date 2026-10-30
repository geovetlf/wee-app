/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Aquí se habla de dinero: cada frase deja claro si se cobra o no, y cuánto.
 * "Guthaben" traduce SALDO, nunca "Credits".
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Verfügbare Credits',
  yourBalance: 'Dein Guthaben',
  currentBalance: 'Aktuelles Guthaben',
  topUp: 'Aufladen',
  seeHistory: 'Verlauf ansehen →',
  seeHistoryLabel: 'Verlauf ansehen',
  history: 'Verlauf',
  myWallet: 'Meine Wallet',
  earned: 'Erhalten',
  spent: 'Ausgegeben',
  noMovements: 'Noch keine Bewegungen',
  balanceAfter: 'Guthaben: {{saldo}}',
  youHaveLabel: 'Du hast {{saldo}} Credits',
  txPurchase: 'Credits gekauft',
  txGrant: 'Credits erhalten',
  txRefund: 'Erstattung',
  txUsage: 'Credits verbraucht',
  txRefunded: 'Erstattet',
  txPending: 'Läuft',
  referenceRate: 'Referenzumrechnung',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits sind die Verbrauchseinheit von Weë. Es gibt keine Tarife und keine Credits-Pakete.',
  recentMovements: 'Letzte Umsätze',
  purchasesComingSoon: 'Credits kannst du bald kaufen. Aufladungen sind hier vorerst noch nicht möglich.',
};
