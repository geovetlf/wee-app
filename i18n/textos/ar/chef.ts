/*
 * ÁRABE — Weë Chef: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ajustes y los botones van como sustantivos de acción («طهي», «إملاء»)
 * o como frases cortas en primera persona cuando el español también lo hace
 * («لي وحدي», «بما لديّ»). Lo que Chef comparte con Weë Studio vive en
 * `studio`, como en español.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'وصفات وقوائم طعام ومكونات.\nبما لديك في المنزل.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'اكتب فكرتك أو مكوناتك أو استخدم صورة',
  addLabel: 'إضافة صورة',
  cameraLabel: 'التقاط صورة',
  galleryLabel: 'اختيار صورة من المعرض',
  photoReady: 'تمت إضافة الصورة',
  settingsLabel: 'إعدادات الوصفة',
  voiceLabel: 'إملاء',
  sendLabel: 'طهي',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'ماذا تريد أن تفعل؟',
  nutritionTitle: 'المعلومات الغذائية',
  nutritionSubtitle: 'السعرات الحرارية والمغذيات الكبرى ومسببات الحساسية',
  swapTitle: 'استبدال المكونات',
  swapSubtitle: 'بدّل ما لا تملكه أو لا يناسبك',
  shoppingTitle: 'قائمة التسوق',
  shoppingSubtitle: 'ما يلزم شراؤه',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'اختر من أين تبدأ وأكمل الجملة بكلماتك.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'السعرات الحرارية',
  nuProtein: 'البروتينات',
  nuFat: 'الدهون',
  nuCarbs: 'الكربوهيدرات',
  nuSugar: 'السكر',
  nuSodium: 'الصوديوم',
  nuAllergens: 'مسببات الحساسية',
  nuPortion: 'لكل حصة',
  nuAll: 'الكل',

  /* Sustituir ingredientes */
  swMissing: 'ينقصني مكوّن',
  swLactose: 'بدون لاكتوز',
  swGluten: 'بدون غلوتين',
  swEgg: 'بدون بيض',
  swNuts: 'بدون مكسرات',
  swVegetarian: 'نباتي',
  swVegan: 'نباتي صرف',
  swSugar: 'بدون سكر',
  swCheaper: 'أرخص',
  swPantry: 'بما لديّ',

  /* Lista de compras */
  shRecipe: 'من وصفة',
  shMenu: 'من قائمة طعام',
  shWeek: 'للأسبوع',
  shOccasion: 'لمناسبة',
  shPantry: 'أساسيات المؤن',
  shAisles: 'مرتبة حسب الممرات',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'ما يلزم معرفته لطهيه',
  optPeople: 'الأشخاص',
  optTime: 'الوقت',
  optDiet: 'النظام الغذائي',
  optLevel: 'الصعوبة',
  valAnyone: 'أي عدد',
  valOne: 'لي وحدي',
  valTwo: 'لشخصين',
  valFamily: 'للعائلة',
  valMany: 'لعدد كبير',
  valAnyTime: 'ما يلزم من وقت',
  valQuick: '15 دقيقة',
  valHalfHour: 'نصف ساعة',
  valLong: 'ساعة أو أكثر',
  valNoDiet: 'بدون قيود',
  valVegetarian: 'نباتي',
  valVegan: 'نباتي صرف',
  valGlutenFree: 'بدون غلوتين',
  valLactoseFree: 'بدون لاكتوز',
  valSugarFree: 'بدون سكر',
  valAnyLevel: 'أي مستوى',
  valEasy: 'سهل',
  valMedium: 'متوسط',
  valPro: 'مستوى الشيف',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'مشاريعي',
  seeAll: 'عرض الكل',
  projectsEmpty: 'لم تطبخ شيئًا مع Weë بعد.',
  projectsEmptyHint: 'ما تصنعه هنا يُحفظ وتجده مجددًا في هذا الصف.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'أخبرني بما تريد أن تطبخه…',
  heroLead: 'طاهيك بالذكاء الاصطناعي،',
  heroAccent: 'معك دائمًا',
  chipRecipes: 'وصفات',
  chipMenus: 'قوائم طعام',
  chipHealthy: 'صحية',
  chipQuick: 'سريعة',
};
