/*
 * IRLANDÉS — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tuteo. Los códigos de Firebase y `{{detalle}}` no se traducen. El aviso legal
 * se arma con «leis na» para que el enlace «Téarmaí seirbhíse» no necesite
 * mutación. El placeholder de email se deja tal cual.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Fáilte go Weë',
  signInToContinue: 'Logáil isteach le leanúint ort',
  email: 'Ríomhphost',
  emailPlaceholder: 'tusa@email.com',
  password: 'Pasfhocal',
  passwordPlaceholder: 'Do phasfhocal',
  forgotPassword: 'An ndearna tú dearmad ar do phasfhocal?',
  orContinueWith: 'Nó lean ort le',
  continueWithGoogle: 'Lean ort le Google',
  enterAsGuest: 'Téigh isteach mar aoi',
  noAccount: 'Níl cuntas agat? ',
  registerHere: 'Cláraigh anseo',
  signingIn: 'Ag logáil isteach...',

  fillAllFields: 'Líon isteach na réimsí go léir, le do thoil',
  signInFailed: 'Earráid agus tú ag logáil isteach',
  authErrorTitle: 'Earráid fhíordheimhnithe',
  errUserNotFound: 'Níl aon chuntas ann leis an ríomhphost seo',
  errWrongPassword: 'Pasfhocal mícheart',
  errInvalidEmail: 'Ríomhphost neamhbhailí',
  errUserDisabled: 'Díchumasaíodh an cuntas seo',
  googleFailed: 'Níorbh fhéidir logáil isteach le Google. Bain triail eile as.',
  anonymousFailed: 'Níorbh fhéidir dul isteach mar aoi. Bain triail eile as.',
  emailRequiredTitle: 'Ríomhphost ag teastáil',
  emailRequired: 'Cuir isteach do ríomhphost chun do phasfhocal a athshocrú, le do thoil',
  emailSentTitle: 'Ríomhphost seolta',
  resetEmailSent: 'Seiceáil do ríomhphost chun do phasfhocal a athshocrú',
  resetFailed: 'Níorbh fhéidir an ríomhphost athshocraithe pasfhocail a sheoladh. Bain triail eile as.',

  createAccount: 'Cruthaigh do chuntas',
  joinWee: 'Bí i do bhall de phobal Weë',
  passwordMinPlaceholder: '6 charachtar ar a laghad',
  confirmPassword: 'Deimhnigh an pasfhocal',
  confirmPasswordPlaceholder: 'Scríobh do phasfhocal arís',
  createAccountButton: 'Cruthaigh cuntas',
  orRegisterWith: 'Nó cláraigh le',
  haveAccount: 'An bhfuil cuntas agat cheana? ',
  signInHere: 'Logáil isteach anseo',
  creatingAccount: 'Cuntas á chruthú...',

  termsIntro: 'Trí chuntas a chruthú, glacann tú leis na ',
  termsOfService: 'Téarmaí seirbhíse',
  termsAnd: ' agus ',

  emailMissingTitle: 'Tá do ríomhphost in easnamh',
  emailMissing: 'Scríobh do ríomhphost le leanúint ort.',
  emailCheckTitle: 'Seiceáil do ríomhphost',
  emailCheck: 'Ní cosúil go bhfuil an ríomhphost sin bailí.',
  passwordMissingTitle: 'Tá do phasfhocal in easnamh',
  passwordMissing: 'Scríobh pasfhocal le leanúint ort.',
  passwordShortTitle: 'Pasfhocal róghearr',
  passwordShort: 'Úsáid 6 charachtar ar a laghad.',
  passwordsMismatchTitle: 'Ní hionann an dá phasfhocal',
  passwordsMismatch: 'Scríobh an pasfhocal céanna sa dá réimse.',

  signUpFailedTitle: 'Níorbh fhéidir linn do chuntas a chruthú',
  signUpFailed: 'Earráid agus an cuntas á chruthú',
  errEmailInUse: 'Tá cuntas ann cheana leis an ríomhphost seo',
  errWeakPassword: 'Tá an pasfhocal rólag',
  errSignUpNotAllowed: 'Ní cheadaítear clárú le ríomhphost',
  googleFailedTitle: 'Níorbh fhéidir linn leanúint ar aghaidh le Google',
  guestFailedTitle: 'Níorbh fhéidir linn dul isteach mar aoi',
};
