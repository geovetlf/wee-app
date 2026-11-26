/*
 * HEBREO — entrar en Weë: la pantalla de acceso, el alta y lo que dicen cuando
 * algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: «Bienvenido» es «ברוכים הבאים» (plural inclusivo, la fórmula de
 * cualquier app israelí). Los imperativos de segunda persona del español se
 * vuelven impersonales con «יש ל…» («יש להזין», «יש למלא») o «כדאי…», y los
 * botones son sustantivos de acción (כניסה, הרשמה, יצירת חשבון, המשך). «Invitado»
 * es «אורח/ת» (glosario § 6). «¿Olvidaste…?», «אין לך», «יש לך» se leen igual para
 * los dos géneros sin niqud. El aviso legal se arma en tres trozos más los dos
 * enlaces: «ביצירת חשבון מאשרים את » + «תנאי השירות» + « ואת » + política de
 * privacidad; se usa «את» y no el prefijo «ל» porque el trozo tiene que terminar
 * en espacio y un prefijo nunca va separado de su palabra. Los placeholders de
 * email quedan en latino («you@email.com»). «Email» es «אימייל», como en el
 * resto de la app.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'ברוכים הבאים ל-Weë',
  signInToContinue: 'יש להיכנס כדי להמשיך',
  email: 'אימייל',
  emailPlaceholder: 'you@email.com',
  password: 'סיסמה',
  passwordPlaceholder: 'הסיסמה שלך',
  forgotPassword: 'שכחת את הסיסמה?',
  orContinueWith: 'או להמשיך עם',
  continueWithGoogle: 'המשך עם Google',
  enterAsGuest: 'כניסה כאורח/ת',
  noAccount: 'אין לך חשבון? ',
  registerHere: 'הרשמה כאן',
  signingIn: 'נכנסים לחשבון...',

  fillAllFields: 'יש למלא את כל השדות',
  signInFailed: 'שגיאה בכניסה',
  authErrorTitle: 'שגיאת אימות',
  errUserNotFound: 'אין חשבון עם האימייל הזה',
  errWrongPassword: 'סיסמה שגויה',
  errInvalidEmail: 'אימייל לא תקין',
  errUserDisabled: 'החשבון הזה הושבת',
  googleFailed: 'לא הצלחנו להיכנס עם Google. כדאי לנסות שוב.',
  anonymousFailed: 'לא הצלחנו להיכנס כאורח/ת. כדאי לנסות שוב.',
  emailRequiredTitle: 'נדרש אימייל',
  emailRequired: 'יש להזין את האימייל כדי לאפס את הסיסמה',
  emailSentTitle: 'האימייל נשלח',
  resetEmailSent: 'כדאי לבדוק את תיבת האימייל כדי לאפס את הסיסמה',
  resetFailed: 'לא הצלחנו לשלוח את האימייל לאיפוס הסיסמה. כדאי לנסות שוב.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'יצירת החשבון שלך',
  joinWee: 'הצטרפות לקהילת Weë',
  passwordMinPlaceholder: 'לפחות 6 תווים',
  confirmPassword: 'אימות סיסמה',
  confirmPasswordPlaceholder: 'הסיסמה שוב',
  createAccountButton: 'יצירת חשבון',
  orRegisterWith: 'או הרשמה עם',
  haveAccount: 'כבר יש לך חשבון? ',
  signInHere: 'כניסה כאן',
  creatingAccount: 'יוצרים חשבון...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'ביצירת חשבון מאשרים את ',
  termsOfService: 'תנאי השירות',
  termsAnd: ' ואת ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'חסר אימייל',
  emailMissing: 'יש להזין אימייל כדי להמשיך.',
  emailCheckTitle: 'כדאי לבדוק את האימייל',
  emailCheck: 'האימייל הזה לא נראה תקין.',
  passwordMissingTitle: 'חסרה סיסמה',
  passwordMissing: 'יש להזין סיסמה כדי להמשיך.',
  passwordShortTitle: 'הסיסמה קצרה מדי',
  passwordShort: 'יש להשתמש לפחות ב-6 תווים.',
  passwordsMismatchTitle: 'הסיסמאות לא תואמות',
  passwordsMismatch: 'יש להזין את אותה סיסמה בשני השדות.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'לא הצלחנו ליצור את החשבון',
  signUpFailed: 'שגיאה ביצירת החשבון',
  errEmailInUse: 'כבר קיים חשבון עם האימייל הזה',
  errWeakPassword: 'הסיסמה חלשה מדי',
  errSignUpNotAllowed: 'הרשמה עם אימייל אינה מותרת',
  googleFailedTitle: 'לא הצלחנו להמשיך עם Google',
  guestFailedTitle: 'לא הצלחנו להיכנס כאורח/ת',
};
