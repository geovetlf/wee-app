/*
 * JAPONÉS — Credits: el saldo, la recarga de prueba y el historial.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» es la moneda y se escribe siempre así, sin contador y sin
 * katakana. Recargar es チャージ; la recarga de prueba, テストチャージ, y cada
 * frase que la nombra dice que no se cobra dinero real (実際の料金は発生して
 * いません). Reembolso es 返還 (glosario). «Mi billetera» sigue el patrón de
 * マイ作品 y マイプロジェクト: マイウォレット.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: '利用可能なCredits',
  yourBalance: '残高',
  currentBalance: '現在の残高',
  topUp: 'チャージ',
  seeHistory: '履歴を見る →',
  seeHistoryLabel: '履歴を見る',
  history: '履歴',
  myWallet: 'マイウォレット',
  earned: '獲得',
  spent: '使用',
  noMovements: '取引履歴はまだありません',
  balanceAfter: '残高：{{saldo}}',
  youHaveLabel: '残高{{saldo}} Credits',
  txPurchase: 'Creditsの購入',
  txGrant: 'Creditsの受け取り',
  txRefund: '返還',
  txUsage: 'Creditsの使用',
  txRefunded: '返還済み',
  txPending: '処理中',
  referenceRate: '基準レート',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'CreditsはWeëの利用単位です。プランやCreditsのパックはありません。',
  recentMovements: '最近の履歴',
  purchasesComingSoon: 'Creditsの購入は近日公開予定です。現在、ここではチャージできません。',
};
