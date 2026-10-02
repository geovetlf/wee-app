/*
 * HINDI — ËContact y ẄContact: las conexiones de Weë y sus solicitudes. Los dos nombres son marca
 * —cambian con el perfil activo— y entran como valor, no se traducen ni se transliteran.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ËContact y ẄContact van en latino y la posposición detrás, separada («{{lista}} में»,
 * «{{lista}} से»), o delante de un sustantivo («ËContact अनुरोध», guía § 6). El código pasa
 * `{{lista}}` a veces con una «s» de plural que pone él (ËContacts): esas frases lo tratan como un
 * plural masculino («आपके {{lista}}», «दिखेंगे»), que es como se lee, igual que «Reels» en el hindi
 * de Instagram. `wantsToConnect` y `openProfile` no reciben la agenda sino la CARA de la persona
 * —«असली प्रोफ़ाइल» o «Weë प्रोफ़ाइल», las dos femeninas—, por eso «{{nombre}} की {{etiqueta}}». Una
 * conexión es «संपर्क» (glosario § 11.1) y la agenda, «संपर्क सूची»; una solicitud, «अनुरोध»;
 * aceptar y rechazar, «स्वीकार करें» / «अस्वीकार करें» (§ 11.5); retirar, «वापस लें».
 *
 * `{{nombre}}` va SIEMPRE delante de una posposición («{{nombre}} का अनुरोध», «{{nombre}} को»),
 * porque en el perfil de otra persona, si su nombre aún no ha cargado, el hueco se rellena con
 * `somePerson`, y en hindi eso exige el oblicuo: «इस व्यक्ति» («इस व्यक्ति का अनुरोध»), no «यह».
 * Nada da género a nadie: la solicitud se explica en pasiva («एक तरफ़ से अनुरोध भेजा जाता है…»),
 * «No estás conectado» se dice desde el perfil («यह प्रोफ़ाइल आपके संपर्कों में नहीं है») y los
 * errores son pasivas o frases sin sujeto. `count_one` escribe en español un «1» a mano; aquí lleva
 * `{{contador}}`, porque en hindi el 0 también cae en `one`.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: 'मिले हुए अनुरोध',
  requestsSent: 'भेजे गए अनुरोध',
  yours: 'आपके {{lista}}',
  yoursWhenYouSignIn: 'साइन इन करने पर आपके {{lista}} यहाँ दिखेंगे',
  yoursWhenYouSignInSubtitle: '{{lista}} में Weë पर आपके संपर्क सेव रहते हैं. उन्हें देखने के लिए, साइन इन करें.',
  noneYet: 'अभी तक आपके कोई {{lista}} नहीं हैं',
  noneYetSubtitle: 'Weë पर आपके लोग यहाँ दिखेंगे. संपर्क दो लोगों के बीच बनता है: एक तरफ़ से अनुरोध भेजा जाता है और दूसरी तरफ़ से स्वीकार किया जाता है.',
  noAgenda: 'इस प्रोफ़ाइल में संपर्क सूची नहीं है',
  noAgendaSubtitle: '{{lista}} में दूसरे लोगों के साथ आपके संपर्क रहते हैं. उन्हें देखने के लिए, अपनी असली प्रोफ़ाइल या Weë प्रोफ़ाइल पर स्विच करें.',
  wantsToConnect: '{{lista}} · आपसे जुड़ने का अनुरोध',
  accept: '{{nombre}} का अनुरोध स्वीकार करें',
  reject: '{{nombre}} का अनुरोध अस्वीकार करें',
  withdraw: '{{nombre}} को भेजा गया अनुरोध वापस लें',
  removeFrom: '{{nombre}} को अपने {{lista}} से हटाएँ',
  openProfile: '{{nombre}} की {{etiqueta}} खोलें',
  rejectTitle: 'अनुरोध अस्वीकार करें',
  rejectConfirm: 'क्या आपको {{nombre}} का अनुरोध अस्वीकार करना है?',
  withdrawTitle: 'अनुरोध वापस लें',
  withdrawConfirm: 'क्या आपको {{nombre}} को भेजा गया अनुरोध वापस लेना है?',
  removeTitle: '{{lista}} से हटाएँ',
  removeConfirm: 'क्या आपको {{nombre}} को अपने {{lista}} से हटाना है?',
  failed: 'पूरा नहीं किया जा सका',
  count_one: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'इस व्यक्ति',
  acceptLabel: '{{lista}} स्वीकार करें',
  rejectRequestLabel: '{{lista}} अनुरोध अस्वीकार करें',
  requestSent: 'अनुरोध भेजा गया',
  errSignIn: 'ËContact इस्तेमाल करने के लिए, साइन इन करें.',
  errNotYours: 'यह प्रोफ़ाइल आपकी नहीं है.',
  errNotAPerson: 'इस प्रोफ़ाइल से ËContact इस्तेमाल नहीं किया जा सकता.',
  errSameProfile: 'कोई प्रोफ़ाइल खुद को अपने संपर्कों में नहीं जोड़ सकती.',
  errOffline: 'Weë से कनेक्ट नहीं किया जा सका.',
  errNoRequestToReject: 'अस्वीकार करने के लिए कोई अनुरोध नहीं है.',
  errNoPendingRequest: 'इस प्रोफ़ाइल के साथ आपका कोई अनुरोध बाकी नहीं है.',
  errNotConnected: 'यह प्रोफ़ाइल आपके संपर्कों में नहीं है.',
  errNoActiveProfile: 'इसके लिए कोई प्रोफ़ाइल सक्रिय नहीं है.',
};
