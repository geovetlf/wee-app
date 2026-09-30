/*
 * HINDI — Weë Business: la pantalla del negocio, sus ocho módulos y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Lo que representa al negocio de la
 * persona —nombres de cuentas, arrobas, títulos de publicaciones y mensajes de sus clientes— no pasa por aquí.
 *
 * «Negocio» es बिज़नेस (m), como en WhatsApp e Instagram, y vale igual para quien vende dulces desde casa; «cliente»
 * es ग्राहक; «producto», प्रोडक्ट; una red conectada es un खाता (cuenta) y conectarla, कनेक्ट करना. Los nombres de los
 * ocho módulos (My Business, Products & Catalog…) son de producto, viven en `constants/businessModules.ts` y no pasan
 * por el traductor; por eso «Business Profile» se queda igual cuando es un destino para compartir. Los NOMBRES de las
 * funciones —Business Plan, Business Coach, Pricing Assistant, Brand Kit, Customer Insights, Business Ideas— también
 * son de producto y se escriben igual en todos los idiomas (decisión del usuario, 2026-09-16); lo que hace cada una sí
 * se traduce, en su pista. «SWOT» se queda como sigla: SWOT विश्लेषण (guía § 6).
 *
 * El dinero, con las palabras de quien lleva un negocio en la India: लागत (coste), कीमत (precio), मार्जिन, मुनाफ़ा
 * (ganancia), खर्च (gasto), बिक्री (ventas), कच्चा माल (insumos), मटीरियल (los materiales de un precio). El gasto
 * «Servicios» es el de luz, agua e internet (su icono es un rayo): बिल, distinto a propósito de los servicios del
 * directorio de Weë Business. Las reseñas son समीक्षाएँ, como en Google Play y Google Maps, y no टिप्पणियाँ, que en Weë
 * son los comentarios. Los formatos de destino son marca + sustantivo (Instagram स्टोरी, Facebook पोस्ट, TikTok वीडियो),
 * y «Video de Instagram» es Instagram वीडियो, nunca «Reels».
 *
 * Los «…Goal» son lo que la persona le pide a Weë Brain: aparecen como su propio mensaje en la conversación y acaban
 * siendo el título del trabajo. En hindi se piden como se le pide algo a un asistente, en imperativo de cortesía y en
 * primera persona («मेरे बिज़नेस के नतीजों का विश्लेषण करें»); los que en español son un sustantivo o una pregunta se
 * quedan así. Ninguno depende del género de quien escribe: «qué vendo» es «क्या बेचना है» o «यह क्या बेचता है» (el
 * negocio), y «¿En qué estoy gastando de más?» es impersonal: «कहाँ ज़रूरत से ज़्यादा खर्च हो रहा है?». Cuando Weë
 * habla en primera persona («te ayudo», «lo preparo», «me encargo»), tampoco: «आपको मेरी मदद मिलेगी», «तैयारी मुझ पर
 * छोड़ दें», «बाकी मुझ पर छोड़ दें». El ejemplo de la bienvenida, «vendo postres desde casa», se dice sin verbo que
 * concuerde: «मेरा घर से मिठाइयाँ बेचने का बिज़नेस है»; y el de Create, «esta torta para el Día de la Madre», se trae
 * a la India: «दिवाली के लिए मिठाई का यह डिब्बा». Los clientes, sin plural masculino cuando no cuesta nada: «Qué
 * dicen tus clientes» es «आपके ग्राहकों का क्या कहना है». El inciso con raya del español va entre comas o paréntesis
 * (guía § 7): «{{idea}} (प्रोडक्ट: {{producto}})». El día va delante de la fecha y con coma, como lo escribe `Intl` en
 * hindi: «बुध, 30 सित॰».
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'मेरे सोशल मीडिया खाते',
  manageAccounts: 'खाते मैनेज करें',
  connected: 'कनेक्ट है',
  networkConnected: '{{red}} कनेक्ट है',
  connectAnother: 'कोई और खाता कनेक्ट करें',
  allConnected: 'आपके सभी खाते पहले से कनेक्ट हैं.',
  simulatedConnection: 'यह डेमो कनेक्शन है: जब प्लेटफ़ॉर्म आधिकारिक अनुमति देंगे, तब Weë सच में पोस्ट करेगा और जवाब देगा.',
  postCalendar: 'पोस्ट कैलेंडर',
  seeFullCalendar: 'पूरा कैलेंडर देखें',
  calendarGoal: 'इस हफ़्ते का मेरा पोस्ट कैलेंडर दिखाएँ और उसे व्यवस्थित करें',
  scheduleGoal: '{{dia}}, {{fecha}} के लिए एक पोस्ट शेड्यूल करें: {{publicacion}}',
  dayLabel: '{{dia}}, {{fecha}}',
  customerMessages: 'ग्राहकों के मैसेज',
  seeAllMessages: 'सभी देखें',
  messagesGoal: 'मेरे ग्राहकों के मैसेज का जवाब दें',
  reply: 'जवाब दें',
  replied: 'जवाब दिया गया',
  replyTo: '{{nombre}} को जवाब दें',
  repliedTo: '{{nombre}} को जवाब दिया गया',
  replyGoal: '{{red}} पर {{nombre}} को जवाब दें: “{{mensaje}}”',
  resultsThisWeek: 'इस हफ़्ते के नतीजे',
  statPosts: 'पोस्ट',
  statReach: 'लोगों तक पहुँच',
  statInteractions: 'इंटरैक्शन',
  statMessages: 'मिले मैसेज',
  onTrack: 'आपका बिज़नेस सही रास्ते पर है',
  onTrackNote: 'इस हफ़्ते इंटरैक्शन में 60% की बढ़ोतरी हुई. ऐसे ही जारी रखें!',
  seeDetailedAnalysis: 'पूरा विश्लेषण देखें',
  analysisGoal: 'इस हफ़्ते मेरे बिज़नेस के नतीजों का विश्लेषण करें',
  shortcutIdeas: 'आइडिया',
  shortcutIdeasGoal: 'मेरे बिज़नेस को आगे बढ़ाने के लिए आइडिया और रणनीति',
  shortcutMarketing: 'मार्केटिंग',
  shortcutMarketingGoal: 'मेरे बिज़नेस के लिए एक मार्केटिंग कैंपेन',
  shortcutSocial: 'सोशल मीडिया',
  shortcutSocialGoal: 'मेरे बिज़नेस के सोशल मीडिया के लिए कॉन्टेंट बनाएँ',
  shortcutAnalyze: 'विश्लेषण करें',
  shortcutAnalyzeGoal: 'मेरे बिज़नेस के नतीजों का विश्लेषण करें',
  shortcutDocuments: 'दस्तावेज़',
  shortcutDocumentsGoal: 'मेरे बिज़नेस के लिए एक दस्तावेज़ लिखें',
  shortcutSell: 'ज़्यादा बेचें',
  shortcutSellGoal: 'इस महीने मेरे बिज़नेस की बिक्री बढ़ाने में मदद करें',
  shortcutCareer: 'नौकरी और करियर',
  shortcutCareerGoal: 'मेरा CV और मेरी प्रोफ़ेशनल प्रोफ़ाइल बेहतर बनाएँ',
  yesterday: 'कल',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: 'अपना बिज़नेस बनाएँ, चलाएँ, प्रमोट करें और आगे बढ़ाएँ.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'अपना बिज़नेस बनाएँ और चलाएँ',
  modProductsHint: 'आपके प्रोडक्ट और उनकी कीमतें',
  modCreateHint: 'AI से कॉन्टेंट बनाएँ',
  modSocialHint: 'तैयार करें और हर जगह शेयर करें',
  modAnalyzeHint: 'अपने बिज़नेस को समझें',
  modGrowHint: 'मौके खोजें और आगे बढ़ें',
  modProfileHint: 'Weë पर आपका बिज़नेस',
  modPromoteHint: 'Weë के साथ ज़्यादा लोगों तक पहुँचें',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «सारांश» (resumen) y no «आपका बिज़नेस»: «Tu negocio» es el nombre de una de las cuentas de muestra. */
  overview: 'आपके बिज़नेस का सारांश',
  overviewEmpty: 'आपने अभी तक अपना बिज़नेस नहीं बनाया है.',
  overviewEmptyHint: 'अपने शब्दों में Weë को बताएँ, जैसे “मेरा घर से मिठाइयाँ बेचने का बिज़नेस है”, फिर इसे आकार देने में आपको मेरी मदद मिलेगी.',
  createBusiness: 'अपना बिज़नेस बनाएँ',
  createBusinessGoal: 'शुरू से मेरा बिज़नेस बनाएँ: नाम, क्या बेचना है, किसे और किस कीमत पर',
  editBusiness: 'अपना बिज़नेस एडिट करें',
  editBusinessGoal: 'मेरे बिज़नेस की जानकारी जाँचें और उसे बेहतर बनाएँ',
  businessInfo: 'बिज़नेस की जानकारी',
  businessInfoGoal: 'मेरे बिज़नेस की जानकारी व्यवस्थित करें: यह क्या बेचता है, किसे बेचता है और इसे दूसरों से अलग क्या बनाता है',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'मेरे बिज़नेस को किसी निवेशक के सामने पेश करने के लिए, बिज़नेस प्लान लिखें',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'इस हफ़्ते मुझे अपने बिज़नेस में क्या करना चाहिए?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'आपने अभी तक कोई प्रोडक्ट नहीं जोड़ा है.',
  productsEmptyHint: 'प्रोडक्ट की फ़ोटो अपलोड करें और Weë उसका नाम, विवरण और बिक्री के लिए टेक्स्ट लिख देगा.',
  addProduct: 'प्रोडक्ट जोड़ें',
  addProductGoal: 'एक प्रोडक्ट का पेज बनाएँ: नाम, विवरण, खूबियाँ और बिक्री के लिए टेक्स्ट',
  improveImage: 'फ़ोटो बेहतर बनाएँ',
  improveImageGoal: 'मेरे प्रोडक्ट की फ़ोटो बेहतर बनाएँ, ताकि वह ज़्यादा बिके',
  productsCount_one: '{{contador}} प्रोडक्ट',
  productsCount_other: '{{contador}} प्रोडक्ट',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'अपनी लागत डालें और Weë आपको कीमत का अंदाज़ा देगा.',
  pricingMaterials: 'मटीरियल',
  pricingPackaging: 'पैकेजिंग',
  pricingDelivery: 'डिलीवरी',
  pricingOther: 'अन्य लागत',
  pricingMargin: 'मनचाहा मार्जिन',
  pricingCost: 'अनुमानित लागत',
  pricingSuggested: 'सुझाई गई कीमत',
  pricingMarginResult: 'अनुमानित मार्जिन',
  pricingProfit: 'अनुमानित मुनाफ़ा',
  pricingNote: 'ये कीमतें सिर्फ़ जानकारी के लिए हैं, हिसाब-किताब या टैक्स की सलाह नहीं.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'वह सब, जिससे आपका कॉन्टेंट हमेशा आपका ही लगे.',
  brandLogo: 'लोगो',
  brandColors: 'रंग',
  brandTypography: 'फ़ॉन्ट',
  brandStyle: 'विज़ुअल स्टाइल',
  brandAvatar: 'प्रोफ़ाइल फ़ोटो',
  brandCover: 'कवर फ़ोटो',
  brandTemplates: 'कॉन्टेंट टेंप्लेट',
  brandGoal: 'मेरे बिज़नेस के ब्रांड के लिए {{que}} बनाएँ',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'बताएँ कि आपको क्या प्रमोट करना है, तैयारी मुझ पर छोड़ दें.',
  createPlaceholder: 'जैसे: मुझे दिवाली के लिए मिठाई का यह डिब्बा प्रमोट करना है…',
  createTypes: 'क्या बनाना है?',
  typeImage: 'इमेज',
  typeImageHint: 'प्रमोशन के लिए इमेज',
  typeVideo: 'वीडियो',
  typeVideoHint: 'छोटा वीडियो',
  typePost: 'पोस्ट',
  typePostHint: 'पोस्ट करने के लिए तैयार',
  typeCampaign: 'कैंपेन',
  typeCampaignHint: 'एक साथ कई चीज़ें',
  typeCopy: 'टेक्स्ट',
  typeCopyHint: 'विवरण, हैशटैग और कॉल टू एक्शन',
  typeGoal: 'मेरे बिज़नेस के लिए {{que}} बनाएँ: {{idea}}',
  formats: 'फ़ॉर्मैट चुनें',
  formatsHint: 'साइज़ का काम Weë संभालेगा. कहाँ पोस्ट करना है, यह आप चुनें.',
  formatTikTok: 'TikTok वीडियो',
  /* «Instagram वीडियो» y no «Reels»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram वीडियो',
  formatStory: 'Instagram स्टोरी',
  formatFacebookStory: 'Facebook स्टोरी',
  formatPost: 'Instagram पोस्ट',
  formatFeed: 'Facebook पोस्ट',
  formatWide: 'हॉरिज़ॉन्टल वीडियो',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'अपने शब्दों में बताएँ, बाकी मुझ पर छोड़ दें.',
  askPlaceholder: 'यहाँ अपनी बात लिखें…',
  askSend: 'Weë से पूछें',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'कॉन्टेंट बनाएँ',
  goalWithProduct: '{{idea}} (प्रोडक्ट: {{producto}})',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'एक बार बनाएँ. हर जगह शेयर करें.',
  share: 'शेयर करें',
  shareHint: 'आपके फ़ोन का शेयर मेन्यू खुलता है: जो ऐप चाहें, उसे चुनें.',
  shareToWee: 'Weë पर शेयर करें',
  shareWall: 'मेरा Wäll',
  shareCommunities: 'कम्यूनिटी',
  shareProfile: 'Business Profile',
  shareNothing: 'पहले कुछ बनाएँ, फिर उसे यहाँ से शेयर करें.',
  shareText: 'Weë Business से बनाया गया',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'अपना डेटा अपलोड करें',
  analyzeUploadHint: 'आपकी बिक्री और खर्चों वाली Excel, CSV या PDF फ़ाइल.',
  analyzeUploadGoal: 'मेरे बिज़नेस की बिक्री और खर्चों वाली फ़ाइल का विश्लेषण करें',
  analyzeInsights: 'आपके आँकड़े क्या कहते हैं',
  analyzeInsightsGoal: 'समझाएँ कि मेरे बिज़नेस की बिक्री में क्या चल रहा है',
  expenses: 'खर्च',
  expensesHint: 'लिखें कि आपका पैसा कहाँ जा रहा है.',
  expensesEmpty: 'आपने अभी तक कोई खर्च नहीं लिखा है.',
  addExpense: 'खर्च जोड़ें',
  expenseSupplies: 'कच्चा माल',
  expenseMarketing: 'मार्केटिंग',
  expenseDelivery: 'डिलीवरी',
  expenseStaff: 'स्टाफ़',
  expenseServices: 'बिल',
  expenseOther: 'अन्य',
  expensesAsk: 'कहाँ ज़रूरत से ज़्यादा खर्च हो रहा है?',
  expensesAskGoal: 'मेरे खर्च जाँचें और बताएँ कि कहाँ ज़रूरत से ज़्यादा खर्च हो रहा है',
  swot: 'SWOT विश्लेषण',
  swotHint: 'खूबियाँ, कमियाँ, मौके और खतरे.',
  swotGoal: 'मेरे बिज़नेस का SWOT विश्लेषण करें',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'आगे बढ़ने में मेरी मदद करें',
  helpMeGrowHint: 'Weë आपके बिज़नेस को देखकर बताता है कि आगे क्या करें.',
  helpMeGrowGoal: 'मेरे बिज़नेस को आगे बढ़ाने का प्लान, ठोस कदमों के साथ',
  opportunities: 'मौके',
  opportunitiesEmpty: 'बिक्री और कॉन्टेंट होने पर, मुझे जो मौके मिलेंगे, वे यहाँ दिखेंगे.',
  createPromotion: 'प्रमोशन बनाएँ',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'आपके ग्राहक कौन हैं और उन्हें क्या चाहिए.',
  customerInsightsGoal: 'मेरे आदर्श ग्राहक के बारे में बताएँ और यह भी कि उस पर कौन-से मैसेज असर करते हैं',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'और क्या बेचा जा सकता है या दूसरों से अलग कैसे दिखें.',
  businessIdeasGoal: 'मेरे बिज़नेस के लिए आइडिया दें और बताएँ कि मैं दूसरों से अलग कैसे दिखूँ',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Weë पर अभी आपके बिज़नेस का कोई पेज नहीं है.',
  profileEmptyHint: 'अपना बिज़नेस बनाने के बाद उसका पेज यहाँ होगा: आपका परिचय, आपके प्रोडक्ट और लोग आपसे कैसे संपर्क करें.',
  profileAbout: 'जानकारी',
  profileProducts: 'प्रोडक्ट',
  profilePosts: 'पोस्ट',
  profileContact: 'संपर्क',
  reviews: 'समीक्षाएँ',
  reviewsHint: 'आपके ग्राहकों का क्या कहना है और क्या बेहतर करना है.',
  reviewsGoal: 'मेरे बिज़नेस की समीक्षाओं का विश्लेषण करें और बताएँ कि क्या बेहतर करना है',
  reviewsRespond: 'जवाब लिखें',
  reviewsRespondGoal: 'मेरे बिज़नेस की एक समीक्षा का प्रोफ़ेशनल जवाब लिखें',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Weë Credits से ज़्यादा लोगों तक पहुँचें',
  promoteHint: 'Weë पर आपका कॉन्टेंट ज़्यादा लोगों को दिखाया जाता है. कुछ भी खर्च करने से पहले आपको कीमत दिखेगी.',
  promoteSoon: 'Weë पर प्रमोशन अभी शुरू नहीं हुआ है. शुरू होने पर, इसका पेमेंट आपके Credits से होगा और यह आपको यहीं दिखेगा.',
  promoteCredits: 'अपने Credits देखें',
  sampleProductName: 'प्रोडक्ट {{numero}}',
};
