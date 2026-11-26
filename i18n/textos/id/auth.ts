/*
 * INDONESIO — entrar en Weë: la pantalla de acceso y lo que dice cuando algo
 * no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Iniciar sesión» es «Masuk», «registrarse», «Daftar», «contraseña», «kata
 * sandi» y «correo», «email» (guía § 4). Los códigos de error de Firebase son
 * identificadores y no están aquí; `{{detalle}}` sale sin tocar. El aviso legal
 * va en trozos que se concatenan con dos enlaces: «Dengan membuat akun, Anda
 * menyetujui Ketentuan Layanan dan Kebijakan Privasi». `noAccount` y
 * `haveAccount` terminan en espacio porque el enlace va pegado detrás.
 * El placeholder del email se deja tal cual: es una dirección de ejemplo.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Selamat datang di Weë',
  signInToContinue: 'Masuk untuk melanjutkan',
  email: 'Email',
  emailPlaceholder: 'tu@email.com',
  password: 'Kata sandi',
  passwordPlaceholder: 'Kata sandi Anda',
  forgotPassword: 'Lupa kata sandi?',
  orContinueWith: 'Atau lanjutkan dengan',
  continueWithGoogle: 'Lanjutkan dengan Google',
  enterAsGuest: 'Masuk sebagai tamu',
  noAccount: 'Belum punya akun? ',
  registerHere: 'Daftar di sini',
  signingIn: 'Sedang masuk...',

  fillAllFields: 'Silakan isi semua kolom',
  signInFailed: 'Gagal masuk',
  authErrorTitle: 'Kesalahan Autentikasi',
  errUserNotFound: 'Tidak ada akun dengan email ini',
  errWrongPassword: 'Kata sandi salah',
  errInvalidEmail: 'Email tidak valid',
  errUserDisabled: 'Akun ini telah dinonaktifkan',
  googleFailed: 'Tidak dapat masuk dengan Google. Coba lagi.',
  anonymousFailed: 'Tidak dapat masuk sebagai tamu. Coba lagi.',
  emailRequiredTitle: 'Email diperlukan',
  emailRequired: 'Silakan masukkan email Anda untuk mengatur ulang kata sandi',
  emailSentTitle: 'Email terkirim',
  resetEmailSent: 'Periksa email Anda untuk mengatur ulang kata sandi',
  resetFailed: 'Email untuk mengatur ulang kata sandi tidak dapat dikirim. Coba lagi.',

  /* ── EL ALTA ────────────────────────────────────────────────────────────
   * Comparte módulo con el acceso porque es la misma puerta, y reutiliza lo
   * que ya estaba escrito: `email`, `emailPlaceholder`, `password`,
   * `errInvalidEmail`, `continueWithGoogle` y `enterAsGuest`.
   */
  createAccount: 'Buat akun Anda',
  joinWee: 'Bergabunglah dengan komunitas Weë',
  passwordMinPlaceholder: 'Minimal 6 karakter',
  confirmPassword: 'Konfirmasi kata sandi',
  confirmPasswordPlaceholder: 'Ulangi kata sandi Anda',
  createAccountButton: 'Buat akun',
  orRegisterWith: 'Atau daftar dengan',
  haveAccount: 'Sudah punya akun? ',
  signInHere: 'Masuk di sini',
  creatingAccount: 'Membuat akun...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Dengan membuat akun, Anda menyetujui ',
  termsOfService: 'Ketentuan Layanan',
  termsAnd: ' dan ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Email Anda belum diisi',
  emailMissing: 'Tulis email Anda untuk melanjutkan.',
  emailCheckTitle: 'Periksa email Anda',
  emailCheck: 'Email itu tampaknya tidak valid.',
  passwordMissingTitle: 'Kata sandi belum diisi',
  passwordMissing: 'Tulis kata sandi untuk melanjutkan.',
  passwordShortTitle: 'Kata sandi terlalu pendek',
  passwordShort: 'Gunakan minimal 6 karakter.',
  passwordsMismatchTitle: 'Kata sandi tidak cocok',
  passwordsMismatch: 'Tulis kata sandi yang sama di kedua kolom.',

  /* Y lo que contesta el alta cuando no puede. El código de Firebase se queda
   * tal cual: es un identificador, y la pantalla lo traduce a una de estas. */
  signUpFailedTitle: 'Kami tidak dapat membuat akun Anda',
  signUpFailed: 'Gagal membuat akun',
  errEmailInUse: 'Sudah ada akun dengan email ini',
  errWeakPassword: 'Kata sandi terlalu lemah',
  errSignUpNotAllowed: 'Pendaftaran dengan email tidak diizinkan',
  googleFailedTitle: 'Kami tidak dapat melanjutkan dengan Google',
  guestFailedTitle: 'Kami tidak dapat masuk sebagai tamu',
};
