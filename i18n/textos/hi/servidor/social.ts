/*
 * HINDI — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas (ver
 * `../../es/servidor/social.ts`). «ËContact» es marca y va en latino. La encuesta es «पोल» (m), como en `composer`.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'स्वीकार करने के लिए कोई अनुरोध नहीं है.',
  ecRelacionInvalida: 'यह अनुरोध सही नहीं है.',
  ecNoLaRecibiste: 'इसे वही स्वीकार कर सकता है, जिसे यह अनुरोध मिला है.',
  ecYaSonContactos: 'आप पहले से एक-दूसरे के ËContact में हैं.',
  ecIdentidadInvalida: 'यह प्रोफ़ाइल सही नहीं है.',
  ecIdentidadDesconocida: 'यह प्रोफ़ाइल मौजूद नहीं है.',
  ecIdentidadAjena: 'यह प्रोफ़ाइल आपकी नहीं है.',
  ecMismaPersona: 'आप अपनी ही प्रोफ़ाइल से नहीं जुड़ सकते.',
  ecYaExiste: 'इस प्रोफ़ाइल के साथ पहले से एक कनेक्शन है.',
  ecIniciaSesion: 'ËContact इस्तेमाल करने के लिए, साइन इन करें.',
  ecNoSeCompleto: 'यह काम पूरा नहीं हो सका. फिर से कोशिश करें.',
  ecFaltaPerfilPropio: 'जिस प्रोफ़ाइल से जुड़ना है, वह नहीं मिली.',
  ecFaltaPerfilAjeno: 'जिस प्रोफ़ाइल के साथ जुड़ना है, वह नहीं मिली.',
  ecFaltaPerfilQueAcepta: 'जिस प्रोफ़ाइल से स्वीकार करना है, वह नहीं मिली.',
  ecFaltaPerfilQueEnvia: 'अनुरोध भेजने वाले की प्रोफ़ाइल नहीं मिली.',
  encSinEncuesta: 'इस पोस्ट में कोई पोल नहीं है.',
  encInvalida: 'यह पोल सही नहीं है.',
  encAntigua: 'यह पोल Weë के पुराने वर्शन का है और अब इस पर वोट नहीं दिया जा सकता.',
  encOpcionInexistente: 'यह विकल्प इस पोल में नहीं है.',
  encCerrada: 'यह पोल खत्म हो चुका है.',
  encYaVotaste: 'आपने इस पोल में पहले ही वोट दिया है.',
  encPostNoExiste: 'यह पोस्ट अब मौजूद नहीं है.',
  encIniciaSesion: 'वोट करने के लिए, साइन इन करना होगा.',
  encFaltaPublicacion: 'पोस्ट की जानकारी नहीं मिली.',
  encFaltaOpcion: 'विकल्प की जानकारी नहीं मिली.',
  encNoSeRegistro: 'आपका वोट दर्ज नहीं हो सका. फिर से कोशिश करें.',
};
