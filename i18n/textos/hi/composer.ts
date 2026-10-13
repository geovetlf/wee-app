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
  postTextLabel: 'पोस्ट का टेक्स्ट',
  weelHint: 'Weël: {{segundos}} सेकंड तक का वीडियो. Weë से बाहर शेयर करने पर इस पर छोटा-सा वॉटरमार्क लगता है.',
  publicVisibility: 'सार्वजनिक',
  publicExplain: 'अभी Weë पर सभी पोस्ट सार्वजनिक होती हैं.',
  profileReal: 'असली प्रोफ़ाइल',
  profileWee: 'Weë प्रोफ़ाइल',
  actionWithBadge: '{{accion}}, {{insignia}}',
  removeVideo: 'वीडियो हटाएँ',
  removePhotoNumber: 'फ़ोटो {{numero}} हटाएँ',
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
  howShareTitle: 'मैंने कैसे बनाया, यह शेयर करें',
  howShareHint: 'आपकी रचनात्मक प्रक्रिया, इस्तेमाल किए गए टूल और स्टेप दिखाने देता है.',
  howReviewRow: 'जाँचें और चुनें कि कौन-सी जानकारी शेयर करनी है',
  howReviewTitle: 'मैंने इसे कैसे बनाया',
  howReviewIntro: 'सिर्फ़ वही पोस्ट होगा जिसे आप चुनेंगे. पोस्ट करने से पहले आप टेक्स्ट बदल सकते हैं.',
  howToolLabel: 'टूल',
  howToolHint: 'आपने इसे किससे बनाया.',
  howToolPlaceholder: 'जैसे, Weë Studio',
  howProcessLabel: 'प्रोसेस',
  howProcessHint: 'आपने जो स्टेप अपनाए, क्रम से.',
  howStepPlaceholder: 'स्टेप {{n}}',
  howAddStep: 'स्टेप जोड़ें',
  howRemoveStep: 'स्टेप {{n}} हटाएँ',
  howFromHistory: 'ये वे स्टेप हैं जो बनाते समय सेव हुए थे. पोस्ट करने से पहले इन्हें जाँच लें.',
  howFromSummary: 'यह वह है जो Weë ने बनाते समय नोट किया था. आप इसे बदल सकते हैं या स्टेप जोड़ सकते हैं.',
  howNoHistory: 'इस रचना के कोई स्टेप सेव नहीं हुए. आप उन्हें खुद लिख सकते हैं.',
  howLoadingHistory: 'आपकी रचना के स्टेप ढूँढे जा रहे हैं…',
  howPromptLabel: 'आपने जो प्रॉम्प्ट इस्तेमाल किया',
  howPromptHint: 'वैकल्पिक. यह सिर्फ़ तभी पोस्ट होगा जब आप इसे चालू करेंगे.',
  howPromptPlaceholder: 'जो प्रॉम्प्ट शेयर करना है, वह लिखें',
  howPreview: 'प्रीव्यू',
  howPreviewEmpty: 'अपनी पोस्ट में दिखाने के लिए कम से कम एक चीज़ चुनें.',
  /* R9 · Crear */
  sheetOptionPost: 'पोस्ट अपलोड करें',
  sheetOptionPostHint: 'फ़ोटो, वीडियो, फ़ाइलें, टेक्स्ट, लिंक और बहुत कुछ शेयर करें',
  sheetOptionWeel: 'Weël अपलोड करें',
  sheetOptionWeelHint: 'अपने डिवाइस या अपनी रचनाओं से वीडियो शेयर करें',
  sheetToolsNote: 'आप Weë के टूल्स से भी बना सकते हैं',
  createPostTitle: 'पोस्ट बनाएँ',
  toolFile: 'फ़ाइल',
  toolHashtag: 'हैशटैग',
  gallery: 'गैलरी',
  rowAudience: 'यह पोस्ट कौन देख सकता है?',
  rowTagPeople: 'लोगों को टैग करें',
  rowPublishIn: 'यहाँ पोस्ट करें',
  rowWithValue: '{{fila}}: {{valor}}',
  destinationsMore: '{{primero}} +{{resto}}',
  addMoreShort: 'और जोड़ें',
  /* R9 · Crear: documentos PDF y «Mis creaciones» en el compositor */
  creationsAdd: 'जोड़ें',
  creationsEmptyTitle: 'आपके पास अभी Weë से बनी फ़ोटो या वीडियो नहीं हैं',
  creationsEmptyBody: 'Weë AI में कोई इमेज या वीडियो बनाएँ, फिर आप उसे यहाँ शेयर कर सकेंगे.',
  creationsTooMany: 'एक पोस्ट में सिर्फ़ {{tope}} फ़ोटो आ सकती हैं. जितनी आ सकीं, जोड़ दी गईं.',
  creationUntitledImage: 'बिना शीर्षक की इमेज',
  documentNotPdf: '“{{nombre}}” PDF नहीं है. सिर्फ़ PDF दस्तावेज़ जोड़े जा सकते हैं.',
  documentTooBig: '“{{nombre}}” {{maximo}} MB से बड़ा है.',
  documentEmpty: '“{{nombre}}” खाली है.',
  documentsTooMany: 'एक पोस्ट में आप {{maximo}} दस्तावेज़ तक जोड़ सकते हैं.',
  documentPickFailed: 'फ़ाइल चुनने वाला नहीं खुल सका.',
  documentUploadFailed: 'दस्तावेज़ अपलोड नहीं हो सका',
  removeDocument: '“{{nombre}}” हटाएँ',
};
