/*
 * TIẾNG VIỆT — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Xưng «bạn», như cả từ điển. confirmWord «XÓA» theo cách bỏ dấu của common.delete («Xóa»).
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Xóa tài khoản',
  sectionDanger: 'Vùng nguy hiểm',
  title: 'Xóa tài khoản',
  goesFaces: 'Tất cả hồ sơ của bạn: Hồ sơ thật và các bản thể khác của bạn',
  goesCharacter: 'Nhân vật của bạn và avatar của nhân vật',
  goesPosts: 'Bài đăng, bình luận và lượt bày tỏ cảm xúc của bạn',
  goesMessages: 'Tin nhắn WeeTalk của bạn: nội dung sẽ bị xóa trống, và cuộc trò chuyện của người kia sẽ không còn các tin nhắn đó',
  goesCreations: 'Tác phẩm, dự án và cuộc trò chuyện Weë AI của bạn',
  goesContacts: 'Danh bạ, cộng đồng và mục đã lưu của bạn',
  goesCredits: 'Số Credits còn lại: sẽ mất và không được hoàn lại',
  whatStaysTitle: 'Những gì được giữ lại',
  staysRecords: 'Hồ sơ kế toán về Credits và thanh toán. Chúng được lưu mà không có tên hay thông tin hồ sơ của bạn, vì đó là sổ sách kế toán của Weë.',
  confirmLabel: 'Để xác nhận, hãy nhập “{{palabra}}”',
  confirmWord: 'XÓA',
  confirmPlaceholder: 'Nhập từ đó vào đây',
  dialogTitle: 'Xóa tài khoản của bạn?',
  dialogConfirm: 'Xóa',
  doneTitle: 'Tài khoản của bạn đã được xóa',
  doneBody: 'Cảm ơn bạn đã là một phần của Weë.',
  reauthTitle: 'Đăng nhập lại',
  reauthBody: 'Để bảo mật, bạn cần vừa mới đăng nhập thì mới xóa được tài khoản. Hãy đăng xuất, đăng nhập lại và làm lại các bước này.',
  reauthButton: 'Đăng xuất để đăng nhập lại',
  errorTitle: 'Không thể hoàn tất',
  errorBody: 'Đã có lỗi giữa chừng. Hãy thử lại: quá trình sẽ tiếp tục từ chỗ đã dừng.',
  retry: 'Thử lại',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Tài khoản bị vô hiệu hóa và sau 30 ngày mọi thứ sẽ bị xóa',
  introDesactivar: 'Tài khoản của bạn sẽ bị vô hiệu hóa ngay bây giờ và nếu bạn không quay lại trong 30 ngày, mọi thứ sẽ bị xóa vĩnh viễn.',
  nowTitle: 'Điều gì xảy ra bây giờ',
  nowHidden: 'Tài khoản của bạn không còn hiển thị: không ai thấy hồ sơ hay bài đăng của bạn',
  nowCharacterOff: 'Chế độ tự hành động của nhân vật sẽ tắt và không còn tính phí',
  nowComeBack_one: 'Bạn có {{contador}} ngày để quay lại: hãy đăng nhập lại và chọn “Kích hoạt tài khoản”',
  nowComeBack_other: 'Bạn có {{contador}} ngày để quay lại: hãy đăng nhập lại và chọn “Kích hoạt tài khoản”',
  whatGoesLaterTitle: 'Những gì bị xóa nếu bạn không quay lại',
  deactivateButton: 'Xóa tài khoản của tôi',
  dialogBodyDesactivar: 'Tài khoản của bạn sẽ không còn hiển thị. Nếu bạn không quay lại trong 30 ngày, mọi thứ sẽ bị xóa và bạn không thể khôi phục.',
  deactivating: 'Đang vô hiệu hóa tài khoản của bạn…',
  deactivatedTitle: 'Tài khoản của bạn đã bị vô hiệu hóa',
  deactivatedBody: 'Bạn có thời hạn đến {{fecha}} để quay lại. Sau đó, mọi thứ sẽ bị xóa vĩnh viễn.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tài khoản của bạn đã bị vô hiệu hóa',
  activarBody: 'Bạn đã yêu cầu xóa tài khoản. Trong thời gian tài khoản bị vô hiệu hóa, không ai thấy hồ sơ hay bài đăng của bạn.',
  activarDaysLeft_one: 'Còn {{contador}} ngày trước khi xóa vĩnh viễn',
  activarDaysLeft_other: 'Còn {{contador}} ngày trước khi xóa vĩnh viễn',
  activarDate: 'Nếu bạn không kích hoạt lại, tài khoản sẽ bị xóa vĩnh viễn vào {{fecha}}.',
  activarCharacterNote: 'Chế độ tự hành động của nhân vật vẫn sẽ tắt; bạn có thể lên lịch lại bất cứ lúc nào.',
  activarButton: 'Kích hoạt tài khoản',
  activating: 'Đang kích hoạt tài khoản của bạn…',
  activatedTitle: 'Tài khoản của bạn đã hoạt động trở lại',
  activarExpiredTitle: 'Đã hết thời hạn để quay lại',
  activarExpiredBody: 'Tài khoản của bạn sẽ bị xóa hoàn toàn trong vài giờ tới.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '{{creditos}} Credits còn lại của bạn: sẽ mất và không được hoàn lại',
};
