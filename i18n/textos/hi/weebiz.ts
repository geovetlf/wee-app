/*
 * HINDI — Weë Biz: el directorio, el perfil de un negocio, sus productos y su alta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un negocio, su especialidad, su descripción, sus productos y sus
 * reseñas los escribió una persona: no pasan por aquí, entran por hueco.
 *
 * «Negocio» es बिज़नेस (m, invariable), la palabra del glosario (§ 11.1), y
 * «Weë Biz» se queda en latino con la posposición aparte («Weë Biz पर»).
 * «Reseña» es समीक्षा (f; pl. समीक्षाएँ) y la nota con estrellas, रेटिंग (f): son
 * las palabras con las que Google Maps escribe las reseñas de un negocio
 * («समीक्षा लिखें», «रेटिंग या समीक्षा जोड़ना»). «Tu opinión» es आपकी राय.
 * «Categoría» es कैटगरी (f, invariable), como la escribe Android. «Negocio
 * verificado» sigue a Google, que llama पुष्टि a la verificación (Android,
 * YouTube, Business Profile), y no al préstamo «वेरिफ़ाइड».
 *
 * «Registrar un negocio» es जोड़ना, como el «अपना बिज़नेस जोड़ें» de Google Maps:
 * por eso el botón del directorio, el título del alta, su botón final y el aviso
 * de después dicen जोड़ें / जोड़ा गया.
 *
 * Lo que el español repite en otros módulos se dice con las mismas palabras:
 * «Descripción» es विवरण, como en `communities` y en Android; «Acerca de», जानकारी, y
 * «Reseñas», समीक्षाएँ, como en `business`; «Destacados», चुनिंदा, y «Ver más
 * categorías», como en `home`; los permisos, como en `composer` («अनुमति चाहिए»,
 * «Weë को आपकी गैलरी की अनुमति चाहिए.»). «Seguir» es फ़ॉलो करें: el «Seguir» de
 * `studio` es un movimiento de cámara y allí se dice otra cosa, a propósito.
 *
 * Las categorías se pintan en una rejilla de cuatro por fila y en UNA línea: van
 * cortas, como se leen en un letrero (सेवाएँ, दुकानें, खाना, सेहत…). «Servicios
 * Técnicos» es मरम्मत (electricistas, fontaneros), «Legal» es «कानूनी सलाह» y
 * «Automotriz», गाड़ियाँ. En firstInCategory el hueco va delante de कैटगरी
 * («{{categoria}} कैटगरी में»): un nombre en -ा como खाना cambia de forma delante
 * de una posposición, y un hueco no puede. «Sé el primero» es «पहले व्यक्ति बनें»,
 * que concuerda con व्यक्ति y no con quien lo lee.
 *
 * «Ej:» es «जैसे:», y los ejemplos son indios (मसाला डोसा, शर्मा स्वीट हाउस,
 * जयपुर), como hicieron el sueco y el turco con los suyos; las pistas de
 * especialidad también (बिरयानी, ट्यूशन, ज्योतिष…), con «…» de un carácter.
 * Esas pistas se leen detrás de «जैसे:» (specialityPlaceholder), así que son
 * ejemplos, también la de «Otros» (टेलर, लॉन्ड्री, प्रिंटिंग…) en vez de la orden
 * del español («Describe tu negocio...»), que detrás de «जैसे:» no se entiende.
 * La de por defecto solo saldría con una categoría desconocida —hoy todas tienen
 * la suya— y se queda como en español. «DJ» va en latino, como toda sigla
 * (§ 3 (c)). «Link externo» es «वेबसाइट या लिंक»: así lo pide un formulario
 * indio, y es lo que enseña su ejemplo.
 *
 * `created` sigue al español, que aún promete «cambiar a tu perfil de negocio
 * desde el menú» aunque el Perfil Biz se eliminó el 2026-09-19: se tradujo tal
 * cual para no separarse de los demás idiomas, y queda avisado. Ese perfil se
 * escribe «अपने बिज़नेस की प्रोफ़ाइल», y no «बिज़नेस प्रोफ़ाइल», para que no se
 * lea como el módulo Business Profile de Weë Business, que no se traduce.
 */
export const weebiz: typeof import('../es/weebiz').weebiz = {
  noBusinesses: 'कोई बिज़नेस नहीं मिला',
  searchPlaceholder: 'बिज़नेस खोजें…',
  categories: 'कैटगरी',
  moreCategories: 'और कैटगरी देखें',
  featured: 'चुनिंदा',
  newBusinesses: 'नए बिज़नेस',
  registerMine: 'अपना बिज़नेस जोड़ें',
  noneYet: 'अभी तक कोई बिज़नेस नहीं',
  notFound: 'बिज़नेस नहीं मिला',
  followers: 'फ़ॉलोअर',
  reviews: 'समीक्षाएँ',
  verified: 'पुष्टि किया गया बिज़नेस',
  about: 'जानकारी',
  products: 'प्रोडक्ट',
  addProduct: 'प्रोडक्ट जोड़ें',
  writeReview: 'समीक्षा लिखें',
  noReviewsYet: 'अभी तक कोई समीक्षा नहीं',
  leaveReview: 'समीक्षा लिखें',
  yourReview: 'आपकी समीक्षा',
  rating: 'रेटिंग',
  yourOpinion: 'आपकी राय',
  reviewPlaceholder: 'अपना अनुभव बताएँ…',
  sendReview: 'समीक्षा भेजें',
  chatFailed: 'चैट नहीं खोली जा सकी.',
  linkFailed: 'लिंक नहीं खोला जा सका.',
  requiredTitle: 'यह फ़ील्ड ज़रूरी है',
  opinionRequired: 'अपनी राय लिखें.',
  reviewFailed: 'समीक्षा नहीं भेजी जा सकी.',
  deleteReviewTitle: 'समीक्षा मिटाएँ',
  deleteReviewConfirm: 'क्या आपको अपनी समीक्षा मिटानी है?',
  notAvailable: 'उपलब्ध नहीं',
  noProductsYet: 'अभी तक कोई प्रोडक्ट नहीं',
  addFirstProduct: 'अपना पहला प्रोडक्ट या सेवा जोड़ें.',
  addPhoto: 'फ़ोटो जोड़ें',
  nameRequired: 'नाम *',
  namePlaceholder: 'जैसे: मसाला डोसा',
  price: 'कीमत',
  currency: 'मुद्रा',
  description: 'विवरण',
  descriptionPlaceholder: 'प्रोडक्ट या सेवा के बारे में बताएँ…',
  permissionTitle: 'अनुमति चाहिए',
  galleryPermission: 'Weë को आपकी गैलरी की अनुमति चाहिए.',
  productNameRequired: 'प्रोडक्ट का नाम डालें.',
  productSaveFailed: 'प्रोडक्ट सेव नहीं किया जा सका.',
  deleteProductTitle: 'प्रोडक्ट मिटाएँ',
  deleteProductConfirm: 'क्या आपको “{{nombre}}” मिटाना है?',
  logo: 'लोगो',
  addLogo: 'लोगो जोड़ें',
  businessNameRequired: 'बिज़नेस का नाम *',
  businessNamePlaceholder: 'जैसे: शर्मा स्वीट हाउस',
  categoryRequired: 'कैटगरी *',
  speciality: 'खासियत',
  businessDescriptionPlaceholder: 'लोगों को अपने बिज़नेस के बारे में बताएँ…',
  location: 'जगह',
  locationPlaceholder: 'जैसे: जयपुर, राजस्थान',
  externalLink: 'वेबसाइट या लिंक',
  externalLinkPlaceholder: 'जैसे: www.sharmasweethouse.in',
  signInFirst: 'पहले साइन इन करें.',
  businessNameMissing: 'अपने बिज़नेस का नाम डालें.',
  categoryMissing: 'कोई कैटगरी चुनें.',
  updated: 'आपके बिज़नेस की जानकारी अपडेट हो गई है.',
  createdTitle: 'बिज़नेस जोड़ा गया',
  created: 'आपका बिज़नेस अब Weë Biz पर है. मेन्यू से आप अपने बिज़नेस की प्रोफ़ाइल पर स्विच कर सकते हैं.',
  viewProfile: 'प्रोफ़ाइल देखें',
  saveFailed: 'बिज़नेस सेव नहीं किया जा सका.',
  catProfessionalServices: 'सेवाएँ',
  catStores: 'दुकानें',
  catFood: 'खाना',
  catBeauty: 'ब्यूटी',
  catHealth: 'सेहत',
  catCreators: 'क्रिएटर',
  catHome: 'घर',
  catTech: 'टेक्नोलॉजी',
  catTechnicalServices: 'मरम्मत',
  catCreatives: 'क्रिएटिव',
  catCompanies: 'कंपनियाँ',
  catAutomotive: 'गाड़ियाँ',
  catEducation: 'शिक्षा',
  catTravel: 'यात्रा',
  catPets: 'पालतू जानवर',
  catEvents: 'इवेंट',
  catFinance: 'फ़ाइनेंस',
  catLegal: 'कानूनी सलाह',
  catSpirituality: 'अध्यात्म',
  catOther: 'अन्य',
  firstInCategory: '{{categoria}} कैटगरी में अपना बिज़नेस जोड़ने वाले पहले व्यक्ति बनें.',
  editBusinessTitle: 'बिज़नेस एडिट करें',
  registerBusinessTitle: 'बिज़नेस जोड़ें',
  saveChanges: 'बदलाव सेव करें',
  createBusiness: 'बिज़नेस जोड़ें',
  specialityPlaceholder: 'जैसे: {{ejemplos}}',
  specialityNeedsCategory: 'पहले कैटगरी चुनें',
  specialityHintProfessionalServices: 'कंसल्टिंग, कोचिंग…',
  specialityHintStores: 'कपड़े, मोबाइल, एक्सेसरी…',
  specialityHintFood: 'बिरयानी, बर्गर, मिठाई…',
  specialityHintBeauty: 'सैलून, स्पा, मेकअप…',
  specialityHintHealth: 'डाइट, काउंसलिंग, जिम…',
  specialityHintCreators: 'स्ट्रीमर, ब्लॉगर, एजुकेटर…',
  specialityHintHome: 'किराया, सजावट, खरीद-बिक्री…',
  specialityHintTech: 'वेब डेवलपमेंट, मार्केटिंग, AI…',
  specialityHintTechnicalServices: 'इलेक्ट्रीशियन, प्लंबर…',
  specialityHintCreatives: 'फ़ोटोग्राफ़ी, डिज़ाइन, वीडियो…',
  specialityHintCompanies: 'स्टार्टअप, एजेंसी, ब्रांड…',
  specialityHintAutomotive: 'गैराज, स्पेयर पार्ट, कार वॉश…',
  specialityHintEducation: 'कोर्स, अकादमी, ट्यूशन…',
  specialityHintTravel: 'टूर, होटल, गाइड…',
  specialityHintPets: 'पशु डॉक्टर, देखभाल, गोद लेना…',
  specialityHintEvents: 'DJ, शो, एंकरिंग…',
  specialityHintFinance: 'निवेश, बीमा, क्रिप्टो…',
  specialityHintLegal: 'वकील, लॉ फ़र्म…',
  specialityHintSpirituality: 'टैरो, मेडिटेशन, ज्योतिष…',
  specialityHintOther: 'टेलर, लॉन्ड्री, प्रिंटिंग…',
  specialityHintDefault: 'अपनी खासियत बताएँ…',
  editProductTitle: 'प्रोडक्ट एडिट करें',
  newProductTitle: 'नया प्रोडक्ट',
  priceOnRequest: 'कीमत पूछें',
  follow: 'फ़ॉलो करें',
  following: 'फ़ॉलोइंग',
  manageProducts: 'मैनेज करें',
  seeAllProducts: 'सभी देखें',
  reviewsCount: 'समीक्षाएँ ({{cantidad}})',
  directoryEmpty: 'यह Weë की बिज़नेस डायरेक्टरी है.\nजल्द ही यहाँ बिज़नेस दिखेंगे.',
};
