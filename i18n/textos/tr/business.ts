/*
 * TURCO — Weë Business: la pantalla del negocio, sus ocho módulos y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Lo que representa al negocio de la
 * persona —nombres de cuentas, arrobas, títulos de publicaciones y mensajes de sus clientes— no pasa por aquí.
 *
 * «Negocio» es «işletme», como el İşletme Profili de Google y la cuenta de empresa de Instagram; «cliente» es
 * «müşteri»; conectar una red es «hesap bağlamak». Los nombres de los ocho módulos (My Business, Products & Catalog…)
 * son de producto, viven en `constants/businessModules.ts` y no pasan por el traductor; por eso «Business Profile» se
 * queda igual cuando es un destino para compartir: es el nombre que la persona ve en la tarjeta del módulo. Los
 * NOMBRES de las funciones de dentro —Business Plan, Business Coach, Pricing Assistant, Brand Kit, Customer
 * Insights, Business Ideas— también son de producto y se escriben igual en todos los idiomas, como Weë Studio
 * (decisión del usuario, 2026-09-16); lo que hace cada una sí se traduce, en su pista. «SWOT» se queda como sigla:
 * «SWOT analizi». «Crear mi negocio» es «kurmak», como se monta un negocio o una tienda en turco («İşletmeni kur»).
 *
 * Los «…Goal» son lo que la persona le pide a Weë Brain: aparecen como su propio mensaje en la conversación y acaban
 * siendo el título del trabajo. En turco se piden como se le piden las cosas a un asistente —imperativo de «sen»:
 * «… analiz et», «… yaz»—; los que en español son un sustantivo o una pregunta se quedan así. Ninguno lleva un sufijo
 * pegado a un hueco: «{{nombre}} adlı müşteriye», «{{red}} üzerinden», «(ürün: {{producto}})», y «{{que}} oluştur»,
 * donde el objeto indefinido no lleva caso.
 *
 * El día va detrás de la fecha, como lo escribe `Intl` en turco: «30 Eyl Çar». El dinero, con la norma de la TDK:
 * «kâr» (el beneficio; «kar» es la nieve) y «resmî». El gasto «Servicios» es el de luz, agua e internet (su icono es un
 * rayo): «Faturalar». Las reseñas son «Değerlendirmeler» y no «yorumlar», que en Weë son los comentarios. «Story» es
 * «hikâye», con el circunflejo de la TDK aunque Instagram lo quite; y «Video de Instagram», nunca «Reels».
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Sosyal medya hesaplarım',
  manageAccounts: 'Hesapları yönet',
  connected: 'Bağlı',
  networkConnected: '{{red}} bağlı',
  connectAnother: 'Başka bir hesap bağla',
  allConnected: 'Tüm hesapların zaten bağlı.',
  simulatedConnection: 'Bu bağlantı şimdilik bir simülasyon. Platformlar resmî izinleri verdiğinde Weë gerçekten paylaşım yapacak ve yanıt verecek.',
  postCalendar: 'Gönderi takvimi',
  seeFullCalendar: 'Takvimin tamamını gör',
  calendarGoal: 'Bu haftaki gönderi takvimimi göster ve düzenle',
  scheduleGoal: '{{fecha}} {{dia}} için bir gönderi planla: {{publicacion}}',
  dayLabel: '{{fecha}} {{dia}}',
  customerMessages: 'Müşteri mesajları',
  seeAllMessages: 'Tümünü gör',
  messagesGoal: 'Müşterilerimin mesajlarını yanıtla',
  reply: 'Yanıtla',
  replied: 'Yanıtlandı',
  replyTo: 'Yanıtla: {{nombre}}',
  repliedTo: 'Yanıtlandı: {{nombre}}',
  replyGoal: '{{red}} üzerinden {{nombre}} adlı müşteriye yanıt ver: “{{mensaje}}”',
  resultsThisWeek: 'Bu haftanın sonuçları',
  statPosts: 'Gönderiler',
  statReach: 'Erişilen kişiler',
  statInteractions: 'Etkileşimler',
  statMessages: 'Gelen mesajlar',
  onTrack: 'İşletmen doğru yolda',
  onTrackNote: 'Etkileşimler bu hafta %60 arttı. Böyle devam et!',
  seeDetailedAnalysis: 'Ayrıntılı analizi gör',
  analysisGoal: 'İşletmemin bu haftaki sonuçlarını analiz et',
  shortcutIdeas: 'Fikirler',
  shortcutIdeasGoal: 'İşletmemi büyütmek için fikirler ve strateji',
  shortcutMarketing: 'Pazarlama',
  shortcutMarketingGoal: 'İşletmem için bir pazarlama kampanyası',
  shortcutSocial: 'Sosyal medya',
  shortcutSocialGoal: 'İşletmemin sosyal medya hesapları için içerik oluştur',
  shortcutAnalyze: 'Analiz et',
  shortcutAnalyzeGoal: 'İşletmemin sonuçlarını analiz et',
  shortcutDocuments: 'Belgeler',
  shortcutDocumentsGoal: 'İşletmem için bir belge hazırla',
  shortcutSell: 'Daha çok sat',
  shortcutSellGoal: 'Bu ay işletmemde daha çok satmama yardım et',
  shortcutCareer: 'İş ve kariyer',
  shortcutCareerGoal: 'Özgeçmişimi ve profesyonel profilimi geliştir',
  yesterday: 'Dün',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: 'İşletmeni kur, yönet, tanıt ve büyüt.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'İşletmeni kur ve yönet',
  modProductsHint: 'Ürünlerin ve fiyatları',
  modCreateHint: 'Yapay zekâ ile içerik oluştur',
  modSocialHint: 'Hazırla ve her yerde paylaş',
  modAnalyzeHint: 'İşletmeni daha iyi anla',
  modGrowHint: 'Fırsatları bul ve büyü',
  modProfileHint: 'Weë\'deki işletmen',
  modPromoteHint: 'Weë ile daha çok kişiye ulaş',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Genel bakış» y no «İşletmen»: «Tu negocio» es el nombre de una de las cuentas de muestra. */
  overview: 'İşletmene genel bakış',
  overviewEmpty: 'Henüz işletmeni kurmadın.',
  overviewEmptyHint: 'Weë\'ye kendi sözlerinle anlat (örneğin “evden tatlı satıyorum”), birlikte şekillendirelim.',
  createBusiness: 'İşletmemi kur',
  createBusinessGoal: 'İşletmemi sıfırdan kur: adı, ne satacağım, kime ve hangi fiyata',
  editBusiness: 'İşletmemi düzenle',
  editBusinessGoal: 'İşletme bilgilerimi gözden geçir ve iyileştir',
  businessInfo: 'İşletme bilgileri',
  businessInfoGoal: 'İşletme bilgilerimi toparla: ne sattığım, kime sattığım ve beni farklı kılan şey',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'İşletmemi bir yatırımcıya sunmak için iş planı yaz',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Bu hafta işletmem için ne yapmalıyım?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Henüz ürün eklemedin.',
  productsEmptyHint: 'Bir fotoğraf yükle, Weë de ürünün adını, açıklamasını ve satış metnini yazsın.',
  addProduct: 'Ürün ekle',
  addProductGoal: 'Bir ürün sayfası oluştur: ad, açıklama, özellikler ve satış metni',
  improveImage: 'Fotoğrafı iyileştir',
  improveImageGoal: 'Daha iyi satması için ürünümün fotoğrafını iyileştir',
  productsCount_one: '{{contador}} ürün',
  productsCount_other: '{{contador}} ürün',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Maliyetlerini gir, Weë sana referans bir fiyat önersin.',
  pricingMaterials: 'Malzeme',
  pricingPackaging: 'Ambalaj',
  pricingDelivery: 'Kargo',
  pricingOther: 'Diğer maliyetler',
  pricingMargin: 'İstediğin kâr marjı',
  pricingCost: 'Tahmini maliyet',
  pricingSuggested: 'Önerilen fiyat',
  pricingMarginResult: 'Tahmini kâr marjı',
  pricingProfit: 'Tahmini kâr',
  pricingNote: 'Fiyatlar yalnızca bilgi amaçlı bir referanstır; muhasebe veya vergi danışmanlığı yerine geçmez.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'İçeriğinin her zaman sana özgü görünmesini sağlayan her şey.',
  brandLogo: 'Logo',
  brandColors: 'Renkler',
  brandTypography: 'Tipografi',
  brandStyle: 'Görsel stil',
  brandAvatar: 'Profil görseli',
  brandCover: 'Kapak görseli',
  brandTemplates: 'İçerik şablonları',
  brandGoal: 'İşletmemin markası için {{que}} oluştur',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Ne tanıtmak istediğini anlat, ben hazırlayayım.',
  createPlaceholder: 'Örnek: Bu pastayı Anneler Günü için tanıtmak istiyorum…',
  createTypes: 'Ne oluşturmak istiyorsun?',
  typeImage: 'Görsel',
  typeImageHint: 'Tanıtım için bir görsel',
  typeVideo: 'Video',
  typeVideoHint: 'Kısa bir video',
  typePost: 'Gönderi',
  typePostHint: 'Paylaşmaya hazır',
  typeCampaign: 'Kampanya',
  typeCampaignHint: 'Aynı anda birkaç içerik',
  typeCopy: 'Metinler',
  typeCopyHint: 'Açıklama, etiketler ve harekete geçirici mesaj',
  typeGoal: 'İşletmem için {{que}} oluştur: {{idea}}',
  formats: 'Formatını seç',
  formatsHint: 'Boyutu Weë ayarlar. Nerede paylaşılacağını sen seç.',
  formatTikTok: 'TikTok videosu',
  /* «Instagram videosu» y no «Reels»: en Weë los videos cortos son Weëls (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram videosu',
  formatStory: 'Instagram hikâyesi',
  formatFacebookStory: 'Facebook hikâyesi',
  formatPost: 'Instagram gönderisi',
  formatFeed: 'Facebook gönderisi',
  formatWide: 'Yatay video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Kendi sözlerinle anlat, gerisini ben hallederim.',
  askPlaceholder: 'Buraya yaz…',
  askSend: 'Weë\'ye sor',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'İçerik oluştur',
  goalWithProduct: '{{idea}} (ürün: {{producto}})',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Bir kez oluştur. Her yerde paylaş.',
  share: 'Paylaş',
  shareHint: 'Telefonunun paylaşım menüsü açılır: İstediğin uygulamayı seç.',
  shareToWee: 'Weë\'de paylaş',
  shareWall: 'Wäll sayfam',
  shareCommunities: 'Topluluklar',
  shareProfile: 'Business Profile',
  shareNothing: 'Önce bir şey oluştur, sonra buradan paylaş.',
  shareText: 'Weë Business ile oluşturuldu',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Verilerimi yükle',
  analyzeUploadHint: 'Satışlarını ve giderlerini içeren Excel, CSV ya da PDF dosyası.',
  analyzeUploadGoal: 'İşletmemin satış ve gider dosyasını analiz et',
  analyzeInsights: 'Rakamlarında gördüklerim',
  analyzeInsightsGoal: 'İşletmemin satışlarında neler olduğunu bana açıkla',
  expenses: 'Giderler',
  expensesHint: 'Paranın nereye gittiğini not et.',
  expensesEmpty: 'Henüz gider eklemedin.',
  addExpense: 'Gider ekle',
  expenseSupplies: 'Malzeme',
  expenseMarketing: 'Pazarlama',
  expenseDelivery: 'Kargo',
  expenseStaff: 'Personel',
  expenseServices: 'Faturalar',
  expenseOther: 'Diğer',
  expensesAsk: 'Nereye fazla harcıyorum?',
  expensesAskGoal: 'Giderlerimi incele ve nereye fazla harcadığımı söyle',
  swot: 'SWOT analizi',
  swotHint: 'Güçlü yönler, zayıf yönler, fırsatlar ve tehditler.',
  swotGoal: 'İşletmemin SWOT analizini yap',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Büyümeme yardım et',
  helpMeGrowHint: 'Weë işletmene bakar ve ne yapabileceğini önerir.',
  helpMeGrowGoal: 'İşletmemi büyütmek için somut adımlar içeren bir plan',
  opportunities: 'Fırsatlar',
  opportunitiesEmpty: 'Satışların ve içeriklerin olduğunda, fark ettiğim fırsatlar burada görünecek.',
  createPromotion: 'Kampanyayı oluştur',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kime sattığın ve neye ihtiyaç duyduğu.',
  customerInsightsGoal: 'İdeal müşterimi tanımla ve ona hangi mesajların işe yaradığını söyle',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Başka neler satabileceğin ya da nasıl öne çıkabileceğin.',
  businessIdeasGoal: 'İşletmem için fikir ver ve nasıl öne çıkabileceğimi söyle',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'İşletmenin henüz Weë\'de bir sayfası yok.',
  profileEmptyHint: 'İşletmeni kurduğunda sayfası burada olacak: kim olduğun, ne sattığın ve sana nasıl ulaşılacağı.',
  profileAbout: 'Hakkında',
  profileProducts: 'Ürünler',
  profilePosts: 'Gönderiler',
  profileContact: 'İletişim',
  reviews: 'Değerlendirmeler',
  reviewsHint: 'Müşterilerinin ne dediği ve neyi iyileştirebileceğin.',
  reviewsGoal: 'İşletmemin değerlendirmelerini analiz et ve neyi iyileştirmem gerektiğini söyle',
  reviewsRespond: 'Yanıt yaz',
  reviewsRespondGoal: 'İşletmeme gelen bir değerlendirmeye profesyonel bir yanıt yaz',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Weë Credits ile daha çok kişiye ulaş',
  promoteHint: 'İçeriğin Weë\'de daha çok kişiye gösterilir. Bir şey harcamadan önce ne kadar tutacağını görürsün.',
  promoteSoon: 'Weë\'de tanıtım henüz açık değil. Açıldığında burada görünecek ve ödemesi Credits bakiyenden yapılacak.',
  promoteCredits: 'Credits bakiyemi gör',
  sampleProductName: 'Ürün {{numero}}',
};
