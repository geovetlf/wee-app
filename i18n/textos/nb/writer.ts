/*
 * NORUEGO BOKMÅL — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Ord» es invariable: «1 ord», «3 ord».
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Spør Weë',
  writeSomethingFirst: 'Skriv noe først',
  writeSomethingHint: 'Skriv noe først, så jobber Weë med det sammen med deg.',
  save: 'Lagre',
  saving: 'Lagrer…',
  deleteDocument: 'Slett dokument',
  improve: 'Forbedre',
  improveGoal: 'Forbedre denne teksten',
  shorten: 'Kort ned',
  shortenGoal: 'Kort ned denne teksten uten å miste det viktige',
  expand: 'Utvid',
  expandGoal: 'Utdyp denne teksten',
  fix: 'Rett opp',
  fixGoal: 'Rett opp stavefeil og stil i denne teksten',
  tone: 'Endre tone',
  toneGoal: 'Skriv denne teksten på nytt med en annen tone',
  summarize: 'Oppsummer',
  summarizeGoal: 'Oppsummer denne teksten i hovedpunkter',
  translate: 'Oversett',
  translateGoal: 'Oversett denne teksten',
  words_one: '{{contador}} ord',
  words_other: '{{contador}} ord',
  savedInDocuments: ' · lagret i Mine dokumenter',
  couldNotSaveToDocuments: 'Kunne ikke lagre i Mine dokumenter',
  myDocuments: 'Mine dokumenter',
  newDocument: 'Nytt dokument',
  noDocumentsYet: 'Du har ingen dokumenter ennå. Skriv et nytt, eller be Weë begynne for deg.',
  editedWhen: 'Redigert {{cuando}}',
  titleLabel: 'Dokumenttittel',
  bodyLabel: 'Dokumenttekst',
  editorTitle: '✍️ Skriveverktøy',
  docTitlePlaceholder: 'Dokumenttittel',
  bodyPlaceholder: 'Skriv her. Når du vil, kan du be Weë forbedre, rette eller oversette teksten.',
  resultHint: 'Weë jobber med det du skrev og gir deg resultatet her, klart til å redigeres videre.',
  weeWorksWithYou: 'Weë jobber med det sammen med deg.',
  saved: '✓ Lagret',
};
