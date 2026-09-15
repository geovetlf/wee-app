/*
 * WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Write a message…',
  send: 'Send',
  empty: 'No conversations yet',
  emptyHint: 'Message someone from their profile',
  loadFailed: 'Your conversations could not be loaded',
  sendFailed: 'The message could not be sent',
  attach: 'Attach',
  photo: 'Photo',
  search: 'Search...',
  noConversations: 'No conversations',
  deleteConversation: 'Delete conversation',
  areYouSure: 'Are you sure?',
  messagePlaceholderShort: 'Message...',
  firstMessage: 'Send the first message',
  photoSeen: 'Photo seen',
  tapToView: 'Tap to view',
  tapToClose: 'Tap to close',
  theme: 'Theme',
  background: 'Background',
  permissions: 'Permissions',
  photoPermission: 'Photo access permission is required',
  audioPermission: 'Microphone permission is required',
  imageFailed: 'The image could not be sent',
  noConversationsHint: 'Tap "Private" on any post to start an anonymous conversation',
  ephemeralMode: 'Ephemeral mode',
  noMessagesYet: 'No messages yet',
  youSaid: 'You: {{mensaje}}',
  conversationStart: 'This is the start of your private conversation',
  beRespectful: 'Remember to be respectful and keep things private 🤝',
  anonymousUser: 'Anonymous user',
  ephemeralOn: 'Ephemeral mode on · Messages are deleted when you leave',
  cameraNeeded: 'Camera access is needed',
  allow: 'Allow',
};
