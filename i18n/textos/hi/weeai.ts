/*
 * HINDI — WEË AI: el armazón, la conversación guiada y Weë Brain. Los nombres
 * de las experiencias y de los modelos son marca y no entran aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El lema y «Cuéntale a Weë…» son los del glosario (docs/I18N-HINDI.md § 11.7):
 * «नतीजा आप चुनें. AI Weë चुनेगा.» y «Weë को बताएँ कि आपको क्या चाहिए. AI का काम
 * Weë संभालेगा.». Los especialistas son «एक्सपर्ट» y las creaciones, «रचनाएँ»
 * («Mis creaciones», «मेरी रचनाएँ»); recargar es «Credits जोड़ें» y cobrar,
 * «Credits काटना»: «No te cobré» es «आपके Credits नहीं काटे गए.», en pasiva, como
 * en el glosario. Lo que se enseña ANTES de crear nunca dice que ya se cobró:
 * «आपने … इस्तेमाल किए» solo sale en `youSpent`, cuando el cargo ya se hizo.
 * «Costo» y «precio» son la misma palabra para quien paga, «कीमत» (f):
 * «कीमत निकाली जा रही है…», «टेस्ट कीमत» (el «precio de prueba» del glosario).
 *
 * Weë Brain habla en primera persona y sin género (§ 5.3): ergativo («मैंने इसे
 * रोक दिया», «मैंने यह समझा»), subjuntivo («मैं आपको वहाँ ले चलूँ…?»), dativo
 * («मुझे … मदद मिलेगी») o una frase sin verbo personal («आपको वहाँ ले जाना मेरा
 * काम है»); los errores del sistema, en pasiva. Lo que dice la persona
 * («Prefiero describirlo con palabras») va en dativo: «मुझे शब्दों में बताना है».
 * Las experiencias que entran por `{{nombre}}` y `{{especialista}}` van en
 * masculino singular, como Weë: «{{nombre}} सोच रहा है…».
 *
 * Piezas que se pegan a otras en pantalla y conservan su borde:
 * `testPriceSuffix` va detrás de «≈ 12 Credits»; `youSpent` y `spentNothing`,
 * detrás de `finishedGoal`; `testPriceParenthesis` entra en {{nota}}, pegado a
 * Credits como en español. `regeneratePriceSuffix` entra en {{precio}} con su
 * espacio delante: en `anotherVersion` y `eachChangeRecreates` el verbo toca el
 * hueco sin espacio, igual que «versión{{precio}}» en español; con un espacio
 * ahí, la pantalla enseñaría dos. `creditsLeft` y `youHaveLeft` dicen
 * «Credits बाकी» y no «बाकी» a secas: en la misma línea de Weë Brain va
 * «12 में से 11 जवाब बाकी» (`brain.blockLeft`), y sin la marca las dos cosas que
 * quedan se confundirían. Es lo único añadido al español, y es la marca.
 *
 * Las fechas del viaje las escribe Intl («12 अक्टूबर 2026», «अक्टूबर 2026») y
 * aquí no llevan preposición (§ 8): un día es «{{fecha}}», un tramo del mismo mes
 * «12–18 अक्टूबर 2026» y dos meses distintos «12 अक्टूबर 2026 – 5 नवंबर 2026»,
 * con la raya corta de intervalo que usa Intl. Plural: «1 रात / 3 रातें»; «दिन» e
 * «इमेज» no cambian, y como el 0 también es `one`, el singular lleva la cifra.
 * Los segundos, «सेकंड» entero: la abreviatura «से॰» solo la pone Intl (§ 9). El
 * descuento es «15% थोक छूट», sin el signo menos: «छूट» ya dice que se resta.
 *
 * `trySearchWords` sugiere palabras hindi, pero las palabras clave de las
 * experiencias solo existen en español (docs/I18N.md, «Palabras clave que solo
 * existen en español e inglés»): hoy nada escrito en devanagari encuentra una
 * experiencia por esa vía. «Alter ego» es «दूसरी डिजिटल पहचान»; «Tu espacio»
 * (Weë Home), «आपकी जगह». Las frases de cambio rápido (`makeItRealistic`…)
 * viajan como petición a Weë Brain y conservan la forma del español: dos
 * órdenes y dos adjetivos.
 *
 * El ejemplo del buscador (`whatDoYouWant`) cabe en UNA línea: el hindi deja el
 * verbo al final y en un teléfono la frase se cortaba antes de «वीडियो». Va como
 * se le escribe a un asistente, lo que se pide primero y el para qué detrás de
 * la coma: «मुझे एक बढ़िया वीडियो चाहिए, अपने रेस्टोरेंट के प्रमोशन के लिए…».
 * Encima de los especialistas que encuentra una búsqueda, «Para eso está» es
 * «इस काम के एक्सपर्ट». El estado «Faltan respuestas» es «आपके जवाब का इंतज़ार»:
 * dice quién tiene que contestar y no se confunde con los «जवाब बाकी» del
 * bloque de Weë Brain.
 */
export const weeai: typeof import('../es/weeai').weeai = {
  searchInWee: 'Weë पर खोजें…',
  searchLabel: 'Weë पर खोजें',
  myProfile: 'मेरी प्रोफ़ाइल',
  notifications: 'सूचनाएँ',
  goHome: 'होम पर जाएँ',
  myProjects: 'मेरे प्रोजेक्ट',
  myCreations: 'मेरी रचनाएँ',
  buyCredits: 'Credits खरीदें →',
  yourCredits: 'आपके Credits',
  topUp: 'Credits जोड़ें',
  theSpecialists: 'Weë के एक्सपर्ट',
  availableToday: 'अभी उपलब्ध',
  start: 'शुरू करें',
  whatDoYouWant: 'मुझे एक बढ़िया वीडियो चाहिए, अपने रेस्टोरेंट के प्रमोशन के लिए…',
  describeYourIdea: 'अपना आइडिया बताएँ',
  tellWee: 'Weë को बताएँ कि आपको क्या चाहिए. AI का काम Weë संभालेगा.',
  avatarForWeeProfile: 'आपकी Weë प्रोफ़ाइल के लिए AI अवतार',
  createAlterEgo: 'अपनी दूसरी डिजिटल पहचान बनाएँ और AI से उसका अवतार जनरेट करें.',
  changeAlterEgo: 'AI से अपनी दूसरी डिजिटल पहचान का अवतार जनरेट करें या बदलें.',
  notYetOurs: 'अभी पता नहीं कि यह काम कौन संभालेगा',
  thatIsFor: 'इस काम के एक्सपर्ट',
  notifyMe: 'तैयार होने पर मुझे बताएँ',
  notifyMeReal: 'असली वर्शन आने पर मुझे बताएँ',
  stopNotifying: 'सूचना बंद करें',
  couldNotSave: 'सेव नहीं किया जा सका',
  tryAgainInAMoment: 'थोड़ी देर बाद फिर से कोशिश करें.',
  clear: 'साफ़ करें',
  comingVerySoon: 'बहुत जल्द',
  oneMoment: 'बस एक पल…',
  send: 'भेजें',
  sendIdea: 'आइडिया भेजें',
  uploadYourPhoto: 'जिस फ़ोटो पर काम करना है, उसे अपलोड करें',
  uploadHint: 'गैलरी से या कैमरे से',
  uploadFormats: 'JPG, PNG या WEBP (10 MB तक)',
  uploadingPhoto: 'आपकी फ़ोटो अपलोड हो रही है…',
  photoReady: 'आपकी फ़ोटो तैयार है. मुझे बताएँ कि इसके साथ क्या करना है.',
  photoHelps: 'फ़ोटो से मुझे जगह की असली बनावट बनाए रखने में मदद मिलेगी.',
  uploadToWork: 'एक फ़ोटो अपलोड करें, ताकि Weë उस पर काम कर सके.',
  pickFromPhotos: 'गैलरी से चुनें',
  orAlso: 'या फिर',
  takeAPhoto: 'फ़ोटो लें',
  changePhoto: 'फ़ोटो बदलें',
  removePhoto: 'फ़ोटो हटाएँ',
  photoAttached: 'फ़ोटो अटैच की गई',
  couldNotPickPhoto: 'फ़ोटो नहीं चुनी जा सकी',
  couldNotAttach: 'अटैच नहीं किया जा सका',
  preferWords: 'मुझे शब्दों में बताना है',
  change: 'बदलें',
  remove: 'हटाएँ',
  tryAgain: 'फिर से कोशिश करें',
  itDidNotWork: 'यह ठीक से नहीं बना. आपके Credits नहीं काटे गए.',
  notEnoughCredits: 'आपके पास काफ़ी Credits नहीं हैं',
  getCredits: 'Credits पाएँ',
  calculatingCost: 'कीमत निकाली जा रही है…',
  couldNotCalculate: 'कीमत नहीं निकाली जा सकी',
  quality: 'क्वालिटी',
  create: 'बनाएँ',
  changeSomething: 'कुछ बदलें',
  noCost: 'मुफ़्त',
  demoMode: 'डेमो मोड: कुछ भी नहीं चुकाना है.',
  creditsNote: 'Credits काम पूरा होने पर कटते हैं. कुछ गड़बड़ होने पर वापस मिल जाते हैं.',
  brainThinking: 'Weë Brain सोच रहा है…',
  brainSearching: 'Weë Brain खोज रहा है…',
  keepTelling: 'और बताएँ…',
  searchInternet: 'इंटरनेट पर खोजें',
  previewDemo: 'झलक · डेमो',
  savedIn: '{{proyecto}} में सेव किया गया',
  saveToProject: 'प्रोजेक्ट में सेव करें',
  newProject: 'नया प्रोजेक्ट',
  projectName: 'प्रोजेक्ट का नाम',
  createProject: 'प्रोजेक्ट बनाएँ',
  close: 'बंद करें',
  choose: 'चुनें',
  play: 'चलाएँ',
  pause: 'रोकें',
  playing: 'चल रहा है',
  playingPreview: 'चल रहा है · झलक',
  hideChanges: 'बदलावों और खरीदारी की सूची छिपाएँ',
  makeItRealistic: 'इसे और असली जैसा बनाएँ',
  changeItsColor: 'इसका रंग बदलें',
  moreStriking: 'और आकर्षक',
  simpler: 'और सादा',
  before: 'पहले',
  after: 'बाद में',
  couldNotLoadCreations: 'आपकी रचनाएँ लोड नहीं हो सकीं',
  couldNotLoadProjects: 'प्रोजेक्ट लोड नहीं हो सके',
  couldNotCreateProject: 'प्रोजेक्ट नहीं बनाया जा सका',
  couldNotSaveToProject: 'प्रोजेक्ट में सेव नहीं किया जा सका. फिर से कोशिश करें.',
  seeMore: 'ज़्यादा देखें',
  seeAllCreations: 'सभी देखें',
  demo: 'डेमो',
  jobAsking: 'आपके जवाब का इंतज़ार',
  jobPlanned: 'बनाने के लिए तैयार',
  jobRunning: 'बन रहा है…',
  jobDone: 'तैयार',
  jobFailed: 'नहीं बन सका',
  jobCancelled: 'रद्द किया गया',
  brainGreeting: 'नमस्ते! मैं Weë Brain हूँ. मुझसे कुछ भी पूछें, बताएँ या जो चाहिए, वह माँगें. अगर कोई काम दूसरा Weë एक्सपर्ट बेहतर करता है, तो आपको वहाँ ले जाना मेरा काम है.',
  brainBetterFit: '{{emoji}} {{especialista}} इसमें आपकी बेहतर मदद कर सकता है. आपने अब तक जो बताया है, उसके साथ मैं आपको वहाँ ले चलूँ या हम यहीं जारी रखें?',
  goToSpecialist: '{{especialista}} पर जाएँ',
  stayHere: 'यहीं जारी रखें',
  creditsAndCost: 'उपलब्ध Credits: {{saldo}} · कीमत: {{costo}}',
  sendForCredits: '{{credits}} Credits में भेजें',
  writeToKnowCost: 'अपना मैसेज लिखें. भेजने से पहले आपको उसकी कीमत दिख जाएगी.',
  approxUsd: 'लगभग {{usd}} USD',
  creditsLeft: '{{saldo}} Credits बाकी',
  attach: 'अटैच करें',

  /* ── LO QUE CUESTA, EN PALABRAS ─────────────────────────────────────────
   * Las cifras ya las escribe el formato de Weë con el locale activo;
   * aquí solo está el texto que las acompaña.
   */
  creditsAvailable: 'उपलब्ध Credits: {{saldo}}',
  costLine: 'कीमत: {{coste}}',
  youHaveLeft: '{{saldo}} Credits बाकी',
  testPriceSuffix: ' · टेस्ट कीमत',
  testPriceParenthesis: ' (टेस्ट कीमत)',
  youSpent: ' आपने {{credits}} Credits{{nota}} इस्तेमाल किए.',
  spentNothing: ' इसमें कोई Credits नहीं लगे.',
  calculatingTheCost: 'कीमत निकाली जा रही है…',
  costFailed: 'कीमत नहीं निकाली जा सकी. फिर से कोशिश करें.',
  avatarCost: 'Weë अवतार · {{credits}} Credits{{saldo}}',
  /* Lo que Weë Brain dice que va a hacer, que llega desde el servidor. */
  quoteSearch: 'स्रोतों के साथ खोज',
  quoteBrain: 'Weë Brain का जवाब',
  speak: 'बोलें',
  speakComingSoon: 'Weë से बोलकर बात करने की सुविधा अगले किसी वर्शन में आएगी. अभी के लिए, लिखकर बताएँ.',
  searchInternetOn: 'इंटरनेट पर खोजें: हाँ',
  newConversation: 'नई चैट',
  couldNotCalculateRetry: 'कीमत नहीं निकाली जा सकी. फिर से कोशिश करें.',
  expandSection: '{{titulo}}. {{contenido}} देखें',
  collapseSection: '{{titulo}}. {{contenido}} छिपाएँ',
  openTravel_one: '{{titulo}}. Weë Travel खोलें: अपनी यात्रा लिखने का बॉक्स और शुरू करने का {{contador}} तरीका',
  openTravel_other: '{{titulo}}. Weë Travel खोलें: अपनी यात्रा लिखने का बॉक्स और शुरू करने के {{contador}} तरीके',
  closeTravel_one: '{{titulo}}. Weë Travel छिपाएँ: अपनी यात्रा लिखने का बॉक्स और शुरू करने का {{contador}} तरीका',
  closeTravel_other: '{{titulo}}. Weë Travel छिपाएँ: अपनी यात्रा लिखने का बॉक्स और शुरू करने के {{contador}} तरीके',
  tellWeeTheTrip: 'Weë को अपनी यात्रा के बारे में बताएँ',
  theMotto: 'नतीजा आप चुनें. AI Weë चुनेगा.',
  trySearchWords: 'लोगो, वीडियो, फ़ोटो, टेक्स्ट, गाना, लुक, रेसिपी, घर या बिज़नेस जैसे शब्द लिखकर देखें. या Weë Brain से पूछें.',
  whatToCreate: 'क्या बनाना है?',
  willNotifyYou: '✓ असली वर्शन आने पर आपको सूचना मिल जाएगी',
  projectsNote: 'अपनी रचनाएँ एक ही जगह रखें: लोगो, फ़ोटो, वीडियो, संगीत और दस्तावेज़.',
  errNotEnoughCredits: 'इस काम के लिए आपके पास काफ़ी Credits नहीं हैं. Credits पाएँ और फिर से कोशिश करें.',
  errRateLimited: 'आपने लगातार बहुत सारी रचनाएँ बनाई हैं. थोड़ी देर रुकें और फिर से कोशिश करें.',
  errTimeout: 'इसमें बहुत ज़्यादा समय लग रहा था, इसलिए मैंने इसे रोक दिया. आपके Credits नहीं काटे गए. फिर से कोशिश करें.',
  errNotAvailable: 'यह सुविधा अभी उपलब्ध नहीं है.',
  errNotAvailableNow: 'यह सुविधा इस समय उपलब्ध नहीं है. थोड़ी देर बाद फिर से कोशिश करें.',
  errNotAvailableRegion: 'यह सुविधा आपके क्षेत्र में उपलब्ध नहीं है.',
  errNotAvailableCountry: 'इस सुविधा का उपयोग करने के लिए, अपनी असली प्रोफ़ाइल में अपना देश बताएँ.',
  errNotAvailableOptions: 'आपके चुने हुए विकल्पों के साथ यह सुविधा उपलब्ध नहीं है. दूसरे विकल्प आज़माएँ.',
  errDuplicate: 'यह रचना पहले से बन रही है.',
  errNoAccount: 'Weë AI इस्तेमाल करने के लिए, अपनी प्रोफ़ाइल पूरी करें.',
  errSignIn: 'Weë के साथ कुछ बनाने के लिए, साइन इन करें.',
  errOffline: 'Weë AI से कनेक्ट नहीं हो सका. अपना कनेक्शन जाँचें और फिर से कोशिश करें.',
  errGeneric: 'यह ठीक से नहीं बना. फिर से कोशिश करें? आपके Credits नहीं काटे गए.',
  dayExpand: '{{titulo}}. दिन देखने के लिए टैप करें',
  dayCollapse: '{{titulo}}. बंद करने के लिए टैप करें',
  pathRedesign: '🏠 नए सिरे से डिज़ाइन करें',
  pathColors: '🎨 स्टाइल और रंग बदलें',
  pathFurniture: '🪑 फ़र्नीचर पर काम करें',
  sidebarTagline: 'आपका बेहतर रूप,\nज़्यादा रचनात्मक\nदुनिया में',
  youHaveCredits: 'आपके पास {{saldo}} Credits हैं',
  creditsBoxNote: 'Weë के एक्सपर्ट Credits इस्तेमाल करते हैं. जब चाहें, Credits जोड़ें.',
  startWith: '{{nombre}} के साथ शुरू करें',
  previousMonth: 'पिछला महीना',
  nextMonth: 'अगला महीना',
  dontKnowYet: 'अभी पता नहीं',
  confirmDates: 'तारीखों की पुष्टि करें',
  optionCredits: '{{nombre}}, {{credits}} Credits',
  emojiLabel: '{{emoji}} इमोजी',
  chooseProposal: 'प्रस्ताव {{numero}} चुनें',
  generatedVideo: 'जनरेट किया गया वीडियो',
  playVideo: 'वीडियो चलाएँ',
  continueVia: 'इस रास्ते से जारी रखें: {{camino}}',
  youChooseWeeChooses: 'नतीजा आप चुनें. AI Weë चुनेगा.',
  demoToday: 'अभी डेमो मोड चालू है: बिना Credits खर्च किए देखें कि यह कैसे काम करता है.',
  titleWithDetail: '{{titulo}}. {{detalle}}',
  inferredAnswer: '{{respuesta}} · आपके लिखे से मैंने यह समझा',
  goalWithChange: '{{objetivo}} · बदलाव: {{cambio}}',
  uploadDishPhoto: 'अपनी तैयार डिश की फ़ोटो अपलोड करें',
  uploadIngredientsPhoto: 'अपने फ़्रिज की या अपने पास मौजूद सामग्री की फ़ोटो अपलोड करें',
  uploadingYourSpace: 'आपकी जगह की फ़ोटो अपलोड हो रही है…',
  yourSpace: 'आपकी जगह',
  finishedGoal: '{{nombre}} ने आपका काम पूरा किया: “{{objetivo}}”.',
  chosenProposal: '✓ चुना गया · प्रस्ताव {{numero}}',
  proposalNumber: 'प्रस्ताव {{numero}}',
  sample: 'नमूना',
  weeVoice: 'Weë की आवाज़',
  weeVoiceDuration: '{{duracion}} · Weë की आवाज़',
  previewWithDuration: '{{duracion}} · झलक',
  regeneratePriceSuffix: ' · ≈ {{credits}} Credits',
  anotherVersion: 'दूसरा वर्शन बनाएँ{{precio}}',
  eachChangeRecreates: 'हर बदलाव पर नतीजा फिर से बनता है{{precio}}. Credits काम पूरा होने पर कटते हैं.',
  showChanges: 'बदलावों और खरीदारी की सूची देखें',
  nameThinking: '{{nombre}} सोच रहा है…',
  tapDepartureDay: 'जिस दिन निकलना है, उस पर टैप करें.',
  tapReturnDay: 'अब जिस दिन लौटना है, उस पर टैप करें.',
  tripOneDay: '{{fecha}}',
  tripSameMonth: '{{dia}}–{{diaFinal}} {{mesYAnio}}',
  tripRange: '{{salida}} – {{regreso}}',
  tripDays_one: '{{contador}} दिन',
  tripDays_other: '{{contador}} दिन',
  tripNights_one: '{{contador}} रात',
  tripNights_other: '{{contador}} रातें',
  tripDuration: '{{dias}} · {{noches}}',
  tripSummary: '{{fechas}} · {{duracion}}',
  imageCount_one: '{{contador}} इमेज',
  imageCount_other: '{{contador}} इमेज',
  durationSeconds: '{{segundos}} सेकंड',
  volumeDiscount: '{{descuento}}% थोक छूट',
  createWork: 'बनाएँ',
};
