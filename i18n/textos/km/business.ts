/*
 * JEMER — Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato respetuoso neutro (អ្នក); la persona habla de «mi negocio» como អាជីវកម្មរបស់ខ្ញុំ. Entre palabras jemeres
 * va el ZWSP (U+200B) para que el navegador pueda cortar línea; el espacio normal solo entre frases y junto a
 * marcas, siglas y cifras. Plural: Intl solo tiene «other», así que _one y _other son idénticas y llevan
 * {{contador}}. Los nombres de producto que el español deja en inglés (Business Plan, Business Coach, Pricing
 * Assistant, Brand Kit, Customer Insights, Business Ideas, Business Profile, SWOT, TikTok, Instagram Story,
 * Facebook Story, Instagram Post) se dejan tal cual.
 *
 * QUÉ NO ENTRA AQUÍ: lo que representa al negocio de la persona (sus redes, arrobas, títulos y mensajes), que es
 * contenido y no interfaz. Aquí solo están los rótulos que pone Weë.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'បណ្តាញ​សង្គម​របស់ខ្ញុំ',
  manageAccounts: 'គ្រប់គ្រង​គណនី',
  connected: 'បាន​ភ្ជាប់',
  networkConnected: '{{red}} បាន​ភ្ជាប់',
  connectAnother: 'ភ្ជាប់​បណ្តាញ​ផ្សេង​ទៀត',
  allConnected: 'អ្នក​បាន​ភ្ជាប់​បណ្តាញ​ទាំងអស់​របស់​អ្នក​រួចហើយ។',
  simulatedConnection: 'ការភ្ជាប់​សាកល្បង៖ Weë មិនទាន់​បង្ហោះ ឬ​ឆ្លើយតប​ជំនួស​អ្នក​នៅឡើយ​ទេ។ វា​រៀបចំ​ផ្នែក​នីមួយៗ​ឱ្យ​អ្នក​ពិនិត្យ និង​បង្ហោះ​ដោយ​ខ្លួនឯង។',
  postCalendar: 'ប្រតិទិន​សារបង្ហោះ',
  seeFullCalendar: 'មើល​ប្រតិទិន​ពេញ',
  calendarGoal: 'មើល និង​រៀបចំ​ប្រតិទិន​សារបង្ហោះ​របស់ខ្ញុំ​សម្រាប់​សប្តាហ៍​នេះ',
  scheduleGoal: 'កំណត់ពេល​សារបង្ហោះ​មួយ​សម្រាប់​ថ្ងៃ {{dia}} {{fecha}}៖ {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'សារ​ពី​អតិថិជន',
  seeAllMessages: 'មើល​ទាំងអស់',
  messagesGoal: 'ឆ្លើយតប​សារ​អតិថិជន​របស់ខ្ញុំ',
  reply: 'ឆ្លើយតប',
  replied: 'បាន​ឆ្លើយតប',
  replyTo: 'ឆ្លើយតប​ទៅ {{nombre}}',
  repliedTo: 'បាន​ឆ្លើយតប​ទៅ {{nombre}}',
  replyGoal: 'ឆ្លើយតប​ទៅ {{nombre}} នៅលើ {{red}}៖ "{{mensaje}}"',
  resultsThisWeek: 'លទ្ធផល​សប្តាហ៍​នេះ',
  statPosts: 'សារបង្ហោះ',
  statReach: 'អ្នក​ដែល​បាន​ទៅដល់',
  statInteractions: 'អន្តរកម្ម',
  statMessages: 'សារ​ទទួលបាន',
  onTrack: 'អាជីវកម្ម​របស់​អ្នក​កំពុង​ដើរ​លើ​ផ្លូវ​ល្អ',
  onTrackNote: 'អន្តរកម្ម​កើនឡើង 60% ក្នុង​សប្តាហ៍​នេះ។ បន្ត​បែបនេះ​ទៀត!',
  seeDetailedAnalysis: 'មើល​ការវិភាគ​លម្អិត',
  analysisGoal: 'វិភាគ​លទ្ធផល​អាជីវកម្ម​របស់ខ្ញុំ​សប្តាហ៍​នេះ',
  shortcutIdeas: 'គំនិត',
  shortcutIdeasGoal: 'គំនិត និង​យុទ្ធសាស្ត្រ​ដើម្បី​ពង្រីក​អាជីវកម្ម​របស់ខ្ញុំ',
  shortcutMarketing: 'ទីផ្សារ',
  shortcutMarketingGoal: 'យុទ្ធនាការ​ទីផ្សារ​សម្រាប់​អាជីវកម្ម​របស់ខ្ញុំ',
  shortcutSocial: 'បណ្តាញ​សង្គម',
  shortcutSocialGoal: 'បង្កើត​មាតិកា​សម្រាប់​បណ្តាញ​សង្គម​នៃ​អាជីវកម្ម​របស់ខ្ញុំ',
  shortcutAnalyze: 'វិភាគ',
  shortcutAnalyzeGoal: 'វិភាគ​លទ្ធផល​អាជីវកម្ម​របស់ខ្ញុំ',
  shortcutDocuments: 'ឯកសារ',
  shortcutDocumentsGoal: 'សរសេរ​ឯកសារ​សម្រាប់​អាជីវកម្ម​របស់ខ្ញុំ',
  shortcutSell: 'លក់​បាន​ច្រើន​ជាង',
  shortcutSellGoal: 'លក់​បាន​ច្រើន​ជាង​ក្នុង​ខែ​នេះ​សម្រាប់​អាជីវកម្ម​របស់ខ្ញុំ',
  shortcutCareer: 'ការងារ និង​អាជីព',
  shortcutCareerGoal: 'កែលម្អ CV និង​ប្រវត្តិរូប​វិជ្ជាជីវៈ​របស់ខ្ញុំ',
  yesterday: 'ម្សិលមិញ',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en los dos idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'ម៉ូដ រចនាប័ទ្ម សម្រស់ និង​ការបង្កើត​មាតិកា​ជា​រូបភាព។',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'កសាង និង​គ្រប់គ្រង​អាជីវកម្ម​របស់​អ្នក',
  modProductsHint: 'ផលិតផល និង​តម្លៃ​របស់​អ្នក',
  modCreateHint: 'បង្កើត​មាតិកា​ដោយ AI',
  modSocialHint: 'រៀបចំ និង​ចែករំលែក​គ្រប់ទីកន្លែង',
  modAnalyzeHint: 'យល់​ពី​អាជីវកម្ម​របស់​អ្នក',
  modGrowHint: 'ស្វែងរក​ឱកាស និង​រីកចម្រើន',
  modProfileHint: 'អាជីវកម្ម​របស់​អ្នក​ក្នុង Weë',
  modPromoteHint: 'ទៅដល់​មនុស្ស​កាន់តែ​ច្រើន​ជាមួយ Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'សេចក្តី​សង្ខេប​អាជីវកម្ម​របស់​អ្នក',
  overviewEmpty: 'អ្នក​មិនទាន់​បាន​បង្កើត​អាជីវកម្ម​របស់​អ្នក​នៅឡើយ​ទេ។',
  overviewEmptyHint: 'ប្រាប់ Weë ដោយ​ពាក្យ​របស់​អ្នក —"ខ្ញុំ​លក់​បង្អែម​ពី​ផ្ទះ"— ហើយ​ខ្ញុំ​នឹង​ជួយ​អ្នក​រៀបចំ​វា។',
  createBusiness: 'បង្កើត​អាជីវកម្ម​របស់ខ្ញុំ',
  createBusinessGoal: 'បង្កើត​អាជីវកម្ម​របស់ខ្ញុំ​ពី​ដំបូង៖ ឈ្មោះ លក់​អ្វី លក់​ឱ្យ​នរណា និង​តម្លៃ​ប៉ុន្មាន',
  editBusiness: 'កែសម្រួល​អាជីវកម្ម​របស់ខ្ញុំ',
  editBusinessGoal: 'ពិនិត្យ និង​កែលម្អ​ព័ត៌មាន​អាជីវកម្ម​របស់ខ្ញុំ',
  businessInfo: 'ព័ត៌មាន​អាជីវកម្ម',
  businessInfoGoal: 'រៀបចំ​ព័ត៌មាន​អាជីវកម្ម​របស់ខ្ញុំ៖ លក់​អ្វី លក់​ឱ្យ​នរណា និង​អ្វី​ដែល​ធ្វើឱ្យ​ខ្ញុំ​ខុសគេ',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'សរសេរ​ផែនការ​អាជីវកម្ម​ដើម្បី​បង្ហាញ​អាជីវកម្ម​របស់ខ្ញុំ​ដល់​អ្នកវិនិយោគ',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'សប្តាហ៍​នេះ​ខ្ញុំ​គួរ​ធ្វើ​អ្វី​ក្នុង​អាជីវកម្ម​របស់ខ្ញុំ?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'អ្នក​មិនទាន់​បាន​បន្ថែម​ផលិតផល​នៅឡើយ​ទេ។',
  productsEmptyHint: 'បង្ហោះ​ឡើង​រូបថត​មួយ ហើយ Weë នឹង​សរសេរ​ឈ្មោះ ការពិពណ៌នា និង​អត្ថបទ​សម្រាប់​លក់​វា។',
  addProduct: 'បន្ថែម​ផលិតផល',
  addProductGoal: 'បង្កើត​ព័ត៌មាន​ផលិតផល៖ ឈ្មោះ ការពិពណ៌នា លក្ខណៈ​ពិសេស និង​អត្ថបទ​សម្រាប់​លក់',
  improveImage: 'កែលម្អ​រូបថត',
  improveImageGoal: 'កែលម្អ​រូបថត​ផលិតផល​របស់ខ្ញុំ​ដើម្បី​លក់​បាន​ល្អ​ជាង',
  productsCount_one: '{{contador}} ផលិតផល',
  productsCount_other: '{{contador}} ផលិតផល',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'បញ្ចូល​ថ្លៃដើម​របស់​អ្នក ហើយ Weë នឹង​ផ្តល់​តម្លៃ​យោង​ដល់​អ្នក។',
  pricingMaterials: 'វត្ថុធាតុដើម',
  pricingPackaging: 'ការវេចខ្ចប់',
  pricingDelivery: 'ការដឹកជញ្ជូន',
  pricingOther: 'ថ្លៃដើម​ផ្សេងៗ',
  pricingMargin: 'ប្រាក់ចំណេញ​ដែល​អ្នក​ចង់បាន',
  pricingCost: 'ថ្លៃដើម​ប៉ាន់ស្មាន',
  pricingSuggested: 'តម្លៃ​ណែនាំ',
  pricingMarginResult: 'អត្រា​ចំណេញ​ប៉ាន់ស្មាន',
  pricingProfit: 'ប្រាក់ចំណេញ​ប៉ាន់ស្មាន',
  pricingNote: 'តម្លៃ​ទាំងនេះ​ជា​ការយោង​សម្រាប់​ព័ត៌មាន​ប៉ុណ្ណោះ មិនមែន​ជា​ការប្រឹក្សា​គណនេយ្យ ឬ​ពន្ធដារ​ទេ។',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'អ្វី​ដែល​ធ្វើឱ្យ​មាតិកា​របស់​អ្នក​មើលទៅ​ជា​របស់​អ្នក​ជានិច្ច។',
  brandLogo: 'ឡូហ្គោ',
  brandColors: 'ពណ៌',
  brandTypography: 'ពុម្ពអក្សរ',
  brandStyle: 'រចនាប័ទ្ម​រូបភាព',
  brandAvatar: 'រូបភាព​ប្រវត្តិរូប',
  brandCover: 'រូបគម្រប',
  brandTemplates: 'គំរូ​មាតិកា',
  brandGoal: 'បង្កើត {{que}} សម្រាប់​ម៉ាក​អាជីវកម្ម​របស់ខ្ញុំ',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'ប្រាប់ខ្ញុំ​ថា​អ្នក​ចង់​ផ្សព្វផ្សាយ​អ្វី ហើយ​ខ្ញុំ​នឹង​រៀបចំ​វា។',
  createPlaceholder: 'ឧទាហរណ៍៖ ខ្ញុំ​ចង់​ផ្សព្វផ្សាយ​នំខេក​នេះ​សម្រាប់​ទិវា​ម្តាយ…',
  createTypes: 'អ្នក​ចង់​បង្កើត​អ្វី?',
  typeImage: 'រូបភាព',
  typeImageHint: 'រូបភាព​សម្រាប់​ផ្សព្វផ្សាយ',
  typeVideo: 'វីដេអូ',
  typeVideoHint: 'វីដេអូ​ខ្លី',
  typePost: 'សារបង្ហោះ',
  typePostHint: 'រួចរាល់​សម្រាប់​បង្ហោះ',
  typeCampaign: 'យុទ្ធនាការ',
  typeCampaignHint: 'ច្រើន​ផ្នែក​ក្នុង​ពេល​តែមួយ',
  typeCopy: 'អត្ថបទ',
  typeCopyHint: 'ការពិពណ៌នា ហាសថេក និង​ការអំពាវនាវ​ឱ្យ​ធ្វើ',
  typeGoal: 'បង្កើត {{que}} សម្រាប់​អាជីវកម្ម​របស់ខ្ញុំ៖ {{idea}}',
  formats: 'ជ្រើស​ទម្រង់​របស់​អ្នក',
  formatsHint: 'Weë មើលថែ​ទំហំ​ឱ្យ។ អ្នក​ជ្រើស​ថា​វា​ទៅ​ណា។',
  formatTikTok: 'TikTok',
  /* "Video de Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'វីដេអូ Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'វីដេអូ​ផ្តេក',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'ប្រាប់ខ្ញុំ​ដោយ​ពាក្យ​របស់​អ្នក ហើយ​ខ្ញុំ​នឹង​ទទួល​បន្ទុក។',
  askPlaceholder: 'សរសេរ​រឿង​របស់​អ្នក​នៅ​ទីនេះ…',
  askSend: 'សួរ Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'បង្កើត​មាតិកា',
  goalWithProduct: '{{idea}} — ផលិតផល៖ {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'បង្កើត​ម្តង។ ចែករំលែក​គ្រប់ទីកន្លែង។',
  share: 'ចែករំលែក',
  shareHint: 'បើក​ការចែករំលែក​របស់​ទូរសព្ទ​អ្នក៖ ជ្រើស​កម្មវិធី​ណា​ក៏បាន។',
  shareToWee: 'ចែករំលែក​ក្នុង Weë',
  shareWall: 'Wäll របស់ខ្ញុំ',
  shareCommunities: 'សហគមន៍',
  shareProfile: 'Business Profile',
  shareNothing: 'បង្កើត​អ្វី​មួយ​ជាមុន​សិន រួច​ចែករំលែក​វា​ពី​ទីនេះ។',
  shareText: 'បង្កើត​ដោយ​ប្រើ Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'បង្ហោះ​ឡើង​ទិន្នន័យ​របស់ខ្ញុំ',
  analyzeUploadHint: 'Excel CSV ឬ PDF ដែល​មាន​ការលក់ និង​ការចំណាយ​របស់​អ្នក។',
  analyzeUploadGoal: 'វិភាគ​ឯកសារ​ការលក់ និង​ការចំណាយ​នៃ​អាជីវកម្ម​របស់ខ្ញុំ',
  analyzeInsights: 'អ្វី​ដែល​ខ្ញុំ​ឃើញ​ក្នុង​តួលេខ​របស់​អ្នក',
  analyzeInsightsGoal: 'ពន្យល់​ខ្ញុំ​ថា​មាន​អ្វី​កើតឡើង​ចំពោះ​ការលក់​នៃ​អាជីវកម្ម​របស់ខ្ញុំ',
  expenses: 'ការចំណាយ',
  expensesHint: 'កត់ត្រា​ថា​លុយ​របស់​អ្នក​ទៅ​ណា។',
  expensesEmpty: 'អ្នក​មិនទាន់​បាន​កត់ត្រា​ការចំណាយ​នៅឡើយ​ទេ។',
  addExpense: 'បន្ថែម​ការចំណាយ',
  expenseSupplies: 'សម្ភារៈ',
  expenseMarketing: 'ទីផ្សារ',
  expenseDelivery: 'ការដឹកជញ្ជូន',
  expenseStaff: 'បុគ្គលិក',
  expenseServices: 'សេវាកម្ម',
  expenseOther: 'ផ្សេងៗ',
  expensesAsk: 'ខ្ញុំ​ចំណាយ​លើស​លើ​អ្វី?',
  expensesAskGoal: 'ពិនិត្យ​ការចំណាយ​របស់ខ្ញុំ ហើយ​ប្រាប់​ខ្ញុំ​ថា​ចំណាយ​លើស​លើ​អ្វី',
  swot: 'SWOT',
  swotHint: 'ចំណុចខ្លាំង ចំណុចខ្សោយ ឱកាស និង​ការគំរាមកំហែង។',
  swotGoal: 'ធ្វើ​ការវិភាគ SWOT នៃ​អាជីវកម្ម​របស់ខ្ញុំ',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'ជួយ​ខ្ញុំ​ឱ្យ​រីកចម្រើន',
  helpMeGrowHint: 'Weë មើល​អាជីវកម្ម​របស់​អ្នក ហើយ​ស្នើ​ថា​គួរ​ធ្វើ​អ្វី។',
  helpMeGrowGoal: 'ផែនការ​ពង្រីក​អាជីវកម្ម​របស់ខ្ញុំ ជាមួយ​ជំហាន​ជាក់លាក់',
  opportunities: 'ឱកាស',
  opportunitiesEmpty: 'ពេល​អ្នក​មាន​ការលក់ និង​មាតិកា ឱកាស​ដែល​ខ្ញុំ​ឃើញ​នឹង​បង្ហាញ​នៅ​ទីនេះ។',
  createPromotion: 'បង្កើត​ការផ្សព្វផ្សាយ',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'អ្នក​លក់​ឱ្យ​នរណា និង​ពួកគេ​ត្រូវការ​អ្វី។',
  customerInsightsGoal: 'ពិពណ៌នា​អតិថិជន​ដ៏ល្អ​របស់ខ្ញុំ និង​សារ​ណា​ដែល​មាន​ប្រសិទ្ធភាព​ចំពោះ​ពួកគេ',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'អ្វី​ទៀត​ដែល​អ្នក​អាច​លក់ ឬ​របៀប​ធ្វើឱ្យ​ខុសគេ។',
  businessIdeasGoal: 'ផ្តល់​គំនិត​សម្រាប់​អាជីវកម្ម​របស់ខ្ញុំ និង​ដើម្បី​ធ្វើឱ្យ​ខុសគេ',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'អាជីវកម្ម​របស់​អ្នក​មិនទាន់​មាន​ទំព័រ​ក្នុង Weë នៅឡើយ​ទេ។',
  profileEmptyHint: 'ពេល​អ្នក​បង្កើត​អាជីវកម្ម ទំព័រ​របស់​វា​នឹង​នៅ​ទីនេះ៖ អ្នក​ជា​នរណា លក់​អ្វី និង​ទាក់ទង​អ្នក​យ៉ាងដូចម្តេច។',
  profileAbout: 'អំពី',
  profileProducts: 'ផលិតផល',
  profilePosts: 'សារបង្ហោះ',
  profileContact: 'ទំនាក់ទំនង',
  reviews: 'ការវាយតម្លៃ',
  reviewsHint: 'អតិថិជន​របស់​អ្នក​និយាយ​អ្វី និង​អ្វី​ដែល​ត្រូវ​កែលម្អ។',
  reviewsGoal: 'វិភាគ​ការវាយតម្លៃ​អាជីវកម្ម​របស់ខ្ញុំ ហើយ​ប្រាប់​ខ្ញុំ​ថា​ត្រូវ​កែលម្អ​អ្វី',
  reviewsRespond: 'សរសេរ​ការឆ្លើយតប',
  reviewsRespondGoal: 'សរសេរ​ការឆ្លើយតប​បែប​វិជ្ជាជីវៈ​ទៅ​ការវាយតម្លៃ​អាជីវកម្ម​របស់ខ្ញុំ',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'ទៅដល់​មនុស្ស​កាន់តែ​ច្រើន​ជាមួយ Weë Credits',
  promoteHint: 'មាតិកា​របស់​អ្នក​ត្រូវ​បង្ហាញ​ដល់​មនុស្ស​កាន់តែ​ច្រើន​ក្នុង Weë។ មុន​ចំណាយ​អ្វី​ទាំងអស់ អ្នក​នឹង​ឃើញ​ថា​ថ្លៃ​ប៉ុន្មាន។',
  promoteSoon: 'ការផ្សព្វផ្សាយ​ក្នុង Weë មិនទាន់​បើក​នៅឡើយ​ទេ។ ពេល​បើក វា​នឹង​បង់​ដោយ Credits របស់​អ្នក ហើយ​អ្នក​នឹង​ឃើញ​វា​នៅ​ទីនេះ។',
  promoteCredits: 'មើល Credits របស់ខ្ញុំ',
  sampleProductName: 'ផលិតផល {{numero}}',
};
