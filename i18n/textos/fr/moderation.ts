/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tratamiento informal (tu) y apóstrofo tipográfico ’. Sin ? ! ni : para no
 * depender del espacio fino que pide la tipografía francesa.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Signaler',
  subtitle: 'Dis-nous ce qui se passe avec ce contenu.',
  chooseReason: 'Choisis un motif',
  send: 'Envoyer le signalement',
  sending: 'Envoi du signalement…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Harcèlement ou intimidation',
  reasonHate: 'Haine ou discrimination',
  reasonSexual: 'Contenu sexuel',
  reasonViolence: 'Violence',
  reasonScam: 'Arnaque ou fraude',
  reasonImpersonation: 'Usurpation d’identité',
  reasonIllegal: 'Contenu illégal',
  reasonSelfHarm: 'Automutilation ou suicide',
  reasonOther: 'Autre motif',
  successTitle: 'Signalement reçu',
  successBody: 'Merci de nous aider à garder Weë sûr.',
  duplicateTitle: 'Tu l’avais déjà signalé',
  duplicateBody: 'Nous avons déjà reçu ton signalement sur ce contenu.',
  errorTitle: 'Nous n’avons pas pu envoyer ton signalement.',
  errorBody: 'Réessaie.',
  errorOffline: 'Pas de connexion. Réessaie.',
  errorRateLimited: 'Tu as envoyé beaucoup de signalements à la suite. Réessaie plus tard.',
  errorUnavailable: 'Ce contenu n’est plus disponible.',
};
