/*
 * POLACO — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales. La
 * confirmación dice solo que el reporte se RECIBIÓ. Donde el español habla a
 * la persona en pasado («Ya lo habías denunciado», «Has enviado»), el polaco
 * se reformula en impersonal, porque su pasado tiene género.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Zgłoś',
  subtitle: 'Powiedz nam, co jest nie tak z tą treścią.',
  chooseReason: 'Wybierz powód',
  send: 'Wyślij zgłoszenie',
  sending: 'Wysyłanie zgłoszenia…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Nękanie lub zastraszanie',
  reasonHate: 'Nienawiść lub dyskryminacja',
  reasonSexual: 'Nagość lub treści seksualne',
  reasonViolence: 'Przemoc',
  reasonScam: 'Oszustwo lub wyłudzenie',
  reasonImpersonation: 'Podszywanie się pod kogoś',
  reasonIllegal: 'Treści nielegalne',
  reasonIntellectualProperty: 'Własność intelektualna',
  reasonSelfHarm: 'Samookaleczenia lub samobójstwo',
  reasonOther: 'Inny powód',
  successTitle: 'Zgłoszenie otrzymane',
  successBody: 'Dziękujemy, że pomagasz nam dbać o bezpieczeństwo Weë.',
  duplicateTitle: 'To zgłoszenie już istnieje',
  duplicateBody: 'Otrzymaliśmy już twoje zgłoszenie dotyczące tej treści.',
  errorTitle: 'Nie udało nam się wysłać twojego zgłoszenia.',
  errorBody: 'Spróbuj ponownie.',
  errorOffline: 'Brak połączenia. Spróbuj ponownie.',
  errorRateLimited: 'Za dużo zgłoszeń w krótkim czasie. Spróbuj ponownie później.',
  errorUnavailable: 'Ta treść nie jest już dostępna.',
};
