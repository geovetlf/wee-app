/*
 * SUECO — entrar en Weë y darse de alta: las pantallas de acceso y de registro,
 * y lo que dicen cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (§ 9.3) y las de las apps suecas: «Logga in»,
 * «Registrera dig», «Skapa konto», «lösenord», «e-postadress» (el campo) y «gäst»;
 * «¿Olvidaste tu contraseña?» es «Har du glömt lösenordet?», y las dos frases del
 * pie son las de Instagram: «Har du inget konto? Registrera dig», «Har du redan
 * ett konto? Logga in», sin el «aquí» del español. Los errores dicen qué pasó con
 * «Det gick inte att …» y qué hacer, «Försök igen»; los títulos de lo que falta
 * dicen qué falta («E-postadress saknas»). Un correo concreto es un «mejl».
 * Los códigos de Firebase (`auth/user-not-found`) no están aquí: son
 * identificadores.
 *
 * EL AVISO LEGAL va en cuatro trozos y el código acaba en el enlace de la
 * política de privacidad (`settings.privacyPolicy`), sin trozo final. `termsAnd`
 * es « och vår » para que la frase concuerde con el segundo enlace, que es
 * singular: «godkänner du våra Användarvillkor och vår Integritetspolicy». El
 * nombre del documento va con mayúscula, como el título de un documento, igual
 * que el de la privacidad que llega de Configuración.
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en el
 * borde a propósito, porque la pantalla los pega con el enlace de al lado. El
 * ejemplo del campo de correo es una dirección sueca que se lee
 * («namn@exempel.se»).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Välkommen till Weë',
  signInToContinue: 'Logga in för att fortsätta',
  email: 'E-postadress',
  emailPlaceholder: 'namn@exempel.se',
  password: 'Lösenord',
  passwordPlaceholder: 'Ditt lösenord',
  forgotPassword: 'Har du glömt lösenordet?',
  orContinueWith: 'Eller fortsätt med',
  continueWithGoogle: 'Fortsätt med Google',
  enterAsGuest: 'Fortsätt som gäst',
  noAccount: 'Har du inget konto? ',
  registerHere: 'Registrera dig',
  signingIn: 'Loggar in…',

  fillAllFields: 'Fyll i alla fält',
  signInFailed: 'Det gick inte att logga in',
  authErrorTitle: 'Inloggningsfel',
  errUserNotFound: 'Det finns inget konto med den här e-postadressen',
  errWrongPassword: 'Fel lösenord',
  errInvalidEmail: 'Ogiltig e-postadress',
  errUserDisabled: 'Kontot har inaktiverats',
  googleFailed: 'Det gick inte att logga in med Google. Försök igen.',
  anonymousFailed: 'Det gick inte att fortsätta som gäst. Försök igen.',
  emailRequiredTitle: 'E-postadress krävs',
  emailRequired: 'Ange din e-postadress för att återställa lösenordet',
  emailSentTitle: 'Mejl skickat',
  resetEmailSent: 'Kolla din e-post för att återställa lösenordet',
  resetFailed: 'Det gick inte att skicka mejlet för att återställa lösenordet. Försök igen.',

  createAccount: 'Skapa ditt konto',
  joinWee: 'Gå med i Weë-communityn',
  passwordMinPlaceholder: 'Minst 6 tecken',
  confirmPassword: 'Bekräfta lösenord',
  confirmPasswordPlaceholder: 'Upprepa lösenordet',
  createAccountButton: 'Skapa konto',
  orRegisterWith: 'Eller registrera dig med',
  haveAccount: 'Har du redan ett konto? ',
  signInHere: 'Logga in',
  creatingAccount: 'Skapar konto…',

  termsIntro: 'Genom att skapa ett konto godkänner du våra ',
  termsOfService: 'Användarvillkor',
  termsAnd: ' och vår ',

  emailMissingTitle: 'E-postadress saknas',
  emailMissing: 'Ange din e-postadress för att fortsätta.',
  emailCheckTitle: 'Kontrollera e-postadressen',
  emailCheck: 'E-postadressen verkar inte vara giltig.',
  passwordMissingTitle: 'Lösenord saknas',
  passwordMissing: 'Ange ett lösenord för att fortsätta.',
  passwordShortTitle: 'För kort lösenord',
  passwordShort: 'Använd minst 6 tecken.',
  passwordsMismatchTitle: 'Lösenorden stämmer inte överens',
  passwordsMismatch: 'Ange samma lösenord i båda fälten.',

  signUpFailedTitle: 'Det gick inte att skapa kontot',
  signUpFailed: 'Något gick fel när kontot skulle skapas. Försök igen.',
  errEmailInUse: 'Det finns redan ett konto med den här e-postadressen',
  errWeakPassword: 'Lösenordet är för svagt',
  errSignUpNotAllowed: 'Registrering med e-post är inte tillåten',
  googleFailedTitle: 'Det gick inte att fortsätta med Google',
  guestFailedTitle: 'Det gick inte att fortsätta som gäst',
};
