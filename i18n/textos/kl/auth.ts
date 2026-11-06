/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Entrar en Weë: acceso, alta y lo que dice cuando algo no sale.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Iniciar sesión = «Iserit» (nombre «iserneq»), cuenta = «kontu»,
 * contraseña = «isissutissaq», registrarse = «nalunaarsorneqarit», correo = «e-mail»
 * (préstamos y formaciones pendientes de confirmación nativa, guía §4.5). Errores con el
 * molde «<acción>-neq iluatsinngilaq». El aviso legal va en trozos (dos son enlaces):
 * «Kontu pilersikkukku uku akuerissavatit: [términos] aamma [privacidad]».
 * Los códigos de Firebase y {{detalle}} no pasan por aquí.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Weë: tikilluarit',
  signInToContinue: 'Ingerlaqqinniaruit iserit',
  email: 'E-mail',
  emailPlaceholder: 'illit@email.com',
  password: 'Isissutissaq',
  passwordPlaceholder: 'Isissutissat',
  forgotPassword: 'Isissutissat puigorpiuk?',
  orContinueWith: 'Imaluunniit uku atorlugit ingerlaqqigit',
  continueWithGoogle: 'Google atorlugu ingerlaqqigit',
  enterAsGuest: 'Pulaartutut iserit',
  noAccount: 'Kontoqanngilit? ',
  registerHere: 'Maani nalunaarsorneqarit',
  signingIn: 'Iserneq ingerlavoq…',

  fillAllFields: 'Inussiarnersumik immersugassat tamaasa immersukkit',
  signInFailed: 'Iserneq iluatsinngilaq',
  authErrorTitle: 'Kinaassutsip uppernarsarnerani kukkuneq',
  errUserNotFound: 'E-mailimut matumunnga kontu peqanngilaq',
  errWrongPassword: 'Isissutissaq eqqunngitsoq',
  errInvalidEmail: 'E-mail atorsinnaanngitsoq',
  errUserDisabled: 'Kontu una atorunnaarsinneqarpoq',
  googleFailed: 'Google atorlugu iserneq iluatsinngilaq. Misileqqiguk.',
  anonymousFailed: 'Pulaartutut iserneq iluatsinngilaq. Misileqqiguk.',
  emailRequiredTitle: 'E-mail pisariaqarpoq',
  emailRequired: 'Isissutissamik nutaamik pissarsiniaruit inussiarnersumik e-mailit allaguk',
  emailSentTitle: 'E-mail nassiunneqarpoq',
  resetEmailSent: 'Isissutissamik nutaamik pissarsiniaruit e-mailit misissoruk',
  resetFailed: 'Isissutissamik nutaamik pissarsinissamut e-mailip nassiunnera iluatsinngilaq. Misileqqiguk.',

  /* ── EL ALTA ────────────────────────────────────────────────────────────
   * Comparte módulo con el acceso porque es la misma puerta, y reutiliza lo
   * que ya estaba escrito: `email`, `emailPlaceholder`, `password`,
   * `errInvalidEmail`, `continueWithGoogle` y `enterAsGuest`.
   */
  createAccount: 'Kontu pilersiguk',
  joinWee: 'Peqatigiiffik Weë ilaasortaaffigiuk',
  passwordMinPlaceholder: 'Minnerpaamik naqinnerit 6',
  confirmPassword: 'Isissutissaq uppernarsaruk',
  confirmPasswordPlaceholder: 'Isissutissat allaqqiguk',
  createAccountButton: 'Kontu pilersiguk',
  orRegisterWith: 'Imaluunniit uku atorlugit nalunaarsorneqarit',
  haveAccount: 'Kontoqareerpit? ',
  signInHere: 'Maani iserit',
  creatingAccount: 'Kontu pilersinneqarpoq…',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Kontu pilersikkukku uku akuerissavatit: ',
  termsOfService: 'Sullissinermut piumasaqaatit',
  termsAnd: ' aamma ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'E-mailit amigaataavoq',
  emailMissing: 'Ingerlaqqinniaruit e-mailit allaguk.',
  emailCheckTitle: 'E-mailit misissoruk',
  emailCheck: 'E-mail taanna atorsinnaanngitsutut isikkoqarpoq.',
  passwordMissingTitle: 'Isissutissat amigaataavoq',
  passwordMissing: 'Ingerlaqqinniaruit isissutissamik allagit.',
  passwordShortTitle: 'Isissutissaq naatsuallaarpoq',
  passwordShort: 'Minnerpaamik naqinnerit 6 atukkit.',
  passwordsMismatchTitle: 'Isissutissat assigiinngillat',
  passwordsMismatch: 'Immersugassani marlunni isissutissaq ataaseq allaguk.',

  /* Y lo que contesta el alta cuando no puede. El código de Firebase se queda
   * tal cual: es un identificador, y la pantalla lo traduce a una de estas. */
  signUpFailedTitle: 'Kontup pilersinnera iluatsinngilaq',
  signUpFailed: 'Kontup pilersinneqarnerani kukkuneq',
  errEmailInUse: 'E-mailimut matumunnga kontu peqareerpoq',
  errWeakPassword: 'Isissutissaq sanngiivallaarpoq',
  errSignUpNotAllowed: 'E-mail atorlugu nalunaarsorneqarneq akuerineqanngilaq',
  googleFailedTitle: 'Google atorlugu ingerlaqqinneq iluatsinngilaq',
  guestFailedTitle: 'Pulaartutut iserneq iluatsinngilaq',
};
