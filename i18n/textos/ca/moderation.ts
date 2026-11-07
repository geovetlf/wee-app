/*
 * CATALÁN — Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Reporte» se dice «denúncia» en todo el módulo, y la confirmación solo dice que se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Denuncia',
  subtitle: 'Explica\'ns què passa amb aquest contingut.',
  chooseReason: 'Selecciona un motiu',
  send: 'Envia la denúncia',
  sending: 'S\'està enviant la denúncia…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Assetjament o intimidació',
  reasonHate: 'Odi o discriminació',
  reasonSexual: 'Nuesa o contingut sexual',
  reasonViolence: 'Violència',
  reasonScam: 'Estafa o frau',
  reasonImpersonation: 'Suplantació d\'identitat',
  reasonIllegal: 'Contingut il·legal',
  reasonIntellectualProperty: 'Propietat intel·lectual',
  reasonOther: 'Un altre motiu',
  successTitle: 'Denúncia rebuda',
  successBody: 'Gràcies per ajudar-nos a mantenir Weë segur.',
  duplicateTitle: 'Ja ho havies denunciat',
  duplicateBody: 'Ja hem rebut la denúncia sobre aquest contingut.',
  errorTitle: 'No hem pogut enviar la denúncia.',
  errorBody: 'Torna-ho a provar.',
  errorOffline: 'No hi ha connexió. Torna-ho a provar.',
  errorRateLimited: 'Has enviat moltes denúncies seguides. Torna-ho a provar més tard.',
  errorUnavailable: 'Aquest contingut ja no està disponible.',
};
