/*
 * HEBREO — ËContact y ẄContact. Los dos nombres son marca —cambian con el perfil activo— y entran como valor, no se traducen.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `{{lista}}` es una marca y `{{nombre}}` una persona: ningún prefijo se pega a ellos; el artículo
 * va con guion («ה-{{lista}} שלך»), como con cualquier nombre latino. `count_*` no puede declinar
 * una marca, así que las tres formas llevan `{{contador}}` y el dual es idéntico a las otras.
 * «No estás conectado» (con género) pasa a «אין חיבור בינך לבין…». Las confirmaciones van en
 * infinitivo («לדחות…?»), sin género.
 */
import { ConPlurales } from './plurales';

export const econtact: ConPlurales<typeof import('../es/econtact').econtact> = {
  requestsReceived: 'בקשות שהתקבלו',
  requestsSent: 'בקשות שנשלחו',
  yours: 'ה-{{lista}} שלך',
  yoursWhenYouSignIn: 'ה-{{lista}} שלך, אחרי הכניסה',
  yoursWhenYouSignInSubtitle: '{{lista}} שומר את הקשרים שלך ב-Weë. יש להיכנס כדי לראות אותם.',
  noneYet: 'עדיין אין לך {{lista}}',
  noneYetSubtitle: 'כאן יהיו האנשים שלך ב-Weë. קשר נוצר בין שניים: צד אחד מציע והצד השני מאשר.',
  noAgenda: 'לפרופיל הזה אין רשימת אנשי קשר',
  noAgendaSubtitle: '{{lista}} הוא המקום של הקשרים שלך עם אנשים אחרים. כדי לראות אותם יש לעבור לפרופיל האמיתי או לפרופיל Weë.',
  wantsToConnect: '{{lista}} · רוצה להתחבר איתך',
  accept: 'אישור הבקשה של {{nombre}}',
  reject: 'דחיית הבקשה של {{nombre}}',
  withdraw: 'ביטול הבקשה ל-{{nombre}}',
  removeFrom: 'הסרת {{nombre}} מה-{{lista}} שלך',
  openProfile: 'פתיחת {{etiqueta}} של {{nombre}}',
  rejectTitle: 'דחיית בקשה',
  rejectConfirm: 'לדחות את הבקשה של {{nombre}}?',
  withdrawTitle: 'ביטול בקשה',
  withdrawConfirm: 'לבטל את הבקשה שלך ל-{{nombre}}?',
  removeTitle: 'הסרת {{lista}}',
  removeConfirm: 'להסיר את {{nombre}} מה-{{lista}} שלך?',
  failed: 'לא ניתן היה להשלים את הפעולה',
  count_one: '{{contador}} {{lista}}',
  count_two: '{{contador}} {{lista}}',
  count_other: '{{contador}} {{lista}}',
  somePerson: 'האדם הזה',
  acceptLabel: 'אישור {{lista}}',
  rejectRequestLabel: 'דחיית בקשת {{lista}}',
  requestSent: 'הבקשה נשלחה',
  errSignIn: 'יש להיכנס כדי להשתמש ב-ËContact.',
  errNotYours: 'הפרופיל הזה לא שלך.',
  errNotAPerson: 'הפרופיל הזה לא יכול להשתמש ב-ËContact.',
  errSameProfile: 'פרופיל לא יכול להתחבר לעצמו.',
  errOffline: 'לא ניתן היה להתחבר ל-Weë.',
  errNoRequestToReject: 'אין בקשה אליך שאפשר לדחות.',
  errNoPendingRequest: 'אין לך בקשה ממתינה עם הפרופיל הזה.',
  errNotConnected: 'אין חיבור בינך לבין הפרופיל הזה.',
  errNoActiveProfile: 'אין פרופיל פעיל שאפשר לעשות זאת איתו.',
};
