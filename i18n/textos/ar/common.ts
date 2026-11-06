/*
 * ÁRABE — lo que se repite por toda la app: botones, estados y errores.
 * Tipado contra el español.
 *
 * Botones como sustantivos de acción (إلغاء، حفظ، حذف…). `accept` es el
 * «Aceptar» de los diálogos, así que se dice «موافق» y no «قبول» (que es
 * aceptar a una persona, en ËContact). `postsCount` cuenta publicaciones y
 * su hueco es `{{cantidad}}`, que se conserva en TODAS las formas; por eso
 * `_one` dice «{{cantidad}} منشور» y no hay dual. «Ver todos →» apunta a la
 * izquierda («←»), que es «hacia delante» en RTL.
 */
import { ConPlurales } from './plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'إلغاء',
  save: 'حفظ',
  delete: 'حذف',
  close: 'إغلاق',
  back: 'رجوع',
  next: 'التالي',
  done: 'تم',
  accept: 'موافق',
  send: 'إرسال',
  share: 'مشاركة',
  retry: 'إعادة المحاولة',
  mediaUnavailable: 'هذا الملف غير متاح',
  loading: 'جارٍ التحميل…',
  error: 'خطأ',
  somethingWentWrong: 'حدث خطأ ما',
  noResults: 'لا توجد نتائج',
  notAvailable: 'غير متاح',
  comingSoon: 'قريبًا',
  new: 'جديد',
  seeAll: 'عرض الكل ←',
  guest: 'ضيف',
  anonymousUser: 'مستخدم مجهول',
  user: 'مستخدم',
  yes: 'نعم',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'لا',
  loadMore: 'تحميل المزيد من المنشورات',
  postsCount_one: '{{cantidad}} منشور',
  postsCount_few: '{{cantidad}} منشورات',
  postsCount_many: '{{cantidad}} منشورًا',
  postsCount_other: '{{cantidad}} منشور',
  someone: 'شخص ما',
};
