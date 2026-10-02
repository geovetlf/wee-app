/*
 * HINDI — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres
 * en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El Perfil Weë es «Weë प्रोफ़ाइल» (glosario § 11.1), también en el título y en el
 * botón de crearlo, que comparten `weeTitle`: «Weë प्रोफ़ाइल बनाएँ»; «प्रोफ़ाइल» es
 * femenino («Weë प्रोफ़ाइल बन गई»). «Bienvenido» no se calca con género: «Weë में
 * आपका स्वागत है». Lo opcional es «ज़रूरी नहीं», como en Android. Los avisos de lo
 * que falta dicen qué no se hizo: lo que se escribe, «नहीं डाला गया», y lo que se
 * elige, «नहीं चुना गया» o «नहीं चुनी गई», concordado con la cosa (नाम, लिंग y देश
 * son masculinos; तारीख, femenino), nunca con la persona. El género es «लिंग», con
 * «पुरुष», «महिला» y «अन्य», como en los formularios indios. La descripción del
 * perfil es «विवरण», como toda «descripción» de la app, y la bio, «बायो», como en
 * el perfil. Las frases que empiezan por «… के लिए» llevan coma antes del verbo
 * principal («Weë इस्तेमाल करने के लिए, आपकी उम्र…»), como escribe Google.
 *
 * «Después podrás crear tu Perfil Weë» es «फिर चाहें तो … बनाएँ», sin
 * «सकेंगे/सकेंगी». «Desde el header» es «स्क्रीन के सबसे ऊपर से»: se dice dónde
 * mirar, no el nombre técnico de la pieza, y en pasiva («प्रोफ़ाइल बदली जा सकती
 * है»). El nombre anónimo es «गुमनाम नाम» (como «गुमनाम यूज़र» del glosario) y el
 * ejemplo del campo se adapta («कालासाया», «sombra negra»), con «जैसे:»; el
 * alter ego es «दूसरा रूप». En el contador, el guion del español es « · ».
 * `stepOf` es «चरण 1/2», compacto y sin ordinales (guía § 8).
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Weë में आपका स्वागत है',
  welcomeSubtitle: 'हमें अपने बारे में बताएँ. फिर चाहें तो अपनी Weë प्रोफ़ाइल बनाएँ: AI से कुछ भी बनाने के लिए आपकी पहचान.',
  yourName: 'आपका नाम',
  yourNameHint: 'यह नाम आपकी सार्वजनिक प्रोफ़ाइल पर दिखेगा.',
  yourNamePlaceholder: 'आपका पूरा नाम',
  birthDate: 'जन्म की तारीख',
  birthDateHint: 'Weë इस्तेमाल करने के लिए, आपकी उम्र कम से कम 13 साल होनी चाहिए.',
  gender: 'लिंग',
  genderMale: 'पुरुष',
  genderFemale: 'महिला',
  genderOther: 'अन्य',
  country: 'देश',
  pickCountry: 'अपना देश चुनें',
  searchCountry: 'देश खोजें…',
  customiseProfile: 'अपनी प्रोफ़ाइल सेट करें',
  yourAvatar: 'आपका अवतार',
  yourAvatarHint: 'पहले से बना अवतार चुनने या अपनी फ़ोटो अपलोड करने के लिए, टैप करें',
  bioPlaceholder: 'अपने बारे में कुछ बताएँ… (ज़रूरी नहीं)',
  saving: 'सेव हो रहा है…',
  completed: 'हो गया!',
  complete: 'पूरा करें',
  continueStep: 'जारी रखें',
  nameMissingTitle: 'नाम नहीं डाला गया',
  nameMissing: 'जारी रखने के लिए, अपना नाम डालें.',
  nameShortTitle: 'नाम बहुत छोटा है',
  nameShort: 'नाम में कम से कम 2 अक्षर होने चाहिए.',
  birthMissingTitle: 'जन्म की तारीख नहीं चुनी गई',
  birthMissing: 'दिन, महीना और साल चुनें.',
  genderMissingTitle: 'लिंग नहीं चुना गया',
  genderMissing: 'जारी रखने के लिए, कोई एक विकल्प चुनें.',
  countryMissingTitle: 'देश नहीं चुना गया',
  countryMissing: 'जारी रखने के लिए, अपना देश चुनें.',
  saveFailedTitle: 'आपकी प्रोफ़ाइल सेव नहीं की जा सकी',
  saveFailed: 'फिर से कोशिश करें.',
  weeTitle: 'Weë प्रोफ़ाइल बनाएँ',
  weeIntro: 'यह प्रोफ़ाइल आपकी असली पहचान से अलग है. Weë प्रोफ़ाइल से की गई पोस्ट और गतिविधियाँ आपकी मुख्य प्रोफ़ाइल से नहीं जुड़ेंगी.',
  weePhoto: 'प्रोफ़ाइल फ़ोटो',
  weePhotoHint: 'फ़ोटो या पहले से बना अवतार चुनने के लिए, टैप करें',
  weeName: 'गुमनाम नाम',
  weeNamePlaceholder: 'जैसे: कालासाया, Anon123…',
  weeBioPlaceholder: 'अपने दूसरे रूप के बारे में बताएँ…',
  weeCreatedTitle: 'Weë प्रोफ़ाइल बन गई',
  weeCreated: 'आपकी गुमनाम पहचान तैयार है. स्क्रीन के सबसे ऊपर से प्रोफ़ाइल बदली जा सकती है.',
  weeCreateFailed: 'Weë प्रोफ़ाइल नहीं बनाई जा सकी',
  birthDay: 'दिन',
  birthMonth: 'महीना',
  birthYear: 'साल',
  stepOf: 'चरण {{paso}}/{{total}}',
  customiseProfileHint: 'कोई अवतार चुनें और विवरण जोड़ें (ज़रूरी नहीं)',
  bioLabel: 'विवरण (ज़रूरी नहीं)',
  weeNameCounter: '{{usados}}/{{maximo}} · कम से कम {{minimo}} वर्ण',
  weeBio: 'बायो (ज़रूरी नहीं)',
};
