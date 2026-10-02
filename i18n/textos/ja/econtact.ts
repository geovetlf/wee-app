/*
 * JAPONÉS — ËContact y ẄContact: las conexiones de Weë y sus solicitudes. Los dos nombres son marca y entran
 * como valor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Conexión es つながり; solicitud, リクエスト, como en las notificaciones («ËContactのリクエスト»): aceptar 承認,
 * rechazar 拒否, retirar 取り消す, y «Solicitud enviada», リクエスト済み (el botón de Instagram). El nombre de otra
 * persona va solo, sin さん (guía § 2 y § 8); por eso «esta persona», que ocupa el lugar del nombre mientras no
 * carga, es このユーザー. {{lista}} es el nombre de la agenda (el código le pega una «s» para el plural: ËContacts)
 * y {{etiqueta}}, la cara de la persona: van donde una marca latina se lee bien y nunca con さん. La cuenta se dice
 * en personas: 「{{lista}}：{{contador}}人」.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: '届いたリクエスト',
  requestsSent: '送ったリクエスト',
  yours: '{{lista}}一覧',
  yoursWhenYouSignIn: 'ログインすると{{lista}}が表示されます',
  yoursWhenYouSignInSubtitle: '{{lista}}には、Weëでのつながりが保存されます。確認するにはログインしてください。',
  noneYet: '{{lista}}はまだありません',
  noneYetSubtitle: 'Weëでつながった人がここに表示されます。つながりは、一方がリクエストを送り、もう一方が承認すると成立します。',
  noAgenda: 'このプロフィールには連絡先リストがありません',
  noAgendaSubtitle: '{{lista}}には、ほかのユーザーとのつながりがまとめられています。確認するには、リアルプロフィールかWeëプロフィールに切り替えてください。',
  wantsToConnect: '{{lista}} · つながりを希望しています',
  accept: '{{nombre}}からのリクエストを承認',
  reject: '{{nombre}}からのリクエストを拒否',
  withdraw: '{{nombre}}へのリクエストを取り消す',
  removeFrom: '{{nombre}}を{{lista}}から削除',
  openProfile: '{{nombre}}の{{etiqueta}}を開く',
  rejectTitle: 'リクエストの拒否',
  rejectConfirm: '{{nombre}}からのリクエストを拒否しますか？',
  withdrawTitle: 'リクエストの取り消し',
  withdrawConfirm: '{{nombre}}へのリクエストを取り消しますか？',
  removeTitle: '{{lista}}から削除',
  removeConfirm: '{{nombre}}を{{lista}}から削除しますか？',
  failed: '操作を完了できませんでした',
  count_one: '{{lista}}：{{contador}}人',
  count_other: '{{lista}}：{{contador}}人',
  somePerson: 'このユーザー',
  acceptLabel: '{{lista}}のリクエストを承認',
  rejectRequestLabel: '{{lista}}のリクエストを拒否',
  requestSent: 'リクエスト済み',
  errSignIn: 'ËContactを使うには、ログインしてください。',
  errNotYours: '自分のプロフィールではありません。',
  errNotAPerson: 'このプロフィールではËContactを使えません。',
  errSameProfile: 'プロフィールは自分自身とはつながれません。',
  errOffline: 'Weëにつながりませんでした。',
  errNoRequestToReject: '拒否できるリクエストはありません。',
  errNoPendingRequest: 'このプロフィールへの承認待ちのリクエストはありません。',
  errNotConnected: 'このプロフィールとはつながっていません。',
  errNoActiveProfile: '使用中のプロフィールがないため、この操作はできません。',
};
