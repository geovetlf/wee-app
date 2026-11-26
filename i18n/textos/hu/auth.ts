/*
 * HÚNGARO — Entrar en Weë: acceso, alta y lo que dice cuando algo no sale.
 * Tipado contra el español.
 *
 * El aviso legal se concatena en piezas (RegisterScreen): intro + enlace +
 * « és » + enlace de privacidad. Como el húngaro pediría acusativo en los
 * enlaces, la intro termina en «az alábbiakat: » y los enlaces van en
 * nominativo. Espacios de borde idénticos al español.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Üdv a Weë-ben',
  signInToContinue: 'Jelentkezz be a folytatáshoz',
  email: 'E-mail',
  emailPlaceholder: 'te@email.com',
  password: 'Jelszó',
  passwordPlaceholder: 'A jelszavad',
  forgotPassword: 'Elfelejtetted a jelszavad?',
  orContinueWith: 'Vagy folytasd ezzel:',
  continueWithGoogle: 'Folytatás Google-fiókkal',
  enterAsGuest: 'Belépés vendégként',
  noAccount: 'Még nincs fiókod? ',
  registerHere: 'Regisztrálj itt',
  signingIn: 'Bejelentkezés...',

  fillAllFields: 'Kérjük, tölts ki minden mezőt',
  signInFailed: 'Nem sikerült bejelentkezni',
  authErrorTitle: 'Hitelesítési hiba',
  errUserNotFound: 'Ezzel az e-mail-címmel nincs fiók',
  errWrongPassword: 'Hibás jelszó',
  errInvalidEmail: 'Érvénytelen e-mail-cím',
  errUserDisabled: 'Ezt a fiókot letiltották',
  googleFailed: 'Nem sikerült bejelentkezni a Google-lel. Próbáld újra.',
  anonymousFailed: 'Nem sikerült vendégként belépni. Próbáld újra.',
  emailRequiredTitle: 'E-mail-cím szükséges',
  emailRequired: 'A jelszó visszaállításához add meg az e-mail-címedet',
  emailSentTitle: 'E-mail elküldve',
  resetEmailSent: 'Nézd meg a postafiókodat a jelszó visszaállításához',
  resetFailed: 'Nem sikerült elküldeni a jelszó-visszaállító e-mailt. Próbáld újra.',

  /* ── Regisztráció ── */
  createAccount: 'Hozd létre a fiókodat',
  joinWee: 'Csatlakozz a Weë közösségéhez',
  passwordMinPlaceholder: 'Legalább 6 karakter',
  confirmPassword: 'Jelszó megerősítése',
  confirmPasswordPlaceholder: 'Írd be újra a jelszavad',
  createAccountButton: 'Fiók létrehozása',
  orRegisterWith: 'Vagy regisztrálj ezzel:',
  haveAccount: 'Már van fiókod? ',
  signInHere: 'Jelentkezz be itt',
  creatingAccount: 'Fiók létrehozása...',

  /* A jogi szöveg négy darabban: kettő közülük link. */
  termsIntro: 'A fiók létrehozásával elfogadod az alábbiakat: ',
  termsOfService: 'Felhasználási feltételek',
  termsAnd: ' és ',

  /* Ellenőrzések küldés előtt. */
  emailMissingTitle: 'Hiányzik az e-mail-címed',
  emailMissing: 'A folytatáshoz írd be az e-mail-címedet.',
  emailCheckTitle: 'Ellenőrizd az e-mail-címedet',
  emailCheck: 'Ez az e-mail-cím nem tűnik érvényesnek.',
  passwordMissingTitle: 'Hiányzik a jelszavad',
  passwordMissing: 'A folytatáshoz adj meg egy jelszót.',
  passwordShortTitle: 'Túl rövid jelszó',
  passwordShort: 'Legalább 6 karaktert használj.',
  passwordsMismatchTitle: 'A jelszavak nem egyeznek',
  passwordsMismatch: 'Mindkét mezőbe ugyanazt a jelszót írd.',

  /* Ha a regisztráció nem sikerül. */
  signUpFailedTitle: 'Nem sikerült létrehozni a fiókodat',
  signUpFailed: 'Hiba a fiók létrehozásakor',
  errEmailInUse: 'Ezzel az e-mail-címmel már van fiók',
  errWeakPassword: 'A jelszó túl gyenge',
  errSignUpNotAllowed: 'Az e-mailes regisztráció nem engedélyezett',
  googleFailedTitle: 'Nem sikerült folytatni a Google-lel',
  guestFailedTitle: 'Nem sikerült vendégként belépni',
};
