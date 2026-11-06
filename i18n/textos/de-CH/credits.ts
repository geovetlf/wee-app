/*
 * ALEMÁN SUIZO (de-CH) — Credits: el saldo, la recarga y el historial. «Credits» es marca y no se traduce; todo lo que lo rodea, sí.
 *
 * Variante del alemán base (de/credits.ts). Aquí el alemán base no tiene ß, comillas
 * ni léxico que cambie en Suiza, así que las frases son las mismas. «Guthaben»
 * traduce SALDO, nunca «Credits».
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Verfügbare Credits',
  yourBalance: 'Dein Guthaben',
  currentBalance: 'Aktuelles Guthaben',
  free: 'Gratis',
  testTopUp: 'Testaufladung',
  testTopUpReady: 'Testaufladung bereit',
  testPrices: 'Testpreise, solange wir Weë AI bauen',
  topUp: 'Aufladen',
  seeHistory: 'Verlauf ansehen →',
  seeHistoryLabel: 'Verlauf ansehen',
  history: 'Verlauf',
  myWallet: 'Meine Wallet',
  earned: 'Erhalten',
  spent: 'Ausgegeben',
  noMovements: 'Noch keine Bewegungen',
  testTopUpDone: '{{cantidad}} Credits wurden deinem Konto gutgeschrieben. Es ist eine Testaufladung: Dir wurde nichts berechnet.',
  balanceAfter: 'Guthaben: {{saldo}}',
  topUpFailed: 'Die Aufladung konnte nicht abgeschlossen werden. Versuch es noch einmal.',
  terms: 'Testaufladung: Es wird noch kein Geld berechnet. Die endgültigen Preise kommen, sobald Weë AI mit echten KIs arbeitet. Bis dahin zeigt dir jede Kreation ihre Testkosten, bevor du startest.',
  youHaveLabel: 'Du hast {{saldo}} Credits',
  topUpButton: '{{cantidad}} Credits aufladen · Test',
  txPurchase: 'Credits gekauft',
  txGrant: 'Credits erhalten',
  txRefund: 'Erstattung',
  txUsage: 'Credits verbraucht',
  txRefunded: 'Erstattet',
  txPending: 'Läuft',
  purchasesComingSoon: 'Credits kannst du bald kaufen. Aufladungen sind hier vorerst noch nicht möglich.',
  topUpFailedTitle: 'Hoppla',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Wie viele Credits möchtest du?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: '{{cantidad}} Credits kaufen · {{precio}}',
  buyLess: 'Weniger',
  buyMore: 'Mehr',
  buyNoticeTitle: 'Zahlungen sind noch nicht verbunden',
  buyNoticeBody: 'Es wurde nichts berechnet und dein Guthaben ist unverändert.',
  buyChecking: 'Shop wird abgefragt …',
  buyCatalogError: 'Der Shop ist nicht erreichbar. Tippe, um es noch einmal zu versuchen.',
  buyMarketUnavailable: 'Zahlungen in dieser Währung sind noch nicht verfügbar. Es wurde nichts berechnet.',
  historyLoading: 'Buchungen werden geladen …',
  historyError: 'Verlauf konnte nicht geladen werden.',
  historyRetry: 'Erneut versuchen',
};
