/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra,
 * en ruso.
 *
 * Tipado contra el español: una clave que falte aquí no compila. Lo que
 * representa al negocio de la persona —sus arrobas, sus publicaciones, los
 * mensajes de sus clientes— nunca pasa por el traductor.
 *
 * MARCA Y MÓDULOS: Weë, Weë Business y Credits van en alfabeto latino dentro de
 * la frase cirílica, nunca transliterados. Los nombres de los ocho módulos
 * —Business Plan, Pricing Assistant, Brand Kit, Business Coach, Customer
 * Insights, Business Ideas, Business Profile, SWOT— son nombres de producto y
 * se escriben igual en todos los idiomas, como en inglés, alemán o italiano.
 *
 * DINERO: aquí hay precios, costes y márgenes. Primero la precisión: lo que es
 * una estimación se dice estimación («Примерная стоимость», «Примерная маржа»)
 * y el descargo de `pricingNote` se conserva entero.
 *
 * PLURALES: el ruso tiene cuatro categorías, así que el archivo se declara con
 * `ConPlurales` para añadir `_few` y `_many` a `productsCount`.
 */
import { ConPlurales } from './plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Мои соцсети',
  manageAccounts: 'Управление аккаунтами',
  connected: 'Подключено',
  /* El nombre de la red cambia de género, así que el estado va aparte. */
  networkConnected: '{{red}}: подключено',
  connectAnother: 'Подключить ещё одну соцсеть',
  allConnected: 'Все ваши соцсети уже подключены.',
  simulatedConnection: 'Подключение имитировано: Weë пока не публикует и не отвечает за вас. Он готовит каждый материал, чтобы вы сами его проверили и опубликовали.',
  postCalendar: 'Календарь публикаций',
  seeFullCalendar: 'Открыть весь календарь',
  calendarGoal: 'Посмотреть и составить мой календарь публикаций на неделю',
  scheduleGoal: 'Запланировать публикацию на {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Сообщения клиентов',
  seeAllMessages: 'Показать все',
  messagesGoal: 'Ответить на сообщения моих клиентов',
  reply: 'Ответить',
  replied: 'Отвечено',
  replyTo: 'Ответить {{nombre}}',
  repliedTo: 'Вы ответили {{nombre}}',
  replyGoal: 'Ответить {{nombre}} в {{red}}: «{{mensaje}}»',
  resultsThisWeek: 'Результаты за неделю',
  statPosts: 'Публикации',
  statReach: 'Охват',
  statInteractions: 'Взаимодействия',
  statMessages: 'Полученные сообщения',
  onTrack: 'Ваш бизнес идёт в правильном направлении',
  onTrackNote: 'Взаимодействия выросли на 60% за эту неделю. Так держать!',
  seeDetailedAnalysis: 'Открыть подробный анализ',
  analysisGoal: 'Проанализировать результаты моего бизнеса за эту неделю',
  shortcutIdeas: 'Идеи',
  shortcutIdeasGoal: 'Идеи и стратегия для роста моего бизнеса',
  shortcutMarketing: 'Маркетинг',
  shortcutMarketingGoal: 'Маркетинговая кампания для моего бизнеса',
  shortcutSocial: 'Соцсети',
  shortcutSocialGoal: 'Создать контент для соцсетей моего бизнеса',
  shortcutAnalyze: 'Анализ',
  shortcutAnalyzeGoal: 'Проанализировать результаты моего бизнеса',
  shortcutDocuments: 'Документы',
  shortcutDocumentsGoal: 'Составить документ для моего бизнеса',
  shortcutSell: 'Больше продаж',
  shortcutSellGoal: 'Продать больше в этом месяце',
  shortcutCareer: 'Работа и карьера',
  shortcutCareerGoal: 'Улучшить моё резюме и профессиональный профиль',
  yesterday: 'Вчера',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES —My Business, Products & Catalog, Create, Social, Analyze,
   * Grow, Business Profile, Promote— viven en `constants/businessModules.ts` y
   * no se traducen. Aquí solo lo que hace cada uno.
   */
  slogan: 'Создавайте, ведите, продвигайте и развивайте свой бизнес.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Создавайте и ведите свой бизнес',
  modProductsHint: 'Ваши продукты и их цены',
  modCreateHint: 'Создавайте контент с помощью ИИ',
  modSocialHint: 'Готовьте и публикуйте везде',
  modAnalyzeHint: 'Разберитесь в своём бизнесе',
  modGrowHint: 'Находите возможности и растите',
  modProfileHint: 'Ваш бизнес внутри Weë',
  modPromoteHint: 'Охватите больше людей с Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: 'Обзор вашего бизнеса',
  overviewEmpty: 'Вы ещё не создали свой бизнес.',
  overviewEmptyHint: 'Расскажите Weë своими словами — «продаю десерты из дома» — и я помогу всё оформить.',
  createBusiness: 'Создать мой бизнес',
  createBusinessGoal: 'Создать мой бизнес с нуля: название, что продаю, кому и по какой цене',
  editBusiness: 'Изменить мой бизнес',
  editBusinessGoal: 'Проверить и улучшить информацию о моём бизнесе',
  businessInfo: 'Информация о бизнесе',
  businessInfoGoal: 'Привести в порядок информацию о моём бизнесе: что продаю, кому и чем отличаюсь',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Написать бизнес-план, чтобы представить мой бизнес инвестору',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Что мне стоит сделать в бизнесе на этой неделе?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Вы ещё не добавили продукты.',
  productsEmptyHint: 'Загрузите фото, и Weë напишет название, описание и текст для продажи.',
  addProduct: 'Добавить продукт',
  addProductGoal: 'Создать карточку продукта: название, описание, характеристики и текст для продажи',
  improveImage: 'Улучшить фото',
  improveImageGoal: 'Улучшить фото моего продукта, чтобы он продавался лучше',
  /*
   * 1 продукт · 2 продукта · 5 продуктов. El 0 y el 11 caen en `many`, y
   * `_other` repite la forma de `_many` porque solo la ven las fracciones.
   */
  productsCount_one: '{{contador}} продукт',
  productsCount_few: '{{contador}} продукта',
  productsCount_many: '{{contador}} продуктов',
  productsCount_other: '{{contador}} продуктов',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Укажите свои затраты, и Weë предложит ориентировочную цену.',
  pricingMaterials: 'Материалы',
  pricingPackaging: 'Упаковка',
  pricingDelivery: 'Доставка',
  pricingOther: 'Прочие расходы',
  pricingMargin: 'Желаемая маржа',
  /* Lo estimado se dice estimado: aquí se habla de dinero de verdad. */
  pricingCost: 'Примерная стоимость',
  pricingSuggested: 'Рекомендуемая цена',
  pricingMarginResult: 'Примерная маржа',
  pricingProfit: 'Примерная прибыль',
  pricingNote: 'Цены носят справочный характер и не являются бухгалтерской или налоговой консультацией.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'То, благодаря чему ваш контент всегда узнаваем.',
  brandLogo: 'Логотип',
  brandColors: 'Цвета',
  brandTypography: 'Типографика',
  brandStyle: 'Визуальный стиль',
  brandAvatar: 'Изображение профиля',
  brandCover: 'Обложка',
  brandTemplates: 'Шаблоны контента',
  brandGoal: 'Создать {{que}} для бренда моего бизнеса',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Расскажите, что хотите продвигать, и я всё подготовлю.',
  createPlaceholder: 'Например: хочу продвигать этот торт ко Дню матери…',
  createTypes: 'Что хотите создать?',
  typeImage: 'Изображение',
  typeImageHint: 'Изображение для продвижения',
  typeVideo: 'Видео',
  typeVideoHint: 'Короткое видео',
  typePost: 'Публикация',
  typePostHint: 'Готова к публикации',
  typeCampaign: 'Кампания',
  typeCampaignHint: 'Несколько материалов сразу',
  typeCopy: 'Тексты',
  typeCopyHint: 'Описание, хештеги и призыв к действию',
  typeGoal: 'Создать {{que}} для моего бизнеса: {{idea}}',
  formats: 'Выберите формат',
  formatsHint: 'Размер — забота Weë. Вы выбираете, где публиковать.',
  formatTikTok: 'TikTok',
  /* «Видео в Instagram» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Видео в Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Горизонтальное видео',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta.
   */
  askInvite: 'Расскажите своими словами, а я всё сделаю.',
  askPlaceholder: 'Напишите здесь, что нужно…',
  askSend: 'Спросить Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Создать контент',
  goalWithProduct: '{{idea}} — продукт: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Создайте один раз. Поделитесь везде.',
  share: 'Поделиться',
  shareHint: 'Откроется меню «Поделиться» на телефоне: выберите любое приложение.',
  shareToWee: 'Поделиться в Weë',
  shareWall: 'Мой Wäll',
  shareCommunities: 'Сообщества',
  shareProfile: 'Business Profile',
  shareNothing: 'Сначала создайте что-нибудь, а потом поделитесь этим отсюда.',
  shareText: 'Создано с помощью Weë Business',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Загрузить мои данные',
  analyzeUploadHint: 'Excel, CSV или PDF с вашими продажами и расходами.',
  analyzeUploadGoal: 'Проанализировать файл с продажами и расходами моего бизнеса',
  analyzeInsights: 'Что я вижу в ваших цифрах',
  analyzeInsightsGoal: 'Объяснить, что происходит с продажами моего бизнеса',
  expenses: 'Расходы',
  expensesHint: 'Записывайте, на что уходят деньги.',
  expensesEmpty: 'Вы ещё не записали расходы.',
  addExpense: 'Добавить расход',
  expenseSupplies: 'Закупки',
  expenseMarketing: 'Маркетинг',
  expenseDelivery: 'Доставка',
  expenseStaff: 'Персонал',
  expenseServices: 'Услуги',
  expenseOther: 'Прочее',
  expensesAsk: 'На что я трачу слишком много?',
  expensesAskGoal: 'Проверить мои расходы и сказать, на что я трачу слишком много',
  swot: 'SWOT',
  swotHint: 'Сильные и слабые стороны, возможности и угрозы.',
  swotGoal: 'Провести SWOT-анализ моего бизнеса',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Помоги мне расти',
  helpMeGrowHint: 'Weë изучит ваш бизнес и предложит, что делать.',
  helpMeGrowGoal: 'План роста моего бизнеса с конкретными шагами',
  opportunities: 'Возможности',
  opportunitiesEmpty: 'Когда у вас будут продажи и контент, здесь появятся возможности, которые я замечу.',
  createPromotion: 'Создать акцию',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Кому вы продаёте и что этим людям нужно.',
  customerInsightsGoal: 'Описать моего идеального клиента и какие сообщения на него работают',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Что ещё можно продавать и чем выделиться.',
  businessIdeasGoal: 'Предложить идеи для моего бизнеса и способы выделиться',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'У вашего бизнеса пока нет страницы в Weë.',
  profileEmptyHint: 'Когда вы создадите бизнес, здесь будет его страница: кто вы, что продаёте и как с вами связаться.',
  profileAbout: 'О нас',
  profileProducts: 'Продукты',
  profilePosts: 'Публикации',
  profileContact: 'Контакты',
  reviews: 'Отзывы',
  reviewsHint: 'Что говорят ваши клиенты и что улучшить.',
  reviewsGoal: 'Проанализировать отзывы о моём бизнесе и сказать, что улучшить',
  reviewsRespond: 'Написать ответ',
  reviewsRespondGoal: 'Написать профессиональный ответ на отзыв о моём бизнесе',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Охватите больше людей с Weë Credits',
  promoteHint: 'Ваш контент увидит больше людей внутри Weë. Стоимость вы увидите до того, как что-то потратите.',
  promoteSoon: 'Продвижение внутри Weë ещё не открыто. Когда откроется, оно будет оплачиваться вашими Credits и появится здесь.',
  promoteCredits: 'Посмотреть мои Credits',
  sampleProductName: 'Продукт {{numero}}',
};
