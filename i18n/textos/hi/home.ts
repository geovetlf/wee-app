/*
 * HINDI — el Home: saludo, compositor, filtros, las filas de arriba y la
 * descripción de cada comunidad de la portada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El saludo es «नमस्ते, {{nombre}}». El compositor no pregunta «¿qué quieres?»
 * con «चाहते हैं», que tiene género: dice «आज क्या शेयर करना है?», el mismo
 * patrón que «आज क्या बनाना है?» del glosario (§ 11.1). «Destacado» es
 * «चुनिंदा», en la insignia, en la sección y en «चुनिंदा राय»; la sección no dice
 * «पोस्ट» porque la misma frase «Destacados» es también `weebiz.featured`, y en
 * toda la app se dice igual.
 * Las cifras de la tarjeta del tema del día llevan `{{cantidad}}` también en el
 * `_one`, que en hindi cubre el 0 y el 1 (§ 8): «जवाब» y «पसंद» no cambian y
 * «टिप्पणी» pasa a «टिप्पणियाँ». «Like» es «पसंद», nunca «लाइक» (glosario
 * § 11.2). «Categoría» es «कैटगरी», como en Android. `bannerOf`, `filterBy`,
 * `logoHome` y `searchHint` solo los oye el lector de pantalla.
 *
 * Las descripciones de las comunidades describen ESA comunidad —los memes
 * argentinos siguen siendo argentinos y el fútbol sigue siendo fútbol—, en el
 * hindi de las redes: préstamos en devanagari (यूट्यूबर, स्टार्टअप, मीम,
 * आउटफ़िट) y sin plural inglés en -्स (guía § 3: «मीम» y no «मीम्स»; «सलाह»,
 * «सुझाव» o «तरीके» en lugar de «टिप्स»). «IA» e «Inteligencia Artificial» son
 * «AI» (glosario § 11.1); «destino», «मंज़िल». Las preguntas a quien lee van sin
 * género: «आप किसकी तरफ़ हैं?», «आपका किस पर विश्वास है?», «आज कहाँ चलें?». Y
 * «Sé el primero» no puede ir en masculino: «सबसे पहले आप … करें». «Sin
 * juicios» es «कोई आपको जज नहीं करेगा», como se dice en la calle.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'नमस्ते, {{nombre}}',
  greetingGuest: 'नमस्ते',
  composerPlaceholder: 'आज क्या शेयर करना है?',
  seeAll: 'सभी देखें →',
  createWeel: 'Weël बनाएँ',
  openMenu: 'मेन्यू खोलें',
  search: 'खोजें',
  logoHome: 'Weë, सबसे ऊपर जाएँ',
  filterBy: 'फ़िल्टर: {{nombre}}',
  filterAll: 'सभी',
  bannerOf: '{{total}} में से बैनर {{numero}}',
  weelSample: 'Weël का उदाहरण: {{titulo}}',
  exploreCommunities: 'कम्यूनिटी एक्सप्लोर करें',
  moreCategories: 'और कैटगरी देखें',
  popularCommunities: 'लोकप्रिय कम्यूनिटी',
  seeAllOf: 'सभी देखें',
  topicOfTheDay: 'आज का विषय',
  heatedDebate: 'गरमागरम बहस',
  featuredOpinion: 'चुनिंदा राय',
  featured: 'चुनिंदा',
  allCommunities: 'सभी',
  postsLoadFailed: 'पोस्ट लोड नहीं हो सकीं',
  searchHint: 'लोगों, हैशटैग और पोस्ट की खोज खुलती है',
  featuredItem: 'चुनिंदा',
  communityDescFilmAnimation: 'फ़िल्ममेकिंग, शॉर्ट फ़िल्में, ऐनिमेशन और AI से बने किरदार. अपना प्रोसेस दिखाएँ और दूसरों से सीखें.',
  communityDescArtCreativity: 'AI की मदद से डिजिटल आर्ट, इलस्ट्रेशन, फ़ोटोग्राफ़ी और डिज़ाइन. प्रॉम्प्ट, स्टाइल और नतीजे शेयर करें.',
  communityDescCreatorsInfluencers: 'AI के साथ काम करने वाले कॉन्टेंट क्रिएटर, यूट्यूबर, टिकटॉकर और इंस्टाग्रामर.',
  communityDescBusinessEntrepreneurship: 'उद्यमी, स्टार्टअप, मार्केटिंग और AI से जुड़े बिज़नेस के मौके.',
  communityDescTechAi: 'AI से जुड़ी खबरें, मॉडल, टूल और चर्चा.',
  communityDescGamingVirtualWorlds: 'AI से बने वीडियो गेम, किरदार, वर्चुअल दुनिया और डिजिटल अनुभव.',
  communityDescEducationLearning: 'सीखने और सिखाने में AI का इस्तेमाल करने वाले छात्र, शिक्षक और शोधकर्ता.',
  communityDescFutureSociety: 'AI के दौर में काम, पेशों और समाज का भविष्य. खुली बहस.',
  communityDescNews: 'दुनिया में क्या हो रहा है, कम्यूनिटी की नज़र से. बहस, विश्लेषण और राय, सब कुछ लाइव.',
  communityDescMarketplace: 'कम्यूनिटी के साथ प्रोडक्ट और सेवाएँ खरीदें, बेचें और उनकी अदला-बदली करें.',
  communityDescRelationshipsLove: 'रिश्तों, डेटिंग और प्यार से जुड़ी हर बात पर कहानियाँ, सलाह और अनुभव.',
  communityDescFinanceMoney: 'बचत के तरीके, निवेश और अपने पैसे को समझदारी से संभालने की हर बात.',
  communityDescWork: 'काम के अनुभव, करियर से जुड़ी सलाह, नौकरी की तलाश और ऑफ़िस की ज़िंदगी.',
  communityDescHealthWellbeing: 'बेहतर ज़िंदगी के लिए सेहत, फ़िटनेस, पोषण और मानसिक स्वास्थ्य से जुड़ी सलाह.',
  communityDescEntertainment: 'फ़िल्में, सीरीज़, संगीत, मीम और वह सब जो रोज़ आपका मनोरंजन करता है.',
  communityDescGamingTech: 'गेमिंग और टेक की दुनिया की हर बात: वीडियो गेम, गैजेट और रिव्यू.',
  communityDescEducationCareer: 'पढ़ाई और करियर में आगे बढ़ने के लिए सब कुछ: यूनिवर्सिटी, कोर्स और स्कॉलरशिप.',
  communityDescSports: 'फ़ुटबॉल, बास्केटबॉल, टेनिस और हर खेल. नतीजे, राय और जुनून.',
  communityDescConfessions: 'जो बातें किसी से कही नहीं जातीं, उन्हें शेयर करने की सुरक्षित जगह. यहाँ कोई आपको जज नहीं करेगा.',
  communityDescHotDebates: 'विवादित मुद्दे, बँटी हुई राय और गरमागरम बहस. आप किसकी तरफ़ हैं?',
  communityDescTravelPlaces: 'शानदार मंज़िलें, यात्रा के सुझाव, अनुभव और कम्यूनिटी की सिफ़ारिशें.',
  communityDescFoodCooking: 'रेसिपी, रेस्टोरेंट, स्ट्रीट फ़ूड और अच्छे खाने के शौकीनों के लिए सब कुछ.',
  communityDescFashionStyle: 'ट्रेंड, आउटफ़िट, स्टाइल की सलाह और फ़ैशन की दुनिया की हर बात.',
  communityDescSpirituality: 'ध्यान, माइंडफ़ुलनेस, व्यक्तिगत विकास और आध्यात्मिक जुड़ाव.',
  communityDescAnimeManga: 'एनीमे, मंगा, कॉस्प्ले और पूरा ओटाकू कल्चर. आपका पसंदीदा एनीमे कौन-सा है?',
  communityDescCrypto: 'बिटकॉइन, ऑल्टकॉइन, DeFi, NFT और क्रिप्टो की पूरी दुनिया. DYOR (खुद रिसर्च करें).',
  communityDescKpopKdrama: 'आइडल, ड्रामा, कमबैक और कोरियाई पॉप कल्चर की हर बात.',
  communityDescEsoteric: 'ज्योतिष, टैरो, ऊर्जा और ब्रह्मांड के रहस्य. आपका किस पर विश्वास है?',
  communityDescPoeticAction: 'कविता, शायरी, गानों के बोल और स्ट्रीट आर्ट. अपने दिल की बात शब्दों में कहें.',
  communityDescAiTech: 'AI, इनोवेशन, स्टार्टअप और टेक्नोलॉजी का भविष्य.',
  communityDescEventsOutings: 'पार्टी, कॉन्सर्ट, मीटअप और इवेंट. आज कहाँ चलें?',
  communityDescBusinessInvesting: 'उद्यमिता, निवेश, बिज़नेस रणनीतियाँ और नए मौके.',
  communityDescBarsRestaurants: 'सबसे अच्छे बार, रेस्टोरेंट, ब्रूअरी और बाहर खाने की बेहतरीन जगहें.',
  communityDescBeatles: 'इतिहास के सबसे बड़े बैंड की हर बात. एल्बम, सफ़र और विरासत.',
  communityDescTarotReading: 'टैरो रीडिंग, कार्ड के मतलब, आर्काना और आपकी राह के लिए आध्यात्मिक मार्गदर्शन.',
  communityDescGrandmaRecipes: 'पीढ़ी-दर-पीढ़ी चली आ रही घरेलू रेसिपी. दिल से बना खाना.',
  communityDescArgentineMemes: 'अर्जेंटीना के सबसे अच्छे मीम. वहाँ का अपना मज़ाकिया अंदाज़, ताज़ा खबरें और पॉप कल्चर.',
  communityDescTrueCrimeLatino: 'लैटिन अमेरिका के असली केस, अनसुलझे रहस्य और क्राइम की सच्ची कहानियाँ.',
  communityDescPlantsGarden: 'बागवानी की सलाह, पौधों की देखभाल, सक्युलेंट और आपके बगीचे के लिए सब कुछ.',
  communityDescRockNacional: 'अर्जेंटीना और लैटिन अमेरिका का रॉक. बैंड, एल्बम, लाइव शो और पुरानी यादें.',
  communityDescCatLovers: 'हमारी प्यारी बिल्लियों से जुड़ी फ़ोटो, वीडियो, सलाह और हर बात.',
  communityDescDefault: 'कम्यूनिटी के साथ शेयर करने, चर्चा करने और जुड़ने की जगह.',
  feedEmptyTitle: 'सबसे पहले आप पोस्ट करें!',
  feedEmptyHint: 'ऊपर वाले बॉक्स में लिखकर अपनी पहली पोस्ट बनाएँ.',
  wallEmptyTitle: 'अभी तक कोई पोस्ट नहीं है',
  wallEmptyHint: 'AI से बनी कोई चीज़ सबसे पहले आप शेयर करें.',
  wallFilteredTitle: 'इन फ़िल्टर के साथ कुछ नहीं मिला',
  wallFilteredHint: 'दूसरे सेक्शन आज़माएँ या खुद कुछ शेयर करें.',
  answersCount_one: '{{cantidad}} जवाब',
  answersCount_other: '{{cantidad}} जवाब',
  likesCount_one: '{{cantidad}} पसंद',
  likesCount_other: '{{cantidad}} पसंद',
  commentsCount_one: '{{cantidad}} टिप्पणी',
  commentsCount_other: '{{cantidad}} टिप्पणियाँ',
};
