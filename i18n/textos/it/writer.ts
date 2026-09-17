/*
 * ITALIANO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Chiedi a Weë',
  writeSomethingFirst: 'Scrivi prima qualcosa',
  writeSomethingHint: 'Scrivi prima qualcosa e Weë lo lavora con te.',
  save: 'Salva',
  saving: 'Salvataggio…',
  deleteDocument: 'Elimina documento',
  improve: 'Migliora',
  improveGoal: 'Migliorare questo testo',
  shorten: 'Accorcia',
  shortenGoal: 'Accorciare questo testo senza perdere l’essenziale',
  expand: 'Allunga',
  expandGoal: 'Sviluppare di più questo testo',
  fix: 'Correggi',
  fixGoal: 'Correggere l’ortografia e lo stile di questo testo',
  tone: 'Cambia tono',
  toneGoal: 'Riscrivere questo testo con un altro tono',
  summarize: 'Riassumi',
  summarizeGoal: 'Riassumere questo testo in idee chiave',
  translate: 'Traduci',
  translateGoal: 'Tradurre questo testo',
  words_one: '{{contador}} parola',
  words_other: '{{contador}} parole',
  savedInDocuments: ' · salvato nei Miei documenti',
  couldNotSaveToDocuments: 'Non è stato possibile salvare nei Miei documenti',
  myDocuments: 'I miei documenti',
  newDocument: 'Nuovo documento',
  noDocumentsYet: 'Non hai ancora documenti. Scrivine uno nuovo o chiedi a Weë di iniziare per te.',
  editedWhen: 'Modificato {{cuando}}',
  titleLabel: 'Titolo del documento',
  bodyLabel: 'Testo del documento',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Titolo del documento',
  bodyPlaceholder: 'Scrivi qui. Quando vuoi, chiedi a Weë di migliorarlo, correggerlo o tradurlo.',
  resultHint: 'Weë lavora su quello che hai scritto e ti restituisce il risultato qui, pronto per continuare a modificarlo.',
  weeWorksWithYou: 'Weë lo lavora con te.',
};
