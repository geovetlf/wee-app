/*
 * WeeTalk. El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * `noConversationsHint` cita el botón que abre una conversación desde el menú de una publicación: entra por hueco,
 * `{{boton}}` = `wall.sendByWeeTalk`, para que la pista nunca vuelva a nombrar un botón que no existe (decía
 * «Privado», que no está en ninguna pantalla). La conversación sale con la cara activa, así que es «privada» —como
 * `conversationStart`—, no «anónima».
 */
export const weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Escribe un mensaje…',
  send: 'Enviar',
  empty: 'Todavía no tienes conversaciones',
  emptyHint: 'Escríbele a alguien desde su perfil',
  loadFailed: 'No se pudieron cargar tus conversaciones',
  sendFailed: 'No se pudo enviar el mensaje',
  attach: 'Adjuntar',
  photo: 'Foto',
  search: 'Buscar...',
  noConversations: 'Sin conversaciones',
  deleteConversation: 'Eliminar conversación',
  areYouSure: '¿Estás seguro?',
  messagePlaceholderShort: 'Mensaje...',
  firstMessage: 'Envía el primer mensaje',
  photoSeen: 'Foto vista',
  photoOnce: 'Foto única',
  photoOpened: 'Abierta',
  tapToView: 'Toca para ver',
  tapToClose: 'Toca para cerrar',
  theme: 'Tema',
  background: 'Fondo',
  permissions: 'Permisos',
  photoPermission: 'Se necesitan permisos para acceder a fotos',
  audioPermission: 'Se necesitan permisos para grabar audio',
  imageFailed: 'No se pudo enviar la imagen',
  noConversationsHint: 'Abre el menú de cualquier publicación y toca "{{boton}}" para iniciar una conversación privada',
  ephemeralMode: 'Modo efímero',
  noMessagesYet: 'No hay mensajes aún',
  youSaid: 'Tú: {{mensaje}}',
  conversationStart: 'Este es el inicio de tu conversación privada',
  beRespectful: 'Recuerda mantener el respeto y la privacidad 🤝',
  anonymousUser: 'Usuario anónimo',
  ephemeralOn: 'Modo efímero activado · Los mensajes se borran al salir',
  cameraNeeded: 'Se necesita acceso a la cámara',
  allow: 'Permitir',
  recordAudio: 'Grabar audio',
  viewOnceOn: 'Ver una sola vez',
  keepInChat: 'Conservar en el chat',
  themeClassic: 'Clásico',
  themeMidnight: 'Medianoche',
  themeForest: 'Bosque',
  themeSunset: 'Atardecer',
  themeOcean: 'Océano',
  themePurple: 'Púrpura',
  imagePreview: '📷 Imagen',
  audioPreview: '🎤 Audio',
  today: 'Hoy',
};
