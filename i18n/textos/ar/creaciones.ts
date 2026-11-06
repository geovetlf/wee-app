/*
 * ÁRABE — Mis creaciones: la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace. Tipado contra el español.
 *
 * «Creación» = إبداع (glosario), con sus seis plurales en `count_*`. Los
 * nombres de las experiencias llegan por `{{nombre}}` sin traducirse. «3D» se
 * queda tal cual donde el español y el inglés lo dejan; en prosa se dice
 * «ثلاثي الأبعاد».
 */
import { ConPlurales } from './plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'إبداعاتي',
  intro: 'كل ما أنشأته باستخدام Weë AI في مكان واحد. وهو تابع لحسابك: تراه نفسه من الملف الحقيقي ومن ملف Weë.',

  /* Filtros por tipo. */
  filterAll: 'الكل',
  filterImages: 'الصور',
  filterVideos: 'الفيديوهات',
  filterAudio: 'الصوت',
  filterDocuments: 'المستندات',
  filterModel3d: '3D',
  filterLabel: 'التصفية حسب النوع',

  /* Orden. */
  sortRecent: 'الأحدث',
  sortOldest: 'الأقدم',
  sortLabel: 'ترتيب',

  /* Estados de la lista. */
  loading: 'جارٍ تحميل إبداعاتك…',
  loadFailed: 'تعذّر تحميل إبداعاتك.',
  retry: 'إعادة المحاولة',
  loadMore: 'تحميل المزيد',
  emptyTitle: 'لا إبداعات لديك بعد',
  emptyText: 'كل ما تصنعه باستخدام Weë AI سيظهر هنا، بصورته أو فيديوه أو صوته.',
  emptyAction: 'إنشاء شيء باستخدام Weë AI',
  emptyFiltered: 'لا توجد إبداعات من هذا النوع.',
  count_zero: 'لا إبداعات',
  count_one: 'إبداع واحد',
  count_two: 'إبداعان',
  count_few: '{{contador}} إبداعات',
  count_many: '{{contador}} إبداعًا',
  count_other: '{{contador}} إبداع',

  /* Estados de una creación. */
  statusUploading: 'جارٍ الرفع',
  statusProcessing: 'جارٍ المعالجة',
  statusReady: 'جاهز',
  statusFailed: 'لم ينجح',
  statusDeleted: 'محذوف',
  pendingDeletion: 'سيُزال الملف قريبًا.',

  /* Tipos, para la tarjeta. */
  kindImage: 'صورة',
  kindVideo: 'فيديو',
  kindAudio: 'صوت',
  kindDocument: 'مستند',
  kindModel3d: '3D',
  kindText: 'نص',

  /* Acciones sobre una creación. */
  open: 'فتح',
  openCreation: 'فتح الإبداع: {{nombre}}',
  download: 'تنزيل',
  downloaded: 'تم الحفظ في معرض الصور لديك.',
  downloadFailed: 'تعذّر تنزيله. يُرجى المحاولة مرة أخرى.',
  downloadPermission: 'يحتاج Weë إلى إذن للحفظ في معرض الصور لديك.',
  savedInCreations: 'تم الحفظ في إبداعاتك',
  save: 'حفظ',
  saved: 'تم الحفظ',
  useInProject: 'استخدام في مشروع',
  publish: 'نشر',
  share: 'مشاركة',
  delete: 'حذف',
  deleteConfirm: 'هل تريد حذف هذا الإبداع؟ سيُحذف الملف. ما نشرته سابقًا لن يتغيّر.',
  deleteConfirmWeb: 'هل تريد حذف هذا الإبداع؟ سيُحذف الملف. ما نشرته سابقًا لن يتغيّر.',
  deleted: 'تم حذف الإبداع.',
  deleteFailed: 'تعذّر حذفه. يُرجى المحاولة مرة أخرى.',
  createdWith: 'أُنشئ باستخدام {{nombre}}',
  createdOn: 'أُنشئ في {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} يعمل الآن',
  progressStarting: 'جارٍ البدء…',
  progressSteps: 'اكتمل {{hechos}} من أصل {{total}} خطوة',
  progressFindLater: 'يمكنك مغادرة هذه الشاشة؛ ستجده في «إبداعاتي» عندما يصبح جاهزًا.',

  /* Mundos 3D. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: 'عوالم ثلاثية الأبعاد',
  kindWorld: 'عالم ثلاثي الأبعاد',
  noViewer3d: 'لا يملك Weë عارضًا ثلاثي الأبعاد بعد. نزّله لفتحه في تطبيق ثلاثي الأبعاد.',
  rightsTitle: 'ما يمكنك فعله به',
  rightsProvenance: 'صُنع بالذكاء الاصطناعي في Weë، بنموذج من طرف ثالث له ترخيصه الخاص.',
  rightsCommercialAllowed: 'يمكنك استخدامه لأغراض تجارية.',
  rightsCommercialRestricted: 'استخدامه التجاري مقيّد بشروط.',
  rightsCommercialUnclear: 'لم يتضح بعد ما إذا كان يمكن استخدامه لأغراض تجارية.',
  rightsCommercialNotAllowed: 'لا يمكن استخدامه لأغراض تجارية.',
  rightsAttribution: 'يتطلب ترخيصه ذكر المصدر.',
  rightsBlockedIn: 'لا يمكن استخدامه أو عرضه في: {{lugares}}.',
};
