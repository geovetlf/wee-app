/*
 * JAPONÉS — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (glosario 10.6): 保存, キャンセル, 削除,
 * 閉じる, 戻る, 次へ, 完了, 送信, 共有. `accept` es el botón único de dos avisos informativos: OK, en
 * latino, como en iOS y Android (glosario 10.6); las pruebas 17 y 19 lo tienen como excepción
 * escrita (`SIN_TEXTO`). `retry` es el CUERPO de un aviso, no un botón: por
 * eso es una frase; el botón 再試行 vive en `profile.retry`. `user` es el nombre de respaldo que
 * entra en frases como {{nombre}}がリポストしました: ユーザー encaja sin さん, que al contar lo que
 * hace otra persona no se pone. `new` es la etiqueta del menú junto al Perfil Weë aún por crear.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'キャンセル',
  save: '保存',
  delete: '削除',
  close: '閉じる',
  back: '戻る',
  next: '次へ',
  done: '完了',
  accept: 'OK',
  send: '送信',
  share: '共有',
  retry: 'もう一度お試しください',
  loading: '読み込み中…',
  error: 'エラー',
  somethingWentWrong: '問題が発生しました',
  noResults: '該当する結果はありません',
  notAvailable: '利用できません',
  comingSoon: '近日公開',
  new: '新機能',
  seeAll: 'すべて表示 →',
  guest: 'ゲスト',
  anonymousUser: '匿名ユーザー',
  user: 'ユーザー',
  yes: 'はい',
  no: 'いいえ',
  loadMore: '投稿をもっと見る',
  postsCount_one: '投稿{{cantidad}}件',
  postsCount_other: '投稿{{cantidad}}件',
  someone: '誰か',
};
