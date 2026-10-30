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
  topUp: 'Recharger',
  seeHistory: 'Voir l’historique →',
  seeHistoryLabel: 'Voir l’historique',
  history: 'Historique',
  myWallet: 'Mon portefeuille',
  earned: 'Reçu',
  spent: 'Dépensé',
  noMovements: 'Aucun mouvement pour le moment',
  balanceAfter: 'Solde : {{saldo}}',
  youHaveLabel: 'Tu as {{saldo}} Credits',
  txPurchase: 'Achat de Credits',
  txGrant: 'Credits reçus',
  txRefund: 'Remboursement',
  txUsage: 'Credits utilisés',
  txRefunded: 'Remboursé',
  txPending: 'En cours',
  referenceRate: 'Conversion de référence',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Les Credits sont l’unité de consommation de Weë. Il n’y a ni forfaits ni packs de Credits.',
  recentMovements: 'Derniers mouvements',
  purchasesComingSoon: 'Les achats de Credits arrivent bientôt. Pour l’instant, les recharges ne sont pas possibles ici.',
};
