/*
 * ALEMÁN — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer.
 * Los códigos de Firebase (`auth/user-not-found`) no están aquí: son
 * identificadores. Y `{{detalle}}` es lo que dijo el servidor, así que sale sin
 * tocar. Tratamiento informal (du).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Willkommen bei Weë',
  signInToContinue: 'Melde dich an, um fortzufahren',
  email: 'E-Mail',
  emailPlaceholder: 'du@email.com',
  password: 'Passwort',
  passwordPlaceholder: 'Dein Passwort',
  forgotPassword: 'Passwort vergessen?',
  orContinueWith: 'Oder weiter mit',
  continueWithGoogle: 'Mit Google fortfahren',
  enterAsGuest: 'Als Gast fortfahren',
  noAccount: 'Noch kein Konto? ',
  registerHere: 'Hier registrieren',
  signingIn: 'Anmeldung läuft...',

  fillAllFields: 'Bitte fülle alle Felder aus',
  signInFailed: 'Anmeldung fehlgeschlagen',
  authErrorTitle: 'Authentifizierungsfehler',
  errUserNotFound: 'Es gibt kein Konto mit dieser E-Mail-Adresse',
  errWrongPassword: 'Falsches Passwort',
  errInvalidEmail: 'Ungültige E-Mail-Adresse',
  errUserDisabled: 'Dieses Konto wurde deaktiviert',
  googleFailed: 'Die Anmeldung mit Google hat nicht geklappt. Versuch es noch einmal.',
  anonymousFailed: 'Der Zugang als Gast hat nicht geklappt. Versuch es noch einmal.',
  emailRequiredTitle: 'E-Mail erforderlich',
  emailRequired: 'Bitte gib deine E-Mail-Adresse ein, um dein Passwort zurückzusetzen',
  emailSentTitle: 'E-Mail gesendet',
  resetEmailSent: 'Schau in deine E-Mails, um dein Passwort zurückzusetzen',
  resetFailed: 'Die E-Mail zum Zurücksetzen konnte nicht gesendet werden. Versuch es noch einmal.',

  createAccount: 'Erstelle dein Konto',
  joinWee: 'Werde Teil der Weë Community',
  passwordMinPlaceholder: 'Mindestens 6 Zeichen',
  confirmPassword: 'Passwort bestätigen',
  confirmPasswordPlaceholder: 'Wiederhole dein Passwort',
  createAccountButton: 'Konto erstellen',
  orRegisterWith: 'Oder registrieren mit',
  haveAccount: 'Du hast schon ein Konto? ',
  signInHere: 'Hier anmelden',
  creatingAccount: 'Konto wird erstellt...',

  termsIntro: 'Mit dem Erstellen eines Kontos akzeptierst du unsere ',
  termsOfService: 'Nutzungsbedingungen',
  termsAnd: ' und ',

  emailMissingTitle: 'Deine E-Mail-Adresse fehlt',
  emailMissing: 'Gib deine E-Mail-Adresse ein, um fortzufahren.',
  emailCheckTitle: 'Prüf deine E-Mail-Adresse',
  emailCheck: 'Diese E-Mail-Adresse sieht nicht gültig aus.',
  passwordMissingTitle: 'Dein Passwort fehlt',
  passwordMissing: 'Gib ein Passwort ein, um fortzufahren.',
  passwordShortTitle: 'Passwort zu kurz',
  passwordShort: 'Verwende mindestens 6 Zeichen.',
  passwordsMismatchTitle: 'Die Passwörter stimmen nicht überein',
  passwordsMismatch: 'Gib in beiden Feldern dasselbe Passwort ein.',

  signUpFailedTitle: 'Wir konnten dein Konto nicht erstellen',
  signUpFailed: 'Das Konto konnte nicht erstellt werden',
  errEmailInUse: 'Es gibt bereits ein Konto mit dieser E-Mail-Adresse',
  errWeakPassword: 'Das Passwort ist zu schwach',
  errSignUpNotAllowed: 'Registrierung mit E-Mail ist nicht erlaubt',
  googleFailedTitle: 'Wir konnten nicht mit Google fortfahren',
  guestFailedTitle: 'Wir konnten dich nicht als Gast anmelden',
};
