/*
 * FILIPINO — Weë Business: la pantalla del negocio, sus ocho módulos y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Lo que representa al negocio de la
 * persona —nombres de cuentas, arrobas, títulos de publicaciones y mensajes de sus clientes— no pasa por aquí: es
 * contenido de muestra y sale tal cual (`experiencias-i18n.test.mjs`, 22).
 *
 * LAS PALABRAS son las de quien vende en Filipinas, con las del glosario (§ 11.11, Negocio) y las que ya fijó el
 * catálogo de Weë Business (`catalogo.business…`): negocio «negosyo», producto «produkto», cliente «customer», venta
 * «benta», precio «presyo», reseña «review», envío «delivery», marca «brand», campaña «kampanya», estrategia
 * «estratehiya», redes sociales «social media», el CV «resume», publicación «post», imagen «larawan», analizar
 * «Suriin» y los resultados de la semana con las mismas etiquetas que el catálogo («Mga resulta ngayong linggo», «Mga
 * taong naabot», «Mga interaksyon», «Mga natanggap na mensahe»). Una red conectada es una «account» que está
 * «Nakakonekta»; «Gestionar» es «Pamahalaan», como en Android. «Promocionar» es «i-promote» y una promoción, «promo».
 * Lo que trae el Pricing Assistant se dice como lo dice un vendedor: el coste, «gastos»; la ganancia, «tubo»; el
 * margen, «margin»; el precio de referencia, «gabay na presyo»; el sugerido, «Mungkahing presyo»; lo estimado,
 * «Tinatayang…». El gasto «Servicios» es el de luz, agua e internet (su icono es un rayo): «Bayarin», las cuentas que
 * se pagan cada mes; «Insumos» es «Supplies» y «Personal», «Sahod», que es en lo que se gasta. La «ficha» de un
 * producto es su «listing», como en las tiendas en línea de Filipinas, y el texto para venderlo, «text na pambenta».
 *
 * LOS NOMBRES de las funciones y de los módulos —Business Plan, Business Coach, Pricing Assistant, Brand Kit, Customer
 * Insights, Business Ideas, Business Profile— son de producto y se escriben igual en todos los idiomas (decisión del
 * usuario, 2026-09-16, guía § 6); lo que hace cada uno sí se traduce. Un «plan de negocio» cualquiera es «business
 * plan», en minúscula: es la palabra que se usa en Filipinas. «SWOT» es sigla: «SWOT analysis» (guía § 6).
 *
 * LOS «…Goal» son lo que la persona le pide a Weë Brain: su propia burbuja y el título del trabajo. Van como en el
 * catálogo: imperativo sin pronombre («Suriin ang mga resulta ng negosyo ko»), o el «Gusto kong…» con el que se pide
 * algo en filipino; varios coinciden palabra por palabra con su gemelo del catálogo para que la misma petición no
 * diga dos cosas. Los que reciben una pieza o un tipo ya escrito («Logo», «Mga kulay», «Larawan») EMPIEZAN por él
 * —«{{que}} para sa brand ng negosyo ko»—, porque llega con su mayúscula y «Gumawa ng Mga kulay» no se puede leer.
 * Los verbos coordinados comparten foco (el lema: «Buuin, pamahalaan, i-promote at palaguin…»). «Crear mi negocio»
 * es «Buuin ang negosyo ko»: se le da forma con Weë, no se rellena un formulario.
 *
 * LOS FORMATOS se dicen como los dice quien publica en Filipinas: el sustantivo y la red con «sa» —«Story sa
 * Instagram», «Post sa Facebook», «Video sa Instagram»— (guía § 6, «request sa ËContact»); y nunca «Reel», porque en
 * Weë los videos cortos son Weëls. El vídeo horizontal es «Pahigang video» (glosario, Weë Studio).
 *
 * EJEMPLOS, A LA FILIPINA, como en el catálogo: los postres que se venden desde casa son «gawang-bahay na leche
 * flan» y la torta del Día de la Madre, un «cake» para el «Mother’s Day», que es como lo dice la gente. El inciso con
 * raya del español va entre paréntesis (guía § 7) y las comillas son “…”. El «60%» va pegado; «tumaas nang 60%»
 * lleva «nang» porque es medida (§ 5.3). Plural (§ 8.3): `{{contador}} produkto` / `{{contador}} na produkto`.
 *
 * Se escriben igual que en inglés porque ES la palabra que se usa: «Marketing», «Video», «Post», «Logo», «TikTok»,
 * «Packaging», «Delivery», «Supplies», «Profile picture» y «Cover photo» (glosario § 11.3).
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Mga social media account ko',
  manageAccounts: 'Pamahalaan ang mga account',
  connected: 'Nakakonekta',
  networkConnected: 'Nakakonekta ang {{red}}',
  connectAnother: 'Magkonekta ng isa pang account',
  allConnected: 'Nakakonekta na ang lahat ng account mo.',
  simulatedConnection: 'Demo lang ang koneksyon: hindi pa nagpo-post o sumasagot ang Weë para sa iyo. Inihahanda nito ang bawat post para ikaw mismo ang mag-review at mag-post nito.',
  postCalendar: 'Kalendaryo ng mga post',
  seeFullCalendar: 'Tingnan ang buong kalendaryo',
  calendarGoal: 'Tingnan at ayusin ang kalendaryo ng mga post ko ngayong linggo',
  scheduleGoal: 'Mag-schedule ng post sa {{dia}}, {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}}, {{fecha}}',
  customerMessages: 'Mga mensahe ng customer',
  seeAllMessages: 'Tingnan lahat',
  messagesGoal: 'Sagutin ang mga mensahe ng mga customer ko',
  reply: 'Sumagot',
  replied: 'Nasagot na',
  replyTo: 'Sagutin si {{nombre}}',
  repliedTo: 'Nasagot mo na si {{nombre}}',
  replyGoal: 'Sagutin si {{nombre}} sa {{red}}: “{{mensaje}}”',
  resultsThisWeek: 'Mga resulta ngayong linggo',
  statPosts: 'Mga post',
  statReach: 'Mga taong naabot',
  statInteractions: 'Mga interaksyon',
  statMessages: 'Mga natanggap na mensahe',
  onTrack: 'Maganda ang takbo ng negosyo mo',
  onTrackNote: 'Tumaas nang 60% ang mga interaksyon ngayong linggo. Ituloy mo lang!',
  seeDetailedAnalysis: 'Tingnan ang detalyadong pagsusuri',
  analysisGoal: 'Suriin ang mga resulta ng negosyo ko ngayong linggo',
  shortcutIdeas: 'Mga ideya',
  shortcutIdeasGoal: 'Mga ideya at estratehiya para palaguin ang negosyo ko',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Kampanya sa marketing para sa negosyo ko',
  shortcutSocial: 'Social media',
  shortcutSocialGoal: 'Gumawa ng content para sa social media ng negosyo ko',
  shortcutAnalyze: 'Suriin',
  shortcutAnalyzeGoal: 'Suriin ang mga resulta ng negosyo ko',
  shortcutDocuments: 'Mga dokumento',
  shortcutDocumentsGoal: 'Magsulat ng dokumento para sa negosyo ko',
  shortcutSell: 'Mas maraming benta',
  shortcutSellGoal: 'Pataasin ang benta ng negosyo ko ngayong buwan',
  shortcutCareer: 'Trabaho at karera',
  shortcutCareerGoal: 'Pagandahin ang resume at propesyonal na profile ko',
  yesterday: 'Kahapon',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: 'Buuin, pamahalaan, i-promote at palaguin ang negosyo mo.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Buuin at pamahalaan ang negosyo mo',
  modProductsHint: 'Ang mga produkto at presyo mo',
  modCreateHint: 'Gumawa ng content gamit ang AI',
  modSocialHint: 'Ihanda at ibahagi kahit saan',
  modAnalyzeHint: 'Intindihin ang negosyo mo',
  modGrowHint: 'Maghanap ng oportunidad at lumago',
  modProfileHint: 'Ang negosyo mo sa Weë',
  modPromoteHint: 'Maabot ang mas maraming tao gamit ang Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Buod» y no «Ang negosyo mo»: «Tu negocio» es el nombre de una de las cuentas de muestra. */
  overview: 'Buod ng negosyo mo',
  overviewEmpty: 'Hindi mo pa nabubuo ang negosyo mo.',
  overviewEmptyHint: 'Ikuwento sa Weë ang negosyo mo sa sarili mong salita (halimbawa: “nagbebenta ako ng gawang-bahay na leche flan”), at tutulungan kitang buuin ito.',
  createBusiness: 'Buuin ang negosyo ko',
  createBusinessGoal: 'Buuin ang negosyo ko mula sa simula: pangalan, kung ano ang ibinebenta ko, kanino at sa anong presyo',
  editBusiness: 'I-edit ang negosyo ko',
  editBusinessGoal: 'I-review at pagandahin ang impormasyon ng negosyo ko',
  businessInfo: 'Impormasyon ng negosyo',
  businessInfoGoal: 'Ayusin ang impormasyon ng negosyo ko: kung ano ang ibinebenta ko, kanino at kung ano ang nagpapaiba sa akin',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Gumawa ng business plan para maipresenta ko ang negosyo ko sa isang investor',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Ano ang dapat kong gawin sa negosyo ko ngayong linggo?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Wala ka pang naidadagdag na produkto.',
  productsEmptyHint: 'Mag-upload ng larawan at isusulat ng Weë ang pangalan, ang paglalarawan at ang text na pambenta.',
  addProduct: 'Magdagdag ng produkto',
  addProductGoal: 'Gumawa ng listing ng produkto: pangalan, paglalarawan, mga katangian at text na pambenta',
  improveImage: 'Pagandahin ang larawan',
  improveImageGoal: 'Pagandahin ang larawan ng produkto ko para mas mabenta ito',
  productsCount_one: '{{contador}} produkto',
  productsCount_other: '{{contador}} na produkto',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Ilagay kung magkano ang gastos mo at bibigyan ka ng Weë ng gabay na presyo.',
  pricingMaterials: 'Materyales',
  pricingPackaging: 'Packaging',
  pricingDelivery: 'Delivery',
  pricingOther: 'Iba pang gastos',
  pricingMargin: 'Margin na gusto mo',
  pricingCost: 'Tinatayang gastos',
  pricingSuggested: 'Mungkahing presyo',
  pricingMarginResult: 'Tinatayang margin',
  pricingProfit: 'Tinatayang tubo',
  pricingNote: 'Gabay lang ang mga presyong ito at hindi ito payo sa accounting o buwis.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Para laging makilala na sa iyo ang content mo.',
  brandLogo: 'Logo',
  brandColors: 'Mga kulay',
  brandTypography: 'Mga font',
  brandStyle: 'Biswal na istilo',
  brandAvatar: 'Profile picture',
  brandCover: 'Cover photo',
  brandTemplates: 'Mga template ng content',
  brandGoal: '{{que}} para sa brand ng negosyo ko',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Sabihin mo kung ano ang gusto mong i-promote at ihahanda ko ito.',
  createPlaceholder: 'Halimbawa: Gusto kong i-promote ang cake na ito para sa Mother’s Day…',
  createTypes: 'Ano ang gusto mong likhain?',
  typeImage: 'Larawan',
  typeImageHint: 'Larawang pang-promote',
  typeVideo: 'Video',
  typeVideoHint: 'Maikling video',
  typePost: 'Post',
  typePostHint: 'Handa nang i-post',
  typeCampaign: 'Kampanya',
  typeCampaignHint: 'Ilang content nang sabay-sabay',
  typeCopy: 'Mga caption',
  typeCopyHint: 'Paglalarawan, mga hashtag at call to action',
  typeGoal: '{{que}} para sa negosyo ko: {{idea}}',
  formats: 'Pumili ng format',
  formatsHint: 'Ang Weë na ang bahala sa laki. Ikaw ang pipili kung saan ito ilalagay.',
  formatTikTok: 'TikTok',
  /* «Video sa Instagram» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Video sa Instagram',
  formatStory: 'Story sa Instagram',
  formatFacebookStory: 'Story sa Facebook',
  formatPost: 'Post sa Instagram',
  formatFeed: 'Post sa Facebook',
  formatWide: 'Pahigang video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Sabihin mo sa sarili mong salita at ako na ang bahala.',
  askPlaceholder: 'Isulat dito ang kailangan mo…',
  askSend: 'Magtanong sa Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Gumawa ng content',
  goalWithProduct: '{{idea}} (produkto: {{producto}})',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Isang beses gawin, kahit saan ibahagi.',
  share: 'Ibahagi',
  shareHint: 'Bubukas ang mga opsyon sa pagbabahagi ng phone mo: piliin ang app na gusto mo.',
  shareToWee: 'Ibahagi sa Weë',
  shareWall: 'Wäll ko',
  shareCommunities: 'Mga komunidad',
  shareProfile: 'Business Profile',
  shareNothing: 'Gumawa ka muna ng kahit ano, saka mo ito ibahagi mula dito.',
  shareText: 'Ginawa gamit ang Weë Business',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'I-upload ang data ko',
  analyzeUploadHint: 'Excel, CSV o PDF na may benta at gastos mo.',
  analyzeUploadGoal: 'Suriin ang file ng benta at gastos ng negosyo ko',
  analyzeInsights: 'Ang nakikita ko sa mga numero mo',
  analyzeInsightsGoal: 'Ipaliwanag sa akin kung ano ang nangyayari sa benta ng negosyo ko',
  expenses: 'Mga gastos',
  expensesHint: 'Itala kung saan napupunta ang pera mo.',
  expensesEmpty: 'Wala ka pang naitatalang gastos.',
  addExpense: 'Magdagdag ng gastos',
  expenseSupplies: 'Supplies',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Delivery',
  expenseStaff: 'Sahod',
  expenseServices: 'Bayarin',
  expenseOther: 'Iba pa',
  expensesAsk: 'Saan ako gumagastos nang sobra?',
  expensesAskGoal: 'I-review ang mga gastos ko at sabihin kung saan ako gumagastos nang sobra',
  swot: 'SWOT analysis',
  swotHint: 'Mga lakas, kahinaan, oportunidad at banta.',
  swotGoal: 'Gumawa ng SWOT analysis ng negosyo ko',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Tulungan mo akong lumago',
  helpMeGrowHint: 'Titingnan ng Weë ang negosyo mo at magmumungkahi ito kung ano ang puwede mong gawin.',
  helpMeGrowGoal: 'Plano para palaguin ang negosyo ko, kasama ang mga kongkretong hakbang',
  opportunities: 'Mga oportunidad',
  opportunitiesEmpty: 'Kapag may benta at content ka na, dito lalabas ang mga oportunidad na nakikita ko.',
  createPromotion: 'Gawin ang promo',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Kung kanino ka nagbebenta at ano ang kailangan nila.',
  customerInsightsGoal: 'Ilarawan ang ideal kong customer at kung anong mga mensahe ang tumatalab sa kanila',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Ano pa ang puwede mong ibenta, o paano ka mamumukod-tangi.',
  businessIdeasGoal: 'Bigyan mo ako ng mga ideya para sa negosyo ko at kung paano ako mamumukod-tangi',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Wala pang page sa Weë ang negosyo mo.',
  profileEmptyHint: 'Kapag nabuo mo na ang negosyo mo, dito makikita ang page nito: kung sino ka, ano ang ibinebenta mo at paano ka makokontak.',
  profileAbout: 'Tungkol sa negosyo',
  profileProducts: 'Mga produkto',
  profilePosts: 'Mga post',
  profileContact: 'Makipag-ugnayan',
  reviews: 'Mga review',
  reviewsHint: 'Ano ang sinasabi ng mga customer mo at ano ang puwede pang pagandahin.',
  reviewsGoal: 'Suriin ang mga review ng negosyo ko at sabihin kung ano ang dapat kong pagandahin',
  reviewsRespond: 'Magsulat ng sagot',
  reviewsRespondGoal: 'Magsulat ng propesyonal na sagot sa isang review ng negosyo ko',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Maabot ang mas maraming tao gamit ang Weë Credits',
  promoteHint: 'Ipapakita ang content mo sa mas maraming tao sa loob ng Weë. Bago ka gumastos, makikita mo muna kung magkano ito.',
  promoteSoon: 'Hindi pa bukas ang pag-promote sa loob ng Weë. Kapag bukas na, babayaran ito gamit ang Credits mo at makikita mo ito dito.',
  promoteCredits: 'Tingnan ang Credits ko',
  sampleProductName: 'Produkto {{numero}}',
};
