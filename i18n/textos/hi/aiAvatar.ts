/*
 * HINDI — el avatar humano con IA: el asistente de nueve preguntas y el reemplazo
 * de persona en una foto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores de cada opción —'male', 'tone3', 'goatee'…— no están aquí:
 * viajan al servidor y ya están guardados en los perfiles de la gente.
 *
 * «Avatar» es अवतार (m), como en Gemini, e «IA» es AI en latino (glosario
 * § 11.1): «AI अवतार», «AI से … बनाएँ». «Generar» es बनाएँ en todo el módulo,
 * porque es la llamada principal (glosario: generar); el cupo de generaciones se
 * cuenta en मौके, oportunidades: _one «अपना {{contador}} मौका», _other «अपने
 * सभी {{contador}} मौके». El Perfil Weë es «Weë प्रोफ़ाइल» y la foto de perfil,
 * प्रोफ़ाइल फ़ोटो (f), como en Android. «Usar como foto de perfil» lleva इसे
 * delante («इसे प्रोफ़ाइल फ़ोटो बनाएँ»): sin él, al lado de «दूसरा अवतार बनाएँ»,
 * se leería «generar una foto de perfil».
 *
 * GÉNERO. Aquí la persona elige su propio género, y la interfaz no puede depender
 * de él: los errores van en pasiva («… नहीं बनाया जा सका»), el cupo en ergativo
 * («आपने … इस्तेमाल कर लिया है») y cada opción concuerda con el título de su
 * grupo, nunca con la persona: los ojos con रंग (भूरा, नीला, शहद जैसा…), la cara
 * con आकार (अंडाकार, गोल, तीखा…) y el pelo con बाल (छोटे बाल, घुँघराले बाल…);
 * «Calvo» es «गंजा सिर», que concuerda con सिर. La barba usa las palabras de la
 * barbería india: «क्लीन शेव», «हल्की दाढ़ी», «घनी दाढ़ी» y, para el candado,
 * «फ़्रेंच कट». Quien sale en la foto es व्यक्ति, masculino como palabra y no
 * como persona. Los dos pasos del asistente son «बुनियादी बातें» y «बारीकियाँ».
 * «Corto», «Medio» y «Largo» dicen aquí छोटे बाल, मीडियम बाल y लंबे बाल, y no el
 * छोटा / मीडियम / लंबा de la duración de un vídeo en `studio`: en hindi el adjetivo
 * concuerda con बाल, que es plural, así que se separan a propósito.
 *
 * «Credits» es marca: en latino, sin plural hindi y en masculino plural (§ 5.3):
 * «आपके पास काफ़ी Credits नहीं हैं». Lo que el español repite en otros módulos se
 * dice aquí con las mismas palabras: el saldo y el coste como en `weeai`
 * («उपलब्ध Credits: …», «कीमत: …»), «Obtener Credits» como allí («Credits पाएँ»),
 * y los permisos como en `composer`, con Weë de sujeto y sin «nosotros»
 * («अनुमति चाहिए», «Weë को आपकी गैलरी की अनुमति चाहिए.»). Detrás de «Weë» nunca va
 * फ़ोटो, que se leería como Weë Photo traducido: «Weë आपका अवतार फ़ोटो में…».
 */
export const aiAvatar: typeof import('../es/aiAvatar').aiAvatar = {
  gender: 'लिंग',
  genderMale: 'पुरुष',
  genderFemale: 'महिला',
  genderOther: 'अन्य',
  skinTone: 'त्वचा का रंग',
  hairStyle: 'हेयरस्टाइल',
  hairShort: 'छोटे बाल',
  hairMedium: 'मीडियम बाल',
  hairLong: 'लंबे बाल',
  hairCurly: 'घुँघराले बाल',
  hairWavy: 'लहरदार बाल',
  hairBald: 'गंजा सिर',
  ageRange: 'उम्र',
  eyeColor: 'आँखों का रंग',
  eyeBrown: 'भूरा',
  eyeBlue: 'नीला',
  eyeGreen: 'हरा',
  eyeHazel: 'शहद जैसा',
  eyeBlack: 'काला',
  eyeGray: 'ग्रे',
  faceShape: 'चेहरे का आकार',
  faceOval: 'अंडाकार',
  faceRound: 'गोल',
  faceAngular: 'तीखा',
  faceLong: 'लंबा',
  faceSquare: 'चौकोर',
  facialHair: 'दाढ़ी / मूँछ',
  hairNone: 'क्लीन शेव',
  hairStubble: 'हल्की दाढ़ी',
  hairFullBeard: 'घनी दाढ़ी',
  hairMustache: 'मूँछें',
  hairGoatee: 'फ़्रेंच कट',
  accessories: 'एक्सेसरी',
  accNone: 'कोई नहीं',
  accGlasses: 'चश्मा',
  accSunglasses: 'धूप का चश्मा',
  accEarrings: 'ईयररिंग',
  accCap: 'कैप',
  accHeadscarf: 'स्कार्फ़',
  accPiercing: 'पियर्सिंग',
  expression: 'हावभाव',
  expSmile: 'मुस्कान',
  expSerious: 'गंभीर',
  expRelaxed: 'शांत',
  expConfident: 'कॉन्फ़िडेंट',
  expMysterious: 'रहस्यमय',
  currentAvatar: 'आपका मौजूदा AI अवतार',
  swapTitle: 'फ़ोटो में अपना अवतार',
  swapSubtitle: 'फ़ोटो लें या अपलोड करें, और Weë AI उसमें मौजूद व्यक्ति की जगह आपका अवतार लगा देगा',
  takePhoto: 'फ़ोटो लें',
  gallery: 'गैलरी',
  useAsProfilePhoto: 'इसे प्रोफ़ाइल फ़ोटो बनाएँ',
  uploadAnotherPhoto: 'अवतार के लिए दूसरी फ़ोटो अपलोड करें',
  intro: 'AI से अवतार बनाएँ या अपनी Weë प्रोफ़ाइल के अवतार के लिए कोई फ़ोटो अपलोड करें.',
  uploadPhotoAsAvatar: 'अवतार के लिए फ़ोटो अपलोड करें',
  nextStep: 'आगे बढ़ें',
  previousStep: 'पिछला चरण',
  generatedWithAi: 'Weë AI से बना अवतार',
  nowTakeAPhoto: 'अब अपनी एक फ़ोटो लें या अपलोड करें, ताकि उसमें आपकी जगह आपका अवतार लगाया जा सके',
  skipAndUse: 'सीधे अवतार इस्तेमाल करें',
  regenerate: 'दूसरा अवतार बनाएँ',
  swapResult: 'यह रहा नतीजा',
  anotherPhoto: 'दूसरी फ़ोटो',
  newAvatar: 'नया अवतार',
  humanAvatar: 'इंसानी AI अवतार',
  notEnoughTitle: 'आपके पास काफ़ी Credits नहीं हैं',
  notEnoughWeb: 'आपके पास काफ़ी Credits नहीं हैं\n{{detalle}}\n\nक्या आपको और Credits चाहिए?',
  creditsDetail: 'उपलब्ध Credits: {{saldo}}\nकीमत: {{coste}}',
  notNow: 'अभी नहीं',
  getCredits: 'Credits पाएँ',
  signInFirst: 'अवतार बनाने के लिए, साइन इन करें.',
  limitTitle: 'सीमा पूरी हो गई',
  limitBody: 'आपने AI से {{contador}} अवतार बनाने की सीमा पूरी कर ली है. इसके बजाय, आप अवतार के लिए कोई फ़ोटो अपलोड कर सकते हैं.',
  understood: 'ठीक है',
  permissionTitle: 'अनुमति चाहिए',
  galleryPermission: 'Weë को आपकी गैलरी की अनुमति चाहिए.',
  cameraPermission: 'Weë को आपके कैमरे की अनुमति चाहिए.',
  uploadFailed: 'फ़ोटो अपलोड नहीं की जा सकी. फिर से कोशिश करें.',
  saveAvatarFailed: 'अवतार सेव नहीं किया जा सका.',
  saveFailed: 'सेव नहीं किया जा सका. फिर से कोशिश करें.',
  doneTitle: 'हो गया',
  photoUpdated: 'आपकी प्रोफ़ाइल फ़ोटो अपडेट हो गई है.',
  photoUpdateFailed: 'प्रोफ़ाइल फ़ोटो अपडेट नहीं की जा सकी.',
  creatingAvatar: 'Weë आपका अवतार बना रहा है…',
  creatingAnother: 'Weë आपके अवतार का दूसरा वर्शन बना रहा है…',
  uploadingPhoto: 'फ़ोटो अपलोड हो रही है…',
  savingAvatar: 'अवतार सेव हो रहा है…',
  savingResult: 'नतीजा सेव हो रहा है…',
  savingProfilePhoto: 'प्रोफ़ाइल फ़ोटो सेव हो रही है…',
  updatingProfilePhoto: 'प्रोफ़ाइल फ़ोटो अपडेट हो रही है…',
  swapping: 'Weë आपका अवतार फ़ोटो में लगा रहा है…\n(इसमें 30 से 60 सेकंड लग सकते हैं)',
  generateFailed: 'अवतार नहीं बनाया जा सका. फिर से कोशिश करें.',
  regenerateFailed: 'नया अवतार नहीं बनाया जा सका. फिर से कोशिश करें.',
  replaceFailed: 'फ़ोटो में अवतार नहीं लगाया जा सका. फिर से कोशिश करें.',
  stepBase: 'बुनियादी बातें',
  stepDetails: 'बारीकियाँ',
  limitReachedCount: 'सीमा पूरी हो गई ({{usadas}}/{{maximo}})',
  regenerateWithAi: 'AI से दूसरा अवतार बनाएँ',
  allGenerationsUsed_one: 'आपने AI से अवतार बनाने का अपना {{contador}} मौका इस्तेमाल कर लिया है.',
  allGenerationsUsed_other: 'आपने AI से अवतार बनाने के अपने सभी {{contador}} मौके इस्तेमाल कर लिए हैं.',
  generationsCount: 'AI से बने अवतार: {{usadas}}/{{maximo}}',
  generateForCredits: '{{credits}} Credits में अवतार बनाएँ',
  generateButton: 'अवतार बनाएँ · {{credits}} Credits',
};
