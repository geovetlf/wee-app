/*
 * FRANCÉS — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer.
 * Los códigos de Firebase (`auth/user-not-found`) no están aquí: son
 * identificadores. Y `{{detalle}}` es lo que dijo el servidor, así que sale sin
 * tocar. Tratamiento informal (tu), apóstrofo tipográfico ’ y espacio antes de
 * ? ! y : como manda la tipografía francesa.
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en
 * el borde a propósito, porque la pantalla los pega con el enlace de al lado.
 * El aviso legal se lee entero así: termsIntro + termsOfService + termsAnd +
 * settings.privacyPolicy.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Bienvenue sur Weë',
  signInToContinue: 'Connecte-toi pour continuer',
  email: 'E-mail',
  emailPlaceholder: 'toi@email.com',
  password: 'Mot de passe',
  passwordPlaceholder: 'Ton mot de passe',
  forgotPassword: 'Mot de passe oublié ?',
  orContinueWith: 'Ou continue avec',
  continueWithGoogle: 'Continuer avec Google',
  enterAsGuest: 'Continuer en invité',
  noAccount: 'Pas encore de compte ? ',
  registerHere: 'Inscris-toi ici',
  signingIn: 'Connexion en cours...',

  fillAllFields: 'Remplis tous les champs',
  signInFailed: 'La connexion a échoué',
  authErrorTitle: 'Erreur d’authentification',
  errUserNotFound: 'Aucun compte n’existe avec cet e-mail',
  errWrongPassword: 'Mot de passe incorrect',
  errInvalidEmail: 'E-mail invalide',
  errUserDisabled: 'Ce compte a été désactivé',
  googleFailed: 'La connexion avec Google n’a pas abouti. Réessaie.',
  anonymousFailed: 'L’accès en tant qu’invité n’a pas abouti. Réessaie.',
  emailRequiredTitle: 'E-mail requis',
  emailRequired: 'Saisis ton e-mail pour réinitialiser ton mot de passe',
  emailSentTitle: 'E-mail envoyé',
  resetEmailSent: 'Consulte ta boîte mail pour réinitialiser ton mot de passe',
  resetFailed: 'L’e-mail de réinitialisation n’a pas pu être envoyé. Réessaie.',

  createAccount: 'Crée ton compte',
  joinWee: 'Rejoins la communauté Weë',
  passwordMinPlaceholder: 'Au moins 6 caractères',
  confirmPassword: 'Confirmer le mot de passe',
  confirmPasswordPlaceholder: 'Répète ton mot de passe',
  createAccountButton: 'Créer un compte',
  orRegisterWith: 'Ou inscris-toi avec',
  haveAccount: 'Tu as déjà un compte ? ',
  signInHere: 'Connecte-toi ici',
  creatingAccount: 'Création du compte...',

  termsIntro: 'En créant un compte, tu acceptes nos ',
  termsOfService: 'Conditions d’utilisation',
  termsAnd: ' et ',

  emailMissingTitle: 'Il manque ton e-mail',
  emailMissing: 'Saisis ton e-mail pour continuer.',
  emailCheckTitle: 'Vérifie ton e-mail',
  emailCheck: 'Cet e-mail ne semble pas valide.',
  passwordMissingTitle: 'Il manque ton mot de passe',
  passwordMissing: 'Saisis un mot de passe pour continuer.',
  passwordShortTitle: 'Mot de passe trop court',
  passwordShort: 'Utilise au moins 6 caractères.',
  passwordsMismatchTitle: 'Les mots de passe ne correspondent pas',
  passwordsMismatch: 'Saisis le même mot de passe dans les deux champs.',

  signUpFailedTitle: 'Nous n’avons pas pu créer ton compte',
  signUpFailed: 'Le compte n’a pas pu être créé',
  errEmailInUse: 'Un compte existe déjà avec cet e-mail',
  errWeakPassword: 'Le mot de passe est trop faible',
  errSignUpNotAllowed: 'L’inscription par e-mail n’est pas autorisée',
  googleFailedTitle: 'Nous n’avons pas pu continuer avec Google',
  guestFailedTitle: 'Nous n’avons pas pu te connecter en invité',
};
