/*
 * ITALIANO — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer.
 * Los códigos de Firebase (`auth/user-not-found`) no están aquí: son
 * identificadores. Y `{{detalle}}` es lo que dijo el servidor, así que sale sin
 * tocar. Tratamiento informal (tu) y apóstrofo tipográfico ’ (U+2019) siempre,
 * nunca el recto, que rompería la cadena.
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en
 * el borde a propósito, porque la pantalla los pega con el enlace de al lado.
 * El aviso legal se lee entero así: termsIntro + termsOfService + termsAnd +
 * settings.privacyPolicy → «Creando un account, accetti i nostri Termini di
 * servizio e la nostra Informativa sulla privacy.». Por eso `termsAnd` lleva
 * aquí el artículo femenino: en italiano la frase no cierra sin él.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Benvenuto su Weë',
  signInToContinue: 'Accedi per continuare',
  email: 'E-mail',
  emailPlaceholder: 'tu@email.com',
  password: 'Password',
  passwordPlaceholder: 'La tua password',
  forgotPassword: 'Hai dimenticato la password?',
  orContinueWith: 'Oppure continua con',
  continueWithGoogle: 'Continua con Google',
  enterAsGuest: 'Entra come ospite',
  noAccount: 'Non hai un account? ',
  registerHere: 'Registrati qui',
  signingIn: 'Accesso in corso...',

  fillAllFields: 'Compila tutti i campi',
  signInFailed: 'Errore durante l’accesso',
  authErrorTitle: 'Errore di autenticazione',
  errUserNotFound: 'Non esiste nessun account con questa e-mail',
  errWrongPassword: 'Password errata',
  errInvalidEmail: 'E-mail non valida',
  errUserDisabled: 'Questo account è stato disattivato',
  googleFailed: 'Errore durante l’accesso con Google: {{detalle}}',
  anonymousFailed: 'Errore durante l’accesso anonimo: {{detalle}}',
  emailRequiredTitle: 'E-mail richiesta',
  emailRequired: 'Inserisci la tua e-mail per reimpostare la password',
  emailSentTitle: 'E-mail inviata',
  resetEmailSent: 'Controlla la tua posta per reimpostare la password',
  resetFailed: 'Errore nell’invio dell’e-mail di reimpostazione: {{detalle}}',

  createAccount: 'Crea il tuo account',
  joinWee: 'Entra nella community di Weë',
  passwordMinPlaceholder: 'Almeno 6 caratteri',
  confirmPassword: 'Conferma la password',
  confirmPasswordPlaceholder: 'Ripeti la password',
  createAccountButton: 'Crea account',
  orRegisterWith: 'Oppure registrati con',
  haveAccount: 'Hai già un account? ',
  signInHere: 'Accedi qui',
  creatingAccount: 'Creazione dell’account...',

  termsIntro: 'Creando un account, accetti i nostri ',
  termsOfService: 'Termini di servizio',
  termsAnd: ' e la nostra ',

  emailMissingTitle: 'Manca la tua e-mail',
  emailMissing: 'Scrivi la tua e-mail per continuare.',
  emailCheckTitle: 'Controlla la tua e-mail',
  emailCheck: 'Questa e-mail non sembra valida.',
  passwordMissingTitle: 'Manca la tua password',
  passwordMissing: 'Scrivi una password per continuare.',
  passwordShortTitle: 'Password troppo corta',
  passwordShort: 'Usa almeno 6 caratteri.',
  passwordsMismatchTitle: 'Le password non coincidono',
  passwordsMismatch: 'Scrivi la stessa password nei due campi.',

  signUpFailedTitle: 'Non siamo riusciti a creare il tuo account',
  signUpFailed: 'Errore durante la creazione dell’account',
  errEmailInUse: 'Esiste già un account con questa e-mail',
  errWeakPassword: 'La password è troppo debole',
  errSignUpNotAllowed: 'La registrazione con e-mail non è consentita',
  googleFailedTitle: 'Non siamo riusciti a continuare con Google',
  guestFailedTitle: 'Non siamo riusciti a farti entrare come ospite',
};
