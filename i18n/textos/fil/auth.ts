/*
 * FILIPINO — entrar en Weë y darse de alta: las pantallas de acceso y de registro, y lo que dicen cuando algo no
 * sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 11.7): «Mag-sign in» / «Mag-sign out» (la pareja del inglés de Weë; nunca
 * «Mag-log in»), «Mag-sign up», «Gumawa ng account», «Nakalimutan ang password?», «Pumasok bilang bisita»,
 * «Magpatuloy gamit ang Google» y «Welcome sa Weë». «Email» y «password» se quedan como préstamos (§ 4), y
 * restablecer es «i-reset». Los estados en curso son los del § 11.4: «Nagsa-sign in…», «Ginagawa ang account…».
 *
 * Los errores dicen qué pasó y qué hacer, sin culpar (§ 2): «Hindi makapag-sign in. Subukan ulit.», «Mali ang
 * password», «Hindi wasto ang email», «Mayroon nang account sa email na ito» (§ 11.5). OJO: la pantalla enseña
 * `errWrongPassword` también cuando Firebase no distingue entre contraseña mal y correo inexistente
 * (`auth/invalid-credential`); se traduce lo que dice el español. Los títulos de lo que falta usan «Kailangan ang
 * … mo» (el «Campo obligatorio» del glosario), que no reprocha nada, y el cuerpo dice qué hacer con el verbo
 * delante («Ilagay ang email mo para magpatuloy.»). Los títulos de lo que no se pudo hacer siguen a
 * `settings.signOutFailed`: «Hindi natuloy ang pag-sign in gamit ang Google». Los códigos de Firebase
 * (`auth/user-not-found`) no están aquí: son identificadores.
 *
 * EL AVISO LEGAL va en cuatro trozos y el código acaba en el enlace de la política de privacidad
 * (`settings.privacyPolicy`, «Patakaran sa privacy»), sin trozo final: «Sa paggawa ng account, sumasang-ayon ka sa
 * aming Mga tuntunin ng serbisyo at Patakaran sa privacy», la fórmula de Facebook en filipino. Weë habla de sí mismo
 * con el «amin» exclusivo (§ 2).
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en el borde a propósito, porque la
 * pantalla los pega con el enlace de al lado. El ejemplo del campo de correo es una dirección que se lee
 * («pangalan@email.com»). «6 na character» lleva el enlace porque la cifra es fija y «anim» acaba en consonante
 * (§ 8.3).
 *
 * El título del registro («Crea tu cuenta») es «Gumawa ng sarili mong account»: «Gawin ang account mo» es un calco
 * del inglés, y el botón de debajo ya es «Gumawa ng account». `emailCheckTitle` («Revisa tu email») pide mirar otra
 * vez lo que se escribió, no la bandeja: «Tingnan ulit ang email mo» (la bandeja es «inbox», `resetEmailSent`).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Welcome sa Weë',
  signInToContinue: 'Mag-sign in para magpatuloy',
  email: 'Email',
  emailPlaceholder: 'pangalan@email.com',
  password: 'Password',
  passwordPlaceholder: 'Password mo',
  forgotPassword: 'Nakalimutan ang password?',
  orContinueWith: 'O magpatuloy gamit ang',
  continueWithGoogle: 'Magpatuloy gamit ang Google',
  enterAsGuest: 'Pumasok bilang bisita',
  noAccount: 'Wala ka pang account? ',
  registerHere: 'Mag-sign up',
  signingIn: 'Nagsa-sign in…',

  fillAllFields: 'Punan ang lahat ng field.',
  signInFailed: 'Hindi makapag-sign in. Subukan ulit.',
  authErrorTitle: 'Error sa pag-sign in',
  errUserNotFound: 'Walang account sa email na ito.',
  errWrongPassword: 'Mali ang password. Subukan ulit.',
  errInvalidEmail: 'Hindi wasto ang email.',
  errUserDisabled: 'Na-disable ang account na ito.',
  googleFailed: 'Hindi makapag-sign in gamit ang Google. Subukan ulit.',
  anonymousFailed: 'Hindi makapasok bilang bisita. Subukan ulit.',
  emailRequiredTitle: 'Kailangan ang email',
  emailRequired: 'Ilagay ang email mo para ma-reset ang password mo.',
  emailSentTitle: 'Naipadala ang email',
  resetEmailSent: 'Tingnan ang inbox mo para ma-reset ang password mo.',
  resetFailed: 'Hindi maipadala ang email para sa pag-reset ng password. Subukan ulit.',

  createAccount: 'Gumawa ng sarili mong account',
  joinWee: 'Sumali sa komunidad ng Weë',
  passwordMinPlaceholder: 'Hindi bababa sa 6 na character',
  confirmPassword: 'Kumpirmahin ang password',
  confirmPasswordPlaceholder: 'Ulitin ang password mo',
  createAccountButton: 'Gumawa ng account',
  orRegisterWith: 'O mag-sign up gamit ang',
  haveAccount: 'May account ka na? ',
  signInHere: 'Mag-sign in',
  creatingAccount: 'Ginagawa ang account…',

  termsIntro: 'Sa paggawa ng account, sumasang-ayon ka sa aming ',
  termsOfService: 'Mga tuntunin ng serbisyo',
  termsAnd: ' at ',

  emailMissingTitle: 'Kailangan ang email mo',
  emailMissing: 'Ilagay ang email mo para magpatuloy.',
  emailCheckTitle: 'Tingnan ulit ang email mo',
  emailCheck: 'Mukhang hindi wasto ang email na iyan.',
  passwordMissingTitle: 'Kailangan ang password mo',
  passwordMissing: 'Maglagay ng password para magpatuloy.',
  passwordShortTitle: 'Masyadong maikli ang password',
  passwordShort: 'Gumamit ng hindi bababa sa 6 na character.',
  passwordsMismatchTitle: 'Hindi magkapareho ang mga password',
  passwordsMismatch: 'Ilagay ang parehong password sa dalawang field.',

  signUpFailedTitle: 'Hindi natuloy ang paggawa ng account mo',
  signUpFailed: 'Nagkaproblema sa paggawa ng account. Subukan ulit.',
  errEmailInUse: 'Mayroon nang account sa email na ito.',
  errWeakPassword: 'Masyadong mahina ang password. Gumamit ng mas matibay.',
  errSignUpNotAllowed: 'Hindi puwedeng mag-sign up gamit ang email.',
  googleFailedTitle: 'Hindi natuloy ang pag-sign in gamit ang Google',
  guestFailedTitle: 'Hindi natuloy ang pagpasok bilang bisita',
};
