/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Aquí se habla de dinero: cada frase deja claro si se cobra o no, y cuánto.
 * "solde" traduce SALDO; la moneda se sigue llamando "Credits".
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits disponibles',
  yourBalance: 'Ton solde',
  currentBalance: 'Solde actuel',
  free: 'Gratuit',
  testTopUp: 'Recharge de test',
  testTopUpReady: 'Recharge de test prête',
  testPrices: 'Prix de test pendant que nous construisons Weë AI',
  topUp: 'Recharger',
  seeHistory: 'Voir l’historique →',
  seeHistoryLabel: 'Voir l’historique',
  history: 'Historique',
  myWallet: 'Mon portefeuille',
  earned: 'Reçu',
  spent: 'Dépensé',
  noMovements: 'Aucun mouvement pour le moment',
  testTopUpDone: '{{cantidad}} Credits ajoutés à ton compte. C’est une recharge de test : rien ne t’a été facturé.',
  balanceAfter: 'Solde : {{saldo}}',
  topUpFailed: 'La recharge n’a pas pu aboutir. Réessaie.',
  terms: 'Recharge de test : aucun argent ne t’est facturé pour l’instant. Les prix définitifs arriveront quand Weë AI fonctionnera avec ses vraies IA. En attendant, chaque création affiche son coût de test avant de commencer.',
  youHaveLabel: 'Tu as {{saldo}} Credits',
  topUpButton: 'Recharger {{cantidad}} Credits · test',
  txPurchase: 'Achat de Credits',
  txGrant: 'Credits reçus',
  txRefund: 'Remboursement',
  txUsage: 'Credits utilisés',
  txRefunded: 'Remboursé',
  txPending: 'En cours',
  pkgBasic: 'Basique',
  badgePopular: 'Populaire',
  badgeBestValue: 'Meilleur prix',
};
