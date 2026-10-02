/*
 * HINDI — WeeTalk: la bandeja, la conversación y sus avisos. El nombre es marca; los mensajes los
 * escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk va en latino y la posposición detrás («WeeTalk से भेजें»). Una conversación es «चैट» (f)
 * y un mensaje, «मैसेज» (m, invariable), como en WhatsApp (glosario § 11.2). El modo efímero es
 * «गायब होने वाले मैसेज», el nombre que el hindi ya conoce para los mensajes que desaparecen; sale
 * también como vista previa en la bandeja. La foto única es «एक बार देखने वाली फ़ोटो» y su
 * interruptor, «एक बार देखें», los dos de WhatsApp. Dentro de WeeTalk las imágenes son fotos del
 * teléfono, así que la vista previa dice «📷 फ़ोटो» y el aviso de error, «फ़ोटो»; la nota de voz,
 * «🎤 वॉइस मैसेज». `photo` es la etiqueta del botón de la cámara: «फ़ोटो लें». `areYouSure` es el
 * cuerpo del aviso de borrar una conversación, cuyo título ya dice qué se borra: «क्या आपको यकीन
 * है?», sin género. `noConversationsHint` cita en español un botón «Privado» que no existe en
 * ninguna pantalla; aquí cita el que sí existe en el menú de la publicación, «WeeTalk से भेजें»
 * (`wall.sendByWeeTalk`, con las mismas letras), que abre la conversación con quien la publicó.
 * Los permisos se piden sin sujeto («… अनुमति चाहिए»), y «acceder» es «ऐक्सेस करना», como en el
 * diálogo de permisos de Android. Los nombres de los temas son palabras corrientes.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'मैसेज लिखें…',
  send: 'भेजें',
  empty: 'अभी तक कोई चैट नहीं है',
  emptyHint: 'किसी की प्रोफ़ाइल पर जाकर उसे मैसेज भेजें',
  loadFailed: 'आपकी चैट लोड नहीं की जा सकीं',
  sendFailed: 'मैसेज नहीं भेजा जा सका',
  attach: 'अटैच करें',
  photo: 'फ़ोटो लें',
  search: 'चैट खोजें…',
  noConversations: 'कोई चैट नहीं',
  deleteConversation: 'चैट मिटाएँ',
  areYouSure: 'क्या आपको यकीन है?',
  messagePlaceholderShort: 'मैसेज…',
  firstMessage: 'पहला मैसेज भेजें',
  photoSeen: 'फ़ोटो देखी गई',
  photoOnce: 'एक बार देखने वाली फ़ोटो',
  photoOpened: 'खोली गई',
  tapToView: 'देखने के लिए टैप करें',
  tapToClose: 'बंद करने के लिए टैप करें',
  theme: 'चैट की थीम',
  background: 'बैकग्राउंड',
  permissions: 'अनुमतियाँ',
  photoPermission: 'आपकी फ़ोटो ऐक्सेस करने के लिए अनुमति चाहिए',
  audioPermission: 'ऑडियो रिकॉर्ड करने के लिए माइक्रोफ़ोन की अनुमति चाहिए',
  imageFailed: 'फ़ोटो नहीं भेजी जा सकी',
  noConversationsHint: 'गुमनाम चैट शुरू करने के लिए, किसी भी पोस्ट के मेन्यू में “WeeTalk से भेजें” पर टैप करें',
  ephemeralMode: 'गायब होने वाले मैसेज',
  noMessagesYet: 'अभी तक कोई मैसेज नहीं है',
  youSaid: 'आप: {{mensaje}}',
  conversationStart: 'आपकी निजी चैट यहाँ से शुरू होती है',
  beRespectful: 'सम्मान और निजता का ध्यान रखें 🤝',
  anonymousUser: 'गुमनाम यूज़र',
  ephemeralOn: 'गायब होने वाले मैसेज चालू · चैट छोड़ने पर मैसेज मिट जाते हैं',
  cameraNeeded: 'कैमरा इस्तेमाल करने की अनुमति चाहिए',
  allow: 'अनुमति दें',
  recordAudio: 'ऑडियो रिकॉर्ड करें',
  viewOnceOn: 'एक बार देखें',
  keepInChat: 'चैट में रखें',
  themeClassic: 'क्लासिक',
  themeMidnight: 'आधी रात',
  themeForest: 'जंगल',
  themeSunset: 'सूर्यास्त',
  themeOcean: 'समुद्र',
  themePurple: 'बैंगनी',
  imagePreview: '📷 फ़ोटो',
  audioPreview: '🎤 वॉइस मैसेज',
  today: 'आज',
};
