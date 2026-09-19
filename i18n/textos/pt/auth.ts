/*
 * PORTUGUÉS (pt-BR) — entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer.
 * Los códigos de Firebase (`auth/user-not-found`) no están aquí: son
 * identificadores. Y `{{detalle}}` es lo que dijo el servidor, así que sale sin
 * tocar. Tratamiento informal (você).
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en
 * el borde a propósito, porque la pantalla los pega con el enlace de al lado.
 * El aviso legal se lee entero así: termsIntro + termsOfService + termsAnd +
 * settings.privacyPolicy → «Ao criar uma conta, você aceita nossos Termos de
 * Serviço e nossa Política de Privacidade.». Por eso `termsAnd` lleva aquí el
 * posesivo femenino: en portugués la frase no cierra sin él.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Boas-vindas ao Weë',
  signInToContinue: 'Entre para continuar',
  email: 'E-mail',
  emailPlaceholder: 'seu@email.com',
  password: 'Senha',
  passwordPlaceholder: 'Sua senha',
  forgotPassword: 'Esqueceu sua senha?',
  orContinueWith: 'Ou continue com',
  continueWithGoogle: 'Continuar com o Google',
  enterAsGuest: 'Entrar como convidado',
  noAccount: 'Não tem uma conta? ',
  registerHere: 'Cadastre-se aqui',
  signingIn: 'Entrando...',

  fillAllFields: 'Preencha todos os campos',
  signInFailed: 'Erro ao entrar',
  authErrorTitle: 'Erro de autenticação',
  errUserNotFound: 'Não existe uma conta com este e-mail',
  errWrongPassword: 'Senha incorreta',
  errInvalidEmail: 'E-mail inválido',
  errUserDisabled: 'Esta conta foi desativada',
  googleFailed: 'Não foi possível entrar com o Google. Tente de novo.',
  anonymousFailed: 'Não foi possível entrar como convidado. Tente de novo.',
  emailRequiredTitle: 'E-mail obrigatório',
  emailRequired: 'Digite seu e-mail para redefinir a senha',
  emailSentTitle: 'E-mail enviado',
  resetEmailSent: 'Confira seu e-mail para redefinir a sua senha',
  resetFailed: 'Não foi possível enviar o e-mail para redefinir a senha. Tente de novo.',

  createAccount: 'Crie a sua conta',
  joinWee: 'Entre para a comunidade Weë',
  passwordMinPlaceholder: 'No mínimo 6 caracteres',
  confirmPassword: 'Confirmar a senha',
  confirmPasswordPlaceholder: 'Repita a sua senha',
  createAccountButton: 'Criar conta',
  orRegisterWith: 'Ou cadastre-se com',
  haveAccount: 'Já tem uma conta? ',
  signInHere: 'Entre aqui',
  creatingAccount: 'Criando a conta...',

  termsIntro: 'Ao criar uma conta, você aceita nossos ',
  termsOfService: 'Termos de Serviço',
  termsAnd: ' e nossa ',

  emailMissingTitle: 'Falta o seu e-mail',
  emailMissing: 'Escreva o seu e-mail para continuar.',
  emailCheckTitle: 'Confira o seu e-mail',
  emailCheck: 'Esse e-mail não parece válido.',
  passwordMissingTitle: 'Falta a sua senha',
  passwordMissing: 'Escreva uma senha para continuar.',
  passwordShortTitle: 'Senha muito curta',
  passwordShort: 'Use pelo menos 6 caracteres.',
  passwordsMismatchTitle: 'As senhas não coincidem',
  passwordsMismatch: 'Escreva a mesma senha nos dois campos.',

  signUpFailedTitle: 'Não conseguimos criar a sua conta',
  signUpFailed: 'Erro ao criar a conta',
  errEmailInUse: 'Já existe uma conta com este e-mail',
  errWeakPassword: 'A senha é muito fraca',
  errSignUpNotAllowed: 'Cadastro com e-mail não permitido',
  googleFailedTitle: 'Não conseguimos continuar com o Google',
  guestFailedTitle: 'Não conseguimos entrar como convidado',
};
