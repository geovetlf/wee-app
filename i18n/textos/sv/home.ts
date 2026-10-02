/*
 * SUECO — el Home: saludo, compositor, filtros, las filas de arriba y la
 * descripción de cada comunidad de la portada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El saludo es «Hej {{nombre}}», sin coma, como se saluda en sueco. «Comunidad»
 * es «community» (pl. «communities», definida «communityn»), «hashtag» es
 * «hashtagg» y «publicación», «inlägg» (glosario § 9). Las cifras de la tarjeta
 * del tema del día van en minúscula detrás del número y el sustantivo cambia con
 * la cifra: «1 kommentar» / «3 kommentarer», «1 gillamarkering» /
 * «3 gillamarkeringar»; «svar» es invariable. Un Weël suelto es «en Weël», y el
 * ejemplo se nombra con un compuesto con guion («Weël-exempel»), sin declinar la
 * marca. «Destacado» es «utvald»: «Utvalt» en la insignia, «Utvalda» en la
 * sección. `filterBy` y `bannerOf` solo los oye el lector de pantalla; `filterBy`
 * es «Filtrera: …» y no «Filter: …», que sería el inglés copiado. El «Todo» del
 * filtro es «Alla», como la primera pestaña de cualquier buscador en sueco y como
 * el mismo filtro de Mis creaciones (`creaciones.filterAll`).
 *
 * Las descripciones de las comunidades describen ESA comunidad —los memes
 * argentinos siguen siendo argentinos—, en sueco de redes: «youtubare»,
 * «tiktokare» e «instagrammare» (las formas de Språkrådet), «prylar» para los
 * gadgets, «AI-eran» para «la era de la IA» y «NFT» sin declinar (una abreviatura
 * no se declina en la interfaz, guía § 3). «Inteligencia Artificial» va en
 * minúscula, como se escribe en sueco.
 */
export const home: typeof import('../es/home').home = {
  greeting: 'Hej {{nombre}}',
  greetingGuest: 'Hej',
  composerPlaceholder: 'Vad vill du dela?',
  seeAll: 'Visa alla →',
  createWeel: 'Skapa Weël',
  openMenu: 'Öppna menyn',
  search: 'Sök',
  logoHome: 'Weë, gå till toppen',
  filterBy: 'Filtrera: {{nombre}}',
  filterAll: 'Alla',
  bannerOf: 'Banner {{numero}} av {{total}}',
  weelSample: 'Weël-exempel: {{titulo}}',
  exploreCommunities: 'Utforska communities',
  moreCategories: 'Visa fler kategorier',
  popularCommunities: 'Populära communities',
  seeAllOf: 'Visa alla',
  topicOfTheDay: 'Dagens ämne',
  heatedDebate: 'Het debatt',
  featuredOpinion: 'Utvald åsikt',
  featured: 'Utvalda',
  allCommunities: 'Alla',
  postsLoadFailed: 'Det gick inte att ladda inläggen',
  searchHint: 'Öppnar sökningen efter personer, hashtaggar och inlägg',
  featuredItem: 'Utvalt',
  communityDescFilmAnimation: 'Filmskapande, kortfilmer, animation och karaktärer skapade med AI. Visa hur du jobbar och lär dig av andra.',
  communityDescArtCreativity: 'Digital konst, illustration, fotografi och design med hjälp av AI. Dela promptar, stilar och resultat.',
  communityDescCreatorsInfluencers: 'Innehållsskapare, youtubare, tiktokare och instagrammare som jobbar med AI.',
  communityDescBusinessEntrepreneurship: 'Entreprenörer, startups, marknadsföring och affärsmöjligheter med AI.',
  communityDescTechAi: 'Nyheter, modeller, verktyg och diskussioner om artificiell intelligens.',
  communityDescGamingVirtualWorlds: 'Spel, karaktärer, virtuella världar och digitala upplevelser skapade med AI.',
  communityDescEducationLearning: 'Studenter, lärare och forskare som använder AI för att lära sig och lära ut.',
  communityDescFutureSociety: 'Framtidens arbete, yrken och samhälle i AI-eran. Öppen debatt.',
  communityDescNews: 'Det som händer i världen, berättat av communityn. Debatter, analyser och åsikter i realtid.',
  communityDescMarketplace: 'Köp, sälj och byt produkter och tjänster med andra i communityn.',
  communityDescRelationshipsLove: 'Berättelser, tips och erfarenheter om relationer, dejting och allt som har med kärlek att göra.',
  communityDescFinanceMoney: 'Spartips, investeringar och allt om hur du hanterar dina pengar smart.',
  communityDescWork: 'Erfarenheter från jobbet, karriärtips, jobbsökande och livet på kontoret.',
  communityDescHealthWellbeing: 'Tips om hälsa, träning, kost och psykiskt välmående för ett bättre liv.',
  communityDescEntertainment: 'Filmer, serier, musik, memes och allt som underhåller dig i vardagen.',
  communityDescGamingTech: 'Tv-spel, prylar, recensioner och allt om gaming och teknik.',
  communityDescEducationCareer: 'Universitet, kurser, stipendier och allt som tar din utbildning och karriär vidare.',
  communityDescSports: 'Fotboll, basket, tennis och all annan sport. Resultat, åsikter och passion.',
  communityDescConfessions: 'En trygg plats där du kan dela det du inte skulle berätta för någon annan. Här dömer ingen.',
  communityDescHotDebates: 'Kontroversiella ämnen, delade meningar och heta debatter. Vilken sida står du på?',
  communityDescTravelPlaces: 'Fantastiska resmål, resetips, upplevelser och rekommendationer från communityn.',
  communityDescFoodCooking: 'Recept, restauranger, streetfood och allt för dig som älskar god mat.',
  communityDescFashionStyle: 'Trender, outfits, stiltips och allt om modevärlden.',
  communityDescSpirituality: 'Meditation, mindfulness, personlig utveckling och andlighet.',
  communityDescAnimeManga: 'Anime, manga, cosplay och hela otakukulturen. Vilken är din favoritanime?',
  communityDescCrypto: 'Bitcoin, altcoins, DeFi, NFT och hela kryptovärlden. DYOR.',
  communityDescKpopKdrama: 'Idoler, k-dramor, comebacks och allt om koreansk popkultur.',
  communityDescEsoteric: 'Astrologi, tarot, energier och universums mysterier. Vad tror du på?',
  communityDescPoeticAction: 'Poesi, citat, låttexter och gatukonst. Sätt ord på det du känner.',
  communityDescAiTech: 'Artificiell intelligens, innovation, startups och teknikens framtid.',
  communityDescEventsOutings: 'Fester, konserter, meetups och evenemang. Vart ska vi gå ut i kväll?',
  communityDescBusinessInvesting: 'Företagande, investeringar, affärsstrategier och möjligheter.',
  communityDescBarsRestaurants: 'De bästa barerna, restaurangerna, ölbarerna och ställena att gå ut och äta på.',
  communityDescBeatles: 'Allt om världens största band genom tiderna. Diskografi, historia och arv.',
  communityDescTarotReading: 'Tarotläsningar, tolkningar, arkana och andlig vägledning i livet.',
  communityDescGrandmaRecipes: 'Hemlagade recept som går i arv från generation till generation. Mat med själ.',
  communityDescArgentineMemes: 'Argentinas bästa memes. Lokal humor, aktuella händelser och populärkultur.',
  communityDescTrueCrimeLatino: 'Verkliga fall, olösta mysterier och kriminalreportage från Latinamerika.',
  communityDescPlantsGarden: 'Trädgårdstips, växtskötsel, suckulenter och allt för din trädgård.',
  communityDescRockNacional: 'Argentinsk och latinamerikansk rock. Band, skivor, konserter och nostalgi.',
  communityDescCatLovers: 'Foton, videor, tips och allt om våra älskade katter.',
  communityDescDefault: 'En plats där du kan dela, diskutera och knyta kontakter i communityn.',
  feedEmptyTitle: 'Bli först med att publicera!',
  feedEmptyHint: 'Använd fältet här ovanför för att skapa ditt första inlägg.',
  wallEmptyTitle: 'Inga inlägg ännu',
  wallEmptyHint: 'Bli först med att dela något du har skapat med AI.',
  wallFilteredTitle: 'Inget att visa för det här urvalet',
  wallFilteredHint: 'Testa andra filter eller dela något själv.',
  answersCount_one: '{{cantidad}} svar',
  answersCount_other: '{{cantidad}} svar',
  likesCount_one: '{{cantidad}} gillamarkering',
  likesCount_other: '{{cantidad}} gillamarkeringar',
  commentsCount_one: '{{cantidad}} kommentar',
  commentsCount_other: '{{cantidad}} kommentarer',
};
