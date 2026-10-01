/*
 * DANÉS — Weë Writer, dentro de Weë Studio: el editor y las herramientas que
 * trabajan el texto de la persona. Ese texto NUNCA pasa por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los «…Goal» son la petición que viaja a Weë Brain, y el código les pega
 * `: "extracto"` detrás: van en imperativo, como se le pide algo a Weë
 * («Oversæt denne tekst»), y sin punto. Los botones forman una familia con
 * «Gør bedre» para mejorar, y los verbos de las herramientas de escritura danesas para
 * acortar y desarrollar: «Forkort» y «Uddyb»; «Mejorar» no es «Forbedr»
 * porque la guía § 3 evita los imperativos que acaban en grupo consonántico
 * (como «Ændr»). «Corregir» es Korrekturlæs, la palabra de las herramientas de
 * escritura danesas, y las ideas clave, hovedpunkter.
 *
 * «Documento» es dokument y «Mis documentos», Mine dokumenter, como Mine
 * projekter. «Editado {{cuando}}» concuerda con dokument («Redigeret i går»,
 * «Redigeret for 3 dage siden»); {{cuando}} lo escribe Intl. «Ord» no cambia con
 * la cifra: «1 ord», «3 ord». El título del editor es Teksteditor, porque
 * «Editor» a secas se quedaría igual que en español y en inglés. El fallo de
 * guardar lleva el paso siguiente (guía § 8).
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Spørg Weë',
  writeSomethingFirst: 'Skriv noget først',
  writeSomethingHint: 'Skriv noget først, så arbejder Weë med teksten sammen med dig.',
  save: 'Gem',
  saving: 'Gemmer…',
  deleteDocument: 'Slet dokument',
  improve: 'Gør bedre',
  improveGoal: 'Gør denne tekst bedre',
  shorten: 'Forkort',
  shortenGoal: 'Forkort denne tekst uden at miste det vigtige',
  expand: 'Uddyb',
  expandGoal: 'Uddyb denne tekst mere',
  fix: 'Korrekturlæs',
  fixGoal: 'Ret stavning og stil i denne tekst',
  tone: 'Skift tone',
  toneGoal: 'Skriv denne tekst om i en anden tone',
  summarize: 'Opsummer',
  summarizeGoal: 'Opsummer denne tekst i hovedpunkter',
  translate: 'Oversæt',
  translateGoal: 'Oversæt denne tekst',
  words_one: '{{contador}} ord',
  words_other: '{{contador}} ord',
  savedInDocuments: ' · gemt i Mine dokumenter',
  couldNotSaveToDocuments: 'Det kunne ikke gemmes i Mine dokumenter. Prøv igen.',
  myDocuments: 'Mine dokumenter',
  newDocument: 'Nyt dokument',
  noDocumentsYet: 'Ingen dokumenter endnu. Skriv et nyt, eller bed Weë om at begynde på det for dig.',
  editedWhen: 'Redigeret {{cuando}}',
  titleLabel: 'Dokumenttitel',
  bodyLabel: 'Dokumenttekst',
  editorTitle: '✍️ Teksteditor',
  docTitlePlaceholder: 'Dokumenttitel',
  bodyPlaceholder: 'Skriv her. Når du vil, kan du bede Weë om at forbedre, rette eller oversætte teksten.',
  resultHint: 'Weë arbejder videre med det, du har skrevet, og viser resultatet her, så du kan fortsætte med at redigere.',
  weeWorksWithYou: 'Weë arbejder med teksten sammen med dig.',
  saved: '✓ Gemt',
};
