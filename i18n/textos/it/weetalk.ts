/*
 * ITALIANO — WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). "Tema" es el diseño de un chat y el modo efímero
 * se dice "Modalità effimera". El emoji 🤝 se copia tal cual y el apóstrofo es
 * siempre el tipográfico ’: l’immagine, l’inizio, l’accesso.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Scrivi un messaggio…',
  send: 'Invia',
  empty: 'Non hai ancora conversazioni',
  emptyHint: 'Scrivi a qualcuno dal suo profilo',
  loadFailed: 'Non è stato possibile caricare le tue conversazioni',
  sendFailed: 'Non è stato possibile inviare il messaggio',
  attach: 'Allega',
  photo: 'Foto',
  search: 'Cerca...',
  noConversations: 'Nessuna conversazione',
  deleteConversation: 'Elimina conversazione',
  areYouSure: 'Sei sicuro?',
  messagePlaceholderShort: 'Messaggio...',
  firstMessage: 'Invia il primo messaggio',
  photoSeen: 'Foto vista',
  tapToView: 'Tocca per vedere',
  tapToClose: 'Tocca per chiudere',
  theme: 'Tema',
  background: 'Sfondo',
  permissions: 'Autorizzazioni',
  photoPermission: 'Serve un’autorizzazione per accedere alle foto',
  audioPermission: 'Serve un’autorizzazione per registrare l’audio',
  imageFailed: 'Non è stato possibile inviare l’immagine',
  noConversationsHint: 'Tocca "Privato" in un post qualsiasi per iniziare una conversazione anonima',
  ephemeralMode: 'Modalità effimera',
  noMessagesYet: 'Non ci sono ancora messaggi',
  youSaid: 'Tu: {{mensaje}}',
  conversationStart: 'Questo è l’inizio della vostra conversazione privata',
  beRespectful: 'Ricordati di mantenere il rispetto e la privacy 🤝',
  anonymousUser: 'Utente anonimo',
  ephemeralOn: 'Modalità effimera attiva · I messaggi si cancellano quando esci',
  cameraNeeded: 'Serve l’accesso alla fotocamera',
  allow: 'Consenti',
};
