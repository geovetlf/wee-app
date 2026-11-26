/*
 * GRIEGO — Entrar en Weë: acceso, alta y lo que dice cuando algo no sale.
 * Tipado contra el español.
 *
 * Los espacios de borde son los del español: la pantalla concatena piezas.
 * El aviso legal se arma «termsIntro + termsOfService + termsAnd +
 * settings.privacyPolicy»; por eso «termsAnd» lleva el artículo de la
 * política («και την»). El ejemplo de correo va en greeklish («onoma@…»),
 * porque una dirección con letras griegas no sirve de ejemplo real.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Καλώς ήρθες στο Weë',
  signInToContinue: 'Συνδέσου για να συνεχίσεις',
  email: 'Email',
  emailPlaceholder: 'onoma@email.com',
  password: 'Κωδικός πρόσβασης',
  passwordPlaceholder: 'Ο κωδικός πρόσβασής σου',
  forgotPassword: 'Ξέχασες τον κωδικό πρόσβασης;',
  orContinueWith: 'Ή συνέχισε με',
  continueWithGoogle: 'Συνέχεια με Google',
  enterAsGuest: 'Είσοδος ως επισκέπτης',
  noAccount: 'Δεν έχεις λογαριασμό; ',
  registerHere: 'Κάνε εγγραφή εδώ',
  signingIn: 'Σύνδεση…',

  fillAllFields: 'Συμπλήρωσε όλα τα πεδία',
  signInFailed: 'Σφάλμα κατά τη σύνδεση',
  authErrorTitle: 'Σφάλμα ελέγχου ταυτότητας',
  errUserNotFound: 'Δεν υπάρχει λογαριασμός με αυτό το email',
  errWrongPassword: 'Λάθος κωδικός πρόσβασης',
  errInvalidEmail: 'Μη έγκυρο email',
  errUserDisabled: 'Αυτός ο λογαριασμός έχει απενεργοποιηθεί',
  googleFailed: 'Δεν ήταν δυνατή η σύνδεση με Google. Δοκίμασε ξανά.',
  anonymousFailed: 'Δεν ήταν δυνατή η είσοδος ως επισκέπτης. Δοκίμασε ξανά.',
  emailRequiredTitle: 'Απαιτείται email',
  emailRequired: 'Γράψε το email σου για να επαναφέρεις τον κωδικό πρόσβασης',
  emailSentTitle: 'Το email στάλθηκε',
  resetEmailSent: 'Έλεγξε το email σου για να επαναφέρεις τον κωδικό πρόσβασής σου',
  resetFailed: 'Δεν ήταν δυνατή η αποστολή του email επαναφοράς κωδικού. Δοκίμασε ξανά.',

  /* ── EL ALTA ── */
  createAccount: 'Δημιούργησε τον λογαριασμό σου',
  joinWee: 'Γίνε μέλος της κοινότητας του Weë',
  passwordMinPlaceholder: 'Τουλάχιστον 6 χαρακτήρες',
  confirmPassword: 'Επιβεβαίωση κωδικού πρόσβασης',
  confirmPasswordPlaceholder: 'Γράψε ξανά τον κωδικό σου',
  createAccountButton: 'Δημιουργία λογαριασμού',
  orRegisterWith: 'Ή κάνε εγγραφή με',
  haveAccount: 'Έχεις ήδη λογαριασμό; ',
  signInHere: 'Συνδέσου εδώ',
  creatingAccount: 'Δημιουργία λογαριασμού…',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Δημιουργώντας λογαριασμό, αποδέχεσαι τους ',
  termsOfService: 'Όρους χρήσης',
  termsAnd: ' και την ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'Λείπει το email σου',
  emailMissing: 'Γράψε το email σου για να συνεχίσεις.',
  emailCheckTitle: 'Έλεγξε το email σου',
  emailCheck: 'Αυτό το email δεν φαίνεται έγκυρο.',
  passwordMissingTitle: 'Λείπει ο κωδικός πρόσβασης',
  passwordMissing: 'Γράψε έναν κωδικό πρόσβασης για να συνεχίσεις.',
  passwordShortTitle: 'Πολύ σύντομος κωδικός',
  passwordShort: 'Χρησιμοποίησε τουλάχιστον 6 χαρακτήρες.',
  passwordsMismatchTitle: 'Οι κωδικοί δεν ταιριάζουν',
  passwordsMismatch: 'Γράψε τον ίδιο κωδικό και στα δύο πεδία.',

  /* Lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Δεν μπορέσαμε να δημιουργήσουμε τον λογαριασμό σου',
  signUpFailed: 'Σφάλμα κατά τη δημιουργία του λογαριασμού',
  errEmailInUse: 'Υπάρχει ήδη λογαριασμός με αυτό το email',
  errWeakPassword: 'Ο κωδικός πρόσβασης είναι πολύ αδύναμος',
  errSignUpNotAllowed: 'Η εγγραφή με email δεν επιτρέπεται',
  googleFailedTitle: 'Δεν μπορέσαμε να συνεχίσουμε με Google',
  guestFailedTitle: 'Δεν μπορέσαμε να σε συνδέσουμε ως επισκέπτη',
};
