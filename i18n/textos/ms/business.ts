/*
 * MALAYO — Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Bahasa Melayu estándar (DBP), trato «anda». «Negocio» es «perniagaan», «publicación» es «siaran» y «compartir»,
 * «kongsi» (glosario). Los nombres de producto que el español deja en inglés (Business Plan, Business Coach, Pricing
 * Assistant, Brand Kit, SWOT, Customer Insights, Business Ideas, Business Profile, TikTok, Instagram Story…) se quedan
 * tal cual. Los objetivos que viajan a Weë Brain («…Goal») van en primera persona («saya»), como en el español.
 * El plural malayo solo tiene «other»: las dos formas son idénticas y llevan {{contador}}.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Media sosial saya',
  manageAccounts: 'Urus akaun',
  connected: 'Disambungkan',
  networkConnected: '{{red}} disambungkan',
  connectAnother: 'Sambungkan rangkaian lain',
  allConnected: 'Semua media sosial anda sudah disambungkan.',
  simulatedConnection: 'Sambungan simulasi: Weë belum menyiarkan atau membalas bagi pihak anda. Ia menyediakan setiap bahan untuk anda semak dan siarkan sendiri.',
  postCalendar: 'Kalendar siaran',
  seeFullCalendar: 'Lihat kalendar penuh',
  calendarGoal: 'Lihat dan susun kalendar siaran saya untuk minggu ini',
  scheduleGoal: 'Jadualkan siaran untuk {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Mesej pelanggan',
  seeAllMessages: 'Lihat semua',
  messagesGoal: 'Membalas mesej pelanggan saya',
  reply: 'Balas',
  replied: 'Dibalas',
  replyTo: 'Balas kepada {{nombre}}',
  repliedTo: 'Dibalas kepada {{nombre}}',
  replyGoal: 'Balas kepada {{nombre}} di {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Keputusan minggu ini',
  statPosts: 'Siaran',
  statReach: 'Orang dicapai',
  statInteractions: 'Interaksi',
  statMessages: 'Mesej diterima',
  onTrack: 'Perniagaan anda di landasan yang betul',
  onTrackNote: 'Interaksi meningkat 60% minggu ini. Teruskan!',
  seeDetailedAnalysis: 'Lihat analisis terperinci',
  analysisGoal: 'Menganalisis keputusan perniagaan saya minggu ini',
  shortcutIdeas: 'Idea',
  shortcutIdeasGoal: 'Idea dan strategi untuk mengembangkan perniagaan saya',
  shortcutMarketing: 'Pemasaran',
  shortcutMarketingGoal: 'Kempen pemasaran untuk perniagaan saya',
  shortcutSocial: 'Media sosial',
  shortcutSocialGoal: 'Mencipta kandungan untuk media sosial perniagaan saya',
  shortcutAnalyze: 'Analisis',
  shortcutAnalyzeGoal: 'Menganalisis keputusan perniagaan saya',
  shortcutDocuments: 'Dokumen',
  shortcutDocumentsGoal: 'Menulis dokumen untuk perniagaan saya',
  shortcutSell: 'Jual lebih banyak',
  shortcutSellGoal: 'Menjual lebih banyak bulan ini dalam perniagaan saya',
  shortcutCareer: 'Kerja dan kerjaya',
  shortcutCareerGoal: 'Memperbaiki CV dan profil profesional saya',
  yesterday: 'Semalam',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en los dos idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Fesyen, gaya, kecantikan dan penciptaan kandungan visual.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Bina dan urus perniagaan anda',
  modProductsHint: 'Produk anda dan harganya',
  modCreateHint: 'Cipta kandungan dengan AI',
  modSocialHint: 'Sediakan dan kongsi di mana-mana',
  modAnalyzeHint: 'Fahami perniagaan anda',
  modGrowHint: 'Cari peluang dan berkembang',
  modProfileHint: 'Perniagaan anda di dalam Weë',
  modPromoteHint: 'Capai lebih ramai orang dengan Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Ringkasan perniagaan anda',
  overviewEmpty: 'Anda belum mencipta perniagaan anda.',
  overviewEmptyHint: 'Ceritakan kepada Weë dengan kata-kata anda sendiri —“saya menjual pencuci mulut dari rumah”— dan saya bantu membentuknya.',
  createBusiness: 'Cipta perniagaan saya',
  createBusinessGoal: 'Mencipta perniagaan saya dari awal: nama, apa yang saya jual, kepada siapa dan pada harga berapa',
  editBusiness: 'Sunting perniagaan saya',
  editBusinessGoal: 'Menyemak dan memperbaiki maklumat perniagaan saya',
  businessInfo: 'Maklumat perniagaan',
  businessInfoGoal: 'Menyusun maklumat perniagaan saya: apa yang saya jual, kepada siapa dan apa yang membezakan saya',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Menulis pelan perniagaan untuk membentangkan perniagaan saya kepada pelabur',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Apa yang patut saya lakukan minggu ini dalam perniagaan saya?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Anda belum menambah sebarang produk.',
  productsEmptyHint: 'Muat naik foto dan Weë menulis nama, penerangan dan teks untuk menjualnya.',
  addProduct: 'Tambah produk',
  addProductGoal: 'Mencipta maklumat produk: nama, penerangan, ciri-ciri dan teks untuk menjualnya',
  improveImage: 'Tingkatkan foto',
  improveImageGoal: 'Menambah baik foto produk saya untuk menjualnya dengan lebih baik',
  productsCount_one: '{{contador}} produk',
  productsCount_other: '{{contador}} produk',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Masukkan kos anda dan Weë memberikan harga rujukan.',
  pricingMaterials: 'Bahan',
  pricingPackaging: 'Pembungkusan',
  pricingDelivery: 'Penghantaran',
  pricingOther: 'Kos lain',
  pricingMargin: 'Margin yang anda mahu',
  pricingCost: 'Anggaran kos',
  pricingSuggested: 'Harga dicadangkan',
  pricingMarginResult: 'Anggaran margin',
  pricingProfit: 'Anggaran keuntungan',
  pricingNote: 'Harga ini hanya rujukan untuk makluman dan bukan nasihat perakaunan atau cukai.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Apa yang membuatkan kandungan anda sentiasa kelihatan milik anda.',
  brandLogo: 'Logo',
  brandColors: 'Warna',
  brandTypography: 'Tipografi',
  brandStyle: 'Gaya visual',
  brandAvatar: 'Gambar profil',
  brandCover: 'Muka depan',
  brandTemplates: 'Templat kandungan',
  brandGoal: 'Mencipta {{que}} untuk jenama perniagaan saya',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Beritahu saya apa yang anda mahu promosikan dan saya sediakan.',
  createPlaceholder: 'Contoh: Saya mahu promosikan kek ini untuk Hari Ibu…',
  createTypes: 'Apa yang anda mahu cipta?',
  typeImage: 'Imej',
  typeImageHint: 'Imej untuk promosi',
  typeVideo: 'Video',
  typeVideoHint: 'Video pendek',
  typePost: 'Siaran',
  typePostHint: 'Sedia untuk disiarkan',
  typeCampaign: 'Kempen',
  typeCampaignHint: 'Beberapa bahan sekali gus',
  typeCopy: 'Teks',
  typeCopyHint: 'Penerangan, hashtag dan seruan bertindak',
  typeGoal: 'Mencipta {{que}} untuk perniagaan saya: {{idea}}',
  formats: 'Pilih format anda',
  formatsHint: 'Weë uruskan saiznya. Anda pilih ke mana ia pergi.',
  formatTikTok: 'TikTok',
  /* "Video de Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Video Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Video melintang',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Ceritakan dengan kata-kata anda sendiri dan saya uruskan.',
  askPlaceholder: 'Tulis di sini…',
  askSend: 'Tanya Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Cipta kandungan',
  goalWithProduct: '{{idea}} — produk: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Cipta sekali. Kongsi di mana-mana.',
  share: 'Kongsi',
  shareHint: 'Menu kongsi telefon anda akan dibuka: pilih apl yang anda mahu.',
  shareToWee: 'Kongsi di Weë',
  shareWall: 'Wäll saya',
  shareCommunities: 'Komuniti',
  shareProfile: 'Business Profile',
  shareNothing: 'Cipta sesuatu dahulu, kemudian kongsikannya dari sini.',
  shareText: 'Dicipta dengan Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Muat naik data saya',
  analyzeUploadHint: 'Excel, CSV atau PDF dengan jualan dan perbelanjaan anda.',
  analyzeUploadGoal: 'Menganalisis fail jualan dan perbelanjaan perniagaan saya',
  analyzeInsights: 'Apa yang saya lihat dalam angka anda',
  analyzeInsightsGoal: 'Menerangkan kepada saya apa yang berlaku dengan jualan perniagaan saya',
  expenses: 'Perbelanjaan',
  expensesHint: 'Catat ke mana wang anda pergi.',
  expensesEmpty: 'Anda belum mencatat sebarang perbelanjaan.',
  addExpense: 'Tambah perbelanjaan',
  expenseSupplies: 'Bekalan',
  expenseMarketing: 'Pemasaran',
  expenseDelivery: 'Penghantaran',
  expenseStaff: 'Kakitangan',
  expenseServices: 'Perkhidmatan',
  expenseOther: 'Lain-lain',
  expensesAsk: 'Di mana saya berbelanja berlebihan?',
  expensesAskGoal: 'Menyemak perbelanjaan saya dan memberitahu di mana saya berbelanja berlebihan',
  swot: 'SWOT',
  swotHint: 'Kekuatan, kelemahan, peluang dan ancaman.',
  swotGoal: 'Membuat analisis SWOT perniagaan saya',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Bantu saya berkembang',
  helpMeGrowHint: 'Weë melihat perniagaan anda dan mencadangkan apa yang perlu dilakukan.',
  helpMeGrowGoal: 'Pelan untuk mengembangkan perniagaan saya, dengan langkah-langkah konkrit',
  opportunities: 'Peluang',
  opportunitiesEmpty: 'Apabila anda sudah ada jualan dan kandungan, peluang yang saya nampak akan muncul di sini.',
  createPromotion: 'Cipta promosi',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kepada siapa anda menjual dan apa yang mereka perlukan.',
  customerInsightsGoal: 'Menggambarkan pelanggan ideal saya dan mesej yang berkesan untuk mereka',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Apa lagi yang boleh anda jual atau cara untuk membezakan diri.',
  businessIdeasGoal: 'Memberi saya idea untuk perniagaan saya dan untuk membezakan diri',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Perniagaan anda belum mempunyai halaman di Weë.',
  profileEmptyHint: 'Apabila anda mencipta perniagaan anda, halamannya akan berada di sini: siapa anda, apa yang anda jual dan cara menghubungi anda.',
  profileAbout: 'Perihal',
  profileProducts: 'Produk',
  profilePosts: 'Siaran',
  profileContact: 'Hubungi',
  reviews: 'Ulasan',
  reviewsHint: 'Apa kata pelanggan anda dan apa yang perlu diperbaiki.',
  reviewsGoal: 'Menganalisis ulasan perniagaan saya dan memberitahu apa yang perlu diperbaiki',
  reviewsRespond: 'Tulis balasan',
  reviewsRespondGoal: 'Menulis balasan profesional kepada ulasan tentang perniagaan saya',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Capai lebih ramai orang dengan Weë Credits',
  promoteHint: 'Kandungan anda ditunjukkan kepada lebih ramai orang di dalam Weë. Sebelum berbelanja apa-apa, anda akan melihat kosnya.',
  promoteSoon: 'Promosi di dalam Weë belum dibuka. Apabila dibuka, ia dibayar dengan Credits anda dan anda akan melihatnya di sini.',
  promoteCredits: 'Lihat Credits saya',
  sampleProductName: 'Produk {{numero}}',
};
