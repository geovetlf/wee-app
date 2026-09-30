/*
 * JAPONÉS — entrar en Weë y darse de alta: las pantallas de acceso y de registro, y sus avisos.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tres frases se pegan en pantalla con otra pieza. `noAccount` + `registerHere` y `haveAccount` +
 * `signInHere` son pregunta + enlace: detrás del ？ va el espacio de ancho completo U+3000 (en el
 * valor, como secuencia de escape para que se vea), que es la norma japonesa cuando sigue más
 * texto (JTF 3.2.1-3.2.2) y conserva el borde que marca el español. El aviso legal va en cuatro
 * trozos y el código acaba en el enlace de la política, sin trozo final: el verbo japonés no puede
 * ir detrás, así que la frase se cierra antes y los dos enlaces siguen al ：. `termsAnd` es と, sin
 * espacios, porque las piezas de al lado son japonesas.
 * «Email» es メールアドレス, y el ejemplo del campo lleva 例： para que se lea como ejemplo.
 * El título del alta (`createAccount`) es 新規登録: el mismo rótulo que el enlace que lleva a esa
 * pantalla, y así no repite el botón de debajo (`createAccountButton`, アカウントを作成).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Weëへようこそ',
  signInToContinue: '続けるにはログインしてください',
  email: 'メールアドレス',
  emailPlaceholder: '例：name@example.com',
  password: 'パスワード',
  passwordPlaceholder: 'パスワードを入力',
  forgotPassword: 'パスワードをお忘れですか？',
  orContinueWith: 'または',
  continueWithGoogle: 'Googleで続ける',
  enterAsGuest: 'ゲストとして続ける',
  noAccount: 'アカウントをお持ちでないですか？\u3000',
  registerHere: '新規登録',
  signingIn: 'ログイン中…',

  fillAllFields: 'すべての項目を入力してください',
  signInFailed: 'ログインできませんでした',
  authErrorTitle: 'ログインエラー',
  errUserNotFound: 'このメールアドレスは登録されていません',
  errWrongPassword: 'パスワードが正しくありません',
  errInvalidEmail: 'メールアドレスの形式が正しくありません',
  errUserDisabled: 'このアカウントは無効になっています',
  googleFailed: 'Googleでログインできませんでした。もう一度お試しください。',
  anonymousFailed: 'ゲストとしてログインできませんでした。もう一度お試しください。',
  emailRequiredTitle: 'メールアドレスが必要です',
  emailRequired: 'パスワードを再設定するには、メールアドレスを入力してください',
  emailSentTitle: 'メールを送信しました',
  resetEmailSent: 'メールを確認して、パスワードを再設定してください',
  resetFailed: 'パスワード再設定用のメールを送信できませんでした。もう一度お試しください。',

  createAccount: '新規登録',
  joinWee: 'Weëのコミュニティに参加しましょう',
  passwordMinPlaceholder: '6文字以上',
  confirmPassword: 'パスワード（確認用）',
  confirmPasswordPlaceholder: 'パスワードをもう一度入力',
  createAccountButton: 'アカウントを作成',
  orRegisterWith: 'または',
  haveAccount: 'すでにアカウントをお持ちですか？\u3000',
  signInHere: 'ログイン',
  creatingAccount: 'アカウントを作成中…',

  termsIntro: 'アカウントを作成すると、以下に同意したことになります：',
  termsOfService: '利用規約',
  termsAnd: 'と',

  emailMissingTitle: 'メールアドレスが未入力です',
  emailMissing: '続けるには、メールアドレスを入力してください。',
  emailCheckTitle: 'メールアドレスを確認してください',
  emailCheck: 'メールアドレスの形式が正しくないようです。',
  passwordMissingTitle: 'パスワードが未入力です',
  passwordMissing: '続けるには、パスワードを入力してください。',
  passwordShortTitle: 'パスワードが短すぎます',
  passwordShort: '6文字以上で入力してください。',
  passwordsMismatchTitle: 'パスワードが一致しません',
  passwordsMismatch: '両方の欄に同じパスワードを入力してください。',

  signUpFailedTitle: 'アカウントを作成できませんでした',
  signUpFailed: 'アカウントの作成中にエラーが発生しました',
  errEmailInUse: 'このメールアドレスはすでに登録されています',
  errWeakPassword: 'パスワードが弱すぎます',
  errSignUpNotAllowed: 'メールアドレスでの登録は現在利用できません',
  googleFailedTitle: 'Googleで続行できませんでした',
  guestFailedTitle: 'ゲストとしてログインできませんでした',
};
