/*
 * TURCO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Unirse es «Katıl» y salir, «Ayrıl»; estar dentro, «Katıldın». El nombre de una comunidad lo
 * escribe una persona: entra por `{{nombre}}` y el sufijo lo lleva siempre «topluluk», nunca el
 * hueco («“{{nombre}}” topluluğundan», «{{nombre}} topluluğu»). `defaultDescription` se GUARDA
 * como descripción cuando quien crea la comunidad no escribe ninguna. «Oficial» es «Resmî», con el
 * circunflejo de la TDK. Los buscadores siguen el patrón «… ara» de la guía (§ 8). `members` y
 * `posts` son la etiqueta bajo la cifra y van en minúscula, como en español; con la cifra, el
 * sustantivo en singular: «{{contador}} üye», «{{contador}} gönderi».
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Topluluk oluştur',
  searchPlaceholder: 'Topluluk ara',
  loading: 'Topluluklar yükleniyor…',

  joinedSection: 'Katıldığın topluluklar',
  discoverSection: 'Toplulukları keşfet',

  official: 'Resmî',
  members_one: '{{contador}} üye',
  members_other: '{{contador}} üye',
  memberOf: 'Katıldın',
  join: 'Katıl',

  leaveTitle: 'Topluluktan ayrıl',
  leaveConfirm: '“{{nombre}}” topluluğundan ayrılmak istediğine emin misin?',
  leave: 'Ayrıl',
  leaveFailed: 'Topluluktan ayrılamadın',
  actionFailed: 'İşlem tamamlanamadı',

  newCommunity: 'Yeni topluluk',
  name: 'Ad',
  namePlaceholder: 'Örn. Kahve severler',
  description: 'Açıklama',
  descriptionPlaceholder: 'Bu topluluk ne hakkında?',
  createFailed: 'Topluluk oluşturulamadı',
  defaultDescription: '{{nombre}} topluluğu',
  empty: 'Gösterilecek topluluk yok',

  findYours: 'Sana uygun olanları bul.',
  searchLabel: 'Topluluk ara',
  members: 'üye',
  posts: 'gönderi',
  rules: 'Topluluk kuralları',
  one: 'Topluluk',
  loadFailed: 'Topluluk yüklenemedi',
  noPosts: 'Henüz gönderi yok',
  beTheFirst: 'Bu toplulukta ilk paylaşan sen ol',
  createPost: 'Gönderi oluştur',
  understoodJoin: 'Anladım, katıl',
  memberCount_one: '{{cantidad}} üye',
  memberCount_other: '{{cantidad}} üye',
  postCount_one: '{{contador}} gönderi',
  postCount_other: '{{contador}} gönderi',
  officialNameFilmAnimation: 'Sinema ve animasyon',
  officialNameArtCreativity: 'Sanat ve yaratıcılık',
  officialNameCreatorsInfluencers: 'İçerik üreticileri ve fenomenler',
  officialNameBusinessEntrepreneurship: 'İş ve girişimcilik',
  officialNameTechAi: 'Teknoloji ve yapay zekâ',
  officialNameGamingVirtualWorlds: 'Oyun ve sanal dünyalar',
  officialNameEducationLearning: 'Eğitim ve öğrenme',
  officialNameFutureSociety: 'Gelecek ve toplum',
  officialRuleShare: 'Yapay zekâyla oluşturduklarını paylaş ve nasıl yaptığını anlat',
  officialRuleRespect: 'Saygıyla sor ve yanıtla',
  officialRuleNoSpam: 'Spam ya da sana ait olmayan içerik paylaşma',
  popularDescFilmmakers: 'Film ve video yapımında yapay zekâ kullanan kişiler. Sürecini göster, başkalarının sürecinden öğren.',
  popularDescInfluencers: 'Yapay zekâyla üretim yapan fenomenler ve içerik üreticileri.',
  popularDescDesigners: 'Yapay zekâyla çalışan tasarımcılar: marka kimliği, illüstrasyon, dijital sanat.',
  popularDescWriters: 'Yapay zekâyla üreten yazarlar: kitap, senaryo, makale ve şiir.',
  popularDescMusicians: 'Yapay zekâyla müzik ve ses üretenler.',
  popularDescDevelopers: 'Yapay zekâyla geliştirme yapan yazılımcılar.',
  popularDescEntrepreneurs: 'İşlerinde yapay zekâ kullanan girişimciler.',
  popularDescGamers: 'Yapay zekâ ve video oyunları: karakterler, dünyalar ve deneyimler.',
};
