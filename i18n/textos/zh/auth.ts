/*
 * CHINO SIMPLIFICADO — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer, y
 * el título no repite la explicación. Nada de 操作失败 a secas. Los códigos de
 * Firebase (`auth/user-not-found`) no están aquí: son identificadores. Y
 * `{{detalle}}` es lo que dijo el servidor, así que sale sin tocar.
 *
 * Registro de app moderna: 你 y nunca 您; ni 请您, ni 敬请, ni 尊敬的用户. El 请
 * suelto sí se usa donde de verdad se pide algo （请重试）, que es lo normal en
 * chino y no suena a ventanilla.
 *
 * EL AVISO LEGAL se arma pegando cuatro trozos y se lee entero así:
 *
 *   termsIntro + termsOfService + termsAnd + settings.privacyPolicy
 *   → «创建账号即表示你同意 服务条款 和 隐私政策»
 *
 * 即表示 es la fórmula que usan las apps chinas para esto: formal sin burocracia.
 * OJO, Y AL REVÉS QUE EN EL RESTO DE IDIOMAS: `noAccount`, `haveAccount`,
 * `termsIntro` y `termsAnd` NO llevan espacio en el borde. En español y en las
 * demás lenguas latinas ese espacio separa palabras al concatenarse con el
 * enlace de al lado; en chino no se separan las palabras, y detrás de un signo
 * de ancho completo como ？ el hueco se ve doble. La frase montada queda
 * «创建账号即表示你同意服务条款和隐私政策», sin un solo espacio.
 *
 * `emailPlaceholder` es una dirección de EJEMPLO que se lee, no la de nadie: por
 * eso sí se traduce, como en los demás idiomas. «Google» y «Weë» no.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: '欢迎来到 Weë',
  signInToContinue: '登录后继续',
  email: '邮箱',
  emailPlaceholder: '你@email.com',
  password: '密码',
  passwordPlaceholder: '输入你的密码',
  forgotPassword: '忘记密码了？',
  orContinueWith: '或用以下方式继续',
  continueWithGoogle: '使用 Google 继续',
  enterAsGuest: '以访客身份进入',
  noAccount: '还没有账号？',
  registerHere: '立即注册',
  signingIn: '正在登录…',

  fillAllFields: '请把所有内容填写完整',
  signInFailed: '登录失败',
  authErrorTitle: '认证错误',
  errUserNotFound: '这个邮箱还没有注册过账号',
  errWrongPassword: '密码不正确',
  errInvalidEmail: '邮箱格式不正确',
  errUserDisabled: '这个账号已被停用',
  googleFailed: 'Google 登录失败：{{detalle}}',
  anonymousFailed: '匿名登录失败：{{detalle}}',
  emailRequiredTitle: '需要填写邮箱',
  emailRequired: '请输入你的邮箱，我们会发送重置密码的邮件',
  emailSentTitle: '邮件已发送',
  resetEmailSent: '去邮箱查收邮件，按照里面的步骤重置密码',
  resetFailed: '没能发出重置密码的邮件：{{detalle}}',

  createAccount: '创建你的账号',
  joinWee: '加入 Weë 社区',
  passwordMinPlaceholder: '至少 6 个字符',
  confirmPassword: '确认密码',
  confirmPasswordPlaceholder: '再次输入密码',
  createAccountButton: '创建账号',
  orRegisterWith: '或用以下方式注册',
  haveAccount: '已经有账号了？',
  signInHere: '立即登录',
  creatingAccount: '正在创建账号…',

  termsIntro: '创建账号即表示你同意',
  termsOfService: '服务条款',
  termsAnd: '和',

  emailMissingTitle: '还没填邮箱',
  emailMissing: '填写你的邮箱才能继续。',
  emailCheckTitle: '检查一下邮箱',
  emailCheck: '这个邮箱地址看起来不太对。',
  passwordMissingTitle: '还没填密码',
  passwordMissing: '设置一个密码才能继续。',
  passwordShortTitle: '密码太短了',
  passwordShort: '密码至少要 6 个字符。',
  passwordsMismatchTitle: '两次输入的密码不一样',
  passwordsMismatch: '在两个输入框里填写同一个密码。',

  signUpFailedTitle: '没能创建你的账号',
  signUpFailed: '创建账号失败',
  errEmailInUse: '这个邮箱已经注册过账号了',
  errWeakPassword: '这个密码太简单了',
  errSignUpNotAllowed: '暂不支持用邮箱注册',
  googleFailedTitle: '没能用 Google 继续',
  guestFailedTitle: '没能以访客身份进入',
};
