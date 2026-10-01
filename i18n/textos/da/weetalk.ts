/*
 * DANÉS — WeeTalk: la bandeja, la conversación y sus avisos. El nombre es marca; los mensajes los
 * escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk no se declina: «i WeeTalk», «chatten i Weë». Una conversación es «samtale» y el chat,
 * «chatten». Las palabras de este módulo son las del glosario (9.6): el modo efímero es
 * «Forsvindende beskeder» —sale también como vista previa en la bandeja, y su banner
 * (`ephemeralOn`, una línea de 11 puntos) va en estilo telegráfico para caber—, «Vis én gang»,
 * «Vedhæft», «talebesked» y «Farvetema» (`theme`: el selector enseña colores, y «Tema» a secas se
 * escribiría igual que en español). La foto única es «Engangsfoto» y, ya vista, «Åbnet» (neutro,
 * concuerda con «foto»). Dentro de WeeTalk las imágenes son fotos del teléfono, así que la vista
 * previa dice «📷 Foto»; la nota de voz, «🎤 Talebesked». `photo` es la etiqueta del botón de la
 * cámara: «Tag foto». `youSaid` es «Du:»: el rótulo de quién habla va en sujeto («Dig:» es el registro de los memes).
 * `areYouSure` es el cuerpo del aviso de borrar una conversación, cuyo título ya dice qué se
 * borra. `noConversationsHint` cita en español un botón «Privado» que no existe en ninguna
 * pantalla; aquí cita el que sí existe en el menú de la publicación, «Send i WeeTalk»
 * (`wall.sendByWeeTalk`, con las mismas letras), que abre la conversación con quien la publicó.
 * Los permisos los pide Weë, de sujeto. Los errores son frases completas con punto y el paso
 * siguiente («Prøv igen.»).
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Skriv en besked…',
  send: 'Send',
  empty: 'Ingen samtaler endnu',
  emptyHint: 'Åbn en profil, og skriv en besked',
  loadFailed: 'Dine samtaler kunne ikke indlæses. Prøv igen.',
  sendFailed: 'Beskeden kunne ikke sendes. Prøv igen.',
  attach: 'Vedhæft',
  photo: 'Tag foto',
  search: 'Søg i samtaler',
  noConversations: 'Ingen samtaler',
  deleteConversation: 'Slet samtale',
  areYouSure: 'Er du sikker?',
  messagePlaceholderShort: 'Besked…',
  firstMessage: 'Send den første besked',
  photoSeen: 'Foto set',
  photoOnce: 'Engangsfoto',
  photoOpened: 'Åbnet',
  tapToView: 'Tryk for at se',
  tapToClose: 'Tryk for at lukke',
  theme: 'Farvetema',
  background: 'Baggrund',
  permissions: 'Tilladelser',
  photoPermission: 'Weë skal have adgang til dine fotos.',
  audioPermission: 'Weë skal have adgang til mikrofonen for at optage lyd.',
  imageFailed: 'Billedet kunne ikke sendes. Prøv igen.',
  noConversationsHint: 'Tryk på ”Send i WeeTalk” i menuen på et opslag for at starte en anonym samtale',
  ephemeralMode: 'Forsvindende beskeder',
  noMessagesYet: 'Ingen beskeder endnu',
  youSaid: 'Du: {{mensaje}}',
  conversationStart: 'Her starter din private samtale',
  beRespectful: 'Husk at vise respekt og passe på hinandens privatliv 🤝',
  anonymousUser: 'Anonym bruger',
  ephemeralOn: 'Forsvindende beskeder slået til · Slettes, når du forlader chatten',
  cameraNeeded: 'Weë skal have adgang til kameraet.',
  allow: 'Tillad',
  recordAudio: 'Optag lyd',
  viewOnceOn: 'Vis én gang',
  keepInChat: 'Behold i chatten',
  themeClassic: 'Klassisk',
  themeMidnight: 'Midnat',
  themeForest: 'Skov',
  themeSunset: 'Solnedgang',
  themeOcean: 'Hav',
  themePurple: 'Lilla',
  imagePreview: '📷 Foto',
  audioPreview: '🎤 Talebesked',
  today: 'I dag',
};
