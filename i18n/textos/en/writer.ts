/*
 * Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Ask Weë',
  writeSomethingFirst: 'Write something first',
  writeSomethingHint: 'Write something first and Weë will work on it with you.',
  save: 'Save',
  saving: 'Saving…',
  deleteDocument: 'Delete document',
  improve: 'Improve',
  improveGoal: 'Improve this text',
  shorten: 'Shorten',
  shortenGoal: 'Shorten this text without losing what matters',
  expand: 'Expand',
  expandGoal: 'Develop this text further',
  fix: 'Fix',
  fixGoal: 'Fix the spelling and style of this text',
  tone: 'Change tone',
  toneGoal: 'Rewrite this text in a different tone',
  summarize: 'Summarize',
  summarizeGoal: 'Summarize this text into key points',
  translate: 'Translate',
  translateGoal: 'Translate this text',
  words_one: '{{contador}} word',
  words_other: '{{contador}} words',
  savedInDocuments: ' · saved in My documents',
  couldNotSaveToDocuments: 'It could not be saved to My documents',
  myDocuments: 'My documents',
  newDocument: 'New document',
  noDocumentsYet: 'You don’t have any documents yet. Write a new one or ask Weë to start for you.',
  editedWhen: 'Edited {{cuando}}',
};
