/*
 * JAPONÉS — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre es siempre Weëls, en latino, también donde el español dice «un Weël»: el japonés no tiene número y la
 * marca no se translitera ni se declina (guía § 9 y § 10.7; igual en composer.kindWeel y help.q6). El botón + se
 * nombra como en la Ayuda (help.a6): +ボタン. Los vídeos se cuentan con 本 y la duración va en 秒.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Weëlsを共有',
  empty: 'Weëlsはまだありません',
  emptyHint: '+ボタンから最初のWeëlsを作りましょう',
  loadFailed: 'Weëlsを読み込めませんでした',
  rowSubtitle: 'コミュニティが作った動画をチェックしましょう。',
  seeAll: 'Weëlsをすべて表示',
  create: 'Weëlsを作成',
  createFirst: 'はじめてのWeëls',
  open: 'Weëlsを見る',
  upTo15s: '最大15秒',
  noneYetHint: 'コミュニティのWeëlsはまだありません。サンプルで実際の見え方を確認できます。',
  sampleAiScene: 'AIで作ったシーン',
  sampleDance: 'ダンス',
  sampleRecipe: 'レシピ',
  sampleTrip: '旅行',
};
