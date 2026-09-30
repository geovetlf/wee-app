/*
 * JAPONÉS — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La ubicación del aparato es 位置情報 (glosario 10.4). `locationLine` pega el estado —una frase
 * que ya acaba en 。— con la frase fija, sin espacio: en japonés las frases seguidas no se separan.
 * `aboutBody` conserva sus dos \n\n; «Todos los derechos reservados» queda en la fórmula latina
 * «All rights reserved.», que es como la escriben junto al © las pantallas «Acerca de» japonesas, y
 * la atribución de GeoNames se reescribe como frase para cerrar en 。 sin perder enlace ni licencia.
 * Los contadores de comunidades van como etiqueta y valor (参加中のコミュニティ：{{contador}}), sin
 * contador japonés que casara con cualquier cifra. «Sembrar valores por defecto» (administración)
 * se dice como el aviso de hecho del módulo engine: デフォルト値を保存; las cadenas son
 * フォールバックチェーン, como allí. El panel del motor es Weë AIエンジン: Weë AI es marca y «Engine» se
 * traduce.
 */
export const settings: typeof import('../es/settings').settings = {
  title: '設定',
  sectionContent: 'コンテンツ',
  sectionPrivacy: 'プライバシー',
  sectionPreferences: '環境設定',
  sectionSupport: 'ヘルプ',
  myCommunities: 'マイコミュニティ',
  communitiesJoined_one: '参加中のコミュニティ：{{contador}}',
  communitiesJoined_other: '参加中のコミュニティ：{{contador}}',
  privateReplies: 'プライベート返信',
  privateRepliesHint: 'ほかのユーザーからのプライベートメッセージを許可',
  pushNotifications: 'プッシュ通知',
  language: '言語',
  languageSubtitle: 'Weëの表示言語を選択',
  help: 'ヘルプ',
  privacyPolicy: 'プライバシーポリシー',
  about: 'Weëについて',
  signOut: 'ログアウト',
  signOutFailed: 'ログアウトできませんでした',
  engineAdmin: 'Weë AIエンジン',
  seedDefaults: 'デフォルト値を保存',
  seedDefaultsConfirm: 'まだ存在しないデフォルトのプロバイダー、フォールバックチェーン、設定をFirestoreに書き込みます。既存のデータは削除されません。',
  seed: '保存',
  sectionNotifications: '通知',
  sectionInfo: '情報',
  sectionAccount: 'アカウント',
  privacyPolicyHint: 'データの取り扱いを、わかりやすく説明します',
  pushNotificationsHint: '新しいメッセージやアクティビティの通知を受け取る',
  aboutHint: 'Weëの紹介とバージョン情報',
  helpHint: 'よくある質問とお問い合わせ',
  signOutHint: 'アカウントからログアウト',
  aboutBody: 'Weë（World Encode Entity）は、AIで作品を作る人たちのためのSNSです。\n\nバージョン1.0.0 · © {{anio}} Weë. All rights reserved.\n\n地理データはGeoNames（geonames.org）が提供しています（CC BY 4.0）。',
  location: '📍 位置情報',
  locationLine: '{{estado}}正確な位置情報が公開されることはありません。',
  locationOff: 'オフになっています。おおよその位置情報の利用をWeëに許可すると、近くのコンテンツや体験が表示されます。正確な位置情報が公開されることはありません。',
  locationUnavailable: 'このデバイスでは位置情報を取得できません。',
  locationDisabled: 'デバイスの設定で位置情報がオフになっています。',
  locationPermissionDenied: '位置情報の利用が許可されていません。ここをタップすると、デバイスの設定で変更できます。',
  locationPermissionNotDetermined: '必要になったときに、Weëが許可を求めます。',
  locationApproximate: 'Weëにわかるのはおおよその地域だけで、正確な地点まではわかりません。',
  locationPrecise: '機能に必要な場合、Weëは詳しい位置情報を利用できます。',
};
