/*
 * COREANO — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer,
 * y el título y la explicación no repiten lo mismo. Los códigos de Firebase
 * (`auth/user-not-found`) no están aquí: son identificadores. Y `{{detalle}}` es
 * lo que dijo el servidor, así que sale sin tocar.
 *
 * Registro 해요체 en toda la pantalla, CON UNA EXCEPCIÓN: el aviso legal, que va
 * en 합니다체 porque es un texto jurídico. La pantalla lo arma pegando cuatro
 * trozos, y el coreano pone el verbo al final, así que el verbo tiene que estar
 * en `termsIntro` —no puede ir detrás de un enlace que no controlamos—:
 *
 *   termsIntro + termsOfService + termsAnd + settings.privacyPolicy
 *   → «계정을 만들면 다음 내용에 동의하는 것으로 간주합니다: 이용약관 및 개인정보 처리방침»
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en el
 * borde a propósito, porque la pantalla los pega con el enlace de al lado.
 *
 * `emailPlaceholder` es una dirección de EJEMPLO que se lee, no la de nadie: por
 * eso sí se traduce, como en los demás idiomas. «Google» y «Weë» no.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Weë에 오신 것을 환영해요',
  signInToContinue: '계속하려면 로그인하세요',
  email: '이메일',
  emailPlaceholder: '아이디@email.com',
  password: '비밀번호',
  passwordPlaceholder: '비밀번호를 입력하세요',
  forgotPassword: '비밀번호를 잊으셨나요?',
  orContinueWith: '또는 다음으로 계속하기',
  continueWithGoogle: 'Google로 계속하기',
  enterAsGuest: '게스트로 시작하기',
  noAccount: '계정이 없으신가요? ',
  registerHere: '가입하기',
  signingIn: '로그인 중...',

  fillAllFields: '모든 항목을 입력해 주세요',
  signInFailed: '로그인하지 못했어요',
  authErrorTitle: '인증 오류',
  errUserNotFound: '이 이메일로 등록된 계정이 없어요',
  errWrongPassword: '비밀번호가 올바르지 않아요',
  errInvalidEmail: '이메일 형식이 올바르지 않아요',
  errUserDisabled: '이 계정은 사용이 중지됐어요',
  googleFailed: 'Google로 로그인하지 못했어요. 다시 시도해 주세요.',
  anonymousFailed: '게스트로 입장하지 못했어요. 다시 시도해 주세요.',
  emailRequiredTitle: '이메일이 필요해요',
  emailRequired: '비밀번호를 재설정하려면 이메일을 입력해 주세요',
  emailSentTitle: '이메일을 보냈어요',
  resetEmailSent: '비밀번호를 재설정하려면 받은 메일함을 확인해 주세요',
  resetFailed: '비밀번호 재설정 이메일을 보내지 못했어요. 다시 시도해 주세요.',

  createAccount: '계정을 만들어 보세요',
  joinWee: 'Weë 커뮤니티에 함께해요',
  passwordMinPlaceholder: '6자 이상',
  confirmPassword: '비밀번호 확인',
  confirmPasswordPlaceholder: '비밀번호를 다시 입력하세요',
  createAccountButton: '계정 만들기',
  orRegisterWith: '또는 다음으로 가입하기',
  haveAccount: '이미 계정이 있으신가요? ',
  signInHere: '로그인하기',
  creatingAccount: '계정 만드는 중...',

  termsIntro: '계정을 만들면 다음 내용에 동의하는 것으로 간주합니다: ',
  termsOfService: '이용약관',
  termsAnd: ' 및 ',

  emailMissingTitle: '이메일이 비어 있어요',
  emailMissing: '계속하려면 이메일을 입력해 주세요.',
  emailCheckTitle: '이메일을 확인해 주세요',
  emailCheck: '이메일 형식이 올바르지 않은 것 같아요.',
  passwordMissingTitle: '비밀번호가 비어 있어요',
  passwordMissing: '계속하려면 비밀번호를 입력해 주세요.',
  passwordShortTitle: '비밀번호가 너무 짧아요',
  passwordShort: '6자 이상으로 입력해 주세요.',
  passwordsMismatchTitle: '비밀번호가 일치하지 않아요',
  passwordsMismatch: '두 칸에 같은 비밀번호를 입력해 주세요.',

  signUpFailedTitle: '계정을 만들지 못했어요',
  signUpFailed: '계정 만들기 오류',
  errEmailInUse: '이 이메일로 등록된 계정이 이미 있어요',
  errWeakPassword: '비밀번호가 너무 약해요',
  errSignUpNotAllowed: '이메일 가입은 허용되지 않아요',
  googleFailedTitle: 'Google로 계속하지 못했어요',
  guestFailedTitle: '게스트로 들어가지 못했어요',
};
