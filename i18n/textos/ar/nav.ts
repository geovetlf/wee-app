/*
 * ÁRABE — los cinco destinos de la barra inferior. Tipado contra el español.
 *
 * «Inicio» = «الرئيسية» (glosario), igual que el «Home» del menú ☰.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'الرئيسية',
  search: 'بحث',
  create: 'إنشاء',
  talk: 'WeeTalk',
  notifications: 'الإشعارات',
  current: 'القسم الحالي',
  goTo: 'الانتقال إلى {{nombre}}',
  weeNavigation: 'تنقّل Weë',
  goHome: 'الانتقال إلى الرئيسية',
  myProfile: 'الانتقال إلى ملفي الشخصي',
  openWeeAi: 'فتح Weë AI',
  goToWeeAi: 'الانتقال إلى Weë AI',
  weeAiQuestion: 'ماذا تريد أن تنشئ اليوم؟',
  weeAiPitch: 'أخبر Weë بما تريد، ويتولى Weë أمر الذكاء الاصطناعي.',
  brandSlogan: 'تخيّل · أبدع · تواصل',
  documentTitle: 'Weë - {{eslogan}}',
  /* Rediseño del 2026-11-15: los destinos nuevos de la barra. WeëAI es marca. Sin revisión nativa. */
  weeAi: 'WeëAI',
  messages: 'الرسائل',
  myWee: 'Weë الخاص بي',
};
