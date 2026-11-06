/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Aquí se habla de dinero: cada frase deja claro si se cobra o no, y cuánto.
 * "saldo" traduce SALDO; la moneda se sigue llamando "Credits" y no se traduce
 * jamás. Cobrar es "cobrar" o "debitar"; calcular un coste es "calcular" o
 * "estimar". No se mezclan: nada informativo puede leerse como un cargo hecho.
 * Y la recarga de prueba dice con todas las letras que no sale dinero real.
 *
 * Portugués de PORTUGAL: trato de «tu» («tens», «o teu saldo») y artículo con
 * el posesivo («A minha carteira»), como se habla de este lado.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  buyTitle: 'Quantos Credits quer?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Comprar {{cantidad}} Credits · {{precio}}',
  buyLess: 'Menos',
  buyMore: 'Mais',
  buyNoticeTitle: 'Os pagamentos ainda não estão ligados',
  buyNoticeBody: 'Nada foi cobrado e o seu saldo mantém-se.',
  buyChecking: 'A consultar a loja…',
  buyCatalogError: 'Não foi possível consultar a loja. Toca para tentar de novo.',
  buyMarketUnavailable: 'Os pagamentos nesta moeda ainda não estão disponíveis. Não foi cobrado nada.',
  available: 'Credits disponíveis',
  yourBalance: 'O teu saldo',
  currentBalance: 'Saldo atual',
  free: 'Grátis',
  testTopUp: 'Recarga de teste',
  testTopUpReady: 'Recarga de teste pronta',
  testPrices: 'Preços de teste enquanto construímos o Weë AI',
  topUp: 'Recarregar',
  seeHistory: 'Ver histórico →',
  seeHistoryLabel: 'Ver histórico',
  history: 'Histórico',
  myWallet: 'A minha carteira',
  earned: 'Recebidos',
  spent: 'Gastos',
  noMovements: 'Ainda sem movimentos',
  historyLoading: 'A carregar movimentos…',
  historyError: 'Não foi possível carregar o histórico.',
  historyRetry: 'Tentar novamente',
  testTopUpDone: '{{cantidad}} Credits adicionados à tua conta. É uma recarga de teste: não te foi cobrado dinheiro nenhum.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Não foi possível concluir a recarga. Tenta de novo.',
  terms: 'Recarga de teste: por enquanto não te é cobrado dinheiro real. Os preços definitivos chegam quando o Weë AI usar as suas IAs reais; até lá, cada criação mostra o custo de teste antes de começar.',
  youHaveLabel: 'Tens {{saldo}} Credits',
  topUpButton: 'Recarregar {{cantidad}} Credits · teste',
  txPurchase: 'Compra de Credits',
  txGrant: 'Credits recebidos',
  txRefund: 'Reembolso',
  txUsage: 'Credits usados',
  txRefunded: 'Reembolsado',
  txPending: 'Em processamento',
  purchasesComingSoon: 'As compras de Credits chegam em breve. Para já, não é possível fazer recargas aqui.',
  topUpFailedTitle: 'Ups',
};
