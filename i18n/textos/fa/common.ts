/*
 * PERSA — Lo que se repite por toda la app: botones, estados y errores
 * comunes. Tipado contra el español.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'لغو',
  save: 'ذخیره',
  delete: 'حذف',
  close: 'بستن',
  back: 'بازگشت',
  next: 'بعدی',
  done: 'تمام',
  accept: 'تأیید',
  send: 'ارسال',
  share: 'اشتراک‌گذاری',
  retry: 'تلاش دوباره',
  mediaUnavailable: 'این فایل در دسترس نیست',
  loading: 'در حال بارگذاری…',
  error: 'خطا',
  somethingWentWrong: 'مشکلی پیش آمد',
  noResults: 'نتیجه‌ای پیدا نشد',
  notAvailable: 'در دسترس نیست',
  comingSoon: 'به‌زودی',
  new: 'جدید',
  seeAll: 'مشاهده همه ←',
  guest: 'مهمان',
  anonymousUser: 'کاربر ناشناس',
  user: 'کاربر',
  yes: 'بله',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'خیر',
  loadMore: 'بارگذاری پست‌های بیشتر',
  postsCount_one: '{{cantidad}} پست',
  postsCount_other: '{{cantidad}} پست',
  someone: 'کسی',
};
