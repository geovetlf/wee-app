/*
 * RUMANO — entrar en Weë: la pantalla de acceso, el alta y lo que dicen cuando
 * algo no sale. Tipado contra el español.
 *
 * Los códigos de error de Firebase no están aquí: son identificadores. Los
 * espacios de borde de `noAccount`, `haveAccount`, `termsIntro` y `termsAnd`
 * son EXACTOS porque la pantalla concatena las piezas.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Bine ai venit pe Weë',
  signInToContinue: 'Conectează-te pentru a continua',
  email: 'E-mail',
  emailPlaceholder: 'tu@email.com',
  password: 'Parolă',
  passwordPlaceholder: 'Parola ta',
  forgotPassword: 'Ți-ai uitat parola?',
  orContinueWith: 'Sau continuă cu',
  continueWithGoogle: 'Continuă cu Google',
  enterAsGuest: 'Intră ca invitat',
  noAccount: 'Nu ai cont? ',
  registerHere: 'Înregistrează-te aici',
  signingIn: 'Se conectează...',

  fillAllFields: 'Te rugăm să completezi toate câmpurile',
  signInFailed: 'Eroare la conectare',
  authErrorTitle: 'Eroare de autentificare',
  errUserNotFound: 'Nu există niciun cont cu acest e-mail',
  errWrongPassword: 'Parolă incorectă',
  errInvalidEmail: 'E-mail invalid',
  errUserDisabled: 'Acest cont a fost dezactivat',
  googleFailed: 'Nu te-am putut conecta cu Google. Încearcă din nou.',
  anonymousFailed: 'Nu am putut intra ca invitat. Încearcă din nou.',
  emailRequiredTitle: 'E-mail necesar',
  emailRequired: 'Te rugăm să introduci e-mailul pentru a reseta parola',
  emailSentTitle: 'E-mail trimis',
  resetEmailSent: 'Verifică-ți e-mailul pentru a reseta parola',
  resetFailed: 'E-mailul pentru resetarea parolei nu a putut fi trimis. Încearcă din nou.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Creează-ți contul',
  joinWee: 'Alătură-te comunității Weë',
  passwordMinPlaceholder: 'Minimum 6 caractere',
  confirmPassword: 'Confirmă parola',
  confirmPasswordPlaceholder: 'Repetă parola',
  createAccountButton: 'Creează un cont',
  orRegisterWith: 'Sau înregistrează-te cu',
  haveAccount: 'Ai deja cont? ',
  signInHere: 'Conectează-te aici',
  creatingAccount: 'Se creează contul...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Creând un cont, accepți ',
  termsOfService: 'Termenii serviciului',
  termsAnd: ' și ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Lipsește e-mailul',
  emailMissing: 'Scrie-ți e-mailul pentru a continua.',
  emailCheckTitle: 'Verifică e-mailul',
  emailCheck: 'Acest e-mail nu pare valid.',
  passwordMissingTitle: 'Lipsește parola',
  passwordMissing: 'Scrie o parolă pentru a continua.',
  passwordShortTitle: 'Parolă prea scurtă',
  passwordShort: 'Folosește cel puțin 6 caractere.',
  passwordsMismatchTitle: 'Parolele nu coincid',
  passwordsMismatch: 'Scrie aceeași parolă în ambele câmpuri.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Nu am putut crea contul tău',
  signUpFailed: 'Eroare la crearea contului',
  errEmailInUse: 'Există deja un cont cu acest e-mail',
  errWeakPassword: 'Parola este prea slabă',
  errSignUpNotAllowed: 'Înregistrarea cu e-mail nu este permisă',
  googleFailedTitle: 'Nu am putut continua cu Google',
  guestFailedTitle: 'Nu am putut intra ca invitat',
};
