/*
 * HEBREO — buscar, crear y dejar comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: «comunidad» es «קהילה» y «miembro» es «חבר» (pl. «חברים»); los dos
 * contadores con `{{contador}}` declaran el dual sin cifra («חבר אחד / שני חברים /
 * {{contador}} חברים», «פוסט אחד / שני פוסטים / {{contador}} פוסטים»), y `memberCount`,
 * cuyo hueco es `{{cantidad}}`, lleva el número por delante en las tres formas
 * porque la pantalla lo espera. «Unido» (estado) y «Comunidades unidas» se dicen
 * con «הצטרפת», que sin niqud sirve para los dos géneros. Los nombres oficiales
 * cambian el «&» por la conjunción «ו», que es como une dos nombres el hebreo
 * («קולנוע ואנימציה»); «Tecnología & IA» es «טכנולוגיה ו-AI» (la sigla, con guion).
 * El ejemplo «Amantes del café» se traduce («חובבי קפה»). En «Salir de "{{nombre}}"»
 * se antepone «הקהילה» para que el prefijo «מ» no quede pegado a la comilla ni al
 * hueco. «Encuentra las tuyas.» → «הקהילות שלך מחכות כאן.»: duda al revisor.
 */
import { ConPlurales } from './plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'יצירת קהילה',
  searchPlaceholder: 'חיפוש קהילות...',
  loading: 'טוענים קהילות...',

  joinedSection: 'קהילות שהצטרפת אליהן',
  discoverSection: 'גילוי קהילות',

  official: 'רשמית',
  members_one: 'חבר אחד',
  members_two: 'שני חברים',
  members_other: '{{contador}} חברים',
  memberOf: 'הצטרפת',
  join: 'הצטרפות',

  leaveTitle: 'יציאה מהקהילה',
  leaveConfirm: 'האם לצאת מהקהילה "{{nombre}}"?',
  leave: 'יציאה',
  leaveFailed: 'לא הצלחנו לצאת מהקהילה',
  actionFailed: 'לא הצלחנו להשלים את הפעולה',

  newCommunity: 'קהילה חדשה',
  name: 'שם',
  namePlaceholder: 'לדוגמה: חובבי קפה',
  description: 'תיאור',
  descriptionPlaceholder: 'במה עוסקת הקהילה הזאת?',
  createFailed: 'לא הצלחנו ליצור את הקהילה',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'הקהילה של {{nombre}}',
  empty: 'אין קהילות זמינות',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'הקהילות שלך מחכות כאן.',
  searchLabel: 'חיפוש קהילות',
  members: 'חברים',
  posts: 'פוסטים',
  rules: 'כללי הקהילה',
  one: 'קהילה',
  loadFailed: 'לא הצלחנו לטעון את הקהילה',
  noPosts: 'אין פוסטים',
  beTheFirst: 'הפוסט הראשון בקהילה הזאת יכול להיות שלך',
  createPost: 'יצירת פוסט',
  understoodJoin: 'הבנתי, להצטרף',
  memberCount_one: '{{cantidad}} חבר',
  memberCount_two: '{{cantidad}} חברים',
  memberCount_other: '{{cantidad}} חברים',
  postCount_one: 'פוסט אחד',
  postCount_two: 'שני פוסטים',
  postCount_other: '{{contador}} פוסטים',
  officialNameFilmAnimation: 'קולנוע ואנימציה',
  officialNameArtCreativity: 'אמנות ויצירתיות',
  officialNameCreatorsInfluencers: 'יוצרים ומשפיענים',
  officialNameBusinessEntrepreneurship: 'עסקים ויזמות',
  officialNameTechAi: 'טכנולוגיה ו-AI',
  officialNameGamingVirtualWorlds: 'גיימינג ועולמות וירטואליים',
  officialNameEducationLearning: 'חינוך ולמידה',
  officialNameFutureSociety: 'עתיד וחברה',
  officialRuleShare: 'לשתף את מה שיצרת עם AI ולספר איך עשית את זה',
  officialRuleRespect: 'לשאול ולענות בכבוד',
  officialRuleNoSpam: 'בלי ספאם ובלי תוכן שאינו שלך',
  popularDescFilmmakers: 'אנשים שמשתמשים ב-AI לקולנוע ולהפקה אודיו-ויזואלית. כאן מראים את התהליך ולומדים מזה של אחרים.',
  popularDescInfluencers: 'משפיענים ויוצרי תוכן שמפיקים עם AI.',
  popularDescDesigners: 'מעצבים שעובדים עם AI: מיתוג, איור, אמנות דיגיטלית.',
  popularDescWriters: 'כותבים שיוצרים עם AI: ספרים, תסריטים, מאמרים ושירה.',
  popularDescMusicians: 'יוצרי מוזיקה ואודיו עם AI.',
  popularDescDevelopers: 'מתכנתים שבונים עם AI.',
  popularDescEntrepreneurs: 'יזמים שמשתמשים ב-AI בעסקים שלהם.',
  popularDescGamers: 'AI ומשחקי וידאו: דמויות, עולמות וחוויות.',
};
