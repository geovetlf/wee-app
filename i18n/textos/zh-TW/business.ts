/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de
 * muestra, en chino tradicional (norma de Taiwán).
 *
 * Tipado contra el español: una clave que falte aquí no compila. Lo que
 * representa al negocio de la persona —sus arrobas, sus publicaciones, los
 * mensajes de sus clientes— nunca pasa por el traductor.
 *
 * ESTO NO ES EL SIMPLIFICADO CON OTROS CARACTERES. El vocabulario es el de
 * Taiwán, no el que saldría de convertir `i18n/textos/zh/` carácter a carácter:
 *
 *   行銷 (no 營銷) · 社群 (no 社區) · 貼文 (no 動態) · 帳號 (no 賬號)
 *   回覆 (no 回復) · 觸及 (no 觸達) · 訊息 y 資訊 (nunca 信息) · 資料 (no 數據)
 *   行事曆 (no 日曆) · 商業計畫書 (no 商業計劃書) · 建立 (no 創建)
 *   新增 (no 添加) · 範本 (no 模板) · 檔案 = archivo, 文件 = documento
 *   履歷 (no 簡歷) · 大頭貼 (no 頭像) · 字型 (no 字體) · 主題標籤 (no 話題標籤)
 *   原物料 (no 原材料) · 聯絡 (no 聯繫) · 影片 (no 視頻) · 總覽 (no 概覽)
 *
 * Y las comillas son las de Taiwán: 「」, no “”.
 *
 * MARCA Y MÓDULOS: Weë, Weë Business, Wäll y Credits van en alfabeto latino
 * dentro del hanzi, nunca traducidos ni transliterados —«積分» o «點數» por
 * Credits rompe la moneda del producto, igual que «工作室» por Studio—. Los
 * nombres de los módulos —Business Plan, Business Coach, Pricing Assistant,
 * Brand Kit, Customer Insights, Business Ideas, Business Profile, SWOT— son
 * nombres de producto y se escriben igual en todos los idiomas. También se
 * quedan como están las plataformas (TikTok, Instagram Story, Facebook) y los
 * formatos de archivo (Excel, CSV, PDF).
 *
 * "MI NEGOCIO" ES 生意, NO 商業. 商業 es el comercio como concepto —de ahí
 * 商業計畫書, el plan de negocio— pero «我的商業» no lo dice nadie. Quien vende
 * postres desde casa tiene 生意, y esa es la palabra que usa toda la pantalla.
 *
 * DINERO: aquí hay precios, costes y márgenes, y primero va la precisión. Lo
 * que es una estimación se dice estimación —預估成本, 預估利潤, 預估利潤率—, lo
 * que se paga con Credits se dice entero y con la moneda sin traducir, y el
 * descargo de `pricingNote` se conserva completo: 僅供參考，不構成會計或稅務建議.
 *
 * PLURALES: el chino no los tiene. `productsCount_one` no se lee nunca, así que
 * lleva el mismo texto que `_other`, con el clasificador 個, que no cambia con
 * el número. Ni `_few` ni `_many`: en chino no existen.
 *
 * ESPACIADO: un espacio entre hanzi y lo que va en latino o en cifras
 * —«用 Weë Credits 觸及更多人», «成長了 60%»— y ninguno antes de la puntuación
 * de ancho completo （。，、？！：；）.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: '我的社群帳號',
  manageAccounts: '管理帳號',
  connected: '已連結',
  networkConnected: '{{red}} 已連結',
  connectAnother: '連結其他平台',
  allConnected: '你的社群帳號都已經連結好了。',
  simulatedConnection: '模擬連結：Weë 暫時還不會替你發布或回覆。它會把每份內容準備好，由你檢查後再發布。',
  /* 行事曆 y no 日曆: en Taiwán el calendario de trabajo es un 行事曆. */
  postCalendar: '貼文行事曆',
  seeFullCalendar: '查看完整行事曆',
  calendarGoal: '檢視並安排我本週的貼文行事曆',
  scheduleGoal: '安排在 {{dia}} {{fecha}} 發布一則貼文：{{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  /* 訊息 y no 信息; 客戶 y no 客户. */
  customerMessages: '客戶訊息',
  seeAllMessages: '查看全部',
  messagesGoal: '回覆我的客戶訊息',
  /* 回覆 y no 回復: en Taiwán responder es 回覆. */
  reply: '回覆',
  replied: '已回覆',
  replyTo: '回覆 {{nombre}}',
  repliedTo: '已回覆 {{nombre}}',
  replyGoal: '在 {{red}} 上回覆 {{nombre}}：「{{mensaje}}」',
  resultsThisWeek: '本週成效',
  statPosts: '貼文',
  /* 觸及 y no 觸達: es la palabra de las redes en Taiwán. */
  statReach: '觸及人數',
  statInteractions: '互動',
  statMessages: '收到的訊息',
  onTrack: '你的生意走在正軌上',
  onTrackNote: '本週互動成長了 60%，繼續保持！',
  seeDetailedAnalysis: '查看詳細分析',
  analysisGoal: '分析我本週的生意成效',
  shortcutIdeas: '創意',
  shortcutIdeasGoal: '讓我的生意成長的創意和策略',
  /* 行銷 y no 營銷. */
  shortcutMarketing: '行銷',
  shortcutMarketingGoal: '為我的生意做一場行銷活動',
  shortcutSocial: '社群媒體',
  shortcutSocialGoal: '為我的生意社群帳號創作內容',
  shortcutAnalyze: '分析',
  shortcutAnalyzeGoal: '分析我的生意成效',
  shortcutDocuments: '文件',
  shortcutDocumentsGoal: '為我的生意寫一份文件',
  shortcutSell: '賣得更多',
  shortcutSellGoal: '這個月讓我的生意賣得更多',
  shortcutCareer: '工作與職涯',
  shortcutCareerGoal: '優化我的履歷和職涯檔案',
  yesterday: '昨天',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: '建立、經營、推廣，讓你的生意成長。',

  modMyBusinessHint: '打造並經營你的生意',
  modProductsHint: '你的產品和價格',
  modCreateHint: '用 AI 創作內容',
  modSocialHint: '準備好，分享到任何地方',
  modAnalyzeHint: '讀懂你的生意',
  modGrowHint: '發現機會，持續成長',
  modProfileHint: '你在 Weë 上的生意',
  modPromoteHint: '用 Weë 觸及更多人',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: '生意總覽',
  overviewEmpty: '你還沒有建立自己的生意。',
  overviewEmptyHint: '用你自己的話告訴 Weë——例如「我在家做甜點賣」——我來幫你把它理清楚。',
  createBusiness: '建立我的生意',
  createBusinessGoal: '從零建立我的生意：名稱、賣什麼、賣給誰、賣多少錢',
  editBusiness: '編輯我的生意',
  editBusinessGoal: '檢查並改善我的生意資訊',
  /* 資訊 y no 信息. */
  businessInfo: '生意資訊',
  businessInfoGoal: '整理我的生意資訊：賣什麼、賣給誰、有什麼不一樣',
  businessPlan: 'Business Plan',
  /* 商業計畫書: así se llama en Taiwán el plan de negocio. */
  businessPlanGoal: '寫一份商業計畫書，向投資人介紹我的生意',
  businessCoach: 'Business Coach',
  businessCoachGoal: '這週我的生意該做些什麼？',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: '你還沒有新增產品。',
  productsEmptyHint: '上傳一張照片，Weë 來寫名稱、描述和銷售文案。',
  addProduct: '新增產品',
  addProductGoal: '建立一個產品的資料：名稱、描述、特色和銷售文案',
  improveImage: '優化照片',
  improveImageGoal: '優化我的產品照片，讓它更好賣',
  /* El chino no pluraliza: `_one` no se lee nunca y dice lo mismo que `_other`. */
  productsCount_one: '{{contador}} 個產品',
  productsCount_other: '{{contador}} 個產品',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: '填入你的成本，Weë 給你一個參考價格。',
  pricingMaterials: '材料費',
  pricingPackaging: '包裝費',
  pricingDelivery: '運費',
  pricingOther: '其他成本',
  pricingMargin: '你想要的利潤率',
  /* Estimaciones: se dicen estimaciones, sin excepción. */
  pricingCost: '預估成本',
  pricingSuggested: '建議售價',
  pricingMarginResult: '預估利潤率',
  pricingProfit: '預估利潤',
  pricingNote: '這些價格僅供參考，不構成會計或稅務建議。',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: '讓你的內容看起來始終是你的風格。',
  brandLogo: '品牌 Logo',
  brandColors: '配色',
  /* 字型 y no 字體. */
  brandTypography: '字型',
  brandStyle: '視覺風格',
  /* 大頭貼 y no 頭像. */
  brandAvatar: '大頭貼',
  brandCover: '封面',
  /* 範本 y no 模板. */
  brandTemplates: '內容範本',
  brandGoal: '為我的生意品牌建立{{que}}',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: '告訴我你想推廣什麼，我來準備。',
  createPlaceholder: '例如：我想在母親節推廣這款蛋糕…',
  createTypes: '想創作什麼？',
  typeImage: '圖片',
  typeImageHint: '一張用來推廣的圖片',
  typeVideo: '影片',
  typeVideoHint: '一支短影片',
  typePost: '貼文',
  typePostHint: '寫好就能發布',
  typeCampaign: '行銷活動',
  typeCampaignHint: '一次做出多個內容',
  typeCopy: '文案',
  /* 主題標籤 y 行動呼籲: así se dicen hashtag y call to action en Taiwán. */
  typeCopyHint: '描述、主題標籤和行動呼籲',
  typeGoal: '為我的生意創作{{que}}：{{idea}}',
  formats: '選擇發布形式',
  formatsHint: '尺寸交給 Weë。你只要選它發到哪裡。',
  formatTikTok: 'TikTok',
  /* "Instagram 影片" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma aquí. */
  formatReel: 'Instagram 影片',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: '橫式影片',

  askInvite: '用你自己的話說說，我來處理。',
  askPlaceholder: '在這裡寫下你的想法…',
  askSend: '問問 Weë',

  productCreate: '創作內容',
  goalWithProduct: '{{idea}}——產品：{{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: '創作一次，處處分享。',
  share: '分享',
  shareHint: '會打開手機的分享面板，你想發到哪個應用程式都行。',
  shareToWee: '分享到 Weë',
  shareWall: '我的 Wäll',
  /* 社群 y no 社區: una comunidad de personas en Taiwán es un 社群. */
  shareCommunities: '社群',
  shareProfile: 'Business Profile',
  shareNothing: '先創作些什麼，再從這裡分享出去。',
  shareText: '用 Weë Business 創作',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  /* 資料 y no 數據; 檔案 y no 文件, que en Taiwán es el documento. */
  analyzeUpload: '上傳我的資料',
  analyzeUploadHint: '含有銷售和支出的 Excel、CSV 或 PDF 檔案。',
  analyzeUploadGoal: '分析我生意的銷售和支出檔案',
  analyzeInsights: '我從你的數字裡看到的',
  analyzeInsightsGoal: '跟我說說我生意的銷售到底怎麼樣',
  expenses: '支出',
  expensesHint: '記下你的錢都花在哪裡。',
  expensesEmpty: '你還沒有記錄任何支出。',
  addExpense: '新增支出',
  /* 原物料 y no 原材料. */
  expenseSupplies: '原物料',
  expenseMarketing: '行銷',
  expenseDelivery: '物流',
  expenseStaff: '人事',
  expenseServices: '服務費',
  expenseOther: '其他',
  expensesAsk: '我哪裡花太多了？',
  expensesAskGoal: '檢查我的支出，告訴我哪裡花太多了',
  swot: 'SWOT',
  swotHint: '優勢、劣勢、機會和威脅。',
  swotGoal: '做一份我生意的 SWOT 分析',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: '幫我把生意做大',
  helpMeGrowHint: 'Weë 看過你的生意後，會建議你接下來做什麼。',
  helpMeGrowGoal: '一份讓我的生意成長的計畫，要有具體步驟',
  opportunities: '機會',
  opportunitiesEmpty: '等你有了銷售和內容，我發現的機會就會出現在這裡。',
  createPromotion: '建立促銷活動',
  customerInsights: 'Customer Insights',
  customerInsightsHint: '你在賣給誰，他們需要什麼。',
  customerInsightsGoal: '描述我的理想客戶，以及什麼樣的內容對他們有效',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: '你還能賣什麼，或者怎麼做得不一樣。',
  businessIdeasGoal: '給我一些生意上的點子，以及怎麼做出差異',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  /* 專頁: la página de un negocio en Taiwán es un 專頁. */
  profileEmpty: '你的生意在 Weë 上還沒有專頁。',
  profileEmptyHint: '建立生意之後，專頁就會出現在這裡：你是誰、你賣什麼、怎麼聯絡你。',
  profileAbout: '簡介',
  profileProducts: '產品',
  profilePosts: '貼文',
  profileContact: '聯絡方式',
  reviews: '評價',
  reviewsHint: '客戶怎麼說，還有哪裡可以改進。',
  reviewsGoal: '分析我生意的評價，告訴我哪裡可以改進',
  reviewsRespond: '寫一則回覆',
  reviewsRespondGoal: '給我生意的一則評價寫一段專業的回覆',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: '用 Weë Credits 觸及更多人',
  promoteHint: '你的內容會在 Weë 裡展示給更多人。花掉任何 Credits 之前，你都會先看到要花多少。',
  promoteSoon: '在 Weë 裡推廣還沒有開放。開放之後會用你的 Credits 支付，你在這裡就能看到。',
  promoteCredits: '查看我的 Credits',
  sampleProductName: '產品 {{numero}}',
};
