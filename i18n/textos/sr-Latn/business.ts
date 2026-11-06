/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de
 * muestra, en serbio (ekaviano, cirílico).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). Las metas que viajan a Weë AI (`*Goal`) van en infinitivo o en
 * primera persona, como en el español. Los nombres de los módulos —My Business,
 * Business Plan, Brand Kit, Pricing Assistant…— son nombres de producto y se
 * escriben en latino dentro de la frase cirílica, igual que TikTok o Instagram.
 *
 * PLURALES: el serbio tiene one / few / other donde el español tiene dos, así
 * que el archivo se declara con `ConPlurales` para añadir `_few` a la única
 * clave que lleva cantidad, `productsCount`.
 */
import { ConPlurales } from '../ru/plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Moje društvene mreže',
  manageAccounts: 'Upravljaj nalozima',
  connected: 'Povezano',
  networkConnected: '{{red}}: povezano',
  connectAnother: 'Poveži još jednu mrežu',
  allConnected: 'Sve tvoje mreže su već povezane.',
  simulatedConnection: 'Simulirana veza: Weë još ne objavljuje niti odgovara umesto tebe. Priprema svaki sadržaj da ga ti pregledaš i objaviš.',
  postCalendar: 'Kalendar objava',
  seeFullCalendar: 'Prikaži ceo kalendar',
  calendarGoal: 'Videti i organizovati moj kalendar objava za ovu nedelju',
  scheduleGoal: 'Zakazati objavu za {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Poruke kupaca',
  seeAllMessages: 'Prikaži sve',
  messagesGoal: 'Odgovoriti na poruke mojih kupaca',
  reply: 'Odgovori',
  replied: 'Odgovoreno',
  replyTo: 'Odgovori: {{nombre}}',
  repliedTo: 'Odgovoreno: {{nombre}}',
  replyGoal: 'Odgovoriti korisniku {{nombre}} na mreži {{red}}: „{{mensaje}}“',
  resultsThisWeek: 'Rezultati ove nedelje',
  statPosts: 'Objave',
  statReach: 'Dosegnute osobe',
  statInteractions: 'Interakcije',
  statMessages: 'Primljene poruke',
  onTrack: 'Tvoj biznis je na dobrom putu',
  onTrackNote: 'Interakcije su ove nedelje porasle za 60%. Samo tako nastavi!',
  seeDetailedAnalysis: 'Prikaži detaljnu analizu',
  analysisGoal: 'Analizirati rezultate mog biznisa ove nedelje',
  shortcutIdeas: 'Ideje',
  shortcutIdeasGoal: 'Ideje i strategija za rast mog biznisa',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Marketinška kampanja za moj biznis',
  shortcutSocial: 'Društvene mreže',
  shortcutSocialGoal: 'Kreirati sadržaj za mreže mog biznisa',
  shortcutAnalyze: 'Analiziraj',
  shortcutAnalyzeGoal: 'Analizirati rezultate mog biznisa',
  shortcutDocuments: 'Dokumenti',
  shortcutDocumentsGoal: 'Sastaviti dokument za moj biznis',
  shortcutSell: 'Prodaj više',
  shortcutSellGoal: 'Prodati više ovog meseca u mom biznisu',
  shortcutCareer: 'Posao i karijera',
  shortcutCareerGoal: 'Poboljšati moj CV i moj profesionalni profil',
  yesterday: 'Juče',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en los dos idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Moda, stil, lepota i kreiranje vizuelnog sadržaja.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Izgradi i vodi svoj biznis',
  modProductsHint: 'Tvoji proizvodi i njihove cene',
  modCreateHint: 'Kreiraj sadržaj uz AI',
  modSocialHint: 'Pripremi i podeli svuda',
  modAnalyzeHint: 'Razumej svoj biznis',
  modGrowHint: 'Pronađi prilike i rasti',
  modProfileHint: 'Tvoj biznis unutar Weë',
  modPromoteHint: 'Dopri do više ljudi uz Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Pregled tvog biznisa',
  overviewEmpty: 'Tvoj biznis još nije kreiran.',
  overviewEmptyHint: 'Opiši ga Weë svojim rečima — „prodajem kolače od kuće“ — i pomoći ću ti da ga uobličiš.',
  createBusiness: 'Kreiraj moj biznis',
  createBusinessGoal: 'Kreirati moj biznis od nule: naziv, šta prodajem, kome i po kojoj ceni',
  editBusiness: 'Izmeni moj biznis',
  editBusinessGoal: 'Pregledati i poboljšati informacije o mom biznisu',
  businessInfo: 'Informacije o biznisu',
  businessInfoGoal: 'Srediti informacije o mom biznisu: šta prodajem, kome i šta me izdvaja',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Napisati biznis plan da predstavim svoj biznis investitoru',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Šta bi trebalo da uradim ove nedelje u svom biznisu?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Još nema dodatih proizvoda.',
  productsEmptyHint: 'Otpremi fotografiju i Weë piše naziv, opis i prodajni tekst.',
  addProduct: 'Dodaj proizvod',
  addProductGoal: 'Kreirati karticu proizvoda: naziv, opis, karakteristike i prodajni tekst',
  improveImage: 'Poboljšaj fotografiju',
  improveImageGoal: 'Poboljšati fotografiju mog proizvoda da se bolje prodaje',
  /* «proizvod» se declina: 1 proizvod · 2 proizvoda · 5 proizvoda (one también cubre 21, 31…). */
  productsCount_one: '{{contador}} proizvod',
  productsCount_few: '{{contador}} proizvoda',
  productsCount_other: '{{contador}} proizvoda',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Unesi koliko te košta i Weë ti daje orijentacionu cenu.',
  pricingMaterials: 'Materijali',
  pricingPackaging: 'Pakovanje',
  pricingDelivery: 'Dostava',
  pricingOther: 'Ostali troškovi',
  pricingMargin: 'Željena marža',
  pricingCost: 'Procenjeni trošak',
  pricingSuggested: 'Predložena cena',
  pricingMarginResult: 'Procenjena marža',
  pricingProfit: 'Procenjena zarada',
  pricingNote: 'Cene su samo orijentacione i nisu računovodstveni ni poreski savet.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Ono zbog čega tvoj sadržaj uvek izgleda kao tvoj.',
  brandLogo: 'Logo',
  brandColors: 'Boje',
  brandTypography: 'Tipografija',
  brandStyle: 'Vizuelni stil',
  brandAvatar: 'Profilna slika',
  brandCover: 'Naslovna slika',
  brandTemplates: 'Šabloni sadržaja',
  brandGoal: 'Kreirati {{que}} za brend mog biznisa',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Reci mi šta želiš da promovišeš i ja ću to pripremiti.',
  createPlaceholder: 'Primer: Želim da promovišem ovu tortu za Dan majki…',
  createTypes: 'Šta želiš da kreiraš?',
  typeImage: 'Slika',
  typeImageHint: 'Slika za promociju',
  typeVideo: 'Video',
  typeVideoHint: 'Kratak video',
  typePost: 'Objava',
  typePostHint: 'Spremna za objavljivanje',
  typeCampaign: 'Kampanja',
  typeCampaignHint: 'Više delova odjednom',
  typeCopy: 'Tekstovi',
  typeCopyHint: 'Opis, heštegovi i poziv na akciju',
  typeGoal: 'Kreirati {{que}} za moj biznis: {{idea}}',
  formats: 'Izaberi format',
  formatsHint: 'Weë se brine o veličini. Ti biraš gde ide.',
  formatTikTok: 'TikTok',
  /* "Instagram video" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram video',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Položeni video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Ispričaj mi svojim rečima i ja ću se pobrinuti.',
  askPlaceholder: 'Napiši ovde šta ti treba…',
  askSend: 'Pitaj Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Kreiraj sadržaj',
  goalWithProduct: '{{idea}} — proizvod: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Kreiraj jednom. Podeli svuda.',
  share: 'Podeli',
  shareHint: 'Otvara se deljenje na tvom telefonu: izaberi aplikaciju koju želiš.',
  shareToWee: 'Podeli na Weë',
  shareWall: 'Moj Wäll',
  shareCommunities: 'Zajednice',
  shareProfile: 'Business Profile',
  shareNothing: 'Prvo nešto kreiraj, pa to podeli odavde.',
  shareText: 'Kreirano uz Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Otpremi moje podatke',
  analyzeUploadHint: 'Excel, CSV ili PDF sa tvojom prodajom i troškovima.',
  analyzeUploadGoal: 'Analizirati fajl sa prodajom i troškovima mog biznisa',
  analyzeInsights: 'Šta vidim u tvojim brojkama',
  analyzeInsightsGoal: 'Objasni mi šta se dešava sa prodajom mog biznisa',
  expenses: 'Troškovi',
  expensesHint: 'Zabeleži na šta ti odlazi novac.',
  expensesEmpty: 'Još nema zabeleženih troškova.',
  addExpense: 'Dodaj trošak',
  expenseSupplies: 'Sirovine',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Dostave',
  expenseStaff: 'Osoblje',
  expenseServices: 'Usluge',
  expenseOther: 'Ostalo',
  expensesAsk: 'Na šta trošim previše?',
  expensesAskGoal: 'Pregledaj moje troškove i reci mi na šta trošim previše',
  swot: 'SWOT',
  swotHint: 'Snage, slabosti, prilike i pretnje.',
  swotGoal: 'Uraditi SWOT analizu mog biznisa',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Pomozi mi da rastem',
  helpMeGrowHint: 'Weë gleda tvoj biznis i predlaže ti šta da radiš.',
  helpMeGrowGoal: 'Plan za rast mog biznisa, sa konkretnim koracima',
  opportunities: 'Prilike',
  opportunitiesEmpty: 'Kada bude bilo prodaje i sadržaja, ovde će se pojaviti prilike koje uočim.',
  createPromotion: 'Kreiraj promociju',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kome prodaješ i šta tvojim kupcima treba.',
  customerInsightsGoal: 'Opisati mog idealnog kupca i koje poruke kod njega deluju',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Šta bi još moglo da se prodaje ili kako da se izdvojiš.',
  businessIdeasGoal: 'Daj mi ideje za moj biznis i za to kako da se izdvojim',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Tvoj biznis još nema stranicu na Weë.',
  profileEmptyHint: 'Kada kreiraš svoj biznis, ovde će biti njegova stranica: ko si, šta prodaješ i kako da te kontaktiraju.',
  profileAbout: 'O nama',
  profileProducts: 'Proizvodi',
  profilePosts: 'Objave',
  profileContact: 'Kontakt',
  reviews: 'Recenzije',
  reviewsHint: 'Šta kažu tvoji kupci i šta da poboljšaš.',
  reviewsGoal: 'Analiziraj recenzije mog biznisa i reci mi šta da poboljšam',
  reviewsRespond: 'Napiši odgovor',
  reviewsRespondGoal: 'Napisati profesionalan odgovor na recenziju mog biznisa',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Dopri do više ljudi uz Weë Credits',
  promoteHint: 'Tvoj sadržaj se prikazuje većem broju ljudi unutar Weë. Pre nego što išta potrošiš, videćeš koliko košta.',
  promoteSoon: 'Promovisanje unutar Weë još nije otvoreno. Kada bude, plaćaće se tvojim Credits i videćeš ga ovde.',
  promoteCredits: 'Prikaži moje Credits',
  sampleProductName: 'Proizvod {{numero}}',
};
