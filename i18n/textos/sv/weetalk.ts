/*
 * SUECO — WeeTalk: la bandeja, la conversación y sus avisos. El nombre es marca; los mensajes los
 * escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk no se declina: «i WeeTalk», «via WeeTalk». Una conversación es «konversation» y el
 * chat, «chatten». El modo efímero es «Försvinnande meddelanden», el nombre que el sueco ya
 * conoce para los mensajes que desaparecen; sale también como vista previa en la bandeja, y su
 * banner (`ephemeralOn`, una línea de 11 puntos) va en estilo telegráfico para caber. La foto
 * única es «Engångsfoto» y su interruptor, «Visa en gång». Dentro de WeeTalk las imágenes son
 * fotos del teléfono, así que la vista previa dice «📷 Foto»; la nota de voz, «🎤 Röstmeddelande».
 * `photo` es la etiqueta del botón de la cámara: «Ta foto». `theme` es «Färgtema»: el selector
 * enseña colores, y «Tema» a secas se escribiría igual que en español. `areYouSure` es el cuerpo
 * del aviso de borrar una conversación, cuyo título ya dice qué se borra. `noConversationsHint`
 * cita en español un botón «Privado» que no existe en ninguna pantalla; aquí cita el que sí
 * existe en el menú de la publicación, «Skicka via WeeTalk» (`wall.sendByWeeTalk`, con las mismas
 * letras), que abre la conversación con quien la publicó. Los permisos los pide Weë, de sujeto.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Skriv ett meddelande…',
  send: 'Skicka',
  empty: 'Inga konversationer ännu',
  emptyHint: 'Öppna en profil och skicka ett meddelande',
  loadFailed: 'Det gick inte att ladda dina konversationer',
  sendFailed: 'Det gick inte att skicka meddelandet',
  attach: 'Bifoga',
  photo: 'Ta foto',
  search: 'Sök konversationer',
  noConversations: 'Inga konversationer',
  deleteConversation: 'Ta bort konversation',
  areYouSure: 'Är du säker?',
  messagePlaceholderShort: 'Meddelande…',
  firstMessage: 'Skicka det första meddelandet',
  photoSeen: 'Foto visat',
  photoOnce: 'Engångsfoto',
  photoOpened: 'Öppnat',
  tapToView: 'Tryck för att visa',
  tapToClose: 'Tryck för att stänga',
  theme: 'Färgtema',
  background: 'Bakgrund',
  permissions: 'Behörigheter',
  photoPermission: 'Weë behöver åtkomst till dina foton',
  audioPermission: 'Weë behöver åtkomst till mikrofonen för att spela in ljud',
  imageFailed: 'Det gick inte att skicka bilden',
  noConversationsHint: 'Tryck på ”Skicka via WeeTalk” i menyn på ett inlägg om du vill starta en anonym konversation',
  ephemeralMode: 'Försvinnande meddelanden',
  noMessagesYet: 'Inga meddelanden ännu',
  youSaid: 'Du: {{mensaje}}',
  conversationStart: 'Här börjar din privata konversation',
  beRespectful: 'Kom ihåg att visa respekt och värna om integriteten 🤝',
  anonymousUser: 'Anonym användare',
  ephemeralOn: 'Försvinnande meddelanden på · Raderas när du lämnar chatten',
  cameraNeeded: 'Weë behöver åtkomst till kameran',
  allow: 'Tillåt',
  recordAudio: 'Spela in ljud',
  viewOnceOn: 'Visa en gång',
  keepInChat: 'Behåll i chatten',
  themeClassic: 'Klassisk',
  themeMidnight: 'Midnatt',
  themeForest: 'Skog',
  themeSunset: 'Solnedgång',
  themeOcean: 'Hav',
  themePurple: 'Lila',
  imagePreview: '📷 Foto',
  audioPreview: '🎤 Röstmeddelande',
  today: 'I dag',
};
