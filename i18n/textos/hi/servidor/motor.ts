/*
 * HINDI — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los errores van en pasiva (docs/I18N-HINDI.md § 2). «No te cobré» es «आपके Credits नहीं काटे गए» (§ 11.7). `{{archivo}}`
 * se rellena con «दस्तावेज़» u «ऑडियो», los dos masculinos, y por eso «यह {{archivo}} आपका नहीं है» concuerda siempre.
 * La toma es «टेक», el plano «शॉट» y la producción «प्रोडक्शन» (como `filmmaker`). Weë no nombra proveedores.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'आपके अनुरोध में कुछ कमी है. उसे जाँचें और फिर से कोशिश करें.',
  unauthorized: 'Weë के साथ कुछ बनाने के लिए, साइन इन करें.',
  accountRequired: 'Weë AI के साथ कॉन्टेंट बनाने के लिए, साइन इन करें या अपना अकाउंट बनाएँ.',
  providerError: 'इस बार आपकी रचना पूरी नहीं हो सकी. आपके Credits नहीं काटे गए. थोड़ी देर बाद फिर से कोशिश करें.',
  generationFailed: 'आपकी रचना पूरी नहीं की जा सकी. आपके Credits नहीं काटे गए. फिर से कोशिश करें.',
  timeout: 'बहुत ज़्यादा समय लग रहा था, इसलिए इसे रोक दिया गया. आपके Credits नहीं काटे गए. फिर से कोशिश करें.',
  rateLimited: 'आपने एक के बाद एक बहुत सारी रचनाएँ बनाई हैं. आपके Credits नहीं काटे गए. थोड़ी देर रुककर फिर से कोशिश करें.',
  duplicate: 'यह रचना पहले से बन रही है.',
  notAvailable: 'यह सुविधा अभी उपलब्ध नहीं है.',
  inputRejected: 'इस फ़ोटो या वीडियो का इस्तेमाल नहीं किया जा सका: असली चेहरे और इस तरह का कॉन्टेंट स्वीकार नहीं किया जाता. कोई दूसरी इमेज या ब्यौरा आज़माएँ.',
  faltaCampo: 'कृपया यह जोड़ें: {{campo}}.',
  revisaCampo: 'यह जाँचें: {{campo}}. इसमें 1 से {{max}} अक्षर होने चाहिए.',
  campoMensaje: 'आपका मैसेज',
  campoDescripcionVideo: 'वीडियो का ब्यौरा',
  conversacionNoEncontrada: 'यह बातचीत नहीं मिली.',
  sinPlan: 'इस काम का अभी कोई प्लान नहीं है.',
  sinUnPlan: 'इस काम के लिए अभी कोई प्लान तैयार नहीं है.',
  yaTienePlan: 'इस काम का प्लान पहले से बना हुआ है.',
  subeFoto: 'एक फ़ोटो अपलोड करें, ताकि Weë उस पर काम कर सके.',
  trabajoNoEncontrado: 'यह काम नहीं मिला.',
  trabajoAjeno: 'यह काम आपका नहीं है.',
  experienciaDesconocida: 'अनजान एक्सपीरियंस.',
  faltaTrabajo: 'काम की जानकारी नहीं मिली.',
  intentoSinTiempo: 'इस कोशिश में समय खत्म हो गया, इसलिए आपके Credits वापस कर दिए गए. आप फिर से कोशिश कर सकते हैं.',
  fotoDireccion: 'फ़ोटो का लिंक सही नहीं है.',
  fotoSubir: 'इस्तेमाल करने से पहले, फ़ोटो Weë पर अपलोड करनी होगी.',
  fotoAjena: 'यह फ़ोटो आपकी नहीं है.',
  archivoSube: '{{archivo}} अपलोड करें, ताकि Weë उसे पढ़ सके.',
  archivoDireccion: '{{archivo}} का लिंक सही नहीं है.',
  archivoSubir: 'इस्तेमाल करने से पहले, {{archivo}} Weë पर अपलोड करना होगा.',
  archivoAjeno: 'यह {{archivo}} आपका नहीं है.',
  archivoDocumento: 'दस्तावेज़',
  archivoAudio: 'ऑडियो',
  sinTiempoAntes: 'शुरू होने से पहले ही समय खत्म हो गया. आपके Credits नहीं काटे गए.',
  sinProveedor: 'इस काम के लिए अभी कोई AI उपलब्ध नहीं है. बाद में फिर से कोशिश करें.',
  noDisponibleActualmente: 'यह सुविधा फ़िलहाल उपलब्ध नहीं है.',
  noDisponibleAhora: 'यह सुविधा इस समय उपलब्ध नहीं है. थोड़ी देर बाद फिर से कोशिश करें.',
  noDisponibleOpciones: 'चुने गए विकल्पों के साथ यह सुविधा उपलब्ध नहीं है. दूसरे विकल्प आज़माएँ.',
  describeVideo: 'बताएँ कि आपको कैसा वीडियो बनाना है.',
  creacionTerminada: 'यह रचना पूरी हो चुकी है और दोबारा नहीं बनाई जाएगी. यह आपको अपनी रचनाओं में मिलेगी.',
  tomaInvalida: 'यह टेक सही नहीं है.',
  planoInvalido: 'यह शॉट सही नहीं है.',
  produccionNoEncontrada: 'यह प्रोडक्शन नहीं मिला.',
  tomaNoGenerable: 'यह टेक इस तरह जनरेट नहीं किया जा सकता.',
  creacionNoEncontrada: 'यह रचना नहीं मिली.',
  debesIniciarSesion: 'आपको साइन इन करना होगा',
};
