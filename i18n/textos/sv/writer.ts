/*
 * SUECO — Weë Writer, dentro de Weë Studio: el editor y las herramientas que
 * trabajan el texto de la persona. Ese texto NUNCA pasa por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los «…Goal» son la petición que viaja a Weë Brain, y el código les pega
 * `: "extracto"` detrás: van en imperativo, como se le pide algo a Weë
 * («Översätt den här texten»), y sin punto. «Corregir» es Korrekturläs, la
 * palabra de las herramientas de escritura en sueco; acortar y alargar son la
 * pareja «Gör kortare» / «Gör längre», y las ideas clave, nyckelpunkter.
 *
 * «Documento» es dokument y «Mis documentos», Mina dokument, como Mina projekt.
 * Borrar un documento es para siempre: Radera, como un archivo (glosario § 9.1).
 * «Editado {{cuando}}» concuerda con dokument, que es neutro («Redigerat i går»,
 * «Redigerat för 3 dagar sedan»); {{cuando}} lo escribe Intl. «Ord» no cambia
 * con la cifra: «1 ord», «3 ord». El título del editor es Textredigerare,
 * porque «Editor» sin más se quedaría igual que en español y en inglés.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Be Weë om hjälp',
  writeSomethingFirst: 'Skriv något först',
  writeSomethingHint: 'Skriv något först, så arbetar Weë med texten tillsammans med dig.',
  save: 'Spara',
  saving: 'Sparar…',
  deleteDocument: 'Radera dokument',
  improve: 'Förbättra',
  improveGoal: 'Förbättra den här texten',
  shorten: 'Gör kortare',
  shortenGoal: 'Gör den här texten kortare utan att det viktiga försvinner',
  expand: 'Gör längre',
  expandGoal: 'Utveckla den här texten mer',
  fix: 'Korrekturläs',
  fixGoal: 'Rätta stavning och stil i den här texten',
  tone: 'Ändra ton',
  toneGoal: 'Skriv om den här texten i en annan ton',
  summarize: 'Sammanfatta',
  summarizeGoal: 'Sammanfatta den här texten i nyckelpunkter',
  translate: 'Översätt',
  translateGoal: 'Översätt den här texten',
  words_one: '{{contador}} ord',
  words_other: '{{contador}} ord',
  savedInDocuments: ' · sparat i Mina dokument',
  couldNotSaveToDocuments: 'Det gick inte att spara i Mina dokument',
  myDocuments: 'Mina dokument',
  newDocument: 'Nytt dokument',
  noDocumentsYet: 'Inga dokument ännu. Skriv ett nytt eller be Weë att börja åt dig.',
  editedWhen: 'Redigerat {{cuando}}',
  titleLabel: 'Dokumenttitel',
  bodyLabel: 'Dokumenttext',
  editorTitle: '✍️ Textredigerare',
  docTitlePlaceholder: 'Dokumenttitel',
  bodyPlaceholder: 'Skriv här. När du vill kan du be Weë förbättra, korrekturläsa eller översätta texten.',
  resultHint: 'Weë arbetar vidare med det du har skrivit och visar resultatet här, så att du kan fortsätta redigera.',
  weeWorksWithYou: 'Weë arbetar med texten tillsammans med dig.',
  saved: '✓ Sparat',
};
