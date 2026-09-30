/*
 * JAPONÉS — el alta guiada y la creación del Perfil Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Tu identidad para crear con IA» y «alter ego» se dicen もう一人の自分, la misma expresión en la
 * bienvenida, en la biografía del Perfil Weë y en la Ayuda. País es 国・地域, como en los
 * selectores de Apple y Google. El «nombre anónimo» es ニックネーム（匿名）, y el ejemplo del campo se
 * adapta (くろかげ, «sombra oscura»). «Desde el header» es 画面上部: se dice dónde mirar, no el
 * nombre técnico de la pieza. Lo que se escribe falta como 未入力 (el nombre) y lo que se elige en un
 * selector como 未選択 (fecha de nacimiento, género, país).
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Weëへようこそ',
  welcomeSubtitle: 'まずは基本情報を教えてください。そのあと、AIで作品を作るためのもう一人の自分、Weëプロフィールを作成できます。',
  yourName: '名前',
  yourNameHint: 'この名前は公開プロフィールに表示されます。',
  yourNamePlaceholder: 'フルネーム',
  birthDate: '生年月日',
  birthDateHint: 'Weëを利用するには13歳以上である必要があります。',
  gender: '性別',
  genderMale: '男性',
  genderFemale: '女性',
  genderOther: 'その他',
  country: '国・地域',
  pickCountry: '国・地域を選択',
  searchCountry: '国・地域を検索…',
  customiseProfile: 'プロフィールをカスタマイズ',
  yourAvatar: 'アバター',
  yourAvatarHint: 'タップして、用意されたアバターを選ぶか、画像をアップロードしてください',
  bioPlaceholder: '自己紹介を書く…（任意）',
  saving: '保存中…',
  completed: '完了しました！',
  complete: '完了',
  continueStep: '次へ',
  nameMissingTitle: '名前が未入力です',
  nameMissing: '続けるには、名前を入力してください。',
  nameShortTitle: '名前が短すぎます',
  nameShort: '名前は2文字以上で入力してください。',
  birthMissingTitle: '生年月日が未選択です',
  birthMissing: '年・月・日を選んでください。',
  genderMissingTitle: '性別が未選択です',
  genderMissing: '続けるには、いずれかを選んでください。',
  countryMissingTitle: '国・地域が未選択です',
  countryMissing: '続けるには、国・地域を選んでください。',
  saveFailedTitle: 'プロフィールを保存できませんでした',
  saveFailed: 'もう一度お試しください。',
  weeTitle: 'Weëプロフィールを作成',
  weeIntro: 'このプロフィールは、リアルの自分とは切り離されています。Weëプロフィールでの投稿やアクティビティが、メインのプロフィールと結び付けられることはありません。',
  weePhoto: 'プロフィール写真',
  weePhotoHint: 'タップして、写真か用意されたアバターを選んでください',
  weeName: 'ニックネーム（匿名）',
  weeNamePlaceholder: '例：くろかげ、Anon123…',
  weeBioPlaceholder: 'もう一人の自分について書く…',
  weeCreatedTitle: 'Weëプロフィールを作成しました',
  weeCreated: '匿名プロフィールの準備ができました。プロフィールは画面上部から切り替えられます。',
  weeCreateFailed: 'Weëプロフィールを作成できませんでした',
  birthDay: '日',
  birthMonth: '月',
  birthYear: '年',
  stepOf: 'ステップ{{paso}}/{{total}}',
  customiseProfileHint: 'アバターを選んで、必要なら自己紹介も追加しましょう',
  bioLabel: '自己紹介（任意）',
  weeNameCounter: '{{usados}}/{{maximo}}文字（{{minimo}}文字以上）',
  weeBio: '自己紹介（任意）',
};
