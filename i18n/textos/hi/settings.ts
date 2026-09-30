/*
 * HINDI — Configuración (सेटिंग): contenido, preferencias, privacidad, notificaciones,
 * información y cuenta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario y las de los ajustes de Android en hindi: «सेटिंग» (sin la -s
 * inglesa), «निजता» y «निजता नीति», «पुश सूचनाएँ», «खाता», «मदद». «Contenido» es «कॉन्टेंट», como
 * en YouTube; «Preferencias», «प्राथमिकताएँ», como en Google. La ubicación es «जगह» y el ajuste,
 * «जगह की जानकारी»; exacta y aproximada son «सटीक» y «अनुमानित», las dos palabras del diálogo de
 * permisos de Android. `locationLine` empieza por el estado —una frase que ya acaba en punto— y
 * sigue con la advertencia de privacidad, la misma que cierra `locationOff`. Los estados no dan
 * género a nadie ni culpan a nadie, y el sistema no habla de sí mismo: pasiva («… अनुमति नहीं दी
 * गई है»), dativo («Weë को … पता है») o Weë de sujeto, que va en masculino («Weë … माँगेगा», «कर
 * सकता है»); el aparato, sin «हमें» («यह डिवाइस … नहीं दे सकता»). El contador de comunidades es
 * invariable («{{contador}} कम्यूनिटी में शामिल»: «शामिल» no concuerda) y lleva la cifra también
 * en `_one`, porque el 0 cae ahí. «Todos los derechos reservados» es «सर्वाधिकार सुरक्षित», la
 * fórmula hindi de siempre; `aboutBody` conserva sus dos saltos dobles y la atribución de GeoNames
 * tal cual. El panel del motor (solo administración) se llama «Weë AI Engine», como en todos los
 * idiomas: es el nombre del producto. «Sembrar» los valores por defecto se dice «जोड़ें» (añadir),
 * que es lo que hace: escribe lo que falta y no borra nada.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'सेटिंग',
  sectionContent: 'कॉन्टेंट',
  sectionPrivacy: 'निजता',
  sectionPreferences: 'प्राथमिकताएँ',
  sectionSupport: 'मदद',
  myCommunities: 'मेरी कम्यूनिटी',
  communitiesJoined_one: '{{contador}} कम्यूनिटी में शामिल',
  communitiesJoined_other: '{{contador}} कम्यूनिटी में शामिल',
  privateReplies: 'निजी जवाब',
  privateRepliesHint: 'दूसरों को आपको निजी मैसेज भेजने की अनुमति दें',
  pushNotifications: 'पुश सूचनाएँ',
  language: 'भाषा',
  languageSubtitle: 'Weë की भाषा चुनें',
  help: 'मदद',
  privacyPolicy: 'निजता नीति',
  about: 'Weë के बारे में',
  signOut: 'साइन आउट करें',
  signOutFailed: 'साइन आउट नहीं किया जा सका',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'डिफ़ॉल्ट वैल्यू जोड़ें',
  seedDefaultsConfirm: 'जो डिफ़ॉल्ट प्रोवाइडर, चेन और सेटिंग अभी Firestore में नहीं हैं, उन्हें वहाँ जोड़ा जाएगा. कुछ भी मिटाया नहीं जाएगा.',
  seed: 'जोड़ें',
  sectionNotifications: 'सूचनाएँ',
  sectionInfo: 'जानकारी',
  sectionAccount: 'खाता',
  privacyPolicyHint: 'हम आपके डेटा का क्या करते हैं, आसान शब्दों में',
  pushNotificationsHint: 'नए मैसेज और गतिविधि की सूचनाएँ पाएँ',
  aboutHint: 'Weë क्या है और आपके पास कौन-सा वर्शन है',
  helpHint: 'अक्सर पूछे जाने वाले सवाल और संपर्क',
  signOutHint: 'अपने खाते से बाहर निकलें',
  aboutBody: 'Weë (World Encode Entity) उन लोगों का सोशल नेटवर्क है जो AI से कुछ बनाते हैं.\n\nवर्शन 1.0.0 · © {{anio}} Weë. सर्वाधिकार सुरक्षित.\n\nभौगोलिक डेटा: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 जगह की जानकारी',
  locationLine: '{{estado}} आपकी सटीक जगह कभी भी सार्वजनिक रूप से नहीं दिखाई जाती.',
  locationOff: 'बंद है. Weë को अपनी अनुमानित जगह की जानकारी इस्तेमाल करने दें, ताकि आपको अपने आस-पास का कॉन्टेंट और अनुभव दिख सकें. आपकी सटीक जगह कभी भी सार्वजनिक रूप से नहीं दिखाई जाती.',
  locationUnavailable: 'यह डिवाइस आपकी जगह की जानकारी नहीं दे सकता.',
  locationDisabled: 'आपके डिवाइस की सेटिंग में जगह की जानकारी बंद है.',
  locationPermissionDenied: 'जगह की जानकारी की अनुमति नहीं दी गई है. अपने डिवाइस की सेटिंग में इसे बदलने के लिए, यहाँ टैप करें.',
  locationPermissionNotDetermined: 'ज़रूरत होने पर Weë आपसे अनुमति माँगेगा.',
  locationApproximate: 'Weë को आपके इलाके का पता है, सटीक जगह का नहीं.',
  locationPrecise: 'किसी सुविधा को ज़रूरत होने पर, Weë आपकी सटीक जगह की जानकारी इस्तेमाल कर सकता है.',
};
