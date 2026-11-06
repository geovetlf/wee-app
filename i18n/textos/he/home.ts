/*
 * HEBREO — el Home: saludo, compositor, filtros, las filas de arriba y la
 * descripción de cada comunidad de la portada.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: el saludo es «שלום, {{nombre}}». Los imperativos con género del
 * español («Muestra tu proceso», «Sé el primero») se vuelven impersonales
 * («כאן מראים את התהליך», «הפוסט הראשון יכול להיות שלך»); «שלך», «עליך» y las
 * segundas personas del pasado («יצרת») se leen igual para los dos géneros sin
 * niqud, y por eso se usan. «IA» suelto es «AI»; «Inteligencia Artificial»
 * escrita entera es «בינה מלאכותית». Préstamos de redes: יוטיוברים, טיקטוקרים,
 * אינסטגרמרים, ממים, אאוטפיטים, גאדג׳טים (geresh), סטארט-אפים. Las cifras de
 * las tarjetas llevan el número por delante en las tres formas («{{cantidad}} לייק»,
 * «{{cantidad}} לייקים») porque el hueco es `{{cantidad}}`, no `{{contador}}`, y
 * la pantalla lo espera; `_two` se declara igual para que el dual no caiga en
 * `_other` por accidente. El «→» de «Ver todos» se conserva: la base aún se
 * renderiza en LTR (guía § 7); el día que se active RTL habrá que mirarlo.
 */
import { ConPlurales } from './plurales';

export const home: ConPlurales<typeof import('../es/home').home> = {
  greeting: 'שלום, {{nombre}}',
  greetingGuest: 'שלום',
  composerPlaceholder: 'מה בא לך לשתף?',
  seeAll: 'הצגת הכול ←',
  createWeel: 'יצירת Weël',
  openMenu: 'פתיחת התפריט',
  search: 'חיפוש',
  logoHome: 'Weë, חזרה לראש הדף',
  filterBy: 'סינון: {{nombre}}',
  filterAll: 'הכול',
  bannerOf: 'באנר {{numero}} מתוך {{total}}',
  weelSample: 'דוגמה ל-Weël: {{titulo}}',
  exploreCommunities: 'גילוי קהילות',
  moreCategories: 'עוד קטגוריות',
  popularCommunities: 'קהילות פופולריות',
  seeAllOf: 'הצגת הכול',
  topicOfTheDay: 'נושא היום',
  heatedDebate: 'דיון סוער',
  featuredOpinion: 'דעה נבחרת',
  featured: 'נבחרים',
  allCommunities: 'הכול',
  postsLoadFailed: 'שגיאה בטעינת הפוסטים',
  searchHint: 'פתיחת החיפוש: אנשים, האשטגים ופוסטים',
  featuredItem: 'נבחר',
  communityDescFilmAnimation: 'קולנוע, סרטים קצרים, אנימציה ודמויות שנוצרו עם AI. כאן מראים את התהליך ולומדים מזה של אחרים.',
  communityDescArtCreativity: 'אמנות דיגיטלית, איור, צילום ועיצוב בעזרת AI. שיתוף של פרומפטים, סגנונות ותוצאות.',
  communityDescCreatorsInfluencers: 'יוצרי תוכן, יוטיוברים, טיקטוקרים ואינסטגרמרים שיוצרים עם AI.',
  communityDescBusinessEntrepreneurship: 'יזמים, סטארט-אפים, שיווק והזדמנויות עסקיות עם AI.',
  communityDescTechAi: 'חדשות, מודלים, כלים ודיונים על בינה מלאכותית.',
  communityDescGamingVirtualWorlds: 'משחקי וידאו, דמויות, עולמות וירטואליים וחוויות דיגיטליות שנוצרו עם AI.',
  communityDescEducationLearning: 'סטודנטים, מורים וחוקרים שמשתמשים ב-AI כדי ללמוד וללמד.',
  communityDescFutureSociety: 'עתיד העבודה, המקצועות והחברה בעידן ה-AI. דיון פתוח.',
  communityDescNews: 'מה שקורה בעולם, כפי שהקהילה מספרת אותו. דיונים, ניתוחים ודעות בזמן אמת.',
  communityDescMarketplace: 'קנייה, מכירה והחלפה של מוצרים ושירותים עם הקהילה.',
  communityDescRelationshipsLove: 'סיפורים, עצות וחוויות על מערכות יחסים, דייטים וכל מה שקשור לאהבה.',
  communityDescFinanceMoney: 'טיפים לחיסכון, השקעות וכל מה שצריך כדי לנהל כסף בחוכמה.',
  communityDescWork: 'חוויות מהעבודה, עצות לקריירה, חיפוש עבודה וחיי המשרד.',
  communityDescHealthWellbeing: 'טיפים לבריאות, כושר, תזונה ורווחה נפשית לחיים טובים יותר.',
  communityDescEntertainment: 'סרטים, סדרות, מוזיקה, ממים וכל מה שמבדר ביום-יום.',
  communityDescGamingTech: 'משחקי וידאו, גאדג׳טים, ביקורות וכל מה שקשור לעולם הגיימינג והטכנולוגיה.',
  communityDescEducationCareer: 'אוניברסיטאות, קורסים, מלגות וכל מה שמקדם השכלה וקריירה.',
  communityDescSports: 'כדורגל, כדורסל, טניס וכל ענפי הספורט. תוצאות, דעות ותשוקה.',
  communityDescConfessions: 'מרחב בטוח לשתף בו דברים שלא מספרים לאף אחד. בלי שיפוטיות.',
  communityDescHotDebates: 'נושאים שנויים במחלוקת, דעות חלוקות ודיונים סוערים. לאיזה צד נוטה הדעה שלך?',
  communityDescTravelPlaces: 'יעדים מדהימים, טיפים לטיולים, חוויות והמלצות מהקהילה.',
  communityDescFoodCooking: 'מתכונים, מסעדות, אוכל רחוב וכל מה שאוהבי האוכל הטוב צריכים.',
  communityDescFashionStyle: 'טרנדים, אאוטפיטים, טיפים לסטייל וכל מה שקשור לעולם האופנה.',
  communityDescSpirituality: 'מדיטציה, מיינדפולנס, צמיחה אישית וחיבור רוחני.',
  communityDescAnimeManga: 'אנימה, מנגה, קוספליי וכל תרבות האוטאקו. מה האנימה האהובה עליך?',
  communityDescCrypto: 'ביטקוין, אלטקוינים, DeFi, NFT וכל האקוסיסטם של הקריפטו. DYOR.',
  communityDescKpopKdrama: 'אידולים, דרמות, קאמבקים וכל מה שקשור לתרבות הפופ הקוריאנית.',
  communityDescEsoteric: 'אסטרולוגיה, טארוט, אנרגיות ומסתורי היקום. במה מאמינים כאן?',
  communityDescPoeticAction: 'שירה, ציטוטים, מילות שירים ואמנות רחוב. לבטא במילים את מה שמרגישים.',
  communityDescAiTech: 'בינה מלאכותית, חדשנות, סטארט-אפים ועתיד הטכנולוגיה.',
  communityDescEventsOutings: 'מסיבות, הופעות, מיטאפים ואירועים. לאן יוצאים היום?',
  communityDescBusinessInvesting: 'יזמות, השקעות, אסטרטגיות עסקיות והזדמנויות.',
  communityDescBarsRestaurants: 'הברים, המסעדות, מבשלות הבירה והמקומות הכי טובים לצאת לאכול בהם.',
  communityDescBeatles: 'הכול על הלהקה הגדולה בהיסטוריה. דיסקוגרפיה, היסטוריה ומורשת.',
  communityDescTarotReading: 'קריאות טארוט, פרשנויות, קלפי ארקנה והדרכה רוחנית לדרך שלך.',
  communityDescGrandmaRecipes: 'המתכונים הביתיים שעוברים מדור לדור. בישול עם נשמה.',
  communityDescArgentineMemes: 'הממים הארגנטינאים הכי טובים. הומור מקומי, אקטואליה ותרבות פופולרית.',
  communityDescTrueCrimeLatino: 'מקרים אמיתיים, תעלומות לא פתורות וכרוניקות פשע מאמריקה הלטינית.',
  communityDescPlantsGarden: 'טיפים לגינון, טיפול בצמחים, סוקולנטים וכל מה שהגינה שלך צריכה.',
  communityDescRockNacional: 'הרוק הארגנטינאי והלטינו-אמריקאי. להקות, אלבומים, הופעות ונוסטלגיה.',
  communityDescCatLovers: 'תמונות, סרטונים, טיפים וכל מה שקשור לחברים החתוליים שלנו.',
  communityDescDefault: 'מרחב לשיתוף, לדיון ולחיבור עם הקהילה.',
  feedEmptyTitle: 'הפוסט הראשון יכול להיות שלך!',
  feedEmptyHint: 'אפשר להשתמש בשדה שלמעלה כדי ליצור את הפוסט הראשון.',
  wallEmptyTitle: 'עדיין אין פוסטים',
  wallEmptyHint: 'אפשר להיות האדם הראשון שמשתף כאן משהו שנוצר עם AI.',
  wallFilteredTitle: 'אין כאן כלום עם הבחירה הזאת',
  wallFilteredHint: 'כדאי לנסות מדורים אחרים או לשתף משהו.',
  answersCount_one: '{{cantidad}} תשובה',
  answersCount_two: '{{cantidad}} תשובות',
  answersCount_other: '{{cantidad}} תשובות',
  likesCount_one: '{{cantidad}} לייק',
  likesCount_two: '{{cantidad}} לייקים',
  likesCount_other: '{{cantidad}} לייקים',
  commentsCount_one: '{{cantidad}} תגובה',
  commentsCount_two: '{{cantidad}} תגובות',
  commentsCount_other: '{{cantidad}} תגובות',
};
