/*
 * DANÉS — el Home: saludo, compositor, filtros, las filas de arriba y la
 * descripción de cada comunidad de la portada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El saludo es «Hej {{nombre}}», sin coma ni exclamación, como se saluda en
 * danés. «Comunidad» es «fællesskab» (pl. «fællesskaber»), «publicación»,
 * «opslag» (invariable) y «destacado», «fremhævet» (glosario § 9). Las cifras de
 * las tarjetas van en minúscula detrás del número y el sustantivo cambia con la
 * cifra: «1 kommentar» / «3 kommentarer», «1 like» / «3 likes» (el número de
 * «me gusta» son «likes», glosario § 9.2); «svar» es invariable. Crear un Weël
 * es «Lav en Weël» (una obra: «Lav», no «Opret»), y el ejemplo se dice «Eksempel
 * på en Weël», sin declinar la marca. `filterBy` y `bannerOf` solo los oye el
 * lector de pantalla. El «Todo» del filtro y el «Todas» de las comunidades son
 * «Alle», como la primera pestaña de cualquier filtro en danés.
 *
 * Las descripciones de las comunidades describen ESA comunidad —los memes
 * argentinos siguen siendo argentinos— en danés de redes: «youtubere»,
 * «tiktokere», «instagrammere», «startups», «NFT'er» (sigla con apóstrofo, como
 * «pc'er»), «streetfood» junto, «CV» en mayúsculas. «Inteligencia Artificial»
 * es «kunstig intelligens» en minúscula donde el español la escribe entera
 * (texto descriptivo); en lo demás, «AI». «La era de la IA» se dice «en tid med
 * AI», sin inventar compuestos.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Hej {{nombre}}',
  greetingGuest: 'Hej',
  composerPlaceholder: 'Hvad vil du dele?',
  seeAll: 'Se alle →',
  createWeel: 'Lav en Weël',
  openMenu: 'Åbn menuen',
  search: 'Søg',
  logoHome: 'Weë, gå til toppen',
  filterBy: 'Filtrer: {{nombre}}',
  filterAll: 'Alle',
  bannerOf: 'Banner {{numero}} af {{total}}',
  weelSample: 'Eksempel på en Weël: {{titulo}}',
  exploreCommunities: 'Udforsk fællesskaber',
  moreCategories: 'Se flere kategorier',
  popularCommunities: 'Populære fællesskaber',
  seeAllOf: 'Se alle',
  topicOfTheDay: 'Dagens emne',
  heatedDebate: 'Heftig debat',
  featuredOpinion: 'Fremhævet holdning',
  featured: 'Fremhævede',
  allCommunities: 'Alle',
  postsLoadFailed: 'Opslagene kunne ikke indlæses.',
  searchHint: 'Åbner søgning efter personer, hashtags og opslag',
  featuredItem: 'Fremhævet',
  communityDescFilmAnimation: 'Filmproduktion, kortfilm, animation og karakterer skabt med AI. Vis din proces, og lær af andres.',
  communityDescArtCreativity: 'Digital kunst, illustration, fotografi og design med hjælp fra AI. Del prompts, stilarter og resultater.',
  communityDescCreatorsInfluencers: 'Indholdsskabere, youtubere, tiktokere og instagrammere, der laver indhold med AI.',
  communityDescBusinessEntrepreneurship: 'Iværksættere, startups, marketing og forretningsmuligheder med AI.',
  communityDescTechAi: 'Nyheder, modeller, værktøjer og diskussioner om kunstig intelligens.',
  communityDescGamingVirtualWorlds: 'Computerspil, karakterer, virtuelle verdener og digitale oplevelser skabt med AI.',
  communityDescEducationLearning: 'Studerende, undervisere og forskere, der bruger AI til at lære og undervise.',
  communityDescFutureSociety: 'Fremtidens arbejde, fag og samfund i en tid med AI. Åben debat.',
  communityDescNews: 'Det, der sker i verden, fortalt af fællesskabet. Debatter, analyser og holdninger i realtid.',
  communityDescMarketplace: 'Køb, sælg og byt produkter og tjenester med andre i fællesskabet.',
  communityDescRelationshipsLove: 'Historier, råd og erfaringer om forhold, dating og alt, der har med kærlighed at gøre.',
  communityDescFinanceMoney: 'Sparetips, investeringer og alt om at styre dine penge klogt.',
  communityDescWork: 'Erfaringer fra arbejdslivet, karriereråd, jobsøgning og livet på kontoret.',
  communityDescHealthWellbeing: 'Råd om sundhed, fitness, kost og mental trivsel for et bedre liv.',
  communityDescEntertainment: 'Film, serier, musik, memes og alt det, der underholder dig i hverdagen.',
  communityDescGamingTech: 'Computerspil, gadgets, anmeldelser og alt om gaming og teknologi.',
  communityDescEducationCareer: 'Universiteter, kurser, legater og alt, der kan give din uddannelse og karriere et skub.',
  communityDescSports: 'Fodbold, basketball, tennis og al anden sport. Resultater, holdninger og passion.',
  communityDescConfessions: 'Et trygt sted, hvor du kan dele det, du ikke ville fortælle nogen. Her dømmer ingen.',
  communityDescHotDebates: 'Kontroversielle emner, delte meninger og heftige debatter. Hvilken side er du på?',
  communityDescTravelPlaces: 'Fantastiske rejsemål, rejsetips, oplevelser og anbefalinger fra fællesskabet.',
  communityDescFoodCooking: 'Opskrifter, restauranter, streetfood og alt for dem, der elsker god mad.',
  communityDescFashionStyle: 'Tendenser, outfits, stiltips og alt om modens verden.',
  communityDescSpirituality: 'Meditation, mindfulness, personlig udvikling og spirituel forbindelse.',
  communityDescAnimeManga: 'Anime, manga, cosplay og hele otakukulturen. Hvad er din yndlingsanime?',
  communityDescCrypto: 'Bitcoin, altcoins, DeFi, NFT\'er og hele kryptoverdenen. DYOR.',
  communityDescKpopKdrama: 'Idoler, k-dramaer, comebacks og alt om koreansk popkultur.',
  communityDescEsoteric: 'Astrologi, tarot, energier og universets mysterier. Hvad tror du på?',
  communityDescPoeticAction: 'Poesi, citater, sangtekster og gadekunst. Sæt ord på det, du føler.',
  communityDescAiTech: 'Kunstig intelligens, innovation, startups og teknologiens fremtid.',
  communityDescEventsOutings: 'Fester, koncerter, meetups og events. Hvor skal vi hen i aften?',
  communityDescBusinessInvesting: 'Iværksætteri, investeringer, forretningsstrategier og muligheder.',
  communityDescBarsRestaurants: 'De bedste barer, restauranter, ølbarer og steder at gå ud og spise.',
  communityDescBeatles: 'Alt om historiens største band. Diskografi, historie og eftermæle.',
  communityDescTarotReading: 'Tarotlæsninger, tolkninger, arkana og spirituel vejledning på din vej.',
  communityDescGrandmaRecipes: 'Hjemmelavede opskrifter, der går i arv fra generation til generation. Mad med sjæl.',
  communityDescArgentineMemes: 'De bedste argentinske memes. Lokal humor, aktuelle begivenheder og populærkultur.',
  communityDescTrueCrimeLatino: 'Virkelige sager, uopklarede mysterier og krimihistorier fra Latinamerika.',
  communityDescPlantsGarden: 'Havetips, plantepleje, sukkulenter og alt til din have.',
  communityDescRockNacional: 'Argentinsk og latinamerikansk rock. Bands, plader, koncerter og nostalgi.',
  communityDescCatLovers: 'Billeder, videoer, råd og alt om vores elskede katte.',
  communityDescDefault: 'Et sted, hvor du kan dele, debattere og komme i kontakt med andre i fællesskabet.',
  feedEmptyTitle: 'Bliv den første til at slå noget op!',
  feedEmptyHint: 'Brug feltet ovenfor til at lave dit første opslag.',
  wallEmptyTitle: 'Ingen opslag endnu',
  wallEmptyHint: 'Bliv den første til at dele noget, der er lavet med AI.',
  wallFilteredTitle: 'Ingen opslag med det valgte filter',
  wallFilteredHint: 'Prøv et andet filter, eller del selv noget.',
  answersCount_one: '{{cantidad}} svar',
  answersCount_other: '{{cantidad}} svar',
  likesCount_one: '{{cantidad}} like',
  likesCount_other: '{{cantidad}} likes',
  commentsCount_one: '{{cantidad}} kommentar',
  commentsCount_other: '{{cantidad}} kommentarer',
};
