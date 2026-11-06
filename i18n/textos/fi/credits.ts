/*
 * FINÉS — Credits: el saldo, la recarga y el historial. Tipado contra el
 * español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» es marca, nunca «krediitit», y no se declina: cuando hace falta un
 * caso se compone («Credits-saldo», «Credits-osto»). «Recargar» es «Lataa
 * saldoa» y la recarga es «lataus»; «Saldo» se dice igual (glosario). Ni los
 * precios ni los cálculos pasan por aquí.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Käytettävissä olevat Credits',
  yourBalance: 'Saldosi',
  currentBalance: 'Nykyinen saldo',
  free: 'Ilmainen',
  testTopUp: 'Testilataus',
  testTopUpReady: 'Testilataus valmis',
  testPrices: 'Testihinnat sillä aikaa, kun rakennamme Weë AI -palvelua',
  topUp: 'Lataa saldoa',
  seeHistory: 'Näytä historia →',
  seeHistoryLabel: 'Näytä historia',
  history: 'Historia',
  myWallet: 'Oma lompakko',
  earned: 'Saadut',
  spent: 'Käytetyt',
  noMovements: 'Ei vielä tapahtumia',
  testTopUpDone: '{{cantidad}} Credits lisätty tilillesi. Tämä on testilataus: mitään ei veloitettu.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Latausta ei voitu suorittaa. Yritä uudelleen.',
  terms: 'Testilataus: mitään ei veloiteta vielä. Lopulliset hinnat tulevat, kun Weë AI käyttää oikeita tekoälyjään; siihen asti jokainen luomus näyttää testihintansa ennen aloitusta.',
  youHaveLabel: 'Sinulla on {{saldo}} Credits',
  topUpButton: 'Lataa {{cantidad}} Credits · testi',
  txPurchase: 'Credits-osto',
  txGrant: 'Saadut Credits',
  txRefund: 'Hyvitys',
  txUsage: 'Credits-käyttö',
  txRefunded: 'Hyvitetty',
  txPending: 'Käsittelyssä',
  purchasesComingSoon: 'Credits-ostot tulevat pian. Toistaiseksi täällä ei voi ladata saldoa.',
  topUpFailedTitle: 'Hups',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Montako Credits haluat?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Osta {{cantidad}} Credits · {{precio}}',
  buyLess: 'Vähemmän',
  buyMore: 'Enemmän',
  buyNoticeTitle: 'Maksuja ei ole vielä yhdistetty',
  buyNoticeBody: 'Mitään ei veloitettu, eikä saldosi muuttunut.',
  buyChecking: 'Tarkistetaan kauppaa…',
  buyCatalogError: 'Kauppaan ei saatu yhteyttä. Yritä uudelleen napauttamalla.',
  buyMarketUnavailable: 'Maksut tässä valuutassa eivät ole vielä saatavilla. Mitään ei veloitettu.',
  historyLoading: 'Ladataan tapahtumia…',
  historyError: 'Historiaa ei voitu ladata.',
  historyRetry: 'Yritä uudelleen',
};
