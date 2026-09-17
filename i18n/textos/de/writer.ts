/*
 * ALEMÁN — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Weë fragen',
  writeSomethingFirst: 'Schreib erst etwas',
  writeSomethingHint: 'Schreib erst etwas, dann arbeitet Weë mit dir daran.',
  save: 'Speichern',
  saving: 'Wird gespeichert…',
  deleteDocument: 'Dokument löschen',
  improve: 'Verbessern',
  improveGoal: 'Diesen Text verbessern',
  shorten: 'Kürzen',
  shortenGoal: 'Diesen Text kürzen, ohne das Wichtige zu verlieren',
  expand: 'Erweitern',
  expandGoal: 'Diesen Text weiter ausführen',
  fix: 'Korrigieren',
  fixGoal: 'Rechtschreibung und Stil dieses Textes korrigieren',
  tone: 'Ton ändern',
  toneGoal: 'Diesen Text in einem anderen Ton neu schreiben',
  summarize: 'Zusammenfassen',
  summarizeGoal: 'Diesen Text in Kernaussagen zusammenfassen',
  translate: 'Übersetzen',
  translateGoal: 'Diesen Text übersetzen',
  words_one: '{{contador}} Wort',
  words_other: '{{contador}} Wörter',
  savedInDocuments: ' · in Meine Dokumente gespeichert',
  couldNotSaveToDocuments: 'Konnte nicht in Meine Dokumente gespeichert werden',
  myDocuments: 'Meine Dokumente',
  newDocument: 'Neues Dokument',
  noDocumentsYet: 'Du hast noch keine Dokumente. Schreib ein neues oder bitte Weë, für dich anzufangen.',
  editedWhen: 'Bearbeitet {{cuando}}',
  titleLabel: 'Titel des Dokuments',
  bodyLabel: 'Text des Dokuments',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Titel des Dokuments',
  bodyPlaceholder: 'Schreib hier. Wann immer du willst, bitte Weë, ihn zu verbessern, zu korrigieren oder zu übersetzen.',
  resultHint: 'Weë arbeitet an dem, was du geschrieben hast, und gibt dir das Ergebnis hier zurück – bereit zum Weiterschreiben.',
  weeWorksWithYou: 'Weë arbeitet mit dir daran.',
};
