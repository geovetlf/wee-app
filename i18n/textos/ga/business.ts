/*
 * Weë Business en irlandés (Gaeilge, Caighdeán Oifigiúil): la pantalla del negocio
 * y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («tú», «do»). Los nombres de los módulos —My Business, Business Plan,
 * Brand Kit, Pricing Assistant, SWOT…— y las redes —TikTok, Instagram Story— no
 * se traducen ni se mutan. Lo que representa al negocio de la persona es
 * contenido y no pasa por aquí.
 *
 * PLURALES: el irlandés tiene cinco categorías donde el español tiene dos, así
 * que este archivo se declara con `ConPlurales` para añadir `_two`, `_few` y
 * `_many` a la única clave que lleva cantidad, `productsCount`.
 */
import { ConPlurales } from './plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'Mo mheáin shóisialta',
  manageAccounts: 'Bainistigh cuntais',
  connected: 'Nasctha',
  networkConnected: '{{red}} nasctha',
  connectAnother: 'Nasc líonra eile',
  allConnected: 'Tá do líonraí go léir nasctha agat cheana.',
  simulatedConnection: 'Nasc insamhlaithe: ní fhoilsíonn Weë agus ní fhreagraíonn sé ar do shon fós. Ullmhaíonn sé gach píosa ionas go ndéanfaidh tú féin é a athbhreithniú agus a fhoilsiú.',
  postCalendar: 'Féilire na bpostálacha',
  seeFullCalendar: 'Féach ar an bhféilire iomlán',
  calendarGoal: 'Féilire postálacha na seachtaine a fheiceáil agus a eagrú',
  scheduleGoal: 'Postáil a sceidealú le haghaidh {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Teachtaireachtaí ó chustaiméirí',
  seeAllMessages: 'Féach ar gach ceann',
  messagesGoal: 'Teachtaireachtaí mo chustaiméirí a fhreagairt',
  reply: 'Freagair',
  replied: 'Freagartha',
  replyTo: 'Freagair {{nombre}}',
  repliedTo: 'Freagraíodh {{nombre}}',
  replyGoal: '{{nombre}} a fhreagairt ar {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Torthaí na seachtaine seo',
  statPosts: 'Postálacha',
  statReach: 'Daoine a sroicheadh',
  statInteractions: 'Idirghníomhaíochtaí',
  statMessages: 'Teachtaireachtaí a fuarthas',
  onTrack: 'Tá do ghnó ar an mbóthar ceart',
  onTrackNote: 'Mhéadaigh na hidirghníomhaíochtaí 60% an tseachtain seo. Lean ort mar sin!',
  seeDetailedAnalysis: 'Féach ar an anailís mhionsonraithe',
  analysisGoal: 'Anailís a dhéanamh ar thorthaí mo ghnó an tseachtain seo',
  shortcutIdeas: 'Smaointe',
  shortcutIdeasGoal: 'Smaointe agus straitéis chun mo ghnó a fhás',
  shortcutMarketing: 'Margaíocht',
  shortcutMarketingGoal: 'Feachtas margaíochta do mo ghnó',
  shortcutSocial: 'Meáin shóisialta',
  shortcutSocialGoal: 'Ábhar a chruthú do mheáin shóisialta mo ghnó',
  shortcutAnalyze: 'Anailísigh',
  shortcutAnalyzeGoal: 'Anailís a dhéanamh ar thorthaí mo ghnó',
  shortcutDocuments: 'Doiciméid',
  shortcutDocumentsGoal: 'Doiciméad a dhréachtú do mo ghnó',
  shortcutSell: 'Díol níos mó',
  shortcutSellGoal: 'Níos mó a dhíol an mhí seo i mo ghnó',
  shortcutCareer: 'Obair agus gairm',
  shortcutCareerGoal: 'Mo CV agus mo phróifíl ghairmiúil a fheabhsú',
  yesterday: 'Inné',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Faisean, stíl, áilleacht agus cruthú ábhair amhairc.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Tóg agus bainistigh do ghnó',
  modProductsHint: 'Do tháirgí agus a bpraghsanna',
  modCreateHint: 'Cruthaigh ábhar le hIS',
  modSocialHint: 'Ullmhaigh agus roinn i ngach áit',
  modAnalyzeHint: 'Tuig do ghnó',
  modGrowHint: 'Aimsigh deiseanna agus fás',
  modProfileHint: 'Do ghnó laistigh de Weë',
  modPromoteHint: 'Sroich níos mó daoine le Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Forbhreathnú" y no "Do ghnó": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Forbhreathnú ar do ghnó',
  overviewEmpty: 'Níor chruthaigh tú do ghnó fós.',
  overviewEmptyHint: 'Inis do Weë i d\'fhocail féin é —"díolaim milseoga ón mbaile"— agus cabhróidh mé leat cruth a chur air.',
  createBusiness: 'Cruthaigh mo ghnó',
  createBusinessGoal: 'Mo ghnó a chruthú ón tús: ainm, cad a dhíolaim, le cé agus ar cén praghas',
  editBusiness: 'Cuir mo ghnó in eagar',
  editBusinessGoal: 'Eolas mo ghnó a athbhreithniú agus a fheabhsú',
  businessInfo: 'Eolas faoin ngnó',
  businessInfoGoal: 'Eolas mo ghnó a chur in ord: cad a dhíolaim, le cé agus cad a dhéanann difriúil mé',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'An plean gnó a scríobh chun mo ghnó a chur i láthair infheisteora',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Cad ba cheart dom a dhéanamh an tseachtain seo i mo ghnó?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Níor chuir tú táirgí leis fós.',
  productsEmptyHint: 'Uaslódáil grianghraf agus scríobhann Weë an t-ainm, an cur síos agus an téacs chun é a dhíol.',
  addProduct: 'Cuir táirge leis',
  addProductGoal: 'Cárta táirge a chruthú: ainm, cur síos, tréithe agus téacs chun é a dhíol',
  improveImage: 'Feabhsaigh an grianghraf',
  improveImageGoal: 'Grianghraf mo tháirge a fheabhsú chun é a dhíol níos fearr',
  /* 2-6 lenición, 7-10 eclipsis; el número lo pone Intl. */
  productsCount_one: '{{contador}} táirge',
  productsCount_two: '{{contador}} tháirge',
  productsCount_few: '{{contador}} tháirge',
  productsCount_many: '{{contador}} dtáirge',
  productsCount_other: '{{contador}} táirge',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Cuir isteach a gcosnaíonn sé ort agus tugann Weë praghas tagartha duit.',
  pricingMaterials: 'Ábhair',
  pricingPackaging: 'Pacáistiú',
  pricingDelivery: 'Seachadadh',
  pricingOther: 'Costais eile',
  pricingMargin: 'An corrlach atá uait',
  pricingCost: 'Costas measta',
  pricingSuggested: 'Praghas molta',
  pricingMarginResult: 'Corrlach measta',
  pricingProfit: 'Brabús measta',
  pricingNote: 'Is tagairt eolais iad na praghsanna agus ní comhairle chuntasaíochta ná chánach iad.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'An rud a fhágann go bhfeictear gur leatsa d\'ábhar i gcónaí.',
  brandLogo: 'Lógó',
  brandColors: 'Dathanna',
  brandTypography: 'Clóghrafaíocht',
  brandStyle: 'Stíl amhairc',
  brandAvatar: 'Íomhá phróifíle',
  brandCover: 'Clúdach',
  brandTemplates: 'Teimpléid ábhair',
  brandGoal: '{{que}} a chruthú do bhranda mo ghnó',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Inis dom cad ba mhaith leat a chur chun cinn agus ullmhóidh mé é.',
  createPlaceholder: 'Sampla: Ba mhaith liom an cáca seo a chur chun cinn do Lá na Máithreacha…',
  createTypes: 'Cad ba mhaith leat a chruthú?',
  typeImage: 'Íomhá',
  typeImageHint: 'Íomhá chun rud a chur chun cinn',
  typeVideo: 'Físeán',
  typeVideoHint: 'Físeán gearr',
  typePost: 'Postáil',
  typePostHint: 'Réidh le foilsiú',
  typeCampaign: 'Feachtas',
  typeCampaignHint: 'Roinnt píosaí in éineacht',
  typeCopy: 'Téacsanna',
  typeCopyHint: 'Cur síos, haischlibeanna agus glao chun gnímh',
  typeGoal: '{{que}} a chruthú do mo ghnó: {{idea}}',
  formats: 'Roghnaigh d\'fhormáid',
  formatsHint: 'Tugann Weë aire don mhéid. Roghnaíonn tusa cá dtéann sé.',
  formatTikTok: 'TikTok',
  /* "Físeán Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Físeán Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Físeán cothrománach',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Inis dom i d\'fhocail féin é agus tabharfaidh mé faoi.',
  askPlaceholder: 'Scríobh do chuidse anseo…',
  askSend: 'Fiafraigh de Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Cruthaigh ábhar',
  goalWithProduct: '{{idea}} — táirge: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Cruthaigh uair amháin é. Roinn i ngach áit é.',
  share: 'Roinn',
  shareHint: 'Osclaítear roinnt do ghutháin: roghnaigh an aip is mian leat.',
  shareToWee: 'Roinn ar Weë',
  shareWall: 'Mo Wäll',
  shareCommunities: 'Pobail',
  shareProfile: 'Business Profile',
  shareNothing: 'Cruthaigh rud éigin ar dtús agus ansin roinn as seo é.',
  shareText: 'Cruthaithe le Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Uaslódáil mo shonraí',
  analyzeUploadHint: 'Excel, CSV nó PDF le do dhíolacháin agus do chostais.',
  analyzeUploadGoal: 'Anailís a dhéanamh ar chomhad díolachán agus costas mo ghnó',
  analyzeInsights: 'A bhfeicim i d\'uimhreacha',
  analyzeInsightsGoal: 'A mhíniú dom cad atá ag tarlú le díolacháin mo ghnó',
  expenses: 'Costais',
  expensesHint: 'Breac síos cá dtéann d\'airgead.',
  expensesEmpty: 'Níor bhreac tú síos costais fós.',
  addExpense: 'Cuir costas leis',
  expenseSupplies: 'Soláthairtí',
  expenseMarketing: 'Margaíocht',
  expenseDelivery: 'Seachadtaí',
  expenseStaff: 'Foireann',
  expenseServices: 'Seirbhísí',
  expenseOther: 'Eile',
  expensesAsk: 'Cá bhfuil mé ag caitheamh an iomarca?',
  expensesAskGoal: 'Mo chostais a athbhreithniú agus a rá liom cá bhfuil mé ag caitheamh an iomarca',
  swot: 'SWOT',
  swotHint: 'Láidreachtaí, laigí, deiseanna agus bagairtí.',
  swotGoal: 'Anailís SWOT a dhéanamh ar mo ghnó',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Cabhraigh liom fás',
  helpMeGrowHint: 'Féachann Weë ar do ghnó agus molann sé duit cad atá le déanamh.',
  helpMeGrowGoal: 'Plean chun mo ghnó a fhás, le céimeanna nithiúla',
  opportunities: 'Deiseanna',
  opportunitiesEmpty: 'Nuair a bheidh díolacháin agus ábhar agat, taispeánfar anseo na deiseanna a fheicim.',
  createPromotion: 'Cruthaigh an cur chun cinn',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Cé leis a ndíolann tú agus cad atá uathu.',
  customerInsightsGoal: 'Cur síos a dhéanamh ar mo chustaiméir idéalach agus ar na teachtaireachtaí a oibríonn leis',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Cad eile a d\'fhéadfá a dhíol nó conas a bheith difriúil.',
  businessIdeasGoal: 'Smaointe a thabhairt dom do mo ghnó agus chun a bheith difriúil',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Níl leathanach ag do ghnó ar Weë fós.',
  profileEmptyHint: 'Nuair a chruthóidh tú do ghnó, beidh a leathanach anseo: cé thú féin, cad a dhíolann tú agus conas teagmháil a dhéanamh leat.',
  profileAbout: 'Eolas fúinn',
  profileProducts: 'Táirgí',
  profilePosts: 'Postálacha',
  profileContact: 'Teagmháil',
  reviews: 'Léirmheasanna',
  reviewsHint: 'A ndeir do chustaiméirí agus cad atá le feabhsú.',
  reviewsGoal: 'Anailís a dhéanamh ar léirmheasanna mo ghnó agus a rá liom cad atá le feabhsú',
  reviewsRespond: 'Scríobh freagra',
  reviewsRespondGoal: 'Freagra gairmiúil a scríobh ar léirmheas ar mo ghnó',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Sroich níos mó daoine le Weë Credits',
  promoteHint: 'Taispeántar d\'ábhar do níos mó daoine laistigh de Weë. Sula gcaitheann tú rud ar bith, feicfidh tú cé mhéad a chosnaíonn sé.',
  promoteSoon: 'Níl cur chun cinn laistigh de Weë oscailte fós. Nuair a bheidh, íocfar é le do Credits agus feicfidh tú anseo é.',
  promoteCredits: 'Féach ar mo Credits',
  sampleProductName: 'Táirge {{numero}}',
};
