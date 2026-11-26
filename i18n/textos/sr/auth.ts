/*
 * SERBIO (ћирилица, екавски) — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español. Los códigos de error de Firebase no están aquí y
 * `{{detalle}}` sale sin tocar. «Добро дошли» es la bienvenida neutra del
 * serbio (el singular marca género). «Google» va transliterado («Гугл»), como es
 * habitual en cirílico; el placeholder del email lleva la parte local en cirílico.
 * `noAccount` y `haveAccount` terminan en espacio; `termsIntro` y `termsAnd`
 * se concatenan con enlaces.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Добро дошли у Weë',
  signInToContinue: 'Пријави се да наставиш',
  email: 'Имејл',
  emailPlaceholder: 'име@email.com',
  password: 'Лозинка',
  passwordPlaceholder: 'Твоја лозинка',
  forgotPassword: 'Заборављена лозинка?',
  orContinueWith: 'Или настави преко',
  continueWithGoogle: 'Настави преко Google налога',
  enterAsGuest: 'Уђи као гост',
  noAccount: 'Немаш налог? ',
  registerHere: 'Региструј се овде',
  signingIn: 'Пријављивање...',

  fillAllFields: 'Попуни сва поља',
  signInFailed: 'Грешка при пријави',
  authErrorTitle: 'Грешка при провери идентитета',
  errUserNotFound: 'Не постоји налог с овим имејлом',
  errWrongPassword: 'Погрешна лозинка',
  errInvalidEmail: 'Неважећи имејл',
  errUserDisabled: 'Овај налог је онемогућен',
  googleFailed: 'Пријава преко Google налога није успела. Покушај поново.',
  anonymousFailed: 'Улазак као гост није успео. Покушај поново.',
  emailRequiredTitle: 'Потребан је имејл',
  emailRequired: 'Унеси свој имејл за ресетовање лозинке',
  emailSentTitle: 'Имејл је послат',
  resetEmailSent: 'Провери имејл да ресетујеш лозинку',
  resetFailed: 'Имејл за ресетовање лозинке није могао да се пошаље. Покушај поново.',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'Направи свој налог',
  joinWee: 'Придружи се Weë заједници',
  passwordMinPlaceholder: 'Најмање 6 знакова',
  confirmPassword: 'Потврди лозинку',
  confirmPasswordPlaceholder: 'Понови лозинку',
  createAccountButton: 'Направи налог',
  orRegisterWith: 'Или се региструј преко',
  haveAccount: 'Већ имаш налог? ',
  signInHere: 'Пријави се овде',
  creatingAccount: 'Прављење налога...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Прављењем налога прихваташ наше ',
  termsOfService: 'Услове коришћења',
  termsAnd: ' и ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Недостаје имејл',
  emailMissing: 'Упиши свој имејл да наставиш.',
  emailCheckTitle: 'Провери имејл',
  emailCheck: 'Тај имејл не изгледа исправно.',
  passwordMissingTitle: 'Недостаје лозинка',
  passwordMissing: 'Упиши лозинку да наставиш.',
  passwordShortTitle: 'Лозинка је прекратка',
  passwordShort: 'Користи најмање 6 знакова.',
  passwordsMismatchTitle: 'Лозинке се не поклапају',
  passwordsMismatch: 'Упиши исту лозинку у оба поља.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Нисмо могли да направимо твој налог',
  signUpFailed: 'Прављење налога није успело',
  errEmailInUse: 'Већ постоји налог с овим имејлом',
  errWeakPassword: 'Лозинка је преслаба',
  errSignUpNotAllowed: 'Регистрација имејлом није дозвољена',
  googleFailedTitle: 'Нисмо могли да наставимо преко Google налога',
  guestFailedTitle: 'Нисмо успели да те пријавимо као госта',
};
