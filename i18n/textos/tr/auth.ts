/*
 * TURCO — Entrar en Weë y darse de alta: las pantallas de acceso y de registro,
 * y lo que dicen cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las de las redes turcas (glosario § 10.3): «Giriş yap»,
 * «Kaydol», «şifre», «misafir», «e-posta»; y las frases, las que la gente ya
 * conoce de Instagram: «Şifreni mi unuttun?», «Hesabın yok mu? Kaydol», «Hesabın
 * var mı? Giriş yap». Los errores dicen qué pasó en pasiva («Giriş yapılamadı»)
 * y qué hacer en imperativo de «sen» («Yeniden dene»), sin «lütfen».
 *
 * EL AVISO LEGAL va en cuatro trozos y el código acaba en el enlace de la
 * política de privacidad (`settings.privacyPolicy`), sin trozo final. El verbo
 * turco va al final y no puede ir detrás de un enlace que no controlamos, así
 * que la frase se cierra en `termsIntro` y los dos enlaces siguen a los dos
 * puntos: «Hesap oluşturarak şunları kabul etmiş olursun: Kullanım koşulları ve
 * Gizlilik politikası». Tampoco se le pega sufijo a ningún enlace. El nombre del
 * documento es «Kullanım koşulları», el mismo de la Ayuda (y de Instagram).
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en
 * el borde a propósito, porque la pantalla los pega con el enlace de al lado.
 * Los divisores «O continúa con» y «O regístrate con» son «veya»: el botón de
 * debajo ya dice «Google ile devam et». El ejemplo del campo de e-posta es una
 * dirección que se lee («isim@email.com»), escrita solo con letras que caben en
 * una dirección de correo. Los títulos de lo que falta dicen qué no se escribió
 * («E-posta girilmedi»), y el cuerpo, qué hacer.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Weë\'ye hoş geldin',
  signInToContinue: 'Devam etmek için giriş yap',
  email: 'E-posta',
  emailPlaceholder: 'isim@email.com',
  password: 'Şifre',
  passwordPlaceholder: 'Şifren',
  forgotPassword: 'Şifreni mi unuttun?',
  orContinueWith: 'veya',
  continueWithGoogle: 'Google ile devam et',
  enterAsGuest: 'Misafir olarak devam et',
  noAccount: 'Hesabın yok mu? ',
  registerHere: 'Kaydol',
  signingIn: 'Giriş yapılıyor…',

  fillAllFields: 'Tüm alanları doldur',
  signInFailed: 'Giriş yapılamadı',
  authErrorTitle: 'Giriş hatası',
  errUserNotFound: 'Bu e-posta adresiyle kayıtlı bir hesap yok',
  errWrongPassword: 'Şifre yanlış',
  errInvalidEmail: 'Geçersiz e-posta adresi',
  errUserDisabled: 'Bu hesap devre dışı bırakıldı',
  googleFailed: 'Google ile giriş yapılamadı. Yeniden dene.',
  anonymousFailed: 'Misafir olarak giriş yapılamadı. Yeniden dene.',
  emailRequiredTitle: 'E-posta gerekli',
  emailRequired: 'Şifreni sıfırlamak için e-posta adresini gir',
  emailSentTitle: 'E-posta gönderildi',
  resetEmailSent: 'Şifreni sıfırlamak için e-postanı kontrol et',
  resetFailed: 'Şifre sıfırlama e-postası gönderilemedi. Yeniden dene.',

  createAccount: 'Hesabını oluştur',
  joinWee: 'Weë topluluğuna katıl',
  passwordMinPlaceholder: 'En az 6 karakter',
  confirmPassword: 'Şifreyi onayla',
  confirmPasswordPlaceholder: 'Şifreni tekrar gir',
  createAccountButton: 'Hesap oluştur',
  orRegisterWith: 'veya',
  haveAccount: 'Hesabın var mı? ',
  signInHere: 'Giriş yap',
  creatingAccount: 'Hesap oluşturuluyor…',

  termsIntro: 'Hesap oluşturarak şunları kabul etmiş olursun: ',
  termsOfService: 'Kullanım koşulları',
  termsAnd: ' ve ',

  emailMissingTitle: 'E-posta girilmedi',
  emailMissing: 'Devam etmek için e-posta adresini yaz.',
  emailCheckTitle: 'E-posta adresini kontrol et',
  emailCheck: 'Bu e-posta adresi geçerli görünmüyor.',
  passwordMissingTitle: 'Şifre girilmedi',
  passwordMissing: 'Devam etmek için bir şifre belirle.',
  passwordShortTitle: 'Şifre çok kısa',
  passwordShort: 'En az 6 karakter kullan.',
  passwordsMismatchTitle: 'Şifreler eşleşmiyor',
  passwordsMismatch: 'İki alana da aynı şifreyi yaz.',

  signUpFailedTitle: 'Hesabın oluşturulamadı',
  signUpFailed: 'Hesap oluşturulurken bir sorun oluştu',
  errEmailInUse: 'Bu e-posta adresiyle zaten bir hesap var',
  errWeakPassword: 'Şifre çok zayıf',
  errSignUpNotAllowed: 'E-posta ile kayda izin verilmiyor',
  googleFailedTitle: 'Google ile devam edilemedi',
  guestFailedTitle: 'Misafir girişi yapılamadı',
};
