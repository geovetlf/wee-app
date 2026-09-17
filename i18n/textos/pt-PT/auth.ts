/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — entrar en Weë: la pantalla de acceso y lo que
 * dice cuando algo no sale.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ÁREA SENSIBLE: aquí manda la precisión. Cada error dice qué pasó y qué hacer,
 * y ninguno se adorna. Los códigos de Firebase (`auth/user-not-found`) no están
 * aquí: son identificadores. Y `{{detalle}}` es lo que dijo el servidor, así que
 * sale sin tocar.
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS:
 *
 *   ESTAR A + INFINITIVO, nunca el gerundio: "A iniciar sessão..." y no
 *   "Entrando...", "A criar a conta..." y no "Criando a conta...".
 *   TRATO DE "TU", nunca "você": "Não tens conta?", "a tua palavra-passe",
 *   "Esqueceste-te", "Regista-te aqui", "Junta-te à comunidade".
 *   INFINITIVO PERSONAL donde Portugal lo usa: "para continuares", "para
 *   redefinires a palavra-passe".
 *
 * Y el vocabulario de esta puerta, término a término:
 *
 *   palavra-passe / palavras-passe (no senha) · iniciar sessão (no entrar)
 *   registar-se (no cadastrar-se) · registo (no cadastro) · demasiado (no muito)
 *   correio eletrónico (no correio eletrônico) · anónima (no anônima)
 *   incorreta, sin la c que el acuerdo ortográfico le quitó en Portugal
 *
 * OJO: `noAccount`, `haveAccount`, `termsIntro` y `termsAnd` llevan espacio en el
 * borde a propósito, porque la pantalla los pega con el enlace de al lado. El
 * aviso legal se lee entero así: termsIntro + termsOfService + termsAnd +
 * settings.privacyPolicy → «Ao criares uma conta, aceitas os nossos Termos de
 * Serviço e a nossa Política de Privacidade». Por eso `termsAnd` lleva el
 * posesivo femenino con artículo: en portugués europeo la frase no cierra sin él.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Bem-vindo ao Weë',
  signInToContinue: 'Inicia sessão para continuar',
  email: 'E-mail',
  emailPlaceholder: 'teu@email.com',
  password: 'Palavra-passe',
  passwordPlaceholder: 'A tua palavra-passe',
  forgotPassword: 'Esqueceste-te da palavra-passe?',
  orContinueWith: 'Ou continua com',
  continueWithGoogle: 'Continuar com o Google',
  enterAsGuest: 'Entrar como convidado',
  noAccount: 'Não tens conta? ',
  registerHere: 'Regista-te aqui',
  signingIn: 'A iniciar sessão...',

  fillAllFields: 'Preenche todos os campos',
  signInFailed: 'Erro ao iniciar sessão',
  authErrorTitle: 'Erro de autenticação',
  errUserNotFound: 'Não existe nenhuma conta com este e-mail',
  errWrongPassword: 'Palavra-passe incorreta',
  errInvalidEmail: 'E-mail inválido',
  errUserDisabled: 'Esta conta foi desativada',
  googleFailed: 'Erro ao iniciar sessão com o Google: {{detalle}}',
  anonymousFailed: 'Erro ao entrar de forma anónima: {{detalle}}',
  emailRequiredTitle: 'E-mail obrigatório',
  emailRequired: 'Escreve o teu e-mail para redefinires a palavra-passe',
  emailSentTitle: 'E-mail enviado',
  resetEmailSent: 'Consulta o teu correio eletrónico para redefinires a palavra-passe',
  resetFailed: 'Erro ao enviar o e-mail de redefinição: {{detalle}}',

  createAccount: 'Cria a tua conta',
  joinWee: 'Junta-te à comunidade Weë',
  passwordMinPlaceholder: 'No mínimo 6 caracteres',
  confirmPassword: 'Confirmar a palavra-passe',
  confirmPasswordPlaceholder: 'Repete a tua palavra-passe',
  createAccountButton: 'Criar conta',
  orRegisterWith: 'Ou regista-te com',
  haveAccount: 'Já tens conta? ',
  signInHere: 'Inicia sessão aqui',
  creatingAccount: 'A criar a conta...',

  termsIntro: 'Ao criares uma conta, aceitas os nossos ',
  termsOfService: 'Termos de Serviço',
  termsAnd: ' e a nossa ',

  emailMissingTitle: 'Falta o teu e-mail',
  emailMissing: 'Escreve o teu e-mail para continuares.',
  emailCheckTitle: 'Verifica o teu e-mail',
  emailCheck: 'Esse e-mail não parece válido.',
  passwordMissingTitle: 'Falta a tua palavra-passe',
  passwordMissing: 'Escreve uma palavra-passe para continuares.',
  passwordShortTitle: 'Palavra-passe demasiado curta',
  passwordShort: 'Usa pelo menos 6 caracteres.',
  passwordsMismatchTitle: 'As palavras-passe não coincidem',
  passwordsMismatch: 'Escreve a mesma palavra-passe nos dois campos.',

  signUpFailedTitle: 'Não conseguimos criar a tua conta',
  signUpFailed: 'Erro ao criar a conta',
  errEmailInUse: 'Já existe uma conta com este e-mail',
  errWeakPassword: 'A palavra-passe é demasiado fraca',
  errSignUpNotAllowed: 'Registo com e-mail não permitido',
  googleFailedTitle: 'Não conseguimos continuar com o Google',
  guestFailedTitle: 'Não conseguimos entrar como convidado',
};
