/*
 * HEBREO — Weë Business: la pantalla del negocio y las etiquetas de sus datos de muestra.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Donde el español declara
 * `_one`/`_other`, aquí hay además la forma dual `_two` (`ConPlurales`).
 *
 * Decisiones: botones como sustantivo de acción («הוספת מוצר», «שיתוף», «מענה»); los objetivos que viajan a Weë Brain
 * («…Goal») van en infinitivo, como el español («לנתח את תוצאות העסק שלי»). Lo que en español lleva verbo en primera
 * persona con género («qué vendo», «estoy gastando») se vuelve impersonal («מה מוכרים», «איפה ההוצאות גבוהות מדי»).
 * Cuando Weë necesita un verbo propio se conjuga en masculino singular («Weë כותב», «Weë דואג»); donde el español
 * habla en primera persona («lo preparo», «me encargo») se usa el plural del equipo («עלינו»). Los nombres de
 * producto que el español deja en inglés (Business Plan, Brand Kit, Pricing Assistant, SWOT, Instagram Story…) se
 * quedan igual; «Video de Instagram» es «סרטון Instagram» (ni «Reel» ni «רילס»). «Margen» es «מרווח» y «ganancia»,
 * «רווח». La portada de la página es «תמונת נושא», como en las redes en hebreo.
 */
import { ConPlurales } from './plurales';

export const business: ConPlurales<typeof import('../es/business').business> = {
  mySocialAccounts: 'הרשתות החברתיות שלי',
  manageAccounts: 'ניהול חשבונות',
  connected: 'מחובר',
  networkConnected: '{{red}} מחובר',
  connectAnother: 'חיבור רשת נוספת',
  allConnected: 'כל הרשתות שלך כבר מחוברות.',
  simulatedConnection: 'חיבור מדומה: Weë עדיין לא מפרסם ולא עונה במקומך. כל פריט מוכן לבדיקה ולפרסום על ידך.',
  postCalendar: 'לוח הפרסומים',
  seeFullCalendar: 'הצגת הלוח המלא',
  calendarGoal: 'להציג ולסדר את לוח הפרסומים שלי לשבוע',
  scheduleGoal: 'לתזמן פוסט ליום {{dia}} {{fecha}}: {{publicacion}}',
  dayLabel: '{{dia}} {{fecha}}',
  customerMessages: 'הודעות מלקוחות',
  seeAllMessages: 'הצגת הכול',
  messagesGoal: 'לענות להודעות של הלקוחות שלי',
  reply: 'מענה',
  replied: 'נענה',
  replyTo: 'מענה ל-{{nombre}}',
  repliedTo: 'נענה ל-{{nombre}}',
  replyGoal: 'לענות ל-{{nombre}} ב-{{red}}: "{{mensaje}}"',
  resultsThisWeek: 'התוצאות השבוע',
  statPosts: 'פוסטים',
  statReach: 'אנשים שנחשפו',
  statInteractions: 'אינטראקציות',
  statMessages: 'הודעות שהתקבלו',
  onTrack: 'העסק שלך בדרך הנכונה',
  onTrackNote: 'האינטראקציות עלו ב-60% השבוע. ככה ממשיכים!',
  seeDetailedAnalysis: 'הצגת ניתוח מפורט',
  analysisGoal: 'לנתח את תוצאות העסק שלי השבוע',
  shortcutIdeas: 'רעיונות',
  shortcutIdeasGoal: 'רעיונות ואסטרטגיה להצמחת העסק שלי',
  shortcutMarketing: 'שיווק',
  shortcutMarketingGoal: 'קמפיין שיווקי לעסק שלי',
  shortcutSocial: 'רשתות חברתיות',
  shortcutSocialGoal: 'ליצור תוכן לרשתות של העסק שלי',
  shortcutAnalyze: 'ניתוח',
  shortcutAnalyzeGoal: 'לנתח את תוצאות העסק שלי',
  shortcutDocuments: 'מסמכים',
  shortcutDocumentsGoal: 'לנסח מסמך לעסק שלי',
  shortcutSell: 'למכור יותר',
  shortcutSellGoal: 'למכור יותר החודש בעסק שלי',
  shortcutCareer: 'עבודה וקריירה',
  shortcutCareerGoal: 'לשפר את קורות החיים ואת הפרופיל המקצועי שלי',
  yesterday: 'אתמול',

  /* ══ LOS OCHO MÓDULOS (2026-09-16) ══════════════════════════════════════
   *
   * Los NOMBRES de los módulos —My Business, Products & Catalog, Create,
   * Social, Analyze, Grow, Business Profile, Promote— no están aquí: son
   * nombres de producto y se escriben igual en todos los idiomas, como Weë Studio
   * o Weë Writer. Viven en `constants/businessModules.ts`. Lo que sí se traduce
   * es todo lo demás: lo que hace cada uno, sus acciones y sus avisos.
   */
  slogan: 'אופנה, סטייל, יופי ויצירת תוכן ויזואלי.',

  /* Qué hace cada módulo, en una línea. */
  modMyBusinessHint: 'בנייה וניהול של העסק שלך',
  modProductsHint: 'המוצרים שלך והמחירים שלהם',
  modCreateHint: 'יצירת תוכן עם AI',
  modSocialHint: 'הכנה ושיתוף בכל מקום',
  modAnalyzeHint: 'להבין את העסק שלך',
  modGrowHint: 'למצוא הזדמנויות ולצמוח',
  modProfileHint: 'העסק שלך בתוך Weë',
  modPromoteHint: 'להגיע ליותר אנשים עם Weë',

  /* ── My Business ──────────────────────────────────────────────────────── */
  /* "Resumen" y no "Tu negocio": ese es el nombre de una de las cuentas de muestra. */
  overview: 'סקירת העסק שלך',
  overviewEmpty: 'עדיין לא יצרת את העסק שלך.',
  overviewEmptyHint: 'אפשר לספר ל-Weë במילים שלך — "אני מוכר/ת קינוחים מהבית" — וביחד ניתן לזה צורה.',
  createBusiness: 'יצירת העסק שלי',
  createBusinessGoal: 'ליצור את העסק שלי מאפס: שם, מה מוכרים, למי ובאיזה מחיר',
  editBusiness: 'עריכת העסק שלי',
  editBusinessGoal: 'לבדוק ולשפר את פרטי העסק שלי',
  businessInfo: 'פרטי העסק',
  businessInfoGoal: 'לסדר את פרטי העסק שלי: מה מוכרים, למי ומה מייחד אותי',
  businessPlan: 'Business Plan',
  businessPlanGoal: 'לכתוב תוכנית עסקית כדי להציג את העסק שלי למשקיע',
  businessCoach: 'Business Coach',
  businessCoachGoal: 'מה כדאי לעשות השבוע בעסק שלי?',

  /* ── Products & Catalog ───────────────────────────────────────────────── */
  productsEmpty: 'עדיין לא נוספו מוצרים.',
  productsEmptyHint: 'מעלים תמונה, ו-Weë כותב את השם, התיאור והטקסט למכירה.',
  addProduct: 'הוספת מוצר',
  addProductGoal: 'ליצור כרטיס מוצר: שם, תיאור, מאפיינים וטקסט למכירה',
  improveImage: 'שיפור התמונה',
  improveImageGoal: 'לשפר את תמונת המוצר שלי כדי למכור אותו טוב יותר',
  productsCount_one: 'מוצר אחד',
  productsCount_two: 'שני מוצרים',
  productsCount_other: '{{contador}} מוצרים',

  /* Pricing Assistant */
  pricing: 'Pricing Assistant',
  pricingHint: 'מזינים את העלויות, ו-Weë מציע מחיר לייחוס.',
  pricingMaterials: 'חומרים',
  pricingPackaging: 'אריזה',
  pricingDelivery: 'משלוח',
  pricingOther: 'עלויות אחרות',
  pricingMargin: 'המרווח הרצוי',
  pricingCost: 'עלות משוערת',
  pricingSuggested: 'מחיר מוצע',
  pricingMarginResult: 'מרווח משוער',
  pricingProfit: 'רווח משוער',
  pricingNote: 'המחירים הם ייחוס אינפורמטיבי בלבד ואינם ייעוץ חשבונאי או ייעוץ מס.',

  /* Brand Kit */
  brandKit: 'Brand Kit',
  brandKitHint: 'מה שגורם לתוכן שלך להיראות תמיד שלך.',
  brandLogo: 'לוגו',
  brandColors: 'צבעים',
  brandTypography: 'טיפוגרפיה',
  brandStyle: 'סגנון ויזואלי',
  brandAvatar: 'תמונת פרופיל',
  brandCover: 'תמונת נושא',
  brandTemplates: 'תבניות תוכן',
  brandGoal: 'ליצור {{que}} למותג של העסק שלי',

  /* ── Create ───────────────────────────────────────────────────────────── */
  createInvite: 'אפשר לספר מה רוצים לקדם, וההכנה כבר עלינו.',
  createPlaceholder: 'לדוגמה: אני רוצה לקדם את העוגה הזאת ליום האם…',
  createTypes: 'מה רוצים ליצור?',
  typeImage: 'תמונה',
  typeImageHint: 'תמונה לקידום',
  typeVideo: 'וידאו',
  typeVideoHint: 'סרטון קצר',
  typePost: 'פוסט',
  typePostHint: 'מוכן לפרסום',
  typeCampaign: 'קמפיין',
  typeCampaignHint: 'כמה פריטים בבת אחת',
  typeCopy: 'טקסטים',
  typeCopyHint: 'תיאור, האשטגים וקריאה לפעולה',
  typeGoal: 'ליצור {{que}} לעסק שלי: {{idea}}',
  formats: 'בחירת פורמט',
  formatsHint: 'Weë דואג לגודל. ההחלטה לאן זה הולך היא שלך.',
  formatTikTok: 'TikTok',
  /* "Video de Instagram" y no "Reel": en Weë los videos cortos son Weëls y esa palabra no asoma a la interfaz (CLAUDE.md). El id interno sigue siendo 'reel'. */
  formatReel: 'סרטון Instagram',
  formatStory: 'Instagram Story',
  formatFacebookStory: 'Facebook Story',
  formatPost: 'Instagram Post',
  formatFeed: 'Facebook',
  formatWide: 'סרטון לרוחב',

  /*
   * Cuando una función se entra HABLANDO: la misma caja de Weë AI dentro del
   * módulo, con su pregunta puesta. Si no se escribe nada, va la pregunta sola.
   */
  askInvite: 'אפשר לספר במילים שלך, והשאר עלינו.',
  askPlaceholder: 'אפשר לכתוב כאן…',
  askSend: 'לשאול את Weë',

  /* El producto que viaja con la petición, cuando se entra desde su ficha. */
  productCreate: 'יצירת תוכן',
  goalWithProduct: '{{idea}} — מוצר: {{producto}}',

  /* ── Social ───────────────────────────────────────────────────────────── */
  socialIdea: 'יוצרים פעם אחת. משתפים בכל מקום.',
  share: 'שיתוף',
  shareHint: 'ייפתח חלון השיתוף של הטלפון: בוחרים את האפליקציה שרוצים.',
  shareToWee: 'שיתוף ב-Weë',
  shareWall: 'ה-Wäll שלי',
  shareCommunities: 'קהילות',
  shareProfile: 'Business Profile',
  shareNothing: 'קודם יוצרים משהו, ואחר כך משתפים אותו מכאן.',
  shareText: 'נוצר עם Weë Fashion',

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  analyzeUpload: 'העלאת הנתונים שלי',
  analyzeUploadHint: 'Excel, CSV או PDF עם המכירות וההוצאות שלך.',
  analyzeUploadGoal: 'לנתח את קובץ המכירות וההוצאות של העסק שלי',
  analyzeInsights: 'מה שעולה מהמספרים שלך',
  analyzeInsightsGoal: 'להסביר לי מה קורה עם המכירות של העסק שלי',
  expenses: 'הוצאות',
  expensesHint: 'רושמים לאן הולך הכסף.',
  expensesEmpty: 'עדיין לא נרשמו הוצאות.',
  addExpense: 'הוספת הוצאה',
  expenseSupplies: 'חומרי גלם',
  expenseMarketing: 'שיווק',
  expenseDelivery: 'משלוחים',
  expenseStaff: 'כוח אדם',
  expenseServices: 'שירותים',
  expenseOther: 'אחר',
  expensesAsk: 'איפה ההוצאות שלי גבוהות מדי?',
  expensesAskGoal: 'לבדוק את ההוצאות שלי ולומר לי איפה הן גבוהות מדי',
  swot: 'SWOT',
  swotHint: 'חוזקות, חולשות, הזדמנויות ואיומים.',
  swotGoal: 'לערוך ניתוח SWOT לעסק שלי',

  /* ── Grow ─────────────────────────────────────────────────────────────── */
  helpMeGrow: 'לעזור לי לצמוח',
  helpMeGrowHint: 'Weë מסתכל על העסק שלך ומציע מה לעשות.',
  helpMeGrowGoal: 'תוכנית להצמחת העסק שלי, עם צעדים מעשיים',
  opportunities: 'הזדמנויות',
  opportunitiesEmpty: 'כשיהיו מכירות ותוכן, ההזדמנויות שיזוהו יופיעו כאן.',
  createPromotion: 'יצירת המבצע',
  customerInsights: 'Customer Insights',
  customerInsightsHint: 'למי מוכרים ומה הם צריכים.',
  customerInsightsGoal: 'לתאר את הלקוח האידיאלי שלי ואילו מסרים עובדים עליו',
  businessIdeas: 'Business Ideas',
  businessIdeasHint: 'מה עוד אפשר למכור או איך להתבלט.',
  businessIdeasGoal: 'לתת לי רעיונות לעסק שלי ולדרכים להתבלט',

  /* ── Business Profile ─────────────────────────────────────────────────── */
  profileEmpty: 'לעסק שלך עדיין אין דף ב-Weë.',
  profileEmptyHint: 'כשהעסק ייווצר, כאן יהיה הדף שלו: מי עומד מאחוריו, מה מוכרים ואיך יוצרים קשר.',
  profileAbout: 'אודות',
  profileProducts: 'מוצרים',
  profilePosts: 'פוסטים',
  profileContact: 'יצירת קשר',
  reviews: 'ביקורות',
  reviewsHint: 'מה הלקוחות אומרים ומה כדאי לשפר.',
  reviewsGoal: 'לנתח את הביקורות על העסק שלי ולומר לי מה לשפר',
  reviewsRespond: 'כתיבת תגובה',
  reviewsRespondGoal: 'לכתוב תגובה מקצועית לביקורת על העסק שלי',

  /* ── Promote ──────────────────────────────────────────────────────────── */
  promoteTitle: 'להגיע ליותר אנשים עם Weë Credits',
  promoteHint: 'התוכן שלך מוצג ליותר אנשים בתוך Weë. לפני שמוציאים משהו, המחיר מוצג.',
  promoteSoon: 'קידום בתוך Weë עדיין לא פתוח. כשייפתח, התשלום יהיה ב-Credits שלך והוא יופיע כאן.',
  promoteCredits: 'הצגת ה-Credits שלי',
  sampleProductName: 'מוצר {{numero}}',
};
