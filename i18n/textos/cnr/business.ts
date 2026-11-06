/*
 * Weë Business en montenegrino (ijekaviano, latino): la pantalla del negocio y
 * las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español. Tuteo («ti»). Los nombres de los ocho módulos y los
 * de las funciones con nombre propio —Business Plan, Business Coach, Pricing
 * Assistant, Brand Kit, SWOT, Customer Insights, Business Ideas, Business
 * Profile— se quedan como están, igual que TikTok, Instagram Story o Facebook.
 * Lo que escribe la persona o su cliente no pasa por aquí.
 *
 * PLURALES: one / few / other. Se declara con `ConPlurales` para añadir `_few`
 * a `productsCount` (1 proizvod · 2 proizvoda · 5 proizvoda).
 */
import { ConPlurales } from '../ru/plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Moje društvene mreže',
  manageAccounts: 'Upravljaj nalozima',
  connected: 'Povezano',
  networkConnected: '{{red}} povezan',
  connectAnother: 'Poveži još jednu mrežu',
  allConnected: 'Sve tvoje mreže su već povezane.',
  simulatedConnection: 'Simulirana veza: Weë još ne objavljuje niti odgovara umjesto tebe. Priprema svaki dio da ga ti pregledaš i objaviš.',
  postCalendar: 'Kalendar objava',
  seeFullCalendar: 'Pogledaj cijeli kalendar',
  calendarGoal: 'Prikaži i organizuj moj kalendar objava za ovu sedmicu',
  scheduleGoal: 'Zakaži objavu za {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Poruke klijenata',
  seeAllMessages: 'Pogledaj sve',
  messagesGoal: 'Odgovori na poruke mojih klijenata',
  reply: 'Odgovori',
  replied: 'Odgovoreno',
  replyTo: 'Odgovori klijentu {{nombre}}',
  repliedTo: 'Odgovoreno klijentu {{nombre}}',
  replyGoal: 'Odgovori klijentu {{nombre}} na mreži {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Rezultati ove sedmice',
  statPosts: 'Objave',
  statReach: 'Dosegnute osobe',
  statInteractions: 'Interakcije',
  statMessages: 'Primljene poruke',
  onTrack: 'Tvoj biznis ide dobrim putem',
  onTrackNote: 'Interakcije su ove sedmice porasle za 60%. Samo tako nastavi!',
  seeDetailedAnalysis: 'Pogledaj detaljnu analizu',
  analysisGoal: 'Analiziraj rezultate mog biznisa ove sedmice',
  shortcutIdeas: 'Ideje',
  shortcutIdeasGoal: 'Ideje i strategija za rast mog biznisa',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Marketinška kampanja za moj biznis',
  shortcutSocial: 'Društvene mreže',
  shortcutSocialGoal: 'Kreiraj sadržaj za mreže mog biznisa',
  shortcutAnalyze: 'Analiziraj',
  shortcutAnalyzeGoal: 'Analiziraj rezultate mog biznisa',
  shortcutDocuments: 'Dokumenti',
  shortcutDocumentsGoal: 'Sastavi dokument za moj biznis',
  shortcutSell: 'Prodaj više',
  shortcutSellGoal: 'Pomozi mi da prodam više ovog mjeseca u svom biznisu',
  shortcutCareer: 'Posao i karijera',
  shortcutCareerGoal: 'Poboljšaj moj CV i moj profesionalni profil',
  yesterday: 'Juče',

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
  modMyBusinessHint: 'Gradi i vodi svoj biznis',
  modProductsHint: 'Tvoji proizvodi i njihove cijene',
  modCreateHint: 'Kreiraj sadržaj uz AI',
  modSocialHint: 'Pripremi i podijeli svuda',
  modAnalyzeHint: 'Razumij svoj biznis',
  modGrowHint: 'Pronađi prilike i rasti',
  modProfileHint: 'Tvoj biznis u aplikaciji Weë',
  modPromoteHint: 'Dopri do više ljudi uz Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Pregled» y no «Tvoj biznis»: ese es el nombre de una de las cuentas de muestra. */
  overview: 'Pregled tvog biznisa',
  overviewEmpty: 'Još nemaš kreiran biznis.',
  overviewEmptyHint: 'Ispričaj Weë svojim riječima — „prodajem kolače od kuće“ — i pomoći ću ti da mu daš oblik.',
  createBusiness: 'Kreiraj moj biznis',
  createBusinessGoal: 'Kreiraj moj biznis od nule: ime, što prodajem, kome i po kojoj cijeni',
  editBusiness: 'Izmijeni moj biznis',
  editBusinessGoal: 'Pregledaj i poboljšaj informacije o mom biznisu',
  businessInfo: 'Informacije o biznisu',
  businessInfoGoal: 'Sredi informacije o mom biznisu: što prodajem, kome i po čemu se razlikujem',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Napiši biznis plan da svoj biznis predstavim investitoru',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Što bi trebalo da uradim ove sedmice u svom biznisu?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Još nemaš dodatih proizvoda.',
  productsEmptyHint: 'Otpremi fotografiju i Weë piše ime, opis i tekst za prodaju.',
  addProduct: 'Dodaj proizvod',
  addProductGoal: 'Kreiraj karticu proizvoda: ime, opis, karakteristike i tekst za prodaju',
  improveImage: 'Poboljšaj fotografiju',
  improveImageGoal: 'Poboljšaj fotografiju mog proizvoda da ga bolje prodam',
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
  pricingNote: 'Cijene su informativna referenca i nijesu računovodstveni ni poreski savjet.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Ono zbog čega tvoj sadržaj uvijek izgleda kao tvoj.',
  brandLogo: 'Logo',
  brandColors: 'Boje',
  brandTypography: 'Tipografija',
  brandStyle: 'Vizuelni stil',
  brandAvatar: 'Profilna slika',
  brandCover: 'Naslovna slika',
  brandTemplates: 'Šabloni sadržaja',
  brandGoal: 'Kreiraj {{que}} za brend mog biznisa',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Reci mi što želiš da promovišeš i ja ću to pripremiti.',
  createPlaceholder: 'Primjer: Želim da promovišem ovu tortu za Dan majki…',
  createTypes: 'Što želiš da kreiraš?',
  typeImage: 'Slika',
  typeImageHint: 'Slika za promociju',
  typeVideo: 'Video',
  typeVideoHint: 'Kratak video',
  typePost: 'Objava',
  typePostHint: 'Spremna za objavljivanje',
  typeCampaign: 'Kampanja',
  typeCampaignHint: 'Više sadržaja odjednom',
  typeCopy: 'Tekstovi',
  typeCopyHint: 'Opis, heštegovi i poziv na akciju',
  typeGoal: 'Kreiraj {{que}} za moj biznis: {{idea}}',
  formats: 'Izaberi format',
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
  askInvite: 'Ispričaj mi svojim riječima i ja preuzimam.',
  askPlaceholder: 'Napiši ovdje što ti treba…',
  askSend: 'Pitaj Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Kreiraj sadržaj',
  goalWithProduct: '{{idea}} — proizvod: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Kreiraj jednom. Podijeli svuda.',
  share: 'Podijeli',
  shareHint: 'Otvara se dijeljenje na tvom telefonu: izaberi aplikaciju koju želiš.',
  shareToWee: 'Podijeli na Weë',
  shareWall: 'Moj Wäll',
  shareCommunities: 'Zajednice',
  shareProfile: 'Business Profile',
  shareNothing: 'Prvo nešto kreiraj, pa to podijeli odavde.',
  shareText: 'Kreirano uz Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Otpremi moje podatke',
  analyzeUploadHint: 'Excel, CSV ili PDF s tvojom prodajom i troškovima.',
  analyzeUploadGoal: 'Analiziraj fajl s prodajom i troškovima mog biznisa',
  analyzeInsights: 'Što vidim u tvojim brojkama',
  analyzeInsightsGoal: 'Objasni mi što se dešava s prodajom mog biznisa',
  expenses: 'Troškovi',
  expensesHint: 'Zabilježi na što ti odlazi novac.',
  expensesEmpty: 'Još nemaš zabilježenih troškova.',
  addExpense: 'Dodaj trošak',
  expenseSupplies: 'Repromaterijal',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Dostave',
  expenseStaff: 'Osoblje',
  expenseServices: 'Usluge',
  expenseOther: 'Ostalo',
  expensesAsk: 'Na što trošim previše?',
  expensesAskGoal: 'Pregledaj moje troškove i reci mi na što trošim previše',
  swot: 'SWOT',
  swotHint: 'Snage, slabosti, prilike i prijetnje.',
  swotGoal: 'Uradi SWOT analizu mog biznisa',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Pomozi mi da rastem',
  helpMeGrowHint: 'Weë gleda tvoj biznis i predlaže ti što da uradiš.',
  helpMeGrowGoal: 'Plan za rast mog biznisa, s konkretnim koracima',
  opportunities: 'Prilike',
  opportunitiesEmpty: 'Kad bude prodaje i sadržaja, ovdje će se pojaviti prilike koje uočim.',
  createPromotion: 'Kreiraj promociju',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kome prodaješ i što mu treba.',
  customerInsightsGoal: 'Opiši mog idealnog klijenta i koje poruke na njega djeluju',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Što još možeš da prodaješ ili kako da se izdvojiš.',
  businessIdeasGoal: 'Daj mi ideje za moj biznis i kako da se izdvojim',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Tvoj biznis još nema stranicu u aplikaciji Weë.',
  profileEmptyHint: 'Kad kreiraš svoj biznis, ovdje će živjeti njegova stranica: ko si, što prodaješ i kako te kontaktiraju.',
  profileAbout: 'O nama',
  profileProducts: 'Proizvodi',
  profilePosts: 'Objave',
  profileContact: 'Kontakt',
  reviews: 'Recenzije',
  reviewsHint: 'Što kažu tvoji klijenti i što poboljšati.',
  reviewsGoal: 'Analiziraj recenzije mog biznisa i reci mi što da poboljšam',
  reviewsRespond: 'Napiši odgovor',
  reviewsRespondGoal: 'Napiši profesionalan odgovor na recenziju mog biznisa',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Dopri do više ljudi uz Weë Credits',
  promoteHint: 'Tvoj sadržaj se prikazuje većem broju ljudi u aplikaciji Weë. Prije nego što išta potrošiš, vidjećeš koliko košta.',
  promoteSoon: 'Promovisanje u aplikaciji Weë još nije otvoreno. Kad bude, plaćaće se tvojim Credits i vidjećeš ga ovdje.',
  promoteCredits: 'Pogledaj moje Credits',
  sampleProductName: 'Proizvod {{numero}}',
};
