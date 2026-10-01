/*
 * SUECO — Weë Business: la pantalla del negocio, sus ocho módulos y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Lo que representa al negocio de la
 * persona —nombres de cuentas, arrobas, títulos de publicaciones y mensajes de sus clientes— no pasa por aquí.
 *
 * «Negocio» es «företag», como la Företagsprofil de Google y la cuenta de empresa de Instagram, y vale igual para
 * quien vende postres desde casa; «cliente» es «kund»; conectar una red es «ansluta» un «konto». Los nombres de los
 * ocho módulos (My Business, Products & Catalog…) son de producto, viven en `constants/businessModules.ts` y no
 * pasan por el traductor; por eso «Business Profile» se queda igual cuando es un destino para compartir: es el
 * nombre que la persona ve en la tarjeta del módulo. Los NOMBRES de las funciones de dentro —Business Plan,
 * Business Coach, Pricing Assistant, Brand Kit, Customer Insights, Business Ideas— también son de producto y se
 * escriben igual en todos los idiomas, como Weë Studio (decisión del usuario, 2026-09-16); lo que hace cada una sí se
 * traduce, en su pista. «SWOT» se queda como sigla: «SWOT-analys».
 *
 * Los «…Goal» son lo que la persona le pide a Weë Brain: aparecen como su propio mensaje en la conversación y acaban
 * siendo el título del trabajo. En sueco se piden en imperativo y en primera persona («Analysera mitt företags
 * resultat»), y lo que Weë no puede hacer por la persona se pide como ayuda («Hjälp mig att sälja mer…»). Los que
 * reciben el nombre de una pieza o de un tipo («Logotyp», «Bild») EMPIEZAN por él —«{{que}} för mitt företags
 * varumärke»— para no dejar una mayúscula en mitad de la frase.
 *
 * El día va delante de la fecha, como lo escribe `Intl` en sueco: «ons 30 sep.». El porcentaje, con espacio fijo:
 * «60 %». Las comillas, ”…”, y el inciso, con raya media. Las reseñas son «recensioner», como en Weë Biz, Google
 * Maps y la App Store, y no «kommentarer», que en Weë son los comentarios. El gasto «Servicios» es el de luz, agua e
 * internet (su icono es un rayo): «Räkningar», distinto a propósito de los «Tjänster» del directorio de Weë Biz, que
 * son otra cosa; y «Personal», «Löner», que es como se apunta ese gasto. Los formatos de destino se dicen como los
 * dice quien publica en sueco —«Instagram-inlägg», «Instagram-story»—, con el guion de marca + sustantivo de la
 * guía; y «Video de Instagram», nunca «Reels».
 */
export const business: typeof import('../es/business').business = {
  mySocialAccounts: 'Mina sociala medier',
  manageAccounts: 'Hantera konton',
  connected: 'Ansluten',
  networkConnected: 'Ansluten till {{red}}',
  connectAnother: 'Anslut ett konto till',
  allConnected: 'Alla dina konton är redan anslutna.',
  simulatedConnection: 'Simulerad anslutning: Weë varken publicerar eller svarar åt dig än. I stället gör Weë allt klart så att du kan granska och publicera det.',
  postCalendar: 'Publiceringskalender',
  seeFullCalendar: 'Visa hela kalendern',
  calendarGoal: 'Visa och organisera min publiceringskalender för veckan',
  scheduleGoal: 'Schemalägg ett inlägg till {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'Kundmeddelanden',
  seeAllMessages: 'Visa alla',
  messagesGoal: 'Svara på mina kunders meddelanden',
  reply: 'Svara',
  replied: 'Besvarat',
  replyTo: 'Svara {{nombre}}',
  repliedTo: 'Du har svarat {{nombre}}',
  replyGoal: 'Svara {{nombre}} på {{red}}: ”{{mensaje}}”',
  resultsThisWeek: 'Veckans resultat',
  statPosts: 'Inlägg',
  statReach: 'Nådda personer',
  statInteractions: 'Interaktioner',
  statMessages: 'Mottagna meddelanden',
  onTrack: 'Ditt företag är på rätt väg',
  onTrackNote: 'Interaktionerna ökade med 60 % den här veckan. Fortsätt så!',
  seeDetailedAnalysis: 'Visa detaljerad analys',
  analysisGoal: 'Analysera mitt företags resultat den här veckan',
  shortcutIdeas: 'Idéer',
  shortcutIdeasGoal: 'Idéer och strategi för att få mitt företag att växa',
  shortcutMarketing: 'Marknadsföring',
  shortcutMarketingGoal: 'En marknadsföringskampanj för mitt företag',
  shortcutSocial: 'Sociala medier',
  shortcutSocialGoal: 'Skapa innehåll till mitt företags sociala medier',
  shortcutAnalyze: 'Analysera',
  shortcutAnalyzeGoal: 'Analysera mitt företags resultat',
  shortcutDocuments: 'Dokument',
  shortcutDocumentsGoal: 'Skriv ett dokument för mitt företag',
  shortcutSell: 'Sälj mer',
  shortcutSellGoal: 'Hjälp mig att sälja mer i mitt företag den här månaden',
  shortcutCareer: 'Jobb och karriär',
  shortcutCareerGoal: 'Förbättra mitt cv och min yrkesprofil',
  yesterday: 'I går',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════ */
  slogan: 'Skapa, driv, marknadsför och utveckla ditt företag.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'Bygg upp och driv ditt företag',
  modProductsHint: 'Dina produkter och priser',
  modCreateHint: 'Skapa innehåll med AI',
  modSocialHint: 'Förbered och dela överallt',
  modAnalyzeHint: 'Förstå ditt företag',
  modGrowHint: 'Hitta möjligheter att växa',
  modProfileHint: 'Ditt företag på Weë',
  modPromoteHint: 'Nå ut till fler med Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* «Översikt» y no «Ditt företag»: «Tu negocio» es el nombre de una de las cuentas de muestra. */
  overview: 'Översikt över ditt företag',
  overviewEmpty: 'Du har inte skapat ditt företag ännu.',
  overviewEmptyHint: 'Berätta för Weë med egna ord – ”jag säljer desserter hemifrån” – så hjälper jag dig att forma det.',
  createBusiness: 'Skapa mitt företag',
  createBusinessGoal: 'Skapa mitt företag från grunden: namn, vad jag säljer, till vem och till vilket pris',
  editBusiness: 'Redigera mitt företag',
  editBusinessGoal: 'Gå igenom och förbättra informationen om mitt företag',
  businessInfo: 'Företagsinformation',
  businessInfoGoal: 'Strukturera informationen om mitt företag: vad jag säljer, till vem och vad som skiljer mig från andra',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'Skriv en affärsplan så att jag kan presentera mitt företag för en investerare',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'Vad borde jag göra i mitt företag den här veckan?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'Du har inte lagt till några produkter ännu.',
  productsEmptyHint: 'Ladda upp ett foto så skriver Weë namnet, beskrivningen och säljtexten.',
  addProduct: 'Lägg till produkt',
  addProductGoal: 'Skapa en produktsida: namn, beskrivning, egenskaper och säljtext',
  improveImage: 'Förbättra fotot',
  improveImageGoal: 'Förbättra fotot av min produkt så att den säljer bättre',
  productsCount_one: '{{contador}} produkt',
  productsCount_other: '{{contador}} produkter',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'Fyll i vad det kostar dig så ger Weë dig ett riktpris.',
  pricingMaterials: 'Material',
  pricingPackaging: 'Förpackning',
  pricingDelivery: 'Frakt',
  pricingOther: 'Övriga kostnader',
  pricingMargin: 'Önskad marginal',
  pricingCost: 'Uppskattad kostnad',
  pricingSuggested: 'Föreslaget pris',
  pricingMarginResult: 'Uppskattad marginal',
  pricingProfit: 'Uppskattad vinst',
  pricingNote: 'Priserna är bara en vägledning, inte redovisnings- eller skatterådgivning.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'Det som gör att ditt innehåll alltid ser ut som ditt.',
  brandLogo: 'Logotyp',
  brandColors: 'Färger',
  brandTypography: 'Typografi',
  brandStyle: 'Visuell stil',
  brandAvatar: 'Profilbild',
  brandCover: 'Omslagsbild',
  brandTemplates: 'Innehållsmallar',
  brandGoal: '{{que}} för mitt företags varumärke',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'Berätta vad du vill marknadsföra, så tar jag fram det.',
  createPlaceholder: 'Exempel: Jag vill marknadsföra den här tårtan till Mors dag…',
  createTypes: 'Vad vill du skapa?',
  typeImage: 'Bild',
  typeImageHint: 'En bild för marknadsföring',
  typeVideo: 'Video',
  typeVideoHint: 'En kort video',
  typePost: 'Inlägg',
  typePostHint: 'Redo att publicera',
  typeCampaign: 'Kampanj',
  typeCampaignHint: 'Flera delar på en gång',
  typeCopy: 'Texter',
  typeCopyHint: 'Beskrivning, hashtaggar och uppmaning till handling',
  typeGoal: '{{que}} för mitt företag: {{idea}}',
  formats: 'Välj format',
  formatsHint: 'Weë ordnar storleken. Du väljer var det ska synas.',
  formatTikTok: 'TikTok',
  /* «Instagram-video» y no «Reel»: en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'Instagram-video',
  formatStory: 'Instagram-story',
  formatFacebookStory: 'Facebook-story',
  formatPost: 'Instagram-inlägg',
  formatFeed: 'Facebook-inlägg',
  formatWide: 'Liggande video',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'Berätta med egna ord, så tar jag hand om det.',
  askPlaceholder: 'Skriv här…',
  askSend: 'Fråga Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'Skapa innehåll',
  goalWithProduct: '{{idea}} – produkt: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'Skapa en gång. Dela överallt.',
  share: 'Dela',
  shareHint: 'Telefonens delningsmeny öppnas: välj den app du vill.',
  shareToWee: 'Dela på Weë',
  shareWall: 'Min Wäll',
  shareCommunities: 'Communities',
  shareProfile: 'Business Profile',
  shareNothing: 'Skapa något först, sedan kan du dela det härifrån.',
  shareText: 'Skapat med Weë Business',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'Ladda upp data',
  analyzeUploadHint: 'Excel, CSV eller PDF med försäljning och utgifter.',
  analyzeUploadGoal: 'Analysera filen med mitt företags försäljning och utgifter',
  analyzeInsights: 'Det jag ser i dina siffror',
  analyzeInsightsGoal: 'Förklara vad som händer med försäljningen i mitt företag',
  expenses: 'Utgifter',
  expensesHint: 'Skriv upp vad pengarna går till.',
  expensesEmpty: 'Du har inte lagt till några utgifter ännu.',
  addExpense: 'Lägg till utgift',
  expenseSupplies: 'Material',
  expenseMarketing: 'Marknadsföring',
  expenseDelivery: 'Frakt',
  expenseStaff: 'Löner',
  expenseServices: 'Räkningar',
  expenseOther: 'Övrigt',
  expensesAsk: 'Vad lägger jag för mycket pengar på?',
  expensesAskGoal: 'Gå igenom mina utgifter och säg vad jag lägger för mycket pengar på',
  swot: 'SWOT-analys',
  swotHint: 'Styrkor, svagheter, möjligheter och hot.',
  swotGoal: 'Gör en SWOT-analys av mitt företag',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'Hjälp mig att växa',
  helpMeGrowHint: 'Weë tittar på ditt företag och föreslår vad du kan göra.',
  helpMeGrowGoal: 'En plan för att få mitt företag att växa, med konkreta steg',
  opportunities: 'Möjligheter',
  opportunitiesEmpty: 'När du har försäljning och innehåll visar jag här vilka möjligheter jag ser.',
  createPromotion: 'Skapa kampanjen',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'Vem du säljer till och vad kunderna behöver.',
  customerInsightsGoal: 'Beskriv min idealkund och vilka budskap som når fram',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'Vad mer du kan sälja eller hur du sticker ut.',
  businessIdeasGoal: 'Ge mig idéer för mitt företag och för hur jag kan sticka ut',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'Ditt företag har ingen sida på Weë ännu.',
  profileEmptyHint: 'När du skapar ditt företag får det sin sida här: vem du är, vad du säljer och hur kunderna når dig.',
  profileAbout: 'Om',
  profileProducts: 'Produkter',
  profilePosts: 'Inlägg',
  profileContact: 'Kontakt',
  reviews: 'Recensioner',
  reviewsHint: 'Vad kunderna säger och vad du kan förbättra.',
  reviewsGoal: 'Analysera recensionerna av mitt företag och säg vad jag kan förbättra',
  reviewsRespond: 'Skriv ett svar',
  reviewsRespondGoal: 'Skriv ett professionellt svar på en recension av mitt företag',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'Nå ut till fler med Weë Credits',
  promoteHint: 'Ditt innehåll visas för fler på Weë. Du ser vad det kostar innan du betalar något.',
  promoteSoon: 'Marknadsföring på Weë har inte öppnat ännu. När den gör det betalar du med dina Credits, och du hittar den här.',
  promoteCredits: 'Visa mina Credits',
  sampleProductName: 'Produkt {{numero}}',
};
