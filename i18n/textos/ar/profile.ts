/*
 * ÁRABE — la pantalla del perfil propio, entera. Tipado contra el español.
 *
 * Las pestañas «Media», «Reposts» y «Likes», que el español deja en inglés,
 * aquí se traducen: en una interfaz árabe se escriben en árabe (Instagram,
 * X). ËContacts/ẄContacts entran por `{{nombre}}` sin tocar. La dirección
 * de EJEMPLO del sitio web se lee, no se visita: se adapta.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'إضافة صورة غلاف',
  permissionsTitle: 'الأذونات',
  galleryPermission: 'يلزم الحصول على أذونات للوصول إلى معرض الصور',
  coverUploadFailed: 'تعذّر رفع صورة الغلاف',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'جارٍ تحميل الملف الشخصي...',
  loadFailed: 'تعذّر تحميل الملف الشخصي',
  loadFailedDetail: 'تعذّر تحميل معلومات المستخدم',
  backToLogin: 'العودة إلى تسجيل الدخول',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'لا يمكن ترك الاسم فارغًا',
  updateFailed: 'تعذّر تحديث الملف الشخصي',
  signOutFailed: 'تعذّر تسجيل الخروج',
  noSession: 'لا توجد جلسة نشطة',
  avatarUpdateFailed: 'تعذّر تحديث الصورة الرمزية. يُرجى المحاولة مرة أخرى.',
  imageUrlMissing: 'لم يتم استلام رابط الصورة',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'ألقِ نظرة على ملف {{nombre}} على Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'تعديل الملف الشخصي',
  displayNameLabel: 'اسم المستخدم',
  displayNamePlaceholder: 'اسم المستخدم الخاص بك',
  bioLabel: 'النبذة',
  bioPlaceholder: 'أخبرنا عنك...',
  websiteLabel: 'الموقع الإلكتروني',
  websitePlaceholder: 'https://your-site.com',
  charCount: '{{usados}}/{{maximo}} حرفًا',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'تعديل الملف الشخصي',
  createWeeProfile: 'إنشاء ملف Weë',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'المنشورات',
  viewMyEcontacts: 'عرض {{nombre}} الخاصة بي، {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'الوسائط',
  tabReposts: 'إعادات النشر',
  tabLikes: 'الإعجابات',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'جارٍ تحميل المنشورات...',
  postsFailed: 'تعذّر تحميل المنشورات',
  retry: 'إعادة المحاولة',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'لا منشورات لديك بعد',
  emptyPostsHint: 'شارك أول منشور لك!',
  emptyMedia: 'لا توجد لديك منشورات تحتوي على وسائط',
  emptyMediaHint: 'أنشئ منشورًا بصور أو فيديوهات',
  emptyReposts: 'لم تُعِد نشر أي شيء',
  emptyRepostsHint: 'شارك محتوى من مستخدمين آخرين',
  emptyLikes: 'لا توجد منشورات أعجبتك',
  emptyLikesHint: 'أبدِ إعجابك بالمنشورات التي تهمك',
  otherTitle: 'الملف الشخصي',
  otherLoadFailed: 'تعذّر تحميل الملف الشخصي',
  seeFullProfile: 'عرض ملفي الشخصي الكامل',
  emptyCategory: 'لا منشورات في هذه الفئة',
  actionFailed: 'تعذّر الإكمال',
  userNotFound: 'المستخدم غير موجود',
  shareOtherMessage: 'ألقِ نظرة على ملف @{{nombre}} على Weë!\n\n{{bio}}',
  shareOtherNoBio: 'مستخدم على Weë',
  joinedOn: 'تاريخ الانضمام: {{fecha}}',
  tabPolls: 'الاستطلاعات',
};
