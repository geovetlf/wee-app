/*
 * INDONESIO — Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato «Anda»; la persona habla de «bisnis saya». Los objetivos que lee Weë Brain («Analizar…», «Crear…») van
 * en forma «me-» («Menganalisis…», «Membuat…»), que es como el indonesio enuncia una tarea; los botones, en verbo
 * base («Buat», «Tambah», «Balas»). «Publicación» es «postingan» (glosario); «marketing» es «pemasaran».
 *
 * Los nombres de producto que el español deja en inglés no cambian: Business Plan, Business Coach, Pricing
 * Assistant, Brand Kit, Customer Insights, Business Ideas, Business Profile, SWOT, TikTok, Instagram Story, Facebook
 * Story, Instagram Post, Excel, CSV, PDF, CV. El plural indonesio no cambia la palabra: «{{contador}} produk» en las
 * dos formas.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Media sosial saya',
  manageAccounts: 'Kelola akun',
  connected: 'Terhubung',
  networkConnected: '{{red}} terhubung',
  connectAnother: 'Hubungkan media sosial lain',
  allConnected: 'Semua media sosial Anda sudah terhubung.',
  simulatedConnection: 'Koneksi simulasi: Weë belum memposting atau membalas atas nama Anda. Setiap konten disiapkan agar Anda yang meninjau dan menerbitkannya.',
  postCalendar: 'Kalender postingan',
  seeFullCalendar: 'Lihat kalender lengkap',
  calendarGoal: 'Melihat dan mengatur kalender postingan saya minggu ini',
  scheduleGoal: 'Menjadwalkan postingan untuk {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Pesan pelanggan',
  seeAllMessages: 'Lihat semua',
  messagesGoal: 'Membalas pesan dari pelanggan saya',
  reply: 'Balas',
  replied: 'Dibalas',
  replyTo: 'Balas {{nombre}}',
  repliedTo: 'Sudah membalas {{nombre}}',
  replyGoal: 'Membalas {{nombre}} di {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Hasil minggu ini',
  statPosts: 'Postingan',
  statReach: 'Orang yang dijangkau',
  statInteractions: 'Interaksi',
  statMessages: 'Pesan diterima',
  onTrack: 'Bisnis Anda di jalur yang tepat',
  onTrackNote: 'Interaksi naik 60% minggu ini. Pertahankan!',
  seeDetailedAnalysis: 'Lihat analisis mendetail',
  analysisGoal: 'Menganalisis hasil bisnis saya minggu ini',
  shortcutIdeas: 'Ide',
  shortcutIdeasGoal: 'Ide dan strategi untuk mengembangkan bisnis saya',
  shortcutMarketing: 'Pemasaran',
  shortcutMarketingGoal: 'Kampanye pemasaran untuk bisnis saya',
  shortcutSocial: 'Media sosial',
  shortcutSocialGoal: 'Membuat konten untuk media sosial bisnis saya',
  shortcutAnalyze: 'Analisis',
  shortcutAnalyzeGoal: 'Menganalisis hasil bisnis saya',
  shortcutDocuments: 'Dokumen',
  shortcutDocumentsGoal: 'Menyusun dokumen untuk bisnis saya',
  shortcutSell: 'Jual lebih banyak',
  shortcutSellGoal: 'Menjual lebih banyak bulan ini di bisnis saya',
  shortcutCareer: 'Kerja dan karier',
  shortcutCareerGoal: 'Memperbaiki CV dan profil profesional saya',
  yesterday: 'Kemarin',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en los dos idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Fashion, gaya, kecantikan, dan pembuatan konten visual.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Bangun dan kelola bisnis Anda',
  modProductsHint: 'Produk Anda dan harganya',
  modCreateHint: 'Buat konten dengan AI',
  modSocialHint: 'Siapkan dan bagikan ke mana saja',
  modAnalyzeHint: 'Pahami bisnis Anda',
  modGrowHint: 'Temukan peluang dan berkembanglah',
  modProfileHint: 'Bisnis Anda di dalam Weë',
  modPromoteHint: 'Jangkau lebih banyak orang dengan Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Ringkasan bisnis Anda',
  overviewEmpty: 'Anda belum membuat bisnis.',
  overviewEmptyHint: 'Ceritakan kepada Weë dengan kata-kata Anda sendiri —"saya jual kue dari rumah"— dan saya bantu membentuknya.',
  createBusiness: 'Buat bisnis saya',
  createBusinessGoal: 'Membuat bisnis saya dari nol: nama, apa yang saya jual, kepada siapa, dan dengan harga berapa',
  editBusiness: 'Edit bisnis saya',
  editBusinessGoal: 'Meninjau dan menyempurnakan informasi bisnis saya',
  businessInfo: 'Informasi bisnis',
  businessInfoGoal: 'Merapikan informasi bisnis saya: apa yang saya jual, kepada siapa, dan apa keunggulan saya',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Menulis rencana bisnis untuk mempresentasikan bisnis saya kepada investor',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Apa yang sebaiknya saya lakukan minggu ini di bisnis saya?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Anda belum menambahkan produk.',
  productsEmptyHint: 'Unggah foto dan Weë menuliskan nama, deskripsi, dan teks untuk menjualnya.',
  addProduct: 'Tambah produk',
  addProductGoal: 'Membuat kartu produk: nama, deskripsi, fitur, dan teks untuk menjualnya',
  improveImage: 'Perbaiki foto',
  improveImageGoal: 'Memperbaiki foto produk saya agar lebih laku',
  productsCount_one: '{{contador}} produk',
  productsCount_other: '{{contador}} produk',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Masukkan biaya Anda dan Weë memberi harga acuan.',
  pricingMaterials: 'Bahan',
  pricingPackaging: 'Kemasan',
  pricingDelivery: 'Pengiriman',
  pricingOther: 'Biaya lain',
  pricingMargin: 'Margin yang Anda inginkan',
  pricingCost: 'Perkiraan biaya',
  pricingSuggested: 'Harga yang disarankan',
  pricingMarginResult: 'Perkiraan margin',
  pricingProfit: 'Perkiraan keuntungan',
  pricingNote: 'Harga hanya acuan informatif dan bukan nasihat akuntansi atau perpajakan.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Yang membuat konten Anda selalu terlihat khas Anda.',
  brandLogo: 'Logo',
  brandColors: 'Warna',
  brandTypography: 'Tipografi',
  brandStyle: 'Gaya visual',
  brandAvatar: 'Foto profil',
  brandCover: 'Sampul',
  brandTemplates: 'Templat konten',
  brandGoal: 'Membuat {{que}} untuk merek bisnis saya',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Ceritakan apa yang ingin Anda promosikan dan saya siapkan.',
  createPlaceholder: 'Contoh: Saya ingin mempromosikan kue ini untuk Hari Ibu…',
  createTypes: 'Apa yang ingin Anda buat?',
  typeImage: 'Gambar',
  typeImageHint: 'Gambar untuk promosi',
  typeVideo: 'Video',
  typeVideoHint: 'Video pendek',
  typePost: 'Postingan',
  typePostHint: 'Siap diterbitkan',
  typeCampaign: 'Kampanye',
  typeCampaignHint: 'Beberapa konten sekaligus',
  typeCopy: 'Teks',
  typeCopyHint: 'Deskripsi, tagar, dan ajakan bertindak',
  typeGoal: 'Membuat {{que}} untuk bisnis saya: {{idea}}',
  formats: 'Pilih format Anda',
  formatsHint: 'Weë mengurus ukurannya. Anda memilih ke mana tujuannya.',
  formatTikTok: 'TikTok',
  /* "Video de Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Video Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Video horizontal',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Ceritakan dengan kata-kata Anda sendiri dan saya yang urus.',
  askPlaceholder: 'Tulis di sini…',
  askSend: 'Tanya Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Buat konten',
  goalWithProduct: '{{idea}} — produk: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Buat sekali. Bagikan ke mana saja.',
  share: 'Bagikan',
  shareHint: 'Menu berbagi ponsel Anda akan terbuka: pilih aplikasi yang Anda mau.',
  shareToWee: 'Bagikan di Weë',
  shareWall: 'Wäll saya',
  shareCommunities: 'Komunitas',
  shareProfile: 'Business Profile',
  shareNothing: 'Buat sesuatu dulu, lalu bagikan dari sini.',
  shareText: 'Dibuat dengan Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Unggah data saya',
  analyzeUploadHint: 'Excel, CSV, atau PDF berisi penjualan dan pengeluaran Anda.',
  analyzeUploadGoal: 'Menganalisis file penjualan dan pengeluaran bisnis saya',
  analyzeInsights: 'Yang saya lihat di angka Anda',
  analyzeInsightsGoal: 'Menjelaskan apa yang terjadi dengan penjualan bisnis saya',
  expenses: 'Pengeluaran',
  expensesHint: 'Catat ke mana saja uang Anda digunakan.',
  expensesEmpty: 'Anda belum mencatat pengeluaran.',
  addExpense: 'Tambah pengeluaran',
  expenseSupplies: 'Bahan baku',
  expenseMarketing: 'Pemasaran',
  expenseDelivery: 'Pengiriman',
  expenseStaff: 'Karyawan',
  expenseServices: 'Layanan',
  expenseOther: 'Lainnya',
  expensesAsk: 'Di mana pengeluaran saya berlebihan?',
  expensesAskGoal: 'Meninjau pengeluaran saya dan memberi tahu di mana pengeluaran saya berlebihan',
  swot: 'SWOT',
  swotHint: 'Kekuatan, kelemahan, peluang, dan ancaman.',
  swotGoal: 'Membuat analisis SWOT bisnis saya',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Bantu saya berkembang',
  helpMeGrowHint: 'Weë melihat bisnis Anda dan mengusulkan apa yang perlu dilakukan.',
  helpMeGrowGoal: 'Rencana untuk mengembangkan bisnis saya, dengan langkah konkret',
  opportunities: 'Peluang',
  opportunitiesEmpty: 'Saat Anda sudah punya penjualan dan konten, peluang yang saya lihat akan muncul di sini.',
  createPromotion: 'Buat promosi',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kepada siapa Anda menjual dan apa yang mereka butuhkan.',
  customerInsightsGoal: 'Menggambarkan pelanggan ideal saya dan pesan apa yang berhasil untuk mereka',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Apa lagi yang bisa Anda jual atau bagaimana tampil beda.',
  businessIdeasGoal: 'Memberi saya ide untuk bisnis saya dan cara tampil beda',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Bisnis Anda belum punya halaman di Weë.',
  profileEmptyHint: 'Saat Anda membuat bisnis, halamannya akan ada di sini: siapa Anda, apa yang Anda jual, dan cara menghubungi Anda.',
  profileAbout: 'Tentang',
  profileProducts: 'Produk',
  profilePosts: 'Postingan',
  profileContact: 'Kontak',
  reviews: 'Ulasan',
  reviewsHint: 'Apa kata pelanggan Anda dan apa yang perlu diperbaiki.',
  reviewsGoal: 'Menganalisis ulasan bisnis saya dan memberi tahu apa yang perlu diperbaiki',
  reviewsRespond: 'Tulis balasan',
  reviewsRespondGoal: 'Menulis balasan profesional untuk sebuah ulasan bisnis saya',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Jangkau lebih banyak orang dengan Weë Credits',
  promoteHint: 'Konten Anda ditampilkan ke lebih banyak orang di dalam Weë. Sebelum mengeluarkan apa pun, Anda akan melihat biayanya.',
  promoteSoon: 'Promosi di dalam Weë belum dibuka. Saat sudah dibuka, pembayarannya dengan Credits Anda dan Anda akan melihatnya di sini.',
  promoteCredits: 'Lihat Credits saya',
  sampleProductName: 'Produk {{numero}}',
};
