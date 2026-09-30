/*
 * Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * QUÉ NO ENTRA AQUÍ: lo que representa al negocio de la persona —el nombre de
 * sus redes, sus arrobas, los títulos de sus publicaciones programadas y los
 * mensajes que le escriben sus clientes—. Eso es contenido, aunque hoy sea
 * simulado, y el día que sea real llegará del servidor sin pasar por el
 * traductor. Aquí solo están los rótulos que pone Weë.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const business = {
  mySocialAccounts: 'Mis redes sociales',
  manageAccounts: 'Gestionar cuentas',
  connected: 'Conectado',
  networkConnected: '{{red}} conectado',
  connectAnother: 'Conectar otra red',
  allConnected: 'Ya tienes todas tus redes conectadas.',
  simulatedConnection: 'Conexión simulada: Weë publicará y responderá de verdad cuando las redes habiliten sus permisos oficiales.',
  postCalendar: 'Calendario de publicaciones',
  seeFullCalendar: 'Ver calendario completo',
  calendarGoal: 'Ver y organizar mi calendario de publicaciones de la semana',
  scheduleGoal: 'Programar una publicación para el {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Mensajes de clientes',
  seeAllMessages: 'Ver todos',
  messagesGoal: 'Responder a los mensajes de mis clientes',
  reply: 'Responder',
  replied: 'Respondido',
  replyTo: 'Responder a {{nombre}}',
  repliedTo: 'Respondido a {{nombre}}',
  replyGoal: 'Responder a {{nombre}} en {{red}}: "{{mensaje}}"',
  resultsThisWeek: 'Resultados esta semana',
  statPosts: 'Publicaciones',
  statReach: 'Personas alcanzadas',
  statInteractions: 'Interacciones',
  statMessages: 'Mensajes recibidos',
  onTrack: 'Tu negocio va por buen camino',
  onTrackNote: 'Las interacciones aumentaron un 60% esta semana. ¡Sigue así!',
  seeDetailedAnalysis: 'Ver análisis detallado',
  analysisGoal: 'Analizar los resultados de mi negocio esta semana',
  shortcutIdeas: 'Ideas',
  shortcutIdeasGoal: 'Ideas y estrategia para hacer crecer mi negocio',
  shortcutMarketing: 'Marketing',
  shortcutMarketingGoal: 'Una campaña de marketing para mi negocio',
  shortcutSocial: 'Redes sociales',
  shortcutSocialGoal: 'Crear contenido para las redes de mi negocio',
  shortcutAnalyze: 'Analizar',
  shortcutAnalyzeGoal: 'Analizar los resultados de mi negocio',
  shortcutDocuments: 'Documentos',
  shortcutDocumentsGoal: 'Redactar un documento para mi negocio',
  shortcutSell: 'Vender más',
  shortcutSellGoal: 'Vender más este mes en mi negocio',
  shortcutCareer: 'Trabajo y carrera',
  shortcutCareerGoal: 'Mejorar mi CV y mi perfil profesional',
  yesterday: 'Ayer',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en los dos idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'Crea, administra, promociona y haz crecer tu negocio.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Construye y administra tu negocio',
  modProductsHint: 'Tus productos y sus precios',
  modCreateHint: 'Crea contenido con IA',
  modSocialHint: 'Prepara y comparte en todas partes',
  modAnalyzeHint: 'Entiende tu negocio',
  modGrowHint: 'Encuentra oportunidades y crece',
  modProfileHint: 'Tu negocio dentro de Weë',
  modPromoteHint: 'Llega a más personas con Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'Resumen de tu negocio',
  overviewEmpty: 'Todavía no has creado tu negocio.',
  overviewEmptyHint: 'Cuéntaselo a Weë con tus palabras —"vendo postres desde casa"— y te ayudo a darle forma.',
  createBusiness: 'Crear mi negocio',
  createBusinessGoal: 'Crear mi negocio desde cero: nombre, qué vendo, a quién y a qué precio',
  editBusiness: 'Editar mi negocio',
  editBusinessGoal: 'Revisar y mejorar la información de mi negocio',
  businessInfo: 'Información del negocio',
  businessInfoGoal: 'Ordenar la información de mi negocio: qué vendo, a quién y qué me diferencia',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Escribir el plan de negocio para presentar mi negocio a un inversor',
  businessCoach: 'Business Coach',
  businessCoachGoal: '¿Qué debería hacer esta semana en mi negocio?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Todavía no has añadido productos.',
  productsEmptyHint: 'Sube una foto y Weë escribe el nombre, la descripción y el texto para venderlo.',
  addProduct: 'Añadir producto',
  addProductGoal: 'Crear la ficha de un producto: nombre, descripción, características y texto para venderlo',
  improveImage: 'Mejorar la foto',
  improveImageGoal: 'Mejorar la foto de mi producto para venderlo mejor',
  productsCount_one: '{{contador}} producto',
  productsCount_other: '{{contador}} productos',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Pon lo que te cuesta y Weë te da un precio de referencia.',
  pricingMaterials: 'Materiales',
  pricingPackaging: 'Empaque',
  pricingDelivery: 'Envío',
  pricingOther: 'Otros costes',
  pricingMargin: 'Margen que quieres',
  pricingCost: 'Coste estimado',
  pricingSuggested: 'Precio sugerido',
  pricingMarginResult: 'Margen estimado',
  pricingProfit: 'Ganancia estimada',
  pricingNote: 'Los precios son una referencia informativa y no son asesoría contable ni fiscal.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Lo que hace que tu contenido se vea siempre tuyo.',
  brandLogo: 'Logo',
  brandColors: 'Colores',
  brandTypography: 'Tipografía',
  brandStyle: 'Estilo visual',
  brandAvatar: 'Imagen de perfil',
  brandCover: 'Portada',
  brandTemplates: 'Plantillas de contenido',
  brandGoal: 'Crear {{que}} para la marca de mi negocio',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Cuéntame qué quieres promocionar y lo preparo.',
  createPlaceholder: 'Ejemplo: Quiero promocionar esta torta para el Día de la Madre…',
  createTypes: '¿Qué quieres crear?',
  typeImage: 'Imagen',
  typeImageHint: 'Una imagen para promocionar',
  typeVideo: 'Video',
  typeVideoHint: 'Un video corto',
  typePost: 'Publicación',
  typePostHint: 'Lista para publicar',
  typeCampaign: 'Campaña',
  typeCampaignHint: 'Varias piezas a la vez',
  typeCopy: 'Textos',
  typeCopyHint: 'Descripción, hashtags y llamada a la acción',
  typeGoal: 'Crear {{que}} para mi negocio: {{idea}}',
  formats: 'Elige tu formato',
  formatsHint: 'Weë se encarga del tamaño. Tú eliges dónde va.',
  formatTikTok: 'TikTok',
  /* "Video de Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Video de Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'Video horizontal',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Cuéntamelo con tus palabras y me encargo.',
  askPlaceholder: 'Escribe aquí lo tuyo…',
  askSend: 'Preguntar a Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Crear contenido',
  goalWithProduct: '{{idea}} — producto: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Créalo una vez. Compártelo en todas partes.',
  share: 'Compartir',
  shareHint: 'Se abre el compartir de tu teléfono: elige la app que quieras.',
  shareToWee: 'Compartir en Weë',
  shareWall: 'Mi Wäll',
  shareCommunities: 'Comunidades',
  shareProfile: 'Business Profile',
  shareNothing: 'Primero crea algo y luego lo compartes desde aquí.',
  shareText: 'Creado con Weë Business',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Subir mis datos',
  analyzeUploadHint: 'Excel, CSV o PDF con tus ventas y gastos.',
  analyzeUploadGoal: 'Analizar el archivo de ventas y gastos de mi negocio',
  analyzeInsights: 'Lo que veo en tus números',
  analyzeInsightsGoal: 'Explicarme qué está pasando con las ventas de mi negocio',
  expenses: 'Gastos',
  expensesHint: 'Apunta en qué se te va el dinero.',
  expensesEmpty: 'Todavía no has apuntado gastos.',
  addExpense: 'Añadir gasto',
  expenseSupplies: 'Insumos',
  expenseMarketing: 'Marketing',
  expenseDelivery: 'Envíos',
  expenseStaff: 'Personal',
  expenseServices: 'Servicios',
  expenseOther: 'Otros',
  expensesAsk: '¿En qué estoy gastando de más?',
  expensesAskGoal: 'Revisar mis gastos y decirme en qué estoy gastando de más',
  swot: 'SWOT',
  swotHint: 'Fortalezas, debilidades, oportunidades y amenazas.',
  swotGoal: 'Hacer el análisis SWOT de mi negocio',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Ayúdame a crecer',
  helpMeGrowHint: 'Weë mira tu negocio y te propone qué hacer.',
  helpMeGrowGoal: 'Un plan para hacer crecer mi negocio, con pasos concretos',
  opportunities: 'Oportunidades',
  opportunitiesEmpty: 'Cuando tengas ventas y contenido, aquí aparecerán las oportunidades que vea.',
  createPromotion: 'Crear la promoción',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'A quién le vendes y qué necesita.',
  customerInsightsGoal: 'Describir a mi cliente ideal y qué mensajes le funcionan',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Qué más podrías vender o cómo diferenciarte.',
  businessIdeasGoal: 'Darme ideas para mi negocio y para diferenciarme',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Tu negocio todavía no tiene página en Weë.',
  profileEmptyHint: 'Cuando crees tu negocio, aquí vivirá su página: quién eres, qué vendes y cómo te contactan.',
  profileAbout: 'Acerca de',
  profileProducts: 'Productos',
  profilePosts: 'Publicaciones',
  profileContact: 'Contacto',
  reviews: 'Reseñas',
  reviewsHint: 'Qué dicen tus clientes y qué mejorar.',
  reviewsGoal: 'Analizar las reseñas de mi negocio y decirme qué mejorar',
  reviewsRespond: 'Escribir una respuesta',
  reviewsRespondGoal: 'Escribir una respuesta profesional a una reseña de mi negocio',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Llega a más personas con Weë Credits',
  promoteHint: 'Tu contenido se enseña a más gente dentro de Weë. Antes de gastar nada verás cuánto cuesta.',
  promoteSoon: 'Promocionar dentro de Weë todavía no está abierto. Cuando lo esté, se pagará con tus Credits y lo verás aquí.',
  promoteCredits: 'Ver mis Credits',
  sampleProductName: 'Producto {{numero}}',
};
