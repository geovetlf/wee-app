/*
 * VIETNAMITA — Lo que contestan ËContact y las encuestas cuando algo no se puede hacer (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Không có yêu cầu nào để chấp nhận.',
  ecRelacionInvalida: 'Yêu cầu này không hợp lệ.',
  ecNoLaRecibiste: 'Chỉ người nhận yêu cầu mới có thể chấp nhận.',
  ecYaSonContactos: 'Hai bạn đã là ËContact của nhau.',
  ecIdentidadInvalida: 'Hồ sơ đó không hợp lệ.',
  ecIdentidadDesconocida: 'Hồ sơ đó không tồn tại.',
  ecIdentidadAjena: 'Hồ sơ đó không phải của bạn.',
  ecMismaPersona: 'Bạn không thể kết nối với chính mình.',
  ecYaExiste: 'Đã có mối quan hệ với hồ sơ này.',
  ecIniciaSesion: 'Hãy đăng nhập để dùng ËContact.',
  ecNoSeCompleto: 'Không thể hoàn tất thao tác. Hãy thử lại.',
  ecFaltaPerfilPropio: 'Chưa rõ bạn kết nối bằng hồ sơ nào.',
  ecFaltaPerfilAjeno: 'Còn thiếu hồ sơ cần kết nối.',
  ecFaltaPerfilQueAcepta: 'Chưa rõ bạn chấp nhận bằng hồ sơ nào.',
  ecFaltaPerfilQueEnvia: 'Còn thiếu hồ sơ của người đã gửi yêu cầu cho bạn.',
  encSinEncuesta: 'Bài viết này không có khảo sát.',
  encInvalida: 'Khảo sát này không hợp lệ.',
  encAntigua: 'Khảo sát này thuộc phiên bản cũ của Weë và không còn nhận bình chọn.',
  encOpcionInexistente: 'Lựa chọn đó không có trong khảo sát này.',
  encCerrada: 'Khảo sát này đã kết thúc.',
  encYaVotaste: 'Bạn đã bình chọn trong khảo sát này.',
  encPostNoExiste: 'Bài viết này không còn tồn tại.',
  encIniciaSesion: 'Bạn phải đăng nhập để bình chọn.',
  encFaltaPublicacion: 'Còn thiếu bài viết.',
  encFaltaOpcion: 'Còn thiếu lựa chọn.',
  encNoSeRegistro: 'Không thể ghi nhận bình chọn của bạn. Hãy thử lại.',
};
