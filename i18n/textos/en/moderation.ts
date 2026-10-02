/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Report',
  subtitle: 'Tell us what is happening with this content.',
  chooseReason: 'Choose a reason',
  send: 'Send report',
  sending: 'Sending report…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Harassment or bullying',
  reasonHate: 'Hate or discrimination',
  reasonSexual: 'Sexual content',
  reasonViolence: 'Violence',
  reasonScam: 'Scam or fraud',
  reasonImpersonation: 'Impersonation',
  reasonIllegal: 'Illegal content',
  reasonSelfHarm: 'Self-harm or suicide',
  reasonOther: 'Something else',
  successTitle: 'Report received',
  successBody: 'Thanks for helping keep Weë safe.',
  duplicateTitle: 'You already reported this',
  duplicateBody: 'We already have your report about this content.',
  errorTitle: 'We could not send your report.',
  errorBody: 'Please try again.',
  errorOffline: 'No connection. Please try again.',
  errorRateLimited: 'You have sent many reports in a row. Try again later.',
  errorUnavailable: 'This content is no longer available.',
};
