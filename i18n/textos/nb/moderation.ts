/*
 * NORUEGO BOKMÅL — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los motivos son categorías en lenguaje normal, no términos legales. La confirmación
 * dice solo que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Rapporter',
  subtitle: 'Fortell oss hva som er galt med dette innholdet.',
  chooseReason: 'Velg en årsak',
  send: 'Send rapport',
  sending: 'Sender rapport…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Trakassering eller mobbing',
  reasonHate: 'Hat eller diskriminering',
  reasonSexual: 'Nakenhet eller seksuelt innhold',
  reasonViolence: 'Vold',
  reasonScam: 'Svindel eller bedrageri',
  reasonImpersonation: 'Utgir seg for å være noen andre',
  reasonIllegal: 'Ulovlig innhold',
  reasonIntellectualProperty: 'Immaterielle rettigheter',
  reasonOther: 'Annen årsak',
  successTitle: 'Rapport mottatt',
  successBody: 'Takk for at du hjelper oss å holde Weë trygt.',
  duplicateTitle: 'Du har allerede rapportert dette',
  duplicateBody: 'Vi har allerede mottatt rapporten din om dette innholdet.',
  errorTitle: 'Vi kunne ikke sende rapporten din.',
  errorBody: 'Prøv igjen.',
  errorOffline: 'Ingen tilkobling. Prøv igjen.',
  errorRateLimited: 'Du har sendt mange rapporter på rad. Prøv igjen senere.',
  errorUnavailable: 'Dette innholdet er ikke lenger tilgjengelig.',
};
