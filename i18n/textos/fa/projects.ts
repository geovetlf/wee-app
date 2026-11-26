/*
 * PERSA — Mis proyectos: la lista y el detalle de un proyecto. El nombre de un
 * proyecto lo escribe la persona y entra por {{nombre}}, nunca pegando
 * cadenas. Tipado contra el español.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'آثار شما، مرتب‌شده بر اساس پروژه',
  introText: 'یک پروژه می‌تواند لوگو، عکس، آگهی، ویدیو، موسیقی و سند داشته باشد. هر نتیجه را از «{{accion}}» در پروژه خودش ذخیره کنید.',
  sectionTitle: 'پروژه‌ها',
  emojiLabel: 'ایموجی {{emoji}}',
  namePlaceholder: 'مثال: رستوران من',
  emptyTitle: 'هنوز پروژه‌ای ندارید',
  emptyText: 'اولین پروژه را بسازید یا یک اثر را از صفحه نتیجه‌اش در پروژه‌ای ذخیره کنید.',
  emptyAction: 'ساخت اولین پروژه من',
  open: 'باز کردن',
  fallbackTitle: 'پروژه',
  notFound: 'این پروژه را پیدا نکردیم.',
  saveName: 'ذخیره نام',
  rename: 'تغییر نام',
  deleteProject: 'حذف پروژه',
  deleteConfirmWeb: 'پروژه «{{nombre}}» حذف شود؟ آثار شما پاک نمی‌شوند.',
  deleteConfirm: '«{{nombre}}» حذف شود؟ آثار شما پاک نمی‌شوند.',
  creations_one: '{{contador}} اثر',
  creations_other: '{{contador}} اثر',
  creationsTitle: 'آثار',
  add: 'افزودن',
  noCreations: 'هنوز اثری اینجا نیست. با هر متخصصی چیزی بسازید و آن را در این پروژه ذخیره کنید.',
  whatIsMissing: 'این پروژه چه کم دارد؟',
  whatIsMissingNote: 'یک لوگو، عکس، آگهی، ویدیو، موسیقی یا سند: هر متخصص Weë می‌تواند اینجا چیزی اضافه کند.',
  createSomethingNew: 'ساختن چیزی تازه',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} پروژه',
  count_other: '{{contador}} پروژه',
  updatedOn: 'به‌روزرسانی در {{fecha}}',
  searchPlaceholder: 'جست‌وجوی پروژه‌ها',
  sortUpdated: 'تازه به‌روزشده',
  sortName: 'نام (الف–ی)',
  noMatches: 'هیچ پروژه‌ای با جست‌وجوی شما مطابقت ندارد.',
  emptySpaceTitle: 'فضای خلاقانه شما از اینجا شروع می‌شود',
  moreActions: 'کارهای بیشتر',
};
