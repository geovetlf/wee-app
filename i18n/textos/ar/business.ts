/*
 * ÁRABE — Weë Business: la pantalla del negocio y las etiquetas de sus datos de
 * muestra. Tipado contra el español.
 *
 * Lo que representa al negocio de la persona —sus arrobas, sus publicaciones,
 * los mensajes de sus clientes— nunca pasa por el traductor. Aquí solo están
 * los rótulos que pone Weë.
 *
 * MARCA Y MÓDULOS: Weë, Wäll, Weë Fashion y Credits van en latino dentro de la
 * frase árabe, nunca transliterados. Los nombres de las funciones de negocio
 * —Business Plan, Business Coach, Pricing Assistant, Brand Kit, Customer
 * Insights, Business Ideas, Business Profile, SWOT— y los de las redes
 * (TikTok, Instagram Story, Facebook) se escriben igual que en inglés.
 *
 * «Negocio» se traduce «النشاط التجاري», el término establecido en las
 * herramientas de negocio en árabe (y no «عمل», que también es «trabajo»).
 *
 * DINERO: lo que es una estimación se dice estimación («التكلفة التقديرية»)
 * y el descargo de `pricingNote` se conserva entero.
 *
 * PLURALES: `productsCount` se declara con `ConPlurales` para añadir las seis
 * formas del árabe (_zero/_one/_two/_few/_many/_other); en _one y _two el
 * número va en la palabra (منتج واحد / منتجان).
 */
import { ConPlurales } from './plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'شبكاتي الاجتماعية',
  manageAccounts: 'إدارة الحسابات',
  connected: 'متصل',
  networkConnected: '{{red}} متصل',
  connectAnother: 'ربط شبكة أخرى',
  allConnected: 'جميع شبكاتك متصلة بالفعل.',
  simulatedConnection: 'اتصال تجريبي: لا ينشر Weë ولا يردّ نيابةً عنك بعد. إنه يجهّز كل محتوى لتراجعه وتنشره بنفسك.',
  postCalendar: 'تقويم المنشورات',
  seeFullCalendar: 'عرض التقويم كاملًا',
  calendarGoal: 'عرض تقويم منشوراتي لهذا الأسبوع وتنظيمه',
  scheduleGoal: 'جدولة منشور ليوم {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'رسائل العملاء',
  seeAllMessages: 'عرض الكل',
  messagesGoal: 'الرد على رسائل عملائي',
  reply: 'رد',
  replied: 'تم الرد',
  replyTo: 'الرد على {{nombre}}',
  repliedTo: 'تم الرد على {{nombre}}',
  replyGoal: 'الرد على {{nombre}} في {{red}}: «{{mensaje}}»',
  resultsThisWeek: 'نتائج هذا الأسبوع',
  statPosts: 'المنشورات',
  statReach: 'مدى الوصول',
  statInteractions: 'التفاعلات',
  statMessages: 'الرسائل المستلمة',
  onTrack: 'نشاطك التجاري يسير على الطريق الصحيح',
  onTrackNote: 'ارتفعت التفاعلات بنسبة 60% هذا الأسبوع. واصل على هذا النحو!',
  seeDetailedAnalysis: 'عرض التحليل المفصّل',
  analysisGoal: 'تحليل نتائج نشاطي التجاري هذا الأسبوع',
  shortcutIdeas: 'أفكار',
  shortcutIdeasGoal: 'أفكار واستراتيجية لتنمية نشاطي التجاري',
  shortcutMarketing: 'تسويق',
  shortcutMarketingGoal: 'حملة تسويقية لنشاطي التجاري',
  shortcutSocial: 'منصات التواصل',
  shortcutSocialGoal: 'إنشاء محتوى لشبكات نشاطي التجاري الاجتماعية',
  shortcutAnalyze: 'تحليل',
  shortcutAnalyzeGoal: 'تحليل نتائج نشاطي التجاري',
  shortcutDocuments: 'مستندات',
  shortcutDocumentsGoal: 'كتابة مستند لنشاطي التجاري',
  shortcutSell: 'زيادة المبيعات',
  shortcutSellGoal: 'زيادة مبيعات نشاطي التجاري هذا الشهر',
  shortcutCareer: 'العمل والمسار المهني',
  shortcutCareerGoal: 'تحسين سيرتي الذاتية وملفي المهني',
  yesterday: 'أمس',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos no están aquí: son nombres de producto y viven
   * en `constants/businessModules.ts`. Lo que sí se traduce es lo que hace
   * cada uno, sus acciones y sus avisos.
   */
  slogan: 'موضة وأناقة وجمال وإنشاء محتوى مرئي.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'بناء نشاطك التجاري وإدارته',
  modProductsHint: 'منتجاتك وأسعارها',
  modCreateHint: 'إنشاء محتوى بالذكاء الاصطناعي',
  modSocialHint: 'التجهيز والمشاركة في كل مكان',
  modAnalyzeHint: 'فهم نشاطك التجاري',
  modGrowHint: 'اكتشاف الفرص والنمو',
  modProfileHint: 'نشاطك التجاري داخل Weë',
  modPromoteHint: 'الوصول إلى مزيد من الأشخاص مع Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: 'ملخص نشاطك التجاري',
  overviewEmpty: 'لم تنشئ نشاطك التجاري بعد.',
  overviewEmptyHint: 'أخبر Weë بكلماتك —«أبيع الحلويات من المنزل»— وسأساعدك في بلورته.',
  createBusiness: 'إنشاء نشاطي التجاري',
  createBusinessGoal: 'إنشاء نشاطي التجاري من الصفر: الاسم، وما أبيعه، ولمن، وبأي سعر',
  editBusiness: 'تعديل نشاطي التجاري',
  editBusinessGoal: 'مراجعة معلومات نشاطي التجاري وتحسينها',
  businessInfo: 'معلومات النشاط التجاري',
  businessInfoGoal: 'ترتيب معلومات نشاطي التجاري: ما أبيعه، ولمن، وما يميّزني',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'كتابة خطة العمل لعرض نشاطي التجاري على مستثمر',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'ماذا ينبغي أن أفعل هذا الأسبوع في نشاطي التجاري؟',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'لم تضف أي منتجات بعد.',
  productsEmptyHint: 'ارفع صورة وسيكتب Weë الاسم والوصف والنص الترويجي.',
  addProduct: 'إضافة منتج',
  addProductGoal: 'إنشاء بطاقة منتج: الاسم والوصف والمواصفات والنص الترويجي',
  improveImage: 'تحسين الصورة',
  improveImageGoal: 'تحسين صورة منتجي لبيعه بشكل أفضل',
  productsCount_zero: 'لا توجد منتجات',
  productsCount_one: 'منتج واحد',
  productsCount_two: 'منتجان',
  productsCount_few: '{{contador}} منتجات',
  productsCount_many: '{{contador}} منتجًا',
  productsCount_other: '{{contador}} منتج',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'أدخل تكلفتك وسيقترح Weë سعرًا مرجعيًا.',
  pricingMaterials: 'المواد',
  pricingPackaging: 'التغليف',
  pricingDelivery: 'التوصيل',
  pricingOther: 'تكاليف أخرى',
  pricingMargin: 'الهامش المطلوب',
  pricingCost: 'التكلفة التقديرية',
  pricingSuggested: 'السعر المقترح',
  pricingMarginResult: 'الهامش التقديري',
  pricingProfit: 'الربح التقديري',
  pricingNote: 'الأسعار مرجع إرشادي فقط وليست استشارة محاسبية أو ضريبية.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'ما يجعل محتواك يبدو دائمًا خاصًا بك.',
  brandLogo: 'الشعار',
  brandColors: 'الألوان',
  brandTypography: 'الخطوط',
  brandStyle: 'الأسلوب البصري',
  brandAvatar: 'صورة الملف الشخصي',
  brandCover: 'صورة الغلاف',
  brandTemplates: 'قوالب المحتوى',
  brandGoal: 'إنشاء {{que}} لعلامة نشاطي التجاري',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'أخبرني بما تريد الترويج له وسأجهّزه.',
  createPlaceholder: 'مثال: أريد الترويج لهذه الكعكة بمناسبة عيد الأم…',
  createTypes: 'ماذا تريد أن تنشئ؟',
  typeImage: 'صورة',
  typeImageHint: 'صورة للترويج',
  typeVideo: 'فيديو',
  typeVideoHint: 'فيديو قصير',
  typePost: 'منشور',
  typePostHint: 'جاهز للنشر',
  typeCampaign: 'حملة',
  typeCampaignHint: 'عدة مواد دفعة واحدة',
  typeCopy: 'نصوص',
  typeCopyHint: 'وصف ووسوم ودعوة إلى اتخاذ إجراء',
  typeGoal: 'إنشاء {{que}} لنشاطي التجاري: {{idea}}',
  formats: 'اختر التنسيق',
  formatsHint: 'يتولى Weë الحجم. وأنت تختار أين يُنشر.',
  formatTikTok: 'TikTok',
  /* «فيديو Instagram» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'فيديو Instagram',
  formatStory: 'قصة Instagram',
  formatFacebookStory: 'قصة Facebook',
  formatPost: 'منشور Instagram',
  formatFeed: 'Facebook',
  formatWide: 'فيديو أفقي',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'أخبرني بكلماتك وسأتولى الأمر.',
  askPlaceholder: 'اكتب ما لديك هنا…',
  askSend: 'اسأل Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'إنشاء محتوى',
  goalWithProduct: '{{idea}} — المنتج: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'أنشئه مرة واحدة. وشاركه في كل مكان.',
  share: 'مشاركة',
  shareHint: 'تُفتح قائمة المشاركة في هاتفك: اختر التطبيق الذي تريده.',
  shareToWee: 'مشاركة في Weë',
  shareWall: 'Wäll الخاص بي',
  shareCommunities: 'المجتمعات',
  shareProfile: 'Business Profile',
  shareNothing: 'أنشئ شيئًا أولًا ثم شاركه من هنا.',
  shareText: 'تم الإنشاء باستخدام Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'رفع بياناتي',
  analyzeUploadHint: 'ملف Excel أو CSV أو PDF يتضمن مبيعاتك ونفقاتك.',
  analyzeUploadGoal: 'تحليل ملف مبيعات ونفقات نشاطي التجاري',
  analyzeInsights: 'ما أراه في أرقامك',
  analyzeInsightsGoal: 'شرح ما يحدث لمبيعات نشاطي التجاري',
  expenses: 'النفقات',
  expensesHint: 'دوّن أين تذهب أموالك.',
  expensesEmpty: 'لم تدوّن أي نفقات بعد.',
  addExpense: 'إضافة نفقة',
  expenseSupplies: 'المستلزمات',
  expenseMarketing: 'التسويق',
  expenseDelivery: 'التوصيل',
  expenseStaff: 'الموظفون',
  expenseServices: 'الخدمات',
  expenseOther: 'أخرى',
  expensesAsk: 'أين أنفق أكثر من اللازم؟',
  expensesAskGoal: 'مراجعة نفقاتي وإخباري أين أنفق أكثر من اللازم',
  swot: 'SWOT',
  swotHint: 'نقاط القوة والضعف والفرص والتهديدات.',
  swotGoal: 'إجراء تحليل SWOT لنشاطي التجاري',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'ساعدني على النمو',
  helpMeGrowHint: 'يطّلع Weë على نشاطك التجاري ويقترح عليك ما تفعله.',
  helpMeGrowGoal: 'خطة لتنمية نشاطي التجاري بخطوات ملموسة',
  opportunities: 'الفرص',
  opportunitiesEmpty: 'عندما تتوفر لديك مبيعات ومحتوى، ستظهر هنا الفرص التي أرصدها.',
  createPromotion: 'إنشاء العرض الترويجي',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'لمن تبيع وما يحتاجون إليه.',
  customerInsightsGoal: 'وصف عميلي المثالي والرسائل التي تناسبه',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'ما الذي يمكنك بيعه أيضًا أو كيف تتميّز.',
  businessIdeasGoal: 'اقتراح أفكار لنشاطي التجاري وللتميّز',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'ليس لنشاطك التجاري صفحة في Weë بعد.',
  profileEmptyHint: 'عندما تنشئ نشاطك التجاري، ستكون صفحته هنا: من أنت، وما تبيعه، وكيف يتواصلون معك.',
  profileAbout: 'نبذة',
  profileProducts: 'المنتجات',
  profilePosts: 'المنشورات',
  profileContact: 'التواصل',
  reviews: 'المراجعات',
  reviewsHint: 'ما يقوله عملاؤك وما يمكن تحسينه.',
  reviewsGoal: 'تحليل مراجعات نشاطي التجاري وإخباري بما يجب تحسينه',
  reviewsRespond: 'كتابة رد',
  reviewsRespondGoal: 'كتابة رد احترافي على مراجعة لنشاطي التجاري',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'الوصول إلى مزيد من الأشخاص مع Weë Credits',
  promoteHint: 'يُعرض محتواك على مزيد من الأشخاص داخل Weë. وسترى التكلفة قبل إنفاق أي شيء.',
  promoteSoon: 'الترويج داخل Weë غير متاح بعد. وعندما يُتاح، سيُدفع من رصيدك من Credits وستجده هنا.',
  promoteCredits: 'عرض رصيدي من Credits',
  sampleProductName: 'المنتج {{numero}}',
};
