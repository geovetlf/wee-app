/*
 * NORUEGO BOKMÅL — Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Lo que representa al negocio de la
 * persona —nombres de redes, arrobas, títulos de publicaciones programadas, mensajes de clientes— nunca pasa por
 * el traductor.
 *
 * Se tutea («du»). «Negocio» es «bedrift»; los objetivos que viajan a Weë Brain van en infinitivo, como en el
 * español («Analysere…», «Skrive…»). Los nombres de los ocho módulos y los de producto —Business Plan, Brand Kit,
 * Pricing Assistant, SWOT, TikTok, Instagram Story— se quedan como en el español. «IA» es «KI» en prosa; el
 * porcentaje lleva espacio («60 %»), como en noruego.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Mine sosiale medier',
  manageAccounts: 'Administrer kontoer',
  connected: 'Tilkoblet',
  networkConnected: '{{red}} tilkoblet',
  connectAnother: 'Koble til et annet nettverk',
  allConnected: 'Du har allerede koblet til alle nettverkene dine.',
  simulatedConnection: 'Simulert tilkobling: Weë verken publiserer eller svarer for deg ennå, men gjør hver del klar så du kan se over og publisere den selv.',
  postCalendar: 'Publiseringskalender',
  seeFullCalendar: 'Se hele kalenderen',
  calendarGoal: 'Se og organisere publiseringskalenderen min for uken',
  scheduleGoal: 'Planlegge et innlegg til {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Meldinger fra kunder',
  seeAllMessages: 'Se alle',
  messagesGoal: 'Svare på meldingene fra kundene mine',
  reply: 'Svar',
  replied: 'Besvart',
  replyTo: 'Svar {{nombre}}',
  repliedTo: 'Har svart {{nombre}}',
  replyGoal: 'Svare {{nombre}} på {{red}}: «{{mensaje}}»',
  resultsThisWeek: 'Resultater denne uken',
  statPosts: 'Innlegg',
  statReach: 'Personer nådd',
  statInteractions: 'Interaksjoner',
  statMessages: 'Mottatte meldinger',
  onTrack: 'Bedriften din er på rett vei',
  onTrackNote: 'Interaksjonene økte med 60 % denne uken. Fortsett sånn!',
  seeDetailedAnalysis: 'Se detaljert analyse',
  analysisGoal: 'Analysere resultatene for bedriften min denne uken',
  shortcutIdeas: 'Ideer',
  shortcutIdeasGoal: 'Ideer og strategi for å få bedriften min til å vokse',
  shortcutMarketing: 'Markedsføring',
  shortcutMarketingGoal: 'En markedsføringskampanje for bedriften min',
  shortcutSocial: 'Sosiale medier',
  shortcutSocialGoal: 'Lage innhold til bedriftens sosiale medier',
  shortcutAnalyze: 'Analyser',
  shortcutAnalyzeGoal: 'Analysere resultatene for bedriften min',
  shortcutDocuments: 'Dokumenter',
  shortcutDocumentsGoal: 'Skrive et dokument for bedriften min',
  shortcutSell: 'Selg mer',
  shortcutSellGoal: 'Selge mer denne måneden i bedriften min',
  shortcutCareer: 'Jobb og karriere',
  shortcutCareerGoal: 'Forbedre CV-en min og den profesjonelle profilen min',
  yesterday: 'I går',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas. Viven en
   * `constants/businessModules.ts`. Lo que sí se traduce es todo lo demás.
   */
  slogan: 'Mote, stil, skjønnhet og skaping av visuelt innhold.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Bygg og driv bedriften din',
  modProductsHint: 'Produktene og prisene dine',
  modCreateHint: 'Lag innhold med KI',
  modSocialHint: 'Forbered og del overalt',
  modAnalyzeHint: 'Forstå bedriften din',
  modGrowHint: 'Finn muligheter og voks',
  modProfileHint: 'Bedriften din i Weë',
  modPromoteHint: 'Nå flere mennesker med Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Oversikt» y no «Bedriften din»: ese es el nombre de una de las cuentas de muestra. */
  overview: 'Oversikt over bedriften din',
  overviewEmpty: 'Du har ikke opprettet bedriften din ennå.',
  overviewEmptyHint: 'Fortell Weë med dine egne ord – «jeg selger desserter hjemmefra» – så hjelper jeg deg med å gi den form.',
  createBusiness: 'Opprett bedriften min',
  createBusinessGoal: 'Opprette bedriften min fra bunnen av: navn, hva jeg selger, til hvem og til hva slags pris',
  editBusiness: 'Rediger bedriften min',
  editBusinessGoal: 'Gå gjennom og forbedre informasjonen om bedriften min',
  businessInfo: 'Informasjon om bedriften',
  businessInfoGoal: 'Rydde i informasjonen om bedriften min: hva jeg selger, til hvem og hva som skiller meg ut',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Skrive forretningsplanen for å presentere bedriften min for en investor',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Hva bør jeg gjøre i bedriften min denne uken?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Du har ikke lagt til produkter ennå.',
  productsEmptyHint: 'Last opp et bilde, så skriver Weë navnet, beskrivelsen og salgsteksten.',
  addProduct: 'Legg til produkt',
  addProductGoal: 'Lage et produktkort: navn, beskrivelse, egenskaper og salgstekst',
  improveImage: 'Forbedre bildet',
  improveImageGoal: 'Forbedre produktbildet mitt så det selger bedre',
  productsCount_one: '{{contador}} produkt',
  productsCount_other: '{{contador}} produkter',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Legg inn hva det koster deg, så gir Weë deg en veiledende pris.',
  pricingMaterials: 'Materialer',
  pricingPackaging: 'Emballasje',
  pricingDelivery: 'Frakt',
  pricingOther: 'Andre kostnader',
  pricingMargin: 'Ønsket margin',
  pricingCost: 'Beregnet kostnad',
  pricingSuggested: 'Foreslått pris',
  pricingMarginResult: 'Beregnet margin',
  pricingProfit: 'Beregnet fortjeneste',
  pricingNote: 'Prisene er kun veiledende og er ikke regnskaps- eller skatterådgivning.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Det som gjør at innholdet ditt alltid ser ut som ditt.',
  brandLogo: 'Logo',
  brandColors: 'Farger',
  brandTypography: 'Typografi',
  brandStyle: 'Visuell stil',
  brandAvatar: 'Profilbilde',
  brandCover: 'Forsidebilde',
  brandTemplates: 'Innholdsmaler',
  brandGoal: 'Lage {{que}} til merkevaren til bedriften min',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Fortell meg hva du vil promotere, så gjør jeg det klart.',
  createPlaceholder: 'Eksempel: Jeg vil promotere denne kaken til morsdagen…',
  createTypes: 'Hva vil du lage?',
  typeImage: 'Bilde',
  typeImageHint: 'Et bilde til promotering',
  typeVideo: 'Video',
  typeVideoHint: 'En kort video',
  typePost: 'Innlegg',
  typePostHint: 'Klart til å publiseres',
  typeCampaign: 'Kampanje',
  typeCampaignHint: 'Flere deler på én gang',
  typeCopy: 'Tekster',
  typeCopyHint: 'Beskrivelse, emneknagger og handlingsoppfordring',
  typeGoal: 'Lage {{que}} for bedriften min: {{idea}}',
  formats: 'Velg format',
  formatsHint: 'Weë tar seg av størrelsen. Du velger hvor det skal.',
  formatTikTok: 'TikTok',
  /* «Instagram-video» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram-video',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram-innlegg',
  formatFeed: 'Facebook',
  formatWide: 'Liggende video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Fortell meg det med dine egne ord, så tar jeg meg av det.',
  askPlaceholder: 'Skriv ditt eget her…',
  askSend: 'Spør Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Lag innhold',
  goalWithProduct: '{{idea}} — produkt: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Lag det én gang. Del det overalt.',
  share: 'Del',
  shareHint: 'Delingsmenyen på telefonen din åpnes: velg appen du vil.',
  shareToWee: 'Del på Weë',
  shareWall: 'Min Wäll',
  shareCommunities: 'Fellesskap',
  shareProfile: 'Business Profile',
  shareNothing: 'Lag noe først, så kan du dele det herfra.',
  shareText: 'Laget med Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Last opp dataene mine',
  analyzeUploadHint: 'Excel, CSV eller PDF med salg og utgifter.',
  analyzeUploadGoal: 'Analysere filen med salg og utgifter for bedriften min',
  analyzeInsights: 'Det jeg ser i tallene dine',
  analyzeInsightsGoal: 'Forklare meg hva som skjer med salget i bedriften min',
  expenses: 'Utgifter',
  expensesHint: 'Noter hva pengene går til.',
  expensesEmpty: 'Du har ikke notert utgifter ennå.',
  addExpense: 'Legg til utgift',
  expenseSupplies: 'Råvarer',
  expenseMarketing: 'Markedsføring',
  expenseDelivery: 'Frakt',
  expenseStaff: 'Personale',
  expenseServices: 'Tjenester',
  expenseOther: 'Annet',
  expensesAsk: 'Hva bruker jeg for mye på?',
  expensesAskGoal: 'Gå gjennom utgiftene mine og si hva jeg bruker for mye på',
  swot: 'SWOT',
  swotHint: 'Styrker, svakheter, muligheter og trusler.',
  swotGoal: 'Lage SWOT-analysen for bedriften min',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Hjelp meg å vokse',
  helpMeGrowHint: 'Weë ser på bedriften din og foreslår hva du kan gjøre.',
  helpMeGrowGoal: 'En plan for å få bedriften min til å vokse, med konkrete steg',
  opportunities: 'Muligheter',
  opportunitiesEmpty: 'Når du har salg og innhold, dukker mulighetene jeg ser opp her.',
  createPromotion: 'Lag kampanjen',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Hvem du selger til og hva de trenger.',
  customerInsightsGoal: 'Beskrive idealkunden min og hva slags budskap som fungerer',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Hva mer du kan selge, eller hvordan du kan skille deg ut.',
  businessIdeasGoal: 'Gi meg ideer til bedriften min og til å skille meg ut',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Bedriften din har ikke en side på Weë ennå.',
  profileEmptyHint: 'Når du oppretter bedriften din, finner du siden her: hvem du er, hva du selger og hvordan man kontakter deg.',
  profileAbout: 'Om',
  profileProducts: 'Produkter',
  profilePosts: 'Innlegg',
  profileContact: 'Kontakt',
  reviews: 'Anmeldelser',
  reviewsHint: 'Hva kundene dine sier og hva du kan forbedre.',
  reviewsGoal: 'Analysere anmeldelsene av bedriften min og si hva jeg bør forbedre',
  reviewsRespond: 'Skriv et svar',
  reviewsRespondGoal: 'Skrive et profesjonelt svar på en anmeldelse av bedriften min',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Nå flere mennesker med Weë Credits',
  promoteHint: 'Innholdet ditt vises til flere i Weë. Du ser hva det koster før du bruker noe.',
  promoteSoon: 'Promotering i Weë er ikke åpnet ennå. Når det åpner, betales det med dine Credits, og du ser det her.',
  promoteCredits: 'Se mine Credits',
  sampleProductName: 'Produkt {{numero}}',
};
