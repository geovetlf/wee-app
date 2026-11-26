/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Credits: el saldo, la recarga y el historial.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. «Credits» es marca: ni se traduce ni lleva sufijo
 * (va en aposición: «Credits atorneqarsinnaasut»). Saldo = «sinneruttut», recargar =
 * «amerlisiguk», historial = «pisimasut», de prueba = «misiligutitut» (guía §4.5).
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits atorsinnaasatit',
  yourBalance: 'Sinneruttutit',
  currentBalance: 'Maannakkut sinneruttut',
  free: 'Akeqanngitsoq',
  testTopUp: 'Misiligutitut amerlisaaneq',
  testTopUpReady: 'Misiligutitut amerlisaaneq piareerpoq',
  testPrices: 'Misiligutitut akit: Weë AI suli sanaarneqarpoq',
  topUp: 'Amerlisiguk',
  seeHistory: 'Pisimasut takukkit →',
  seeHistoryLabel: 'Pisimasut takukkit',
  history: 'Pisimasut',
  myWallet: 'Aningaasiviga',
  earned: 'Pissarsiat',
  spent: 'Atukkat',
  noMovements: 'Suli pisoqanngilaq',
  testTopUpDone: '{{cantidad}} Credits kontunnut ilanngunneqarput. Misiligutitut amerlisaaneruvoq: sumik akiliisitsisoqanngilaq.',
  balanceAfter: 'Sinneruttut: {{saldo}}',
  topUpFailed: 'Amerlisaaneq naammassineqarsinnaanngilaq. Misileqqiguk.',
  terms: 'Misiligutitut amerlisaaneq: suli sumik akiliisitsisoqanngilaq. Akit kingulliit takkussapput Weë AI piviusunik AI-nik atuilerpat; tamatuma tungaanut pilersitaq tamarmi aallartinnani misiligutitut akini takutittarpaa.',
  youHaveLabel: '{{saldo}} Credits pigaatit',
  topUpButton: 'Amerlisiguk: {{cantidad}} Credits · misiligut',
  txPurchase: 'Credits pisiarineqartut',
  txGrant: 'Credits tigusat',
  txRefund: 'Akiliutip utertinnera',
  txUsage: 'Credits atorneqartut',
  txRefunded: 'Utertinneqarpoq',
  txPending: 'Ingerlavoq',
  purchasesComingSoon: 'Credits sivitsunngitsukkut pisiarineqarsinnaalissapput. Maannakkut maani amerlisaasoqarsinnaanngilaq.',
  topUpFailedTitle: 'Ajoraluartumik',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  buyTitle: 'Credits qassit pisiarerusuppigit?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Pisigit: {{cantidad}} Credits · {{precio}}',
  buyLess: 'Ikinnerusut',
  buyMore: 'Amerlanerusut',
  buyNoticeTitle: 'Akiliineq suli atanngilaq',
  buyNoticeBody: 'Sumik akiliisitsisoqanngilaq, sinneruttutillu allanngunngillat.',
  buyChecking: 'Pisiniarfik misissorneqarpoq…',
  buyCatalogError: 'Pisiniarfimmik attaveqarneq iluatsinngilaq. Misileqqiniaruit attoruk.',
  buyMarketUnavailable: 'Aningaasat taakku atorlugit akiliineq suli atorneqarsinnaanngilaq. Sumik akiliisitsisoqanngilaq.',
  historyLoading: 'Pisimasut ammarneqarput…',
  historyError: 'Pisimasut ammaanneq iluatsinngilaq.',
  historyRetry: 'Misileqqiguk',
};
