/*
 * PERSA — WEË CHEF: el sitio donde se cocina. Tipado contra el español: si
 * allí hay una clave que aquí falta, no compila.
 *
 * «Weë Chef» es marca y no aparece aquí. Lo que comparte con Weë Studio
 * («Ajustes», «Listo») vive en `studio`. «Receta» es «دستور پخت» y «cocinar»
 * como botón, «پختن». «15 دقیقه» va en dígitos latinos: los persas los pone
 * Intl. «De chef» se lee como nivel: «در حد سرآشپز».
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'دستور پخت، منو و مواد اولیه.\nبا آنچه در خانه دارید.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'ایده یا مواد اولیه‌تان را بنویسید یا از یک عکس استفاده کنید',
  addLabel: 'افزودن عکس',
  cameraLabel: 'گرفتن عکس',
  galleryLabel: 'انتخاب عکس از گالری',
  photoReady: 'عکس اضافه شد',
  settingsLabel: 'تنظیمات دستور پخت',
  voiceLabel: 'دیکته',
  sendLabel: 'پختن',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'می‌خواهید چه کار کنید؟',
  nutritionTitle: 'اطلاعات تغذیه‌ای',
  nutritionSubtitle: 'کالری، درشت‌مغذی‌ها و آلرژن‌ها',
  swapTitle: 'جایگزینی مواد اولیه',
  swapSubtitle: 'آنچه را ندارید یا نمی‌توانید بخورید عوض کنید',
  shoppingTitle: 'لیست خرید',
  shoppingSubtitle: 'آنچه باید خرید',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'انتخاب کنید از کجا شروع شود و جمله را با کلمات خودتان تمام کنید.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'کالری',
  nuProtein: 'پروتئین',
  nuFat: 'چربی',
  nuCarbs: 'کربوهیدرات',
  nuSugar: 'قند',
  nuSodium: 'سدیم',
  nuAllergens: 'آلرژن‌ها',
  nuPortion: 'در هر وعده',
  nuAll: 'همه',

  /* Sustituir ingredientes */
  swMissing: 'یک ماده را ندارم',
  swLactose: 'بدون لاکتوز',
  swGluten: 'بدون گلوتن',
  swEgg: 'بدون تخم‌مرغ',
  swNuts: 'بدون آجیل',
  swVegetarian: 'گیاهخواری',
  swVegan: 'وگان',
  swSugar: 'بدون شکر',
  swCheaper: 'ارزان‌تر',
  swPantry: 'با آنچه دارم',

  /* Lista de compras */
  shRecipe: 'از یک دستور پخت',
  shMenu: 'از یک منو',
  shWeek: 'برای هفته',
  shOccasion: 'برای یک مناسبت',
  shPantry: 'اقلام پایه آشپزخانه',
  shAisles: 'مرتب‌شده بر اساس راهرو',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'آنچه برای پختنش باید بدانیم',
  optPeople: 'نفرات',
  optTime: 'زمان',
  optDiet: 'رژیم',
  optLevel: 'سختی',
  valAnyone: 'هر تعداد',
  valOne: 'برای خودم',
  valTwo: 'برای دو نفر',
  valFamily: 'برای خانواده',
  valMany: 'برای جمع',
  valAnyTime: 'هر چقدر لازم باشد',
  valQuick: '15 دقیقه',
  valHalfHour: 'نیم ساعت',
  valLong: 'یک ساعت یا بیشتر',
  valNoDiet: 'بدون محدودیت',
  valVegetarian: 'گیاهخواری',
  valVegan: 'وگان',
  valGlutenFree: 'بدون گلوتن',
  valLactoseFree: 'بدون لاکتوز',
  valSugarFree: 'بدون شکر',
  valAnyLevel: 'هر سطحی',
  valEasy: 'آسان',
  valMedium: 'متوسط',
  valPro: 'در حد سرآشپز',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'پروژه‌های من',
  seeAll: 'مشاهده همه',
  projectsEmpty: 'هنوز چیزی با Weë نپخته‌اید.',
  projectsEmptyHint: 'آنچه اینجا می‌سازید ذخیره می‌شود و دوباره در همین ردیف پیدایش می‌کنید.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'بگویید چه می‌خواهید بپزید…',
  heroLead: 'سرآشپز هوش مصنوعی شما،',
  heroAccent: 'همیشه همراهتان',
  chipRecipes: 'دستور غذا',
  chipMenus: 'منوها',
  chipHealthy: 'سالم',
  chipQuick: 'سریع',
};
