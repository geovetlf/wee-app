/*
 * HINDI — Moderación: denunciar una publicación, un comentario o un perfil desde cualquier sitio
 * de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es «रिपोर्ट करें» y el reporte, «रिपोर्ट» (f), como en Android y WhatsApp (glosario
 * § 11.2). La confirmación dice solo que la रिपोर्ट se RECIBIÓ —«रिपोर्ट मिल गई», el patrón de la
 * guía (§ 10)—: nunca que se revisará ni que se quitará nada. Los motivos van en lenguaje
 * corriente, como en Instagram en hindi («स्कैम या धोखाधड़ी», «उत्पीड़न या धमकाना»); «Contenido»
 * es «कॉन्टेंट», como en YouTube, y un motivo es «वजह». La suplantación se dice como lo que es,
 * «किसी और होने का दिखावा», sin término legal. Quien denuncia no recibe género: ergativo («आपने
 * इसे पहले ही रिपोर्ट किया है», «आपने … भेजी हैं»). Weë no concuerda con nada en `successBody`
 * («Weë को सुरक्षित रखने में»). Los errores siguen el patrón de la guía: qué pasó, en pasiva, y
 * «फिर से कोशिश करें».
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'रिपोर्ट करें',
  subtitle: 'हमें बताएँ कि इस कॉन्टेंट में क्या गड़बड़ है.',
  chooseReason: 'कोई वजह चुनें',
  send: 'रिपोर्ट भेजें',
  sending: 'रिपोर्ट भेजी जा रही है…',
  reasonSpam: 'स्पैम',
  reasonHarassment: 'उत्पीड़न या धमकाना',
  reasonHate: 'नफ़रत या भेदभाव',
  reasonSexual: 'यौन कॉन्टेंट',
  reasonViolence: 'हिंसा',
  reasonScam: 'स्कैम या धोखाधड़ी',
  reasonImpersonation: 'किसी और होने का दिखावा',
  reasonIllegal: 'गैर-कानूनी कॉन्टेंट',
  reasonSelfHarm: 'खुद को नुकसान पहुँचाना या आत्महत्या',
  reasonOther: 'कोई और वजह',
  successTitle: 'रिपोर्ट मिल गई',
  successBody: 'Weë को सुरक्षित रखने में मदद करने के लिए धन्यवाद.',
  duplicateTitle: 'आपने इसे पहले ही रिपोर्ट किया है',
  duplicateBody: 'इस कॉन्टेंट के बारे में आपकी रिपोर्ट हमें पहले ही मिल चुकी है.',
  errorTitle: 'आपकी रिपोर्ट नहीं भेजी जा सकी.',
  errorBody: 'फिर से कोशिश करें.',
  errorOffline: 'इंटरनेट कनेक्शन नहीं है. फिर से कोशिश करें.',
  errorRateLimited: 'आपने एक के बाद एक कई रिपोर्ट भेजी हैं. कुछ देर बाद फिर से कोशिश करें.',
  errorUnavailable: 'यह कॉन्टेंट अब उपलब्ध नहीं है.',
};
