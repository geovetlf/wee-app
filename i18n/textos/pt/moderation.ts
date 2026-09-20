/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Portugués de BRASIL: «você», «denúncia», «golpe».
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Denunciar',
  subtitle: 'Conte para a gente o que está acontecendo com este conteúdo.',
  chooseReason: 'Selecione um motivo',
  send: 'Enviar denúncia',
  sending: 'Enviando denúncia…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Assédio ou intimidação',
  reasonHate: 'Ódio ou discriminação',
  reasonSexual: 'Conteúdo sexual',
  reasonViolence: 'Violência',
  reasonScam: 'Golpe ou fraude',
  reasonImpersonation: 'Falsidade de identidade',
  reasonIllegal: 'Conteúdo ilegal',
  reasonSelfHarm: 'Automutilação ou suicídio',
  reasonOther: 'Outro motivo',
  successTitle: 'Denúncia recebida',
  successBody: 'Obrigado por ajudar a manter o Weë seguro.',
  duplicateTitle: 'Você já tinha denunciado isto',
  duplicateBody: 'Já recebemos a sua denúncia sobre este conteúdo.',
  errorTitle: 'Não conseguimos enviar a sua denúncia.',
  errorBody: 'Tente novamente.',
  errorOffline: 'Sem conexão. Tente novamente.',
  errorRateLimited: 'Você enviou muitas denúncias seguidas. Tente mais tarde.',
  errorUnavailable: 'Este conteúdo não está mais disponível.',
};
