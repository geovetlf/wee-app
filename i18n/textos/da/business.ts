/*
 * DANÉS — Weë Business: la pantalla del negocio, sus ocho módulos y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Lo que representa al negocio de la
 * persona —nombres de cuentas, arrobas, títulos de publicaciones y mensajes de sus clientes— no pasa por aquí.
 *
 * «Negocio» es «virksomhed» (glosario § 9.6), y vale igual para quien vende postres desde casa; «cliente» es
 * «kunde»; una red social conectada es una «konto» que se «forbinder». Los nombres de los ocho módulos (My Business,
 * Products & Catalog…) son de producto, viven en `constants/businessModules.ts` y no pasan por el traductor; por eso
 * «Business Profile» se queda igual cuando es un destino para compartir. Los NOMBRES de las funciones de dentro
 * —Business Plan, Business Coach, Pricing Assistant, Brand Kit, Customer Insights, Business Ideas— también son de
 * producto y se escriben igual en todos los idiomas (decisión del usuario, 2026-09-16); lo que hace cada una sí se
 * traduce. «SWOT» se queda como sigla: «SWOT-analyse» (guía § 4).
 *
 * Los «…Goal» son lo que la persona le pide a Weë Brain: aparecen como su propio mensaje en la conversación y acaban
 * siendo el título del trabajo. Se piden en imperativo y en primera persona («Skriv et dokument til min
 * virksomhed»). «Analizar» se pide como «Lav en analyse af…», porque el imperativo «Analyser» se lee también como el
 * plural «analyser»; y «Mejorar», como «Optimer» o «gør … bedre», porque «Forbedr» acaba en grupo de consonantes
 * (guía § 3). Los que reciben el nombre de una pieza o de un tipo («Logo», «Billede») EMPIEZAN por él —«{{que}} til
 * min virksomheds brand»— para no dejar una mayúscula en mitad de la frase.
 *
 * El día va delante de la fecha, como lo escribe `Intl` en danés: «tirs. 30. sep.». El porcentaje, con espacio
 * fijo: «60 %». Las comillas, ”…”, y el inciso, con raya media. Las reseñas son «anmeldelser» (glosario § 9.6). El
 * envío es «Levering» (glosario) y la llamada a la acción, «opfordring til handling». El gasto «Servicios» es el de
 * luz, agua e internet (su icono es un rayo): «Regninger», distinto a propósito de los servicios del directorio de
 * Weë Biz; «Insumos» es «Varekøb» y «Personal», «Personale». El margen es «avance», como lo dice un comerciante
 * danés. Los formatos de destino se dicen como los dice quien publica en danés —«Instagram-opslag»,
 * «Instagram-story»—, con el guion de marca + sustantivo de la guía; y «Video de Instagram», nunca «Reels».
 * «Csv» y «pdf» en minúscula, como siglas comunes (guía § 3). «Comunidades» son «Fællesskaber».
 *
 * Se escriben igual que en español o en inglés porque ES la palabra danesa: «Logo», «Video» y «TikTok».
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Mine sociale medier',
  manageAccounts: 'Administrer konti',
  connected: 'Forbundet',
  networkConnected: '{{red}} er forbundet',
  connectAnother: 'Forbind endnu en konto',
  allConnected: 'Alle dine konti er allerede forbundet.',
  simulatedConnection: 'Simuleret forbindelse: Weë slår op og svarer for alvor, når platformene giver deres officielle tilladelser.',
  postCalendar: 'Opslagskalender',
  seeFullCalendar: 'Se hele kalenderen',
  calendarGoal: 'Vis og organiser min opslagskalender for ugen',
  scheduleGoal: 'Planlæg et opslag til {{dia}} den {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Beskeder fra kunder',
  seeAllMessages: 'Se alle',
  messagesGoal: 'Svar på mine kunders beskeder',
  reply: 'Svar',
  replied: 'Besvaret',
  replyTo: 'Svar {{nombre}}',
  repliedTo: 'Du har svaret {{nombre}}',
  replyGoal: 'Svar {{nombre}} på {{red}}: ”{{mensaje}}”',
  resultsThisWeek: 'Ugens resultater',
  statPosts: 'Opslag',
  statReach: 'Personer nået',
  statInteractions: 'Interaktioner',
  statMessages: 'Modtagne beskeder',
  onTrack: 'Din virksomhed er på rette vej',
  onTrackNote: 'Interaktionerne er steget med 60 % i denne uge. Fortsæt sådan!',
  seeDetailedAnalysis: 'Se detaljeret analyse',
  analysisGoal: 'Lav en analyse af min virksomheds resultater denne uge',
  shortcutIdeas: 'Idéer',
  shortcutIdeasGoal: 'Idéer og en strategi, så min virksomhed kan vokse',
  shortcutMarketing: 'Markedsføring',
  shortcutMarketingGoal: 'En markedsføringskampagne for min virksomhed',
  shortcutSocial: 'Sociale medier',
  shortcutSocialGoal: 'Lav indhold til min virksomheds sociale medier',
  shortcutAnalyze: 'Analyse',
  shortcutAnalyzeGoal: 'Lav en analyse af min virksomheds resultater',
  shortcutDocuments: 'Dokumenter',
  shortcutDocumentsGoal: 'Skriv et dokument til min virksomhed',
  shortcutSell: 'Sælg mere',
  shortcutSellGoal: 'Hjælp mig med at sælge mere i min virksomhed denne måned',
  shortcutCareer: 'Job og karriere',
  shortcutCareerGoal: 'Hjælp mig med at forbedre mit CV og min faglige profil',
  yesterday: 'I går',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: 'Skab, styr, markedsfør og få din virksomhed til at vokse.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Opbyg og styr din virksomhed',
  modProductsHint: 'Dine produkter og priser',
  modCreateHint: 'Lav indhold med AI',
  modSocialHint: 'Gør det klar, og del det overalt',
  modAnalyzeHint: 'Forstå din virksomhed',
  modGrowHint: 'Find muligheder for at vokse',
  modProfileHint: 'Din virksomhed på Weë',
  modPromoteHint: 'Nå ud til flere med Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Overblik» y no «Din virksomhed»: «Tu negocio» es el nombre de una de las cuentas de muestra. */
  overview: 'Overblik over din virksomhed',
  overviewEmpty: 'Du har ikke oprettet din virksomhed endnu.',
  overviewEmptyHint: 'Fortæl Weë om den med dine egne ord – ”jeg sælger desserter hjemmefra” – så hjælper jeg dig med at give den form.',
  createBusiness: 'Opret min virksomhed',
  createBusinessGoal: 'Opret min virksomhed fra bunden: navn, hvad jeg sælger, til hvem og til hvilken pris',
  editBusiness: 'Rediger min virksomhed',
  editBusinessGoal: 'Gennemgå oplysningerne om min virksomhed, og gør dem bedre',
  businessInfo: 'Virksomhedsoplysninger',
  businessInfoGoal: 'Organiser oplysningerne om min virksomhed: hvad jeg sælger, til hvem og hvad der gør mig anderledes',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Skriv en forretningsplan, så jeg kan præsentere min virksomhed for en investor',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Hvad bør jeg gøre i min virksomhed denne uge?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Du har ikke tilføjet nogen produkter endnu.',
  productsEmptyHint: 'Upload et foto, så skriver Weë navnet, beskrivelsen og salgsteksten.',
  addProduct: 'Tilføj produkt',
  addProductGoal: 'Lav en produktside: navn, beskrivelse, egenskaber og salgstekst',
  improveImage: 'Optimer fotoet',
  improveImageGoal: 'Optimer produktfotoet, så mit produkt sælger bedre',
  productsCount_one: '{{contador}} produkt',
  productsCount_other: '{{contador}} produkter',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Skriv, hvad det koster dig, så giver Weë dig en vejledende pris.',
  pricingMaterials: 'Materialer',
  pricingPackaging: 'Emballage',
  pricingDelivery: 'Levering',
  pricingOther: 'Andre omkostninger',
  pricingMargin: 'Ønsket avance',
  pricingCost: 'Anslået kostpris',
  pricingSuggested: 'Foreslået pris',
  pricingMarginResult: 'Anslået avance',
  pricingProfit: 'Anslået fortjeneste',
  pricingNote: 'Priserne er kun vejledende og er ikke regnskabs- eller skatterådgivning.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Det, der får dit indhold til altid at ligne dig.',
  brandLogo: 'Logo',
  brandColors: 'Farver',
  brandTypography: 'Typografi',
  brandStyle: 'Visuel stil',
  brandAvatar: 'Profilbillede',
  brandCover: 'Coverbillede',
  brandTemplates: 'Indholdsskabeloner',
  brandGoal: '{{que}} til min virksomheds brand',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Fortæl mig, hvad du vil markedsføre, så gør jeg det klar.',
  createPlaceholder: 'Eksempel: Jeg vil markedsføre denne kage til mors dag…',
  createTypes: 'Hvad vil du lave?',
  typeImage: 'Billede',
  typeImageHint: 'Et billede til markedsføring',
  typeVideo: 'Video',
  typeVideoHint: 'En kort video',
  typePost: 'Opslag',
  typePostHint: 'Klar til at slå op',
  typeCampaign: 'Kampagne',
  typeCampaignHint: 'Flere elementer på én gang',
  typeCopy: 'Tekster',
  typeCopyHint: 'Beskrivelse, hashtags og opfordring til handling',
  typeGoal: '{{que}} til min virksomhed: {{idea}}',
  formats: 'Vælg format',
  formatsHint: 'Weë sørger for størrelsen. Du vælger, hvor det skal vises.',
  formatTikTok: 'TikTok',
  /* «Instagram-video» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram-video',
  formatStory: 'Instagram-story',
  formatFacebookStory: 'Facebook-story',
  formatPost: 'Instagram-opslag',
  formatFeed: 'Facebook-opslag',
  formatWide: 'Liggende video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Fortæl mig det med dine egne ord, så klarer jeg resten.',
  askPlaceholder: 'Skriv her…',
  askSend: 'Spørg Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Lav indhold',
  goalWithProduct: '{{idea}} – produkt: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Lav det én gang. Del det overalt.',
  share: 'Del',
  shareHint: 'Telefonens delingsmenu åbnes: Vælg den app, du vil bruge.',
  shareToWee: 'Del på Weë',
  shareWall: 'Min Wäll',
  shareCommunities: 'Fællesskaber',
  shareProfile: 'Business Profile',
  shareNothing: 'Lav noget først, så kan du dele det herfra.',
  shareText: 'Lavet med Weë Business',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Upload mine data',
  analyzeUploadHint: 'Excel, csv eller pdf med dit salg og dine udgifter.',
  analyzeUploadGoal: 'Lav en analyse af filen med min virksomheds salg og udgifter',
  analyzeInsights: 'Det, jeg ser i dine tal',
  analyzeInsightsGoal: 'Forklar mig, hvad der sker med salget i min virksomhed',
  expenses: 'Udgifter',
  expensesHint: 'Skriv ned, hvad pengene går til.',
  expensesEmpty: 'Du har ikke skrevet nogen udgifter ned endnu.',
  addExpense: 'Tilføj udgift',
  expenseSupplies: 'Varekøb',
  expenseMarketing: 'Markedsføring',
  expenseDelivery: 'Levering',
  expenseStaff: 'Personale',
  expenseServices: 'Regninger',
  expenseOther: 'Andet',
  expensesAsk: 'Hvad bruger jeg for mange penge på?',
  expensesAskGoal: 'Gennemgå mine udgifter, og sig, hvad jeg bruger for mange penge på',
  swot: 'SWOT-analyse',
  swotHint: 'Styrker, svagheder, muligheder og trusler.',
  swotGoal: 'Lav en SWOT-analyse af min virksomhed',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Hjælp mig med at vokse',
  helpMeGrowHint: 'Weë ser på din virksomhed og foreslår, hvad du kan gøre.',
  helpMeGrowGoal: 'En plan med konkrete trin, der kan få min virksomhed til at vokse',
  opportunities: 'Muligheder',
  opportunitiesEmpty: 'Når du har salg og indhold, viser jeg her de muligheder, jeg ser.',
  createPromotion: 'Lav kampagnen',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Hvem du sælger til, og hvad de har brug for.',
  customerInsightsGoal: 'Beskriv min ideelle kunde og de budskaber, der virker',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Hvad du ellers kan sælge, eller hvordan du skiller dig ud.',
  businessIdeasGoal: 'Giv mig idéer til min virksomhed og til, hvordan jeg kan skille mig ud',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Din virksomhed har ikke en side på Weë endnu.',
  profileEmptyHint: 'Når du opretter din virksomhed, får den sin side her: hvem du er, hvad du sælger, og hvordan man kontakter dig.',
  profileAbout: 'Om virksomheden',
  profileProducts: 'Produkter',
  profilePosts: 'Opslag',
  profileContact: 'Kontakt',
  reviews: 'Anmeldelser',
  reviewsHint: 'Hvad dine kunder siger, og hvad du kan gøre bedre.',
  reviewsGoal: 'Lav en analyse af anmeldelserne af min virksomhed, og sig, hvad jeg kan gøre bedre',
  reviewsRespond: 'Skriv et svar',
  reviewsRespondGoal: 'Skriv et professionelt svar på en anmeldelse af min virksomhed',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Nå ud til flere med Weë Credits',
  promoteHint: 'Dit indhold bliver vist for flere på Weë. Du kan se prisen, før du bruger noget.',
  promoteSoon: 'Det er endnu ikke muligt at promovere på Weë. Når det bliver muligt, betaler du med dine Credits, og du finder det her.',
  promoteCredits: 'Se mine Credits',
  sampleProductName: 'Produkt {{numero}}',
};
