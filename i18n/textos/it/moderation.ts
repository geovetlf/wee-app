/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tratamiento informal (tu) y apóstrofo tipográfico ’.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Segnala',
  subtitle: 'Raccontaci cosa succede con questo contenuto.',
  chooseReason: 'Scegli un motivo',
  send: 'Invia segnalazione',
  sending: 'Invio della segnalazione…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Molestie o intimidazioni',
  reasonHate: 'Odio o discriminazione',
  reasonSexual: 'Contenuto sessuale',
  reasonViolence: 'Violenza',
  reasonScam: 'Truffa o frode',
  reasonImpersonation: 'Furto d’identità',
  reasonIllegal: 'Contenuto illegale',
  reasonSelfHarm: 'Autolesionismo o suicidio',
  reasonOther: 'Altro motivo',
  successTitle: 'Segnalazione ricevuta',
  successBody: 'Grazie per aiutarci a mantenere Weë sicuro.',
  duplicateTitle: 'L’avevi già segnalato',
  duplicateBody: 'Abbiamo già ricevuto la tua segnalazione su questo contenuto.',
  errorTitle: 'Non siamo riusciti a inviare la tua segnalazione.',
  errorBody: 'Riprova.',
  errorOffline: 'Nessuna connessione. Riprova.',
  errorRateLimited: 'Hai inviato molte segnalazioni di seguito. Riprova più tardi.',
  errorUnavailable: 'Questo contenuto non è più disponibile.',
};
