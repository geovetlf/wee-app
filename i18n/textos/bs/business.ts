/*
 * Weë Business en bosnio (bs-BA, ijekaviano, latino): la pantalla del negocio
 * y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español. Tuteo («ti»). Los nombres de los ocho módulos y de
 * las funciones con nombre propio —Business Plan, Business Coach, Pricing
 * Assistant, Brand Kit, Customer Insights, Business Ideas, Business Profile,
 * SWOT— se quedan como están; «Weë Business» solo donde el español lo dice.
 *
 * PLURALES: el bosnio tiene one / few / other, así que este archivo se declara
 * con `ConPlurales` para añadir `_few` a `productsCount`.
 */
import { ConPlurales } from '../ru/plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Moje društvene mreže',
  manageAccounts: 'Upravljaj računima',
  connected: 'Povezano',
  networkConnected: '{{red}} povezan',
  connectAnother: 'Poveži drugu mrežu',
  allConnected: 'Sve tvoje mreže su već povezane.',
  simulatedConnection: 'Simulirana veza: Weë još ne objavljuje niti odgovara umjesto tebe. Priprema svaki dio da ga ti pregledaš i objaviš.',
  postCalendar: 'Kalendar objava',
  seeFullCalendar: 'Pogledaj cijeli kalendar',
  calendarGoal: 'Pogledati i organizovati moj kalendar objava za ovu sedmicu',
  scheduleGoal: 'Zakazati objavu za {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Poruke kupaca',
  seeAllMessages: 'Pogledaj sve',
  messagesGoal: 'Odgovoriti na poruke mojih kupaca',
  reply: 'Odgovori',
  replied: 'Odgovoreno',
  replyTo: 'Odgovori: {{nombre}}',
  repliedTo: 'Odgovoreno: {{nombre}}',
  replyGoal: 'Odgovoriti osobi {{nombre}} na mreži {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Rezultati ove sedmice',
  statPosts: 'Objave',
  statReach: 'Dosegnute osobe',
  statInteractions: 'Interakcije',
  statMessages: 'Primljene poruke',
  onTrack: 'Tvoj biznis je na dobrom putu',
  onTrackNote: 'Interakcije su porasle za 60% ove sedmice. Samo tako nastavi!',
  seeDetailedAnalysis: 'Pogledaj detaljnu analizu',
  analysisGoal: 'Analizirati rezultate mog biznisa ove sedmice',
  shortcutIdeas: 'Ideje',
  shortcutIdeasGoal: 'Ideje i strategija za rast mog biznisa',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Marketinška kampanja za moj biznis',
  shortcutSocial: 'Društvene mreže',
  shortcutSocialGoal: 'Kreirati sadržaj za mreže mog biznisa',
  shortcutAnalyze: 'Analiziraj',
  shortcutAnalyzeGoal: 'Analizirati rezultate mog biznisa',
  shortcutDocuments: 'Dokumenti',
  shortcutDocumentsGoal: 'Napisati dokument za moj biznis',
  shortcutSell: 'Prodaj više',
  shortcutSellGoal: 'Prodati više ovog mjeseca u mom biznisu',
  shortcutCareer: 'Posao i karijera',
  shortcutCareerGoal: 'Poboljšati moj CV i profesionalni profil',
  yesterday: 'Jučer',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas, como Weë
   * Studio o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se
   * traduce es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Moda, stil, ljepota i kreiranje vizuelnog sadržaja.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Izgradi i vodi svoj biznis',
  modProductsHint: 'Tvoji proizvodi i njihove cijene',
  modCreateHint: 'Kreiraj sadržaj uz AI',
  modSocialHint: 'Pripremi i podijeli svugdje',
  modAnalyzeHint: 'Razumij svoj biznis',
  modGrowHint: 'Pronađi prilike i rasti',
  modProfileHint: 'Tvoj biznis u aplikaciji Weë',
  modPromoteHint: 'Dosegni više ljudi uz Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Pregled» y no «Tvoj biznis»: ese es el nombre de una de las cuentas de muestra. */
  overview: 'Pregled tvog biznisa',
  overviewEmpty: 'Tvoj biznis još nije kreiran.',
  overviewEmptyHint: 'Ispričaj to Weë svojim riječima („prodajem kolače od kuće“) i pomoći ću ti da to uobličiš.',
  createBusiness: 'Kreiraj moj biznis',
  createBusinessGoal: 'Kreirati moj biznis od nule: naziv, šta prodajem, kome i po kojoj cijeni',
  editBusiness: 'Uredi moj biznis',
  editBusinessGoal: 'Pregledati i poboljšati informacije o mom biznisu',
  businessInfo: 'Informacije o biznisu',
  businessInfoGoal: 'Srediti informacije o mom biznisu: šta prodajem, kome i po čemu se razlikujem',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Napisati biznis plan za predstavljanje mog biznisa investitoru',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Šta bi trebalo uraditi ove sedmice u mom biznisu?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Još nema dodanih proizvoda.',
  productsEmptyHint: 'Učitaj fotografiju i Weë piše naziv, opis i prodajni tekst.',
  addProduct: 'Dodaj proizvod',
  addProductGoal: 'Kreirati karticu proizvoda: naziv, opis, karakteristike i prodajni tekst',
  improveImage: 'Poboljšaj fotografiju',
  improveImageGoal: 'Poboljšati fotografiju mog proizvoda da se bolje prodaje',
  /* «proizvod» es masculino y se declina: 1 proizvod · 2 proizvoda · 5 proizvoda. */
  productsCount_one: '{{contador}} proizvod',
  productsCount_few: '{{contador}} proizvoda',
  productsCount_other: '{{contador}} proizvoda',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Unesi koliko te košta i Weë ti daje referentnu cijenu.',
  pricingMaterials: 'Materijali',
  pricingPackaging: 'Pakovanje',
  pricingDelivery: 'Dostava',
  pricingOther: 'Ostali troškovi',
  pricingMargin: 'Željena marža',
  pricingCost: 'Procijenjeni trošak',
  pricingSuggested: 'Predložena cijena',
  pricingMarginResult: 'Procijenjena marža',
  pricingProfit: 'Procijenjena zarada',
  pricingNote: 'Cijene su informativna referenca i nisu računovodstveni ni porezni savjet.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Ono po čemu tvoj sadržaj uvijek izgleda kao tvoj.',
  brandLogo: 'Logo',
  brandColors: 'Boje',
  brandTypography: 'Tipografija',
  brandStyle: 'Vizuelni stil',
  brandAvatar: 'Profilna slika',
  brandCover: 'Naslovna slika',
  brandTemplates: 'Šabloni sadržaja',
  brandGoal: 'Kreirati {{que}} za brend mog biznisa',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Reci mi šta želiš promovisati i ja ću to pripremiti.',
  createPlaceholder: 'Primjer: Želim promovisati ovu tortu za Dan majki…',
  createTypes: 'Šta želiš kreirati?',
  typeImage: 'Slika',
  typeImageHint: 'Slika za promociju',
  typeVideo: 'Video',
  typeVideoHint: 'Kratki video',
  typePost: 'Objava',
  typePostHint: 'Spremna za objavljivanje',
  typeCampaign: 'Kampanja',
  typeCampaignHint: 'Više dijelova odjednom',
  typeCopy: 'Tekstovi',
  typeCopyHint: 'Opis, hashtagovi i poziv na akciju',
  typeGoal: 'Kreirati {{que}} za moj biznis: {{idea}}',
  formats: 'Odaberi format',
  formatsHint: 'Weë se brine za veličinu. Ti biraš gdje ide.',
  formatTikTok: 'TikTok',
  /* «Instagram video» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram video',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Horizontalni video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Ispričaj mi svojim riječima i ja ću se pobrinuti.',
  askPlaceholder: 'Napiši ovdje šta ti treba…',
  askSend: 'Pitaj Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Kreiraj sadržaj',
  goalWithProduct: '{{idea}} — proizvod: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Kreiraj jednom. Podijeli svugdje.',
  share: 'Podijeli',
  shareHint: 'Otvara se dijeljenje na tvom telefonu: odaberi aplikaciju koju želiš.',
  shareToWee: 'Podijeli na Weë',
  shareWall: 'Moj Wäll',
  shareCommunities: 'Zajednice',
  shareProfile: 'Business Profile',
  shareNothing: 'Prvo nešto kreiraj, a onda to podijeli odavde.',
  shareText: 'Kreirano uz Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Učitaj moje podatke',
  analyzeUploadHint: 'Excel, CSV ili PDF s tvojom prodajom i troškovima.',
  analyzeUploadGoal: 'Analizirati fajl s prodajom i troškovima mog biznisa',
  analyzeInsights: 'Šta vidim u tvojim brojkama',
  analyzeInsightsGoal: 'Objasniti mi šta se dešava s prodajom mog biznisa',
  expenses: 'Troškovi',
  expensesHint: 'Zabilježi na šta ti odlazi novac.',
  expensesEmpty: 'Još nema zabilježenih troškova.',
  addExpense: 'Dodaj trošak',
  expenseSupplies: 'Sirovine',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Dostave',
  expenseStaff: 'Osoblje',
  expenseServices: 'Usluge',
  expenseOther: 'Ostalo',
  expensesAsk: 'Na šta trošim previše?',
  expensesAskGoal: 'Pregledati moje troškove i reći mi na šta trošim previše',
  swot: 'SWOT',
  swotHint: 'Snage, slabosti, prilike i prijetnje.',
  swotGoal: 'Napraviti SWOT analizu mog biznisa',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Pomozi mi da rastem',
  helpMeGrowHint: 'Weë gleda tvoj biznis i predlaže šta da radiš.',
  helpMeGrowGoal: 'Plan za rast mog biznisa, s konkretnim koracima',
  opportunities: 'Prilike',
  opportunitiesEmpty: 'Kad bude prodaje i sadržaja, ovdje će se pojaviti prilike koje uočim.',
  createPromotion: 'Kreiraj promociju',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kome prodaješ i šta mu treba.',
  customerInsightsGoal: 'Opisati mog idealnog kupca i koje poruke na njega djeluju',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Šta bi se još moglo prodavati ili kako se izdvojiti.',
  businessIdeasGoal: 'Dati mi ideje za moj biznis i kako da se izdvojim',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Tvoj biznis još nema stranicu na Weë.',
  profileEmptyHint: 'Kad kreiraš svoj biznis, ovdje će biti njegova stranica: ko si, šta prodaješ i kako te kontaktirati.',
  profileAbout: 'O nama',
  profileProducts: 'Proizvodi',
  profilePosts: 'Objave',
  profileContact: 'Kontakt',
  reviews: 'Recenzije',
  reviewsHint: 'Šta kažu tvoji kupci i šta poboljšati.',
  reviewsGoal: 'Analizirati recenzije mog biznisa i reći mi šta poboljšati',
  reviewsRespond: 'Napiši odgovor',
  reviewsRespondGoal: 'Napisati profesionalan odgovor na recenziju mog biznisa',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Dosegni više ljudi uz Weë Credits',
  promoteHint: 'Tvoj sadržaj se prikazuje većem broju ljudi unutar Weë. Prije nego što išta potrošiš, vidjet ćeš koliko košta.',
  promoteSoon: 'Promovisanje unutar Weë još nije otvoreno. Kad bude, plaćat će se tvojim Credits i vidjet ćeš to ovdje.',
  promoteCredits: 'Pogledaj moje Credits',
  sampleProductName: 'Proizvod {{numero}}',
};
