/*
 * ENGLISH — entrar en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 *
 * "Email" se escribe igual en los dos idiomas a propósito: es la misma palabra.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Welcome to Weë',
  signInToContinue: 'Sign in to continue',
  email: 'Email',
  emailPlaceholder: 'you@email.com',
  password: 'Password',
  passwordPlaceholder: 'Your password',
  forgotPassword: 'Forgot your password?',
  orContinueWith: 'Or continue with',
  continueWithGoogle: 'Continue with Google',
  enterAsGuest: 'Continue as a guest',
  noAccount: 'Don’t have an account? ',
  registerHere: 'Sign up here',
  signingIn: 'Signing in...',

  fillAllFields: 'Please fill in every field',
  signInFailed: 'You could not be signed in',
  authErrorTitle: 'Authentication error',
  errUserNotFound: 'There is no account with this email',
  errWrongPassword: 'Incorrect password',
  errInvalidEmail: 'Invalid email',
  errUserDisabled: 'This account has been disabled',
  googleFailed: 'You could not be signed in with Google: {{detalle}}',
  anonymousFailed: 'You could not be signed in as a guest: {{detalle}}',
  emailRequiredTitle: 'Email required',
  emailRequired: 'Please enter your email to reset your password',
  emailSentTitle: 'Email sent',
  resetEmailSent: 'Check your email to reset your password',
  resetFailed: 'The reset email could not be sent: {{detalle}}',

  createAccount: 'Create your account',
  joinWee: 'Join the Weë community',
  passwordMinPlaceholder: 'At least 6 characters',
  confirmPassword: 'Confirm password',
  confirmPasswordPlaceholder: 'Repeat your password',
  createAccountButton: 'Create account',
  orRegisterWith: 'Or sign up with',
  haveAccount: 'Already have an account? ',
  signInHere: 'Sign in here',
  creatingAccount: 'Creating your account...',

  termsIntro: 'By creating an account, you accept our ',
  termsOfService: 'Terms of Service',
  termsAnd: ' and ',

  emailMissingTitle: 'Your email is missing',
  emailMissing: 'Enter your email to continue.',
  emailCheckTitle: 'Check your email',
  emailCheck: 'That email does not look valid.',
  passwordMissingTitle: 'Your password is missing',
  passwordMissing: 'Enter a password to continue.',
  passwordShortTitle: 'Password too short',
  passwordShort: 'Use at least 6 characters.',
  passwordsMismatchTitle: 'The passwords do not match',
  passwordsMismatch: 'Enter the same password in both fields.',

  signUpFailedTitle: 'We could not create your account',
  signUpFailed: 'The account could not be created',
  errEmailInUse: 'An account with this email already exists',
  errWeakPassword: 'The password is too weak',
  errSignUpNotAllowed: 'Signing up with email is not allowed',
  googleFailedTitle: 'We could not continue with Google',
  guestFailedTitle: 'We could not sign you in as a guest',
};
