/*
 * FRANCÉS — WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). "Thème" es el diseño de un chat y el modo efímero
 * se dice "Mode éphémère". Apóstrofo tipográfico ’ y espacio antes de : ? !
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Écris un message…',
  send: 'Envoyer',
  empty: 'Pas encore de conversations',
  emptyHint: 'Écris à quelqu’un depuis son profil',
  loadFailed: 'Tes conversations n’ont pas pu être chargées',
  sendFailed: 'Le message n’a pas pu être envoyé',
  attach: 'Joindre',
  photo: 'Photo',
  search: 'Rechercher...',
  noConversations: 'Aucune conversation',
  deleteConversation: 'Supprimer la conversation',
  areYouSure: 'Tu es sûr ?',
  messagePlaceholderShort: 'Message...',
  firstMessage: 'Envoie le premier message',
  photoSeen: 'Photo vue',
  photoOnce: 'Photo unique',
  photoOpened: 'Ouverte',
  tapToView: 'Appuie pour voir',
  tapToClose: 'Appuie pour fermer',
  theme: 'Thème',
  background: 'Fond',
  permissions: 'Autorisations',
  photoPermission: 'Une autorisation est nécessaire pour accéder aux photos',
  audioPermission: 'Une autorisation est nécessaire pour enregistrer de l’audio',
  imageFailed: 'L’image n’a pas pu être envoyée',
  noConversationsHint: 'Appuie sur "Privé" dans une publication pour démarrer une conversation anonyme',
  ephemeralMode: 'Mode éphémère',
  noMessagesYet: 'Pas encore de messages',
  youSaid: 'Toi : {{mensaje}}',
  conversationStart: 'C’est le début de votre conversation privée',
  beRespectful: 'Pense à rester respectueux et à préserver la vie privée 🤝',
  anonymousUser: 'Utilisateur anonyme',
  ephemeralOn: 'Mode éphémère activé · Les messages s’effacent en quittant',
  cameraNeeded: 'L’accès à l’appareil photo est nécessaire',
  allow: 'Autoriser',
};
