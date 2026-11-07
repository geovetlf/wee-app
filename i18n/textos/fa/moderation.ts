/*
 * PERSA — Moderación: denunciar una publicación, un comentario o un perfil
 * desde cualquier sitio de Weë. Los motivos son categorías en lenguaje normal,
 * no términos legales; la confirmación dice solo que el reporte se RECIBIÓ.
 * Tipado contra el español.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'گزارش',
  subtitle: 'برایمان توضیح دهید مشکل این محتوا چیست.',
  chooseReason: 'یک دلیل انتخاب کنید',
  send: 'ارسال گزارش',
  sending: 'در حال ارسال گزارش…',
  reasonSpam: 'هرزنامه',
  reasonHarassment: 'آزار یا ارعاب',
  reasonHate: 'نفرت‌پراکنی یا تبعیض',
  reasonSexual: 'برهنگی یا محتوای جنسی',
  reasonViolence: 'خشونت',
  reasonScam: 'کلاهبرداری یا تقلب',
  reasonImpersonation: 'جعل هویت',
  reasonIllegal: 'محتوای غیرقانونی',
  reasonIntellectualProperty: 'مالکیت فکری',
  reasonSelfHarm: 'خودآزاری یا خودکشی',
  reasonOther: 'دلیل دیگر',
  successTitle: 'گزارش دریافت شد',
  successBody: 'ممنون که کمک می‌کنید Weë امن بماند.',
  duplicateTitle: 'پیش‌تر گزارش داده بودید',
  duplicateBody: 'گزارش شما درباره این محتوا را پیش‌تر دریافت کرده‌ایم.',
  errorTitle: 'نتوانستیم گزارش شما را ارسال کنیم.',
  errorBody: 'دوباره تلاش کنید.',
  errorOffline: 'اتصال اینترنت برقرار نیست. دوباره تلاش کنید.',
  errorRateLimited: 'گزارش‌های زیادی پشت سر هم فرستاده‌اید. کمی بعد دوباره تلاش کنید.',
  errorUnavailable: 'این محتوا دیگر در دسترس نیست.',
};
