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
  buyTitle: 'Quanti Credits vuoi?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Acquista {{cantidad}} Credits · {{precio}}',
  buyLess: 'Meno',
  buyMore: 'Più',
  buyNoticeTitle: 'I pagamenti non sono ancora collegati',
  buyNoticeBody: 'Non è stato addebitato nulla e il tuo saldo non è cambiato.',
  buyChecking: 'Verifica del negozio…',
  buyCatalogError: 'Impossibile raggiungere il negozio. Tocca per riprovare.',
  buyMarketUnavailable: 'I pagamenti in questa valuta non sono ancora disponibili. Non è stato addebitato nulla.',
  available: 'Credits disponibili',
  yourBalance: 'Il tuo saldo',
  currentBalance: 'Saldo attuale',
  free: 'Gratis',
  testTopUp: 'Ricarica di prova',
  testTopUpReady: 'Ricarica di prova pronta',
  testPrices: 'Prezzi di prova mentre costruiamo Weë AI',
  topUp: 'Ricarica',
  seeHistory: 'Vedi la cronologia →',
  seeHistoryLabel: 'Vedi la cronologia',
  history: 'Cronologia',
  myWallet: 'Il mio portafoglio',
  earned: 'Ricevuto',
  spent: 'Speso',
  noMovements: 'Ancora nessun movimento',
  historyLoading: 'Caricamento dei movimenti…',
  historyError: 'Impossibile caricare la cronologia.',
  historyRetry: 'Riprova',
  testTopUpDone: '{{cantidad}} Credits aggiunti al tuo account. È una ricarica di prova: non ti è stato addebitato nulla.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Non è stato possibile completare la ricarica. Riprova.',
  terms: 'Ricarica di prova: per ora non ti viene addebitato denaro reale. I prezzi definitivi arriveranno quando Weë AI userà le sue IA vere. Fino ad allora, ogni creazione ti mostra il suo costo di prova prima di iniziare.',
  youHaveLabel: 'Hai {{saldo}} Credits',
  topUpButton: 'Ricarica {{cantidad}} Credits · prova',
  txPurchase: 'Acquisto di Credits',
  txGrant: 'Credits ricevuti',
  txRefund: 'Rimborso',
  txUsage: 'Credits usati',
  txRefunded: 'Rimborsato',
  txPending: 'In corso',
  purchasesComingSoon: 'Gli acquisti di Credits arriveranno presto. Per ora non è possibile fare ricariche qui.',
  topUpFailedTitle: 'Ops',
};
