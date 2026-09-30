/*
 * HINDI — Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la
 * persona apartó para verlo otra vez.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «सेव की गई पोस्ट» (glosario § 11.2), como «सेव की गई फ़ोटो» de
 * Google Fotos: «पोस्ट» es femenino e invariable, así que el mismo sintagma vale
 * para una y para muchas («… लोड नहीं हो सकीं»). El icono de la publicación se
 * sigue llamando «बुकमार्क», que es lo que se ve; lo descartado en el glosario
 * es llamar así a la sección. «Prompt» es «प्रॉम्प्ट» y «tutoriales»,
 * «ट्यूटोरियल»: el plural lo pone la gramática hindi, no una -s. «Explorar el
 * Home» es «होम एक्सप्लोर करें». La instrucción sigue «…ने के लिए, …» (§ 2) y el
 * estado vacío va en ergativo, que no depende de quién lo lea.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'सेव की गई पोस्ट',
  empty: 'आपने अभी तक कुछ भी सेव नहीं किया है',
  exploreHome: 'होम एक्सप्लोर करें',
  loadFailed: 'आपकी सेव की गई पोस्ट लोड नहीं हो सकीं',
  emptyHint: 'प्रॉम्प्ट, ट्यूटोरियल और रचनाएँ बाद में फिर से देखने के लिए, पोस्ट के बुकमार्क पर टैप करके उन्हें सेव करें.',
};
