/*
 * VIETNAMITA — entrar en Weë: la pantalla de acceso, el alta y sus avisos.
 *
 * El aviso legal se pinta en cuatro trozos:
 *   termsIntro + termsOfService + termsAnd + settings.privacyPolicy
 * En vietnamita el orden natural coincide con el español, así que los espacios
 * de borde (`noAccount`, `haveAccount`, `termsIntro`, `termsAnd`) se conservan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const auth: typeof import('../es/auth').auth = {
  welcome: 'Chào mừng bạn đến với Weë',
  signInToContinue: 'Đăng nhập để tiếp tục',
  email: 'Email',
  emailPlaceholder: 'ban@email.com',
  password: 'Mật khẩu',
  passwordPlaceholder: 'Mật khẩu của bạn',
  forgotPassword: 'Quên mật khẩu?',
  orContinueWith: 'Hoặc tiếp tục với',
  continueWithGoogle: 'Tiếp tục với Google',
  enterAsGuest: 'Vào với tư cách khách',
  noAccount: 'Chưa có tài khoản? ',
  registerHere: 'Đăng ký tại đây',
  signingIn: 'Đang đăng nhập...',

  fillAllFields: 'Vui lòng điền đầy đủ các trường',
  signInFailed: 'Đăng nhập không thành công',
  authErrorTitle: 'Lỗi xác thực',
  errUserNotFound: 'Không có tài khoản nào dùng email này',
  errWrongPassword: 'Mật khẩu không đúng',
  errInvalidEmail: 'Email không hợp lệ',
  errUserDisabled: 'Tài khoản này đã bị vô hiệu hóa',
  googleFailed: 'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
  anonymousFailed: 'Không thể vào với tư cách khách. Vui lòng thử lại.',
  emailRequiredTitle: 'Cần có email',
  emailRequired: 'Vui lòng nhập email để đặt lại mật khẩu',
  emailSentTitle: 'Đã gửi email',
  resetEmailSent: 'Hãy kiểm tra email của bạn để đặt lại mật khẩu',
  resetFailed: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.',

  /* El alta. */
  createAccount: 'Tạo tài khoản của bạn',
  joinWee: 'Tham gia cộng đồng Weë',
  passwordMinPlaceholder: 'Tối thiểu 6 ký tự',
  confirmPassword: 'Xác nhận mật khẩu',
  confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
  createAccountButton: 'Tạo tài khoản',
  orRegisterWith: 'Hoặc đăng ký với',
  haveAccount: 'Đã có tài khoản? ',
  signInHere: 'Đăng nhập tại đây',
  creatingAccount: 'Đang tạo tài khoản...',

  /* El aviso legal va en cuatro trozos porque dos de ellos son enlaces. */
  termsIntro: 'Khi tạo tài khoản, bạn đồng ý với ',
  termsOfService: 'Điều khoản dịch vụ',
  termsAnd: ' và ',

  /* Lo que se comprueba antes de mandar nada. */
  emailMissingTitle: 'Thiếu email',
  emailMissing: 'Hãy nhập email để tiếp tục.',
  emailCheckTitle: 'Kiểm tra lại email',
  emailCheck: 'Email này có vẻ không hợp lệ.',
  passwordMissingTitle: 'Thiếu mật khẩu',
  passwordMissing: 'Hãy nhập mật khẩu để tiếp tục.',
  passwordShortTitle: 'Mật khẩu quá ngắn',
  passwordShort: 'Hãy dùng ít nhất 6 ký tự.',
  passwordsMismatchTitle: 'Mật khẩu không khớp',
  passwordsMismatch: 'Hãy nhập cùng một mật khẩu ở cả hai trường.',

  /* Lo que contesta el alta cuando no puede. */
  signUpFailedTitle: 'Không thể tạo tài khoản của bạn',
  signUpFailed: 'Tạo tài khoản không thành công',
  errEmailInUse: 'Đã có tài khoản dùng email này',
  errWeakPassword: 'Mật khẩu quá yếu',
  errSignUpNotAllowed: 'Không cho phép đăng ký bằng email',
  googleFailedTitle: 'Không thể tiếp tục với Google',
  guestFailedTitle: 'Không thể vào với tư cách khách',
};
