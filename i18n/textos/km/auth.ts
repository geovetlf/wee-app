/*
 * JEMER — entrar en Weë: la pantalla de acceso, el alta y lo que dice cuando
 * algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Iniciar sesión» es «ចូល», «registrarse» «ចុះឈ្មោះ», «cuenta» «គណនី»,
 * «correo» «អ៊ីមែល» y «contraseña» «ពាក្យសម្ងាត់» (glosario § 4). Los códigos de
 * Firebase no están aquí. `noAccount` y `haveAccount` terminan en espacio y
 * `termsIntro`/`termsAnd` se concatenan con enlaces, igual que el molde. El
 * ejemplo de email lleva la parte local en jemer, como el hindi («ឈ្មោះ@email.com»):
 * nadie lo envía, se lee. Entre palabras va ZWSP (U+200B).
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'សូម​ស្វាគមន៍​មកកាន់ Weë',
  signInToContinue: 'ចូល​ដើម្បី​បន្ត',
  email: 'អ៊ីមែល',
  emailPlaceholder: 'ឧទាហរណ៍៖ you@email.com',
  password: 'ពាក្យសម្ងាត់',
  passwordPlaceholder: 'ពាក្យសម្ងាត់​របស់អ្នក',
  forgotPassword: 'ភ្លេច​ពាក្យសម្ងាត់?',
  orContinueWith: 'ឬ​បន្ត​ជាមួយ',
  continueWithGoogle: 'បន្ត​ជាមួយ Google',
  enterAsGuest: 'ចូល​ជា​ភ្ញៀវ',
  noAccount: 'មិនទាន់​មាន​គណនី? ',
  registerHere: 'ចុះឈ្មោះ​នៅទីនេះ',
  signingIn: 'កំពុង​ចូល...',

  fillAllFields: 'សូម​បំពេញ​គ្រប់​វាល',
  signInFailed: 'មាន​កំហុស​ក្នុង​ការចូល',
  authErrorTitle: 'កំហុស​ផ្ទៀងផ្ទាត់',
  errUserNotFound: 'មិនមាន​គណនី​ជាមួយ​អ៊ីមែល​នេះទេ',
  errWrongPassword: 'ពាក្យសម្ងាត់​មិន​ត្រឹមត្រូវ',
  errInvalidEmail: 'អ៊ីមែល​មិន​ត្រឹមត្រូវ',
  errUserDisabled: 'គណនី​នេះ​ត្រូវបាន​បិទ',
  googleFailed: 'មិនអាច​ចូល​ជាមួយ Google បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',
  anonymousFailed: 'មិនអាច​ចូល​ជា​ភ្ញៀវ​បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',
  emailRequiredTitle: 'ត្រូវការ​អ៊ីមែល',
  emailRequired: 'សូម​បញ្ចូល​អ៊ីមែល​របស់អ្នក​ដើម្បី​កំណត់​ពាក្យសម្ងាត់​ឡើងវិញ',
  emailSentTitle: 'បាន​ផ្ញើ​អ៊ីមែល',
  resetEmailSent: 'ពិនិត្យ​អ៊ីមែល​របស់អ្នក​ដើម្បី​កំណត់​ពាក្យសម្ងាត់​ឡើងវិញ',
  resetFailed: 'មិនអាច​ផ្ញើ​អ៊ីមែល​សម្រាប់​កំណត់​ពាក្យសម្ងាត់​ឡើងវិញ​បានទេ។ សូម​ព្យាយាម​ម្តងទៀត។',

  /* ── EL ALTA ──────────────────────────────────────────────────────────── */
  createAccount: 'បង្កើត​គណនី​របស់អ្នក',
  joinWee: 'ចូលរួម​សហគមន៍ Weë',
  passwordMinPlaceholder: 'យ៉ាងតិច 6 តួអក្សរ',
  confirmPassword: 'បញ្ជាក់​ពាក្យសម្ងាត់',
  confirmPasswordPlaceholder: 'វាយ​ពាក្យសម្ងាត់​របស់អ្នក​ម្តងទៀត',
  createAccountButton: 'បង្កើត​គណនី',
  orRegisterWith: 'ឬ​ចុះឈ្មោះ​ជាមួយ',
  haveAccount: 'មាន​គណនី​រួចហើយ? ',
  signInHere: 'ចូល​នៅទីនេះ',
  creatingAccount: 'កំពុង​បង្កើត​គណនី...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'ដោយ​បង្កើត​គណនី អ្នក​យល់ព្រម​នឹង ',
  termsOfService: 'លក្ខខណ្ឌ​សេវាកម្ម',
  termsAnd: ' និង ',

  /* Lo que se comprueba antes de mandar nada: título y explicación. */
  emailMissingTitle: 'ខ្វះ​អ៊ីមែល​របស់អ្នក',
  emailMissing: 'វាយ​អ៊ីមែល​របស់អ្នក​ដើម្បី​បន្ត។',
  emailCheckTitle: 'ពិនិត្យ​អ៊ីមែល​របស់អ្នក',
  emailCheck: 'អ៊ីមែល​នោះ​ហាក់ដូចជា​មិន​ត្រឹមត្រូវ។',
  passwordMissingTitle: 'ខ្វះ​ពាក្យសម្ងាត់​របស់អ្នក',
  passwordMissing: 'វាយ​ពាក្យសម្ងាត់​ដើម្បី​បន្ត។',
  passwordShortTitle: 'ពាក្យសម្ងាត់​ខ្លីពេក',
  passwordShort: 'ប្រើ​យ៉ាងតិច 6 តួអក្សរ។',
  passwordsMismatchTitle: 'ពាក្យសម្ងាត់​មិន​ត្រូវគ្នា',
  passwordsMismatch: 'វាយ​ពាក្យសម្ងាត់​ដូចគ្នា​ក្នុង​វាល​ទាំងពីរ។',

  /* Y lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'យើង​មិនអាច​បង្កើត​គណនី​របស់អ្នក​បានទេ',
  signUpFailed: 'មាន​កំហុស​ក្នុង​ការបង្កើត​គណនី',
  errEmailInUse: 'មាន​គណនី​ជាមួយ​អ៊ីមែល​នេះ​រួចហើយ',
  errWeakPassword: 'ពាក្យសម្ងាត់​ខ្សោយពេក',
  errSignUpNotAllowed: 'មិន​អនុញ្ញាត​ឱ្យ​ចុះឈ្មោះ​ដោយ​អ៊ីមែល​ទេ',
  googleFailedTitle: 'យើង​មិនអាច​បន្ត​ជាមួយ Google បានទេ',
  guestFailedTitle: 'យើង​មិនអាច​ចូល​ជា​ភ្ញៀវ​បានទេ',
};
