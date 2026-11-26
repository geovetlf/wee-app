/*
 * BOSNIO (bs-BA, ijekaviano, latino) — entrar en Weë: acceso, alta y lo que
 * dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los códigos de error de Firebase no están aquí. Tuteo; «Dobro došli» es la
 * fórmula fija de bienvenida, neutra en género. `noAccount` y `haveAccount`
 * terminan en espacio porque les sigue un enlace; `termsIntro` + enlace +
 * `termsAnd` + enlace se concatenan, así que los nombres de los documentos van
 * en acusativo («Uslove korištenja»).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Dobro došli u Weë',
  signInToContinue: 'Prijavi se da nastaviš',
  email: 'E-mail',
  emailPlaceholder: 'ti@email.com',
  password: 'Lozinka',
  passwordPlaceholder: 'Tvoja lozinka',
  forgotPassword: 'Zaboravljena lozinka?',
  orContinueWith: 'Ili nastavi putem',
  continueWithGoogle: 'Nastavi s Googleom',
  enterAsGuest: 'Uđi kao gost',
  noAccount: 'Nemaš račun? ',
  registerHere: 'Registruj se ovdje',
  signingIn: 'Prijava u toku...',

  fillAllFields: 'Popuni sva polja',
  signInFailed: 'Greška pri prijavi',
  authErrorTitle: 'Greška pri autentifikaciji',
  errUserNotFound: 'Ne postoji račun s ovim e-mailom',
  errWrongPassword: 'Pogrešna lozinka',
  errInvalidEmail: 'Nevažeći e-mail',
  errUserDisabled: 'Ovaj račun je onemogućen',
  googleFailed: 'Prijava putem Googlea nije uspjela. Pokušaj ponovo.',
  anonymousFailed: 'Ulazak kao gost nije uspio. Pokušaj ponovo.',
  emailRequiredTitle: 'Potreban je e-mail',
  emailRequired: 'Unesi svoj e-mail da resetuješ lozinku',
  emailSentTitle: 'E-mail je poslan',
  resetEmailSent: 'Provjeri svoj e-mail da resetuješ lozinku',
  resetFailed: 'E-mail za resetovanje lozinke nije bilo moguće poslati. Pokušaj ponovo.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Kreiraj svoj račun',
  joinWee: 'Pridruži se Weë zajednici',
  passwordMinPlaceholder: 'Najmanje 6 znakova',
  confirmPassword: 'Potvrdi lozinku',
  confirmPasswordPlaceholder: 'Ponovi svoju lozinku',
  createAccountButton: 'Kreiraj račun',
  orRegisterWith: 'Ili se registruj putem',
  haveAccount: 'Već imaš račun? ',
  signInHere: 'Prijavi se ovdje',
  creatingAccount: 'Kreiranje računa...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Kreiranjem računa prihvataš naše ',
  termsOfService: 'Uslove korištenja',
  termsAnd: ' i ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Nedostaje tvoj e-mail',
  emailMissing: 'Upiši svoj e-mail da nastaviš.',
  emailCheckTitle: 'Provjeri svoj e-mail',
  emailCheck: 'Taj e-mail ne izgleda ispravno.',
  passwordMissingTitle: 'Nedostaje tvoja lozinka',
  passwordMissing: 'Upiši lozinku da nastaviš.',
  passwordShortTitle: 'Lozinka je prekratka',
  passwordShort: 'Koristi najmanje 6 znakova.',
  passwordsMismatchTitle: 'Lozinke se ne podudaraju',
  passwordsMismatch: 'Upiši istu lozinku u oba polja.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Nismo mogli kreirati tvoj račun',
  signUpFailed: 'Greška pri kreiranju računa',
  errEmailInUse: 'Već postoji račun s ovim e-mailom',
  errWeakPassword: 'Lozinka je preslaba',
  errSignUpNotAllowed: 'Registracija e-mailom nije dozvoljena',
  googleFailedTitle: 'Nismo mogli nastaviti s Googleom',
  guestFailedTitle: 'Nismo mogli ući kao gost',
};
