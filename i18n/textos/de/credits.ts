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
  free: 'Gratis',
  testTopUp: 'Testaufladung',
  testTopUpReady: 'Testaufladung bereit',
  testPrices: 'Testpreise, solange wir Weë AI bauen',
  topUp: 'Aufladen',
  seeHistory: 'Verlauf ansehen →',
  seeHistoryLabel: 'Verlauf ansehen',
  history: 'Verlauf',
  myWallet: 'Meine Wallet',
  earned: 'Erhalten',
  spent: 'Ausgegeben',
  noMovements: 'Noch keine Bewegungen',
  testTopUpDone: '{{cantidad}} Credits wurden deinem Konto gutgeschrieben. Es ist eine Testaufladung: Dir wurde nichts berechnet.',
  balanceAfter: 'Guthaben: {{saldo}}',
  topUpFailed: 'Die Aufladung konnte nicht abgeschlossen werden. Versuch es noch einmal.',
  terms: 'Testaufladung: Es wird noch kein Geld berechnet. Die endgültigen Preise kommen, sobald Weë AI mit echten KIs arbeitet. Bis dahin zeigt dir jede Kreation ihre Testkosten, bevor du startest.',
  youHaveLabel: 'Du hast {{saldo}} Credits',
  topUpButton: '{{cantidad}} Credits aufladen · Test',
  txPurchase: 'Credits gekauft',
  txGrant: 'Credits erhalten',
  txRefund: 'Erstattung',
  txUsage: 'Credits verbraucht',
  txRefunded: 'Erstattet',
  txPending: 'Läuft',
  pkgBasic: 'Basis',
  badgePopular: 'Beliebt',
  badgeBestValue: 'Bestes Angebot',
  purchasesComingSoon: 'Credits kannst du bald kaufen. Aufladungen sind hier vorerst noch nicht möglich.',
  topUpFailedTitle: 'Hoppla',
};
