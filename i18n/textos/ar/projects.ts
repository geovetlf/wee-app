/*
 * ÁRABE — Mis proyectos: la lista y el detalle. Tipado contra el español.
 *
 * El nombre de un proyecto lo escribe la persona y entra por `{{nombre}}`.
 * «creación» = «إبداع» (plural «إبداعات»), como en Mis creaciones; `creations`
 * cuenta y tiene las seis formas: por eso `ConPlurales`.
 */
import { ConPlurales } from './plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'إبداعاتك، مرتبة حسب المشروع',
  introText: 'يمكن أن يضم المشروع شعارًا وصورًا وإعلانات ومقاطع فيديو وموسيقى ومستندات. احفظ كل نتيجة في مشروعها من «{{accion}}».',
  sectionTitle: 'المشاريع',
  emojiLabel: 'الرمز التعبيري {{emoji}}',
  namePlaceholder: 'مثال: مطعمي',
  emptyTitle: 'ليس لديك مشاريع بعد',
  emptyText: 'أنشئ المشروع الأول أو احفظ إبداعًا في مشروع من صفحة نتيجته.',
  emptyAction: 'إنشاء مشروعي الأول',
  open: 'فتح',
  fallbackTitle: 'مشروع',
  notFound: 'لم نعثر على هذا المشروع.',
  saveName: 'حفظ الاسم',
  rename: 'تغيير الاسم',
  deleteProject: 'حذف المشروع',
  deleteConfirmWeb: 'هل تريد حذف المشروع «{{nombre}}»؟ لن تُحذف إبداعاتك.',
  deleteConfirm: 'هل تريد حذف «{{nombre}}»؟ لن تُحذف إبداعاتك.',
  creations_zero: 'لا إبداعات',
  creations_one: 'إبداع واحد',
  creations_two: 'إبداعان',
  creations_few: '{{contador}} إبداعات',
  creations_many: '{{contador}} إبداعًا',
  creations_other: '{{contador}} إبداع',
  creationsTitle: 'الإبداعات',
  add: 'إضافة',
  noCreations: 'لا توجد إبداعات هنا بعد. أنشئ شيئًا مع أي متخصص واحفظه في هذا المشروع.',
  whatIsMissing: 'ما الذي ينقص هذا المشروع؟',
  whatIsMissingNote: 'شعار أو صور أو إعلان أو فيديو أو موسيقى أو مستند: يمكن لأي متخصص في Weë أن يضيف هنا.',
  createSomethingNew: 'إنشاء شيء جديد',
};
