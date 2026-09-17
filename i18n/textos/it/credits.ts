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
  testTopUpDone: '{{cantidad}} Credits aggiunti al tuo account. È una ricarica di prova: non ti è stato addebitato nulla.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Non è stato possibile completare la ricarica. Riprova.',
  terms: 'Ricarica di prova: per ora non ti viene addebitato denaro reale. I prezzi definitivi arriveranno quando Weë AI userà le sue IA vere. Fino ad allora, ogni creazione ti mostra il suo costo di prova prima di iniziare.',
  youHaveLabel: 'Hai {{saldo}} Credits',
};
