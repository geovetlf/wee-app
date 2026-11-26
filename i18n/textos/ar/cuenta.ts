/*
 * ÁRABE — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = حذف, la misma palabra que el botón «Eliminar» (common.delete): corta y fácil de teclear; el árabe no tiene mayúsculas.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from './plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'حذف الحساب',
  sectionDanger: 'منطقة الخطر',
  title: 'حذف الحساب',
  goesFaces: 'كل ملفاتك الشخصية: الملف الحقيقي وشخصياتك البديلة',
  goesCharacter: 'شخصيتك وصورتها الرمزية',
  goesPosts: 'منشوراتك وتعليقاتك وتفاعلاتك',
  goesMessages: 'رسائلك في WeeTalk: تُفرَّغ، وتبقى محادثة الشخص الآخر من دونها',
  goesCreations: 'إبداعاتك ومشاريعك ومحادثاتك في Weë AI',
  goesContacts: 'جهات اتصالك ومجتمعاتك ومحفوظاتك',
  goesCredits: 'ما تبقّى لديك من Credits: يضيع ولا يُسترد',
  whatStaysTitle: 'ما الذي يُحتفَظ به',
  staysRecords: 'سجلات Credits والمدفوعات المحاسبية. تُحفظ دون اسمك أو بيانات ملفك، لأنها محاسبة Weë.',
  confirmLabel: 'للتأكيد، اكتب «{{palabra}}»',
  confirmWord: 'حذف',
  confirmPlaceholder: 'اكتب الكلمة هنا',
  dialogTitle: 'هل تريد حذف حسابك؟',
  dialogConfirm: 'حذف',
  doneTitle: 'تم حذف حسابك',
  doneBody: 'شكرًا لأنك كنت جزءًا من Weë.',
  reauthTitle: 'سجّل الدخول من جديد',
  reauthBody: 'لأمانك، يجب أن تكون قد سجّلت الدخول مؤخرًا لحذف الحساب. سجّل الخروج، ثم سجّل الدخول مجددًا وكرّر هذه الخطوات.',
  reauthButton: 'تسجيل الخروج للدخول من جديد',
  errorTitle: 'تعذّر الإكمال',
  errorBody: 'حدث خطأ في منتصف الطريق. حاول مرة أخرى: سيُستأنف من حيث توقف.',
  retry: 'إعادة المحاولة',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'يُعطَّل الحساب، وبعد 30 يومًا يُحذف كل شيء',
  introDesactivar: 'سيُعطَّل حسابك الآن، وإن لم تعد خلال 30 يومًا فسيُحذف كل شيء نهائيًا.',
  nowTitle: 'ماذا يحدث الآن',
  nowHidden: 'يتوقف ظهور حسابك: لن يرى أحد ملفاتك ولا منشوراتك',
  nowCharacterOff: 'تتوقف استقلالية شخصيتك ولا تُحتسب عليها أي تكلفة بعد ذلك',
  nowComeBack_zero: 'أمامك أقل من يوم للعودة: سجّل الدخول من جديد واختر «تفعيل الحساب»',
  nowComeBack_one: 'أمامك يوم واحد للعودة: سجّل الدخول من جديد واختر «تفعيل الحساب»',
  nowComeBack_two: 'أمامك يومان للعودة: سجّل الدخول من جديد واختر «تفعيل الحساب»',
  nowComeBack_few: 'أمامك {{contador}} أيام للعودة: سجّل الدخول من جديد واختر «تفعيل الحساب»',
  nowComeBack_many: 'أمامك {{contador}} يومًا للعودة: سجّل الدخول من جديد واختر «تفعيل الحساب»',
  nowComeBack_other: 'أمامك {{contador}} يوم للعودة: سجّل الدخول من جديد واختر «تفعيل الحساب»',
  whatGoesLaterTitle: 'ما الذي سيُحذف إن لم تعد',
  deactivateButton: 'حذف حسابي',
  dialogBodyDesactivar: 'سيتوقف ظهور حسابك. وإن لم تعد خلال 30 يومًا، فسيُحذف كل شيء ولن تتمكن من استعادته.',
  deactivating: 'جارٍ تعطيل حسابك…',
  deactivatedTitle: 'حسابك معطَّل',
  deactivatedBody: 'أمامك حتى {{fecha}} للعودة. بعد ذلك سيُحذف كل شيء نهائيًا.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'حسابك معطَّل',
  activarBody: 'طلبت حذف حسابك. ما دام معطَّلًا، لا يرى أحد ملفاتك ولا منشوراتك.',
  activarDaysLeft_zero: 'أقل من يوم على الحذف النهائي',
  activarDaysLeft_one: 'بقي يوم واحد على الحذف النهائي',
  activarDaysLeft_two: 'بقي يومان على الحذف النهائي',
  activarDaysLeft_few: 'بقيت {{contador}} أيام على الحذف النهائي',
  activarDaysLeft_many: 'بقي {{contador}} يومًا على الحذف النهائي',
  activarDaysLeft_other: 'بقي {{contador}} يوم على الحذف النهائي',
  activarDate: 'إن لم تفعّله، فسيُحذف نهائيًا في {{fecha}}.',
  activarCharacterNote: 'ستبقى استقلالية شخصيتك متوقفة؛ ويمكنك جدولتها من جديد متى شئت.',
  activarButton: 'تفعيل الحساب',
  activating: 'جارٍ تفعيل حسابك…',
  activatedTitle: 'عاد حسابك نشطًا',
  activarExpiredTitle: 'انتهت مهلة العودة',
  activarExpiredBody: 'سيُحذف حسابك بالكامل خلال الساعات القادمة.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'ما تبقّى لديك من Credits ({{creditos}}): يضيع ولا يُسترد',
};
