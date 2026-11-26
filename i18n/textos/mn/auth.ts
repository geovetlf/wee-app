/*
 * MONGOL — entrar en Weë y el alta. Tipado contra el español.
 *
 * El aviso legal va en trozos que la pantalla concatena (termsIntro + enlace +
 * termsAnd + enlace): la frase mongola se formula con dos puntos para que pueda
 * terminar en el último enlace, sin verbo al final. «Имэйл» es el préstamo
 * habitual en las apps de Mongolia; el placeholder de ejemplo queda en latino.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Weë аппад тавтай морил',
  signInToContinue: 'Үргэлжлүүлэхийн тулд нэвтэрнэ үү',
  email: 'Имэйл',
  emailPlaceholder: 'tany@email.com',
  password: 'Нууц үг',
  passwordPlaceholder: 'Таны нууц үг',
  forgotPassword: 'Нууц үгээ мартсан уу?',
  orContinueWith: 'Эсвэл дараахаар үргэлжлүүлэх',
  continueWithGoogle: 'Google-ээр үргэлжлүүлэх',
  enterAsGuest: 'Зочноор нэвтрэх',
  noAccount: 'Бүртгэл байхгүй юу? ',
  registerHere: 'Энд бүртгүүлнэ үү',
  signingIn: 'Нэвтэрч байна...',

  fillAllFields: 'Бүх талбарыг бөглөнө үү',
  signInFailed: 'Нэвтэрч чадсангүй',
  authErrorTitle: 'Нэвтрэлтийн алдаа',
  errUserNotFound: 'Энэ имэйлтэй бүртгэл байхгүй байна',
  errWrongPassword: 'Нууц үг буруу байна',
  errInvalidEmail: 'Имэйл буруу байна',
  errUserDisabled: 'Энэ бүртгэлийг идэвхгүй болгосон байна',
  googleFailed: 'Google-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.',
  anonymousFailed: 'Зочноор нэвтэрч чадсангүй. Дахин оролдоно уу.',
  emailRequiredTitle: 'Имэйл шаардлагатай',
  emailRequired: 'Нууц үгээ сэргээхийн тулд имэйлээ оруулна уу',
  emailSentTitle: 'Имэйл илгээгдлээ',
  resetEmailSent: 'Нууц үгээ сэргээхийн тулд имэйлээ шалгана уу',
  resetFailed: 'Нууц үг сэргээх имэйлийг илгээж чадсангүй. Дахин оролдоно уу.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Бүртгэлээ үүсгээрэй',
  joinWee: 'Weë нийгэмлэгт нэгдээрэй',
  passwordMinPlaceholder: 'Хамгийн багадаа 6 тэмдэгт',
  confirmPassword: 'Нууц үг баталгаажуулах',
  confirmPasswordPlaceholder: 'Нууц үгээ давтан оруулна уу',
  createAccountButton: 'Бүртгэл үүсгэх',
  orRegisterWith: 'Эсвэл дараахаар бүртгүүлэх',
  haveAccount: 'Бүртгэлтэй юу? ',
  signInHere: 'Энд нэвтэрнэ үү',
  creatingAccount: 'Бүртгэл үүсгэж байна...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Бүртгэл үүсгэснээр та дараахыг хүлээн зөвшөөрч байна: ',
  termsOfService: 'Үйлчилгээний нөхцөл',
  termsAnd: ' ба ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Имэйл дутуу байна',
  emailMissing: 'Үргэлжлүүлэхийн тулд имэйлээ оруулна уу.',
  emailCheckTitle: 'Имэйлээ шалгана уу',
  emailCheck: 'Энэ имэйл буруу байх шиг байна.',
  passwordMissingTitle: 'Нууц үг дутуу байна',
  passwordMissing: 'Үргэлжлүүлэхийн тулд нууц үг оруулна уу.',
  passwordShortTitle: 'Нууц үг хэт богино байна',
  passwordShort: 'Хамгийн багадаа 6 тэмдэгт ашиглана уу.',
  passwordsMismatchTitle: 'Нууц үгнүүд таарахгүй байна',
  passwordsMismatch: 'Хоёр талбарт ижил нууц үг оруулна уу.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Таны бүртгэлийг үүсгэж чадсангүй',
  signUpFailed: 'Бүртгэл үүсгэхэд алдаа гарлаа',
  errEmailInUse: 'Энэ имэйлтэй бүртгэл аль хэдийн байна',
  errWeakPassword: 'Нууц үг хэт сул байна',
  errSignUpNotAllowed: 'Имэйлээр бүртгүүлэхийг зөвшөөрөөгүй',
  googleFailedTitle: 'Google-ээр үргэлжлүүлж чадсангүй',
  guestFailedTitle: 'Зочноор нэвтэрч чадсангүй',
};
