/*
 * POLACO — entrar en Weë: la pantalla de acceso, el alta y lo que dicen cuando
 * algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los códigos de error de Firebase no están aquí: son identificadores. El
 * placeholder del email se deja como en el molde. `noAccount` y `haveAccount`
 * terminan en espacio, y `termsIntro`/`termsAnd` se concatenan con enlaces.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Witaj w Weë',
  signInToContinue: 'Zaloguj się, aby kontynuować',
  email: 'E-mail',
  emailPlaceholder: 'ty@email.com',
  password: 'Hasło',
  passwordPlaceholder: 'Twoje hasło',
  forgotPassword: 'Nie pamiętasz hasła?',
  orContinueWith: 'Lub kontynuuj przez',
  continueWithGoogle: 'Kontynuuj przez Google',
  enterAsGuest: 'Wejdź jako gość',
  noAccount: 'Nie masz konta? ',
  registerHere: 'Zarejestruj się tutaj',
  signingIn: 'Logowanie...',

  fillAllFields: 'Wypełnij wszystkie pola',
  signInFailed: 'Błąd logowania',
  authErrorTitle: 'Błąd uwierzytelniania',
  errUserNotFound: 'Nie ma konta z tym adresem e-mail',
  errWrongPassword: 'Nieprawidłowe hasło',
  errInvalidEmail: 'Nieprawidłowy e-mail',
  errUserDisabled: 'To konto zostało wyłączone',
  googleFailed: 'Nie udało się zalogować przez Google. Spróbuj ponownie.',
  anonymousFailed: 'Nie udało się wejść jako gość. Spróbuj ponownie.',
  emailRequiredTitle: 'Wymagany e-mail',
  emailRequired: 'Wpisz swój e-mail, aby zresetować hasło',
  emailSentTitle: 'E-mail wysłany',
  resetEmailSent: 'Sprawdź swoją pocztę, aby zresetować hasło',
  resetFailed: 'Nie udało się wysłać e-maila do zresetowania hasła. Spróbuj ponownie.',

  /* ── EL ALTA ─────────────────────────────────────────────────────────── */
  createAccount: 'Utwórz swoje konto',
  joinWee: 'Dołącz do społeczności Weë',
  passwordMinPlaceholder: 'Minimum 6 znaków',
  confirmPassword: 'Potwierdź hasło',
  confirmPasswordPlaceholder: 'Powtórz hasło',
  createAccountButton: 'Utwórz konto',
  orRegisterWith: 'Lub zarejestruj się przez',
  haveAccount: 'Masz już konto? ',
  signInHere: 'Zaloguj się tutaj',
  creatingAccount: 'Tworzenie konta...',

  /* El aviso legal va en trozos porque dos de ellos son enlaces. */
  termsIntro: 'Tworząc konto, akceptujesz dokumenty: ',
  termsOfService: 'Regulamin',
  termsAnd: ' i ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Brakuje e-maila',
  emailMissing: 'Wpisz swój e-mail, aby kontynuować.',
  emailCheckTitle: 'Sprawdź e-mail',
  emailCheck: 'Ten e-mail nie wygląda na prawidłowy.',
  passwordMissingTitle: 'Brakuje hasła',
  passwordMissing: 'Wpisz hasło, aby kontynuować.',
  passwordShortTitle: 'Hasło za krótkie',
  passwordShort: 'Użyj co najmniej 6 znaków.',
  passwordsMismatchTitle: 'Hasła nie są takie same',
  passwordsMismatch: 'Wpisz to samo hasło w obu polach.',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Nie udało się utworzyć konta',
  signUpFailed: 'Błąd podczas tworzenia konta',
  errEmailInUse: 'Konto z tym adresem e-mail już istnieje',
  errWeakPassword: 'Hasło jest za słabe',
  errSignUpNotAllowed: 'Rejestracja przez e-mail jest niedozwolona',
  googleFailedTitle: 'Nie udało się kontynuować przez Google',
  guestFailedTitle: 'Nie udało się wejść jako gość',
};
