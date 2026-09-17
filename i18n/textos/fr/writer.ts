/*
 * FRANCÉS — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Demander à Weë',
  writeSomethingFirst: 'Écris quelque chose d’abord',
  writeSomethingHint: 'Écris quelque chose d’abord et Weë le travaille avec toi.',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  deleteDocument: 'Supprimer le document',
  improve: 'Améliorer',
  improveGoal: 'Améliorer ce texte',
  shorten: 'Raccourcir',
  shortenGoal: 'Raccourcir ce texte sans perdre l’essentiel',
  expand: 'Développer',
  expandGoal: 'Développer davantage ce texte',
  fix: 'Corriger',
  fixGoal: 'Corriger l’orthographe et le style de ce texte',
  tone: 'Changer de ton',
  toneGoal: 'Réécrire ce texte sur un autre ton',
  summarize: 'Résumer',
  summarizeGoal: 'Résumer ce texte en idées clés',
  translate: 'Traduire',
  translateGoal: 'Traduire ce texte',
  words_one: '{{contador}} mot',
  words_other: '{{contador}} mots',
  savedInDocuments: ' · enregistré dans Mes documents',
  couldNotSaveToDocuments: 'Impossible d’enregistrer dans Mes documents',
  myDocuments: 'Mes documents',
  newDocument: 'Nouveau document',
  noDocumentsYet: 'Tu n’as encore aucun document. Écris-en un nouveau ou demande à Weë de commencer pour toi.',
  editedWhen: 'Modifié {{cuando}}',
  titleLabel: 'Titre du document',
  bodyLabel: 'Texte du document',
  editorTitle: '✍️ Éditeur',
  docTitlePlaceholder: 'Titre du document',
  bodyPlaceholder: 'Écris ici. Quand tu veux, demande à Weë de l’améliorer, de le corriger ou de le traduire.',
  resultHint: 'Weë travaille sur ce que tu as écrit et te rend le résultat ici, prêt à être retravaillé.',
  weeWorksWithYou: 'Weë le travaille avec toi.',
};
