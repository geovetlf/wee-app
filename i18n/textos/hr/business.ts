/*
 * Weë Business en croata: la pantalla del negocio y las etiquetas de sus datos
 * de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). Los nombres de los módulos —Business Plan, Brand Kit, Pricing
 * Assistant, Customer Insights…— son nombres de producto y se quedan en inglés,
 * igual que en el molde. Lo que escribe la persona o sus clientes no pasa por
 * aquí. «Negocio» se traduce como «posao».
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `productsCount`.
 */
import { ConPlurales } from '../ru/plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Moje društvene mreže',
  manageAccounts: 'Upravljaj računima',
  connected: 'Povezano',
  networkConnected: '{{red}}: povezano',
  connectAnother: 'Poveži još jednu mrežu',
  allConnected: 'Sve su tvoje mreže već povezane.',
  simulatedConnection: 'Simulirana veza: Weë još ne objavljuje niti odgovara umjesto tebe. Priprema svaki sadržaj da ga ti pregledaš i objaviš.',
  postCalendar: 'Kalendar objava',
  seeFullCalendar: 'Prikaži cijeli kalendar',
  calendarGoal: 'Pregledati i organizirati svoj kalendar objava za ovaj tjedan',
  scheduleGoal: 'Zakazati objavu za {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Poruke kupaca',
  seeAllMessages: 'Prikaži sve',
  messagesGoal: 'Odgovoriti na poruke svojih kupaca',
  reply: 'Odgovori',
  replied: 'Odgovoreno',
  replyTo: 'Odgovori: {{nombre}}',
  repliedTo: 'Odgovoreno: {{nombre}}',
  replyGoal: 'Odgovoriti na poruku od {{nombre}} ({{red}}): „{{mensaje}}“',
  resultsThisWeek: 'Rezultati ovog tjedna',
  statPosts: 'Objave',
  statReach: 'Dosegnute osobe',
  statInteractions: 'Interakcije',
  statMessages: 'Primljene poruke',
  onTrack: 'Tvoj je posao na dobrom putu',
  onTrackNote: 'Interakcije su ovog tjedna porasle 60 %. Samo tako nastavi!',
  seeDetailedAnalysis: 'Prikaži detaljnu analizu',
  analysisGoal: 'Analizirati rezultate svojeg posla ovog tjedna',
  shortcutIdeas: 'Ideje',
  shortcutIdeasGoal: 'Ideje i strategija za rast mojeg posla',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Marketinška kampanja za moj posao',
  shortcutSocial: 'Društvene mreže',
  shortcutSocialGoal: 'Stvoriti sadržaj za društvene mreže mojeg posla',
  shortcutAnalyze: 'Analiziraj',
  shortcutAnalyzeGoal: 'Analizirati rezultate mojeg posla',
  shortcutDocuments: 'Dokumenti',
  shortcutDocumentsGoal: 'Sastaviti dokument za moj posao',
  shortcutSell: 'Prodaj više',
  shortcutSellGoal: 'Prodati više ovog mjeseca u svojem poslu',
  shortcutCareer: 'Zaposlenje i karijera',
  shortcutCareerGoal: 'Poboljšati svoj životopis i profesionalni profil',
  yesterday: 'Jučer',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Moda, stil, ljepota i stvaranje vizualnog sadržaja.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Izgradi i vodi svoj posao',
  modProductsHint: 'Tvoji proizvodi i njihove cijene',
  modCreateHint: 'Stvaraj sadržaj uz AI',
  modSocialHint: 'Pripremi i podijeli posvuda',
  modAnalyzeHint: 'Razumij svoj posao',
  modGrowHint: 'Pronađi prilike i rasti',
  modProfileHint: 'Tvoj posao unutar aplikacije Weë',
  modPromoteHint: 'Dopri do više ljudi uz Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Pregled" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Pregled tvojeg posla',
  overviewEmpty: 'Tvoj posao još nije stvoren.',
  overviewEmptyHint: 'Opiši ga Weë svojim riječima — „prodajem kolače od kuće“ — i pomoći ću ti da mu daš oblik.',
  createBusiness: 'Stvori moj posao',
  createBusinessGoal: 'Stvoriti svoj posao od nule: naziv, što prodajem, kome i po kojoj cijeni',
  editBusiness: 'Uredi moj posao',
  editBusinessGoal: 'Pregledati i poboljšati podatke o svojem poslu',
  businessInfo: 'Podaci o poslu',
  businessInfoGoal: 'Srediti podatke o svojem poslu: što prodajem, kome i po čemu se razlikujem',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Napisati poslovni plan za predstavljanje svojeg posla investitoru',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Što bi ovaj tjedan trebalo napraviti u mojem poslu?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Još nema dodanih proizvoda.',
  productsEmptyHint: 'Prenesi fotografiju i Weë napiše naziv, opis i tekst za prodaju.',
  addProduct: 'Dodaj proizvod',
  addProductGoal: 'Stvoriti karticu proizvoda: naziv, opis, značajke i tekst za prodaju',
  improveImage: 'Poboljšaj fotografiju',
  improveImageGoal: 'Poboljšati fotografiju svojeg proizvoda da se bolje prodaje',
  /* «proizvod» es masculino: 1 proizvod · 2 proizvoda · 5 proizvoda. Las tres formas llevan {{contador}}. */
  productsCount_one: '{{contador}} proizvod',
  productsCount_few: '{{contador}} proizvoda',
  productsCount_other: '{{contador}} proizvoda',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Upiši koliko te košta i Weë ti daje referentnu cijenu.',
  pricingMaterials: 'Materijali',
  pricingPackaging: 'Ambalaža',
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
  brandKitHint: 'Ono zbog čega tvoj sadržaj uvijek izgleda kao tvoj.',
  brandLogo: 'Logotip',
  brandColors: 'Boje',
  brandTypography: 'Tipografija',
  brandStyle: 'Vizualni stil',
  brandAvatar: 'Profilna slika',
  brandCover: 'Naslovna slika',
  brandTemplates: 'Predlošci sadržaja',
  brandGoal: 'Stvoriti {{que}} za brend mojeg posla',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Reci mi što želiš promovirati i ja ću to pripremiti.',
  createPlaceholder: 'Primjer: Želim promovirati ovu tortu za Majčin dan…',
  createTypes: 'Što želiš stvoriti?',
  typeImage: 'Slika',
  typeImageHint: 'Slika za promociju',
  typeVideo: 'Video',
  typeVideoHint: 'Kratki video',
  typePost: 'Objava',
  typePostHint: 'Spremna za objavu',
  typeCampaign: 'Kampanja',
  typeCampaignHint: 'Više sadržaja odjednom',
  typeCopy: 'Tekstovi',
  typeCopyHint: 'Opis, hashtagovi i poziv na akciju',
  typeGoal: 'Stvoriti {{que}} za moj posao: {{idea}}',
  formats: 'Odaberi format',
  formatsHint: 'Weë se brine za veličinu. Ti biraš gdje ide.',
  formatTikTok: 'TikTok',
  /* «Instagram video» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram video',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Vodoravni video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Reci mi svojim riječima i ja ću se pobrinuti.',
  askPlaceholder: 'Napiši ovdje što trebaš…',
  askSend: 'Pitaj Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Stvori sadržaj',
  goalWithProduct: '{{idea}} — proizvod: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Stvori jednom. Podijeli posvuda.',
  share: 'Podijeli',
  shareHint: 'Otvara se dijeljenje tvojeg telefona: odaberi aplikaciju koju želiš.',
  shareToWee: 'Podijeli u aplikaciji Weë',
  shareWall: 'Moj Wäll',
  shareCommunities: 'Zajednice',
  shareProfile: 'Business Profile',
  shareNothing: 'Najprije nešto stvori, a zatim to podijeli odavde.',
  shareText: 'Stvoreno uz Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Prenesi moje podatke',
  analyzeUploadHint: 'Excel, CSV ili PDF s tvojom prodajom i troškovima.',
  analyzeUploadGoal: 'Analizirati datoteku s prodajom i troškovima mojeg posla',
  analyzeInsights: 'Što vidim u tvojim brojkama',
  analyzeInsightsGoal: 'Objasniti mi što se događa s prodajom u mojem poslu',
  expenses: 'Troškovi',
  expensesHint: 'Zabilježi na što ti odlazi novac.',
  expensesEmpty: 'Još nema zabilježenih troškova.',
  addExpense: 'Dodaj trošak',
  expenseSupplies: 'Sirovine',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Dostave',
  expenseStaff: 'Osoblje',
  expenseServices: 'Usluge',
  expenseOther: 'Ostalo',
  expensesAsk: 'Na što trošim previše?',
  expensesAskGoal: 'Pregledati moje troškove i reći mi na što trošim previše',
  swot: 'SWOT',
  swotHint: 'Snage, slabosti, prilike i prijetnje.',
  swotGoal: 'Napraviti SWOT analizu mojeg posla',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Pomozi mi rasti',
  helpMeGrowHint: 'Weë pogleda tvoj posao i predloži ti što napraviti.',
  helpMeGrowGoal: 'Plan za rast mojeg posla, s konkretnim koracima',
  opportunities: 'Prilike',
  opportunitiesEmpty: 'Kad bude prodaje i sadržaja, ovdje će se pojaviti prilike koje uočim.',
  createPromotion: 'Stvori promociju',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kome prodaješ i što mu treba.',
  customerInsightsGoal: 'Opisati mojeg idealnog kupca i koje poruke kod njega djeluju',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Što bi se još moglo prodavati ili kako se istaknuti.',
  businessIdeasGoal: 'Dati mi ideje za moj posao i kako se istaknuti',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Tvoj posao još nema stranicu u aplikaciji Weë.',
  profileEmptyHint: 'Kad stvoriš svoj posao, ovdje će biti njegova stranica: tko si, što prodaješ i kako te kontaktirati.',
  profileAbout: 'O nama',
  profileProducts: 'Proizvodi',
  profilePosts: 'Objave',
  profileContact: 'Kontakt',
  reviews: 'Recenzije',
  reviewsHint: 'Što kažu tvoji kupci i što poboljšati.',
  reviewsGoal: 'Analizirati recenzije mojeg posla i reći mi što poboljšati',
  reviewsRespond: 'Napiši odgovor',
  reviewsRespondGoal: 'Napisati profesionalan odgovor na recenziju mojeg posla',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Dopri do više ljudi uz Weë Credits',
  promoteHint: 'Tvoj se sadržaj prikazuje većem broju ljudi unutar aplikacije Weë. Prije nego što išta potrošiš, vidjet ćeš koliko košta.',
  promoteSoon: 'Promoviranje unutar aplikacije Weë još nije otvoreno. Kad bude, plaćat će se tvojim Credits i vidjet ćeš ga ovdje.',
  promoteCredits: 'Prikaži moje Credits',
  sampleProductName: 'Proizvod {{numero}}',
};
