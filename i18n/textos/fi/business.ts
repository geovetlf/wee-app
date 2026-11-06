/*
 * FINÉS — Weë Business: la pantalla del negocio y las etiquetas de sus datos
 * de muestra. Tipado contra el español.
 *
 * Los nombres de módulos y funciones que es/en dejan en inglés (Business Plan,
 * Business Coach, Pricing Assistant, Brand Kit, Customer Insights, Business
 * Ideas, Business Profile) se quedan igual. Las marcas no se declinan: «Weë»
 * entra en compuesto («Weë-sovelluksessa», «Credits-saldo», «Weë Fashion
 * -sovelluksella»). Ninguna terminación de caso se pega a un {{hueco}}: la
 * palabra con caso va delante («käyttäjälle {{nombre}}», «palvelussa
 * {{red}}», «päivälle {{dia}} {{fecha}}»). Los «Goal» son lo que la persona
 * le pide a Weë, así que van en imperativo dirigido a Weë o como frase
 * nominal, como en finés se formula una petición.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Omat sometilit',
  manageAccounts: 'Hallitse tilejä',
  connected: 'Yhdistetty',
  networkConnected: '{{red}} yhdistetty',
  connectAnother: 'Yhdistä toinen tili',
  allConnected: 'Kaikki sometilisi on jo yhdistetty.',
  simulatedConnection: 'Simuloitu yhteys: Weë ei vielä julkaise eikä vastaa puolestasi. Se valmistelee jokaisen sisällön, jotta voit tarkistaa ja julkaista sen itse.',
  postCalendar: 'Julkaisukalenteri',
  seeFullCalendar: 'Näytä koko kalenteri',
  calendarGoal: 'Näytä ja järjestä tämän viikon julkaisukalenterini',
  scheduleGoal: 'Ajoita julkaisu päivälle {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Asiakkaiden viestit',
  seeAllMessages: 'Näytä kaikki',
  messagesGoal: 'Vastaa asiakkaideni viesteihin',
  reply: 'Vastaa',
  replied: 'Vastattu',
  replyTo: 'Vastaa käyttäjälle {{nombre}}',
  repliedTo: 'Vastattu käyttäjälle {{nombre}}',
  replyGoal: 'Vastaa käyttäjälle {{nombre}} palvelussa {{red}}: ”{{mensaje}}”',
  resultsThisWeek: 'Tämän viikon tulokset',
  statPosts: 'Julkaisut',
  statReach: 'Tavoitetut ihmiset',
  statInteractions: 'Vuorovaikutukset',
  statMessages: 'Saapuneet viestit',
  onTrack: 'Yrityksesi on hyvällä tiellä',
  onTrackNote: 'Vuorovaikutukset kasvoivat 60 % tällä viikolla. Jatka samaan malliin!',
  seeDetailedAnalysis: 'Näytä tarkka analyysi',
  analysisGoal: 'Analysoi yritykseni tämän viikon tulokset',
  shortcutIdeas: 'Ideat',
  shortcutIdeasGoal: 'Ideoita ja strategia yritykseni kasvattamiseen',
  shortcutMarketing: 'Markkinointi',
  shortcutMarketingGoal: 'Markkinointikampanja yritykselleni',
  shortcutSocial: 'Sosiaalinen media',
  shortcutSocialGoal: 'Luo sisältöä yritykseni sometileille',
  shortcutAnalyze: 'Analysoi',
  shortcutAnalyzeGoal: 'Analysoi yritykseni tulokset',
  shortcutDocuments: 'Asiakirjat',
  shortcutDocumentsGoal: 'Laadi asiakirja yritykselleni',
  shortcutSell: 'Myy enemmän',
  shortcutSellGoal: 'Lisää yritykseni myyntiä tässä kuussa',
  shortcutCareer: 'Työ ja ura',
  shortcutCareerGoal: 'Paranna CV:täni ja ammatillista profiiliani',
  yesterday: 'Eilen',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos no están aquí: son nombres de producto y viven
   * en `constants/businessModules.ts`. Aquí, lo que hace cada uno.
   */
  slogan: 'Muoti, tyyli, kauneus ja visuaalisen sisällön luominen.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Rakenna ja hallitse yritystäsi',
  modProductsHint: 'Tuotteesi ja niiden hinnat',
  modCreateHint: 'Luo sisältöä tekoälyllä',
  modSocialHint: 'Valmistele ja jaa kaikkialle',
  modAnalyzeHint: 'Ymmärrä yritystäsi',
  modGrowHint: 'Löydä mahdollisuuksia ja kasva',
  modProfileHint: 'Yrityksesi Weë-sovelluksessa',
  modPromoteHint: 'Tavoita lisää ihmisiä Weë-sovelluksella',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: 'Yrityksesi yhteenveto',
  overviewEmpty: 'Et ole vielä luonut yritystäsi.',
  overviewEmptyHint: 'Kerro siitä Weë-sovellukselle omin sanoin – ”myyn jälkiruokia kotoa” – niin autan sinua muotoilemaan sen.',
  createBusiness: 'Luo yritykseni',
  createBusinessGoal: 'Luo yritykseni alusta alkaen: nimi, mitä myyn, kenelle ja mihin hintaan',
  editBusiness: 'Muokkaa yritystäni',
  editBusinessGoal: 'Tarkista ja paranna yritykseni tietoja',
  businessInfo: 'Yrityksen tiedot',
  businessInfoGoal: 'Järjestä yritykseni tiedot: mitä myyn, kenelle ja mikä erottaa minut muista',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Kirjoita liiketoimintasuunnitelma, jolla esittelen yritykseni sijoittajalle',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Mitä minun pitäisi tehdä yrityksessäni tällä viikolla?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Et ole vielä lisännyt tuotteita.',
  productsEmptyHint: 'Lataa kuva, niin Weë kirjoittaa nimen, kuvauksen ja myyntitekstin.',
  addProduct: 'Lisää tuote',
  addProductGoal: 'Luo tuotekortti: nimi, kuvaus, ominaisuudet ja myyntiteksti',
  improveImage: 'Paranna kuvaa',
  improveImageGoal: 'Paranna tuotteeni kuvaa, jotta se myy paremmin',
  productsCount_one: '{{contador}} tuote',
  productsCount_other: '{{contador}} tuotetta',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Syötä kulusi, niin Weë antaa sinulle viitehinnan.',
  pricingMaterials: 'Materiaalit',
  pricingPackaging: 'Pakkaus',
  pricingDelivery: 'Toimitus',
  pricingOther: 'Muut kulut',
  pricingMargin: 'Haluamasi kate',
  pricingCost: 'Arvioitu kustannus',
  pricingSuggested: 'Ehdotettu hinta',
  pricingMarginResult: 'Arvioitu kate',
  pricingProfit: 'Arvioitu voitto',
  pricingNote: 'Hinnat ovat suuntaa antavia eivätkä ole kirjanpito- tai veroneuvontaa.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Se, mikä saa sisältösi näyttämään aina omaltasi.',
  brandLogo: 'Logo',
  brandColors: 'Värit',
  brandTypography: 'Typografia',
  brandStyle: 'Visuaalinen tyyli',
  brandAvatar: 'Profiilikuva',
  brandCover: 'Kansikuva',
  brandTemplates: 'Sisältömallit',
  brandGoal: 'Luo {{que}} yritykseni brändille',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Kerro, mitä haluat mainostaa, niin valmistelen sen.',
  createPlaceholder: 'Esimerkki: Haluan mainostaa tätä kakkua äitienpäiväksi…',
  createTypes: 'Mitä haluat luoda?',
  typeImage: 'Kuva',
  typeImageHint: 'Kuva mainostamiseen',
  typeVideo: 'Video',
  typeVideoHint: 'Lyhyt video',
  typePost: 'Julkaisu',
  typePostHint: 'Valmis julkaistavaksi',
  typeCampaign: 'Kampanja',
  typeCampaignHint: 'Useita sisältöjä kerralla',
  typeCopy: 'Tekstit',
  typeCopyHint: 'Kuvaus, hashtagit ja toimintakehotus',
  typeGoal: 'Luo {{que}} yritykselleni: {{idea}}',
  formats: 'Valitse muoto',
  formatsHint: 'Weë huolehtii koosta. Sinä valitset, minne se menee.',
  formatTikTok: 'TikTok',
  /* «Instagram-video» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz. El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram-video',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram-julkaisu',
  formatFeed: 'Facebook',
  formatWide: 'Vaakavideo',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Kerro omin sanoin, niin hoidan asian.',
  askPlaceholder: 'Kirjoita asiasi tähän…',
  askSend: 'Kysy Weë:ltä',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Luo sisältöä',
  goalWithProduct: '{{idea}} – tuote: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Luo kerran. Jaa kaikkialle.',
  share: 'Jaa',
  shareHint: 'Puhelimesi jakovalikko avautuu: valitse haluamasi sovellus.',
  shareToWee: 'Jaa Weë-sovelluksessa',
  shareWall: 'Oma Wäll',
  shareCommunities: 'Yhteisöt',
  shareProfile: 'Business Profile',
  shareNothing: 'Luo ensin jotain ja jaa se sitten täältä.',
  shareText: 'Luotu Weë Fashion -sovelluksella',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Lataa tietoni',
  analyzeUploadHint: 'Excel, CSV tai PDF, jossa on myyntisi ja kulusi.',
  analyzeUploadGoal: 'Analysoi yritykseni myynti- ja kulutiedosto',
  analyzeInsights: 'Mitä näen luvuissasi',
  analyzeInsightsGoal: 'Selitä, mitä yritykseni myynnissä tapahtuu',
  expenses: 'Kulut',
  expensesHint: 'Kirjaa, mihin rahasi menevät.',
  expensesEmpty: 'Et ole vielä kirjannut kuluja.',
  addExpense: 'Lisää kulu',
  expenseSupplies: 'Tarvikkeet',
  expenseMarketing: 'Markkinointi',
  expenseDelivery: 'Toimitukset',
  expenseStaff: 'Henkilöstö',
  expenseServices: 'Palvelut',
  expenseOther: 'Muut',
  expensesAsk: 'Mihin kulutan liikaa?',
  expensesAskGoal: 'Käy läpi kuluni ja kerro, mihin kulutan liikaa',
  swot: 'SWOT',
  swotHint: 'Vahvuudet, heikkoudet, mahdollisuudet ja uhat.',
  swotGoal: 'Tee yritykseni SWOT-analyysi',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Auta minua kasvamaan',
  helpMeGrowHint: 'Weë tarkastelee yritystäsi ja ehdottaa, mitä tehdä.',
  helpMeGrowGoal: 'Suunnitelma yritykseni kasvattamiseen konkreettisin askelin',
  opportunities: 'Mahdollisuudet',
  opportunitiesEmpty: 'Kun sinulla on myyntiä ja sisältöä, näet täällä havaitsemani mahdollisuudet.',
  createPromotion: 'Luo tarjouskampanja',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kenelle myyt ja mitä he tarvitsevat.',
  customerInsightsGoal: 'Kuvaile ihanneasiakkaani ja kerro, mitkä viestit toimivat hänelle',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Mitä muuta voisit myydä tai miten erottua.',
  businessIdeasGoal: 'Anna minulle ideoita yritykselleni ja siihen, miten erotun muista',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Yritykselläsi ei ole vielä sivua Weë-sovelluksessa.',
  profileEmptyHint: 'Kun luot yrityksesi, sen sivu löytyy täältä: kuka olet, mitä myyt ja miten sinuun saa yhteyden.',
  profileAbout: 'Tietoja',
  profileProducts: 'Tuotteet',
  profilePosts: 'Julkaisut',
  profileContact: 'Yhteystiedot',
  reviews: 'Arvostelut',
  reviewsHint: 'Mitä asiakkaasi sanovat ja mitä parantaa.',
  reviewsGoal: 'Analysoi yritykseni arvostelut ja kerro, mitä parantaa',
  reviewsRespond: 'Kirjoita vastaus',
  reviewsRespondGoal: 'Kirjoita ammattimainen vastaus yritykseni saamaan arvosteluun',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Tavoita lisää ihmisiä Weë Credits -saldolla',
  promoteHint: 'Sisältöäsi näytetään useammille ihmisille Weë-sovelluksessa. Näet hinnan ennen kuin kulutat mitään.',
  promoteSoon: 'Mainostaminen Weë-sovelluksessa ei ole vielä avoinna. Kun se avautuu, se maksetaan Credits-saldostasi ja näet sen täällä.',
  promoteCredits: 'Näytä Credits-saldoni',
  sampleProductName: 'Tuote {{numero}}',
};
