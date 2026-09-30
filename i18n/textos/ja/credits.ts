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
  free: '無料',
  testTopUp: 'テストチャージ',
  testTopUpReady: 'テストチャージ完了',
  testPrices: 'Weë AI開発中のテスト価格',
  topUp: 'チャージ',
  seeHistory: '履歴を見る →',
  seeHistoryLabel: '履歴を見る',
  history: '履歴',
  myWallet: 'マイウォレット',
  earned: '獲得',
  spent: '使用',
  noMovements: '取引履歴はまだありません',
  testTopUpDone: '{{cantidad}} Creditsをアカウントに追加しました。テストチャージのため、実際の料金は発生していません。',
  balanceAfter: '残高：{{saldo}}',
  topUpFailed: 'チャージを完了できませんでした。もう一度お試しください。',
  terms: 'テストチャージのため、まだ料金は一切かかりません。正式な価格は、Weë AIが実際のAIを使い始める時点で決まります。それまでは、作成するたびに、始める前にテスト価格が表示されます。',
  youHaveLabel: '残高{{saldo}} Credits',
  topUpButton: '{{cantidad}} Creditsをチャージ · テスト',
  txPurchase: 'Creditsの購入',
  txGrant: 'Creditsの受け取り',
  txRefund: '返還',
  txUsage: 'Creditsの使用',
  txRefunded: '返還済み',
  txPending: '処理中',
  pkgBasic: 'ベーシック',
  badgePopular: '人気',
  badgeBestValue: '一番お得',
  purchasesComingSoon: 'Creditsの購入は近日公開予定です。現在、ここではチャージできません。',
  topUpFailedTitle: 'うまくいきませんでした',
};
