/*
 * NEERLANDÉS — Entrar en Weë: acceso, alta y lo que se dice cuando algo no sale.
 * Tipado contra el español.
 *
 * Los espacios de borde son los del español: el aviso legal se concatena en RegisterScreen como
 * termsIntro + «Servicevoorwaarden» + termsAnd + settings.privacyPolicy, y «noAccount»/«haveAccount» van
 * seguidos del enlace.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Welkom bij Weë',
  signInToContinue: 'Log in om verder te gaan',
  email: 'E-mail',
  emailPlaceholder: 'jij@email.com',
  password: 'Wachtwoord',
  passwordPlaceholder: 'Je wachtwoord',
  forgotPassword: 'Wachtwoord vergeten?',
  orContinueWith: 'Of ga verder met',
  continueWithGoogle: 'Doorgaan met Google',
  enterAsGuest: 'Doorgaan als gast',
  noAccount: 'Heb je nog geen account? ',
  registerHere: 'Registreer je hier',
  signingIn: 'Bezig met inloggen...',

  fillAllFields: 'Vul alle velden in',
  signInFailed: 'Inloggen mislukt',
  authErrorTitle: 'Verificatiefout',
  errUserNotFound: 'Er bestaat geen account met dit e-mailadres',
  errWrongPassword: 'Onjuist wachtwoord',
  errInvalidEmail: 'Ongeldig e-mailadres',
  errUserDisabled: 'Dit account is uitgeschakeld',
  googleFailed: 'Inloggen met Google is niet gelukt. Probeer het opnieuw.',
  anonymousFailed: 'Doorgaan als gast is niet gelukt. Probeer het opnieuw.',
  emailRequiredTitle: 'E-mail vereist',
  emailRequired: 'Vul je e-mailadres in om je wachtwoord opnieuw in te stellen',
  emailSentTitle: 'E-mail verstuurd',
  resetEmailSent: 'Kijk in je mailbox om je wachtwoord opnieuw in te stellen',
  resetFailed: 'De e-mail om je wachtwoord opnieuw in te stellen kon niet worden verstuurd. Probeer het opnieuw.',

  /* El alta. */
  createAccount: 'Maak je account aan',
  joinWee: 'Word lid van de Weë-community',
  passwordMinPlaceholder: 'Minimaal 6 tekens',
  confirmPassword: 'Wachtwoord bevestigen',
  confirmPasswordPlaceholder: 'Herhaal je wachtwoord',
  createAccountButton: 'Account maken',
  orRegisterWith: 'Of registreer je met',
  haveAccount: 'Heb je al een account? ',
  signInHere: 'Log hier in',
  creatingAccount: 'Account wordt aangemaakt...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Door een account aan te maken, ga je akkoord met onze ',
  termsOfService: 'Servicevoorwaarden',
  termsAnd: ' en ',

  /* Lo que se comprueba antes de mandar nada. */
  emailMissingTitle: 'Je e-mailadres ontbreekt',
  emailMissing: 'Vul je e-mailadres in om verder te gaan.',
  emailCheckTitle: 'Controleer je e-mailadres',
  emailCheck: 'Dat e-mailadres lijkt niet geldig.',
  passwordMissingTitle: 'Je wachtwoord ontbreekt',
  passwordMissing: 'Vul een wachtwoord in om verder te gaan.',
  passwordShortTitle: 'Wachtwoord te kort',
  passwordShort: 'Gebruik minimaal 6 tekens.',
  passwordsMismatchTitle: 'De wachtwoorden komen niet overeen',
  passwordsMismatch: 'Vul in beide velden hetzelfde wachtwoord in.',

  /* Lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'We konden je account niet aanmaken',
  signUpFailed: 'Account aanmaken mislukt',
  errEmailInUse: 'Er bestaat al een account met dit e-mailadres',
  errWeakPassword: 'Het wachtwoord is te zwak',
  errSignUpNotAllowed: 'Registreren met e-mail is niet toegestaan',
  googleFailedTitle: 'We konden niet verdergaan met Google',
  guestFailedTitle: 'We konden je niet als gast laten doorgaan',
};
