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
};
