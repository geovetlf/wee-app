/*
 * PORTUGUÉS DE PORTUGAL — Weë Writer, dentro de Weë Studio. El texto que
 * escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NO ES EL BRASILEÑO CON PALABRAS CAMBIADAS. Se tutea con «tu» —«Pede a Weë»,
 * «Escreve», «Ainda não tens documentos», «Quando quiseres»—, guardar es
 * GUARDAR (no salvar) y eliminar es ELIMINAR (no excluir). El «Salvando…» de
 * Brasil es aquí «A guardar…»: el progresivo europeo es `a` + infinitivo, no
 * gerundio. El pronombre va donde va en Portugal: «devolve-te o resultado»
 * detrás del verbo, «que o melhore, o corrija ou o traduza» delante, porque la
 * subordinada lo atrae. Y «para continuares a editar» es infinitivo personal,
 * que allí es lo normal y en Brasil no se usa.
 *
 * `words` ES LA ÚNICA CLAVE CON CANTIDAD, Y AQUÍ EL CERO NO ES COMO EN BRASIL.
 * `Intl.PluralRules('pt-PT')` mete el 0 en `other` —«0 palavras»—, mientras que
 * `Intl.PluralRules('pt')`, el brasileño, lo mete en `one` —«0 palavra»—. Las
 * dos formas llevan {{contador}} y ninguna escribe un «1» a pelo, así que cada
 * norma dice lo suyo sin que haya que tocar nada. No hay `_few` ni `_many`, que
 * son cosa del ruso.
 *
 * «Mis documentos» es aquí «Os meus documentos», con artículo, como se dice en
 * Portugal. Cuando la frase lo nombra de pasada —`savedInDocuments`,
 * `couldNotSaveToDocuments`— se contrae a «nos meus documentos», que es lo que
 * pide la preposición; «em Os meus documentos» no se escribe en portugués.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Pede ao Weë',
  writeSomethingFirst: 'Escreve algo primeiro',
  writeSomethingHint: 'Escreve algo primeiro e Weë trabalha nisso contigo.',
  save: 'Guardar',
  saving: 'A guardar…',
  deleteDocument: 'Eliminar documento',
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
  savedInDocuments: ' · guardado nos meus documentos',
  couldNotSaveToDocuments: 'Não foi possível guardar nos meus documentos',
  myDocuments: 'Os meus documentos',
  newDocument: 'Novo documento',
  noDocumentsYet: 'Ainda não tens documentos. Escreve um novo ou pede ao Weë que comece por ti.',
  editedWhen: 'Editado {{cuando}}',
  titleLabel: 'Título do documento',
  bodyLabel: 'Texto do documento',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Título do documento',
  bodyPlaceholder: 'Escreve aqui. Quando quiseres, pede ao Weë que o melhore, o corrija ou o traduza.',
  resultHint: 'Weë trabalha sobre o que escreveste e devolve-te o resultado aqui, pronto para continuares a editar.',
  weeWorksWithYou: 'Weë trabalha nisso contigo.',
  saved: '✓ Guardado',
};
