/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Portugués de PORTUGAL: trato de «tu», «burla» y «ligação», no «golpe» ni «conexão».
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Denunciar',
  subtitle: 'Conta-nos o que se passa com este conteúdo.',
  chooseReason: 'Seleciona um motivo',
  send: 'Enviar denúncia',
  sending: 'A enviar denúncia…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Assédio ou intimidação',
  reasonHate: 'Ódio ou discriminação',
  reasonSexual: 'Conteúdo sexual',
  reasonViolence: 'Violência',
  reasonScam: 'Burla ou fraude',
  reasonImpersonation: 'Usurpação de identidade',
  reasonIllegal: 'Conteúdo ilegal',
  reasonSelfHarm: 'Automutilação ou suicídio',
  reasonOther: 'Outro motivo',
  successTitle: 'Denúncia recebida',
  successBody: 'Obrigado por ajudares a manter o Weë seguro.',
  duplicateTitle: 'Já tinhas denunciado isto',
  duplicateBody: 'Já recebemos a tua denúncia sobre este conteúdo.',
  errorTitle: 'Não conseguimos enviar a tua denúncia.',
  errorBody: 'Tenta novamente.',
  errorOffline: 'Sem ligação. Tenta novamente.',
  errorRateLimited: 'Enviaste muitas denúncias seguidas. Tenta mais tarde.',
  errorUnavailable: 'Este conteúdo já não está disponível.',
};
