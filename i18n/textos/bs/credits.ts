/*
 * BOSNIO — Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Credits» no se declina nunca («Kupovina Credits», «Imaš {{saldo}} Credits»);
 * el saldo es «stanje» y la recarga «dopuna».
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Dostupni Credits',
  yourBalance: 'Tvoje stanje',
  currentBalance: 'Trenutno stanje',
  free: 'Besplatno',
  testTopUp: 'Probna dopuna',
  testTopUpReady: 'Probna dopuna spremna',
  testPrices: 'Probne cijene dok gradimo Weë AI',
  topUp: 'Dopuni',
  seeHistory: 'Pogledaj historiju →',
  seeHistoryLabel: 'Pogledaj historiju',
  history: 'Historija',
  myWallet: 'Moj novčanik',
  earned: 'Dobijeno',
  spent: 'Potrošeno',
  noMovements: 'Još nema transakcija',
  testTopUpDone: '{{cantidad}} Credits dodano na tvoj račun. Ovo je probna dopuna: ništa nije naplaćeno.',
  balanceAfter: 'Stanje: {{saldo}}',
  topUpFailed: 'Dopuna nije uspjela. Pokušaj ponovo.',
  terms: 'Probna dopuna: još se ništa ne naplaćuje. Konačne cijene stižu kada Weë AI bude koristio svoje stvarne AI modele; dotad svaka kreacija prikazuje svoju probnu cijenu prije početka.',
  youHaveLabel: 'Imaš {{saldo}} Credits',
  topUpButton: 'Dopuni {{cantidad}} Credits · proba',
  txPurchase: 'Kupovina Credits',
  txGrant: 'Primljeni Credits',
  txRefund: 'Povrat',
  txUsage: 'Korištenje Credits',
  txRefunded: 'Vraćeno',
  txPending: 'U obradi',
  purchasesComingSoon: 'Kupovina Credits uskoro stiže. Zasad se ovdje ne mogu raditi dopune.',
  topUpFailedTitle: 'Ups',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Koliko Credits želiš?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Kupi {{cantidad}} Credits · {{precio}}',
  buyLess: 'Manje',
  buyMore: 'Više',
  buyNoticeTitle: 'Plaćanja još nisu povezana',
  buyNoticeBody: 'Ništa nije naplaćeno i tvoje stanje je ostalo isto.',
  buyChecking: 'Provjeravamo prodavnicu…',
  buyCatalogError: 'Prodavnica nije dostupna. Dodirni za ponovni pokušaj.',
  buyMarketUnavailable: 'Plaćanja u ovoj valuti još nisu dostupna. Ništa nije naplaćeno.',
  historyLoading: 'Učitavanje transakcija…',
  historyError: 'Historiju nije bilo moguće učitati.',
  historyRetry: 'Pokušaj ponovo',
};
