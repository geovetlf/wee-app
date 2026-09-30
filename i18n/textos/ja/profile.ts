/*
 * JAPONÉS — la pantalla del perfil propio, entera, y la cabecera del perfil de otra persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las pestañas son las de una red social japonesa: 投稿 · メディア · リポスト · いいね. El campo
 * «Nombre de usuario» del formulario es el displayName —el @usuario se pinta aparte—, así que es
 * 表示名 y no ユーザー名, que en japonés es el identificador (también en su aviso de vacío,
 * `nameRequired`). La portada es カバー画像, la biografía 自己紹介 y la galería del teléfono
 * 写真ライブラリ (glosario 10.7). `retry` es el botón (再試行); la frase «Inténtalo de nuevo» es `common.retry`.
 * `viewMyEcontacts` solo lo oye el lector de pantalla: `{{nombre}}` es la agenda (ËContacts o
 * ẄContacts) y `{{total}}` cuenta personas, de ahí 人. `shareMessage` comparte el perfil PROPIO:
 * el nombre va sin さん.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'カバー画像を追加',
  permissionsTitle: 'アクセス許可',
  galleryPermission: '写真ライブラリへのアクセス許可が必要です',
  coverUploadFailed: 'カバー画像をアップロードできませんでした',

  loading: 'プロフィールを読み込み中…',
  loadFailed: 'プロフィールを読み込めませんでした',
  loadFailedDetail: 'アカウント情報を読み込めませんでした',
  backToLogin: 'ログイン画面に戻る',

  nameRequired: '表示名を入力してください',
  updateFailed: 'プロフィールを更新できませんでした',
  signOutFailed: 'ログアウトできませんでした',
  noSession: 'ログインしていません',
  avatarUpdateFailed: 'アバターを更新できませんでした。もう一度お試しください。',
  imageUrlMissing: '画像のURLを受け取れませんでした',

  shareMessage: 'Weëで{{nombre}}のプロフィールをチェック',

  editTitle: 'プロフィールの編集',
  displayNameLabel: '表示名',
  displayNamePlaceholder: '表示名を入力',
  bioLabel: '自己紹介',
  bioPlaceholder: '自己紹介を書く…',
  websiteLabel: 'ウェブサイト',
  websitePlaceholder: '例：https://example.com',
  charCount: '{{usados}}/{{maximo}}文字',

  editProfile: 'プロフィールを編集',
  createWeeProfile: 'Weëプロフィールを作成',

  posts: '投稿',
  viewMyEcontacts: '{{nombre}}を表示、{{total}}人',

  tabMedia: 'メディア',
  tabReposts: 'リポスト',
  tabLikes: 'いいね',

  loadingPosts: '投稿を読み込み中…',
  postsFailed: '投稿を読み込めませんでした',
  retry: '再試行',

  emptyPosts: '投稿はまだありません',
  emptyPostsHint: '最初の投稿をしてみましょう！',
  emptyMedia: '写真や動画の投稿はまだありません',
  emptyMediaHint: '写真や動画を投稿してみましょう',
  emptyReposts: 'リポストはまだありません',
  emptyRepostsHint: 'ほかのユーザーの投稿をリポストしてみましょう',
  emptyLikes: 'いいねした投稿はまだありません',
  emptyLikesHint: '気になる投稿にいいねしてみましょう',
  otherTitle: 'プロフィール',
  otherLoadFailed: 'プロフィールを読み込めませんでした',
  seeFullProfile: 'マイプロフィールを表示',
  emptyCategory: 'このカテゴリの投稿はありません',
  actionFailed: '操作を完了できませんでした',
  userNotFound: 'このユーザーは存在しません',
  shareOtherMessage: 'Weëで@{{nombre}}のプロフィールをチェック！\n\n{{bio}}',
  shareOtherNoBio: 'Weëユーザー',
  joinedOn: '{{fecha}}から利用しています',
  tabPolls: 'アンケート',
};
