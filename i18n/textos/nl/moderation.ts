/*
 * NEERLANDÉS — Moderación: iets melden vanaf elke plek in Weë. Tipado contra el español.
 * «Denunciar» = «Melden» (glosario). La confirmación solo dice que la melding is ONTVANGEN.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Melden',
  subtitle: 'Vertel ons wat er aan de hand is met deze content.',
  chooseReason: 'Kies een reden',
  send: 'Melding versturen',
  sending: 'Melding versturen…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Intimidatie of pesten',
  reasonHate: 'Haat of discriminatie',
  reasonSexual: 'Naaktheid of seksuele content',
  reasonViolence: 'Geweld',
  reasonScam: 'Oplichting of fraude',
  reasonImpersonation: 'Zich voordoen als iemand anders',
  reasonIllegal: 'Illegale content',
  reasonIntellectualProperty: 'Intellectueel eigendom',
  reasonOther: 'Iets anders',
  successTitle: 'Melding ontvangen',
  successBody: 'Bedankt dat je helpt Weë veilig te houden.',
  duplicateTitle: 'Je hebt dit al gemeld',
  duplicateBody: 'We hebben je melding over deze content al ontvangen.',
  errorTitle: 'We konden je melding niet versturen.',
  errorBody: 'Probeer het opnieuw.',
  errorOffline: 'Geen verbinding. Probeer het opnieuw.',
  errorRateLimited: 'Je hebt veel meldingen achter elkaar verstuurd. Probeer het later opnieuw.',
  errorUnavailable: 'Deze content is niet meer beschikbaar.',
};
