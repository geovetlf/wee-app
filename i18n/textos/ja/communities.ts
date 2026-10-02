/*
 * JAPONÉS — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Unirse es 参加 y salir 退会 (glosario 10.3); estar dentro, 参加中. El nombre de una comunidad
 * entra por `{{nombre}}` y es contenido: se cita entre 「」 y nunca lleva さん. `defaultDescription`
 * se GUARDA como descripción cuando quien crea la comunidad no escribe ninguna. `members_*` (con la
 * cifra) y `members` (la etiqueta bajo la cifra) conviven: メンバー{{contador}}人 / メンバー.
 * `empty` sale también cuando la búsqueda no encuentra nada, así que no lleva まだ.
 * `understoodJoin` cierra el aviso de una comunidad sin filtro: 理解した上で参加, la fórmula de las
 * advertencias de contenido japonesas (理解した上で続行).
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'コミュニティを作成',
  searchPlaceholder: 'コミュニティを検索…',
  loading: 'コミュニティを読み込み中…',

  joinedSection: '参加中のコミュニティ',
  discoverSection: 'コミュニティを探す',

  official: '公式',
  members_one: 'メンバー{{contador}}人',
  members_other: 'メンバー{{contador}}人',
  memberOf: '参加中',
  join: '参加',

  leaveTitle: 'コミュニティからの退会',
  leaveConfirm: '「{{nombre}}」から退会しますか？',
  leave: '退会',
  leaveFailed: 'コミュニティから退会できませんでした',
  actionFailed: '操作を完了できませんでした',

  newCommunity: '新しいコミュニティ',
  name: 'コミュニティ名',
  namePlaceholder: '例：コーヒー好きの集まり',
  description: '説明',
  descriptionPlaceholder: 'どんなコミュニティですか？',
  createFailed: 'コミュニティを作成できませんでした',
  defaultDescription: '{{nombre}}のコミュニティ',
  empty: '表示できるコミュニティはありません',

  findYours: '自分に合うコミュニティを見つけましょう。',
  searchLabel: 'コミュニティを検索',
  members: 'メンバー',
  posts: '投稿',
  rules: 'コミュニティのルール',
  one: 'コミュニティ',
  loadFailed: 'コミュニティを読み込めませんでした',
  noPosts: '投稿はまだありません',
  beTheFirst: 'このコミュニティに最初の投稿をしてみましょう',
  createPost: '投稿を作成',
  understoodJoin: '理解した上で参加',
  memberCount_one: 'メンバー{{cantidad}}人',
  memberCount_other: 'メンバー{{cantidad}}人',
  postCount_one: '投稿{{contador}}件',
  postCount_other: '投稿{{contador}}件',
  officialNameFilmAnimation: '映画＆アニメーション',
  officialNameArtCreativity: 'アート＆クリエイティブ',
  officialNameCreatorsInfluencers: 'クリエイター＆インフルエンサー',
  officialNameBusinessEntrepreneurship: 'ビジネス＆起業',
  officialNameTechAi: 'テクノロジー＆AI',
  officialNameGamingVirtualWorlds: 'ゲーム＆仮想世界',
  officialNameEducationLearning: '教育＆学び',
  officialNameFutureSociety: '未来＆社会',
  officialRuleShare: 'AIで作った作品を、作り方と一緒に共有しましょう',
  officialRuleRespect: '質問するときも答えるときも、相手を尊重しましょう',
  officialRuleNoSpam: 'スパムや他人のコンテンツの投稿は禁止です',
  popularDescFilmmakers: 'AIを映画や映像制作に活用する人たちのコミュニティです。制作過程を見せ合って、お互いの作り方から学びましょう。',
  popularDescInfluencers: 'AIでコンテンツを制作するインフルエンサーやクリエイターのコミュニティです。',
  popularDescDesigners: 'ブランディング、イラスト、デジタルアートなど、AIを使って仕事をするデザイナーが集まります。',
  popularDescWriters: '本、脚本、記事、詩など、AIで創作する書き手が集まります。',
  popularDescMusicians: 'AIで音楽やサウンドを作る人たちが集まります。',
  popularDescDevelopers: 'AIを使って開発するエンジニアのコミュニティです。',
  popularDescEntrepreneurs: '自分のビジネスにAIを取り入れている起業家が集まります。',
  popularDescGamers: 'AIとゲームのコミュニティです。キャラクター、世界観、体験づくりがテーマです。',
};
