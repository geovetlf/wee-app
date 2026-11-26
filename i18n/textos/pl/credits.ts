/*
 * POLACO — Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» nunca se vuelve «kredyty» ni se declina: se apoya en un sustantivo
 * puente («saldo Credits», «zakup Credits»). «Recarga» es «doładowanie», la
 * palabra de los operadores y las billeteras polacas.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Dostępne Credits',
  yourBalance: 'Twoje saldo',
  currentBalance: 'Aktualne saldo',
  free: 'Za darmo',
  testTopUp: 'Doładowanie testowe',
  testTopUpReady: 'Doładowanie testowe gotowe',
  testPrices: 'Ceny testowe, dopóki budujemy Weë AI',
  topUp: 'Doładuj',
  seeHistory: 'Zobacz historię →',
  seeHistoryLabel: 'Zobacz historię',
  history: 'Historia',
  myWallet: 'Mój portfel',
  earned: 'Zdobyte',
  spent: 'Wykorzystane',
  noMovements: 'Brak operacji',
  testTopUpDone: '{{cantidad}} Credits dodano do twojego konta. To doładowanie testowe: nic nie zostało pobrane.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Nie udało się ukończyć doładowania. Spróbuj ponownie.',
  terms: 'Doładowanie testowe: na razie nic nie jest pobierane. Ostateczne ceny pojawią się, gdy Weë AI zacznie używać prawdziwych modeli AI; do tego czasu każde dzieło pokazuje swój koszt testowy przed rozpoczęciem.',
  youHaveLabel: 'Masz {{saldo}} Credits',
  topUpButton: 'Doładuj {{cantidad}} Credits · test',
  txPurchase: 'Zakup Credits',
  txGrant: 'Otrzymane Credits',
  txRefund: 'Zwrot',
  txUsage: 'Użycie Credits',
  txRefunded: 'Zwrócono',
  txPending: 'W trakcie',
  purchasesComingSoon: 'Zakupy Credits pojawią się wkrótce. Na razie nie można tu doładować salda.',
  topUpFailedTitle: 'Ups',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Ile Credits chcesz?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Kup {{cantidad}} Credits · {{precio}}',
  buyLess: 'Mniej',
  buyMore: 'Więcej',
  buyNoticeTitle: 'Płatności nie są jeszcze podłączone',
  buyNoticeBody: 'Nic nie zostało pobrane, a twoje saldo się nie zmieniło.',
  buyChecking: 'Sprawdzanie sklepu…',
  buyCatalogError: 'Nie udało się połączyć ze sklepem. Dotknij, aby spróbować ponownie.',
  buyMarketUnavailable: 'Płatności w tej walucie nie są jeszcze dostępne. Nic nie zostało pobrane.',
  historyLoading: 'Wczytywanie operacji…',
  historyError: 'Nie udało się wczytać historii.',
  historyRetry: 'Spróbuj ponownie',
};
