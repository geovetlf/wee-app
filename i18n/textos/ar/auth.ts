/*
 * ÁRABE — entrar en Weë: la pantalla de acceso y el alta. Tipado contra el
 * español.
 *
 * Los espacios de borde son EXACTOS los del español: `noAccount`,
 * `haveAccount` y `termsIntro` terminan en espacio y `termsAnd` lo lleva a
 * los dos lados porque la pantalla concatena las piezas en orden de código,
 * que es el orden lógico del texto, así que en RTL se leen bien. El «و» con
 * espacio detrás («شروط الخدمة و سياسة الخصوصية») es una pequeña licencia
 * tipográfica que impone esa concatenación: anotada para el revisor.
 *
 * `you@email.com` es una dirección de EJEMPLO que se lee, no se visita; en
 * latino porque el dominio lo es.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'مرحبًا بك في Weë',
  signInToContinue: 'تسجيل الدخول للمتابعة',
  email: 'البريد الإلكتروني',
  emailPlaceholder: 'you@email.com',
  password: 'كلمة المرور',
  passwordPlaceholder: 'كلمة مرورك',
  forgotPassword: 'هل نسيت كلمة المرور؟',
  orContinueWith: 'أو المتابعة باستخدام',
  continueWithGoogle: 'المتابعة باستخدام Google',
  enterAsGuest: 'الدخول كضيف',
  noAccount: 'ليس لديك حساب؟ ',
  registerHere: 'التسجيل من هنا',
  signingIn: 'جارٍ تسجيل الدخول...',

  fillAllFields: 'يُرجى ملء جميع الحقول',
  signInFailed: 'تعذّر تسجيل الدخول',
  authErrorTitle: 'خطأ في المصادقة',
  errUserNotFound: 'لا يوجد حساب بهذا البريد الإلكتروني',
  errWrongPassword: 'كلمة المرور غير صحيحة',
  errInvalidEmail: 'البريد الإلكتروني غير صالح',
  errUserDisabled: 'تم تعطيل هذا الحساب',
  googleFailed: 'تعذّر تسجيل الدخول باستخدام Google. يُرجى المحاولة مرة أخرى.',
  anonymousFailed: 'تعذّر الدخول كضيف. يُرجى المحاولة مرة أخرى.',
  emailRequiredTitle: 'البريد الإلكتروني مطلوب',
  emailRequired: 'يُرجى إدخال بريدك الإلكتروني لإعادة تعيين كلمة المرور',
  emailSentTitle: 'تم إرسال الرسالة',
  resetEmailSent: 'تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور',
  resetFailed: 'تعذّر إرسال رسالة إعادة تعيين كلمة المرور. يُرجى المحاولة مرة أخرى.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'إنشاء حسابك',
  joinWee: 'الانضمام إلى مجتمع Weë',
  passwordMinPlaceholder: '6 أحرف على الأقل',
  confirmPassword: 'تأكيد كلمة المرور',
  confirmPasswordPlaceholder: 'إعادة كتابة كلمة المرور',
  createAccountButton: 'إنشاء حساب',
  orRegisterWith: 'أو التسجيل باستخدام',
  haveAccount: 'لديك حساب بالفعل؟ ',
  signInHere: 'تسجيل الدخول من هنا',
  creatingAccount: 'جارٍ إنشاء الحساب...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'بإنشاء حساب، فإنك توافق على ',
  termsOfService: 'شروط الخدمة',
  termsAnd: ' و ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'البريد الإلكتروني مطلوب',
  emailMissing: 'أدخل بريدك الإلكتروني للمتابعة.',
  emailCheckTitle: 'تحقق من البريد الإلكتروني',
  emailCheck: 'هذا البريد الإلكتروني لا يبدو صالحًا.',
  passwordMissingTitle: 'كلمة المرور مطلوبة',
  passwordMissing: 'أدخل كلمة مرور للمتابعة.',
  passwordShortTitle: 'كلمة المرور قصيرة جدًا',
  passwordShort: 'استخدم 6 أحرف على الأقل.',
  passwordsMismatchTitle: 'كلمتا المرور غير متطابقتين',
  passwordsMismatch: 'أدخل كلمة المرور نفسها في الحقلين.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'تعذّر إنشاء حسابك',
  signUpFailed: 'تعذّر إنشاء الحساب',
  errEmailInUse: 'يوجد حساب بهذا البريد الإلكتروني بالفعل',
  errWeakPassword: 'كلمة المرور ضعيفة جدًا',
  errSignUpNotAllowed: 'التسجيل بالبريد الإلكتروني غير مسموح به',
  googleFailedTitle: 'تعذّرت المتابعة باستخدام Google',
  guestFailedTitle: 'تعذّر الدخول كضيف',
};
