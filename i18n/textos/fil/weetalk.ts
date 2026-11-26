/*
 * FILIPINO — WeeTalk: la bandeja, la conversación y sus avisos. El nombre es marca; los mensajes los escribe la
 * gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk no lleva nada pegado (§ 6). Una conversación es «chat» y un mensaje, «mensahe» (glosario § 11.3): «Wala
 * ka pang chat», «Ipadala ang unang mensahe». Enviar es «Ipadala», adjuntar «I-attach», grabar «Mag-record» y
 * permitir «Payagan» (§ 11.2). La nota de voz es «Voice message» (§ 11.3) y la foto, «larawan». `photo` es la
 * etiqueta del botón de la cámara: «Kumuha ng larawan» (§ 11.2).
 *
 * El modo efímero es «Mga naglalahong mensahe» —sale también como vista previa en la bandeja—; «nawawala» se
 * descarta porque también es «perdido». La foto única es «Larawang isang beses lang makikita» y su interruptor,
 * «Isang beses lang makikita»; quien la envía ve después «Nabuksan na» y quien la recibe, «Natingnan na ang
 * larawan». «Conservar en el chat» es «Panatilihin sa chat» («Itago» es «ocultar» en el glosario). `theme` es «Tema
 * ng chat», el título del selector de colores. `today` es el separador de fecha, «Ngayong araw».
 *
 * `youSaid` es «Ikaw: {{mensaje}}», el rótulo de quién habla en la bandeja. `areYouSure` es el cuerpo del aviso de
 * borrar una conversación, cuyo título ya dice qué se borra; como se pierde para siempre, lo dice (§ 2): «Sigurado
 * ka ba? Hindi na ito maibabalik.». `noConversationsHint` sigue al español corregido el 2026-11-05: cita la opción real
 * del menú ⋮, «Ipadala sa WeeTalk» (`wall.sendByWeeTalk`, con las mismas letras); el «Privado» de antes no existía. Los permisos del español no nombran a Weë y aquí tampoco. Los errores son frases
 * completas con punto y el paso siguiente, «Subukan ulit.».
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Magsulat ng mensahe…',
  send: 'Ipadala',
  empty: 'Wala ka pang chat',
  emptyHint: 'Padalhan ng mensahe ang isang tao mula sa profile niya',
  loadFailed: 'Hindi ma-load ang mga chat mo. Subukan ulit.',
  sendFailed: 'Hindi maipadala ang mensahe. Subukan ulit.',
  attach: 'I-attach',
  photo: 'Kumuha ng larawan',
  search: 'Maghanap…',
  noConversations: 'Walang chat',
  deleteConversation: 'I-delete ang chat',
  areYouSure: 'Sigurado ka ba? Hindi na ito maibabalik.',
  messagePlaceholderShort: 'Mensahe…',
  firstMessage: 'Ipadala ang unang mensahe',
  photoSeen: 'Natingnan na ang larawan',
  photoOnce: 'Larawang isang beses lang makikita',
  photoOpened: 'Nabuksan na',
  tapToView: 'I-tap para tingnan',
  tapToClose: 'I-tap para isara',
  theme: 'Tema ng chat',
  background: 'Background',
  permissions: 'Mga pahintulot',
  photoPermission: 'Kailangan ng pahintulot para ma-access ang mga larawan mo.',
  audioPermission: 'Kailangan ng pahintulot sa mikropono para makapag-record ng audio.',
  imageFailed: 'Hindi maipadala ang larawan. Subukan ulit.',
  noConversationsHint: 'Buksan ang menu na ⋮ ng kahit anong post at piliin ang “Ipadala sa WeeTalk” para magsimula ng pribadong chat',
  ephemeralMode: 'Mga naglalahong mensahe',
  noMessagesYet: 'Wala pang mensahe',
  youSaid: 'Ikaw: {{mensaje}}',
  conversationStart: 'Dito nagsisimula ang pribadong chat mo',
  beRespectful: 'Tandaang maging magalang at ingatan ang privacy ng isa’t isa 🤝',
  anonymousUser: 'Anonymous na user',
  ephemeralOn: 'Naka-on ang mga naglalahong mensahe · Ide-delete ang mga ito paglabas mo',
  cameraNeeded: 'Kailangan ng access sa camera.',
  allow: 'Payagan',
  recordAudio: 'Mag-record ng audio',
  viewOnceOn: 'Isang beses lang makikita',
  keepInChat: 'Panatilihin sa chat',
  themeClassic: 'Klasiko',
  themeMidnight: 'Hatinggabi',
  themeForest: 'Gubat',
  themeSunset: 'Paglubog ng araw',
  themeOcean: 'Karagatan',
  themePurple: 'Lila',
  imagePreview: '📷 Larawan',
  audioPreview: '🎤 Voice message',
  today: 'Ngayong araw',
};
