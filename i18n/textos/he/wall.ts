/*
 * HEBREO — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español, con el inglés como segunda referencia (docs/I18N-HEBREO.md).
 *
 * Decisiones: el hebreo tiene DUAL, así que los tres contadores declaran `_two`
 * con `ConPlurales`: «הצבעה אחת / שתי הצבעות / {{contador}} הצבעות»; en los plazos
 * el verbo concuerda con el número («נשאר יום אחד», «נשארו יומיים», «נשארו
 * {{contador}} ימים»). Las formas `_one` y `_two` no llevan cifra: la palabra
 * ya la dice. «Repostear» es «שיתוף מחדש» (glosario § 6) y «{{nombre}} reposteó»
 * se dice en pasiva —«שותף מחדש על ידי {{nombre}}»— para no darle género a quien
 * repostea. «Votaste» es «הצבעת», que sin niqud sirve para los dos géneros. Los
 * botones son sustantivos de acción (שמירה, עריכה, מחיקת הפוסט). «CÓMO LO HICE»
 * pierde las mayúsculas porque el hebreo no las tiene. Las marcas con prefijo
 * llevan guion: «ב-Weë», «ב-Weëls», «ב-WeeTalk», «ל-Weë».
 */
import { ConPlurales } from './plurales';

export const wall: ConPlurales<typeof import('../es/wall').wall> = {
  repostedBy: 'שותף מחדש על ידי {{nombre}}',
  repost: 'שיתוף מחדש',
  undoRepost: 'ביטול השיתוף מחדש',
  undoRepostConfirm: 'לבטל את השיתוף מחדש',
  sendByWeeTalk: 'שליחה ב-WeeTalk',
  save: 'שמירה',
  unsave: 'הסרה מהשמורים',
  deletePost: 'מחיקת הפוסט',
  deletePostConfirm: 'האם למחוק את הפוסט הזה?',
  deletePostFailed: 'לא הצלחנו למחוק את הפוסט. כדאי לנסות שוב.',
  sharePost: 'שיתוף הפוסט',
  shareFailed: 'לא הצלחנו לשתף את הפוסט. כדאי לנסות שוב.',
  preparingImage: 'מכינים את התמונה...',
  publishedOnWee: 'פורסם ב-Weë',
  viewInWeels: 'צפייה ב-Weëls',
  moreImages: 'ועוד {{contador}}',
  comment: 'תגובה',
  viewFullVideoInWeels: 'צפייה בסרטון המלא ב-Weëls',
  pollNoVotesYet: 'עדיין אין הצבעות',
  pollVotes_one: 'הצבעה אחת',
  pollVotes_two: 'שתי הצבעות',
  pollVotes_other: '{{contador}} הצבעות',
  pollVoted: 'הצבעת',
  pollClosed: 'הסקר הסתיים',
  pollDaysLeft_one: 'נשאר יום אחד',
  pollDaysLeft_two: 'נשארו יומיים',
  pollDaysLeft_other: 'נשארו {{contador}} ימים',
  pollHoursLeft_one: 'נשארה שעה אחת',
  pollHoursLeft_two: 'נשארו שעתיים',
  pollHoursLeft_other: 'נשארו {{contador}} שעות',
  pollLessThanAnHour: 'פחות משעה',
  pollLegacy: 'הסקר הזה נוצר בגרסה קודמת של Weë וכבר אי אפשר להצביע בו.',
  pollVoteFailed: 'לא הצלחנו לרשום את ההצבעה',
  pollVoteOffline: 'לא הצלחנו להתחבר ל-Weë. כדאי לנסות מאוחר יותר.',
  closeComments: 'סגירת התגובות',
  removeImage: 'הסרת התמונה',
  attachImage: 'צירוף תמונה',
  sendComment: 'שליחת התגובה',
  onePost: 'פוסט',
  loadingComments: 'טוענים תגובות...',
  beFirstToComment: 'התגובה הראשונה יכולה להיות שלך',
  commentPlaceholder: 'כתיבת תגובה...',
  postNotFound: 'לא מצאנו את הפוסט הזה',
  loadingPosts: 'טוענים פוסטים...',
  loadingMorePosts: 'טוענים עוד פוסטים...',
  retry: 'ניסיון נוסף',
  howIMadeIt: 'איך עשיתי את זה',
  madeWith: 'נוצר עם',
  holdToCopy: 'לחיצה ארוכה על הטקסט מעתיקה אותו',
  process: 'תהליך:',
  comments: 'תגובות',
  firstCommentHint: 'כל שיחה גדולה מתחילה ברעיון.',
  loadingPost: 'טוענים את הפוסט...',
  useInEditor: 'שימוש בעורך',
  edit: 'עריכה',
  publishToCommunity: 'פרסום בקהילה שלי',
  changesAndPurchases: 'רשימת שינויים ורכישות',
  shareAnonymously: 'הבעת דעה באופן אנונימי ב-Weë',
  statViews: 'צפיות',
  statAgree: 'מסכימים',
  statComments: 'תגובות',
  commentImageFailed: 'לא הצלחנו להעלות את התמונה. כדאי לנסות שוב.',
  commentSendFailed: 'לא הצלחנו לשלוח את התגובה. כדאי לנסות שוב.',
  shareText: '{{contenido}}\n\nנוצר ב-Weë · World Encode Entity',
  shareTextEmpty: 'כדאי לראות את הפוסט הזה ב-Weë',
  commentsWithCount: 'תגובות ({{total}})',
  agreeWithComment: 'הסכמה עם התגובה הזאת',
  disagreeWithComment: 'אי-הסכמה עם התגובה הזאת',
  showPrompt: 'הצגת הפרומפט',
  hidePrompt: 'הסתרת הפרומפט',
  copyPrompt: 'העתקת הפרומפט',
  promptCopied: 'הועתק',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  demoBadge: 'הדגמה',
  demoBadgeLabel: 'תוכן להדגמה',
  immersiveEmpty: 'עדיין אין פוסטים ב-Wäll',
  immersiveError: 'לא הצלחנו לטעון את ה-Wäll',
  immersiveEnd: 'ראית הכול',
  agreePost: 'בעד',
  disagreePost: 'נגד',
  mute: 'השתקה',
  unmute: 'ביטול השתקה',
  moreOptions: 'אפשרויות נוספות',
  seeMore: 'הצגת עוד',
  seeLess: 'הצגת פחות',
  openPost: 'פתיחת הפוסט',
  imageOf: 'תמונה {{numero}} מתוך {{total}}',
};
