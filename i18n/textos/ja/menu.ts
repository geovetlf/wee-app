/*
 * JAPONÉS — el menú ☰: sus entradas, las dos caras del perfil y la salida.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI) van en latino, tal cual.
 * `sectionProfile` y `sectionExplore` van en mayúsculas en español; el japonés no las tiene:
 * プロフィール y 発見 (Explora, glosario 10.3). Los especialistas de Weë AI son スペシャリスト.
 * `profileActive` y `switchToProfile` solo los oye el lector de pantalla, y su hueco es el
 * nombre del perfil (リアルプロフィール / Weëプロフィール).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'ホーム',
  realProfile: 'リアルプロフィール',
  weeProfile: 'Weëプロフィール',
  createWeeProfile: 'Weëプロフィールを作成',
  credits: 'Credits',
  econtact: 'ËContact',
  pages: 'Weë Pages',
  wcontact: 'ËContact',
  communities: 'コミュニティ',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'マイプロジェクト',
  saved: '保存済み',
  settings: '設定',
  help: 'ヘルプ',
  sectionProfile: 'プロフィール',
  sectionExplore: '発見',
  activeReal: 'リアルプロフィールを使用中',
  activeWee: 'Weëプロフィールを使用中',
  tapToSignIn: 'タップしてログイン',
  signOut: 'ログアウト',
  terms: '利用規約',
  privacy: 'プライバシー',
  signOutFailed: 'ログアウトできませんでした',
  profileActive: '{{perfil}}、使用中',
  switchToProfile: '{{perfil}}に切り替える',
  signIn: 'ログイン',
  hideSpecialists: 'スペシャリストを非表示',
  showSpecialists: 'スペシャリストを表示',
  signOutConfirm: 'Weëからログアウトしますか？',
  /* Rediseño del 2026-11-15: el menú nuevo. MyWeës es marca. Sin revisión nativa. */
  homeWall: 'ホーム / Wäll',
  explore: '発見',
  projectsTitle: 'プロジェクト',
  myWees: 'MyWeës',
  myWeesHint: 'お気に入りのショートカットを選んで整理できます',
  customize: 'カスタマイズ',
  history: '履歴',
  helpSupport: 'ヘルプとサポート',
};
