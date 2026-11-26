/*
 * PERSA — La pantalla del perfil propio, entera. Tipado contra el español: si
 * allí hay una clave que aquí falta, no compila.
 *
 * El nombre, el usuario, la biografía y el enlace los escribe la persona y
 * entran por hueco; ËContacts/ẄContacts también. «Me gusta» sigue el
 * glosario (§ 4): «پسند»/«پسندیدن». «Repost» es «بازنشر» y la pestaña
 * «Media», «رسانه». «URL» se queda en latino como identificador técnico.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'افزودن کاور',
  permissionsTitle: 'مجوزها',
  galleryPermission: 'برای دسترسی به گالری، مجوز لازم است',
  coverUploadFailed: 'تصویر کاور بارگذاری نشد',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'در حال بارگذاری پروفایل...',
  loadFailed: 'خطا در بارگذاری پروفایل',
  loadFailedDetail: 'اطلاعات کاربر بارگذاری نشد',
  backToLogin: 'بازگشت به ورود',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'نام نمی‌تواند خالی باشد',
  updateFailed: 'پروفایل به‌روزرسانی نشد',
  signOutFailed: 'خروج انجام نشد',
  noSession: 'نشست فعالی وجود ندارد',
  avatarUpdateFailed: 'آواتار به‌روزرسانی نشد. دوباره تلاش کنید.',
  imageUrlMissing: 'URL تصویر دریافت نشد',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'پروفایل {{nombre}} را در Weë ببینید',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'ویرایش پروفایل',
  displayNameLabel: 'نام نمایشی',
  displayNamePlaceholder: 'نام نمایشی شما',
  bioLabel: 'بیوگرافی',
  bioPlaceholder: 'درباره خودتان بنویسید...',
  websiteLabel: 'وب‌سایت',
  websitePlaceholder: 'https://example.com',
  charCount: '{{usados}}/{{maximo}} نویسه',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'ویرایش پروفایل',
  createWeeProfile: 'ایجاد پروفایل Weë',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'پست‌ها',
  viewMyEcontacts: 'مشاهده {{nombre}} من، {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'رسانه',
  tabReposts: 'بازنشرها',
  tabLikes: 'پسندها',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'در حال بارگذاری پست‌ها...',
  postsFailed: 'خطا در بارگذاری پست‌ها',
  retry: 'تلاش دوباره',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'هنوز پستی ندارید',
  emptyPostsHint: 'اولین پستتان را به اشتراک بگذارید!',
  emptyMedia: 'پستی با عکس یا ویدیو ندارید',
  emptyMediaHint: 'پستی با عکس یا ویدیو بسازید',
  emptyReposts: 'چیزی بازنشر نکرده‌اید',
  emptyRepostsHint: 'محتوای کاربران دیگر را به اشتراک بگذارید',
  emptyLikes: 'پستی را نپسندیده‌اید',
  emptyLikesHint: 'پست‌هایی را که برایتان جالب است بپسندید',
  otherTitle: 'پروفایل',
  otherLoadFailed: 'پروفایل بارگذاری نشد',
  seeFullProfile: 'مشاهده پروفایل کامل من',
  emptyCategory: 'پستی در این دسته نیست',
  actionFailed: 'انجام نشد',
  userNotFound: 'این کاربر وجود ندارد',
  shareOtherMessage: 'پروفایل @{{nombre}} را در Weë ببینید!\n\n{{bio}}',
  shareOtherNoBio: 'کاربر Weë',
  joinedOn: 'عضو از {{fecha}}',
  tabPolls: 'نظرسنجی‌ها',
};
