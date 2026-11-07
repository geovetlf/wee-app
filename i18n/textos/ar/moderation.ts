/*
 * ÁRABE — Moderación: denunciar una publicación, un comentario o un perfil
 * desde cualquier sitio de Weë. Tipado contra el español.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales, y la
 * confirmación dice solo que el reporte se RECIBIÓ («تم استلام البلاغ»).
 * «Spam» se dice «رسائل غير مرغوب فيها», que es el término asentado en las
 * interfaces en árabe; «سبام» se entiende pero no se escribe.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'إبلاغ',
  subtitle: 'أخبرنا بما يحدث مع هذا المحتوى.',
  chooseReason: 'اختر سببًا',
  send: 'إرسال البلاغ',
  sending: 'جارٍ إرسال البلاغ…',
  reasonSpam: 'محتوى غير مرغوب فيه',
  reasonHarassment: 'مضايقة أو تنمّر',
  reasonHate: 'كراهية أو تمييز',
  reasonSexual: 'عُري أو محتوى جنسي',
  reasonViolence: 'عنف',
  reasonScam: 'احتيال أو نصب',
  reasonImpersonation: 'انتحال شخصية',
  reasonIllegal: 'محتوى غير قانوني',
  reasonIntellectualProperty: 'الملكية الفكرية',
  reasonSelfHarm: 'إيذاء النفس أو الانتحار',
  reasonOther: 'سبب آخر',
  successTitle: 'تم استلام البلاغ',
  successBody: 'شكرًا لمساعدتنا في الحفاظ على أمان Weë.',
  duplicateTitle: 'سبق أن أبلغت عنه',
  duplicateBody: 'سبق أن استلمنا بلاغك عن هذا المحتوى.',
  errorTitle: 'تعذّر إرسال بلاغك.',
  errorBody: 'يُرجى المحاولة مرة أخرى.',
  errorOffline: 'لا يوجد اتصال. يُرجى المحاولة مرة أخرى.',
  errorRateLimited: 'لقد أرسلت بلاغات كثيرة متتالية. يُرجى المحاولة لاحقًا.',
  errorUnavailable: 'لم يعد هذا المحتوى متاحًا.',
};
