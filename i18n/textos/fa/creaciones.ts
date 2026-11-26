/*
 * PERSA — Mis creaciones: la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace. Tipado contra el español: si allí
 * hay una clave que aquí falta, no compila.
 *
 * «Mis creaciones» es «آثار من» y «creación», «اثر» (glosario § 4); «3D» se
 * queda en latino como en el español. El nombre de la experiencia y el de la
 * creación entran por hueco y no se tocan. `_one` = `_other`.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'آثار من',
  intro: 'هر آنچه با Weë AI ساخته‌اید، در یک جا. متعلق به حساب شماست: از پروفایل واقعی و از پروفایل Weë یکسان می‌بینیدش.',

  /* Filtros por tipo. */
  filterAll: 'همه',
  filterImages: 'تصاویر',
  filterVideos: 'ویدیوها',
  filterAudio: 'صدا',
  filterDocuments: 'اسناد',
  filterModel3d: 'سه‌بعدی',
  filterLabel: 'فیلتر بر اساس نوع',

  /* Orden. */
  sortRecent: 'جدیدترین',
  sortOldest: 'قدیمی‌ترین',
  sortLabel: 'مرتب‌سازی',

  /* Estados de la lista. */
  loading: 'در حال بارگذاری آثار شما…',
  loadFailed: 'نتوانستیم آثار شما را بارگذاری کنیم.',
  retry: 'تلاش دوباره',
  loadMore: 'بارگذاری بیشتر',
  emptyTitle: 'هنوز اثری ندارید',
  emptyText: 'هر آنچه با Weë AI بسازید اینجا نمایش داده می‌شود، همراه با تصویر، ویدیو یا صدایش.',
  emptyAction: 'ساختن چیزی با Weë AI',
  emptyFiltered: 'اثری از این نوع وجود ندارد.',
  count_one: '{{contador}} اثر',
  count_other: '{{contador}} اثر',

  /* Estados de una creación. */
  statusUploading: 'در حال بارگذاری',
  statusProcessing: 'در حال پردازش',
  statusReady: 'آماده',
  statusFailed: 'موفق نبود',
  statusDeleted: 'حذف‌شده',
  pendingDeletion: 'فایل به‌زودی برداشته می‌شود.',

  /* Tipos, para la tarjeta. */
  kindImage: 'تصویر',
  kindVideo: 'ویدیو',
  kindAudio: 'صدا',
  kindDocument: 'سند',
  kindModel3d: 'سه‌بعدی',
  kindText: 'متن',

  /* Acciones sobre una creación. */
  open: 'باز کردن',
  openCreation: 'باز کردن اثر: {{nombre}}',
  download: 'دانلود',
  downloaded: 'در گالری شما ذخیره شد.',
  downloadFailed: 'نتوانستیم دانلودش کنیم. دوباره تلاش کنید.',
  downloadPermission: 'Weë برای ذخیره در گالری شما به اجازه نیاز دارد.',
  savedInCreations: 'در آثار شما ذخیره شد',
  save: 'ذخیره',
  saved: 'ذخیره شد',
  useInProject: 'استفاده در پروژه',
  publish: 'انتشار',
  share: 'اشتراک‌گذاری',
  delete: 'حذف',
  deleteConfirm: 'این اثر حذف شود؟ فایل پاک می‌شود. آنچه قبلاً منتشر کرده‌اید تغییری نمی‌کند.',
  deleteConfirmWeb: 'این اثر حذف شود؟ فایل پاک می‌شود. آنچه قبلاً منتشر کرده‌اید تغییری نمی‌کند.',
  deleted: 'اثر حذف شد.',
  deleteFailed: 'نتوانستیم حذفش کنیم. دوباره تلاش کنید.',
  createdWith: 'ساخته‌شده با {{nombre}}',
  createdOn: 'ساخته‌شده در {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} در حال کار است',
  progressStarting: 'در حال شروع…',
  progressSteps: '{{hechos}} از {{total}} مرحله انجام شد',
  progressFindLater: 'می‌توانید از این صفحه خارج شوید؛ وقتی آماده شد آن را در «آثار من» پیدا می‌کنید.',

  /* Mundos 3D: su tipo, el visor que aún no existe y lo que su licencia deja hacer. */
  filterWorlds: 'دنیاهای سه‌بعدی',
  kindWorld: 'دنیای سه‌بعدی',
  noViewer3d: 'Weë هنوز نمایشگر سه‌بعدی ندارد. فایل را دانلود کنید تا در یک برنامه سه‌بعدی باز شود.',
  rightsTitle: 'با آن چه می‌توانید بکنید',
  rightsProvenance: 'ساخته‌شده با هوش مصنوعی در Weë، با مدلی از شخص ثالث که مجوز خودش را دارد.',
  rightsCommercialAllowed: 'می‌توانید از آن برای اهداف تجاری استفاده کنید.',
  rightsCommercialRestricted: 'استفاده تجاری از آن شرایطی دارد.',
  rightsCommercialUnclear: 'هنوز مشخص نیست که بتوان از آن برای اهداف تجاری استفاده کرد.',
  rightsCommercialNotAllowed: 'نمی‌توان از آن برای اهداف تجاری استفاده کرد.',
  rightsAttribution: 'مجوز آن ذکر منبع را لازم می‌داند.',
  rightsBlockedIn: 'در این مکان‌ها قابل استفاده یا نمایش نیست: {{lugares}}.',
};
