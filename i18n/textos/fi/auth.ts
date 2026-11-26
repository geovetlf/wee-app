/*
 * FINÉS — Entrar en Weë: acceso y alta, y lo que dicen cuando algo no sale.
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Email» se queda como «Sähköposti» (la palabra corriente en las apps
 * finlandesas). El aviso legal va en trozos que la pantalla concatena
 * (`termsIntro` + `termsOfService` + `termsAnd` + settings.privacyPolicy);
 * como el objeto de «hyväksyt» pediría caso y la última pieza llega de otro
 * módulo en nominativo, la frase se abre con «seuraavat:» para que las dos
 * piezas queden en nominativo. Los espacios de borde son los del español.
 * `{{detalle}}` no existe en este módulo: los códigos de Firebase se quedan
 * fuera.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Tervetuloa Weë-sovellukseen',
  signInToContinue: 'Kirjaudu sisään jatkaaksesi',
  email: 'Sähköposti',
  emailPlaceholder: 'nimi@esimerkki.fi',
  password: 'Salasana',
  passwordPlaceholder: 'Salasanasi',
  forgotPassword: 'Unohditko salasanasi?',
  orContinueWith: 'Tai jatka palvelulla',
  continueWithGoogle: 'Jatka Google-tilillä',
  enterAsGuest: 'Jatka vieraana',
  noAccount: 'Eikö sinulla ole tiliä? ',
  registerHere: 'Rekisteröidy tästä',
  signingIn: 'Kirjaudutaan sisään...',

  fillAllFields: 'Täytä kaikki kentät',
  signInFailed: 'Sisäänkirjautuminen epäonnistui',
  authErrorTitle: 'Tunnistautumisvirhe',
  errUserNotFound: 'Tällä sähköpostiosoitteella ei ole tiliä',
  errWrongPassword: 'Väärä salasana',
  errInvalidEmail: 'Virheellinen sähköpostiosoite',
  errUserDisabled: 'Tämä tili on poistettu käytöstä',
  googleFailed: 'Kirjautuminen Google-tilillä ei onnistunut. Yritä uudelleen.',
  anonymousFailed: 'Vieraana jatkaminen ei onnistunut. Yritä uudelleen.',
  emailRequiredTitle: 'Sähköpostiosoite vaaditaan',
  emailRequired: 'Kirjoita sähköpostiosoitteesi salasanan palauttamista varten',
  emailSentTitle: 'Sähköposti lähetetty',
  resetEmailSent: 'Tarkista sähköpostisi palauttaaksesi salasanasi',
  resetFailed: 'Salasanan palautusviestiä ei voitu lähettää. Yritä uudelleen.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Luo tilisi',
  joinWee: 'Liity Weë-yhteisöön',
  passwordMinPlaceholder: 'Vähintään 6 merkkiä',
  confirmPassword: 'Vahvista salasana',
  confirmPasswordPlaceholder: 'Toista salasanasi',
  createAccountButton: 'Luo tili',
  orRegisterWith: 'Tai rekisteröidy palvelulla',
  haveAccount: 'Onko sinulla jo tili? ',
  signInHere: 'Kirjaudu sisään tästä',
  creatingAccount: 'Luodaan tiliä...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Luomalla tilin hyväksyt seuraavat: ',
  termsOfService: 'Käyttöehdot',
  termsAnd: ' ja ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Sähköpostiosoite puuttuu',
  emailMissing: 'Kirjoita sähköpostiosoitteesi jatkaaksesi.',
  emailCheckTitle: 'Tarkista sähköpostiosoite',
  emailCheck: 'Sähköpostiosoite ei näytä kelvolliselta.',
  passwordMissingTitle: 'Salasana puuttuu',
  passwordMissing: 'Kirjoita salasana jatkaaksesi.',
  passwordShortTitle: 'Liian lyhyt salasana',
  passwordShort: 'Käytä vähintään 6 merkkiä.',
  passwordsMismatchTitle: 'Salasanat eivät täsmää',
  passwordsMismatch: 'Kirjoita sama salasana molempiin kenttiin.',

  /* Lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Tiliäsi ei voitu luoda',
  signUpFailed: 'Tilin luominen epäonnistui',
  errEmailInUse: 'Tällä sähköpostiosoitteella on jo tili',
  errWeakPassword: 'Salasana on liian heikko',
  errSignUpNotAllowed: 'Rekisteröityminen sähköpostilla ei ole sallittua',
  googleFailedTitle: 'Jatkaminen Google-tilillä ei onnistunut',
  guestFailedTitle: 'Vieraana jatkaminen ei onnistunut',
};
