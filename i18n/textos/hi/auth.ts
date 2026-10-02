/*
 * HINDI — entrar en Weë y darse de alta: las pantallas de acceso y de registro,
 * y lo que dicen cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 11.3): «साइन इन करें», «साइन अप करें»,
 * «खाता बनाएँ», «पासवर्ड», «ईमेल» y «मेहमान»; «¿Olvidaste tu contraseña?» es
 * «पासवर्ड याद नहीं है?», que no obliga a elegir género. «Bienvenido a Weë» es
 * «Weë में आपका स्वागत है», también sin género. Los errores dicen qué pasó en
 * pasiva («… नहीं हो सका», «… नहीं भेजा जा सका») y qué hacer, sin «कृपया»; el
 * título y el cuerpo no repiten la misma frase. Los títulos de lo que falta dicen
 * qué no se escribió («ईमेल नहीं डाला गया»), concordado con la cosa, y el cuerpo,
 * qué hacer. Los divisores «O continúa con» y «O regístrate con» son «या»: el
 * botón de debajo ya dice «Google के साथ जारी रखें». «Caracteres» es «वर्ण»,
 * como en Android. Los códigos de Firebase (`auth/user-not-found`) no están aquí:
 * son identificadores.
 *
 * EL AVISO LEGAL va en cuatro trozos y el código acaba en el enlace de la
 * política de privacidad (`settings.privacyPolicy`), sin trozo final. El verbo
 * hindi va al final y no puede ir detrás de un enlace que no controlamos, así
 * que la frase se cierra en `termsIntro` y los dos enlaces siguen a los dos
 * puntos: «खाता बनाने का मतलब है कि आप इनसे सहमत हैं: सेवा की शर्तें और निजता
 * नीति». «सहमत» es invariable, así que tampoco ahí hay género.
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en el
 * borde a propósito, porque la pantalla los pega con el enlace de al lado. El
 * ejemplo del campo de correo es una dirección que se lee («नाम@email.com», como
 * el «вы@email.com» del ruso o el «아이디@email.com» del coreano).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Weë में आपका स्वागत है',
  signInToContinue: 'जारी रखने के लिए साइन इन करें',
  email: 'ईमेल',
  emailPlaceholder: 'नाम@email.com',
  password: 'पासवर्ड',
  passwordPlaceholder: 'अपना पासवर्ड डालें',
  forgotPassword: 'पासवर्ड याद नहीं है?',
  orContinueWith: 'या',
  continueWithGoogle: 'Google के साथ जारी रखें',
  enterAsGuest: 'मेहमान के रूप में जारी रखें',
  noAccount: 'खाता नहीं है? ',
  registerHere: 'साइन अप करें',
  signingIn: 'साइन इन हो रहा है…',

  fillAllFields: 'सभी फ़ील्ड भरें',
  signInFailed: 'साइन इन नहीं हो सका',
  authErrorTitle: 'साइन इन में गड़बड़ी',
  errUserNotFound: 'इस ईमेल से जुड़ा कोई खाता नहीं है',
  errWrongPassword: 'गलत पासवर्ड',
  errInvalidEmail: 'ईमेल पता सही नहीं है',
  errUserDisabled: 'यह खाता बंद कर दिया गया है',
  googleFailed: 'Google से साइन इन नहीं हो सका. फिर से कोशिश करें.',
  anonymousFailed: 'मेहमान के रूप में साइन इन नहीं हो सका. फिर से कोशिश करें.',
  emailRequiredTitle: 'ईमेल ज़रूरी है',
  emailRequired: 'पासवर्ड रीसेट करने के लिए, अपना ईमेल डालें',
  emailSentTitle: 'ईमेल भेज दिया गया',
  resetEmailSent: 'पासवर्ड रीसेट करने के लिए, अपना ईमेल इनबॉक्स देखें',
  resetFailed: 'पासवर्ड रीसेट करने का ईमेल नहीं भेजा जा सका. फिर से कोशिश करें.',

  createAccount: 'अपना खाता बनाएँ',
  joinWee: 'Weë कम्यूनिटी में शामिल हों',
  passwordMinPlaceholder: 'कम से कम 6 वर्ण',
  confirmPassword: 'पासवर्ड की पुष्टि करें',
  confirmPasswordPlaceholder: 'पासवर्ड फिर से डालें',
  createAccountButton: 'खाता बनाएँ',
  orRegisterWith: 'या',
  haveAccount: 'पहले से खाता है? ',
  signInHere: 'साइन इन करें',
  creatingAccount: 'खाता बन रहा है…',

  termsIntro: 'खाता बनाने का मतलब है कि आप इनसे सहमत हैं: ',
  termsOfService: 'सेवा की शर्तें',
  termsAnd: ' और ',

  emailMissingTitle: 'ईमेल नहीं डाला गया',
  emailMissing: 'जारी रखने के लिए, अपना ईमेल डालें.',
  emailCheckTitle: 'अपना ईमेल जाँचें',
  emailCheck: 'यह ईमेल सही नहीं लगता.',
  passwordMissingTitle: 'पासवर्ड नहीं डाला गया',
  passwordMissing: 'जारी रखने के लिए, पासवर्ड डालें.',
  passwordShortTitle: 'पासवर्ड बहुत छोटा है',
  passwordShort: 'कम से कम 6 वर्ण इस्तेमाल करें.',
  passwordsMismatchTitle: 'पासवर्ड मेल नहीं खाते',
  passwordsMismatch: 'दोनों फ़ील्ड में एक ही पासवर्ड डालें.',

  signUpFailedTitle: 'आपका खाता नहीं बनाया जा सका',
  signUpFailed: 'खाता बनाने में कोई गड़बड़ी हुई',
  errEmailInUse: 'इस ईमेल से जुड़ा खाता पहले से मौजूद है',
  errWeakPassword: 'पासवर्ड बहुत कमज़ोर है',
  errSignUpNotAllowed: 'ईमेल से साइन अप करने की अनुमति नहीं है',
  googleFailedTitle: 'Google के साथ जारी नहीं रखा जा सका',
  guestFailedTitle: 'मेहमान के रूप में जारी नहीं रखा जा सका',
};
