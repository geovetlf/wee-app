/*
 * HINDI — el panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo
 * administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Hindi técnico de administración, con los préstamos del oficio en devanagari:
 * «प्रोवाइडर», «फ़ॉलबैक चेन», «मार्जिन», «स्टेटस», «हेल्थ स्टेटस», «डिफ़ॉल्ट
 * वैल्यू», «रीफ़्रेश करें»; y la palabra hindi donde es la de Android: «चालू करें»
 * y «बंद करें» para activar y desactivar (y «चालू» / «बंद» en las insignias),
 * «कुंजी» para la clave de API (la insignia dice el estado, «कुंजी है» / «कुंजी
 * नहीं है», no calca «con clave»), «प्राथमिकता», «नीति» (como en «निजता नीति») y
 * «लागत». Los identificadores del motor (aiRouting, engineAdmin · setRouting,
 * `text.generate`), Firestore, USD y los nombres de los proveedores se copian tal
 * cual, en latino. «Precios de prueba» es «टेस्ट» (glosario § 11.6). El botón de
 * sembrar vive en Configuración («डिफ़ॉल्ट वैल्यू जोड़ें», `settings.seedDefaults`:
 * añade lo que falta y no borra nada), así que `seedDone` confirma con el mismo
 * verbo: «डिफ़ॉल्ट वैल्यू Firestore में जोड़ दी गईं».
 *
 * El margen lleva el % pegado a la cifra («{{margen}}%», guía § 7) y los
 * segundos, «सेकंड». `upToSeconds` y `pendingVerification` empiezan con « · »
 * porque la pantalla los pega detrás de `modelLine`. «No pude leer…» no habla en
 * primera persona: los errores del sistema van en pasiva, concordados con lo que
 * falla («स्टेटस नहीं पढ़ा जा सका», «बदलाव लागू नहीं किया जा सका»). `configFrom`
 * pone la posposición separada del hueco: «सेटिंग {{origen}} से ली गई है».
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'रीफ़्रेश करें',
  statusFailed: 'इंजन का स्टेटस नहीं पढ़ा जा सका. क्या सर्वर चालू है?',
  changeFailed: 'बदलाव लागू नहीं किया जा सका',

  adminOnly: 'सिर्फ़ एडमिन के लिए',
  adminOnlyNote: 'यह पैनल Weë टीम के लिए है. अगर आप टीम में हैं, तो टीम से कहें कि आपका खाता एडमिन के रूप में जोड़ दें.',

  settingsTitle: 'सेटिंग',
  settingsLine: 'कीमतें: {{precios}} · हर USD पर {{credits}} Credits · मार्जिन {{margen}}% · नीति: {{politica}} · आखिरी विकल्प के रूप में डेमो मोड: {{demo}}',
  pricesTest: 'टेस्ट',
  pricesReal: 'असली',
  yes: 'हाँ',
  no: 'नहीं',
  configFrom: 'सेटिंग {{origen}} से ली गई है.',
  sourceDefaults: 'कोड में दी गई डिफ़ॉल्ट वैल्यू',
  resetHealth: 'हेल्थ स्टेटस रीसेट करें',
  healthReset: 'हेल्थ स्टेटस रीसेट हो गया.',
  seedDone: 'डिफ़ॉल्ट वैल्यू Firestore में जोड़ दी गईं.',

  providers: 'प्रोवाइडर',
  priority: 'प्राथमिकता {{numero}}',
  enable: '{{proveedor}} चालू करें',
  disable: '{{proveedor}} बंद करें',
  withKey: 'कुंजी है',
  withoutKey: 'कुंजी नहीं है',
  active: 'चालू',
  inactive: 'बंद',
  pausedByFailures: 'गड़बड़ियों की वजह से रुका हुआ',
  recentFailures_one: 'हाल ही में {{contador}} गड़बड़ी',
  recentFailures_other: 'हाल ही में {{contador}} गड़बड़ियाँ',
  modelLine: '• {{id}} · क्वालिटी {{calidad}}/5 · स्पीड {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · {{segundos}} सेकंड तक',
  pendingVerification: ' · पुष्टि बाकी है',

  chains: 'फ़ॉलबैक चेन',
  policyLabel: '{{capacidad}} की नीति: {{politica}}',
  onlyDemo: 'सिर्फ़ डेमो मोड (अभी कोई असली प्रोवाइडर नहीं है)',
  editNote: 'किसी चेन का क्रम बदलने या कोई मॉडल तय करने के लिए, Firestore में aiRouting/{{capacidad}} एडिट करें या engineAdmin · setRouting इस्तेमाल करें.',

  policyQualityFirst: 'क्वालिटी पहले',
  policyBalanced: 'संतुलित',
  policyCostFirst: 'लागत पहले',

  modalityText: 'टेक्स्ट',
  modalityVision: 'विज़न',
  modalityImage: 'इमेज',
  modalityVideo: 'वीडियो',
  modalityVoice: 'आवाज़',
  modalityMusic: 'संगीत',
  modalityDoc: 'दस्तावेज़',
  rowSubtitle: 'प्रोवाइडर, फ़ॉलबैक चेन और सेटिंग (सिर्फ़ एडमिन के लिए)',
};
