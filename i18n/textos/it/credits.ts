/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Aquí se habla de dinero: cada frase deja claro si se cobra o no, y cuánto.
 * "saldo" traduce SALDO; la moneda se sigue llamando "Credits", nunca "Crediti".
 * Cobrar es "addebitare"; calcular un coste es "calcolare". No se mezclan.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits disponibili',
  yourBalance: 'Il tuo saldo',
  currentBalance: 'Saldo attuale',
  topUp: 'Ricarica',
  seeHistory: 'Vedi la cronologia →',
  seeHistoryLabel: 'Vedi la cronologia',
  history: 'Cronologia',
  myWallet: 'Il mio portafoglio',
  earned: 'Ricevuto',
  spent: 'Speso',
  noMovements: 'Ancora nessun movimento',
  balanceAfter: 'Saldo: {{saldo}}',
  youHaveLabel: 'Hai {{saldo}} Credits',
  txPurchase: 'Acquisto di Credits',
  txGrant: 'Credits ricevuti',
  txRefund: 'Rimborso',
  txUsage: 'Credits usati',
  txRefunded: 'Rimborsato',
  txPending: 'In corso',
  referenceRate: 'Conversione di riferimento',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'I Credits sono l’unità di consumo di Weë. Non ci sono piani né pacchetti di Credits.',
  recentMovements: 'Ultimi movimenti',
  purchasesComingSoon: 'Gli acquisti di Credits arriveranno presto. Per ora non è possibile fare ricariche qui.',
};
