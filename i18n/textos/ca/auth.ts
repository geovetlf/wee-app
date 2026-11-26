/*
 * CATALÁN — entrar en Weë: la pantalla de acceso, el alta y lo que dicen
 * cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los códigos de Firebase no están aquí. `noAccount` y `haveAccount` terminan
 * en espacio y `termsIntro`/`termsAnd` se concatenan con enlaces: se conservan
 * los bordes.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Et donem la benvinguda a Weë',
  signInToContinue: 'Inicia la sessió per continuar',
  email: 'Correu electrònic',
  emailPlaceholder: 'tu@email.com',
  password: 'Contrasenya',
  passwordPlaceholder: 'La teva contrasenya',
  forgotPassword: 'Has oblidat la contrasenya?',
  orContinueWith: 'O continua amb',
  continueWithGoogle: 'Continua amb Google',
  enterAsGuest: 'Entra com a convidat',
  noAccount: 'No tens compte? ',
  registerHere: 'Registra\'t aquí',
  signingIn: 'S\'està iniciant la sessió...',

  fillAllFields: 'Emplena tots els camps',
  signInFailed: 'No s\'ha pogut iniciar la sessió',
  authErrorTitle: 'Error d\'autenticació',
  errUserNotFound: 'No hi ha cap compte amb aquest correu electrònic',
  errWrongPassword: 'Contrasenya incorrecta',
  errInvalidEmail: 'Correu electrònic no vàlid',
  errUserDisabled: 'Aquest compte s\'ha inhabilitat',
  googleFailed: 'No s\'ha pogut iniciar la sessió amb Google. Torna-ho a provar.',
  anonymousFailed: 'No s\'ha pogut entrar com a convidat. Torna-ho a provar.',
  emailRequiredTitle: 'Cal el correu electrònic',
  emailRequired: 'Escriu el correu electrònic per restablir la contrasenya',
  emailSentTitle: 'Correu enviat',
  resetEmailSent: 'Revisa el correu electrònic per restablir la contrasenya',
  resetFailed: 'No s\'ha pogut enviar el correu per restablir la contrasenya. Torna-ho a provar.',

  /* ── EL ALTA ──────────────────────────────────────────────────────── */
  createAccount: 'Crea el teu compte',
  joinWee: 'Uneix-te a la comunitat Weë',
  passwordMinPlaceholder: 'Mínim 6 caràcters',
  confirmPassword: 'Confirma la contrasenya',
  confirmPasswordPlaceholder: 'Repeteix la contrasenya',
  createAccountButton: 'Crea el compte',
  orRegisterWith: 'O registra\'t amb',
  haveAccount: 'Ja tens compte? ',
  signInHere: 'Inicia la sessió aquí',
  creatingAccount: 'S\'està creant el compte...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'En crear un compte, acceptes els nostres ',
  termsOfService: 'Termes del servei',
  termsAnd: ' i la ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Falta el correu electrònic',
  emailMissing: 'Escriu el correu electrònic per continuar.',
  emailCheckTitle: 'Revisa el correu electrònic',
  emailCheck: 'Aquest correu electrònic no sembla vàlid.',
  passwordMissingTitle: 'Falta la contrasenya',
  passwordMissing: 'Escriu una contrasenya per continuar.',
  passwordShortTitle: 'Contrasenya massa curta',
  passwordShort: 'Fes servir com a mínim 6 caràcters.',
  passwordsMismatchTitle: 'Les contrasenyes no coincideixen',
  passwordsMismatch: 'Escriu la mateixa contrasenya als dos camps.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'No hem pogut crear el compte',
  signUpFailed: 'No s\'ha pogut crear el compte',
  errEmailInUse: 'Ja hi ha un compte amb aquest correu electrònic',
  errWeakPassword: 'La contrasenya és massa feble',
  errSignUpNotAllowed: 'El registre amb correu electrònic no està permès',
  googleFailedTitle: 'No hem pogut continuar amb Google',
  guestFailedTitle: 'No hem pogut entrar com a convidat',
};
