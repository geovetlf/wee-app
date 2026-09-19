/*
 * CHINO TRADICIONAL (TAIWÁN) — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer, y
 * el título no repite la explicación. Nada de 操作失敗 a secas. Los códigos de
 * Firebase (`auth/user-not-found`) no están aquí: son identificadores. Y
 * `{{detalle}}` es lo que dijo el servidor, así que sale sin tocar.
 *
 * VOCABULARIO DE TAIWÁN, NO CONVERSIÓN DE CARACTERES: se entra con 登入 y se sale
 * con 登出 —nunca 登錄—, la cuenta es 帳號, el correo 電子郵件, se 註冊 y se 建立
 * (no 創建), la contraseña se 設定 (no 設置) y se cuenta por 字元. Weë tiene 社群,
 * no 社區.
 *
 * Registro de app moderna: 你 y nunca 您; ni 請您, ni 敬請, ni 尊敬的用戶. El 請
 * suelto sí se usa donde de verdad se pide algo （請再試一次）, que es lo normal en
 * chino y no suena a ventanilla.
 *
 * EL AVISO LEGAL se arma pegando cuatro trozos y se lee entero así:
 *
 *   termsIntro + termsOfService + termsAnd + settings.privacyPolicy
 *   → «建立帳號即表示你同意服務條款和隱私權政策»
 *
 * 即表示 es la fórmula que usan las apps para esto: formal sin burocracia, y en
 * Taiwán el documento se llama 隱私權政策, no 隱私政策.
 *
 * SIN ESPACIOS DE BORDE, al revés que el español. `termsIntro`, `termsAnd`,
 * `noAccount` y `haveAccount` llevan espacio en castellano porque allí separan
 * palabras latinas; en chino no se separan las palabras y el enlace va pegado al
 * texto, así que el espacio sobra y se quita.
 *
 * `emailPlaceholder` es una dirección de EJEMPLO que se lee, no la de nadie: por
 * eso sí se traduce, como en los demás idiomas. «Google» y «Weë» no.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: '歡迎來到 Weë',
  signInToContinue: '登入後繼續',
  email: '電子郵件',
  emailPlaceholder: '你@email.com',
  password: '密碼',
  passwordPlaceholder: '輸入你的密碼',
  forgotPassword: '忘記密碼了嗎？',
  orContinueWith: '或用以下方式繼續',
  continueWithGoogle: '使用 Google 繼續',
  enterAsGuest: '以訪客身分進入',
  noAccount: '還沒有帳號？',
  registerHere: '立即註冊',
  signingIn: '正在登入…',

  fillAllFields: '請把所有欄位填寫完整',
  signInFailed: '登入失敗',
  authErrorTitle: '驗證錯誤',
  errUserNotFound: '這個電子郵件還沒有註冊過帳號',
  errWrongPassword: '密碼不正確',
  errInvalidEmail: '電子郵件格式不正確',
  errUserDisabled: '這個帳號已經停用',
  googleFailed: '無法使用 Google 登入。請再試一次。',
  anonymousFailed: '無法以訪客身分進入。請再試一次。',
  emailRequiredTitle: '需要填寫電子郵件',
  emailRequired: '請輸入你的電子郵件，我們會寄一封重設密碼的信給你',
  emailSentTitle: '信件已寄出',
  resetEmailSent: '到信箱收信，照著裡面的步驟重設密碼',
  resetFailed: '無法寄出重設密碼的電子郵件。請再試一次。',

  createAccount: '建立你的帳號',
  joinWee: '加入 Weë 社群',
  passwordMinPlaceholder: '至少 6 個字元',
  confirmPassword: '確認密碼',
  confirmPasswordPlaceholder: '再輸入一次密碼',
  createAccountButton: '建立帳號',
  orRegisterWith: '或用以下方式註冊',
  haveAccount: '已經有帳號了？',
  signInHere: '立即登入',
  creatingAccount: '正在建立帳號…',

  termsIntro: '建立帳號即表示你同意',
  termsOfService: '服務條款',
  termsAnd: '和',

  emailMissingTitle: '還沒填電子郵件',
  emailMissing: '填寫你的電子郵件才能繼續。',
  emailCheckTitle: '檢查一下電子郵件',
  emailCheck: '這個電子郵件地址看起來不太對。',
  passwordMissingTitle: '還沒填密碼',
  passwordMissing: '設定一組密碼才能繼續。',
  passwordShortTitle: '密碼太短了',
  passwordShort: '密碼至少要 6 個字元。',
  passwordsMismatchTitle: '兩次輸入的密碼不一樣',
  passwordsMismatch: '在兩個欄位裡填寫同一組密碼。',

  signUpFailedTitle: '無法建立你的帳號',
  signUpFailed: '建立帳號失敗',
  errEmailInUse: '這個電子郵件已經註冊過帳號了',
  errWeakPassword: '這組密碼太簡單了',
  errSignUpNotAllowed: '目前不支援用電子郵件註冊',
  googleFailedTitle: '無法用 Google 繼續',
  guestFailedTitle: '無法以訪客身分進入',
};
