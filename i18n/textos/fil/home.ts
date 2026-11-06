/*
 * FILIPINO — el Home: saludo, compositor, filtros, las filas de arriba y la descripción de cada comunidad de la
 * portada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El saludo es «Kumusta, {{nombre}}», el «hola» filipino de todos los días, sin exclamación. Las palabras son las del
 * glosario (§ 11): «komunidad» («Mga sikat na komunidad», como «Mga sikat na paksa» de `search`), «post», «Tingnan
 * lahat →», «Buksan ang menu», «Maghanap» y «I-explore» (11.1). «Destacado» es «Featured» (11.6): la sección es «Mga
 * featured», la insignia de la opinión, «Featured na opinyon», y la del post, «Featured na post», del mismo molde que
 * su vecina «Paksa ng araw». Crear una Weël es «Gumawa ng Weël», como `weels.create`; el ejemplo, «Halimbawa ng
 * Weël», sin nada pegado a la marca. `filterBy`, `bannerOf` y `logoHome` solo los oye el lector de pantalla: «I-filter:
 * …», «Banner {{numero}} sa {{total}}» (el «de» de una serie es «sa», como «Hakbang 2 sa 5»), «Weë, bumalik sa
 * itaas». El «Todo» del filtro y el «Todas» de las comunidades son «Lahat».
 *
 * Los estados vacíos siguen la guía (§ 10): «Wala pang post» y la invitación; «Sé el primero en publicar» es «Maging
 * unang mag-post!», del molde de «Maging unang magkomento» (11.6). El campo de arriba es «kahon».
 *
 * Los contadores de las tarjetas reciben `{{cantidad}}`, ya formateado y compacto: sin enlace y `_one` = `_other`
 * (§ 8.3, regla 2), en minúscula y sin `mga` («{{cantidad}} komento», «{{cantidad}} like», «{{cantidad}} sagot»).
 *
 * Las descripciones de las comunidades describen ESA comunidad —los memes argentinos siguen siendo argentinos— en el
 * filipino de las redes: los préstamos sin «-s», con `mga` delante cuando hace falta («mga content creator, YouTuber,
 * TikToker at Instagrammer», «mga idol»), «street food», «K-drama», «DYOR». «Inteligencia Artificial» escrita entera
 * es «Artificial Intelligence» (§ 11.10, como `settings.aboutBody`); en lo demás, «AI». «Ginawa gamit ang AI» es la
 * forma del glosario para «creado con IA». «¿A dónde salimos hoy?» es «Saan ang gimik natin ngayon?»: «gimik» es salir
 * de noche en Filipinas, y «natin» invita a la persona (§ 2). «Sin juicios» es «Walang manghuhusga».
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Kumusta, {{nombre}}',
  greetingGuest: 'Kumusta',
  composerPlaceholder: 'Ano ang gusto mong ibahagi?',
  seeAll: 'Tingnan lahat →',
  createWeel: 'Gumawa ng Weël',
  openMenu: 'Buksan ang menu',
  search: 'Maghanap',
  logoHome: 'Weë, bumalik sa itaas',
  filterBy: 'I-filter: {{nombre}}',
  filterAll: 'Lahat',
  bannerOf: 'Banner {{numero}} sa {{total}}',
  weelSample: 'Halimbawa ng Weël: {{titulo}}',
  exploreCommunities: 'I-explore ang mga komunidad',
  moreCategories: 'Tingnan ang iba pang kategorya',
  popularCommunities: 'Mga sikat na komunidad',
  seeAllOf: 'Tingnan lahat',
  topicOfTheDay: 'Paksa ng araw',
  heatedDebate: 'Mainit na debate',
  featuredOpinion: 'Featured na opinyon',
  featured: 'Mga featured',
  allCommunities: 'Lahat',
  postsLoadFailed: 'Hindi ma-load ang mga post',
  searchHint: 'Bubuksan ang paghahanap ng tao, hashtag at post',
  featuredItem: 'Featured na post',
  communityDescFilmAnimation: 'Filmmaking, short film, animation at mga karakter na ginawa gamit ang AI. Ipakita ang proseso mo at matuto sa proseso ng iba.',
  communityDescArtCreativity: 'Digital art, ilustrasyon, photography at disenyo sa tulong ng AI. Magbahagi ng mga prompt, istilo at resulta.',
  communityDescCreatorsInfluencers: 'Mga content creator, YouTuber, TikToker at Instagrammer na gumagawa ng content gamit ang AI.',
  communityDescBusinessEntrepreneurship: 'Mga negosyante, startup, marketing at mga oportunidad sa negosyo gamit ang AI.',
  communityDescTechAi: 'Mga balita, model, tool at talakayan tungkol sa Artificial Intelligence.',
  communityDescGamingVirtualWorlds: 'Mga video game, karakter, virtual na mundo at digital na karanasang ginawa gamit ang AI.',
  communityDescEducationLearning: 'Mga estudyante, guro at mananaliksik na gumagamit ng AI para matuto at magturo.',
  communityDescFutureSociety: 'Ang kinabukasan ng trabaho, mga propesyon at lipunan sa panahon ng AI. Bukas na debate.',
  communityDescNews: 'Ang nangyayari sa mundo, ikinukuwento ng komunidad. Mga debate, pagsusuri at opinyon nang real time.',
  communityDescMarketplace: 'Bumili, magbenta at makipagpalitan ng mga produkto at serbisyo sa komunidad.',
  communityDescRelationshipsLove: 'Mga kuwento, payo at karanasan tungkol sa relasyon, dating at lahat ng may kinalaman sa pag-ibig.',
  communityDescFinanceMoney: 'Mga tip sa pag-iipon, investment at lahat tungkol sa matalinong paghawak ng pera mo.',
  communityDescWork: 'Mga karanasan sa trabaho, payo sa career, paghahanap ng trabaho at buhay sa opisina.',
  communityDescHealthWellbeing: 'Mga payo sa kalusugan, fitness, nutrisyon at mental health para sa mas magandang buhay.',
  communityDescEntertainment: 'Mga pelikula, serye, musika, meme at lahat ng nagpapasaya sa iyo araw-araw.',
  communityDescGamingTech: 'Mga video game, gadget, review at lahat tungkol sa gaming at teknolohiya.',
  communityDescEducationCareer: 'Mga unibersidad, kurso, scholarship at lahat ng makakatulong sa pag-aaral at career mo.',
  communityDescSports: 'Football, basketball, tennis at lahat ng sports. Mga resulta, opinyon at passion.',
  communityDescConfessions: 'Ligtas na lugar para ibahagi ang hindi mo sasabihin kahit kanino. Walang manghuhusga.',
  communityDescHotDebates: 'Mga kontrobersyal na paksa, hati-hating opinyon at mainit na debate. Saan ka pumapanig?',
  communityDescTravelPlaces: 'Mga kamangha-manghang destinasyon, travel tip, karanasan at rekomendasyon mula sa komunidad.',
  communityDescFoodCooking: 'Mga recipe, restaurant, street food at lahat para sa mahihilig sa masarap na pagkain.',
  communityDescFashionStyle: 'Mga trend, outfit, tip sa istilo at lahat tungkol sa mundo ng fashion.',
  communityDescSpirituality: 'Meditasyon, mindfulness, personal growth at espirituwal na koneksyon.',
  communityDescAnimeManga: 'Anime, manga, cosplay at ang buong kulturang otaku. Ano ang paborito mong anime?',
  communityDescCrypto: 'Bitcoin, altcoin, DeFi, NFT at ang buong mundo ng crypto. DYOR.',
  communityDescKpopKdrama: 'Mga idol, K-drama, comeback at lahat tungkol sa Korean pop culture.',
  communityDescEsoteric: 'Astrolohiya, tarot, enerhiya at mga misteryo ng uniberso. Ano ang pinaniniwalaan mo?',
  communityDescPoeticAction: 'Tula, mga quote, liriko at street art. Ipahayag sa salita ang nararamdaman mo.',
  communityDescAiTech: 'Artificial Intelligence, inobasyon, mga startup at ang kinabukasan ng teknolohiya.',
  communityDescEventsOutings: 'Mga party, concert, meetup at event. Saan ang gimik natin ngayon?',
  communityDescBusinessInvesting: 'Pagnenegosyo, investment, estratehiya sa negosyo at mga oportunidad.',
  communityDescBarsRestaurants: 'Ang pinakamagagandang bar, restaurant, brewery at spot para kumain sa labas.',
  communityDescBeatles: 'Lahat tungkol sa pinakadakilang banda sa kasaysayan. Discography, kasaysayan at pamana.',
  communityDescTarotReading: 'Mga tarot reading, interpretasyon, arcana at espirituwal na gabay sa landas mo.',
  communityDescGrandmaRecipes: 'Mga lutong-bahay na recipe na ipinapasa sa bawat henerasyon. Pagluluto na may puso.',
  communityDescArgentineMemes: 'Ang pinakanakakatawang meme ng Argentina. Lokal na humor, mga kaganapan ngayon at pop culture.',
  communityDescTrueCrimeLatino: 'Mga totoong kaso, misteryong hindi pa nalulutas at mga kuwento ng krimen mula sa Latin America.',
  communityDescPlantsGarden: 'Mga tip sa paghahalaman, pag-aalaga ng halaman, succulent at lahat para sa hardin mo.',
  communityDescRockNacional: 'Ang rock ng Argentina at Latin America. Mga banda, album, concert at nostalgia.',
  communityDescCatLovers: 'Mga larawan, video, payo at lahat tungkol sa mga kaibigan nating pusa.',
  communityDescDefault: 'Isang lugar para magbahagi, makipagdebate at kumonekta sa komunidad.',
  feedEmptyTitle: 'Maging unang mag-post!',
  feedEmptyHint: 'Gamitin ang kahon sa itaas para gawin ang una mong post.',
  wallEmptyTitle: 'Wala pang post',
  wallEmptyHint: 'Maging unang magbahagi ng isang bagay na ginawa gamit ang AI.',
  wallFilteredTitle: 'Wala pang post para sa napili mo',
  wallFilteredHint: 'Subukan ang ibang seksyon o magbahagi ka ng sarili mo.',
  answersCount_one: '{{cantidad}} sagot',
  answersCount_other: '{{cantidad}} sagot',
  likesCount_one: '{{cantidad}} like',
  likesCount_other: '{{cantidad}} like',
  commentsCount_one: '{{cantidad}} komento',
  commentsCount_other: '{{cantidad}} komento',
};
