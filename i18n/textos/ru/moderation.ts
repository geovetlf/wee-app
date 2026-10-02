/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tratamiento de «вы», como el resto del ruso de Weë. Sin plurales: ninguna clave cuenta nada.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Пожаловаться',
  subtitle: 'Расскажите, что не так с этим контентом.',
  chooseReason: 'Выберите причину',
  send: 'Отправить жалобу',
  sending: 'Отправляем жалобу…',
  reasonSpam: 'Спам',
  reasonHarassment: 'Травля или запугивание',
  reasonHate: 'Ненависть или дискриминация',
  reasonSexual: 'Сексуальный контент',
  reasonViolence: 'Насилие',
  reasonScam: 'Мошенничество или обман',
  reasonImpersonation: 'Выдача себя за другого',
  reasonIllegal: 'Незаконный контент',
  reasonSelfHarm: 'Самоповреждение или суицид',
  reasonOther: 'Другая причина',
  successTitle: 'Жалоба получена',
  successBody: 'Спасибо, что помогаете делать Weë безопаснее.',
  duplicateTitle: 'Вы уже жаловались на это',
  duplicateBody: 'Мы уже получили вашу жалобу на этот контент.',
  errorTitle: 'Не удалось отправить жалобу.',
  errorBody: 'Попробуйте ещё раз.',
  errorOffline: 'Нет соединения. Попробуйте ещё раз.',
  errorRateLimited: 'Вы отправили много жалоб подряд. Попробуйте позже.',
  errorUnavailable: 'Этот контент больше недоступен.',
};
