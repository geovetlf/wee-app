/*
 * PORTUGUÉS — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Peça a Weë',
  writeSomethingFirst: 'Escreva algo primeiro',
  writeSomethingHint: 'Escreva algo primeiro e Weë trabalha nisso com você.',
  save: 'Salvar',
  saving: 'Salvando…',
  deleteDocument: 'Excluir documento',
  improve: 'Melhorar',
  improveGoal: 'Melhorar este texto',
  shorten: 'Encurtar',
  shortenGoal: 'Encurtar este texto sem perder o que importa',
  expand: 'Expandir',
  expandGoal: 'Desenvolver mais este texto',
  fix: 'Corrigir',
  fixGoal: 'Corrigir a ortografia e o estilo deste texto',
  tone: 'Mudar o tom',
  toneGoal: 'Reescrever este texto com outro tom',
  summarize: 'Resumir',
  summarizeGoal: 'Resumir este texto em ideias-chave',
  translate: 'Traduzir',
  translateGoal: 'Traduzir este texto',
  words_one: '{{contador}} palavra',
  words_other: '{{contador}} palavras',
  savedInDocuments: ' · salvo em Meus documentos',
  couldNotSaveToDocuments: 'Não foi possível salvar em Meus documentos',
  myDocuments: 'Meus documentos',
  newDocument: 'Novo documento',
  noDocumentsYet: 'Você ainda não tem documentos. Escreva um novo ou peça a Weë que comece por você.',
  editedWhen: 'Editado {{cuando}}',
  titleLabel: 'Título do documento',
  bodyLabel: 'Texto do documento',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Título do documento',
  bodyPlaceholder: 'Escreva aqui. Quando quiser, peça a Weë que melhore, corrija ou traduza o texto.',
  resultHint: 'Weë trabalha no que você escreveu e devolve o resultado aqui, pronto para continuar editando.',
  weeWorksWithYou: 'Weë trabalha nisso com você.',
  saved: '✓ Salvo',
};
