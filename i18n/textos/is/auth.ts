/*
 * ISLANDÉS (is · is-IS) — entrar en Weë: la pantalla de acceso, el alta y sus errores.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Glosario: «Netfang» (email), «Lykilorð», «Skrá inn», «Stofna aðgang», «Halda áfram sem gestur».
 * «Velkomin í Weë» sin marca de género (pendiente, guía § 6). El aviso legal va en cuatro trozos:
 * «… samþykkir þú eftirfarandi: » + enlace + « og » + enlace. Los dos puntos dejan los enlaces en
 * nominativo de rótulo («Þjónustuskilmálar», `settings.privacyPolicy` = «Persónuverndarstefna»), que el
 * segundo comparte con Configuración y no puede ir en acusativo.
 * El ejemplo de email usa el dominio .is, sin caracteres no ASCII antes de la arroba.
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Velkomin í Weë',
  signInToContinue: 'Skráðu þig inn til að halda áfram',
  email: 'Netfang',
  emailPlaceholder: 'netfang@daemi.is',
  password: 'Lykilorð',
  passwordPlaceholder: 'Lykilorðið þitt',
  forgotPassword: 'Gleymdirðu lykilorðinu?',
  orContinueWith: 'Eða haltu áfram með',
  continueWithGoogle: 'Halda áfram með Google',
  enterAsGuest: 'Halda áfram sem gestur',
  noAccount: 'Ertu ekki með aðgang? ',
  registerHere: 'Skráðu þig hér',
  signingIn: 'Skráir inn…',

  fillAllFields: 'Fylltu út alla reiti',
  signInFailed: 'Ekki tókst að skrá inn',
  authErrorTitle: 'Villa í innskráningu',
  errUserNotFound: 'Enginn aðgangur er til með þessu netfangi',
  errWrongPassword: 'Rangt lykilorð',
  errInvalidEmail: 'Ógilt netfang',
  errUserDisabled: 'Þessi aðgangur hefur verið gerður óvirkur',
  googleFailed: 'Ekki tókst að skrá inn með Google. Reyndu aftur.',
  anonymousFailed: 'Ekki tókst að halda áfram sem gestur. Reyndu aftur.',
  emailRequiredTitle: 'Netfang vantar',
  emailRequired: 'Sláðu inn netfangið þitt til að endurstilla lykilorðið',
  emailSentTitle: 'Tölvupóstur sendur',
  resetEmailSent: 'Athugaðu tölvupóstinn þinn til að endurstilla lykilorðið',
  resetFailed: 'Ekki tókst að senda tölvupóst til að endurstilla lykilorðið. Reyndu aftur.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Stofnaðu aðgang',
  joinWee: 'Vertu með í samfélaginu Weë',
  passwordMinPlaceholder: 'Að minnsta kosti 6 stafir',
  confirmPassword: 'Staðfesta lykilorð',
  confirmPasswordPlaceholder: 'Endurtaktu lykilorðið',
  createAccountButton: 'Stofna aðgang',
  orRegisterWith: 'Eða skráðu þig með',
  haveAccount: 'Ertu nú þegar með aðgang? ',
  signInHere: 'Skráðu þig inn hér',
  creatingAccount: 'Stofnar aðgang…',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Með því að stofna aðgang samþykkir þú eftirfarandi: ',
  termsOfService: 'Þjónustuskilmálar',
  termsAnd: ' og ',

  /* Lo que se comprueba antes de mandar nada. */
  emailMissingTitle: 'Netfangið vantar',
  emailMissing: 'Skrifaðu netfangið þitt til að halda áfram.',
  emailCheckTitle: 'Athugaðu netfangið',
  emailCheck: 'Þetta netfang virðist ekki gilt.',
  passwordMissingTitle: 'Lykilorðið vantar',
  passwordMissing: 'Skrifaðu lykilorð til að halda áfram.',
  passwordShortTitle: 'Of stutt lykilorð',
  passwordShort: 'Notaðu að minnsta kosti 6 stafi.',
  passwordsMismatchTitle: 'Lykilorðin stemma ekki',
  passwordsMismatch: 'Skrifaðu sama lykilorðið í báða reitina.',

  /* Lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Ekki tókst að stofna aðganginn þinn',
  signUpFailed: 'Villa við að stofna aðgang',
  errEmailInUse: 'Það er þegar til aðgangur með þessu netfangi',
  errWeakPassword: 'Lykilorðið er of veikt',
  errSignUpNotAllowed: 'Skráning með netfangi er ekki leyfð',
  googleFailedTitle: 'Ekki tókst að halda áfram með Google',
  guestFailedTitle: 'Ekki tókst að halda áfram sem gestur',
};
