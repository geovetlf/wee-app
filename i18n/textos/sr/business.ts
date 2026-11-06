/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de
 * muestra, en serbio (ekaviano, cirílico).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ти»). Las metas que viajan a Weë AI (`*Goal`) van en infinitivo o en
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
  mySocialAccounts: 'Моје друштвене мреже',
  manageAccounts: 'Управљај налозима',
  connected: 'Повезано',
  networkConnected: '{{red}}: повезано',
  connectAnother: 'Повежи још једну мрежу',
  allConnected: 'Све твоје мреже су већ повезане.',
  simulatedConnection: 'Симулирана веза: Weë још не објављује нити одговара уместо тебе. Припрема сваки садржај да га ти прегледаш и објавиш.',
  postCalendar: 'Календар објава',
  seeFullCalendar: 'Прикажи цео календар',
  calendarGoal: 'Видети и организовати мој календар објава за ову недељу',
  scheduleGoal: 'Заказати објаву за {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Поруке купаца',
  seeAllMessages: 'Прикажи све',
  messagesGoal: 'Одговорити на поруке мојих купаца',
  reply: 'Одговори',
  replied: 'Одговорено',
  replyTo: 'Одговори: {{nombre}}',
  repliedTo: 'Одговорено: {{nombre}}',
  replyGoal: 'Одговорити кориснику {{nombre}} на мрежи {{red}}: „{{mensaje}}“',
  resultsThisWeek: 'Резултати ове недеље',
  statPosts: 'Објаве',
  statReach: 'Досегнуте особе',
  statInteractions: 'Интеракције',
  statMessages: 'Примљене поруке',
  onTrack: 'Твој бизнис је на добром путу',
  onTrackNote: 'Интеракције су ове недеље порасле за 60%. Само тако настави!',
  seeDetailedAnalysis: 'Прикажи детаљну анализу',
  analysisGoal: 'Анализирати резултате мог бизниса ове недеље',
  shortcutIdeas: 'Идеје',
  shortcutIdeasGoal: 'Идеје и стратегија за раст мог бизниса',
  shortcutMarketing: 'Маркетинг',
  shortcutMarketingGoal: 'Маркетиншка кампања за мој бизнис',
  shortcutSocial: 'Друштвене мреже',
  shortcutSocialGoal: 'Креирати садржај за мреже мог бизниса',
  shortcutAnalyze: 'Анализирај',
  shortcutAnalyzeGoal: 'Анализирати резултате мог бизниса',
  shortcutDocuments: 'Документи',
  shortcutDocumentsGoal: 'Саставити документ за мој бизнис',
  shortcutSell: 'Продај више',
  shortcutSellGoal: 'Продати више овог месеца у мом бизнису',
  shortcutCareer: 'Посао и каријера',
  shortcutCareerGoal: 'Побољшати мој CV и мој професионални профил',
  yesterday: 'Јуче',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en los dos idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Мода, стил, лепота и креирање визуелног садржаја.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Изгради и води свој бизнис',
  modProductsHint: 'Твоји производи и њихове цене',
  modCreateHint: 'Креирај садржај уз AI',
  modSocialHint: 'Припреми и подели свуда',
  modAnalyzeHint: 'Разумеј свој бизнис',
  modGrowHint: 'Пронађи прилике и расти',
  modProfileHint: 'Твој бизнис унутар Weë',
  modPromoteHint: 'Допри до више људи уз Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Преглед твог бизниса',
  overviewEmpty: 'Твој бизнис још није креиран.',
  overviewEmptyHint: 'Опиши га Weë својим речима — „продајем колаче од куће“ — и помоћи ћу ти да га уобличиш.',
  createBusiness: 'Креирај мој бизнис',
  createBusinessGoal: 'Креирати мој бизнис од нуле: назив, шта продајем, коме и по којој цени',
  editBusiness: 'Измени мој бизнис',
  editBusinessGoal: 'Прегледати и побољшати информације о мом бизнису',
  businessInfo: 'Информације о бизнису',
  businessInfoGoal: 'Средити информације о мом бизнису: шта продајем, коме и шта ме издваја',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Написати бизнис план да представим свој бизнис инвеститору',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Шта би требало да урадим ове недеље у свом бизнису?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Још нема додатих производа.',
  productsEmptyHint: 'Отпреми фотографију и Weë пише назив, опис и продајни текст.',
  addProduct: 'Додај производ',
  addProductGoal: 'Креирати картицу производа: назив, опис, карактеристике и продајни текст',
  improveImage: 'Побољшај фотографију',
  improveImageGoal: 'Побољшати фотографију мог производа да се боље продаје',
  /* «производ» se declina: 1 производ · 2 производа · 5 производа (one también cubre 21, 31…). */
  productsCount_one: '{{contador}} производ',
  productsCount_few: '{{contador}} производа',
  productsCount_other: '{{contador}} производа',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Унеси колико те кошта и Weë ти даје оријентациону цену.',
  pricingMaterials: 'Материјали',
  pricingPackaging: 'Паковање',
  pricingDelivery: 'Достава',
  pricingOther: 'Остали трошкови',
  pricingMargin: 'Жељена маржа',
  pricingCost: 'Процењени трошак',
  pricingSuggested: 'Предложена цена',
  pricingMarginResult: 'Процењена маржа',
  pricingProfit: 'Процењена зарада',
  pricingNote: 'Цене су само оријентационе и нису рачуноводствени ни порески савет.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Оно због чега твој садржај увек изгледа као твој.',
  brandLogo: 'Лого',
  brandColors: 'Боје',
  brandTypography: 'Типографија',
  brandStyle: 'Визуелни стил',
  brandAvatar: 'Профилна слика',
  brandCover: 'Насловна слика',
  brandTemplates: 'Шаблони садржаја',
  brandGoal: 'Креирати {{que}} за бренд мог бизниса',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Реци ми шта желиш да промовишеш и ја ћу то припремити.',
  createPlaceholder: 'Пример: Желим да промовишем ову торту за Дан мајки…',
  createTypes: 'Шта желиш да креираш?',
  typeImage: 'Слика',
  typeImageHint: 'Слика за промоцију',
  typeVideo: 'Видео',
  typeVideoHint: 'Кратак видео',
  typePost: 'Објава',
  typePostHint: 'Спремна за објављивање',
  typeCampaign: 'Кампања',
  typeCampaignHint: 'Више делова одједном',
  typeCopy: 'Текстови',
  typeCopyHint: 'Опис, хештегови и позив на акцију',
  typeGoal: 'Креирати {{que}} за мој бизнис: {{idea}}',
  formats: 'Изабери формат',
  formatsHint: 'Weë се брине о величини. Ти бираш где иде.',
  formatTikTok: 'TikTok',
  /* "Instagram видео" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram видео',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Положени видео',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Испричај ми својим речима и ја ћу се побринути.',
  askPlaceholder: 'Напиши овде шта ти треба…',
  askSend: 'Питај Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Креирај садржај',
  goalWithProduct: '{{idea}} — производ: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Креирај једном. Подели свуда.',
  share: 'Подели',
  shareHint: 'Отвара се дељење на твом телефону: изабери апликацију коју желиш.',
  shareToWee: 'Подели на Weë',
  shareWall: 'Мој Wäll',
  shareCommunities: 'Заједнице',
  shareProfile: 'Business Profile',
  shareNothing: 'Прво нешто креирај, па то подели одавде.',
  shareText: 'Креирано уз Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Отпреми моје податке',
  analyzeUploadHint: 'Excel, CSV или PDF са твојом продајом и трошковима.',
  analyzeUploadGoal: 'Анализирати фајл са продајом и трошковима мог бизниса',
  analyzeInsights: 'Шта видим у твојим бројкама',
  analyzeInsightsGoal: 'Објасни ми шта се дешава са продајом мог бизниса',
  expenses: 'Трошкови',
  expensesHint: 'Забележи на шта ти одлази новац.',
  expensesEmpty: 'Још нема забележених трошкова.',
  addExpense: 'Додај трошак',
  expenseSupplies: 'Сировине',
  expenseMarketing: 'Маркетинг',
  expenseDelivery: 'Доставе',
  expenseStaff: 'Особље',
  expenseServices: 'Услуге',
  expenseOther: 'Остало',
  expensesAsk: 'На шта трошим превише?',
  expensesAskGoal: 'Прегледај моје трошкове и реци ми на шта трошим превише',
  swot: 'SWOT',
  swotHint: 'Снаге, слабости, прилике и претње.',
  swotGoal: 'Урадити SWOT анализу мог бизниса',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Помози ми да растем',
  helpMeGrowHint: 'Weë гледа твој бизнис и предлаже ти шта да радиш.',
  helpMeGrowGoal: 'План за раст мог бизниса, са конкретним корацима',
  opportunities: 'Прилике',
  opportunitiesEmpty: 'Када буде било продаје и садржаја, овде ће се појавити прилике које уочим.',
  createPromotion: 'Креирај промоцију',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Коме продајеш и шта твојим купцима треба.',
  customerInsightsGoal: 'Описати мог идеалног купца и које поруке код њега делују',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Шта би још могло да се продаје или како да се издвојиш.',
  businessIdeasGoal: 'Дај ми идеје за мој бизнис и за то како да се издвојим',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Твој бизнис још нема страницу на Weë.',
  profileEmptyHint: 'Када креираш свој бизнис, овде ће бити његова страница: ко си, шта продајеш и како да те контактирају.',
  profileAbout: 'О нама',
  profileProducts: 'Производи',
  profilePosts: 'Објаве',
  profileContact: 'Контакт',
  reviews: 'Рецензије',
  reviewsHint: 'Шта кажу твоји купци и шта да побољшаш.',
  reviewsGoal: 'Анализирај рецензије мог бизниса и реци ми шта да побољшам',
  reviewsRespond: 'Напиши одговор',
  reviewsRespondGoal: 'Написати професионалан одговор на рецензију мог бизниса',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Допри до више људи уз Weë Credits',
  promoteHint: 'Твој садржај се приказује већем броју људи унутар Weë. Пре него што ишта потрошиш, видећеш колико кошта.',
  promoteSoon: 'Промовисање унутар Weë још није отворено. Када буде, плаћаће се твојим Credits и видећеш га овде.',
  promoteCredits: 'Прикажи моје Credits',
  sampleProductName: 'Производ {{numero}}',
};
