/*
 * NORUEGO BOKMÅL — entrar en Weë: la pantalla de acceso y lo que dice cuando
 * algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los códigos de error de Firebase no se traducen; `{{detalle}}` sale sin
 * tocar. «Iniciar sesión» es «Logg inn», «registrarse» es «Registrer deg»,
 * «contraseña» es «passord» y «email» es «e-post» (glosario § 4). `noAccount` y
 * `haveAccount` terminan en espacio porque les sigue un enlace; `termsIntro` y
 * `termsAnd` se concatenan con los enlaces de los términos y la privacidad.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Velkommen til Weë',
  signInToContinue: 'Logg inn for å fortsette',
  email: 'E-post',
  emailPlaceholder: 'din@epost.no',
  password: 'Passord',
  passwordPlaceholder: 'Passordet ditt',
  forgotPassword: 'Glemt passordet?',
  orContinueWith: 'Eller fortsett med',
  continueWithGoogle: 'Fortsett med Google',
  enterAsGuest: 'Fortsett som gjest',
  noAccount: 'Har du ikke konto? ',
  registerHere: 'Registrer deg her',
  signingIn: 'Logger inn…',

  fillAllFields: 'Fyll ut alle feltene',
  signInFailed: 'Kunne ikke logge inn',
  authErrorTitle: 'Innloggingsfeil',
  errUserNotFound: 'Det finnes ingen konto med denne e-postadressen',
  errWrongPassword: 'Feil passord',
  errInvalidEmail: 'Ugyldig e-postadresse',
  errUserDisabled: 'Denne kontoen er deaktivert',
  googleFailed: 'Kunne ikke logge inn med Google. Prøv igjen.',
  anonymousFailed: 'Kunne ikke fortsette som gjest. Prøv igjen.',
  emailRequiredTitle: 'E-post kreves',
  emailRequired: 'Skriv inn e-postadressen din for å tilbakestille passordet',
  emailSentTitle: 'E-post sendt',
  resetEmailSent: 'Sjekk e-posten din for å tilbakestille passordet',
  resetFailed: 'Kunne ikke sende e-posten for å tilbakestille passordet. Prøv igjen.',

  /* ── EL ALTA ────────────────────────────────────────────────────────────
   * Comparte módulo con el acceso porque es la misma puerta, y reutiliza lo
   * que ya estaba escrito: `email`, `emailPlaceholder`, `password`,
   * `errInvalidEmail`, `continueWithGoogle` y `enterAsGuest`.
   */
  createAccount: 'Opprett kontoen din',
  joinWee: 'Bli med i fellesskapet Weë',
  passwordMinPlaceholder: 'Minst 6 tegn',
  confirmPassword: 'Bekreft passord',
  confirmPasswordPlaceholder: 'Gjenta passordet ditt',
  createAccountButton: 'Opprett konto',
  orRegisterWith: 'Eller registrer deg med',
  haveAccount: 'Har du allerede konto? ',
  signInHere: 'Logg inn her',
  creatingAccount: 'Oppretter konto…',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Når du oppretter en konto, godtar du våre ',
  termsOfService: 'vilkår for bruk',
  termsAnd: ' og ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'E-post mangler',
  emailMissing: 'Skriv inn e-postadressen din for å fortsette.',
  emailCheckTitle: 'Sjekk e-postadressen',
  emailCheck: 'Den e-postadressen ser ikke gyldig ut.',
  passwordMissingTitle: 'Passord mangler',
  passwordMissing: 'Skriv inn et passord for å fortsette.',
  passwordShortTitle: 'Passordet er for kort',
  passwordShort: 'Bruk minst 6 tegn.',
  passwordsMismatchTitle: 'Passordene er ikke like',
  passwordsMismatch: 'Skriv det samme passordet i begge feltene.',

  /* Y lo que contesta el alta cuando no puede. El código de Firebase se queda
   * tal cual: es un identificador, y la pantalla lo traduce a una de estas. */
  signUpFailedTitle: 'Vi kunne ikke opprette kontoen din',
  signUpFailed: 'Kunne ikke opprette kontoen',
  errEmailInUse: 'Det finnes allerede en konto med denne e-postadressen',
  errWeakPassword: 'Passordet er for svakt',
  errSignUpNotAllowed: 'Registrering med e-post er ikke tillatt',
  googleFailedTitle: 'Vi kunne ikke fortsette med Google',
  guestFailedTitle: 'Vi kunne ikke fortsette som gjest',
};
