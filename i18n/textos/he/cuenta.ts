/*
 * HEBREO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Registro impersonal como el resto del hebreo de Weë; el personaje es «דמות» (femenino). Prefijo con guion delante de marca (ב-Weë, מ-Weë AI).
 * «confirmWord» = מחיקה, la misma palabra que el botón «Eliminar» (common.delete); el hebreo no tiene mayúsculas.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from './plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'מחיקת החשבון',
  sectionDanger: 'אזור מסוכן',
  title: 'מחיקת החשבון',
  goesFaces: 'כל הפרופילים שלך: הפרופיל האמיתי והאלטר אגו שלך',
  goesCharacter: 'הדמות שלך והאווטאר שלה',
  goesPosts: 'הפוסטים, התגובות והתגובות הרגשיות שלך',
  goesMessages: 'ההודעות שלך ב-WeeTalk: הן מתרוקנות, והשיחה של הצד השני נשארת בלעדיהן',
  goesCreations: 'היצירות, הפרויקטים והשיחות שלך ב-Weë AI',
  goesContacts: 'אנשי הקשר, הקהילות והשמורים שלך',
  goesCredits: 'ה-Credits שנשארו לך: הם אובדים ולא מוחזרים',
  whatStaysTitle: 'מה נשמר',
  staysRecords: 'הרישומים החשבונאיים של Credits ושל התשלומים. הם נשמרים בלי השם שלך ובלי פרטי הפרופיל, כי הם הנהלת החשבונות של Weë.',
  confirmLabel: 'כדי לאשר, יש להקליד "{{palabra}}"',
  confirmWord: 'מחיקה',
  confirmPlaceholder: 'מקלידים את המילה כאן',
  dialogTitle: 'למחוק את החשבון?',
  dialogConfirm: 'מחיקה',
  doneTitle: 'החשבון שלך נמחק',
  doneBody: 'תודה שהיית חלק מ-Weë.',
  reauthTitle: 'צריך להיכנס שוב',
  reauthBody: 'מטעמי אבטחה, כדי למחוק את החשבון צריך להיכנס לחשבון זמן קצר לפני כן. יש לצאת, להיכנס שוב ולחזור על השלבים האלה.',
  reauthButton: 'יציאה כדי להיכנס שוב',
  errorTitle: 'לא הצלחנו לסיים',
  errorBody: 'משהו נכשל באמצע הדרך. אפשר לנסות שוב: התהליך ימשיך מהמקום שבו נעצר.',
  retry: 'ניסיון נוסף',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'החשבון מושבת, ואחרי 30 יום הכול נמחק',
  introDesactivar: 'החשבון שלך מושבת עכשיו, ואם לא חוזרים תוך 30 יום, הכול נמחק לתמיד.',
  nowTitle: 'מה קורה עכשיו',
  nowHidden: 'החשבון שלך מפסיק להיות גלוי: אף אחד לא יראה את הפרופילים או את הפוסטים שלך',
  nowCharacterOff: 'האוטונומיה של הדמות שלך נכבית והחיובים נפסקים',
  nowComeBack_one: 'נשאר יום אחד לחזור: צריך להיכנס שוב ולבחור "הפעלת החשבון"',
  nowComeBack_two: 'נשארו יומיים לחזור: צריך להיכנס שוב ולבחור "הפעלת החשבון"',
  nowComeBack_other: 'נשארו {{contador}} ימים לחזור: צריך להיכנס שוב ולבחור "הפעלת החשבון"',
  whatGoesLaterTitle: 'מה נמחק אם לא חוזרים',
  deactivateButton: 'מחיקת החשבון שלי',
  dialogBodyDesactivar: 'החשבון שלך יפסיק להיות גלוי. אם לא חוזרים תוך 30 יום, הכול יימחק ולא יהיה אפשר לשחזר אותו.',
  deactivating: 'משביתים את החשבון…',
  deactivatedTitle: 'החשבון שלך מושבת',
  deactivatedBody: 'אפשר לחזור עד {{fecha}}. אחרי זה הכול יימחק לתמיד.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'החשבון שלך מושבת',
  activarBody: 'ביקשת למחוק את החשבון. כל עוד הוא מושבת, אף אחד לא רואה את הפרופילים או את הפוסטים שלך.',
  activarDaysLeft_one: 'נשאר יום אחד עד המחיקה הסופית',
  activarDaysLeft_two: 'נשארו יומיים עד המחיקה הסופית',
  activarDaysLeft_other: 'נשארו {{contador}} ימים עד המחיקה הסופית',
  activarDate: 'אם לא מפעילים אותו, הוא יימחק לתמיד בתאריך {{fecha}}.',
  activarCharacterNote: 'האוטונומיה של הדמות תישאר כבויה; אפשר לתזמן אותה מחדש מתי שרוצים.',
  activarButton: 'הפעלת החשבון',
  activating: 'מפעילים את החשבון…',
  activatedTitle: 'החשבון שלך פעיל שוב',
  activarExpiredTitle: 'הזמן לחזור הסתיים',
  activarExpiredBody: 'החשבון שלך יימחק לגמרי בשעות הקרובות.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'ה-Credits שנשארו לך ({{creditos}}): הם אובדים ולא מוחזרים',
};
