/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra,
 * en catalán.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («tu»). Lo que representa al negocio de la persona —nombres de cuentas,
 * arrobas, títulos de publicaciones y mensajes de sus clientes— no pasa por el
 * traductor. Los nombres de módulo (Business Plan, Business Coach, Pricing
 * Assistant, Brand Kit, Customer Insights, Business Ideas, Business Profile,
 * SWOT) son nombres de producto y se escriben igual en todos los idiomas. Donde
 * se habla de dinero, precisión antes que elegancia: siempre queda claro qué es
 * una estimación y qué cuesta Credits.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Les meves xarxes socials',
  manageAccounts: 'Gestiona els comptes',
  connected: 'Connectat',
  networkConnected: '{{red}} connectat',
  connectAnother: 'Connecta una altra xarxa',
  allConnected: 'Ja tens totes les xarxes connectades.',
  simulatedConnection: 'Connexió simulada: Weë encara no publica ni respon per tu. Prepara cada peça perquè tu la revisis i la publiquis.',
  postCalendar: 'Calendari de publicacions',
  seeFullCalendar: 'Mostra el calendari complet',
  calendarGoal: 'Veure i organitzar el meu calendari de publicacions de la setmana',
  scheduleGoal: 'Programar una publicació per al {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Missatges de clients',
  seeAllMessages: 'Mostra\'ls tots',
  messagesGoal: 'Respondre als missatges dels meus clients',
  reply: 'Respon',
  replied: 'Respost',
  replyTo: 'Respon a {{nombre}}',
  repliedTo: 'Respost a {{nombre}}',
  replyGoal: 'Respondre a {{nombre}} a {{red}}: «{{mensaje}}»',
  resultsThisWeek: 'Resultats d\'aquesta setmana',
  statPosts: 'Publicacions',
  statReach: 'Abast',
  statInteractions: 'Interaccions',
  statMessages: 'Missatges rebuts',
  onTrack: 'El teu negoci va per bon camí',
  onTrackNote: 'Les interaccions han augmentat un 60% aquesta setmana. Continua així!',
  seeDetailedAnalysis: 'Mostra l\'anàlisi detallada',
  analysisGoal: 'Analitzar els resultats del meu negoci aquesta setmana',
  shortcutIdeas: 'Idees',
  shortcutIdeasGoal: 'Idees i estratègia per fer créixer el meu negoci',
  shortcutMarketing: 'Màrqueting',
  shortcutMarketingGoal: 'Una campanya de màrqueting per al meu negoci',
  shortcutSocial: 'Xarxes socials',
  shortcutSocialGoal: 'Crear contingut per a les xarxes del meu negoci',
  shortcutAnalyze: 'Analitza',
  shortcutAnalyzeGoal: 'Analitzar els resultats del meu negoci',
  shortcutDocuments: 'Documents',
  shortcutDocumentsGoal: 'Redactar un document per al meu negoci',
  shortcutSell: 'Ven més',
  shortcutSellGoal: 'Vendre més aquest mes al meu negoci',
  shortcutCareer: 'Feina i carrera',
  shortcutCareerGoal: 'Millorar el meu CV i el meu perfil professional',
  yesterday: 'Ahir',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas, como Weë
   * Studio o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se
   * traduce es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Moda, estil, bellesa i creació de contingut visual.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Construeix i administra el teu negoci',
  modProductsHint: 'Els teus productes i els seus preus',
  modCreateHint: 'Crea contingut amb IA',
  modSocialHint: 'Prepara i comparteix a tot arreu',
  modAnalyzeHint: 'Entén el teu negoci',
  modGrowHint: 'Troba oportunitats i creix',
  modProfileHint: 'El teu negoci dins de Weë',
  modPromoteHint: 'Arriba a més persones amb Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resum" y no "El teu negoci": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Resum del teu negoci',
  overviewEmpty: 'Encara no has creat el teu negoci.',
  overviewEmptyHint: 'Explica-ho a Weë amb les teves paraules —«venc postres des de casa»— i t\'ajudo a donar-li forma.',
  createBusiness: 'Crea el meu negoci',
  createBusinessGoal: 'Crear el meu negoci des de zero: nom, què venc, a qui i a quin preu',
  editBusiness: 'Edita el meu negoci',
  editBusinessGoal: 'Revisar i millorar la informació del meu negoci',
  businessInfo: 'Informació del negoci',
  businessInfoGoal: 'Ordenar la informació del meu negoci: què venc, a qui i què em diferencia',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Escriure el pla de negoci per presentar el meu negoci a un inversor',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Què hauria de fer aquesta setmana al meu negoci?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Encara no has afegit cap producte.',
  productsEmptyHint: 'Puja una foto i Weë escriu el nom, la descripció i el text per vendre\'l.',
  addProduct: 'Afegeix un producte',
  addProductGoal: 'Crear la fitxa d\'un producte: nom, descripció, característiques i text per vendre\'l',
  improveImage: 'Millora la foto',
  improveImageGoal: 'Millorar la foto del meu producte per vendre\'l millor',
  productsCount_one: '{{contador}} producte',
  productsCount_other: '{{contador}} productes',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Posa el que et costa i Weë et dona un preu de referència.',
  pricingMaterials: 'Materials',
  pricingPackaging: 'Embalatge',
  pricingDelivery: 'Enviament',
  pricingOther: 'Altres costos',
  pricingMargin: 'Marge que vols',
  pricingCost: 'Cost estimat',
  pricingSuggested: 'Preu suggerit',
  pricingMarginResult: 'Marge estimat',
  pricingProfit: 'Guany estimat',
  pricingNote: 'Els preus són una referència informativa i no són assessorament comptable ni fiscal.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'El que fa que el teu contingut es vegi sempre teu.',
  brandLogo: 'Logotip',
  brandColors: 'Colors',
  brandTypography: 'Tipografia',
  brandStyle: 'Estil visual',
  brandAvatar: 'Imatge de perfil',
  brandCover: 'Portada',
  brandTemplates: 'Plantilles de contingut',
  brandGoal: 'Crear {{que}} per a la marca del meu negoci',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Explica\'m què vols promocionar i t\'ho preparo.',
  createPlaceholder: 'Exemple: Vull promocionar aquest pastís per al Dia de la Mare…',
  createTypes: 'Què vols crear?',
  typeImage: 'Imatge',
  typeImageHint: 'Una imatge per promocionar',
  typeVideo: 'Vídeo',
  typeVideoHint: 'Un vídeo curt',
  typePost: 'Publicació',
  typePostHint: 'A punt per publicar',
  typeCampaign: 'Campanya',
  typeCampaignHint: 'Diverses peces alhora',
  typeCopy: 'Textos',
  typeCopyHint: 'Descripció, etiquetes i crida a l\'acció',
  typeGoal: 'Crear {{que}} per al meu negoci: {{idea}}',
  formats: 'Tria el format',
  formatsHint: 'Weë s\'encarrega de la mida. Tu tries on va.',
  formatTikTok: 'TikTok',
  /* "Vídeo d'Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Vídeo d\'Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Vídeo horitzontal',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Explica-m\'ho amb les teves paraules i me n\'encarrego.',
  askPlaceholder: 'Escriu aquí el que vulguis…',
  askSend: 'Pregunta a Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Crea contingut',
  goalWithProduct: '{{idea}} — producte: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Crea-ho un cop. Comparteix-ho a tot arreu.',
  share: 'Comparteix',
  shareHint: 'S\'obre el menú de compartició del telèfon: tria l\'app que vulguis.',
  shareToWee: 'Comparteix a Weë',
  shareWall: 'El meu Wäll',
  shareCommunities: 'Comunitats',
  shareProfile: 'Business Profile',
  shareNothing: 'Primer crea alguna cosa i després comparteix-ho des d\'aquí.',
  shareText: 'Creat amb Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Puja les meves dades',
  analyzeUploadHint: 'Excel, CSV o PDF amb les vendes i les despeses.',
  analyzeUploadGoal: 'Analitzar el fitxer de vendes i despeses del meu negoci',
  analyzeInsights: 'El que veig als teus números',
  analyzeInsightsGoal: 'Explicar-me què està passant amb les vendes del meu negoci',
  expenses: 'Despeses',
  expensesHint: 'Apunta en què se te\'n van els diners.',
  expensesEmpty: 'Encara no has apuntat cap despesa.',
  addExpense: 'Afegeix una despesa',
  expenseSupplies: 'Subministraments',
  expenseMarketing: 'Màrqueting',
  expenseDelivery: 'Enviaments',
  expenseStaff: 'Personal',
  expenseServices: 'Serveis',
  expenseOther: 'Altres',
  expensesAsk: 'En què estic gastant de més?',
  expensesAskGoal: 'Revisar les meves despeses i dir-me en què estic gastant de més',
  swot: 'DAFO',
  swotHint: 'Fortaleses, debilitats, oportunitats i amenaces.',
  swotGoal: 'Fer l\'anàlisi DAFO del meu negoci',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Ajuda\'m a créixer',
  helpMeGrowHint: 'Weë mira el teu negoci i et proposa què fer.',
  helpMeGrowGoal: 'Un pla per fer créixer el meu negoci, amb passos concrets',
  opportunities: 'Oportunitats',
  opportunitiesEmpty: 'Quan tinguis vendes i contingut, aquí apareixeran les oportunitats que vegi.',
  createPromotion: 'Crea la promoció',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'A qui vens i què necessita.',
  customerInsightsGoal: 'Descriure el meu client ideal i quins missatges li funcionen',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Què més podries vendre o com diferenciar-te.',
  businessIdeasGoal: 'Donar-me idees per al meu negoci i per diferenciar-me',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'El teu negoci encara no té pàgina a Weë.',
  profileEmptyHint: 'Quan creïs el teu negoci, aquí hi haurà la seva pàgina: qui ets, què vens i com et poden contactar.',
  profileAbout: 'Quant a',
  profileProducts: 'Productes',
  profilePosts: 'Publicacions',
  profileContact: 'Contacte',
  reviews: 'Ressenyes',
  reviewsHint: 'Què diuen els teus clients i què millorar.',
  reviewsGoal: 'Analitzar les ressenyes del meu negoci i dir-me què millorar',
  reviewsRespond: 'Escriu una resposta',
  reviewsRespondGoal: 'Escriure una resposta professional a una ressenya del meu negoci',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Arriba a més persones amb Weë Credits',
  promoteHint: 'El teu contingut es mostra a més gent dins de Weë. Abans de gastar res veuràs quant costa.',
  promoteSoon: 'Promocionar dins de Weë encara no està obert. Quan ho estigui, es pagarà amb els teus Credits i ho veuràs aquí.',
  promoteCredits: 'Mostra els meus Credits',
  sampleProductName: 'Producte {{numero}}',
};
