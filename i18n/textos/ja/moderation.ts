/*
 * JAPONÉS — Moderación: denunciar una publicación, un comentario o un perfil desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es 報告 (glosario), como en las redes japonesas. La confirmación
 * dice solo que el reporte se recibió —受け付けました—: nunca que se revisará
 * ni que se quitará nada. Los motivos van en lenguaje corriente, no legal.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: '報告',
  subtitle: 'このコンテンツにどのような問題があるか教えてください。',
  chooseReason: '理由を選んでください',
  send: '報告を送信',
  sending: '報告を送信中…',
  reasonSpam: 'スパム',
  reasonHarassment: '嫌がらせやいじめ',
  reasonHate: 'ヘイトや差別',
  reasonSexual: '性的なコンテンツ',
  reasonViolence: '暴力',
  reasonScam: '詐欺や不正行為',
  reasonImpersonation: 'なりすまし',
  reasonIllegal: '違法なコンテンツ',
  reasonSelfHarm: '自傷行為や自殺',
  reasonOther: 'その他の理由',
  successTitle: '報告を受け付けました',
  successBody: 'Weëの安全を守るためのご協力、ありがとうございます。',
  duplicateTitle: 'すでに報告済みです',
  duplicateBody: 'このコンテンツについての報告は、すでに受け付けています。',
  errorTitle: '報告を送信できませんでした。',
  errorBody: 'もう一度お試しください。',
  errorOffline: 'インターネットに接続されていません。もう一度お試しください。',
  errorRateLimited: '短時間での報告が多すぎます。しばらくしてから、もう一度お試しください。',
  errorUnavailable: 'このコンテンツは、もう利用できません。',
};
