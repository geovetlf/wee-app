/*
 * MONTENEGRINO — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Ijekaviano, latino. Tipado contra el español: si allí hay una clave que aquí
 * falta, no compila. Los códigos de error de Firebase no están aquí: la
 * pantalla los traduce a una de estas frases. `noAccount` y `haveAccount`
 * terminan en espacio, y `termsIntro`/`termsAnd` se concatenan con enlaces.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Dobro došao/la na Weë',
  signInToContinue: 'Prijavi se da nastaviš',
  email: 'Imejl',
  emailPlaceholder: 'ti@imejl.com',
  password: 'Lozinka',
  passwordPlaceholder: 'Tvoja lozinka',
  forgotPassword: 'Zaboravio/la si lozinku?',
  orContinueWith: 'Ili nastavi sa',
  continueWithGoogle: 'Nastavi s Google nalogom',
  enterAsGuest: 'Uđi kao gost',
  noAccount: 'Nemaš nalog? ',
  registerHere: 'Registruj se ovdje',
  signingIn: 'Prijavljivanje...',

  fillAllFields: 'Popuni sva polja',
  signInFailed: 'Greška pri prijavljivanju',
  authErrorTitle: 'Greška pri autentifikaciji',
  errUserNotFound: 'Ne postoji nalog s ovim imejlom',
  errWrongPassword: 'Pogrešna lozinka',
  errInvalidEmail: 'Nevažeći imejl',
  errUserDisabled: 'Ovaj nalog je onemogućen',
  googleFailed: 'Prijavljivanje s Google nalogom nije uspjelo. Pokušaj ponovo.',
  anonymousFailed: 'Ulazak kao gost nije uspio. Pokušaj ponovo.',
  emailRequiredTitle: 'Potreban je imejl',
  emailRequired: 'Unesi svoj imejl da resetuješ lozinku',
  emailSentTitle: 'Imejl je poslat',
  resetEmailSent: 'Provjeri svoju elektronsku poštu da resetuješ lozinku',
  resetFailed: 'Imejl za resetovanje lozinke nije mogao da se pošalje. Pokušaj ponovo.',

  /* ── EL ALTA ────────────────────────────────────────────────────────────
   * Comparte módulo con el acceso porque es la misma puerta, y reutiliza lo
   * que ya estaba escrito: `email`, `emailPlaceholder`, `password`,
   * `errInvalidEmail`, `continueWithGoogle` y `enterAsGuest`.
   */
  createAccount: 'Kreiraj svoj nalog',
  joinWee: 'Pridruži se zajednici Weë',
  passwordMinPlaceholder: 'Najmanje 6 znakova',
  confirmPassword: 'Potvrdi lozinku',
  confirmPasswordPlaceholder: 'Ponovi svoju lozinku',
  createAccountButton: 'Kreiraj nalog',
  orRegisterWith: 'Ili se registruj sa',
  haveAccount: 'Već imaš nalog? ',
  signInHere: 'Prijavi se ovdje',
  creatingAccount: 'Kreiranje naloga...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Kreiranjem naloga prihvataš naše ',
  termsOfService: 'Uslove korišćenja',
  termsAnd: ' i ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Nedostaje tvoj imejl',
  emailMissing: 'Upiši svoj imejl da nastaviš.',
  emailCheckTitle: 'Provjeri svoj imejl',
  emailCheck: 'Taj imejl ne izgleda ispravno.',
  passwordMissingTitle: 'Nedostaje tvoja lozinka',
  passwordMissing: 'Upiši lozinku da nastaviš.',
  passwordShortTitle: 'Lozinka je prekratka',
  passwordShort: 'Koristi najmanje 6 znakova.',
  passwordsMismatchTitle: 'Lozinke se ne poklapaju',
  passwordsMismatch: 'Upiši istu lozinku u oba polja.',

  /* Y lo que contesta el alta cuando no puede. El código de Firebase se queda
   * tal cual: es un identificador, y la pantalla lo traduce a una de estas. */
  signUpFailedTitle: 'Nijesmo mogli da kreiramo tvoj nalog',
  signUpFailed: 'Greška pri kreiranju naloga',
  errEmailInUse: 'Već postoji nalog s ovim imejlom',
  errWeakPassword: 'Lozinka je preslaba',
  errSignUpNotAllowed: 'Registracija imejlom nije dozvoljena',
  googleFailedTitle: 'Nijesmo mogli da nastavimo s Google nalogom',
  guestFailedTitle: 'Nijesmo mogli da te pustimo da uđeš kao gost',
};
