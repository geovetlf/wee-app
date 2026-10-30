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
  available: 'Credits disponíveis',
  yourBalance: 'O teu saldo',
  currentBalance: 'Saldo atual',
  topUp: 'Recarregar',
  seeHistory: 'Ver histórico →',
  seeHistoryLabel: 'Ver histórico',
  history: 'Histórico',
  myWallet: 'A minha carteira',
  earned: 'Recebidos',
  spent: 'Gastos',
  noMovements: 'Ainda sem movimentos',
  balanceAfter: 'Saldo: {{saldo}}',
  youHaveLabel: 'Tens {{saldo}} Credits',
  txPurchase: 'Compra de Credits',
  txGrant: 'Credits recebidos',
  txRefund: 'Reembolso',
  txUsage: 'Credits usados',
  txRefunded: 'Reembolsado',
  txPending: 'Em processamento',
  referenceRate: 'Conversão de referência',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Os Credits são a unidade de consumo do Weë. Não existem planos nem pacotes de Credits.',
  recentMovements: 'Movimentos recentes',
  purchasesComingSoon: 'As compras de Credits chegam em breve. Para já, não é possível fazer recargas aqui.',
};
