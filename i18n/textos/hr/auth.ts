/*
 * CROATA — entrar en Weë: la pantalla de acceso, el alta y lo que dicen cuando
 * algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). Los códigos de error de Firebase y el `{{detalle}}` del
 * proveedor no se traducen. Los placeholders de email se dejan como en el
 * molde. `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` conservan sus
 * espacios de borde porque se concatenan con enlaces.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Dobro došli u Weë',
  signInToContinue: 'Prijavi se za nastavak',
  email: 'E-pošta',
  emailPlaceholder: 'ime@primjer.hr',
  password: 'Lozinka',
  passwordPlaceholder: 'Tvoja lozinka',
  forgotPassword: 'Zaboravljena lozinka?',
  orContinueWith: 'Ili nastavi s',
  continueWithGoogle: 'Nastavi s Googleom',
  enterAsGuest: 'Uđi kao gost',
  noAccount: 'Nemaš račun? ',
  registerHere: 'Registriraj se ovdje',
  signingIn: 'Prijava u tijeku...',

  fillAllFields: 'Ispuni sva polja',
  signInFailed: 'Pogreška pri prijavi',
  authErrorTitle: 'Pogreška pri provjeri identiteta',
  errUserNotFound: 'Ne postoji račun s ovom adresom e-pošte',
  errWrongPassword: 'Netočna lozinka',
  errInvalidEmail: 'Nevažeća adresa e-pošte',
  errUserDisabled: 'Ovaj je račun onemogućen',
  googleFailed: 'Prijava putem Googlea nije uspjela. Pokušaj ponovno.',
  anonymousFailed: 'Ulazak kao gost nije uspio. Pokušaj ponovno.',
  emailRequiredTitle: 'Potrebna je adresa e-pošte',
  emailRequired: 'Unesi svoju adresu e-pošte za ponovno postavljanje lozinke',
  emailSentTitle: 'Poruka je poslana',
  resetEmailSent: 'Provjeri svoju e-poštu da ponovno postaviš lozinku',
  resetFailed: 'Poruku za ponovno postavljanje lozinke nije bilo moguće poslati. Pokušaj ponovno.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Stvori svoj račun',
  joinWee: 'Pridruži se zajednici Weë',
  passwordMinPlaceholder: 'Najmanje 6 znakova',
  confirmPassword: 'Potvrdi lozinku',
  confirmPasswordPlaceholder: 'Ponovi lozinku',
  createAccountButton: 'Stvori račun',
  orRegisterWith: 'Ili se registriraj s',
  haveAccount: 'Već imaš račun? ',
  signInHere: 'Prijavi se ovdje',
  creatingAccount: 'Stvaranje računa...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Stvaranjem računa prihvaćaš naše ',
  termsOfService: 'Uvjete pružanja usluge',
  termsAnd: ' i ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Nedostaje adresa e-pošte',
  emailMissing: 'Upiši svoju adresu e-pošte za nastavak.',
  emailCheckTitle: 'Provjeri adresu e-pošte',
  emailCheck: 'Ta adresa e-pošte ne izgleda valjano.',
  passwordMissingTitle: 'Nedostaje lozinka',
  passwordMissing: 'Upiši lozinku za nastavak.',
  passwordShortTitle: 'Lozinka je prekratka',
  passwordShort: 'Upotrijebi najmanje 6 znakova.',
  passwordsMismatchTitle: 'Lozinke se ne podudaraju',
  passwordsMismatch: 'Upiši istu lozinku u oba polja.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Nismo mogli stvoriti tvoj račun',
  signUpFailed: 'Pogreška pri stvaranju računa',
  errEmailInUse: 'Račun s ovom adresom e-pošte već postoji',
  errWeakPassword: 'Lozinka je preslaba',
  errSignUpNotAllowed: 'Registracija e-poštom nije dopuštena',
  googleFailedTitle: 'Nismo mogli nastaviti s Googleom',
  guestFailedTitle: 'Nismo mogli ući kao gost',
};
