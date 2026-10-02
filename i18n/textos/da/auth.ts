/*
 * DANÉS — entrar en Weë y darse de alta: las pantallas de acceso y de registro,
 * y lo que dicen cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 9.3): «Log ind» / «Log ud» (nunca «Log
 * på» / «Log af»), «Opret konto», «adgangskode», «e-mailadresse» (el campo; un
 * correo concreto es «en e-mail») y «gæst». Restablecer la contraseña es
 * «nulstille». Las dos frases del pie son las de las apps danesas: «Har du ikke
 * en konto? Opret konto», «Har du allerede en konto? Log ind», sin el «aquí» del
 * español. Los errores dicen qué pasó («… kunne ikke …», «Der findes ingen …») y
 * qué hacer («Prøv igen»), con punto; los títulos de lo que falta dicen qué falta
 * («E-mailadresse mangler»), sin punto. Los códigos de Firebase
 * (`auth/user-not-found`) no están aquí: son identificadores.
 *
 * EL AVISO LEGAL va en cuatro trozos y el código acaba en el enlace de la
 * política de privacidad (`settings.privacyPolicy`), sin trozo final: «Ved at
 * oprette en konto accepterer du vores Vilkår og Privatlivspolitik». «vores»
 * no cambia con el género, así que `termsAnd` es solo « og ». Los nombres de
 * los documentos van con mayúscula, como los escribe Facebook en danés.
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en el
 * borde a propósito, porque la pantalla los pega con el enlace de al lado. El
 * ejemplo del campo de correo es una dirección danesa que se lee
 * («navn@eksempel.dk»).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Velkommen til Weë',
  signInToContinue: 'Log ind for at fortsætte',
  email: 'E-mailadresse',
  emailPlaceholder: 'navn@eksempel.dk',
  password: 'Adgangskode',
  passwordPlaceholder: 'Din adgangskode',
  forgotPassword: 'Har du glemt din adgangskode?',
  orContinueWith: 'Eller fortsæt med',
  continueWithGoogle: 'Fortsæt med Google',
  enterAsGuest: 'Fortsæt som gæst',
  noAccount: 'Har du ikke en konto? ',
  registerHere: 'Opret konto',
  signingIn: 'Logger ind…',

  fillAllFields: 'Udfyld alle felter.',
  signInFailed: 'Vi kunne ikke logge dig ind. Prøv igen.',
  authErrorTitle: 'Fejl ved login',
  errUserNotFound: 'Der findes ingen konto med denne e-mailadresse.',
  errWrongPassword: 'Adgangskoden er forkert. Prøv igen.',
  errInvalidEmail: 'E-mailadressen er ikke gyldig.',
  errUserDisabled: 'Denne konto er deaktiveret.',
  googleFailed: 'Vi kunne ikke logge dig ind med Google. Prøv igen.',
  anonymousFailed: 'Vi kunne ikke logge dig ind som gæst. Prøv igen.',
  emailRequiredTitle: 'E-mailadresse mangler',
  emailRequired: 'Skriv din e-mailadresse for at nulstille din adgangskode.',
  emailSentTitle: 'E-mail sendt',
  resetEmailSent: 'Tjek din indbakke for at nulstille din adgangskode.',
  resetFailed: 'Vi kunne ikke sende e-mailen til nulstilling af adgangskoden. Prøv igen.',

  createAccount: 'Opret din konto',
  joinWee: 'Bliv en del af Weë-fællesskabet',
  passwordMinPlaceholder: 'Mindst 6 tegn',
  confirmPassword: 'Bekræft adgangskode',
  confirmPasswordPlaceholder: 'Gentag din adgangskode',
  createAccountButton: 'Opret konto',
  orRegisterWith: 'Eller opret konto med',
  haveAccount: 'Har du allerede en konto? ',
  signInHere: 'Log ind',
  creatingAccount: 'Opretter konto…',

  termsIntro: 'Ved at oprette en konto accepterer du vores ',
  termsOfService: 'Vilkår',
  termsAnd: ' og ',

  emailMissingTitle: 'E-mailadresse mangler',
  emailMissing: 'Skriv din e-mailadresse for at fortsætte.',
  emailCheckTitle: 'Tjek din e-mailadresse',
  emailCheck: 'E-mailadressen ser ikke ud til at være gyldig.',
  passwordMissingTitle: 'Adgangskode mangler',
  passwordMissing: 'Skriv en adgangskode for at fortsætte.',
  passwordShortTitle: 'Adgangskoden er for kort',
  passwordShort: 'Brug mindst 6 tegn.',
  passwordsMismatchTitle: 'Adgangskoderne er ikke ens',
  passwordsMismatch: 'Skriv den samme adgangskode i begge felter.',

  signUpFailedTitle: 'Vi kunne ikke oprette din konto',
  signUpFailed: 'Noget gik galt, da kontoen skulle oprettes. Prøv igen.',
  errEmailInUse: 'Der findes allerede en konto med denne e-mailadresse.',
  errWeakPassword: 'Adgangskoden er for svag. Vælg en stærkere.',
  errSignUpNotAllowed: 'Det er ikke muligt at oprette en konto med e-mail.',
  googleFailedTitle: 'Vi kunne ikke fortsætte med Google',
  guestFailedTitle: 'Vi kunne ikke logge dig ind som gæst',
};
