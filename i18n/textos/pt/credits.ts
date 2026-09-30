/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Aquí se habla de dinero: cada frase deja claro si se cobra o no, y cuánto.
 * "saldo" traduce SALDO; la moneda se sigue llamando "Credits" y no se traduce
 * jamás. Cobrar es "cobrar" o "debitar"; calcular un coste es "calcular" o
 * "estimar". No se mezclan: nada informativo puede leerse como un cargo hecho.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits disponíveis',
  yourBalance: 'Seu saldo',
  currentBalance: 'Saldo atual',
  free: 'Grátis',
  testTopUp: 'Recarga de teste',
  testTopUpReady: 'Recarga de teste pronta',
  testPrices: 'Preços de teste enquanto construímos a Weë AI',
  topUp: 'Recarregar',
  seeHistory: 'Ver histórico →',
  seeHistoryLabel: 'Ver histórico',
  history: 'Histórico',
  myWallet: 'Minha carteira',
  earned: 'Recebido',
  spent: 'Gasto',
  noMovements: 'Nenhuma movimentação ainda',
  testTopUpDone: '{{cantidad}} Credits adicionados à sua conta. É uma recarga de teste: nada foi cobrado de você.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Não foi possível concluir a recarga. Tente de novo.',
  terms: 'Recarga de teste: por enquanto, nenhum dinheiro de verdade é cobrado de você. Os preços definitivos chegam quando a Weë AI usar suas IAs reais. Até lá, cada criação mostra o custo de teste antes de começar.',
  youHaveLabel: 'Você tem {{saldo}} Credits',
  topUpButton: 'Recarregar {{cantidad}} Credits · teste',
  txPurchase: 'Compra de Credits',
  txGrant: 'Credits recebidos',
  txRefund: 'Reembolso',
  txUsage: 'Credits usados',
  txRefunded: 'Reembolsado',
  txPending: 'Em andamento',
  pkgBasic: 'Básico',
  badgePopular: 'Popular',
  badgeBestValue: 'Melhor custo-benefício',
  purchasesComingSoon: 'As compras de Credits chegam em breve. Por enquanto, não é possível fazer recargas aqui.',
  topUpFailedTitle: 'Ops',
};
