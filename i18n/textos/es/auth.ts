/*
 * Entrar en Weë: la pantalla de acceso y lo que dice cuando algo no sale.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * LOS CÓDIGOS DE ERROR NO ESTÁN AQUÍ. `auth/user-not-found` y sus hermanos los
 * manda Firebase y son identificadores, no palabras: la pantalla los traduce a
 * una de estas frases y el código se queda tal cual. Y cuando el proveedor
 * manda un detalle propio, entra por `{{detalle}}` y sale sin tocar: es lo que
 * dijo el servidor, y traducirlo sería inventárselo.
 */
export const auth = {
  welcome: 'Bienvenido a Weë',
  signInToContinue: 'Inicia sesión para continuar',
  email: 'Email',
  emailPlaceholder: 'tu@email.com',
  password: 'Contraseña',
  passwordPlaceholder: 'Tu contraseña',
  forgotPassword: '¿Olvidaste tu contraseña?',
  orContinueWith: 'O continúa con',
  continueWithGoogle: 'Continuar con Google',
  enterAsGuest: 'Entrar como invitado',
  noAccount: '¿No tienes cuenta? ',
  registerHere: 'Regístrate aquí',
  signingIn: 'Iniciando sesión...',

  fillAllFields: 'Por favor completa todos los campos',
  signInFailed: 'Error al iniciar sesión',
  authErrorTitle: 'Error de Autenticación',
  errUserNotFound: 'No existe una cuenta con este email',
  errWrongPassword: 'Contraseña incorrecta',
  errInvalidEmail: 'Email inválido',
  errUserDisabled: 'Esta cuenta ha sido deshabilitada',
  googleFailed: 'Error al iniciar sesión con Google: {{detalle}}',
  anonymousFailed: 'Error al acceder de forma anónima: {{detalle}}',
  emailRequiredTitle: 'Email requerido',
  emailRequired: 'Por favor ingresa tu email para restablecer la contraseña',
  emailSentTitle: 'Email enviado',
  resetEmailSent: 'Revisa tu correo electrónico para restablecer tu contraseña',
  resetFailed: 'Error al enviar email de restablecimiento: {{detalle}}',
};
