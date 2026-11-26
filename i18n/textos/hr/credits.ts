/*
 * Credits en croata: el saldo, la recarga y el historial. "Credits" es marca y no se traduce ni se declina; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). «Credits» va siempre en latino y sin declinar («Kupnja
 * Credits», «{{saldo}} Credits»), nunca «krediti».
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Dostupni Credits',
  yourBalance: 'Tvoj saldo',
  currentBalance: 'Trenutačni saldo',
  free: 'Besplatno',
  testTopUp: 'Probna nadoplata',
  testTopUpReady: 'Probna nadoplata spremna',
  testPrices: 'Probne cijene dok gradimo Weë AI',
  topUp: 'Nadoplati',
  seeHistory: 'Prikaži povijest →',
  seeHistoryLabel: 'Prikaži povijest',
  history: 'Povijest',
  myWallet: 'Moj novčanik',
  earned: 'Primljeno',
  spent: 'Potrošeno',
  noMovements: 'Još nema transakcija',
  testTopUpDone: '{{cantidad}} Credits dodano na tvoj račun. Ovo je probna nadoplata: ništa nije naplaćeno.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Nadoplatu nije bilo moguće dovršiti. Pokušaj ponovno.',
  terms: 'Probna nadoplata: zasad se ništa ne naplaćuje. Konačne cijene stići će kad Weë AI počne koristiti svoje prave AI modele; dotad svaka kreacija prikazuje svoj probni trošak prije početka.',
  youHaveLabel: 'Imaš {{saldo}} Credits',
  topUpButton: 'Nadoplati {{cantidad}} Credits · proba',
  txPurchase: 'Kupnja Credits',
  txGrant: 'Primljeni Credits',
  txRefund: 'Povrat',
  txUsage: 'Potrošnja Credits',
  txRefunded: 'Vraćeno',
  txPending: 'U obradi',
  purchasesComingSoon: 'Kupnja Credits uskoro stiže. Zasad se ovdje ne mogu raditi nadoplate.',
  topUpFailedTitle: 'Ups',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Koliko Credits želiš?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Kupi {{cantidad}} Credits · {{precio}}',
  buyLess: 'Manje',
  buyMore: 'Više',
  buyNoticeTitle: 'Plaćanja još nisu povezana',
  buyNoticeBody: 'Ništa nije naplaćeno i tvoj saldo je ostao isti.',
  buyChecking: 'Provjeravamo trgovinu…',
  buyCatalogError: 'Trgovina nije dostupna. Dodirni za ponovni pokušaj.',
  buyMarketUnavailable: 'Plaćanja u ovoj valuti još nisu dostupna. Ništa nije naplaćeno.',
  historyLoading: 'Učitavanje transakcija…',
  historyError: 'Povijest nije bilo moguće učitati.',
  historyRetry: 'Pokušaj ponovno',
};
