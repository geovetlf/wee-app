/*
 * ÁRABE — ËContact y ẄContact. Tipado contra el español.
 *
 * Los dos nombres son marca, entran por `{{lista}}` y no se declinan: por eso
 * `count_one` dice «{{lista}} واحد» sin cifra y `count_two` usa el dual
 * «اثنان»; el resto lleva `{{contador}}`. `ConPlurales` solo por ese `_two`.
 * «Perfil Real» = «الملف الحقيقي», «Perfil Weë» = «ملف Weë», como en el menú.
 */
import { ConPlurales } from './plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'الطلبات الواردة',
  requestsSent: 'الطلبات المرسلة',
  yours: '{{lista}} الخاصة بك',
  yoursWhenYouSignIn: '{{lista}} الخاصة بك، عند تسجيل الدخول',
  yoursWhenYouSignInSubtitle: 'يحفظ {{lista}} اتصالاتك في Weë. سجّل الدخول لرؤيتها.',
  noneYet: 'ليس لديك {{lista}} بعد',
  noneYetSubtitle: 'هنا سيكون معارفك في Weë. الاتصال يتم بين اثنين: شخص يقترحه والآخر يقبله.',
  noAgenda: 'لا يملك هذا الملف الشخصي قائمة جهات اتصال',
  noAgendaSubtitle: '{{lista}} هو مكان اتصالاتك بالأشخاص الآخرين. انتقل إلى ملفك الحقيقي أو ملف Weë الخاص بك لرؤيتها.',
  wantsToConnect: '{{lista}} · يريد التواصل معك',
  accept: 'قبول {{nombre}}',
  reject: 'رفض {{nombre}}',
  withdraw: 'سحب الطلب المرسل إلى {{nombre}}',
  removeFrom: 'إزالة {{nombre}} من {{lista}} الخاصة بك',
  openProfile: 'فتح {{etiqueta}} الخاص بـ {{nombre}}',
  rejectTitle: 'رفض الطلب',
  rejectConfirm: 'هل تريد رفض طلب {{nombre}}؟',
  withdrawTitle: 'سحب الطلب',
  withdrawConfirm: 'هل تريد سحب طلبك المرسل إلى {{nombre}}؟',
  removeTitle: 'إزالة {{lista}}',
  removeConfirm: 'هل تريد إزالة {{nombre}} من {{lista}} الخاصة بك؟',
  failed: 'تعذّر إتمام العملية',
  count_one: '{{lista}} واحد',
  count_two: 'اثنان من {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'هذا الشخص',
  acceptLabel: 'قبول {{lista}}',
  rejectRequestLabel: 'رفض طلب {{lista}}',
  requestSent: 'تم إرسال الطلب',
  errSignIn: 'سجّل الدخول لاستخدام ËContact.',
  errNotYours: 'هذا الملف الشخصي ليس لك.',
  errNotAPerson: 'لا يمكن لهذا الملف الشخصي استخدام ËContact.',
  errSameProfile: 'لا يمكن لملف شخصي أن يتصل بنفسه.',
  errOffline: 'تعذّر الاتصال بـ Weë.',
  errNoRequestToReject: 'لا يوجد طلب موجّه إليك لرفضه.',
  errNoPendingRequest: 'ليس لديك أي طلب معلّق مع هذا الملف الشخصي.',
  errNotConnected: 'لا يوجد اتصال بينك وبين هذا الملف الشخصي.',
  errNoActiveProfile: 'لا يوجد ملف شخصي نشط للقيام بذلك.',
};
