/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de
 * muestra, en chino simplificado.
 *
 * Tipado contra el español: una clave que falte aquí no compila. Lo que
 * representa al negocio de la persona —sus arrobas, sus publicaciones, los
 * mensajes de sus clientes— nunca pasa por el traductor.
 *
 * MARCA Y MÓDULOS: Weë, Weë Business, Wäll y Credits van en alfabeto latino
 * dentro del hanzi, nunca traducidos ni transliterados —«积分» o «点数» por
 * Credits rompe la moneda del producto, igual que «工作室» por Studio—. Los
 * nombres de los módulos —Business Plan, Business Coach, Pricing Assistant,
 * Brand Kit, Customer Insights, Business Ideas, Business Profile, SWOT— son
 * nombres de producto y se escriben igual en todos los idiomas. También se
 * quedan como están las plataformas (TikTok, Instagram Story, Facebook) y los
 * formatos de archivo (Excel, CSV, PDF).
 *
 * "MI NEGOCIO" ES 生意, NO 商业. 商业 es el comercio como concepto —de ahí
 * 商业计划书, el plan de negocio— pero «我的商业» no lo dice nadie. Quien vende
 * postres desde casa tiene 生意, y esa es la palabra que usa toda la pantalla.
 *
 * DINERO: aquí hay precios, costes y márgenes, y primero va la precisión. Lo
 * que es una estimación se dice estimación —预计成本, 预计利润, 预计利润率—, lo
 * que se paga con Credits se dice entero y con la moneda sin traducir, y el
 * descargo de `pricingNote` se conserva completo: 仅供参考，不构成会计或税务建议.
 *
 * PLURALES: el chino no los tiene. `productsCount_one` no se lee nunca, así que
 * lleva el mismo texto que `_other`, con el clasificador 个, que no cambia con
 * el número. Ni `_few` ni `_many`: en chino no existen.
 *
 * ESPACIADO: un espacio entre hanzi y lo que va en latino o en cifras
 * —«用 Weë Credits 触达更多人», «增长了 60%»— y ninguno antes de la puntuación
 * de ancho completo （。，、？！：；）.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: '我的社交账号',
  manageAccounts: '管理账号',
  connected: '已连接',
  networkConnected: '{{red}} 已连接',
  connectAnother: '连接其他平台',
  allConnected: '你的社交账号都已经连接好了。',
  simulatedConnection: '模拟连接：Weë 暂时还不会替你发布或回复。它会把每份内容准备好，由你检查后再发布。',
  postCalendar: '发布日历',
  seeFullCalendar: '查看完整日历',
  calendarGoal: '查看并安排我本周的发布日历',
  scheduleGoal: '安排在 {{dia}} {{fecha}} 发布一条动态：{{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: '客户消息',
  seeAllMessages: '查看全部',
  messagesGoal: '回复我的客户消息',
  reply: '回复',
  replied: '已回复',
  replyTo: '回复 {{nombre}}',
  repliedTo: '已回复 {{nombre}}',
  replyGoal: '在 {{red}} 上回复 {{nombre}}：“{{mensaje}}”',
  resultsThisWeek: '本周成效',
  statPosts: '动态',
  statReach: '触达人数',
  statInteractions: '互动',
  statMessages: '收到的消息',
  onTrack: '你的生意走在正轨上',
  onTrackNote: '本周互动增长了 60%，继续保持！',
  seeDetailedAnalysis: '查看详细分析',
  analysisGoal: '分析我本周的生意成效',
  shortcutIdeas: '创意',
  shortcutIdeasGoal: '让我的生意成长的创意和策略',
  shortcutMarketing: '营销',
  shortcutMarketingGoal: '为我的生意做一场营销活动',
  shortcutSocial: '社交媒体',
  shortcutSocialGoal: '为我的生意社交账号创作内容',
  shortcutAnalyze: '分析',
  shortcutAnalyzeGoal: '分析我的生意成效',
  shortcutDocuments: '文档',
  shortcutDocumentsGoal: '为我的生意写一份文档',
  shortcutSell: '卖得更多',
  shortcutSellGoal: '这个月让我的生意卖得更多',
  shortcutCareer: '工作与职业',
  shortcutCareerGoal: '优化我的简历和职业档案',
  yesterday: '昨天',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: '创建、经营、推广，让你的生意成长。',

  modMyBusinessHint: '搭建并经营你的生意',
  modProductsHint: '你的产品和价格',
  modCreateHint: '用 AI 创作内容',
  modSocialHint: '准备好，分享到任何地方',
  modAnalyzeHint: '读懂你的生意',
  modGrowHint: '发现机会，持续成长',
  modProfileHint: '你在 Weë 上的生意',
  modPromoteHint: '用 Weë 触达更多人',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: '生意概览',
  overviewEmpty: '你还没有创建自己的生意。',
  overviewEmptyHint: '用你自己的话告诉 Weë——比如“我在家做甜点卖”——我来帮你把它理清楚。',
  createBusiness: '创建我的生意',
  createBusinessGoal: '从零创建我的生意：名字、卖什么、卖给谁、卖多少钱',
  editBusiness: '编辑我的生意',
  editBusinessGoal: '检查并完善我的生意信息',
  businessInfo: '生意信息',
  businessInfoGoal: '整理我的生意信息：卖什么、卖给谁、有什么不一样',
  businessPlan: 'Business Plan',
  businessPlanGoal: '写一份商业计划书，向投资人介绍我的生意',
  businessCoach: 'Business Coach',
  businessCoachGoal: '这周我的生意该做些什么？',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: '你还没有添加产品。',
  productsEmptyHint: '上传一张照片，Weë 来写名称、描述和卖货文案。',
  addProduct: '添加产品',
  addProductGoal: '创建一个产品的详情：名称、描述、特点和卖货文案',
  improveImage: '优化照片',
  improveImageGoal: '优化我的产品照片，让它更好卖',
  /* El chino no pluraliza: `_one` no se lee nunca y dice lo mismo que `_other`. */
  productsCount_one: '{{contador}} 个产品',
  productsCount_other: '{{contador}} 个产品',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: '填入你的成本，Weë 给你一个参考价格。',
  pricingMaterials: '材料费',
  pricingPackaging: '包装费',
  pricingDelivery: '运费',
  pricingOther: '其他成本',
  pricingMargin: '你想要的利润率',
  /* Estimaciones: se dicen estimaciones, sin excepción. */
  pricingCost: '预计成本',
  pricingSuggested: '建议价格',
  pricingMarginResult: '预计利润率',
  pricingProfit: '预计利润',
  pricingNote: '这些价格仅供参考，不构成会计或税务建议。',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: '让你的内容看起来始终是你的风格。',
  brandLogo: '品牌 Logo',
  brandColors: '配色',
  brandTypography: '字体',
  brandStyle: '视觉风格',
  brandAvatar: '头像',
  brandCover: '封面',
  brandTemplates: '内容模板',
  brandGoal: '为我的生意品牌创建{{que}}',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: '告诉我你想推广什么，我来准备。',
  createPlaceholder: '例如：我想在母亲节推广这款蛋糕…',
  createTypes: '想创作点什么？',
  typeImage: '图片',
  typeImageHint: '一张用来推广的图片',
  typeVideo: '视频',
  typeVideoHint: '一条短视频',
  typePost: '动态',
  typePostHint: '写好就能发',
  typeCampaign: '活动',
  typeCampaignHint: '一次做出多个内容',
  typeCopy: '文案',
  typeCopyHint: '描述、话题标签和行动号召',
  typeGoal: '为我的生意创作{{que}}：{{idea}}',
  formats: '选择发布形式',
  formatsHint: '尺寸交给 Weë。你只要选它发到哪里。',
  formatTikTok: 'TikTok',
  /* "Instagram 视频" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma aquí. */
  formatReel: 'Instagram 视频',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: '横版视频',

  askInvite: '用你自己的话说说，我来处理。',
  askPlaceholder: '在这里写下你的想法…',
  askSend: '问问 Weë',

  productCreate: '创作内容',
  goalWithProduct: '{{idea}}——产品：{{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: '创作一次，处处分享。',
  share: '分享',
  shareHint: '会打开手机的分享面板，你想发到哪个应用都行。',
  shareToWee: '分享到 Weë',
  shareWall: '我的 Wäll',
  shareCommunities: '社区',
  shareProfile: 'Business Profile',
  shareNothing: '先创作点什么，再从这里分享出去。',
  shareText: '用 Weë Business 创作',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: '上传我的数据',
  analyzeUploadHint: '含有销售和支出的 Excel、CSV 或 PDF 文件。',
  analyzeUploadGoal: '分析我生意的销售和支出文件',
  analyzeInsights: '我从你的数字里看到的',
  analyzeInsightsGoal: '给我讲讲我生意的销售到底怎么样',
  expenses: '支出',
  expensesHint: '记下你的钱都花在哪里。',
  expensesEmpty: '你还没有记录任何支出。',
  addExpense: '添加支出',
  expenseSupplies: '原材料',
  expenseMarketing: '营销',
  expenseDelivery: '物流',
  expenseStaff: '人力',
  expenseServices: '服务费',
  expenseOther: '其他',
  expensesAsk: '我哪里花超了？',
  expensesAskGoal: '检查我的支出，告诉我哪里花超了',
  swot: 'SWOT',
  swotHint: '优势、劣势、机会和威胁。',
  swotGoal: '做一份我生意的 SWOT 分析',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: '帮我把生意做大',
  helpMeGrowHint: 'Weë 看过你的生意后，会建议你接下来做什么。',
  helpMeGrowGoal: '一份让我的生意成长的计划，要有具体步骤',
  opportunities: '机会',
  opportunitiesEmpty: '等你有了销售和内容，我发现的机会会出现在这里。',
  createPromotion: '创建促销活动',
  customerInsights: 'Customer Insights',
  customerInsightsHint: '你在卖给谁，他们需要什么。',
  customerInsightsGoal: '描述我的理想客户，以及什么样的内容对他们有效',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: '你还能卖什么，或者怎么做得不一样。',
  businessIdeasGoal: '给我一些生意上的点子，以及怎么做出差异',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: '你的生意在 Weë 上还没有主页。',
  profileEmptyHint: '创建生意之后，主页就会出现在这里：你是谁、你卖什么、怎么联系你。',
  profileAbout: '简介',
  profileProducts: '产品',
  profilePosts: '动态',
  profileContact: '联系方式',
  reviews: '评价',
  reviewsHint: '客户怎么说，还有哪里可以改进。',
  reviewsGoal: '分析我生意的评价，告诉我哪里可以改进',
  reviewsRespond: '写一条回复',
  reviewsRespondGoal: '给我生意的一条评价写一段专业的回复',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: '用 Weë Credits 触达更多人',
  promoteHint: '你的内容会在 Weë 里展示给更多人。花掉任何 Credits 之前，你都会先看到要花多少。',
  promoteSoon: '在 Weë 里推广还没有开放。开放之后会用你的 Credits 支付，你在这里就能看到。',
  promoteCredits: '查看我的 Credits',
  sampleProductName: '产品 {{numero}}',
};
