/*
 * RUSO — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: sesión, contraseña, correo, alta y verificación. Aquí manda la
 * PRECISIÓN: cada error dice qué ha pasado y qué hacer, y ninguno suaviza el
 * motivo. Los códigos de Firebase no están aquí —`auth/user-not-found` y sus
 * hermanos son identificadores— y lo que manda el proveedor entra por
 * `{{detalle}}` y sale sin tocar: es lo que dijo el servidor.
 *
 * TRES CLAVES LLEVAN UN ESPACIO AL FINAL A PROPÓSITO: `noAccount`, `haveAccount`
 * y `termsIntro`, y `termsAnd` lo lleva a los dos lados. Se concatenan en
 * pantalla con un enlace al lado; sin ese espacio las palabras se pegan.
 *
 * EL AVISO LEGAL SE ARMA EN CUATRO TROZOS y termina en un enlace que dice
 * «Политика конфиденциальности», en nominativo, porque es un título y en
 * `settings` se lee suelto. Por eso la frase no dice «вы принимаете Политику…»
 * —que pediría acusativo y rompería la declinación— sino que nombra los dos
 * documentos después de un punto: «Создавая аккаунт, вы принимаете наши
 * правила. Это Условия использования и Политика конфиденциальности».
 *
 * Trato de «вы» en minúscula.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Добро пожаловать в Weë',
  signInToContinue: 'Войдите, чтобы продолжить',
  email: 'Почта',
  emailPlaceholder: 'вы@email.com',
  password: 'Пароль',
  passwordPlaceholder: 'Введите пароль',
  forgotPassword: 'Забыли пароль?',
  orContinueWith: 'Или продолжить через',
  continueWithGoogle: 'Продолжить через Google',
  enterAsGuest: 'Войти как гость',
  noAccount: 'Нет аккаунта? ',
  registerHere: 'Зарегистрируйтесь',
  signingIn: 'Входим...',

  fillAllFields: 'Заполните все поля',
  signInFailed: 'Не удалось войти',
  authErrorTitle: 'Ошибка входа',
  errUserNotFound: 'Аккаунта с такой почтой нет',
  errWrongPassword: 'Неверный пароль',
  errInvalidEmail: 'Неверный адрес почты',
  errUserDisabled: 'Этот аккаунт отключён',
  googleFailed: 'Не удалось войти через Google. Попробуйте ещё раз.',
  anonymousFailed: 'Не удалось войти как гость. Попробуйте ещё раз.',
  emailRequiredTitle: 'Нужен адрес почты',
  emailRequired: 'Введите почту, чтобы сбросить пароль',
  emailSentTitle: 'Письмо отправлено',
  resetEmailSent: 'Проверьте почту, чтобы сбросить пароль',
  resetFailed: 'Не удалось отправить письмо для сброса пароля. Попробуйте ещё раз.',

  createAccount: 'Создайте аккаунт',
  joinWee: 'Присоединяйтесь к сообществу Weë',
  passwordMinPlaceholder: 'Минимум 6 символов',
  confirmPassword: 'Подтвердите пароль',
  confirmPasswordPlaceholder: 'Повторите пароль',
  createAccountButton: 'Создать аккаунт',
  orRegisterWith: 'Или зарегистрироваться через',
  haveAccount: 'Уже есть аккаунт? ',
  signInHere: 'Войдите',
  creatingAccount: 'Создаём аккаунт...',

  termsIntro: 'Создавая аккаунт, вы принимаете наши правила. Это ',
  termsOfService: 'Условия использования',
  termsAnd: ' и ',

  emailMissingTitle: 'Не указана почта',
  emailMissing: 'Введите почту, чтобы продолжить.',
  emailCheckTitle: 'Проверьте адрес почты',
  emailCheck: 'Кажется, адрес указан неверно.',
  passwordMissingTitle: 'Не указан пароль',
  passwordMissing: 'Введите пароль, чтобы продолжить.',
  passwordShortTitle: 'Слишком короткий пароль',
  passwordShort: 'Используйте не меньше 6 символов.',
  passwordsMismatchTitle: 'Пароли не совпадают',
  passwordsMismatch: 'Введите один и тот же пароль в оба поля.',

  signUpFailedTitle: 'Не удалось создать аккаунт',
  signUpFailed: 'Ошибка при создании аккаунта',
  errEmailInUse: 'Аккаунт с такой почтой уже существует',
  errWeakPassword: 'Пароль слишком простой',
  errSignUpNotAllowed: 'Регистрация по почте недоступна',
  googleFailedTitle: 'Не удалось продолжить через Google',
  guestFailedTitle: 'Не удалось войти как гость',
};
