/*
 * HINDI — el menú ☰: sus entradas, las dos caras del perfil y la salida. Los nombres de Weë son
 * marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los nombres de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI) van tal cual y en latino. Perfil
 * Real es «असली प्रोफ़ाइल» y Perfil Weë, «Weë प्रोफ़ाइल» (glosario § 11.1: marca + sustantivo, sin
 * guion). Las etiquetas dicen lo mismo que la barra inferior (`nav`) y que el glosario: होम,
 * कम्यूनिटी, मेरे प्रोजेक्ट, सेव की गई पोस्ट, सेटिंग, मदद. `sectionProfile` y `sectionExplore` el
 * español los escribe en MAYÚSCULAS; el devanagari no tiene caja y se escriben normales
 * (guía § 4.4). «Activo» es «सक्रिय», invariable, el «अभी सक्रिय» de Facebook: no concuerda con
 * nadie. `profileActive` y `switchToProfile` solo los oye el lector de pantalla y su hueco es el
 * nombre de la cara, entero («असली प्रोफ़ाइल», «Weë प्रोफ़ाइल»); cambiar de cara es «स्विच करें»,
 * lo que dice Android para cambiar de perfil. «Crear mi perfil Weë» va con el reflexivo:
 * «अपनी Weë प्रोफ़ाइल बनाएँ» (un botón no dice «मेरी»). `wcontact` copia el valor del español, como
 * el resto de idiomas (la clave no se usa hoy en ninguna pantalla).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'होम',
  realProfile: 'असली प्रोफ़ाइल',
  weeProfile: 'Weë प्रोफ़ाइल',
  createWeeProfile: 'अपनी Weë प्रोफ़ाइल बनाएँ',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'कम्यूनिटी',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'मेरे प्रोजेक्ट',
  saved: 'सेव की गई पोस्ट',
  settings: 'सेटिंग',
  help: 'मदद',
  sectionProfile: 'प्रोफ़ाइल',
  sectionExplore: 'एक्सप्लोर',
  activeReal: 'असली प्रोफ़ाइल सक्रिय',
  activeWee: 'Weë प्रोफ़ाइल सक्रिय',
  tapToSignIn: 'साइन इन करने के लिए टैप करें',
  signOut: 'साइन आउट करें',
  terms: 'शर्तें',
  privacy: 'निजता',
  signOutFailed: 'साइन आउट नहीं किया जा सका',
  profileActive: '{{perfil}}, सक्रिय',
  switchToProfile: '{{perfil}} पर स्विच करें',
  signIn: 'साइन इन करें',
  hideSpecialists: 'एक्सपर्ट छिपाएँ',
  showSpecialists: 'एक्सपर्ट दिखाएँ',
  signOutConfirm: 'क्या आपको Weë से साइन आउट करना है?',
};
