/*
 * HINDI — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Quien republica es el sujeto de un ergativo con «ने» y un verbo transitivo,
 * así la frase vale para cualquier persona: «{{nombre}} ने रीपोस्ट किया» (guía
 * § 5.2); lo mismo con quien mira, «आपने वोट दिया». La confirmación de borrar
 * sigue el patrón de la guía, «क्या आपको यह पोस्ट मिटानी है?», con el aviso de
 * que no se puede deshacer: «¿Estás seguro…?» no se calca. Los errores van en
 * pasiva con el participio concordado con lo que falla (पोस्ट, इमेज y टिप्पणी
 * son femeninos: «मिटाई नहीं जा सकी»), y el paso siguiente es «फिर से कोशिश
 * करें». «Guardados» es «सेव की गई पोस्ट» (glosario § 11.2) y «Enviar por
 * WeeTalk», «WeeTalk से भेजें», con la posposición separada de la marca: ese
 * botón lo cita letra por letra `weetalk.noConversationsHint`. La encuesta es
 * «पोल» (m) y el voto, «वोट», invariable; los `_one` llevan la cifra porque en
 * hindi el 0 también es `one` (guía § 8), y «घंटा» pasa a «घंटे» en `_other`.
 *
 * `statViews`, `statAgree` y `statComments` van detrás de una cifra que pone el
 * código y no tienen plural propio: «व्यू» (como en YouTube), «सहमत»
 * (invariable) y «टिप्पणियाँ», que es lo que se lee casi siempre. La caja «CÓMO
 * LO HICE» es «मैंने इसे कैसे बनाया» (glosario § 11.4), sin mayúsculas porque el
 * devanagari no tiene caja; «Creado con», al que siguen las fichas de las
 * herramientas, es «इस्तेमाल किए गए टूल», y «Proceso:», «प्रोसेस:».
 * `publishedOnWee` firma el texto que sale al compartir («- Weë पर पोस्ट किया
 * गया»), y `shareText` conserva «World Encode Entity» en latino: es la marca.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} ने रीपोस्ट किया',
  repost: 'रीपोस्ट करें',
  undoRepost: 'रीपोस्ट हटाएँ',
  undoRepostConfirm: 'रीपोस्ट हटाएँ',
  sendByWeeTalk: 'WeeTalk से भेजें',
  save: 'सेव करें',
  unsave: 'सेव की गई पोस्ट से हटाएँ',
  deletePost: 'पोस्ट मिटाएँ',
  deletePostConfirm: 'क्या आपको यह पोस्ट मिटानी है? इसे वापस नहीं लाया जा सकेगा.',
  deletePostFailed: 'पोस्ट मिटाई नहीं जा सकी. फिर से कोशिश करें.',
  sharePost: 'पोस्ट शेयर करें',
  shareFailed: 'पोस्ट शेयर नहीं की जा सकी. फिर से कोशिश करें.',
  preparingImage: 'इमेज तैयार हो रही है…',
  publishedOnWee: 'Weë पर पोस्ट किया गया',
  viewInWeels: 'Weëls में देखें',
  moreImages: '{{contador}} और',
  comment: 'टिप्पणी करें',
  viewFullVideoInWeels: 'पूरा वीडियो Weëls में देखें',
  pollNoVotesYet: 'अभी तक कोई वोट नहीं',
  pollVotes_one: '{{contador}} वोट',
  pollVotes_other: '{{contador}} वोट',
  pollVoted: 'आपने वोट दिया',
  pollClosed: 'पोल खत्म हो गया',
  pollDaysLeft_one: '{{contador}} दिन बाकी',
  pollDaysLeft_other: '{{contador}} दिन बाकी',
  pollHoursLeft_one: '{{contador}} घंटा बाकी',
  pollHoursLeft_other: '{{contador}} घंटे बाकी',
  pollLessThanAnHour: '1 घंटे से कम बाकी',
  pollLegacy: 'यह पोल Weë के पुराने वर्शन का है, इसलिए अब इसमें वोट नहीं दिए जा सकते.',
  pollVoteFailed: 'आपका वोट दर्ज नहीं हो सका',
  pollVoteOffline: 'Weë से कनेक्ट नहीं किया जा सका. कुछ देर बाद फिर से कोशिश करें.',
  closeComments: 'टिप्पणियाँ बंद करें',
  removeImage: 'इमेज हटाएँ',
  attachImage: 'इमेज अटैच करें',
  sendComment: 'टिप्पणी भेजें',
  onePost: 'पोस्ट',
  loadingComments: 'टिप्पणियाँ लोड हो रही हैं…',
  beFirstToComment: 'सबसे पहले आप टिप्पणी करें',
  commentPlaceholder: 'टिप्पणी लिखें…',
  postNotFound: 'यह पोस्ट नहीं मिली',
  loadingPosts: 'पोस्ट लोड हो रही हैं…',
  loadingMorePosts: 'और पोस्ट लोड हो रही हैं…',
  retry: 'फिर से कोशिश करें',
  howIMadeIt: 'मैंने इसे कैसे बनाया',
  madeWith: 'इस्तेमाल किए गए टूल',
  holdToCopy: 'कॉपी करने के लिए, टेक्स्ट को दबाकर रखें',
  process: 'प्रोसेस:',
  comments: 'टिप्पणियाँ',
  firstCommentHint: 'हर शानदार बातचीत की शुरुआत एक विचार से होती है.',
  loadingPost: 'पोस्ट लोड हो रही है…',
  useInEditor: 'एडिटर में इस्तेमाल करें',
  edit: 'एडिट करें',
  publishToCommunity: 'अपनी कम्यूनिटी में पोस्ट करें',
  changesAndPurchases: 'बदलावों और खरीदारी की सूची',
  shareAnonymously: 'Weë पर गुमनाम रहकर अपनी राय दें',
  statViews: 'व्यू',
  statAgree: 'सहमत',
  statComments: 'टिप्पणियाँ',
  commentImageFailed: 'इमेज अपलोड नहीं की जा सकी. फिर से कोशिश करें.',
  commentSendFailed: 'टिप्पणी नहीं भेजी जा सकी. फिर से कोशिश करें.',
  shareText: '{{contenido}}\n\nWeë पर बनाया गया · World Encode Entity',
  shareTextEmpty: 'Weë पर यह पोस्ट देखें',
  commentsWithCount: 'टिप्पणियाँ ({{total}})',
  agreeWithComment: 'इस टिप्पणी से सहमत',
  disagreeWithComment: 'इस टिप्पणी से असहमत',
  showPrompt: 'प्रॉम्प्ट देखें',
  hidePrompt: 'प्रॉम्प्ट छिपाएँ',
  copyPrompt: 'प्रॉम्प्ट कॉपी करें',
  promptCopied: 'कॉपी किया गया',
};
