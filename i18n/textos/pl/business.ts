/*
 * Weë Business en polaco: la pantalla del negocio y las etiquetas de sus datos
 * de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ty», «twój»). Los nombres de los módulos y de las herramientas
 * —Business Plan, Brand Kit, Pricing Assistant, SWOT— son nombres de producto y
 * se dejan como están. Las marcas no se declinan: se usa un sustantivo puente
 * («w aplikacji Weë», «saldo Credits»). Lo que escribe la persona o sus
 * clientes no pasa por aquí.
 *
 * PLURALES: el polaco tiene cuatro categorías (one / few / many / other), así
 * que este archivo se declara con `ConPlurales` para añadir `_few` y `_many` a
 * `productsCount`.
 */
import { ConPlurales } from '../ru/plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Moje media społecznościowe',
  manageAccounts: 'Zarządzaj kontami',
  connected: 'Połączono',
  networkConnected: 'Połączono: {{red}}',
  connectAnother: 'Połącz kolejną sieć',
  allConnected: 'Wszystkie twoje sieci są już połączone.',
  simulatedConnection: 'Połączenie symulowane: Weë jeszcze nie publikuje ani nie odpowiada za ciebie. Przygotowuje każdy materiał, który możesz potem sprawdzić i opublikować.',
  postCalendar: 'Kalendarz publikacji',
  seeFullCalendar: 'Zobacz pełny kalendarz',
  calendarGoal: 'Pokaż i uporządkuj mój kalendarz publikacji na ten tydzień',
  scheduleGoal: 'Zaplanuj publikację na {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Wiadomości od klientów',
  seeAllMessages: 'Zobacz wszystkie',
  messagesGoal: 'Odpowiedz na wiadomości od moich klientów',
  reply: 'Odpowiedz',
  replied: 'Odpowiedziano',
  /* «użytkownikowi» es el sustantivo puente: el nombre de la persona no se declina. */
  replyTo: 'Odpowiedz użytkownikowi {{nombre}}',
  repliedTo: 'Odpowiedziano użytkownikowi {{nombre}}',
  replyGoal: 'Odpowiedz użytkownikowi {{nombre}} w serwisie {{red}}: „{{mensaje}}”',
  resultsThisWeek: 'Wyniki w tym tygodniu',
  statPosts: 'Posty',
  statReach: 'Zasięg',
  statInteractions: 'Interakcje',
  statMessages: 'Otrzymane wiadomości',
  onTrack: 'Twój biznes idzie w dobrym kierunku',
  onTrackNote: 'Interakcje wzrosły w tym tygodniu o 60%. Tak trzymaj!',
  seeDetailedAnalysis: 'Zobacz szczegółową analizę',
  analysisGoal: 'Przeanalizuj wyniki mojego biznesu w tym tygodniu',
  shortcutIdeas: 'Pomysły',
  shortcutIdeasGoal: 'Pomysły i strategia na rozwój mojego biznesu',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Kampania marketingowa dla mojego biznesu',
  shortcutSocial: 'Media społecznościowe',
  shortcutSocialGoal: 'Stwórz treści do mediów społecznościowych mojego biznesu',
  shortcutAnalyze: 'Analizuj',
  shortcutAnalyzeGoal: 'Przeanalizuj wyniki mojego biznesu',
  shortcutDocuments: 'Dokumenty',
  shortcutDocumentsGoal: 'Napisz dokument dla mojego biznesu',
  shortcutSell: 'Sprzedawaj więcej',
  shortcutSellGoal: 'Chcę sprzedać więcej w tym miesiącu w moim biznesie',
  shortcutCareer: 'Praca i kariera',
  shortcutCareerGoal: 'Ulepsz moje CV i mój profil zawodowy',
  yesterday: 'Wczoraj',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas, como Weë
   * Studio o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se
   * traduce es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Moda, styl, uroda i tworzenie treści wizualnych.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Buduj swój biznes i zarządzaj nim',
  modProductsHint: 'Twoje produkty i ich ceny',
  modCreateHint: 'Twórz treści z AI',
  modSocialHint: 'Przygotuj i udostępniaj wszędzie',
  modAnalyzeHint: 'Zrozum swój biznes',
  modGrowHint: 'Znajdź szanse i rozwijaj się',
  modProfileHint: 'Twój biznes w aplikacji Weë',
  modPromoteHint: 'Docieraj do większej liczby osób dzięki Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Podsumowanie» y no «Twój biznes»: ese es el nombre de una de las cuentas de muestra. */
  overview: 'Podsumowanie twojego biznesu',
  overviewEmpty: 'Nie masz jeszcze utworzonego biznesu.',
  overviewEmptyHint: 'Opowiedz o nim Weë własnymi słowami — „sprzedaję desery z domu” — a pomogę ci nadać mu kształt.',
  createBusiness: 'Stwórz swój biznes',
  createBusinessGoal: 'Stwórz mój biznes od zera: nazwa, co sprzedaję, komu i za ile',
  editBusiness: 'Edytuj swój biznes',
  editBusinessGoal: 'Przejrzyj i ulepsz informacje o moim biznesie',
  businessInfo: 'Informacje o biznesie',
  businessInfoGoal: 'Uporządkuj informacje o moim biznesie: co sprzedaję, komu i co mnie wyróżnia',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Napisz biznesplan, żeby przedstawić mój biznes inwestorowi',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Co warto zrobić w tym tygodniu w moim biznesie?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Nie dodano jeszcze produktów.',
  productsEmptyHint: 'Prześlij zdjęcie, a Weë napisze nazwę, opis i tekst sprzedażowy.',
  addProduct: 'Dodaj produkt',
  addProductGoal: 'Stwórz kartę produktu: nazwa, opis, cechy i tekst sprzedażowy',
  improveImage: 'Ulepsz zdjęcie',
  improveImageGoal: 'Ulepsz zdjęcie mojego produktu, żeby lepiej się sprzedawał',
  /* «produkt» se declina: 1 produkt · 2-4 produkty · 5+ produktów · 1,5 produktu. */
  productsCount_one: '{{contador}} produkt',
  productsCount_few: '{{contador}} produkty',
  productsCount_many: '{{contador}} produktów',
  productsCount_other: '{{contador}} produktu',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Podaj, ile cię to kosztuje, a Weë zaproponuje cenę orientacyjną.',
  pricingMaterials: 'Materiały',
  pricingPackaging: 'Opakowanie',
  pricingDelivery: 'Wysyłka',
  pricingOther: 'Inne koszty',
  pricingMargin: 'Oczekiwana marża',
  pricingCost: 'Szacowany koszt',
  pricingSuggested: 'Sugerowana cena',
  pricingMarginResult: 'Szacowana marża',
  pricingProfit: 'Szacowany zysk',
  pricingNote: 'Ceny mają charakter orientacyjny i nie stanowią porady księgowej ani podatkowej.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'To, dzięki czemu twoje treści zawsze wyglądają jak twoje.',
  brandLogo: 'Logo',
  brandColors: 'Kolory',
  brandTypography: 'Typografia',
  brandStyle: 'Styl wizualny',
  brandAvatar: 'Zdjęcie profilowe',
  brandCover: 'Okładka',
  brandTemplates: 'Szablony treści',
  brandGoal: 'Stwórz dla marki mojego biznesu: {{que}}',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Powiedz mi, co chcesz promować, a ja to przygotuję.',
  createPlaceholder: 'Przykład: Chcę wypromować ten tort na Dzień Matki…',
  createTypes: 'Co chcesz stworzyć?',
  typeImage: 'Obraz',
  typeImageHint: 'Obraz do promocji',
  typeVideo: 'Film',
  typeVideoHint: 'Krótki film',
  typePost: 'Post',
  typePostHint: 'Gotowy do publikacji',
  typeCampaign: 'Kampania',
  typeCampaignHint: 'Kilka materiałów naraz',
  typeCopy: 'Teksty',
  typeCopyHint: 'Opis, hashtagi i wezwanie do działania',
  typeGoal: 'Stwórz dla mojego biznesu ({{que}}): {{idea}}',
  formats: 'Wybierz format',
  formatsHint: 'Weë zajmie się rozmiarem. Ty wybierasz, gdzie to trafi.',
  formatTikTok: 'TikTok',
  /* «Wideo na Instagram» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Film na Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Film poziomy',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Opowiedz mi własnymi słowami, a ja się tym zajmę.',
  askPlaceholder: 'Napisz tutaj, o co chodzi…',
  askSend: 'Zapytaj Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Stwórz treści',
  goalWithProduct: '{{idea}} — produkt: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Stwórz raz. Udostępniaj wszędzie.',
  share: 'Udostępnij',
  shareHint: 'Otworzy się menu udostępniania twojego telefonu: wybierz dowolną aplikację.',
  shareToWee: 'Udostępnij w aplikacji Weë',
  shareWall: 'Mój Wäll',
  shareCommunities: 'Społeczności',
  shareProfile: 'Business Profile',
  shareNothing: 'Najpierw coś stwórz, a potem udostępnij to stąd.',
  shareText: 'Stworzone z Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Prześlij swoje dane',
  analyzeUploadHint: 'Excel, CSV lub PDF z twoją sprzedażą i wydatkami.',
  analyzeUploadGoal: 'Przeanalizuj plik ze sprzedażą i wydatkami mojego biznesu',
  analyzeInsights: 'Co widzę w twoich liczbach',
  analyzeInsightsGoal: 'Wyjaśnij mi, co się dzieje ze sprzedażą w moim biznesie',
  expenses: 'Wydatki',
  expensesHint: 'Zapisuj, na co idą twoje pieniądze.',
  expensesEmpty: 'Nie zapisano jeszcze żadnych wydatków.',
  addExpense: 'Dodaj wydatek',
  expenseSupplies: 'Zaopatrzenie',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Dostawy',
  expenseStaff: 'Personel',
  expenseServices: 'Usługi',
  expenseOther: 'Inne',
  expensesAsk: 'Na co wydaję za dużo?',
  expensesAskGoal: 'Przejrzyj moje wydatki i powiedz mi, na co wydaję za dużo',
  swot: 'SWOT',
  swotHint: 'Mocne i słabe strony, szanse i zagrożenia.',
  swotGoal: 'Zrób analizę SWOT mojego biznesu',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Pomóż mi się rozwijać',
  helpMeGrowHint: 'Weë przygląda się twojemu biznesowi i proponuje, co zrobić.',
  helpMeGrowGoal: 'Plan rozwoju mojego biznesu, z konkretnymi krokami',
  opportunities: 'Szanse',
  opportunitiesEmpty: 'Gdy będziesz mieć sprzedaż i treści, pojawią się tu szanse, które zauważę.',
  createPromotion: 'Stwórz promocję',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Komu sprzedajesz i czego ci ludzie potrzebują.',
  customerInsightsGoal: 'Opisz mojego idealnego klienta i to, jakie komunikaty do niego trafiają',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Co jeszcze możesz sprzedawać i jak się wyróżnić.',
  businessIdeasGoal: 'Daj mi pomysły na mój biznes i na to, jak się wyróżnić',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Twój biznes nie ma jeszcze strony w aplikacji Weë.',
  profileEmptyHint: 'Gdy stworzysz swój biznes, tu będzie jego strona: kim jesteś, co sprzedajesz i jak się z tobą skontaktować.',
  profileAbout: 'Informacje',
  profileProducts: 'Produkty',
  profilePosts: 'Posty',
  profileContact: 'Kontakt',
  reviews: 'Opinie',
  reviewsHint: 'Co mówią twoi klienci i co poprawić.',
  reviewsGoal: 'Przeanalizuj opinie o moim biznesie i powiedz mi, co poprawić',
  reviewsRespond: 'Napisz odpowiedź',
  reviewsRespondGoal: 'Napisz profesjonalną odpowiedź na opinię o moim biznesie',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Docieraj do większej liczby osób dzięki Weë Credits',
  promoteHint: 'Twoje treści są pokazywane większej liczbie osób w aplikacji Weë. Zanim cokolwiek wydasz, zobaczysz, ile to kosztuje.',
  promoteSoon: 'Promowanie w aplikacji Weë nie jest jeszcze dostępne. Gdy będzie, zapłacisz swoimi Credits i zobaczysz to tutaj.',
  promoteCredits: 'Zobacz swoje Credits',
  sampleProductName: 'Produkt {{numero}}',
};
