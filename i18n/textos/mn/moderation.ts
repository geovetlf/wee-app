/*
 * MONGOL — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 * Tipado contra el español. La confirmación dice solo que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Мэдээлэх',
  subtitle: 'Энэ контентод юу болоод байгааг бидэнд хэлнэ үү.',
  chooseReason: 'Шалтгаан сонгоно уу',
  send: 'Мэдээлэл илгээх',
  sending: 'Мэдээлэл илгээж байна…',
  reasonSpam: 'Спам',
  reasonHarassment: 'Дарамт эсвэл айлган сүрдүүлэлт',
  reasonHate: 'Үзэн ядалт эсвэл ялгаварлан гадуурхалт',
  reasonSexual: 'Нүцгэн байдал эсвэл бэлгийн харилцааны тухай контент',
  reasonViolence: 'Хүчирхийлэл',
  reasonScam: 'Залилан эсвэл луйвар',
  reasonImpersonation: 'Бусдын нэрийг хуурамчаар ашиглах',
  reasonIllegal: 'Хууль бус контент',
  reasonIntellectualProperty: 'Оюуны өмч',
  reasonOther: 'Өөр шалтгаан',
  successTitle: 'Мэдээллийг хүлээн авлаа',
  successBody: 'Weë-г аюулгүй байлгахад тусалсанд баярлалаа.',
  duplicateTitle: 'Та үүнийг аль хэдийн мэдээлсэн байна',
  duplicateBody: 'Энэ контентын талаарх таны мэдээллийг бид аль хэдийн хүлээн авсан.',
  errorTitle: 'Таны мэдээллийг илгээж чадсангүй.',
  errorBody: 'Дахин оролдоно уу.',
  errorOffline: 'Интернэт холболт алга. Дахин оролдоно уу.',
  errorRateLimited: 'Та дараалан олон мэдээлэл илгээсэн байна. Дараа дахин оролдоно уу.',
  errorUnavailable: 'Энэ контентыг одоо үзэх боломжгүй.',
};
