/*
 * JAPONÉS — WeeTalk: la bandeja, la conversación y sus avisos. Los mensajes los escribe la gente y no pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk es marca y va en latino. Una conversación es 会話; «chat» solo aparece en チャットに残す,
 * la opción de la foto de una sola vez, que es como la dice Instagram en japonés. El modo efímero
 * es 消えるメッセージ, el nombre que el japonés ya conoce para los mensajes que desaparecen.
 * `youSaid` precede al último mensaje propio en la bandeja: あなた：…, como las apps de mensajería
 * japonesas. `areYouSure` es el cuerpo del aviso de borrar una conversación (su único uso): dice
 * qué se borra. `noConversationsHint` cita en español un botón «Privado» que no está en ninguna
 * pantalla; en japonés cita el que sí existe, 「WeeTalkで送信」 (`wall.sendByWeeTalk`, menú del post).
 * `attach` es 添付, como el «Adjuntar» de Weë AI (`weeai.attach`): la misma palabra española se
 * dice igual en toda la app. El permiso de la galería del teléfono es 写真ライブラリ (glosario 10.7).
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'メッセージを入力…',
  send: '送信',
  empty: '会話はまだありません',
  emptyHint: '相手のプロフィールからメッセージを送ってみましょう',
  loadFailed: '会話を読み込めませんでした',
  sendFailed: 'メッセージを送信できませんでした',
  attach: '添付',
  photo: '写真を撮る',
  search: '検索…',
  noConversations: '会話はありません',
  deleteConversation: '会話の削除',
  areYouSure: 'この会話を削除しますか？',
  messagePlaceholderShort: 'メッセージ…',
  firstMessage: '最初のメッセージを送ってみましょう',
  photoSeen: '表示済みの写真',
  photoOnce: '1回限りの写真',
  photoOpened: '開封済み',
  tapToView: 'タップして表示',
  tapToClose: 'タップして閉じる',
  theme: 'テーマ',
  background: '背景',
  permissions: 'アクセス許可',
  photoPermission: '写真ライブラリへのアクセス許可が必要です',
  audioPermission: 'マイクへのアクセス許可が必要です',
  imageFailed: '画像を送信できませんでした',
  noConversationsHint: 'どの投稿でも、メニューの「WeeTalkで送信」から匿名で会話を始められます',
  ephemeralMode: '消えるメッセージ',
  noMessagesYet: 'メッセージはまだありません',
  youSaid: 'あなた：{{mensaje}}',
  conversationStart: 'ここからプライベートな会話が始まります',
  beRespectful: '相手への敬意とプライバシーを大切にしましょう 🤝',
  anonymousUser: '匿名ユーザー',
  ephemeralOn: '消えるメッセージがオン · 会話を閉じるとメッセージが消えます',
  cameraNeeded: 'カメラへのアクセス許可が必要です',
  allow: '許可',
  recordAudio: '音声を録音',
  viewOnceOn: '1回だけ表示',
  keepInChat: 'チャットに残す',
  themeClassic: 'クラシック',
  themeMidnight: 'ミッドナイト',
  themeForest: 'フォレスト',
  themeSunset: 'サンセット',
  themeOcean: 'オーシャン',
  themePurple: 'パープル',
  imagePreview: '📷 写真',
  audioPreview: '🎤 ボイスメッセージ',
  today: '今日',
};
