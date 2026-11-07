/*
 * VIETNAMITA — Denunciar: la hoja única para todo lo denunciable.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Báo cáo',
  subtitle: 'Hãy cho chúng tôi biết nội dung này có vấn đề gì.',
  chooseReason: 'Chọn một lý do',
  send: 'Gửi báo cáo',
  sending: 'Đang gửi báo cáo…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Quấy rối hoặc bắt nạt',
  reasonHate: 'Thù ghét hoặc phân biệt đối xử',
  reasonSexual: 'Khỏa thân hoặc nội dung tình dục',
  reasonViolence: 'Bạo lực',
  reasonScam: 'Lừa đảo hoặc gian lận',
  reasonImpersonation: 'Mạo danh',
  reasonIllegal: 'Nội dung bất hợp pháp',
  reasonIntellectualProperty: 'Sở hữu trí tuệ',
  reasonOther: 'Lý do khác',
  successTitle: 'Đã nhận báo cáo',
  successBody: 'Cảm ơn bạn đã giúp giữ cho Weë an toàn.',
  duplicateTitle: 'Bạn đã báo cáo nội dung này rồi',
  duplicateBody: 'Chúng tôi đã nhận được báo cáo của bạn về nội dung này.',
  errorTitle: 'Không thể gửi báo cáo của bạn.',
  errorBody: 'Vui lòng thử lại.',
  errorOffline: 'Không có kết nối. Vui lòng thử lại.',
  errorRateLimited: 'Bạn đã gửi quá nhiều báo cáo liên tiếp. Vui lòng thử lại sau.',
  errorUnavailable: 'Nội dung này không còn khả dụng.',
};
