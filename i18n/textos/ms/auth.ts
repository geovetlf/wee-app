/*
 * MALAYO — entrar en Weë: la pantalla de acceso, el alta y lo que dicen cuando
 * algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Iniciar sesión» es «log masuk», «registrarse» es «daftar», «contraseña» es
 * «kata laluan», «correo» es «e-mel» (con guion, ortografía malaya) y «cuenta»
 * es «akaun» (glosario de docs/I18N-MALAYO.md). Las peticiones llevan «Sila».
 * El aviso legal se concatena con enlaces: «Dengan mencipta akaun, anda
 * bersetuju dengan [Terma Perkhidmatan] dan [Dasar Privasi]»; el «nuestros»
 * del español no cabe antes del nombre en malayo y se omite. Los códigos de
 * Firebase y el `{{detalle}}` del proveedor no se tocan.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Selamat datang ke Weë',
  signInToContinue: 'Log masuk untuk meneruskan',
  email: 'E-mel',
  emailPlaceholder: 'nama@contoh.com',
  password: 'Kata laluan',
  passwordPlaceholder: 'Kata laluan anda',
  forgotPassword: 'Lupa kata laluan?',
  orContinueWith: 'Atau teruskan dengan',
  continueWithGoogle: 'Teruskan dengan Google',
  enterAsGuest: 'Masuk sebagai tetamu',
  noAccount: 'Belum ada akaun? ',
  registerHere: 'Daftar di sini',
  signingIn: 'Sedang log masuk...',

  fillAllFields: 'Sila lengkapkan semua ruangan',
  signInFailed: 'Ralat semasa log masuk',
  authErrorTitle: 'Ralat Pengesahan',
  errUserNotFound: 'Tiada akaun dengan e-mel ini',
  errWrongPassword: 'Kata laluan salah',
  errInvalidEmail: 'E-mel tidak sah',
  errUserDisabled: 'Akaun ini telah dinyahaktifkan',
  googleFailed: 'Tidak dapat log masuk dengan Google. Cuba lagi.',
  anonymousFailed: 'Tidak dapat masuk sebagai tetamu. Cuba lagi.',
  emailRequiredTitle: 'E-mel diperlukan',
  emailRequired: 'Sila masukkan e-mel anda untuk menetapkan semula kata laluan',
  emailSentTitle: 'E-mel dihantar',
  resetEmailSent: 'Semak e-mel anda untuk menetapkan semula kata laluan anda',
  resetFailed: 'Tidak dapat menghantar e-mel untuk menetapkan semula kata laluan. Cuba lagi.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Cipta akaun anda',
  joinWee: 'Sertai komuniti Weë',
  passwordMinPlaceholder: 'Minimum 6 aksara',
  confirmPassword: 'Sahkan kata laluan',
  confirmPasswordPlaceholder: 'Ulang kata laluan anda',
  createAccountButton: 'Cipta akaun',
  orRegisterWith: 'Atau daftar dengan',
  haveAccount: 'Sudah ada akaun? ',
  signInHere: 'Log masuk di sini',
  creatingAccount: 'Mencipta akaun...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Dengan mencipta akaun, anda bersetuju dengan ',
  termsOfService: 'Terma Perkhidmatan',
  termsAnd: ' dan ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'E-mel anda belum diisi',
  emailMissing: 'Masukkan e-mel anda untuk meneruskan.',
  emailCheckTitle: 'Semak e-mel anda',
  emailCheck: 'E-mel itu nampaknya tidak sah.',
  passwordMissingTitle: 'Kata laluan belum diisi',
  passwordMissing: 'Masukkan kata laluan untuk meneruskan.',
  passwordShortTitle: 'Kata laluan terlalu pendek',
  passwordShort: 'Gunakan sekurang-kurangnya 6 aksara.',
  passwordsMismatchTitle: 'Kata laluan tidak sepadan',
  passwordsMismatch: 'Masukkan kata laluan yang sama dalam kedua-dua ruangan.',

  /* Y lo que contesta el alta cuando no puede. El código de Firebase se queda tal cual. */
  signUpFailedTitle: 'Kami tidak dapat mencipta akaun anda',
  signUpFailed: 'Ralat semasa mencipta akaun',
  errEmailInUse: 'Sudah ada akaun dengan e-mel ini',
  errWeakPassword: 'Kata laluan terlalu lemah',
  errSignUpNotAllowed: 'Pendaftaran dengan e-mel tidak dibenarkan',
  googleFailedTitle: 'Kami tidak dapat meneruskan dengan Google',
  guestFailedTitle: 'Kami tidak dapat masuk sebagai tetamu',
};
