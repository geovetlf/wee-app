/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — el Wäll: la publicación y todo lo que se puede
 * hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS. Lo que separa a las dos normas en
 * esta pantalla es GRAMATICAL antes que léxico:
 *
 *   ESTAR A + INFINITIVO, nunca el gerundio: "A carregar os posts..." y no
 *   "Carregando os posts...", "A preparar a imagem..." y no "Preparando".
 *   TRATO DE "TU", nunca "você": "Votaste", "Tens a certeza", "o teu voto".
 *   ENCLISIS: "analisá-la", y el clítico delante del infinitivo —"para o
 *   copiar"— donde Brasil escribe "para copiar".
 *   PRETÉRITO CON ACENTO: "Não encontrámos", que en Brasil se escribe sin él.
 *   "JÁ NÃO" donde Brasil dice "não... mais": "já não aceita votos".
 *
 * Y el vocabulario, término a término:
 *
 *   guardar (no salvar) · Guardados (no Salvos) · eliminar (no excluir)
 *   partilhar (no compartilhar) · sondagem (no enquete) · registar (no registrar)
 *   premido (no pressionado) · alterações (no mudanças) · anónima (no anônima)
 *   "Porque queres...?" en pregunta directa, que Brasil escribe "Por que"
 *   "Toda a grande conversa", con el artículo que Portugal no se salta
 *
 * MARCA: Weë, Wäll, Weëls y WeeTalk no se traducen. "Spam", "post" y "repost"
 * tampoco: es la palabra que usa la gente también de este lado.
 *
 * EL CERO CAE AL REVÉS QUE EN BRASIL. `Intl.PluralRules('pt-PT')` deja el 0 en
 * `other` —«0 votos»—, y en `pt-BR` cae en `one` —«0 voto»—. Las claves usan
 * {{contador}} en las dos formas, así que sale bien sin nada especial.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} republicou',
  repost: 'Republicar',
  undoRepost: 'Remover republicação',
  undoRepostConfirm: 'Remover a republicação',
  sendByWeeTalk: 'Enviar pelo WeeTalk',
  save: 'Guardar',
  unsave: 'Remover dos Guardados',
  deletePost: 'Eliminar post',
  deletePostConfirm: 'Tens a certeza de que queres eliminar este post?',
  deletePostFailed: 'Não foi possível eliminar o post. Tenta novamente.',
  sharePost: 'Partilhar publicação',
  shareFailed: 'Não foi possível partilhar a publicação. Tenta novamente.',
  preparingImage: 'A preparar a imagem...',
  publishedOnWee: 'Publicado no Weë',
  viewInWeels: 'Ver em Weëls',
  moreImages: 'e mais {{contador}}',
  comment: 'Comentar',
  viewFullVideoInWeels: 'Ver o vídeo completo em Weëls',
  pollNoVotesYet: 'Ainda sem votos',
  pollVotes_one: '{{contador}} voto',
  pollVotes_other: '{{contador}} votos',
  pollVoted: 'Votaste',
  pollClosed: 'Sondagem terminada',
  pollDaysLeft_one: '{{contador}} dia restante',
  pollDaysLeft_other: '{{contador}} dias restantes',
  pollHoursLeft_one: '{{contador}} hora restante',
  pollHoursLeft_other: '{{contador}} horas restantes',
  pollLessThanAnHour: 'Menos de 1 hora',
  pollLegacy: 'Esta sondagem é de uma versão anterior do Weë e já não aceita votos.',
  pollVoteFailed: 'Não foi possível registar o teu voto',
  closeComments: 'Fechar os comentários',
  removeImage: 'Remover a imagem',
  attachImage: 'Anexar uma imagem',
  sendComment: 'Enviar comentário',
  onePost: 'Publicação',
  loadingComments: 'A carregar os comentários...',
  beFirstToComment: 'Sê o primeiro a comentar',
  commentPlaceholder: 'Escreve um comentário...',
  postNotFound: 'Não encontrámos esta publicação',
  loadingPosts: 'A carregar os posts...',
  loadingMorePosts: 'A carregar mais posts...',
  retry: 'Tentar novamente',
  howIMadeIt: 'COMO EU FIZ',
  madeWith: 'Criado com',
  holdToCopy: 'Mantém o texto premido para o copiar',
  process: 'Processo:',
  comments: 'Comentários',
  firstCommentHint: 'Toda a grande conversa começa com uma ideia.',
  loadingPost: 'A carregar o post...',
  useInEditor: 'Usar no editor',
  edit: 'Editar',
  publishToCommunity: 'Publicar na minha comunidade',
  changesAndPurchases: 'Lista de alterações e compras',
  shareAnonymously: 'Opina de forma anónima no Weë',
  statViews: 'visualizações',
  statAgree: 'concordam',
  statComments: 'comentários',
  commentImageFailed: 'Não foi possível carregar a imagem. Tenta novamente.',
  commentSendFailed: 'Não foi possível enviar o comentário. Tenta novamente.',
  shareText: '{{contenido}}\n\nCriado no Weë · World Encode Entity',
  shareTextEmpty: 'Vê esta publicação no Weë',
  commentsWithCount: 'Comentários ({{total}})',
  agreeWithComment: 'Concordar com este comentário',
  disagreeWithComment: 'Discordar deste comentário',
  showPrompt: 'Ver prompt',
  hidePrompt: 'Ocultar prompt',
  copyPrompt: 'Copiar prompt',
  promptCopied: 'Copiado',
};
