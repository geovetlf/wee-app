/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra,
 * en portugués de Portugal (pt-PT).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS. La diferencia mayor es
 * GRAMATICAL, no de vocabulario:
 *
 *   ESTAR A + INFINITIVO, nunca el gerundio: "onde estou a gastar de mais" y no
 *   "onde estou gastando demais".
 *   TRATO DE "TU", nunca "você": queres, tens, o teu negócio, cria, partilha.
 *   ENCLISIS: "ajudo-te", "dá-te", "partilha-a", "dizer-me"; y el clítico va
 *   delante del infinitivo —"para o vender"— donde Brasil escribe "para vendê-lo".
 *   FUTURO DE SUBJUNTIVO vivo: "quando criares", "quando tiveres", "antes de
 *   gastares".
 *
 * Y el vocabulario, término a término:
 *
 *   gerir (no gerenciar) · ficheiro (no arquivo) · telemóvel (no celular)
 *   partilhar (no compartilhar) · contacto (no contato) · logótipo (no logotipo)
 *   contabilístico (no contábil) · portes (no frete) · Dia da Mãe (no das Mães)
 *   ligar una red (no conectar) · o teu negócio, con artículo
 *
 * QUÉ NO ENTRA AQUÍ: lo que representa al negocio de la persona —nombres de
 * cuentas, arrobas, títulos de publicaciones y mensajes de sus clientes—, que es
 * contenido y no pasa por el traductor. Los nombres de módulo (Business Plan,
 * Business Coach, Pricing Assistant, Brand Kit, Customer Insights, Business
 * Ideas, Business Profile, SWOT) son nombres de producto y se escriben igual en
 * todos los idiomas, y "Credits" nunca se traduce.
 *
 * DONDE SE HABLA DE DINERO, precisión antes que elegancia: siempre queda claro
 * qué es una estimación y qué cuesta Credits, y el descargo de que esto no es
 * asesoría contable ni fiscal va entero.
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'As minhas redes sociais',
  /* "Gerir" en Portugal; "gerenciar" es de Brasil. */
  manageAccounts: 'Gerir contas',
  /* Una red social en Portugal se LIGA a la cuenta, no se "conecta". */
  connected: 'Ligado',
  networkConnected: '{{red}} ligado',
  connectAnother: 'Ligar outra rede',
  allConnected: 'Já ligaste todas as tuas redes.',
  simulatedConnection: 'Ligação simulada: o Weë vai publicar e responder de verdade quando as redes disponibilizarem as suas permissões oficiais.',
  postCalendar: 'Calendário de publicações',
  seeFullCalendar: 'Ver calendário completo',
  calendarGoal: 'Ver e organizar o meu calendário de publicações da semana',
  scheduleGoal: 'Programar uma publicação para {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Mensagens de clientes',
  seeAllMessages: 'Ver todas',
  messagesGoal: 'Responder às mensagens dos meus clientes',
  reply: 'Responder',
  replied: 'Respondido',
  replyTo: 'Responder a {{nombre}}',
  repliedTo: 'Respondido a {{nombre}}',
  replyGoal: 'Responder a {{nombre}} no {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Resultados desta semana',
  statPosts: 'Publicações',
  statReach: 'Pessoas alcançadas',
  statInteractions: 'Interações',
  statMessages: 'Mensagens recebidas',
  onTrack: 'O teu negócio está no bom caminho',
  onTrackNote: 'As interações subiram 60% esta semana. Continua assim!',
  seeDetailedAnalysis: 'Ver análise detalhada',
  analysisGoal: 'Analisar os resultados do meu negócio esta semana',
  shortcutIdeas: 'Ideias',
  shortcutIdeasGoal: 'Ideias e estratégia para fazer crescer o meu negócio',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Uma campanha de marketing para o meu negócio',
  shortcutSocial: 'Redes sociais',
  shortcutSocialGoal: 'Criar conteúdo para as redes do meu negócio',
  shortcutAnalyze: 'Analisar',
  shortcutAnalyzeGoal: 'Analisar os resultados do meu negócio',
  shortcutDocuments: 'Documentos',
  shortcutDocumentsGoal: 'Redigir um documento para o meu negócio',
  shortcutSell: 'Vender mais',
  shortcutSellGoal: 'Vender mais este mês no meu negócio',
  shortcutCareer: 'Trabalho e carreira',
  shortcutCareerGoal: 'Melhorar o meu currículo e o meu perfil profissional',
  yesterday: 'Ontem',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: 'Cria, gere, divulga e faz crescer o teu negócio.',

  modMyBusinessHint: 'Constrói e gere o teu negócio',
  modProductsHint: 'Os teus produtos e os seus preços',
  modCreateHint: 'Cria conteúdo com IA',
  /* "Partilha" y "em todo o lado": en Brasil serían "compartilhe" y "em todo lugar". */
  modSocialHint: 'Prepara e partilha em todo o lado',
  modAnalyzeHint: 'Percebe o teu negócio',
  modGrowHint: 'Encontra oportunidades e cresce',
  modProfileHint: 'O teu negócio dentro do Weë',
  modPromoteHint: 'Chega a mais pessoas com o Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  overview: 'Resumo do teu negócio',
  overviewEmpty: 'Ainda não criaste o teu negócio.',
  overviewEmptyHint: 'Conta ao Weë por palavras tuas — "vendo sobremesas feitas em casa" — e eu ajudo-te a dar-lhe forma.',
  createBusiness: 'Criar o meu negócio',
  /* "De raiz" es lo que en Brasil sería "do zero". */
  createBusinessGoal: 'Criar o meu negócio de raiz: nome, o que vendo, a quem e a que preço',
  editBusiness: 'Editar o meu negócio',
  editBusinessGoal: 'Rever e melhorar a informação do meu negócio',
  businessInfo: 'Informação do negócio',
  businessInfoGoal: 'Organizar a informação do meu negócio: o que vendo, a quem e o que me diferencia',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Escrever o plano de negócio para apresentar o meu negócio a um investidor',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'O que é que devia fazer esta semana no meu negócio?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Ainda não adicionaste produtos.',
  /* "Para o vender": el clítico va delante del infinitivo, no "para vendê-lo". */
  productsEmptyHint: 'Carrega uma foto e o Weë escreve o nome, a descrição e o texto para o vender.',
  addProduct: 'Adicionar produto',
  addProductGoal: 'Criar a ficha de um produto: nome, descrição, características e texto para o vender',
  improveImage: 'Melhorar a foto',
  improveImageGoal: 'Melhorar a foto do meu produto para o vender melhor',
  /* Con {{contador}} en las dos formas, el cero de Portugal —que es plural—
   * sale bien: "0 produtos". */
  productsCount_one: '{{contador}} produto',
  productsCount_other: '{{contador}} produtos',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Indica quanto te custa e o Weë dá-te um preço de referência.',
  pricingMaterials: 'Materiais',
  pricingPackaging: 'Embalagem',
  /* "Portes" es el coste de envío en Portugal; "frete" es de Brasil. */
  pricingDelivery: 'Portes',
  pricingOther: 'Outros custos',
  pricingMargin: 'Margem que queres',
  /* Las cuatro que siguen son ESTIMACIONES y lo dicen. */
  pricingCost: 'Custo estimado',
  pricingSuggested: 'Preço sugerido',
  pricingMarginResult: 'Margem estimada',
  pricingProfit: 'Lucro estimado',
  /* El descargo va entero: referencia informativa, no asesoría. */
  pricingNote: 'Os preços são uma referência informativa e não são aconselhamento contabilístico nem fiscal.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'O que faz com que o teu conteúdo pareça sempre teu.',
  /* "Logótipo" con acento: la forma portuguesa. */
  brandLogo: 'Logótipo',
  brandColors: 'Cores',
  brandTypography: 'Tipografia',
  brandStyle: 'Estilo visual',
  brandAvatar: 'Imagem de perfil',
  brandCover: 'Capa',
  brandTemplates: 'Modelos de conteúdo',
  brandGoal: 'Criar {{que}} para a marca do meu negócio',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Conta-me o que queres divulgar e eu trato disso.',
  /* En Portugal es o Dia da Mãe, en singular; en Brasil, o Dia das Mães. */
  createPlaceholder: 'Exemplo: quero divulgar este bolo para o Dia da Mãe…',
  createTypes: 'O que queres criar?',
  typeImage: 'Imagem',
  typeImageHint: 'Uma imagem para divulgar',
  typeVideo: 'Vídeo',
  typeVideoHint: 'Um vídeo curto',
  typePost: 'Publicação',
  typePostHint: 'Pronta a publicar',
  typeCampaign: 'Campanha',
  typeCampaignHint: 'Várias peças de uma vez',
  typeCopy: 'Textos',
  typeCopyHint: 'Descrição, hashtags e apelo à ação',
  typeGoal: 'Criar {{que}} para o meu negócio: {{idea}}',
  formats: 'Escolhe o teu formato',
  formatsHint: 'O Weë trata do tamanho. Tu escolhes onde vai.',
  formatTikTok: 'TikTok',
  /* "Vídeo do Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Vídeo do Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Vídeo horizontal',

  askInvite: 'Conta-me por palavras tuas e eu trato do resto.',
  askPlaceholder: 'Escreve aqui a tua ideia…',
  askSend: 'Perguntar ao Weë',

  productCreate: 'Criar conteúdo',
  goalWithProduct: '{{idea}} — produto: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Cria uma vez. Partilha em todo o lado.',
  share: 'Partilhar',
  shareHint: 'Abre a partilha do teu telemóvel: escolhe a app que quiseres.',
  shareToWee: 'Partilhar no Weë',
  shareWall: 'O meu Wäll',
  shareCommunities: 'Comunidades',
  shareProfile: 'Business Profile',
  shareNothing: 'Primeiro cria alguma coisa e depois partilha-a a partir daqui.',
  shareText: 'Criado com Weë Business',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Carregar os meus dados',
  analyzeUploadHint: 'Excel, CSV ou PDF com as tuas vendas e despesas.',
  /* "Ficheiro" en Portugal; "arquivo" es de Brasil. */
  analyzeUploadGoal: 'Analisar o ficheiro de vendas e despesas do meu negócio',
  analyzeInsights: 'O que vejo nos teus números',
  analyzeInsightsGoal: 'Explicar-me o que se passa com as vendas do meu negócio',
  expenses: 'Despesas',
  expensesHint: 'Aponta para onde vai o teu dinheiro.',
  expensesEmpty: 'Ainda não apontaste despesas.',
  addExpense: 'Adicionar despesa',
  expenseSupplies: 'Consumíveis',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Portes',
  expenseStaff: 'Pessoal',
  expenseServices: 'Serviços',
  expenseOther: 'Outros',
  /* "Estou a gastar", nunca "estou gastando". */
  expensesAsk: 'Onde é que estou a gastar de mais?',
  expensesAskGoal: 'Rever as minhas despesas e dizer-me onde estou a gastar de mais',
  swot: 'SWOT',
  swotHint: 'Forças, fraquezas, oportunidades e ameaças.',
  swotGoal: 'Fazer a análise SWOT do meu negócio',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Ajuda-me a crescer',
  helpMeGrowHint: 'O Weë olha para o teu negócio e propõe-te o que fazer.',
  helpMeGrowGoal: 'Um plano para fazer crescer o meu negócio, com passos concretos',
  opportunities: 'Oportunidades',
  opportunitiesEmpty: 'Quando tiveres vendas e conteúdo, aparecem aqui as oportunidades que eu encontrar.',
  createPromotion: 'Criar a promoção',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'A quem vendes e do que essa pessoa precisa.',
  customerInsightsGoal: 'Descrever o meu cliente ideal e que mensagens funcionam com ele',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'O que mais poderias vender ou como te diferenciar.',
  businessIdeasGoal: 'Dar-me ideias para o meu negócio e para me diferenciar',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'O teu negócio ainda não tem página no Weë.',
  profileEmptyHint: 'Quando criares o teu negócio, é aqui que vai viver a página dele: quem és, o que vendes e como te contactam.',
  profileAbout: 'Sobre',
  profileProducts: 'Produtos',
  profilePosts: 'Publicações',
  /* "Contacto" con c: la grafía portuguesa. */
  profileContact: 'Contacto',
  reviews: 'Avaliações',
  reviewsHint: 'O que dizem os teus clientes e o que podes melhorar.',
  reviewsGoal: 'Analisar as avaliações do meu negócio e dizer-me o que melhorar',
  reviewsRespond: 'Escrever uma resposta',
  reviewsRespondGoal: 'Escrever uma resposta profissional a uma avaliação do meu negócio',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Chega a mais pessoas com Weë Credits',
  /* Que nunca quede dudoso si se cobra: primero se ve lo que cuesta, y solo
   * después se gasta. */
  promoteHint: 'O teu conteúdo é mostrado a mais gente dentro do Weë. Antes de gastares alguma coisa, vês quanto custa.',
  promoteSoon: 'Divulgar dentro do Weë ainda não está disponível. Quando estiver, paga-se com os teus Credits e vais vê-lo aqui.',
  promoteCredits: 'Ver os meus Credits',
  sampleProductName: 'Produto {{numero}}',
};
