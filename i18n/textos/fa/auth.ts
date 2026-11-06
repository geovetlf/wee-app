/*
 * PERSA — Entrar en Weë: la pantalla de acceso, el alta y lo que dicen cuando
 * algo no sale. Tipado contra el español: si allí hay una clave que aquí
 * falta, no compila.
 *
 * Los códigos de Firebase no están aquí: son identificadores. Los trozos que
 * la pantalla concatena conservan sus espacios de borde y están redactados
 * para leerse juntos en el orden del código: «حساب ندارید؟ » + «اینجا ثبت‌نام
 * کنید», y el aviso legal «با ایجاد حساب، این موارد را می‌پذیرید: » + enlace +
 * « و » + enlace, porque en persa el verbo no puede quedar detrás del último
 * enlace. «Google» es marca y va en latino; «Email» es «ایمیل» (glosario § 4).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'به Weë خوش آمدید',
  signInToContinue: 'برای ادامه وارد شوید',
  email: 'ایمیل',
  emailPlaceholder: 'name@email.com',
  password: 'رمز عبور',
  passwordPlaceholder: 'رمز عبور شما',
  forgotPassword: 'رمز عبورتان را فراموش کرده‌اید؟',
  orContinueWith: 'یا ادامه با',
  continueWithGoogle: 'ادامه با Google',
  enterAsGuest: 'ورود به‌عنوان مهمان',
  noAccount: 'حساب ندارید؟ ',
  registerHere: 'اینجا ثبت‌نام کنید',
  signingIn: 'در حال ورود...',

  fillAllFields: 'لطفاً همه فیلدها را پر کنید',
  signInFailed: 'خطا در ورود',
  authErrorTitle: 'خطای احراز هویت',
  errUserNotFound: 'حسابی با این ایمیل وجود ندارد',
  errWrongPassword: 'رمز عبور نادرست است',
  errInvalidEmail: 'ایمیل نامعتبر است',
  errUserDisabled: 'این حساب غیرفعال شده است',
  googleFailed: 'ورود با Google انجام نشد. دوباره تلاش کنید.',
  anonymousFailed: 'ورود به‌عنوان مهمان انجام نشد. دوباره تلاش کنید.',
  emailRequiredTitle: 'ایمیل لازم است',
  emailRequired: 'لطفاً برای بازنشانی رمز عبور، ایمیلتان را وارد کنید',
  emailSentTitle: 'ایمیل ارسال شد',
  resetEmailSent: 'برای بازنشانی رمز عبور، ایمیلتان را بررسی کنید',
  resetFailed: 'ایمیل بازنشانی رمز عبور ارسال نشد. دوباره تلاش کنید.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'حسابتان را ایجاد کنید',
  joinWee: 'به انجمن Weë بپیوندید',
  passwordMinPlaceholder: 'حداقل 6 نویسه',
  confirmPassword: 'تأیید رمز عبور',
  confirmPasswordPlaceholder: 'رمز عبورتان را تکرار کنید',
  createAccountButton: 'ایجاد حساب',
  orRegisterWith: 'یا ثبت‌نام با',
  haveAccount: 'از قبل حساب دارید؟ ',
  signInHere: 'اینجا وارد شوید',
  creatingAccount: 'در حال ایجاد حساب...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'با ایجاد حساب، این موارد را می‌پذیرید: ',
  termsOfService: 'شرایط خدمات',
  termsAnd: ' و ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'ایمیلتان را وارد نکرده‌اید',
  emailMissing: 'برای ادامه، ایمیلتان را بنویسید.',
  emailCheckTitle: 'ایمیلتان را بررسی کنید',
  emailCheck: 'این ایمیل معتبر به نظر نمی‌رسد.',
  passwordMissingTitle: 'رمز عبورتان را وارد نکرده‌اید',
  passwordMissing: 'برای ادامه، یک رمز عبور بنویسید.',
  passwordShortTitle: 'رمز عبور خیلی کوتاه است',
  passwordShort: 'حداقل 6 نویسه استفاده کنید.',
  passwordsMismatchTitle: 'رمزهای عبور یکسان نیستند',
  passwordsMismatch: 'در هر دو فیلد رمز عبور یکسانی بنویسید.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'نتوانستیم حسابتان را ایجاد کنیم',
  signUpFailed: 'خطا در ایجاد حساب',
  errEmailInUse: 'حسابی با این ایمیل از قبل وجود دارد',
  errWeakPassword: 'رمز عبور خیلی ضعیف است',
  errSignUpNotAllowed: 'ثبت‌نام با ایمیل مجاز نیست',
  googleFailedTitle: 'نتوانستیم با Google ادامه دهیم',
  guestFailedTitle: 'نتوانستیم به‌عنوان مهمان وارد شویم',
};
