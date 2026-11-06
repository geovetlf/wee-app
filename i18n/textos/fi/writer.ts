/*
 * FINÉS — Weë Writer, dentro de Weë Studio. Tipado contra el español: si allí
 * hay una clave que aquí falta, no compila.
 *
 * El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas
 * que lo trabajan. «Pídele a Weë» se dice «Pyydä Weë-avustajalta» para no
 * declinar la marca. «Documento» es «dokumentti» y «Mis documentos» es «Omat
 * dokumentit»; «{{contador}} sana» con 1, «{{contador}} sanaa» con el resto.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Pyydä Weë-avustajalta',
  writeSomethingFirst: 'Kirjoita ensin jotain',
  writeSomethingHint: 'Kirjoita ensin jotain, niin Weë työstää sitä kanssasi.',
  save: 'Tallenna',
  saving: 'Tallennetaan…',
  deleteDocument: 'Poista asiakirja',
  improve: 'Paranna',
  improveGoal: 'Paranna tätä tekstiä',
  shorten: 'Lyhennä',
  shortenGoal: 'Lyhennä tätä tekstiä menettämättä olennaista',
  expand: 'Pidennä',
  expandGoal: 'Kehitä tätä tekstiä pidemmälle',
  fix: 'Korjaa',
  fixGoal: 'Korjaa tämän tekstin oikeinkirjoitus ja tyyli',
  tone: 'Vaihda sävyä',
  toneGoal: 'Kirjoita tämä teksti uudelleen eri sävyllä',
  summarize: 'Tiivistä',
  summarizeGoal: 'Tiivistä tämä teksti avainkohtiin',
  translate: 'Käännä',
  translateGoal: 'Käännä tämä teksti',
  words_one: '{{contador}} sana',
  words_other: '{{contador}} sanaa',
  savedInDocuments: ' · tallennettu Omiin asiakirjoihin',
  couldNotSaveToDocuments: 'Tallennus Omiin asiakirjoihin ei onnistunut',
  myDocuments: 'Omat asiakirjat',
  newDocument: 'Uusi asiakirja',
  noDocumentsYet: 'Sinulla ei ole vielä asiakirjoja. Kirjoita uusi tai pyydä Weë-avustajaa aloittamaan puolestasi.',
  editedWhen: 'Muokattu {{cuando}}',
  titleLabel: 'Asiakirjan otsikko',
  bodyLabel: 'Asiakirjan teksti',
  editorTitle: '✍️ Editori',
  docTitlePlaceholder: 'Asiakirjan otsikko',
  bodyPlaceholder: 'Kirjoita tähän. Kun haluat, pyydä Weë-avustajaa parantamaan, korjaamaan tai kääntämään tekstin.',
  resultHint: 'Weë työstää kirjoittamaasi ja palauttaa tuloksen tähän valmiina jatkomuokkausta varten.',
  weeWorksWithYou: 'Weë työstää sitä kanssasi.',
  saved: '✓ Tallennettu',
};
