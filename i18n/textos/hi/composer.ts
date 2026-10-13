/*
 * HINDI — El compositor: lo que se escribe y lo que se adjunta antes de publicar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Publicar» es «पोस्ट करें» y la publicación, «पोस्ट» (f, invariable): «नई पोस्ट»,
 * «पोस्ट हो रही है…» (glosario § 11.1, § 10). La encuesta es «पोल» (m) y cada
 * opción, «विकल्प», la palabra de Android; la mención, «मेंशन»; la ubicación y el
 * lugar, «जगह». «Pregunta» es «सवाल», la palabra de todos los días. El watermark
 * es «वॉटरमार्क» y el face swap, «फ़ेस स्वैप», los préstamos que usan las apps
 * indias. «Público» es «सार्वजनिक», como la visibilidad de YouTube, y la zona
 * aproximada, «अनुमानित इलाका», la palabra del permiso de ubicación de Android.
 * Los caracteres de un texto son «वर्ण», como en Android y en el resto de Weë.
 *
 * Weël va en latino, como la marca, y en masculino singular (§ 5.3):
 * «Weël बहुत लंबा है», «अपने Weël के लिए».
 *
 * Los huecos llevan la posposición separada (§ 6): la agenda —«ËContact»,
 * «ẄContact» o su plural, que son marca— entra como «अपने {{lista}} में से…» o
 * «आपके कोई {{lista}} नहीं हैं», y delante de un sustantivo, como «Google संपर्क»:
 * «अपने ËContact संपर्कों को मेंशन करने के लिए» (un «ËContact में» suelto se
 * leería como el sitio donde se menciona). `yourCountry` solo se usa dentro de
 * `placesIn` («📍 {{pais}} में जगहें»), delante de «में», y por eso va en
 * oblicuo: «आपके देश». Lo que la persona escribió como lugar va entre comillas “…”.
 *
 * `profileNoAgenda` habla de «इस प्रोफ़ाइल», sin nombrar una cara que ya no
 * existe (el Perfil Biz se eliminó el 2026-09-19). El Perfil Real y el Perfil
 * Weë son «असली प्रोफ़ाइल» y «Weë प्रोफ़ाइल» (glosario § 11.1).
 *
 * Los títulos de error son sintagmas («वीडियो अपलोड करने में गड़बड़ी») y los
 * cuerpos dicen qué pasó, en pasiva, y qué hacer. Los avisos de permiso dicen
 * «Weë को … की अनुमति चाहिए»: quien pide el permiso tiene nombre y el «nosotros»
 * del español no hace falta. Las instrucciones siguen «…ने के लिए, …» (§ 2).
 *
 * Plurales: «{{contador}} फ़ोटो जोड़ी जा सकती है / …जोड़ी जा सकती हैं» (el 0 también
 * es `one`); «दिन», «सेकंड» y «मिनट» no cambian. «Quitar la mención / las
 * menciones» no lleva cifra en español: «मेंशन हटाएँ / सभी मेंशन हटाएँ».
 * «Publicando...» del español lleva tres puntos: aquí es «…», un carácter.
 * «PUBLICAR EN» no va en mayúsculas (el devanagari no tiene caja): es
 * «कहाँ पोस्ट करें», encima de las casillas de los destinos.
 *
 * `multimedia` es «गैलरी»: el botón abre la galería de fotos y vídeos y su nombre
 * tiene que caber en una línea bajo el icono. El muro general es «मुख्य Wäll», el
 * principal: «सामान्य» se leería como «corriente».
 *
 * La zona desde la que se publica se nombra como un estado, «पोस्ट में आपका
 * अनुमानित इलाका जुड़ा है»: «पोस्ट हो रही है» es el aviso de que se está
 * publicando y el lector de pantalla los confundiría. Quien todavía no está en
 * la agenda se nombra sin género: «उनका नाम यहाँ दिखेगा», no «वे यहाँ दिखेंगे».
 */
export const composer: typeof import('../es/composer').composer = {
  publish: 'पोस्ट करें',
  createPost: 'पोस्ट बनाएँ',
  sharePhoto: 'फ़ोटो शेयर करें',
  photoOrVideo: 'फ़ोटो या वीडियो',
  camera: 'कैमरा',
  location: 'जगह',
  poll: 'पोल',
  sheetTitle: 'बनाएँ',
  sheetSubtitle: 'आज क्या शेयर करना है?',
  kindPost: 'पोस्ट',
  kindWeel: 'Weël',
  kindImage: 'इमेज',
  kindVideo: 'वीडियो',
  kindText: 'टेक्स्ट',
  kindQuestion: 'सवाल',
  needAiTool: 'क्या आपको AI टूल चाहिए?',
  needAiToolNote: 'वीडियो, इमेज, टेक्स्ट, संगीत और भी बहुत कुछ',
  econtact: 'ËContact',
  openOptions: '{{campo}} पोस्ट करने के विकल्प खोलें.',
  showOptions: 'पोस्ट करने के विकल्प दिखाएँ',
  hideOptions: 'पोस्ट करने के विकल्प छिपाएँ',
  currentDestination: '{{destino}}, अभी चुना हुआ',
  generalWall: 'मुख्य Wäll',
  placeholderPollExtra: 'चाहें तो कुछ और जोड़ें (ज़रूरी नहीं)…',
  placeholderQuestion: 'कम्यूनिटी से क्या पूछना है?',
  placeholderWeel: 'बताएँ कि आपने अपने Weël के लिए क्या बनाया और किस AI से…',
  placeholderVideo: 'बताएँ कि आपने क्या बनाया और किस AI से…',
  placeholderImage: 'अपनी इमेज दिखाएँ और बताएँ कि आपने इसे कैसे बनाया…',
  placeholderText: 'कोई टेक्स्ट, प्रॉम्प्ट या आइडिया शेयर करें…',
  placeholderDefault: 'कुछ लिखें…',
  postTextLabel: 'पोस्ट का टेक्स्ट',
  weelHint: 'Weël: {{segundos}} सेकंड तक का वीडियो. Weë से बाहर शेयर करने पर इस पर छोटा-सा वॉटरमार्क लगता है.',
  newPost: 'नई पोस्ट',
  you: 'आप',
  shareWithCommunity: 'Weë कम्यूनिटी के साथ शेयर करें',
  publicVisibility: 'सार्वजनिक',
  visibilityIs: 'कौन देख सकता है: {{estado}}',
  publicExplain: 'अभी Weë पर सभी पोस्ट सार्वजनिक होती हैं.',
  profileReal: 'असली प्रोफ़ाइल',
  profileWee: 'Weë प्रोफ़ाइल',
  multimedia: 'गैलरी',
  actionWithBadge: '{{accion}}, {{insignia}}',
  removeVideo: 'वीडियो हटाएँ',
  removePhotoNumber: 'फ़ोटो {{numero}} हटाएँ',
  addMoreMedia: 'और फ़ोटो या वीडियो जोड़ें',
  addMoreMediaLabel: 'और फ़ोटो या वीडियो जोड़ें, अभी {{tope}} में से {{puestas}}',
  placeIs: 'जगह: {{lugar}}',
  removePlace: 'जगह हटाएँ',
  approxZone: 'अनुमानित इलाका',
  postingFromZone: 'पोस्ट में आपका अनुमानित इलाका जुड़ा है',
  removeMyLocation: 'अपनी जगह हटाएँ',
  removeMentions_one: 'मेंशन हटाएँ',
  removeMentions_other: 'सभी मेंशन हटाएँ',
  signInToMention: 'अपने ËContact संपर्कों को मेंशन करने के लिए, Weë में साइन इन करें.',
  profileNoAgenda: 'इस प्रोफ़ाइल में ËContact सूची नहीं है. किसी को मेंशन करने के लिए, अपनी असली प्रोफ़ाइल या Weë प्रोफ़ाइल पर जाएँ.',
  noContactsYet: 'अभी तक आपके कोई {{lista}} नहीं हैं. किसी की प्रोफ़ाइल से उनसे जुड़ने पर उनका नाम यहाँ दिखेगा, ताकि आप उन्हें मेंशन कर सकें.',
  mentionAnyone: 'अपने {{lista}} में से किसी को भी मेंशन करें',
  publishIn: 'कहाँ पोस्ट करें',
  publishing: 'पोस्ट हो रही है…',
  publishingOverlay: 'पोस्ट हो रही है…',
  uploadingFiles: 'अपलोड हो रहा है: {{total}} में से {{n}}…',
  readyInAMoment: 'आपकी पोस्ट कुछ ही पलों में तैयार हो जाएगी',
  pollQuestionPlaceholder: 'क्या पूछना है?',
  pollOptionPlaceholder: 'विकल्प {{numero}}',
  pollAddOption: 'विकल्प जोड़ें',
  pollDurationLabel: 'पोल की अवधि',
  pollDays_one: '{{contador}} दिन',
  pollDays_other: '{{contador}} दिन',
  pollErrEmptyQuestion: 'अपने पोल का सवाल लिखें.',
  pollErrLongQuestion: 'सवाल में {{maximo}} से ज़्यादा वर्ण नहीं हो सकते.',
  pollErrFewOptions: 'पोल में कम से कम {{minimo}} विकल्प होने चाहिए.',
  pollErrManyOptions: 'पोल में ज़्यादा से ज़्यादा {{maximo}} विकल्प हो सकते हैं.',
  pollErrEmptyOption: 'हर विकल्प में कुछ लिखें.',
  pollErrLongOption: 'किसी विकल्प में {{maximo}} से ज़्यादा वर्ण नहीं हो सकते.',
  pollErrDuplicateOption: 'दो विकल्पों में एक ही बात लिखी है.',
  pollErrInvalid: 'यह पोल सही नहीं है.',
  pollErrDuration: 'चुनें कि पोल कितने समय तक चलेगा.',
  pollWithVideo: 'पोल में फ़ोटो जोड़ी जा सकती है, लेकिन वीडियो नहीं',
  pollMaxPhotos_one: 'पोल में ज़्यादा से ज़्यादा {{contador}} फ़ोटो जोड़ी जा सकती है',
  pollMaxPhotos_other: 'पोल में ज़्यादा से ज़्यादा {{contador}} फ़ोटो जोड़ी जा सकती हैं',
  notAvailable: 'उपलब्ध नहीं',
  permissionRequired: 'अनुमति चाहिए',
  cameraAccess: 'Weë को आपके कैमरे की अनुमति चाहिए.',
  galleryAccess: 'Weë को आपकी गैलरी की अनुमति चाहिए.',
  permissionsNeeded: 'अनुमतियाँ चाहिए',
  cameraForPhotos: 'फ़ोटो लेने के लिए, Weë को आपके कैमरे की अनुमति चाहिए',
  goToSettings: 'सेटिंग में जाएँ',
  faceSwapFailed: 'फ़ेस स्वैप नहीं हो सका. फिर से कोशिश करें.',
  weelTooLong: 'Weël बहुत लंबा है',
  videoTooLong: 'वीडियो बहुत लंबा है',
  weelMaxDuration: 'Weël {{maximo}} सेकंड से लंबा नहीं हो सकता. आपका वीडियो {{duracion}} का है.',
  videoMaxDuration: 'वीडियो {{maximo}} सेकंड से लंबा नहीं हो सकता. आपका वीडियो {{duracion}} का है.',
  seconds_one: '{{contador}} सेकंड',
  seconds_other: '{{contador}} सेकंड',
  minutes_one: '{{contador}} मिनट',
  minutes_other: '{{contador}} मिनट',
  noVideoWithMedia: 'पहले से मीडिया जुड़ा हो, तो वीडियो नहीं जोड़ा जा सकता',
  noImagesWithVideo: 'पहले से वीडियो जुड़ा हो, तो इमेज नहीं जोड़ी जा सकतीं',
  pickImagesFailed: 'इमेज नहीं चुनी जा सकीं',
  takePhotoFailed: 'फ़ोटो नहीं ली जा सकी',
  mustSignIn: 'पोस्ट करने के लिए, साइन इन करें',
  videoUploadFailed: 'वीडियो अपलोड करने में गड़बड़ी',
  imageUploadFailed: 'इमेज अपलोड करने में गड़बड़ी',
  publishFailed: 'पोस्ट करने में गड़बड़ी',
  uploadErrorBody: 'फ़ाइल अपलोड नहीं की जा सकी. अपना कनेक्शन जाँचें और फिर से कोशिश करें.',
  publishErrorBody: 'पोस्ट नहीं की जा सकी. फिर से कोशिश करें.',
  addLocation: 'जगह जोड़ें',
  searchPlace: 'कोई जगह, शहर या देश खोजें',
  clearSearch: 'खोज साफ़ करें',
  useAsTyped: '“{{texto}}” को वैसे ही इस्तेमाल करें',
  asYouTypedIt: 'जैसा आपने लिखा, वैसा ही',
  tagPostWithIt: 'आपने जो लिखा है, उसे पोस्ट में जगह के तौर पर जोड़ें और पोस्ट पर वापस जाएँ',
  chooseThisPlace: 'यह जगह चुनें और पोस्ट पर वापस जाएँ',
  placeOption: '{{lugar}}, {{detalle}}',
  country: 'देश',
  placesNearYou: '📍 आपके आस-पास की जगहें',
  placesIn: '📍 {{pais}} में जगहें',
  yourCountry: 'आपके देश',
  seeMore: 'ज़्यादा देखें',
  seeLess: 'कम देखें',
  galleryForImages: 'इमेज चुनने के लिए, Weë को आपकी गैलरी की अनुमति चाहिए',
  results: 'नतीजे',
  useAsTypedShort: '“{{texto}}” इस्तेमाल करें',
  imageFetchFailed: 'इमेज नहीं मिल सकी: {{estado}} {{texto}}',
  askCommunity: 'कम्यूनिटी से सवाल पूछें',
  applyingFaceSwap: 'फ़ेस स्वैप हो रहा है…',
  searchPlaceHint: 'अपनी पोस्ट में जगह जोड़ने के लिए, कोई शहर या देश खोजें.',
  aiProcessCreatedWith: 'Weë AI में {{nombre}} से बनाया गया',
  aiProcessDemoPreview: '{{proceso}} (डेमो मोड में झलक)',
  distanceUnder: '{{distancia}} से कम',
  distanceOver: '{{distancia}} से ज़्यादा',
};
