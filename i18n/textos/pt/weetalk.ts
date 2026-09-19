/*
 * PORTUGUÉS (pt-BR) — WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). El mensaje de la otra persona llega por
 * `{{mensaje}}` y sale sin tocar. El emoji 🤝 se copia tal cual y "Privado"
 * es el botón del Wäll, citado con las mismas palabras. Apóstrofo tipográfico ’
 * siempre.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Escreva uma mensagem…',
  send: 'Enviar',
  empty: 'Você ainda não tem conversas',
  emptyHint: 'Escreva para alguém pelo perfil da pessoa',
  loadFailed: 'Não foi possível carregar suas conversas',
  sendFailed: 'Não foi possível enviar a mensagem',
  attach: 'Anexar',
  photo: 'Foto',
  search: 'Buscar...',
  noConversations: 'Sem conversas',
  deleteConversation: 'Excluir conversa',
  areYouSure: 'Tem certeza?',
  messagePlaceholderShort: 'Mensagem...',
  firstMessage: 'Envie a primeira mensagem',
  photoSeen: 'Foto vista',
  photoOnce: 'Foto única',
  photoOpened: 'Aberta',
  tapToView: 'Toque para ver',
  tapToClose: 'Toque para fechar',
  theme: 'Tema',
  background: 'Fundo',
  permissions: 'Permissões',
  photoPermission: 'É preciso dar permissão para acessar as fotos',
  audioPermission: 'É preciso dar permissão para gravar áudio',
  imageFailed: 'Não foi possível enviar a imagem',
  noConversationsHint: 'Toque em "Privado" em qualquer publicação para iniciar uma conversa anônima',
  ephemeralMode: 'Modo efêmero',
  noMessagesYet: 'Ainda não há mensagens',
  youSaid: 'Você: {{mensaje}}',
  conversationStart: 'Este é o começo da sua conversa privada',
  beRespectful: 'Lembre-se de manter o respeito e a privacidade 🤝',
  anonymousUser: 'Usuário anônimo',
  ephemeralOn: 'Modo efêmero ativado · As mensagens são apagadas ao sair',
  cameraNeeded: 'É preciso dar acesso à câmera',
  allow: 'Permitir',
};
