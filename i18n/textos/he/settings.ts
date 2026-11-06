/*
 * HEBREO — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Cuando una frase no puede evitar un verbo con Weë de sujeto, Weë es FEMENINO (como «רשת» y
 * «אפליקציה»): «Weë תבקש», «Weë מכירה». Es una convención de todo el diccionario, anotada para
 * el revisor. «Le dijiste que no al sistema» pasa a impersonal («ההרשאה נדחתה במערכת»). El
 * contador de comunidades usa «שהצטרפת אליה/ן», cuya segunda persona se escribe igual en los dos
 * géneros sin niqud, y declara el dual.
 */
import { ConPlurales } from './plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'הגדרות',
  sectionContent: 'תוכן',
  sectionPrivacy: 'פרטיות',
  sectionPreferences: 'העדפות',
  sectionSupport: 'עזרה',
  myCommunities: 'הקהילות שלי',
  communitiesJoined_one: 'קהילה אחת שהצטרפת אליה',
  communitiesJoined_two: 'שתי קהילות שהצטרפת אליהן',
  communitiesJoined_other: '{{contador}} קהילות שהצטרפת אליהן',
  privateReplies: 'תגובות פרטיות',
  privateRepliesHint: 'לאפשר לאחרים לשלוח לך הודעות פרטיות',
  pushNotifications: 'התראות פוש',
  language: 'שפה',
  languageSubtitle: 'בחירת השפה של Weë',
  help: 'עזרה',
  privacyPolicy: 'מדיניות פרטיות',
  about: 'אודות Weë',
  signOut: 'יציאה',
  signOutFailed: 'לא הצלחנו לצאת מהחשבון',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'זריעת ברירות מחדל',
  seedDefaultsConfirm: 'כותב ב-Firestore את הספקים, השרשראות וההגדרות שבברירת המחדל שעדיין לא קיימים. לא מוחק דבר.',
  seed: 'זריעה',
  sectionNotifications: 'התראות',
  sectionInfo: 'מידע',
  sectionAccount: 'חשבון',
  privacyPolicyHint: 'מה אנחנו עושים עם הנתונים שלך, במילים פשוטות',
  pushNotificationsHint: 'קבלת התראות על הודעות חדשות ועל פעילות',
  aboutHint: 'מה זה Weë ומה הגרסה הנוכחית',
  helpHint: 'שאלות נפוצות ויצירת קשר',
  signOutHint: 'יציאה מהחשבון שלך',
  aboutBody: 'Weë (World Encode Entity) היא הרשת החברתית של האנשים שיוצרים עם בינה מלאכותית.\n\nגרסה 1.0.0 · © {{anio}} Weë. כל הזכויות שמורות.\n\nנתונים גאוגרפיים: GeoNames (geonames.org), CC BY 4.0.',
  location: 'מיקום',
  locationLine: '{{estado}} המיקום המדויק שלך לעולם לא מוצג בפומבי.',
  locationOff: 'כבוי. כדי ש-Weë יציע מקומות קרובים ואת האזור שלך כשמוסיפים מיקום לפוסט, אפשר לתת לו גישה למיקום המשוער שלך. המיקום המדויק שלך לעולם לא מוצג בפומבי.',
  locationUnavailable: 'המכשיר הזה לא יכול לספק לנו את המיקום שלך.',
  locationDisabled: 'המיקום כבוי בהגדרות המכשיר שלך.',
  locationPermissionDenied: 'ההרשאה נדחתה במערכת. אפשר להקיש כאן כדי לשנות זאת בהגדרות המכשיר.',
  locationPermissionNotDetermined: 'Weë יבקש הרשאה כשיהיה בה צורך.',
  locationApproximate: 'Weë מכיר את האזור שלך, לא את הנקודה המדויקת.',
  locationPrecise: 'Weë יכול להשתמש במיקום המפורט שלך כשתכונה מסוימת צריכה אותו.',
};
