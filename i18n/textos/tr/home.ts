/*
 * TURCO — El Home: saludo, compositor, filtros, las filas de arriba y la
 * descripción de cada comunidad de la portada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Un Weël suelto es «Weëls videosu», como el «Reels videosu» de Instagram: la
 * marca es invariable y no se pluraliza ni se le pega nada (guía § 9 y § 10.2).
 * Las cifras de la tarjeta del tema del día van en singular tras el número y en
 * minúscula, como en las redes turcas («12 yanıt», «340 beğeni», «5 yorum»).
 * `bannerOf` solo lo oye el lector de pantalla: «Banner 2, toplam 4», sin sufijo
 * detrás de ningún hueco. «Hashtag» es «etiket» (glosario § 10.2).
 *
 * Las descripciones de las comunidades describen ESA comunidad —los memes
 * argentinos siguen siendo argentinos—, pero en turco de redes: «meme» no se usa
 * porque en turco es otra palabra; los memes son «caps» (el nombre que les da
 * internet en turco) y el humor, «mizah». «Outfit» es «kombin», «mindfulness»
 * es «farkındalık» y los «startups», «girişimler». IA es siempre «yapay zekâ»,
 * con el circunflejo de la TDK, igual que «hikâye» y «mekân».
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Merhaba, {{nombre}}',
  greetingGuest: 'Merhaba',
  composerPlaceholder: 'Ne paylaşmak istersin?',
  seeAll: 'Tümünü gör →',
  createWeel: 'Weëls oluştur',
  openMenu: 'Menüyü aç',
  search: 'Ara',
  logoHome: 'Weë, en başa dön',
  filterBy: 'Filtre: {{nombre}}',
  filterAll: 'Tümü',
  bannerOf: 'Banner {{numero}}, toplam {{total}}',
  weelSample: 'Örnek Weëls videosu: {{titulo}}',
  exploreCommunities: 'Toplulukları keşfet',
  moreCategories: 'Daha fazla kategori gör',
  popularCommunities: 'Popüler topluluklar',
  seeAllOf: 'Tümünü gör',
  topicOfTheDay: 'Günün konusu',
  heatedDebate: 'Hararetli tartışma',
  featuredOpinion: 'Öne çıkan görüş',
  featured: 'Öne çıkanlar',
  allCommunities: 'Tümü',
  postsLoadFailed: 'Gönderiler yüklenemedi',
  searchHint: 'Kişi, etiket ve gönderi aramasını açar',
  featuredItem: 'Öne çıkan',
  communityDescFilmAnimation: 'Yapay zekâyla film yapımı, kısa filmler, animasyonlar ve karakterler. Sürecini göster, başkalarının sürecinden öğren.',
  communityDescArtCreativity: 'Yapay zekâyla güçlenen dijital sanat, illüstrasyon, fotoğraf ve tasarım. Promptları, stilleri ve sonuçları paylaş.',
  communityDescCreatorsInfluencers: 'Yapay zekâdan yararlanan içerik üreticileri, YouTuber\'lar, TikTok ve Instagram fenomenleri.',
  communityDescBusinessEntrepreneurship: 'Girişimciler, yeni girişimler, pazarlama ve yapay zekânın açtığı iş fırsatları.',
  communityDescTechAi: 'Yapay zekâ üzerine haberler, modeller, araçlar ve tartışmalar.',
  communityDescGamingVirtualWorlds: 'Yapay zekâyla oluşturulan video oyunları, karakterler, sanal dünyalar ve dijital deneyimler.',
  communityDescEducationLearning: 'Öğrenmek ve öğretmek için yapay zekâ kullanan öğrenciler, öğretmenler ve araştırmacılar.',
  communityDescFutureSociety: 'Yapay zekâ çağında işin, mesleklerin ve toplumun geleceği. Herkese açık tartışma.',
  communityDescNews: 'Dünyada olup bitenler, topluluğun gözünden. Anlık tartışmalar, analizler ve görüşler.',
  communityDescMarketplace: 'Toplulukla ürün ve hizmet al, sat, takas et.',
  communityDescRelationshipsLove: 'İlişkiler, flörtler ve aşka dair her şey üzerine hikâyeler, tavsiyeler ve deneyimler.',
  communityDescFinanceMoney: 'Tasarruf ipuçları, yatırımlar ve paranı akıllıca yönetmeye dair her şey.',
  communityDescWork: 'İş deneyimleri, kariyer tavsiyeleri, iş arama ve ofis hayatı.',
  communityDescHealthWellbeing: 'Daha iyi bir yaşam için sağlık, fitness, beslenme ve ruh sağlığı ipuçları.',
  communityDescEntertainment: 'Filmler, diziler, müzik, mizah ve gündelik hayatta seni eğlendiren her şey.',
  communityDescGamingTech: 'Video oyunları, teknolojik cihazlar, incelemeler ve oyuncularla teknoloji tutkunlarını ilgilendiren her şey.',
  communityDescEducationCareer: 'Üniversiteler, kurslar, burslar; eğitimini ve kariyerini ileriye taşıyacak her şey.',
  communityDescSports: 'Futbol, basketbol, tenis ve tüm sporlar. Maç sonuçları, yorumlar ve tutku.',
  communityDescConfessions: 'Kimseye anlatamayacağın şeyleri paylaşabileceğin güvenli bir alan. Burada kimse yargılanmaz.',
  communityDescHotDebates: 'Polemik konular, ikiye bölünen görüşler ve hararetli tartışmalar. Sen hangi taraftasın?',
  communityDescTravelPlaces: 'Muhteşem rotalar, seyahat ipuçları, deneyimler ve topluluktan öneriler.',
  communityDescFoodCooking: 'Tarifler, restoranlar, sokak lezzetleri ve iyi yemek sevenler için her şey.',
  communityDescFashionStyle: 'Trendler, kombinler, stil ipuçları ve moda dünyasına dair her şey.',
  communityDescSpirituality: 'Meditasyon, farkındalık, kişisel gelişim ve ruhsal bağ.',
  communityDescAnimeManga: 'Anime, manga, cosplay ve tüm otaku kültürü. En sevdiğin anime hangisi?',
  communityDescCrypto: 'Bitcoin, altcoinler, DeFi, NFT\'ler ve tüm kripto ekosistemi. DYOR: kendi araştırmanı yap.',
  communityDescKpopKdrama: 'İdoller, diziler, yeni albümler ve Kore pop kültürüne dair her şey.',
  communityDescEsoteric: 'Astroloji, tarot, enerjiler ve evrenin gizemleri. Sen neye inanıyorsun?',
  communityDescPoeticAction: 'Şiir, alıntılar, şarkı sözleri ve sokak sanatı. Hissettiklerini kelimelere dök.',
  communityDescAiTech: 'Yapay zekâ, inovasyon, girişimler ve teknolojinin geleceği.',
  communityDescEventsOutings: 'Partiler, konserler, buluşmalar ve etkinlikler. Bugün nereye çıkıyoruz?',
  communityDescBusinessInvesting: 'Girişimcilik, yatırımlar, iş stratejileri ve fırsatlar.',
  communityDescBarsRestaurants: 'En iyi barlar, restoranlar, birahaneler ve dışarıda yemek için mekânlar.',
  communityDescBeatles: 'Tarihin en büyük grubuna dair her şey. Diskografi, grubun tarihi ve bıraktığı miras.',
  communityDescTarotReading: 'Tarot açılımları, yorumlar, arkanalar ve yolun için ruhsal rehberlik.',
  communityDescGrandmaRecipes: 'Nesilden nesile aktarılan ev yemeği tarifleri. Sevgiyle pişen yemekler.',
  communityDescArgentineMemes: 'En iyi Arjantin capsleri. Yerel mizah, gündem ve popüler kültür.',
  communityDescTrueCrimeLatino: 'Latin Amerika\'dan gerçek vakalar, çözülemeyen gizemler ve polisiye hikâyeler.',
  communityDescPlantsGarden: 'Bahçecilik ipuçları, bitki bakımı, sukulentler ve bahçen için her şey.',
  communityDescRockNacional: 'Arjantin ve Latin Amerika rock müziği. Gruplar, albümler, konserler ve nostalji.',
  communityDescCatLovers: 'Fotoğraflar, videolar, ipuçları ve kedi dostlarımıza dair her şey.',
  communityDescDefault: 'Toplulukla paylaşmak, tartışmak ve bağ kurmak için bir alan.',
  feedEmptyTitle: 'İlk paylaşan sen ol!',
  feedEmptyHint: 'İlk gönderini oluşturmak için yukarıdaki alanı kullan.',
  wallEmptyTitle: 'Henüz gönderi yok',
  wallEmptyHint: 'Yapay zekâyla oluşturduğun bir şeyi ilk paylaşan sen ol.',
  wallFilteredTitle: 'Bu seçime uyan bir şey yok',
  wallFilteredHint: 'Başka bölümleri dene ya da kendin bir şey paylaş.',
  answersCount_one: '{{cantidad}} yanıt',
  answersCount_other: '{{cantidad}} yanıt',
  likesCount_one: '{{cantidad}} beğeni',
  likesCount_other: '{{cantidad}} beğeni',
  commentsCount_one: '{{cantidad}} yorum',
  commentsCount_other: '{{cantidad}} yorum',
};
