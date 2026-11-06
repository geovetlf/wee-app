/*
 * CATALÁN — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Botones en imperativo («Millora», «Escurça»); las metas (`*Goal`) en infinitivo, como el español.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Demana-ho a Weë',
  writeSomethingFirst: 'Escriu alguna cosa primer',
  writeSomethingHint: 'Escriu alguna cosa primer i Weë ho treballa amb tu.',
  save: 'Desa',
  saving: 'S\'està desant…',
  deleteDocument: 'Elimina el document',
  improve: 'Millora',
  improveGoal: 'Millorar aquest text',
  shorten: 'Escurça',
  shortenGoal: 'Escurçar aquest text sense perdre l\'important',
  expand: 'Allarga',
  expandGoal: 'Desenvolupar més aquest text',
  fix: 'Corregeix',
  fixGoal: 'Corregir l\'ortografia i l\'estil d\'aquest text',
  tone: 'Canvia el to',
  toneGoal: 'Reescriure aquest text amb un altre to',
  summarize: 'Resumeix',
  summarizeGoal: 'Resumir aquest text en idees clau',
  translate: 'Tradueix',
  translateGoal: 'Traduir aquest text',
  words_one: '{{contador}} paraula',
  words_other: '{{contador}} paraules',
  savedInDocuments: ' · desat a «Els meus documents»',
  couldNotSaveToDocuments: 'No s\'ha pogut desar a «Els meus documents»',
  myDocuments: 'Els meus documents',
  newDocument: 'Document nou',
  noDocumentsYet: 'Encara no tens documents. Escriu-ne un de nou o demana a Weë que comenci per tu.',
  editedWhen: 'Editat {{cuando}}',
  titleLabel: 'Títol del document',
  bodyLabel: 'Text del document',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Títol del document',
  bodyPlaceholder: 'Escriu aquí. Quan vulguis, demana a Weë que ho millori, ho corregeixi o ho tradueixi.',
  resultHint: 'Weë treballa sobre el que has escrit i et retorna el resultat aquí, a punt per continuar editant.',
  weeWorksWithYou: 'Weë ho treballa amb tu.',
  saved: '✓ Desat',
};
