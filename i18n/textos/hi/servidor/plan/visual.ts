/*
 * HINDI — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Lo que trae una opción va detrás de dos puntos o entre paréntesis, porque «एक नया प्रोडक्ट की» pediría el oblicuo. Las
 * piezas `…Alma…`, `…Donde…`, `…Matiz…` y `…Formato…` son trozos sueltos, sin verbo. Sin raya larga (guía § 7).
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'मैं “{{nombre}}” के लिए {{numero}} लोगो बनाऊँगा.',
  designExplicaLogoConNombreYAlma: 'मैं “{{nombre}}” के लिए {{numero}} लोगो बनाऊँगा ({{alma}}).',
  designAlmaSerious: 'गंभीर और भरोसेमंद एहसास के साथ',
  designAlmaModern: 'मॉडर्न एहसास के साथ',
  designAlmaClose: 'दोस्ताना और मज़ेदार एहसास के साथ',
  designAlmaLuxury: 'लग्ज़री एहसास के साथ',
  designAlmaNatural: 'नैचुरल एहसास के साथ',

  designExplicaAnuncio: 'मैं {{numero}} डिज़ाइन बनाऊँगा, इसके बारे में बताने के लिए: {{anuncio}}.',
  designExplicaAnuncioConDonde: 'मैं {{numero}} डिज़ाइन बनाऊँगा, {{donde}}, इसके बारे में बताने के लिए: {{anuncio}}.',
  designDondeFeed: 'Instagram या Facebook के लिए चौकोर फ़ॉर्मैट में',
  designDondeStory: 'स्टोरी के लिए वर्टिकल फ़ॉर्मैट में',
  designDondeWhatsapp: 'WhatsApp पर आसानी से शेयर होने वाले फ़ॉर्मैट में',
  designDondePrint: 'A4 फ़ॉर्मैट में, प्रिंट के लिए तैयार',

  designExplicaPropuestas: 'मैं {{numero}} डिज़ाइन बनाऊँगा: {{cosa}}.',
  designExplicaPropuestasConMatiz: 'मैं {{numero}} डिज़ाइन बनाऊँगा: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'मॉडर्न और साफ़-सुथरे लुक के साथ',
  designMatizLookNatural: 'नैचुरल लुक के साथ',
  designMatizLookLuxury: 'लग्ज़री लुक के साथ',
  designMatizLookFun: 'मज़ेदार और रंगीन लुक के साथ',
  designMatizLookIndustrial: 'इंडस्ट्रियल लुक के साथ',
  designMatizEraFuture: 'भविष्य वाले लुक के साथ',
  designMatizEraNow: 'आज के दौर वाले लुक के साथ',
  designMatizEraClassic: 'क्लासिक स्टाइल में',
  designMatizEraScifi: 'साइ-फ़ाई स्टाइल में',
  designMatizInoutOutside: 'बाहर से देखने पर',
  designMatizInoutInside: 'अंदर से देखने पर',
  designMatizInoutWide: 'दूर के पूरे नज़ारे में',
  designMatizDrawCartoon: 'कार्टून स्टाइल में',
  designMatizDrawReal: 'असली जैसे स्टाइल में',
  designMatizDrawGame: 'वीडियो गेम जैसे लुक के साथ',
  designMatizDrawPencil: 'पेंसिल ड्रॉइंग में',
  designMatizDrawCute: 'क्यूट लुक के साथ',

  designPasoConcepto: 'कॉन्सेप्ट तय करें',
  designPasoLogos: '{{numero}} लोगो बनाएँ',
  designPasoPropuestas: '{{numero}} डिज़ाइन बनाएँ',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'मैं आपकी फ़ोटो देखूँगा और उसे {{estilo}} स्टाइल में जीवंत बनाऊँगा: {{segundos}} सेकंड की एक क्लिप, शेयर करने के लिए तैयार.',

  studioExplicaVideo: 'मैं एक छोटी स्क्रिप्ट लिखूँगा, यह बनाऊँगा: {{video}} ({{segundos}} सेकंड, {{formato}}, {{estilo}} स्टाइल में), और नरेशन रिकॉर्ड करूँगा.',
  studioExplicaVideoPromo: 'मैं एक छोटी स्क्रिप्ट लिखूँगा, प्रमोशन के लिए {{segundos}} सेकंड का वीडियो बनाऊँगा ({{formato}}, {{estilo}} स्टाइल में), और नरेशन रिकॉर्ड करूँगा.',
  studioExplicaVideoMisRedes: 'मैं एक छोटी स्क्रिप्ट लिखूँगा, आपके सोशल मीडिया के लिए {{segundos}} सेकंड का वीडियो बनाऊँगा ({{formato}}, {{estilo}} स्टाइल में), और नरेशन रिकॉर्ड करूँगा.',
  studioVideoRedes: 'आपके सोशल मीडिया के लिए एक वीडियो',
  studioEstiloRitmo: 'अपनेपन और जोश से भरपूर',
  studioFormatoVertical: 'Instagram और TikTok के लिए वर्टिकल',
  studioFormatoHorizontal: 'YouTube के लिए हॉरिज़ॉन्टल',
  studioFormatoCuadrado: 'WhatsApp और Facebook के लिए चौकोर',
  studioDecisionRedes: 'मैं इसे आपके सोशल मीडिया के लिए बनाऊँगा',
  studioDecisionEstilo: 'मैंने अपनेपन और जोश से भरपूर स्टाइल चुना',
  studioDecisionVertical: 'मैं इसे वर्टिकल बनाऊँगा, जो Instagram और TikTok के लिए सही है',

  studioPasoMirarFoto: 'आपकी फ़ोटो देखें',
  studioPasoMovimiento: 'फ़ोटो को जीवंत बनाएँ',
  studioPasoGuion: '{{numero}} सीन की स्क्रिप्ट लिखें',
  studioPasoVideo: 'वीडियो जनरेट करें',
  studioPasoNarracion: 'नरेशन रिकॉर्ड करें',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'आपने जो बताया, उसके आधार पर मैं {{numero}} इमेज बनाऊँगा ({{como}}).',

  photoExplicaMejorarCalidad: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर उसकी क्वालिटी और रेज़ॉल्यूशन बेहतर करूँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaQuitarAlgo: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर वह हटाऊँगा जो आपको नहीं चाहिए ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaFondo: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर बैकग्राउंड बदलूँगा या हटाऊँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaRestaurar: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर उसे ठीक करूँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaRetoque: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर चेहरे को नैचुरल तरीके से रीटच करूँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaColorizar: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर उसमें रंग भरूँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaTransformar: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर उसे नया स्टाइल दूँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaSinAccion: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर उसकी क्वालिटी बेहतर करूँगा ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoExplicaAccion: 'पहले मैं आपकी फ़ोटो देखूँगा, फिर इस पर काम करूँगा: {{accion}} ({{como}}). बाकी सब वैसा ही रहेगा.',
  photoComoNatural: 'जितना हो सके उतना नैचुरल',
  photoDecisionCalidad: 'मैं क्वालिटी बेहतर करने से शुरू करूँगा',
  photoDecisionNatural: 'मैं इसे जितना हो सके उतना नैचुरल रखूँगा',
  photoDecisionNaturales: 'मैं इन्हें जितना हो सके उतना नैचुरल रखूँगा',

  photoPasoMirarFoto: 'फ़ोटो देखकर समझें कि उसमें क्या है',
  photoPasoImagenes: '{{numero}} इमेज बनाएँ',
  photoPasoMejorarFoto: 'फ़ोटो बेहतर करें',
  photoPasoMejorarCalidad: 'क्वालिटी और रेज़ॉल्यूशन बेहतर करें',
  photoPasoQuitarAlgo: 'कोई अनचाही चीज़ हटाएँ',
  photoPasoFondo: 'बैकग्राउंड बदलें या हटाएँ',
  photoPasoRestaurar: 'पुरानी फ़ोटो ठीक करें',
  photoPasoRetoque: 'चेहरे को नैचुरल तरीके से रीटच करें',
  photoPasoColorizar: 'ब्लैक एंड व्हाइट फ़ोटो में रंग भरें',
  photoPasoTransformar: 'इसे नया स्टाइल दें',

  /* La voz de quien habla: Weë dice «आपका ब्रांड» (ver el catálogo español). */
  designCosaMascota: 'आपके ब्रांड का मैस्कॉट',
};
