/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica, ekavski) — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español. Los códigos de error de Firebase no están aquí y
 * `{{detalle}}` sale sin tocar. «Dobro došli» es la bienvenida neutra del
 * serbio (el singular marca género). «Google» va transliterado («Gugl»), como es
 * habitual en cirílico; el placeholder del email lleva la parte local en cirílico.
 * `noAccount` y `haveAccount` terminan en espacio; `termsIntro` y `termsAnd`
 * se concatenan con enlaces.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Dobro došli u Weë',
  signInToContinue: 'Prijavi se da nastaviš',
  email: 'Imejl',
  emailPlaceholder: 'ime@email.com',
  password: 'Lozinka',
  passwordPlaceholder: 'Tvoja lozinka',
  forgotPassword: 'Zaboravljena lozinka?',
  orContinueWith: 'Ili nastavi preko',
  continueWithGoogle: 'Nastavi preko Google naloga',
  enterAsGuest: 'Uđi kao gost',
  noAccount: 'Nemaš nalog? ',
  registerHere: 'Registruj se ovde',
  signingIn: 'Prijavljivanje...',

  fillAllFields: 'Popuni sva polja',
  signInFailed: 'Greška pri prijavi',
  authErrorTitle: 'Greška pri proveri identiteta',
  errUserNotFound: 'Ne postoji nalog s ovim imejlom',
  errWrongPassword: 'Pogrešna lozinka',
  errInvalidEmail: 'Nevažeći imejl',
  errUserDisabled: 'Ovaj nalog je onemogućen',
  googleFailed: 'Prijava preko Google naloga nije uspela. Pokušaj ponovo.',
  anonymousFailed: 'Ulazak kao gost nije uspeo. Pokušaj ponovo.',
  emailRequiredTitle: 'Potreban je imejl',
  emailRequired: 'Unesi svoj imejl za resetovanje lozinke',
  emailSentTitle: 'Imejl je poslat',
  resetEmailSent: 'Proveri imejl da resetuješ lozinku',
  resetFailed: 'Imejl za resetovanje lozinke nije mogao da se pošalje. Pokušaj ponovo.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Napravi svoj nalog',
  joinWee: 'Pridruži se Weë zajednici',
  passwordMinPlaceholder: 'Najmanje 6 znakova',
  confirmPassword: 'Potvrdi lozinku',
  confirmPasswordPlaceholder: 'Ponovi lozinku',
  createAccountButton: 'Napravi nalog',
  orRegisterWith: 'Ili se registruj preko',
  haveAccount: 'Već imaš nalog? ',
  signInHere: 'Prijavi se ovde',
  creatingAccount: 'Pravljenje naloga...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Pravljenjem naloga prihvataš naše ',
  termsOfService: 'Uslove korišćenja',
  termsAnd: ' i ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Nedostaje imejl',
  emailMissing: 'Upiši svoj imejl da nastaviš.',
  emailCheckTitle: 'Proveri imejl',
  emailCheck: 'Taj imejl ne izgleda ispravno.',
  passwordMissingTitle: 'Nedostaje lozinka',
  passwordMissing: 'Upiši lozinku da nastaviš.',
  passwordShortTitle: 'Lozinka je prekratka',
  passwordShort: 'Koristi najmanje 6 znakova.',
  passwordsMismatchTitle: 'Lozinke se ne poklapaju',
  passwordsMismatch: 'Upiši istu lozinku u oba polja.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Nismo mogli da napravimo tvoj nalog',
  signUpFailed: 'Pravljenje naloga nije uspelo',
  errEmailInUse: 'Već postoji nalog s ovim imejlom',
  errWeakPassword: 'Lozinka je preslaba',
  errSignUpNotAllowed: 'Registracija imejlom nije dozvoljena',
  googleFailedTitle: 'Nismo mogli da nastavimo preko Google naloga',
  guestFailedTitle: 'Nismo uspeli da te prijavimo kao gosta',
};
